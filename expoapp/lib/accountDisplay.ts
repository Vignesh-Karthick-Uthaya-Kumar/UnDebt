interface AccountWithInterest {
  interest_rates?: unknown;
}

export function getAccountInterestRate(account: AccountWithInterest): number | null {
  let rates = account.interest_rates;
  if (typeof rates === 'string') {
    try {
      rates = JSON.parse(rates);
    } catch {
      return null;
    }
  }

  const firstRate = Array.isArray(rates) ? rates[0] : rates;
  if (!firstRate || typeof firstRate !== 'object' || !('rate' in firstRate)) return null;

  const rate = Number(firstRate.rate);
  return Number.isFinite(rate) ? rate : null;
}

export function formatAccountInterestRate(account: AccountWithInterest): string {
  const rate = getAccountInterestRate(account);
  return rate === null ? '—' : `${rate.toFixed(2)}%`;
}
