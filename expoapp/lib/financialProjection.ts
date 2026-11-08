import {
  ACCOUNT_TYPES,
  CREDIT_SPENDING_TYPES,
  getDefaultEndDate,
  getTodayDate,
} from '../config/accountTypes';
import { getAccountInterestRate } from './accountDisplay';
import {
  countPaymentOccurrencesBetween,
  getAccountBalancesAsOf,
  getPaymentEntries,
} from './paymentEntries';
import { getLinkedLoanIds, getOffsetAccountConfig } from './offsetAccounts';

export interface FinancialAccount {
  account_id: string;
  title: string;
  account_type: string;
  balance: number | string | null;
  start_date?: string | null;
  end_date?: string | null;
  payments?: unknown;
  interest_rates?: unknown;
  offset_config?: unknown;
}

export interface ProjectionSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
}

export interface FinancialProjection {
  years: number;
  defaultYears: number;
  loanSeries: ProjectionSeries[];
  scheduledLoanSeries: ProjectionSeries[];
  transactionSeries: ProjectionSeries[];
  combinedSeries: ProjectionSeries[];
  loanBalancesByYear: number[];
  scheduledLoanBalancesByYear: number[];
  scheduledRepaymentsByYear: number[];
  scheduledInterestByYear: number[];
  offsetInterestSavedByYear: number[];
  actualScheduledRepaymentsByYear: number[];
  actualAdditionalPaymentsByYear: number[];
  actualInterestByYear: number[];
  transactionBalancesByYear: number[];
  totalOffsetBalanceByYear: number[];
  remainingTransactionBalanceByYear: number[];
  monthlyRepayments: number;
  scheduledMonthlyRepayments: number;
  additionalMonthlyRepayments: number;
  totalOffsetBalance: number;
  remainingTransactionBalance: number;
}

const MAX_YEARS = 30;
const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;
const COLORS = ['#5d55f7', '#28a745', '#f08c00', '#d63384', '#0b7285', '#7048e8', '#c2255c', '#2f9e44', '#e8590c'];
const CREDIT_CARD_TYPE = 'CreditCard';

interface RateEntry {
  rate: number;
  date: string;
  endDate?: string | null;
}

interface PaymentEntry {
  amount: number;
  frequency: string;
  endDate?: string | null;
}

interface PartPaymentEntry {
  amount: number;
  linkedAccountId: string;
  startDate: string;
  frequency?: string;
  endDate?: string | null;
}

interface LoanChargeEvent {
  amount: number;
  date: number;
}

interface BalancePoint {
  date: number;
  balance: number;
}

