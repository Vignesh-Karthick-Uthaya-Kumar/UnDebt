// config/accountTypes.ts

export const GLOBAL_FINANCIAL_DEFAULTS = {
  rbaCashRate: 4.85,  // Current baseline cash rate percentage
  homeLoanMargin: 2.10,
  carLoanMargin: 2.05,
  personalLoanMargin: 3.65,
  creditCardMargin: 15.55,
  buyNowPayLaterMargin: -4.85,
  savingsMargin: 2.5,
  checkingMargin: 2.5,
};

export const FINANCIAL_YEAR_START_MONTH = 6;
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getFinancialYearStartYear(
  date = getTodayDate(),
  startMonth = FINANCIAL_YEAR_START_MONTH
): number {
  const [year, month] = date.split('-').map(Number);
  return month - 1 >= startMonth ? year : year - 1;
}

export function getFinancialYearStartDate(
  startYear: number,
  startMonth = FINANCIAL_YEAR_START_MONTH
): string {
  return `${startYear}-${String(startMonth + 1).padStart(2, '0')}-01`;
}

export function getFinancialYearEndDate(
  startYear: number,
  startMonth = FINANCIAL_YEAR_START_MONTH
): string {
  const endDate = new Date(Date.UTC(startYear + 1, startMonth, 0));
  return endDate.toISOString().slice(0, 10);
}

