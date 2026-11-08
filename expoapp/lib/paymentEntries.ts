import { FINANCIAL_YEAR_START_MONTH, getTodayDate, LOAN_TYPES } from '../config/accountTypes';

export interface PaymentEntry {
  id?: string;
  type?: string;
  description?: string;
  amount?: number | string;
  startDate?: string;
  date?: string;
  frequency?: string;
  endDate?: string | null;
  linkedAccountId?: string;
  linked_account_id?: string;
}

export interface NewPaymentEntry extends PaymentEntry {
  id: string;
  type: string;
  description: string;
  amount: number;
  startDate: string;
}

export interface SaveActivity extends NewPaymentEntry {
  accountId: string;
  accountTitle: string;
  linkedAccountTitle?: string;
}

interface AccountWithPayments {
  account_id: string;
  title: string;
  account_type?: string;
  payments?: unknown;
  balance?: number | string | null;
  start_date?: string | null;
  created_at?: string | null;
}

export function getPaymentEntries(value: unknown): PaymentEntry[] {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new Error(`Could not read saved account payments: ${String(error)}`);
    }
  }

  const entries = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? [parsed] : [];
  return entries.filter((entry): entry is PaymentEntry =>
    !!entry && typeof entry === 'object' && !Array.isArray(entry));
}

export function getSaveSummary(accounts: AccountWithPayments[], asOfDate = getTodayDate()) {
  const accountsById = new Map(accounts.map(account => [account.account_id, account]));
  const incomeEntries: SaveActivity[] = [];
  const savingEntries: SaveActivity[] = [];

  accounts.forEach(account => {
    getPaymentEntries(account.payments).forEach((entry, index) => {
      if (entry.type !== 'Income' && entry.type !== 'Payment') return;

      const amount = Number(entry.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const linkedAccountId = entry.linkedAccountId || entry.linked_account_id;
      const activity: SaveActivity = {
        id: entry.id || `${account.account_id}-${index}`,
        type: entry.type,
        description: entry.description || '',
        amount,
        startDate: entry.startDate || entry.date || '',
        frequency: entry.frequency,
        endDate: entry.endDate,
        linkedAccountId,
        accountId: account.account_id,
        accountTitle: account.title || 'Account',
        linkedAccountTitle: linkedAccountId ? accountsById.get(linkedAccountId)?.title : undefined,
      };

      if (entry.type === 'Income') incomeEntries.push(activity);
      else savingEntries.push(activity);
    });
  });

  const asOf = dateTimestamp(asOfDate);
  if (asOf === null) throw new Error(`Invalid save summary date: ${asOfDate}`);
  const totalIncome = incomeEntries.reduce(
    (total, entry) => total + entry.amount * occurrencesThroughDate(entry, asOf),
    0
  );
  const totalSaved = savingEntries.reduce(
    (total, entry) => total + entry.amount * occurrencesThroughDate(entry, asOf),
    0
  );

  return {
    totalIncome,
    totalSaved,
    balance: totalIncome - totalSaved,
    incomeEntries,
    savingEntries,
  };
}

export interface SpendActivity extends NewPaymentEntry {
  accountId: string;
  accountTitle: string;
  linkedAccountTitle?: string;
}

export interface SaveProjectionTotals {
  totalIncome: number;
  totalSaved: number;
  balance: number;
  periodStart: string;
  periodEnd: string;
}

export type SpendProjectionPeriod =
  | { type: 'months'; months: number }
  | { type: 'financial-year'; startYear: number };

function dateTimestamp(value: string | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : null;
}

function monthlyOccurrence(start: number, monthsPerOccurrence: number, occurrence: number): number {
  const startDate = new Date(start);
  const day = startDate.getUTCDate();
  const date = new Date(start);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + monthsPerOccurrence * occurrence);

  const nextMonth = new Date(date);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  nextMonth.setUTCDate(0);
  date.setUTCDate(Math.min(day, nextMonth.getUTCDate()));
  return date.getTime();
}