interface LoanSimulation {
  points: BalancePoint[];
  finishDate: number;
  repaymentsByYear: number[];
  additionalPaymentsByYear: number[];
  interestByYear: number[];
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getRates(account: FinancialAccount): RateEntry[] {
  const parsed = parseJson(account.interest_rates);
  const entries = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  return entries
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map(entry => ({
      rate: Number(entry.rate),
      date: typeof entry.date === 'string' ? entry.date : '',
      endDate: typeof entry.endDate === 'string' ? entry.endDate : typeof entry.end_date === 'string' ? entry.end_date : null,
    }))
    .filter(entry => Number.isFinite(entry.rate) && isValidDate(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getPayments(account: FinancialAccount): PaymentEntry | null {
  const parsed = parseJson(account.payments);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || typeof entry !== 'object' || !('amount' in entry)) return null;
  const payment = entry as Record<string, unknown>;
  const amount = Number(payment.amount);
  return Number.isFinite(amount) && amount > 0
    ? {
        amount,
        frequency: typeof payment.frequency === 'string' ? payment.frequency : 'Monthly',
        endDate: typeof payment.endDate === 'string'
          ? payment.endDate
          : typeof payment.end_date === 'string' ? payment.end_date : null,
      }
    : null;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function toUtcDate(value: string): number | null {
  if (!isValidDate(value)) return null;
  return Date.parse(`${value}T00:00:00Z`);
}

function dateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function addMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  const day = date.getUTCDate();
  const isMonthEnd = day === new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(isMonthEnd ? lastDay : Math.min(day, lastDay));
  return date.getTime();
}

function addFrequency(timestamp: number, frequency: string, count = 1): number {
  const normalized = frequency.toLowerCase();
  if (normalized.includes('fortnight') || normalized.includes('bi-week') || normalized.includes('biweekly')) return timestamp + count * 14 * 86400000;
  if (normalized.includes('week')) return timestamp + count * 7 * 86400000;
  if (normalized.includes('quarter')) return addMonths(timestamp, count * 3);
  if (normalized.includes('bi annual') || normalized.includes('bi-annual') || normalized.includes('biannual')) return addMonths(timestamp, count * 6);
  if (normalized.includes('year') || normalized.includes('annual')) return addMonths(timestamp, count * 12);
  if (normalized.includes('day')) return timestamp + count * 86400000;
  return addMonths(timestamp, count);
}

function periodsPerYear(frequency: string): number {
  const normalized = frequency.toLowerCase();
  if (normalized.includes('fortnight') || normalized.includes('bi-week') || normalized.includes('biweekly')) return 26;
  if (normalized.includes('week')) return 52;
  if (normalized.includes('quarter')) return 4;
  if (normalized.includes('bi annual') || normalized.includes('bi-annual') || normalized.includes('biannual')) return 2;
  if (normalized.includes('year') || normalized.includes('annual')) return 1;
  if (normalized.includes('day')) return 365;
  return 12;
}

function rateOnDate(rates: RateEntry[], date: number): number {
  let activeRate = 0;
  const dateText = dateString(date);
  for (const entry of rates) {
    if (entry.date > dateText) break;
    activeRate = entry.rate;
  }
  return activeRate;
}

function rateBoundaries(rates: RateEntry[], start: number, end: number): number[] {
  return rates
    .map(entry => toUtcDate(entry.date))
    .filter((timestamp): timestamp is number => timestamp !== null && timestamp > start && timestamp < end)
    .sort((a, b) => a - b);
}

function growTransactionBalanceBetween(
  account: FinancialAccount,
  initialBalance: number,
  startDate: number,
  endDate: number
): number {
  if (endDate <= startDate) return initialBalance;
  const rates = getRates(account);
  let balance = initialBalance;
  let cursor = startDate;
  while (cursor < endDate) {
    const annualPeriodEnd = addMonths(cursor, 12);
    const periodEnd = Math.min(annualPeriodEnd, endDate);
    const periodDuration = annualPeriodEnd - cursor;
    const boundaries = [...rateBoundaries(rates, cursor, periodEnd), periodEnd];
    let segmentStart = cursor;
    let interestFactor = 1;
    for (const segmentEnd of boundaries) {
      const annualRate = rates.length
        ? rateOnDate(rates, segmentStart)
        : getAccountInterestRate(account) ?? 0;
      interestFactor += annualRate / 100 * (segmentEnd - segmentStart) / periodDuration;
      segmentStart = segmentEnd;
    }
    balance += Math.max(0, balance) * (interestFactor - 1);
    cursor = periodEnd;
  }
  return Number.isFinite(balance) ? balance : initialBalance;
}

interface TransactionFlowEvent {
  date: number;
  amount: number;
}

function addFlowEvents(
  eventsByAccount: Map<string, TransactionFlowEvent[]>,
  accountId: string,
  entry: ReturnType<typeof getPaymentEntries>[number],
  direction: 1 | -1,
  today: number,
  horizon: number,
  stopAt?: number
): void {
  const amount = Number(entry.amount);
  const start = toUtcDate(entry.startDate || entry.date || '');
  if (!Number.isFinite(amount) || amount <= 0 || start === null || start > horizon) {
    return;
  }
  const endDate = entry.endDate ? toUtcDate(entry.endDate) : null;
  const stop = Math.min(horizon, endDate ?? horizon, stopAt ?? horizon);
  const recurring = !!entry.frequency
    && !/one.?time|once|single/i.test(entry.frequency);
  if (stop <= today || (!recurring && start <= today)) return;
  const occurrencesThroughToday = recurring
    ? countPaymentOccurrencesBetween(entry, start, today)
    : 0;
  let date = recurring
    ? addFrequency(start, entry.frequency || 'Monthly', occurrencesThroughToday)
    : start;
  let occurrences = 0;
  const events = eventsByAccount.get(accountId) || [];
  while (date <= stop && occurrences < 12000) {
    events.push({ date, amount: direction * amount });
    occurrences += 1;
    if (!recurring) break;
    const next = addFrequency(date, entry.frequency || 'Monthly');
    if (next <= date) break;
    date = next;
  }
  if (events.length) eventsByAccount.set(accountId, events);
}

function getTransactionFlowEvents(
  transactions: FinancialAccount[],
  today: number,
  horizon: number,
  loanPayoffDates: Map<string, number> = new Map()
): Map<string, TransactionFlowEvent[]> {
  const accountIds = new Set(transactions.map(account => account.account_id));
  const eventsByAccount = new Map<string, TransactionFlowEvent[]>();
  transactions.forEach(account => {
    getPaymentEntries(account.payments).forEach(entry => {
      if (entry.type === 'Income') {
        addFlowEvents(eventsByAccount, account.account_id, entry, 1, today, horizon);
      } else if (entry.type === 'Payment'
        || entry.type === 'Part Payment'
        || entry.type === 'Bill Payment'
        || entry.type === 'Expense') {
        const linkedAccountId = entry.linkedAccountId || entry.linked_account_id;
        const payoffDate = entry.type === 'Part Payment' && linkedAccountId
          ? loanPayoffDates.get(linkedAccountId)
          : undefined;
        addFlowEvents(eventsByAccount, account.account_id, entry, -1, today, horizon, payoffDate);
        if (entry.type === 'Payment' && linkedAccountId && accountIds.has(linkedAccountId)) {
          addFlowEvents(eventsByAccount, linkedAccountId, entry, 1, today, horizon);
        }
      }
    });
  });
  eventsByAccount.forEach(events => events.sort((a, b) => a.date - b.date));
  return eventsByAccount;
}

function cashBalanceAt(
  account: FinancialAccount,
  eventsByAccount: Map<string, TransactionFlowEvent[]>,
  date: number,
  today: number
): number {
  const initialBalance = Math.max(0, Number(account.balance) || 0);
  const events = eventsByAccount.get(account.account_id) || [];
  return initialBalance + events.reduce(
    (total, event) => total + (event.date <= date && event.date > today ? event.amount : 0),
    0
  );
}

function projectTransactionBalanceSeries(
  account: FinancialAccount,
  eventsByAccount: Map<string, TransactionFlowEvent[]>,
  today: number,
  loans: FinancialAccount[]
): number[] {
  const offsetAccount = isLinkedOffsetAccount(account, loans);
  const events = eventsByAccount.get(account.account_id) || [];
  let balance = Math.max(0, Number(account.balance) || 0);
  let cursor = today;
  let eventIndex = 0;
  const values = [balance];

  for (let year = 1; year <= MAX_YEARS; year += 1) {
    const sampleDate = addMonths(today, year * 12);
    while (eventIndex < events.length && events[eventIndex].date <= sampleDate) {
      const eventDate = events[eventIndex].date;
      if (!offsetAccount) {
        balance = growTransactionBalanceBetween(account, balance, cursor, eventDate);
      }
      cursor = eventDate;
      while (eventIndex < events.length && events[eventIndex].date === eventDate) {
        balance += events[eventIndex].amount;
        eventIndex += 1;
      }
    }
    if (!offsetAccount) {
      balance = growTransactionBalanceBetween(account, balance, cursor, sampleDate);
    }
    cursor = sampleDate;
    values.push(balance);
  }
  return values;
}

export function getProjectedTransactionCashAtDate(
  accounts: FinancialAccount[],
  loans: FinancialAccount[],
  date: string
): number {
  const balances = getProjectedTransactionBalancesAtDate(accounts, loans, date);
  return accounts.reduce((total, account) => total + (balances[account.account_id] ?? 0), 0);
}

export function getProjectedTransactionCashBeforeSpendAtDate(
  accounts: FinancialAccount[],
  loans: FinancialAccount[],
  date: string
): number {
  const accountsBeforeSpend = accounts.map(account => ({
    ...account,
    payments: getPaymentEntries(account.payments).filter(entry =>
      entry.type === 'Income' || entry.type === 'Payment'),
  }));
  return getProjectedTransactionCashAtDate(accountsBeforeSpend, loans, date);
}

export function getProjectedTransactionBalancesAtDate(
  accounts: FinancialAccount[],
  loans: FinancialAccount[],
  date: string
): Record<string, number> {
  const targetDate = toUtcDate(date);
  if (targetDate === null) throw new Error(`Invalid transaction projection date: ${date}`);
  const today = toUtcDate(getTodayDate())!;
  if (targetDate <= today) {
    return getAccountBalancesAsOf(accounts, date);
  }

  const balancesToday = getAccountBalancesAsOf(accounts, getTodayDate());
  const currentAccounts = accounts.map(account => ({
    ...account,
    balance: balancesToday[account.account_id] ?? account.balance ?? 0,
  }));
  const eventsByAccount = getTransactionFlowEvents(currentAccounts, today, targetDate);
  return Object.fromEntries(currentAccounts.map(account => [
    account.account_id,
    projectTransactionBalanceAtDate(
      account,
      eventsByAccount,
      today,
      targetDate,
      loans
    ),
  ]));
}

function projectTransactionBalanceAtDate(
  account: FinancialAccount,
  eventsByAccount: Map<string, TransactionFlowEvent[]>,
  today: number,
  targetDate: number,
  loans: FinancialAccount[]
): number {
  const offsetAccount = isLinkedOffsetAccount(account, loans);
  const events = eventsByAccount.get(account.account_id) || [];
  let balance = Number(account.balance) || 0;
  let cursor = today;
  for (const event of events) {
    if (event.date > targetDate) break;
    if (!offsetAccount) {
      balance = growTransactionBalanceBetween(account, balance, cursor, event.date);
    }
    balance += event.amount;
    cursor = event.date;
  }
  if (!offsetAccount) {
    balance = growTransactionBalanceBetween(account, balance, cursor, targetDate);
  }
  return balance;
}

function linkedLoanIds(account: FinancialAccount, loans: FinancialAccount[]): string[] {
  return getLinkedLoanIds(account, loans);
}

function isLinkedOffsetAccount(account: FinancialAccount, loans: FinancialAccount[]): boolean {
  return linkedLoanIds(account, loans).some(id => loans.some(loan => loan.account_id === id));
}

function offsetForLoan(
  loan: FinancialAccount,
  loans: FinancialAccount[],
  transactions: FinancialAccount[],
  transactionFlowEvents: Map<string, TransactionFlowEvent[]>,
  date: number,
  today: number
): number {
  const offset = transactions.reduce((sum, account) => {
    const linkedIds = linkedLoanIds(account, loans);
    if (!linkedIds.includes(loan.account_id)) return sum;
    const linkedLoans = loans.filter(item => linkedIds.includes(item.account_id));
    const totalLinkedBalance = linkedLoans.reduce(
      (total, item) => total + Math.max(0, Number(item.balance) || 0),
      0
    );
    if (!totalLinkedBalance) return sum;

    const config = getOffsetAccountConfig(account) ?? getOffsetAccountConfig(loan);
    const offsetType = (config?.offset_type || config?.offsetType || 'Full Offset').toLowerCase();
    const percentage = Number(config?.percentage);
    const factor = offsetType.includes('partial')
      ? Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) / 100 : 0
      : 1;
    const accountBalance = Math.max(
      0,
      cashBalanceAt(account, transactionFlowEvents, date, today)
    ) * factor;
    const allocatedBalance = accountBalance
      * Math.max(0, Number(loan.balance) || 0) / totalLinkedBalance;
    const cappedBalance = offsetType.includes('capped')
      ? Math.min(allocatedBalance, Math.max(0, Number(loan.balance) || 0) * (
        Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) / 100 : 0
      ))
      : allocatedBalance;
    return sum + cappedBalance;
  }, 0);
  return Math.min(Math.max(0, Number(loan.balance) || 0), offset);
}

function getLoanEndDate(account: FinancialAccount, today: number): number {
  const storedEnd = account.end_date ? toUtcDate(account.end_date) : null;
  if (storedEnd !== null) return Math.max(storedEnd, today);

  const defaultEnd = getDefaultEndDate(
    account.account_type,
    account.start_date && isValidDate(account.start_date) ? account.start_date : dateString(today)
  );
  const parsedDefault = defaultEnd ? toUtcDate(defaultEnd) : null;
  return parsedDefault ?? today + MAX_YEARS * YEAR_MS;
}

function getLoanChargeEvents(
  account: FinancialAccount,
  start: number,
  end: number
): LoanChargeEvent[] {
  if (!CREDIT_SPENDING_TYPES.has(account.account_type)) return [];

  return getPaymentEntries(account.payments).flatMap(entry => {
    if (entry.type !== 'Bill Payment' && entry.type !== 'Expense') return [];
    const amount = Number(entry.amount);
    const chargeStart = toUtcDate(entry.startDate || entry.date || '');
    const chargeEnd = entry.endDate ? toUtcDate(entry.endDate) : null;
    if (!Number.isFinite(amount) || amount <= 0 || chargeStart === null) return [];

    const recurring = !!entry.frequency
      && !/one.?time|once|single/i.test(entry.frequency);
    if (!recurring) {
      return chargeStart > start && chargeStart <= end && (chargeEnd === null || chargeStart <= chargeEnd)
        ? [{ amount, date: chargeStart }]
        : [];
    }

    const occurrencesThroughStart = countPaymentOccurrencesBetween(entry, chargeStart, start);
    let date = addFrequency(chargeStart, entry.frequency || 'Monthly', occurrencesThroughStart);
    const events: LoanChargeEvent[] = [];
    let occurrences = 0;
    while (
      date > start
      && date <= end
      && (chargeEnd === null || date <= chargeEnd)
      && occurrences < 12000
    ) {
      events.push({ amount, date });
      date = addFrequency(date, entry.frequency || 'Monthly');
      occurrences += 1;
    }
    return events;
  });
}

function simulateLoan(
  account: FinancialAccount,
  loans: FinancialAccount[],
  transactions: FinancialAccount[],
  transactionFlowEvents: Map<string, TransactionFlowEvent[]>,
  partPayments: PartPaymentEntry[],
  today: number,
  stopDate: number,
  includeOffsets: boolean
): LoanSimulation {
  const startingBalance = Math.max(0, Number(account.balance) || 0);
  const rates = getRates(account);
  const payment = getPayments(account);
  const frequency = payment?.frequency || 'Monthly';
  const periods = periodsPerYear(frequency);
  const maturity = Math.min(getLoanEndDate(account, today), stopDate);
  const paymentEndDate = payment?.endDate ? toUtcDate(payment.endDate) : null;
  const points: BalancePoint[] = [{ date: today, balance: startingBalance }];
  const repaymentsByYear = Array(MAX_YEARS + 1).fill(0) as number[];
  const additionalPaymentsByYear = Array(MAX_YEARS + 1).fill(0) as number[];
  const interestByYear = Array(MAX_YEARS + 1).fill(0) as number[];
  let balance = startingBalance;
  let cursor = today;
  let finishDate = maturity;
  let iterations = 0;
  let nextMetricYear = 1;
  let totalRepayments = 0;
  let totalAdditionalPayments = 0;
  let totalInterest = 0;

  while (cursor < maturity && balance > 0.005 && iterations < MAX_YEARS * 366) {
    const scheduledNext = addFrequency(cursor, frequency);
    const next = Math.min(scheduledNext, maturity);
    if (next <= cursor) break;
    const offsetBalance = includeOffsets
      ? offsetForLoan(account, loans, transactions, transactionFlowEvents, next, today)
      : 0;
    const rate = rates.length
      ? loanPeriodRate(rates, cursor, next, scheduledNext, periods)
      : (getAccountInterestRate(account) ?? 0) / 100 / periods
        * (next - cursor) / (scheduledNext - cursor);
    const chargeEvents = getLoanChargeEvents(account, cursor, next);
    const chargeAmount = chargeEvents.reduce((total, event) => total + event.amount, 0);
    const chargeInterest = chargeEvents.reduce(
      (total, event) => total + event.amount * rate * (next - event.date) / (next - cursor),
      0
    );
    const interest = Math.max(0, balance - offsetBalance) * rate + chargeInterest;
    totalInterest += interest;
    balance += chargeAmount + interest;
    if (payment && scheduledNext <= maturity && (paymentEndDate === null || scheduledNext <= paymentEndDate)) {
      const paid = Math.min(balance, payment.amount);
      balance -= paid;
      totalRepayments += paid;
    }
    const additionalPayments = includeOffsets
      ? partPayments
        .filter(entry => entry.linkedAccountId === account.account_id)
        .reduce(
          (total, entry) => total + entry.amount * countPaymentOccurrencesBetween(entry, cursor + 86400000, next),
          0
        )
      : 0;
    const additionalPaid = Math.min(balance, additionalPayments);
    balance -= additionalPaid;
    totalAdditionalPayments += additionalPaid;
    cursor = next;
    points.push({ date: cursor, balance });
    while (nextMetricYear <= MAX_YEARS && addMonths(today, nextMetricYear * 12) <= cursor) {
      repaymentsByYear[nextMetricYear] = totalRepayments;
      additionalPaymentsByYear[nextMetricYear] = totalAdditionalPayments;
      interestByYear[nextMetricYear] = totalInterest;
      nextMetricYear += 1;
    }
    iterations += 1;

    if (balance <= 0.005) {
      balance = 0;
      points[points.length - 1].balance = 0;
      finishDate = cursor;
      break;
    }
  }

  if (points[points.length - 1].date < maturity) {
    points.push({ date: maturity, balance });
  }
  while (nextMetricYear <= MAX_YEARS) {
    repaymentsByYear[nextMetricYear] = totalRepayments;
    additionalPaymentsByYear[nextMetricYear] = totalAdditionalPayments;
    interestByYear[nextMetricYear] = totalInterest;
    nextMetricYear += 1;
  }
  return {
    points,
    finishDate,
    repaymentsByYear,
    additionalPaymentsByYear,
    interestByYear,
  };
}

function balanceAt(points: BalancePoint[], date: number): number {
  let balance = points[0]?.balance ?? 0;
  for (const point of points) {
    if (point.date > date) break;
    balance = point.balance;
  }
  return balance;
}

function annualSamples(points: BalancePoint[], today: number, years: number): number[] {
  return Array.from({ length: years + 1 }, (_, year) => balanceAt(points, addMonths(today, year * 12)));
}

function loanPeriodRate(
  rates: RateEntry[],
  cursor: number,
  next: number,
  scheduledNext: number,
  periods: number
): number {
  const periodDuration = scheduledNext - cursor;
  const boundaries = [...rateBoundaries(rates, cursor, next), next];
  let segmentStart = cursor;
  let periodRate = 0;
  for (const segmentEnd of boundaries) {
    periodRate += rateOnDate(rates, segmentStart) / 100 / periods
      * (segmentEnd - segmentStart) / periodDuration;
    segmentStart = segmentEnd;
  }
  return periodRate;
}

function yearsBetween(start: number, end: number): number {
  return Math.min(MAX_YEARS, Math.max(1, Math.ceil((end - start) / YEAR_MS)));
}

function annualRepayment(payment: PaymentEntry): number {
  return payment.amount * periodsPerYear(payment.frequency);
}

export function getProjectedLoanBalancesAtDate(
  loans: FinancialAccount[],
  transactions: FinancialAccount[],
  date: string
): Record<string, number> {
  const targetDate = toUtcDate(date);
  if (targetDate === null) throw new Error(`Invalid loan projection date: ${date}`);
  const today = toUtcDate(getTodayDate())!;
  const accounts = [...loans, ...transactions];
  if (targetDate <= today) {
    return getAccountBalancesAsOf(accounts, date);
  }

  const balancesToday = getAccountBalancesAsOf(accounts, getTodayDate());
  const projectedLoans = loans.map(loan => ({
    ...loan,
    balance: balancesToday[loan.account_id] ?? loan.balance ?? 0,
  }));
  const projectedTransactions = transactions.map(account => ({
    ...account,
    balance: balancesToday[account.account_id] ?? account.balance ?? 0,
  }));
  const partPayments: PartPaymentEntry[] = transactions.flatMap(account =>
    getPaymentEntries(account.payments).flatMap(entry => {
      const linkedAccountId = entry.linkedAccountId || entry.linked_account_id;
      const startDate = entry.startDate || entry.date || '';
      return entry.type === 'Part Payment'
        && linkedAccountId
        && isValidDate(startDate)
        && Number.isFinite(Number(entry.amount))
        && Number(entry.amount) > 0
        ? [{
            amount: Number(entry.amount),
            linkedAccountId,
            startDate,
            frequency: entry.frequency,
            endDate: entry.endDate,
          }]
        : [];
    })
  );
  const simulate = (events: Map<string, TransactionFlowEvent[]>) =>
    projectedLoans.map(loan => ({
      loan,
      result: simulateLoan(
        loan,
        projectedLoans,
        projectedTransactions,
        events,
        partPayments,
        today,
        targetDate,
        true
      ),
    }));

  let events = getTransactionFlowEvents(projectedTransactions, today, targetDate);
  let runs = simulate(events);
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const payoffDates = new Map(runs.map(({ loan, result }) => [loan.account_id, result.finishDate]));
    const nextEvents = getTransactionFlowEvents(projectedTransactions, today, targetDate, payoffDates);
    const nextRuns = simulate(nextEvents);
    const stable = runs.every(run =>
      nextRuns.find(next => next.loan.account_id === run.loan.account_id)
        ?.result.finishDate === run.result.finishDate);
    events = nextEvents;
    runs = nextRuns;
    if (stable) break;
  }

