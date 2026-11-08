export type OffsetType = 'Full Offset' | 'Partial Offset' | 'Capped Offset';

export interface OffsetAccountConfig {
  offset_type?: OffsetType | string;
  offsetType?: OffsetType | string;
  percentage?: number | string | null;
  linked_accounts?: string[];
  linkedAccounts?: string[];
  links_configured?: boolean;
}

interface AccountWithOffset {
  account_id: string;
  offset_config?: unknown;
}

type LoanWithOffset = AccountWithOffset;

export function getOffsetAccountConfig(account: AccountWithOffset): OffsetAccountConfig | null {
  const rawConfig = account.offset_config;
  let config = rawConfig;
  if (typeof rawConfig === 'string') {
    try {
      config = JSON.parse(rawConfig);
    } catch (error) {
      throw new Error(`Could not read offset settings for account ${account.account_id}: ${String(error)}`);
    }
  }
  return config && typeof config === 'object' && !Array.isArray(config)
    ? config as OffsetAccountConfig
    : null;
}

export function getLinkedLoanIds(
  offsetAccount: AccountWithOffset,
  loans: LoanWithOffset[]
): string[] {
  const config = getOffsetAccountConfig(offsetAccount);
  const linkedLoans = config?.linked_accounts ?? config?.linkedAccounts;
  if (Array.isArray(linkedLoans) && (linkedLoans.length > 0 || config?.links_configured)) {
    return [...new Set(linkedLoans)];
  }

  return loans
    .filter(loan => {
      const loanConfig = getOffsetAccountConfig(loan);
      const legacyAccounts = loanConfig?.linked_accounts ?? loanConfig?.linkedAccounts;
      return legacyAccounts?.includes(offsetAccount.account_id);
    })
    .map(loan => loan.account_id);
}