function occurrencesThroughDate(
  entry: { amount: number; startDate: string; frequency?: string; endDate?: string | null },
  asOf: number
): number {
  const start = dateTimestamp(entry.startDate);
  if (start === null) return 1;
  if (start > asOf) return 0;
  if (!entry.frequency) return 1;

  const end = entry.endDate ? dateTimestamp(entry.endDate) : null;
  const through = end === null ? asOf : Math.min(asOf, end);
  if (through < start) return 0;

  const frequency = entry.frequency.toLowerCase();
  const dayMs = 24 * 60 * 60 * 1000;
  let intervalDays = 0;
  let intervalMonths = 0;

  if (frequency.includes('fortnight') || frequency.includes('bi-week') || frequency.includes('biweekly')) {
    intervalDays = 14;
  } else if (frequency.includes('week')) {
    intervalDays = 7;
  } else if (frequency.includes('quarter')) {
    intervalMonths = 3;
  } else if (frequency.includes('bi annual') || frequency.includes('bi-annual') || frequency.includes('biannual')) {
    intervalMonths = 6;
  } else if (frequency.includes('year') || frequency.includes('annual')) {
    intervalMonths = 12;
  } else if (frequency.includes('day')) {
    intervalDays = 1;
  } else {
    intervalMonths = 1;
  }

  if (intervalDays) return Math.floor((through - start) / (intervalDays * dayMs)) + 1;

  const startDate = new Date(start);
  const throughDate = new Date(through);
  let occurrence = Math.floor(
    ((throughDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12
      + throughDate.getUTCMonth() - startDate.getUTCMonth()) / intervalMonths
  );
  if (monthlyOccurrence(start, intervalMonths, occurrence) > through) occurrence -= 1;
  return Math.max(0, occurrence + 1);
}

function occurrencesBetweenDates(
  entry: { amount: number; startDate: string; frequency?: string; endDate?: string | null },
  start: number,
  end: number
): number {
  if (end < start) return 0;
  const previousDay = start - 24 * 60 * 60 * 1000;
  return Math.max(0, occurrencesThroughDate(entry, end) - occurrencesThroughDate(entry, previousDay));
}

export function countPaymentOccurrencesBetween(
  entry: PaymentEntry,
  start: number,
  end: number
): number {
  const amount = Number(entry.amount);
  const startDate = entry.startDate || entry.date || '';
  if (!Number.isFinite(amount) || amount <= 0 || dateTimestamp(startDate) === null) return 0;
  return occurrencesBetweenDates({
    amount,
    startDate,
    frequency: entry.frequency,
    endDate: entry.endDate,
  }, start, end);
}

export function getAccountBalancesAsOf(
  accounts: AccountWithPayments[],
  asOfDate = getTodayDate()
): Record<string, number> {
  const asOf = dateTimestamp(asOfDate);
  if (asOf === null) throw new Error(`Invalid account balance date: ${asOfDate}`);

  const accountsById = new Map(accounts.map(account => [account.account_id, account]));
  const balances = new Map(accounts.map(account => [
    account.account_id,
    Number(account.balance) || 0,
  ]));
  const baselineDates = new Map(accounts.map(account => {
    const storedDate = account.start_date || account.created_at?.slice(0, 10);
    return [account.account_id, dateTimestamp(storedDate) ?? asOf];
  }));
  const apply = (accountId: string, entry: PaymentEntry, direction: 1 | -1) => {
    const balance = balances.get(accountId);
    const account = accountsById.get(accountId);
    const baseline = baselineDates.get(accountId);
    if (balance === undefined || !account || baseline === undefined) return;
    const startDate = entry.startDate || entry.date || '';
    const amount = Number(entry.amount);
    const entryStart = dateTimestamp(startDate);
    if (!Number.isFinite(amount) || amount <= 0 || entryStart === null || entryStart > asOf) return;
    const effectiveStart = Math.max(baseline, entryStart);
    const count = countPaymentOccurrencesBetween(entry, effectiveStart, asOf);
    balances.set(accountId, balance + direction * amount * count);
  };

  accounts.forEach(account => {
    getPaymentEntries(account.payments).forEach(entry => {
      if (entry.type !== 'Income'
        && entry.type !== 'Payment'
        && entry.type !== 'Part Payment'
        && entry.type !== 'Bill Payment'
        && entry.type !== 'Expense') return;

      if (entry.type === 'Income') {
        apply(account.account_id, entry, 1);
        return;
      }

      const direction = (entry.type === 'Bill Payment' || entry.type === 'Expense')
        && LOAN_TYPES.includes(account.account_type || '')
        ? 1
        : -1;
      apply(account.account_id, entry, direction);
      const linkedAccountId = entry.linkedAccountId || entry.linked_account_id;
      if (entry.type === 'Payment' && linkedAccountId) {
        apply(linkedAccountId, entry, 1);
      } else if (entry.type === 'Part Payment' && linkedAccountId) {
        apply(linkedAccountId, entry, -1);
      }
    });
  });

  return Object.fromEntries(balances);
}

function startOfFinancialYear(year: number, startMonth: number): number {
  return Date.UTC(year, startMonth, 1);
}

function addMonths(timestamp: number, months: number): number {
  return monthlyOccurrence(timestamp, 1, months);
}

function projectionWindow(
  asOf: number,
  period: SpendProjectionPeriod,
  financialYearStartMonth: number
): { start: number; end: number } {
  if (period.type === 'financial-year') {
    return {
      start: startOfFinancialYear(period.startYear, financialYearStartMonth),
      end: startOfFinancialYear(period.startYear + 1, financialYearStartMonth) - 24 * 60 * 60 * 1000,
    };
  }
  if (!Number.isInteger(period.months) || period.months < 1 || period.months > 12) {
    throw new Error(`Invalid spend projection period: ${period.months} months`);
  }
  return { start: asOf + 24 * 60 * 60 * 1000, end: addMonths(asOf, period.months) };
}

function paymentFlowTotals(accounts: AccountWithPayments[], start: number, end: number) {
  return accounts.reduce((totals, account) => {
    getPaymentEntries(account.payments).forEach(entry => {
      if (entry.type !== 'Income' && entry.type !== 'Payment') return;
      const amount = Number(entry.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const activity = {
        amount,
        startDate: entry.startDate || entry.date || '',
        frequency: entry.frequency,
        endDate: entry.endDate,
      };
      const total = amount * occurrencesBetweenDates(activity, start, end);
      if (entry.type === 'Income') totals.income += total;
      else totals.saved += total;
    });
    return totals;
  }, { income: 0, saved: 0 });
}

export function getSpendSummary(
  availableAccounts: (AccountWithPayments & { balance?: number | string | null })[],
  loanAccounts: AccountWithPayments[],
  asOfDate = getTodayDate(),
  period: SpendProjectionPeriod = { type: 'months', months: 1 },
  saveAccounts: AccountWithPayments[] = availableAccounts,
  financialYearStartMonth = FINANCIAL_YEAR_START_MONTH
) {
  const accountsById = new Map(
    [...availableAccounts, ...loanAccounts].map(account => [account.account_id, account])
  );
  const payments: SpendActivity[] = [];
  const expenses: SpendActivity[] = [];

  [...availableAccounts, ...loanAccounts].forEach(account => {
    getPaymentEntries(account.payments).forEach((entry, index) => {
      if (entry.type !== 'Part Payment' && entry.type !== 'Bill Payment' && entry.type !== 'Expense') return;

      const amount = Number(entry.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const linkedAccountId = entry.linkedAccountId || entry.linked_account_id;
      const activity: SpendActivity = {
        id: entry.id || `${account.account_id}-${index}`,
        type: entry.type,
        description: entry.description || '',
        amount,
        startDate: entry.startDate || entry.date || '',
        frequency: entry.frequency,
        endDate: entry.endDate,
        linkedAccountId,
        accountId: account.account_id,
        accountTitle: account.title || 'Account',
        linkedAccountTitle: linkedAccountId ? accountsById.get(linkedAccountId)?.title : undefined,
      };

      if (entry.type === 'Part Payment') payments.push(activity);
      else expenses.push(activity);
    });
  });

  const asOf = dateTimestamp(asOfDate);
  if (asOf === null) throw new Error(`Invalid spend summary date: ${asOfDate}`);
  const { start: periodStart, end: periodEnd } = projectionWindow(asOf, period, financialYearStartMonth);
  const balanceAsOf = period.type === 'financial-year'
    ? periodStart - 24 * 60 * 60 * 1000
    : asOf;
  const balancesAtPeriodStart = getAccountBalancesAsOf(
    availableAccounts,
    new Date(balanceAsOf).toISOString().slice(0, 10)
  );
  const startingAvailable = availableAccounts.reduce(
    (total, account) => total + (balancesAtPeriodStart[account.account_id] ?? 0),
    0
  );
  const flowsDuringPeriod = paymentFlowTotals(saveAccounts, periodStart, periodEnd);
  const totalSpend = expenses.reduce(
    (total, entry) => total + entry.amount * occurrencesBetweenDates(entry, periodStart, periodEnd),
    0
  );
  const billPaymentSpend = expenses.filter(entry => entry.type === 'Bill Payment').reduce(
    (total, entry) => total + entry.amount * occurrencesBetweenDates(entry, periodStart, periodEnd),
    0
  );
  const expenseSpend = expenses.filter(entry => entry.type === 'Expense').reduce(
    (total, entry) => total + entry.amount * occurrencesBetweenDates(entry, periodStart, periodEnd),
    0
  );
  const currentAvailable = startingAvailable;
  const projectedAvailable = currentAvailable + flowsDuringPeriod.income;
  const projectedBalance = projectedAvailable - totalSpend;

  return {
    startingAvailable,
    totalSpend,
    currentAvailable,
    projectedAvailable,
    projectedBalance,
    billPaymentSpend,
    expenseSpend,
    periodStart: new Date(periodStart).toISOString().slice(0, 10),
    periodEnd: new Date(periodEnd).toISOString().slice(0, 10),
    payments,
    expenses,
  };
}

export function getSaveProjectionTotals(
  accounts: AccountWithPayments[],
  asOfDate = getTodayDate(),
  period: SpendProjectionPeriod = { type: 'months', months: 1 },
  financialYearStartMonth = FINANCIAL_YEAR_START_MONTH
): SaveProjectionTotals {
  const asOf = dateTimestamp(asOfDate);
  if (asOf === null) throw new Error(`Invalid save projection date: ${asOfDate}`);
  const { start, end } = projectionWindow(asOf, period, financialYearStartMonth);
  const totals = paymentFlowTotals(accounts, start, end);
  return {
    totalIncome: totals.income,
    totalSaved: totals.saved,
    balance: totals.income,
    periodStart: new Date(start).toISOString().slice(0, 10),
    periodEnd: new Date(end).toISOString().slice(0, 10),
  };
}
