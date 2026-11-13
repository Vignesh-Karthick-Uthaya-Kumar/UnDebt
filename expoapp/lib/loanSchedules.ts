import { ACCOUNT_TYPES, getTodayDate } from '../config/accountTypes';

export type LoanPaymentType =
  | 'Principal and Interest'
  | 'Interest Only'
  | 'Min balance'
  | 'Full payment';

export interface RepaymentScheduleDraft {
  id: string;
  amount: string;
  type: LoanPaymentType;
  frequency: string;
  startDate: string;
  endDate: string;
  sameInterestRate: boolean;
  interestRate: string;
}

export interface LoanScheduleDraft {
  interestOnlyPeriodEnabled: boolean;
  interestOnlyStartDate: string;
  interestOnlyEndDate: string;
  interestFreePeriodEnabled: boolean;
  interestFreeStartDate: string;
  interestFreeEndDate: string;
  creditCardPaymentType: 'Min balance' | 'Full payment';
  repayments: RepaymentScheduleDraft[];
}

export function addCalendarDays(value: string, days: number): string {
  const date = parseDate(value);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addCalendarMonths(value: string, months: number): string {
  const date = parseDate(value);
  if (!date) return '';
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export function createDefaultLoanScheduleDraft(
  accountType: string,
  loanStartDate: string,
  loanEndDate: string,
  today = getTodayDate()
): LoanScheduleDraft {
  const config = ACCOUNT_TYPES[accountType];
  const scheduleStart = loanStartDate > today ? loanStartDate : today;
  const isCreditCard = accountType === 'CreditCard';
  const isBuyNowPayLater = accountType === 'BuyNowPayLater';
  const interestOnlyEndDate = addCalendarMonths(today, 6);
  return {
    interestOnlyPeriodEnabled: false,
    interestOnlyStartDate: today,
    interestOnlyEndDate,
    interestFreePeriodEnabled: false,
    interestFreeStartDate: today,
    interestFreeEndDate: '',
    creditCardPaymentType: 'Min balance',
    repayments: [{
      id: `${Date.now()}-repayment`,
      amount: isCreditCard ? '' : String(config?.defaultPaymentAmount ?? ''),
      type: isCreditCard ? 'Min balance' : 'Principal and Interest',
      frequency: isBuyNowPayLater ? 'Fortnightly' : config?.defaultPaymentFrequency || 'Monthly',
      startDate: scheduleStart,
      endDate: loanEndDate,
      sameInterestRate: true,
      interestRate: '',
    }],
  };
}

export function validateLoanScheduleDraft(
  accountType: string,
  loanStartDate: string,
  loanEndDate: string,
  draft: LoanScheduleDraft,
  today = getTodayDate()
): string | null {
  const isCreditCard = accountType === 'CreditCard';
  const needsEndDate = accountType !== 'CreditCard';

  if (!isValidDate(loanStartDate)) return 'Enter a valid loan start date.';
  if (needsEndDate && !isValidDate(loanEndDate)) return 'Enter a valid loan end date.';
  if (loanEndDate && (!isValidDate(loanEndDate) || loanEndDate < loanStartDate)) {
    return 'Loan end date must be on or after the loan start date.';
  }
  if (!draft.repayments.length) return 'Add at least one repayment schedule.';

  if (draft.interestOnlyPeriodEnabled) {
    if (!isValidDate(draft.interestOnlyStartDate) || !isValidDate(draft.interestOnlyEndDate)) {
      return 'Enter valid interest-only period dates.';
    }
    if (draft.interestOnlyEndDate < draft.interestOnlyStartDate) {
      return 'Interest-only period end date must be on or after its start date.';
    }
  }

  if (draft.interestFreePeriodEnabled) {
    if (!isValidDate(draft.interestFreeStartDate) || !isValidDate(draft.interestFreeEndDate)) {
      return 'Enter valid interest-free period dates.';
    }
    if (draft.interestFreeEndDate < draft.interestFreeStartDate) {
      return 'Interest-free period end date must be on or after its start date.';
    }
  }

  const periods: { startDate: string; endDate: string; label: string }[] = [];
  if (draft.interestOnlyPeriodEnabled) {
    periods.push({
      startDate: draft.interestOnlyStartDate,
      endDate: draft.interestOnlyEndDate,
      label: 'Interest-only period',
    });
  }
  if (draft.interestFreePeriodEnabled) {
    periods.push({
      startDate: draft.interestFreeStartDate,
      endDate: draft.interestFreeEndDate,
      label: 'Interest-free period',
    });
  }

  draft.repayments.forEach((repayment, index) => {
    if (!isValidDate(repayment.startDate)) {
      periods.push({ startDate: '', endDate: '', label: `Repayment ${index + 1} has an invalid start date` });
      return;
    }
    if (repayment.endDate && !isValidDate(repayment.endDate)) {
      periods.push({ startDate: '', endDate: '', label: `Repayment ${index + 1} has an invalid end date` });
      return;
    }
    if (loanEndDate && !repayment.endDate) {
      periods.push({ startDate: '', endDate: '', label: `Repayment ${index + 1} needs an end date` });
      return;
    }
    if (repayment.endDate && repayment.endDate < repayment.startDate) {
      periods.push({ startDate: '', endDate: '', label: `Repayment ${index + 1} end date must follow its start date` });
      return;
    }
    if (!isCreditCard && (!Number.isFinite(Number(repayment.amount)) || Number(repayment.amount) <= 0)) {
      periods.push({ startDate: '', endDate: '', label: `Enter a repayment amount for schedule ${index + 1}.` });
      return;
    }
    if (!repayment.frequency) {
      periods.push({ startDate: '', endDate: '', label: `Choose a frequency for schedule ${index + 1}.` });
      return;
    }
    if (!repayment.sameInterestRate
      && (!Number.isFinite(Number(repayment.interestRate)) || Number(repayment.interestRate) < 0)) {
      periods.push({ startDate: '', endDate: '', label: `Enter a valid interest rate for schedule ${index + 1}.` });
      return;
    }
    periods.push({
      startDate: repayment.startDate,
      endDate: repayment.endDate || loanEndDate || '9999-12-31',
      label: `Repayment ${index + 1}`,
    });
  });

  const invalidPeriod = periods.find(period => !period.startDate || !period.endDate);
  if (invalidPeriod) return invalidPeriod.label;
  const outOfBoundsPeriod = periods.find(period =>
    period.startDate < loanStartDate || (loanEndDate && period.endDate > loanEndDate)
  );
  if (outOfBoundsPeriod) return `${outOfBoundsPeriod.label} must fall within the loan dates.`;

  const sortedPeriods = periods.sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (let index = 1; index < sortedPeriods.length; index += 1) {
    if (sortedPeriods[index].startDate <= sortedPeriods[index - 1].endDate) {
      return `${sortedPeriods[index].label} overlaps ${sortedPeriods[index - 1].label}.`;
    }
  }

  if (loanEndDate) {
    const coverageStart = loanStartDate > today ? loanStartDate : today;
    const activePeriods = sortedPeriods.filter(period => period.endDate >= coverageStart);
    let nextCoveredDate = coverageStart;
    for (const period of activePeriods) {
      if (period.startDate > nextCoveredDate) {
        return `Add a repayment schedule or interest-only period for ${nextCoveredDate}.`;
      }
      if (period.endDate >= nextCoveredDate) {
        nextCoveredDate = addCalendarDays(period.endDate, 1);
      }
    }
    if (nextCoveredDate <= loanEndDate) {
      return `Add a repayment schedule through ${loanEndDate}.`;
    }
  }

  return null;
}

export function isValidDate(value: string): boolean {
  return parseDate(value) !== null;
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  return date.getUTCFullYear() === Number(yearText)
    && date.getUTCMonth() === Number(monthText) - 1
    && date.getUTCDate() === Number(dayText)
    ? date
    : null;
}