export function formatFinancialYear(startYear: number): string {
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export interface AccountTypeConfig {
  key: string;
  label: string;
  screen: 'loans' | 'transactions';
  defaultEndDate?: { unit: 'days' | 'months' | 'years'; value: number };
  defaultBalance?: number;
  defaultInterestRate?: number;
  defaultPaymentAmount?: number | string;
  defaultPaymentFrequency?: string;
  fields: {
    showTitle: boolean;
    showBalance: boolean;
    showDates: boolean;
    showInterestRate: boolean;
    showPaymentDetails: boolean;
    showOffsetTypePercentage: boolean;
    showLinkedAccounts: boolean;
  };
}

export const ACCOUNT_TYPES: Record<string, AccountTypeConfig> = {
  HomeLoan: {
    key: 'HomeLoan',
    label: 'Home Loan',
    screen: 'loans',
    defaultEndDate: { unit: 'years', value: 30 },
    defaultBalance: 750000,
    defaultInterestRate: GLOBAL_FINANCIAL_DEFAULTS.rbaCashRate + GLOBAL_FINANCIAL_DEFAULTS.homeLoanMargin,
    defaultPaymentAmount: '',
    defaultPaymentFrequency: 'Monthly',
    fields: { showTitle: true, showBalance: true, showDates: true, showInterestRate: true, showPaymentDetails: true, showOffsetTypePercentage: false, showLinkedAccounts: true }
  },
  CarLoan: {
    key: 'CarLoan',
    label: 'Car Loan',
    screen: 'loans',
    defaultEndDate: { unit: 'years', value: 5 },
    defaultBalance: 28000,
    defaultInterestRate: GLOBAL_FINANCIAL_DEFAULTS.rbaCashRate + GLOBAL_FINANCIAL_DEFAULTS.carLoanMargin,
    defaultPaymentAmount: '',
    defaultPaymentFrequency: 'Monthly',
    fields: { showTitle: true, showBalance: true, showDates: true, showInterestRate: true, showPaymentDetails: true, showOffsetTypePercentage: false, showLinkedAccounts: false }
  },
  PersonalLoan: {
    key: 'PersonalLoan',
    label: 'Personal Loan',
    screen: 'loans',
    defaultEndDate: { unit: 'years', value: 5 },
    defaultBalance: 12000,
    defaultInterestRate: GLOBAL_FINANCIAL_DEFAULTS.rbaCashRate + GLOBAL_FINANCIAL_DEFAULTS.personalLoanMargin,
    defaultPaymentAmount: 350,
    defaultPaymentFrequency: 'Monthly',
    fields: { showTitle: true, showBalance: true, showDates: true, showInterestRate: true, showPaymentDetails: true, showOffsetTypePercentage: false, showLinkedAccounts: false }
  },
  CreditCard: {
    key: 'CreditCard',
    label: 'Credit Card',
    screen: 'loans',
    defaultBalance: 2500,
    defaultInterestRate: GLOBAL_FINANCIAL_DEFAULTS.rbaCashRate + GLOBAL_FINANCIAL_DEFAULTS.creditCardMargin,
    defaultPaymentAmount: 150,
    defaultPaymentFrequency: 'Monthly',
    fields: { showTitle: true, showBalance: true, showDates: true, showInterestRate: true, showPaymentDetails: true, showOffsetTypePercentage: false, showLinkedAccounts: false }
  },
  BuyNowPayLater: {
    key: 'BuyNowPayLater',
    label: 'Buy Now Pay Later',
    screen: 'loans',
    defaultEndDate: { unit: 'months', value: 6 },
    defaultBalance: 400,
    defaultInterestRate: GLOBAL_FINANCIAL_DEFAULTS.rbaCashRate + GLOBAL_FINANCIAL_DEFAULTS.buyNowPayLaterMargin,
    defaultPaymentAmount: 100,
    defaultPaymentFrequency: 'Fortnightly',
    fields: { showTitle: true, showBalance: true, showDates: true, showInterestRate: true, showPaymentDetails: true, showOffsetTypePercentage: false, showLinkedAccounts: false }
  },
  Savings: {
    key: 'Savings',
    label: 'Savings Account',
    screen: 'transactions',
    defaultBalance: 5000,
    defaultInterestRate: GLOBAL_FINANCIAL_DEFAULTS.rbaCashRate - GLOBAL_FINANCIAL_DEFAULTS.savingsMargin,
    fields: { showTitle: true, showBalance: true, showDates: false, showInterestRate: true, showPaymentDetails: false, showOffsetTypePercentage: true, showLinkedAccounts: false }
  },
  Checking: {
    key: 'Checking',
    label: 'Checking / Everyday',
    screen: 'transactions',
    defaultBalance: 1500,
    defaultInterestRate: GLOBAL_FINANCIAL_DEFAULTS.rbaCashRate - GLOBAL_FINANCIAL_DEFAULTS.checkingMargin,
    fields: { showTitle: true, showBalance: true, showDates: false, showInterestRate: true, showPaymentDetails: false, showOffsetTypePercentage: true, showLinkedAccounts: false }
  },
  Investment: {
    key: 'Investment',
    label: 'Investment',
    screen: 'transactions',
    fields: { showTitle: true, showBalance: true, showDates: false, showInterestRate: true, showPaymentDetails: false, showOffsetTypePercentage: true, showLinkedAccounts: false }
  },
  TransactionAccount: {
    key: 'TransactionAccount',
    label: 'Transaction Account',
    screen: 'transactions',
    fields: { showTitle: true, showBalance: true, showDates: false, showInterestRate: true, showPaymentDetails: false, showOffsetTypePercentage: true, showLinkedAccounts: false }
  }
};

export const LOAN_TYPES = Object.values(ACCOUNT_TYPES)
  .filter(t => t.screen === 'loans')
  .map(t => t.key);

export const CREDIT_SPENDING_TYPES: ReadonlySet<string> = new Set([
  'CreditCard',
  'BuyNowPayLater',
]);

export const TRANSACTION_TYPES = Object.values(ACCOUNT_TYPES)
  .filter(t => t.screen === 'transactions')
  .map(t => t.key);

export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDefaultEndDate(accountType: string, startDate: string): string {
  const term = ACCOUNT_TYPES[accountType]?.defaultEndDate;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!term || !match) return '';

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  const start = new Date(Date.UTC(year, month, day));
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month ||
    start.getUTCDate() !== day
  ) return '';

  if (term.unit === 'days') {
    start.setUTCDate(start.getUTCDate() + term.value);
  } else {
    const targetMonth = month + (term.unit === 'years' ? term.value * 12 : term.value);
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    const lastDayOfMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    start.setUTCFullYear(targetYear, normalizedMonth, Math.min(day, lastDayOfMonth));
  }

  return start.toISOString().slice(0, 10);
}