  return Object.fromEntries(runs.map(({ loan, result }) => [
    loan.account_id,
    balanceAt(result.points, targetDate),
  ]));
}

export function projectFinancials(
  loans: FinancialAccount[],
  transactions: FinancialAccount[],
  projectionStartDate = getTodayDate()
): FinancialProjection {
  const today = toUtcDate(projectionStartDate);
  if (today === null) throw new Error(`Invalid projection start date: ${projectionStartDate}`);
  const projectionHorizon = today + MAX_YEARS * YEAR_MS;
  const partPayments: PartPaymentEntry[] = transactions.flatMap(account =>
    getPaymentEntries(account.payments)
      .filter((entry): entry is typeof entry & { amount: number } =>
        entry.type === 'Part Payment' && Number.isFinite(Number(entry.amount)) && Number(entry.amount) > 0)
      .flatMap(entry => {
        const linkedAccountId = entry.linkedAccountId || entry.linked_account_id;
        const startDate = entry.startDate || entry.date || '';
        return linkedAccountId && isValidDate(startDate)
          ? [{
              amount: Number(entry.amount),
              linkedAccountId,
              startDate,
              frequency: entry.frequency,
              endDate: entry.endDate,
            }]
          : [];
      })
  );
  const upcomingPartPaymentTotal = partPayments.reduce(
    (total, entry) => total + entry.amount * countPaymentOccurrencesBetween(
      entry,
      today + 86400000,
      addMonths(today, 12)
    ),
    0
  );
  const nonCreditLoans = loans.filter(loan => loan.account_type !== CREDIT_CARD_TYPE);
  const creditCardLoans = loans.filter(loan => loan.account_type === CREDIT_CARD_TYPE);
  const simulateAllRuns = (events: Map<string, TransactionFlowEvent[]>) => {
    const nonCreditRuns = nonCreditLoans.map(loan => ({
      account: loan,
      result: simulateLoan(loan, loans, transactions, events, partPayments, today, projectionHorizon, true),
      scheduledResult: simulateLoan(loan, loans, transactions, events, [], today, projectionHorizon, false),
      offsetResult: simulateLoan(loan, loans, transactions, events, [], today, projectionHorizon, true),
    }));
    const finalOtherLoanDate = nonCreditRuns.length
      ? Math.max(...nonCreditRuns.map(({ result }) => result.finishDate))
      : projectionHorizon;
    const creditCardStop = Math.max(today + 1, finalOtherLoanDate);
    const allRuns = [
      ...nonCreditRuns,
      ...creditCardLoans.map(account => ({
        account,
        result: simulateLoan(account, loans, transactions, events, partPayments, today, creditCardStop, true),
        scheduledResult: simulateLoan(account, loans, transactions, events, [], today, creditCardStop, false),
        offsetResult: simulateLoan(account, loans, transactions, events, [], today, creditCardStop, true),
      })),
    ];
    return { allRuns, finalOtherLoanDate };
  };
  let transactionFlowEvents = getTransactionFlowEvents(transactions, today, projectionHorizon);
  let simulation = simulateAllRuns(transactionFlowEvents);
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const payoffDates = new Map(
      simulation.allRuns.map(({ account, result }) => [account.account_id, result.finishDate])
    );
    const nextEvents = getTransactionFlowEvents(transactions, today, projectionHorizon, payoffDates);
    const nextSimulation = simulateAllRuns(nextEvents);
    const stable = simulation.allRuns.every(run =>
      nextSimulation.allRuns.find(next => next.account.account_id === run.account.account_id)
        ?.result.finishDate === run.result.finishDate);
    transactionFlowEvents = nextEvents;
    simulation = nextSimulation;
    if (stable) break;
  }
  const { allRuns, finalOtherLoanDate } = simulation;
  const defaultYears = nonCreditLoans.length
    ? yearsBetween(today, finalOtherLoanDate)
    : MAX_YEARS;

  const loanSeries = allRuns.map(({ account, result }, index) => ({
    id: `${account.account_id}-actual`,
    label: `Actual · ${account.title || account.account_type}`,
    color: COLORS[index % COLORS.length],
    values: annualSamples(result.points, today, MAX_YEARS),
  }));
  const scheduledLoanSeries = allRuns.map(({ account, scheduledResult }, index) => ({
    id: `${account.account_id}-scheduled`,
    label: `Scheduled · ${account.title || account.account_type}`,
    color: COLORS[(index + allRuns.length) % COLORS.length],
    values: annualSamples(scheduledResult.points, today, MAX_YEARS),
  }));
  const sumRunMetricByYear = (
    selector: (run: typeof allRuns[number]) => number[]
  ) => Array.from({ length: MAX_YEARS + 1 }, (_, year) =>
    allRuns.reduce((total, run) => total + selector(run)[year], 0));
  const transactionSeries = transactions.map((account, index) => ({
    id: account.account_id,
    label: account.title || account.account_type,
    color: COLORS[(index + loanSeries.length) % COLORS.length],
    values: projectTransactionBalanceSeries(account, transactionFlowEvents, today, loans),
  }));
  const transactionValuesById = new Map(
    transactionSeries.map(series => [series.id, series.values])
  );

  const combinedSeries: ProjectionSeries[] = [
    {
      id: 'total-loans',
      label: 'Total loans',
      color: '#dc3545',
      values: Array.from({ length: MAX_YEARS + 1 }, (_, year) =>
        loanSeries.reduce((sum, series) => sum + series.values[year], 0)),
    },
    {
      id: 'total-transactions',
      label: 'Total assets',
      color: '#28a745',
      values: Array.from({ length: MAX_YEARS + 1 }, (_, year) =>
        transactionSeries.reduce((sum, series) => sum + series.values[year], 0)),
    },
  ];
  const scheduledMonthlyRepayments = loans.reduce((sum, account) => {
    const payment = getPayments(account);
    return payment ? sum + annualRepayment(payment) / 12 : sum;
  }, 0);
  const additionalMonthlyRepayments = upcomingPartPaymentTotal / 12;
  const monthlyRepayments = scheduledMonthlyRepayments + additionalMonthlyRepayments;
  const totalOffsetBalance = transactions.reduce((sum, account) =>
    isLinkedOffsetAccount(account, loans)
      ? sum + Math.max(0, Number(account.balance) || 0)
      : sum, 0);
  const remainingTransactionBalance = transactions.reduce((sum, account) => {
    const balance = Math.max(0, Number(account.balance) || 0);
    return sum + (isLinkedOffsetAccount(account, loans) ? 0 : balance);
  }, 0);
  const totalOffsetBalanceByYear = Array.from({ length: MAX_YEARS + 1 }, (_, year) =>
    transactions.reduce((sum, account) => {
      if (!isLinkedOffsetAccount(account, loans)) return sum;
      return sum + Math.max(0, transactionValuesById.get(account.account_id)?.[year] || 0);
    }, 0));
  const remainingTransactionBalanceByYear = Array.from({ length: MAX_YEARS + 1 }, (_, year) =>
    transactions.reduce((sum, account) => {
      if (isLinkedOffsetAccount(account, loans)) return sum;
      return sum + Math.max(
        0,
        transactionValuesById.get(account.account_id)?.[year] || 0
      );
    }, 0));

  return {
    years: defaultYears,
    defaultYears,
    loanSeries,
    scheduledLoanSeries,
    transactionSeries,
    combinedSeries,
    loanBalancesByYear: combinedSeries[0].values,
    scheduledLoanBalancesByYear: Array.from({ length: MAX_YEARS + 1 }, (_, year) =>
      scheduledLoanSeries.reduce((sum, series) => sum + series.values[year], 0)),
    scheduledRepaymentsByYear: sumRunMetricByYear(run => run.scheduledResult.repaymentsByYear),
    scheduledInterestByYear: sumRunMetricByYear(run => run.scheduledResult.interestByYear),
    offsetInterestSavedByYear: Array.from({ length: MAX_YEARS + 1 }, (_, year) =>
      allRuns.reduce(
        (total, run) => total + Math.max(
          0,
          run.scheduledResult.interestByYear[year] - run.offsetResult.interestByYear[year]
        ),
        0
      )),
    actualScheduledRepaymentsByYear: sumRunMetricByYear(run => run.result.repaymentsByYear),
    actualAdditionalPaymentsByYear: sumRunMetricByYear(run => run.result.additionalPaymentsByYear),
    actualInterestByYear: sumRunMetricByYear(run => run.result.interestByYear),
    transactionBalancesByYear: combinedSeries[1].values,
    totalOffsetBalanceByYear,
    remainingTransactionBalanceByYear,
    monthlyRepayments,
    scheduledMonthlyRepayments,
    additionalMonthlyRepayments,
    totalOffsetBalance,
    remainingTransactionBalance,
  };
}

export function getLoanTypeLabel(accountType: string): string {
  return ACCOUNT_TYPES[accountType]?.label || accountType;
}
