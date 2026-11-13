import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { getAccountInterestRate } from './lib/accountDisplay';
import { addCalendarDays, LoanScheduleDraft } from './lib/loanSchedules';
import {
  ACCOUNT_TYPES,
  CREDIT_SPENDING_TYPES,
  FINANCIAL_YEAR_START_MONTH,
  getDefaultEndDate,
  getFinancialYearEndDate,
  getFinancialYearStartDate,
  getTodayDate,
  LOAN_TYPES,
  TRANSACTION_TYPES,
} from './config/accountTypes';

import AuthScreen from './components/AuthScreen';
import ProfileModal from './components/ProfileModal';
import AccountModal from './components/AccountModal';
import PaymentModal from './components/PaymentModal';
import Sidebar from './components/Sidebar';
import OverviewScreen from './screens/OverviewScreen';
import HelpScreen from './screens/HelpScreen';
import LoansScreen from './screens/LoansScreen';
import SettingsScreen from './screens/SettingsScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import SaveScreen from './screens/SaveScreen';
import SpendScreen from './screens/SpendScreen';
import OffsetScreen from './screens/OffsetScreen';
import { getLinkedLoanIds, getOffsetAccountConfig, OffsetType } from './lib/offsetAccounts';
import {
  getProjectedLoanBalancesAtDate,
  getProjectedTransactionBalancesAtDate,
  getProjectedTransactionCashAtDate,
  projectFinancials,
} from './lib/financialProjection';
import {
  getPaymentEntries,
  getAccountBalancesAsOf,
  countPaymentOccurrencesBetween,
  getSaveProjectionTotals,
  getSaveSummary,
  getSpendSummary,
  NewPaymentEntry,
  SaveActivity,
  SpendProjectionPeriod,
  SpendActivity,
} from './lib/paymentEntries';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('loans');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [projectionYears, setProjectionYears] = useState<number | null>(null);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<number | null>(null);
  const [financialYearStartMonth, setFinancialYearStartMonth] = useState(FINANCIAL_YEAR_START_MONTH);
  const [selectedLoanSeriesIds, setSelectedLoanSeriesIds] = useState<string[] | null>(null);
  const [selectedTransactionSeriesIds, setSelectedTransactionSeriesIds] = useState<string[] | null>(null);
  const [projectionPeriod, setProjectionPeriod] = useState<SpendProjectionPeriod>({
    type: 'months',
    months: 1,
  });
  const loanAccounts = useMemo(() => data.filter(item => LOAN_TYPES.includes(item.account_type)), [data]);
  const nonLoanAccounts = useMemo(
    () => data.filter(item => !LOAN_TYPES.includes(item.account_type)),
    [data]
  );
  const spendPaymentAccounts = useMemo(
    () => [...nonLoanAccounts, ...loanAccounts.filter(item => CREDIT_SPENDING_TYPES.has(item.account_type))],
    [nonLoanAccounts, loanAccounts]
  );
  const transactionAccounts = useMemo(() => data.filter(item => TRANSACTION_TYPES.includes(item.account_type)), [data]);
  const currentBalances = useMemo(() => getAccountBalancesAsOf(data), [data]);
  const projectionStartDate = selectedFinancialYear === null
    ? getTodayDate()
    : getFinancialYearStartDate(selectedFinancialYear, financialYearStartMonth);
  const projectionStartLoanBalances = useMemo(
    () => selectedFinancialYear === null
      ? currentBalances
      : getProjectedLoanBalancesAtDate(loanAccounts, transactionAccounts, projectionStartDate),
    [currentBalances, loanAccounts, transactionAccounts, projectionStartDate, selectedFinancialYear]
  );
  const projectionStartTransactionBalances = useMemo(
    () => selectedFinancialYear === null
      ? currentBalances
      : getProjectedTransactionBalancesAtDate(transactionAccounts, loanAccounts, projectionStartDate),
    [currentBalances, transactionAccounts, loanAccounts, projectionStartDate, selectedFinancialYear]
  );
  const projectedLoanAccounts = useMemo(
    () => loanAccounts.map(account => ({
      ...account,
      balance: projectionStartLoanBalances[account.account_id] ?? account.balance ?? 0,
    })),
    [loanAccounts, projectionStartLoanBalances]
  );
  const projectedTransactionAccounts = useMemo(
    () => transactionAccounts.map(account => ({
      ...account,
      balance: projectionStartTransactionBalances[account.account_id] ?? account.balance ?? 0,
    })),
    [transactionAccounts, projectionStartTransactionBalances]
  );
  const saveEntries = useMemo(() => getSaveSummary(data), [data]);
  const saveSummary = useMemo(
    () => getSaveProjectionTotals(data, getTodayDate(), projectionPeriod, financialYearStartMonth),
    [data, projectionPeriod, financialYearStartMonth]
  );
  const spendSummary = useMemo(
    () => getSpendSummary(
      transactionAccounts,
      loanAccounts,
      getTodayDate(),
      projectionPeriod,
      data,
      financialYearStartMonth
    ),
    [transactionAccounts, loanAccounts, projectionPeriod, data, financialYearStartMonth]
  );
  const projection = useMemo(
    () => projectFinancials(projectedLoanAccounts, projectedTransactionAccounts, projectionStartDate),
    [projectedLoanAccounts, projectedTransactionAccounts, projectionStartDate]
  );
  const cashAtSavePeriodStart = useMemo(
    () => getProjectedTransactionCashAtDate(transactionAccounts, loanAccounts, saveSummary.periodStart),
    [transactionAccounts, loanAccounts, saveSummary.periodStart]
  );
  const effectiveProjectionYears = selectedFinancialYear !== null
    ? 1
    : Math.min(30, Math.max(1, projectionYears ?? projection.defaultYears));
  const projectionEndDate = selectedFinancialYear !== null
    ? getFinancialYearEndDate(selectedFinancialYear, financialYearStartMonth)
    : new Date(
        Date.parse(`${projectionStartDate}T00:00:00Z`)
        + effectiveProjectionYears * 365.2425 * 24 * 60 * 60 * 1000
      ).toISOString().slice(0, 10);
  const changeProjectionYears = (years: number | null) => {
    setSelectedFinancialYear(null);
    setProjectionYears(years);
  };
  const offsetCashStartBalances = useMemo(
    () => getProjectedTransactionBalancesAtDate(
      transactionAccounts,
      loanAccounts,
      projectionStartDate
    ),
    [transactionAccounts, loanAccounts, projectionStartDate]
  );
  const offsetCashEndBalances = useMemo(
    () => getProjectedTransactionBalancesAtDate(
      transactionAccounts,
      loanAccounts,
      projectionEndDate
    ),
    [transactionAccounts, loanAccounts, projectionEndDate]
  );
  const offsetProjectionSummary = useMemo(() => {
    const loanPaymentsForPeriod = transactionAccounts.reduce((total, account) => (
      total + getPaymentEntries(account.payments)
        .filter(entry => entry.type === 'Part Payment')
        .reduce((accountTotal, entry) =>
          accountTotal + (Number(entry.amount) || 0) * countPaymentOccurrencesBetween(
            entry,
            Date.parse(`${projectionStartDate}T00:00:00Z`),
            Date.parse(`${projectionEndDate}T23:59:59Z`)
          ), 0)
    ), 0);
    const offsetBalancesAt = (balances: Record<string, number>) =>
      transactionAccounts.reduce((total, account) => (
        getLinkedLoanIds(account, loanAccounts).some(id =>
          loanAccounts.some(loan => loan.account_id === id))
          ? total + Math.max(0, balances[account.account_id] ?? 0)
          : total
      ), 0);
    const periodEndYear = Math.max(0, Math.min(30, effectiveProjectionYears));
    return {
      start: {
        cash: transactionAccounts.reduce(
          (total, account) => total + (offsetCashStartBalances[account.account_id] ?? 0),
          0
        ),
        offsetBalances: offsetBalancesAt(offsetCashStartBalances),
      },
      end: {
        cash: transactionAccounts.reduce(
          (total, account) => total + (offsetCashEndBalances[account.account_id] ?? 0),
          0
        ),
        offsetBalances: offsetBalancesAt(offsetCashEndBalances),
      },
      loanPayments: loanPaymentsForPeriod,
      totalInterestSaved: Math.max(
        0,
        projection.scheduledInterestByYear[periodEndYear]
          - projection.actualInterestByYear[periodEndYear]
      ),
    };
  }, [
    effectiveProjectionYears,
    loanAccounts,
    offsetCashEndBalances,
    offsetCashStartBalances,
    projection,
    projectionEndDate,
    projectionStartDate,
    transactionAccounts,
  ]);
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  // Form States
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentModalVariant, setPaymentModalVariant] = useState<'income' | 'saving' | 'loan-payment' | 'expense'>('income');
  const [editingPayment, setEditingPayment] = useState<{
    entry: SaveActivity | SpendActivity;
    variant: 'income' | 'saving' | 'loan-payment' | 'expense';
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [accountType, setAccountType] = useState('HomeLoan');
  const [balance, setBalance] = useState('');
  const [startDate, setStartDate] = useState(getTodayDate);
  const [endDate, setEndDate] = useState('');
  
  const [interestRateVal, setInterestRateVal] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('Monthly');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setProfileModalVisible(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  async function fetchAccounts() {
    try {
      const { data: records, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(records || []);
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    }
  }

  async function handleSaveAccount(scheduleDraft?: LoanScheduleDraft) {
    if (!balance.trim()) {
      alert('Please enter a balance.');
      return;
    }

    try {
      const accountConfig = ACCOUNT_TYPES[accountType];
      const existingAccount = editingId
        ? data.find(item => item.account_id === editingId)
        : undefined;
      const existingPayments = existingAccount
        ? getPaymentEntries(existingAccount.payments)
        : [];
      const interestRate = interestRateVal ? Number((parseFloat(interestRateVal) + Number.EPSILON).toFixed(2)) : null;
      let interest_rates: { rate: number; date: string; endDate: string | null; periodKind?: string }[] = interestRate !== null
        ? [{ rate: interestRate, date: startDate, endDate: endDate || null }]
        : [];
      let payments = existingPayments;

      if (accountConfig?.screen === 'loans' && scheduleDraft && interestRate !== null) {
        const schedulePaymentTypes = new Set([
          'Principal and Interest',
          'Interest Only',
          'Min balance',
          'Full payment',
        ]);
        payments = existingPayments.filter(entry =>
          !schedulePaymentTypes.has(entry.type || '') && entry.periodKind !== 'interest-only'
        );

        if (scheduleDraft.interestOnlyPeriodEnabled) {
          payments.push({
            type: 'Interest Only',
            periodKind: 'interest-only',
            frequency: scheduleDraft.repayments[0]?.frequency || 'Monthly',
            startDate: scheduleDraft.interestOnlyStartDate,
            endDate: scheduleDraft.interestOnlyEndDate,
          });
        }

        payments.push(...scheduleDraft.repayments.map(repayment => ({
          ...(repayment.amount ? { amount: Number(repayment.amount) } : {}),
          type: accountType === 'CreditCard' ? scheduleDraft.creditCardPaymentType : repayment.type,
          periodKind: 'repayment' as const,
          frequency: repayment.frequency,
          startDate: repayment.startDate,
          endDate: repayment.endDate || null,
          sameInterestRate: repayment.sameInterestRate,
          ...(!repayment.sameInterestRate && repayment.interestRate
            ? { interestRate: Number(repayment.interestRate) }
            : {}),
        })));

        if (accountType === 'CreditCard') {
          interest_rates = scheduleDraft.interestFreePeriodEnabled
            ? [
                ...(scheduleDraft.interestFreeStartDate > startDate
                  ? [{
                      rate: interestRate,
                      date: startDate,
                      endDate: addCalendarDays(scheduleDraft.interestFreeStartDate, -1),
                    }]
                  : []),
                {
                  rate: 0,
                  date: scheduleDraft.interestFreeStartDate,
                  endDate: scheduleDraft.interestFreeEndDate,
                  periodKind: 'interest-free',
                },
                {
                  rate: interestRate,
                  date: addCalendarDays(scheduleDraft.interestFreeEndDate, 1),
                  endDate: endDate || null,
                },
              ]
            : [{ rate: interestRate, date: startDate, endDate: endDate || null }];
        } else if (accountType === 'BuyNowPayLater') {
          interest_rates = [{ rate: interestRate, date: startDate, endDate: endDate || null }];
        } else {
          interest_rates = [
            ...(scheduleDraft.interestOnlyPeriodEnabled
              ? [
                  ...(scheduleDraft.interestOnlyStartDate > startDate
                    ? [{
                        rate: interestRate,
                        date: startDate,
                        endDate: addCalendarDays(scheduleDraft.interestOnlyStartDate, -1),
                      }]
                    : []),
                  {
                    rate: interestRate,
                    date: scheduleDraft.interestOnlyStartDate,
                    endDate: scheduleDraft.interestOnlyEndDate,
                    periodKind: 'interest-only',
                  },
                ]
              : []),
            ...scheduleDraft.repayments.map(repayment => ({
              rate: repayment.sameInterestRate || !repayment.interestRate
                ? interestRate
                : Number(repayment.interestRate),
              date: repayment.startDate,
              endDate: repayment.endDate || null,
              periodKind: 'repayment',
            })),
          ];
        }
      } else if (accountConfig?.fields.showPaymentDetails) {
        const scheduledPayment = paymentAmount
          ? [{ amount: parseFloat(paymentAmount), type: 'Principal and Interest', frequency: paymentFrequency, startDate, endDate: endDate || null }]
          : [];
        payments = [
          ...existingPayments.filter((entry, index) => index > 0 && entry.type !== 'Principal and Interest'),
          ...scheduledPayment,
        ];
      }

      const payload = {
        user_id: user?.id,
        title: title.trim() || `Account ${data.length + 1}`,
        account_type: accountType,
        balance: parseFloat(balance),
        start_date: startDate || null,
        end_date: ACCOUNT_TYPES[accountType]?.defaultEndDate ? endDate || null : null,
        offset_config: existingAccount?.offset_config ?? null,
        interest_rates,
        payments
      };

      if (editingId !== null) {
        const { error } = await supabase.from('accounts').update(payload).eq('account_id', editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase.from('accounts').insert([payload]);
        if (error) throw error;
      }

      resetForm();
      setModalVisible(false);
      fetchAccounts();
    } catch (err: any) {
      alert('Error saving record: ' + err.message);
    }
  }

  function openPaymentModal(variant: 'income' | 'saving' | 'loan-payment' | 'expense') {
    setEditingPayment(null);
    setPaymentModalVariant(variant);
    setPaymentModalVisible(true);
  }

  function openPaymentEditor(
    entry: SaveActivity | SpendActivity,
    variant: 'income' | 'saving' | 'loan-payment' | 'expense'
  ) {
    setEditingPayment({ entry, variant });
    setPaymentModalVariant(variant);
    setPaymentModalVisible(true);
  }

  async function handleSavePayment(
    entry: NewPaymentEntry,
    accountId: string,
    originalEntryId?: string,
    originalAccountId?: string
  ): Promise<boolean> {
    const account = data.find(item => item.account_id === accountId);
    if (!account) {
      alert('The selected account could not be found. Please refresh and try again.');
      return false;
    }

    try {
      const payments = getPaymentEntries(account.payments);
      if (originalEntryId) {
        const sourceAccount = data.find(item =>
          item.account_id === (originalAccountId || accountId));
        if (!sourceAccount) {
          alert('The original account could not be found. Please refresh and try again.');
          return false;
        }
        const sourcePayments = getPaymentEntries(sourceAccount.payments);
        const index = payments.findIndex((payment, paymentIndex) =>
          (payment.id || `${account.account_id}-${paymentIndex}`) === originalEntryId
        );
        const sourceIndex = sourcePayments.findIndex((payment, paymentIndex) =>
          (payment.id || `${sourceAccount.account_id}-${paymentIndex}`) === originalEntryId
        );
        if (sourceIndex < 0) {
          alert('This record could not be found. Refresh the screen and try again.');
          return false;
        }
        if (sourceAccount.account_id === account.account_id) {
          if (index < 0) {
            alert('This record could not be found. Refresh the screen and try again.');
            return false;
          }
          payments[index] = entry;
        } else {
          const previousDestinationPayments = [...payments];
          const movedPayments = [...sourcePayments];
          movedPayments.splice(sourceIndex, 1);
          payments.push(entry);

          const { error: destinationError } = await supabase
            .from('accounts')
            .update({ payments })
            .eq('account_id', account.account_id);
          if (destinationError) throw destinationError;

          const { error: sourceError } = await supabase
            .from('accounts')
            .update({ payments: movedPayments })
            .eq('account_id', sourceAccount.account_id);
          if (sourceError) {
            const { error: rollbackError } = await supabase
              .from('accounts')
              .update({ payments: previousDestinationPayments })
              .eq('account_id', account.account_id);
            if (rollbackError) {
              throw new Error(
                `Could not remove the original income record (${sourceError.message}) or roll back the destination copy (${rollbackError.message}).`
              );
            }
            throw sourceError;
          }
          await fetchAccounts();
          return true;
        }
      } else {
        payments.push(entry);
      }

      const { error } = await supabase
        .from('accounts')
        .update({ payments })
        .eq('account_id', accountId);
      if (error) throw error;
      await fetchAccounts();
      return true;
    } catch (err: any) {
      alert('Error saving payment: ' + err.message);
      return false;
    }
  }

  async function handleSaveOffset(
    accountId: string,
    config: {
      offset_type: OffsetType;
      percentage: number | null;
      linked_accounts: string[];
      links_configured: boolean;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ offset_config: config })
        .eq('account_id', accountId);
      if (error) throw error;
      await fetchAccounts();
      return true;
    } catch (err: any) {
      alert('Error saving offset settings: ' + err.message);
      return false;
    }
  }

  async function handleDeleteOffset(accountId: string): Promise<boolean> {
    try {
      const account = data.find(item => item.account_id === accountId);
      const existingConfig = account ? getOffsetAccountConfig(account) : null;
      const { error } = await supabase
        .from('accounts')
        .update({
          offset_config: {
            ...(existingConfig || {}),
            linked_accounts: [],
            links_configured: true,
          },
        })
        .eq('account_id', accountId);
      if (error) throw error;
      await fetchAccounts();
      return true;
    } catch (err: any) {
      alert('Error deleting offset settings: ' + err.message);
      return false;
    }
  }

  async function handleDeletePayment(activity: SaveActivity | SpendActivity) {
    const account = data.find(item => item.account_id === activity.accountId);
    if (!account) {
      alert('The selected account could not be found. Please refresh and try again.');
      return;
    }

    try {
      const payments = getPaymentEntries(account.payments);
      const index = payments.findIndex((entry, paymentIndex) =>
        (entry.id || `${account.account_id}-${paymentIndex}`) === activity.id
      );
      if (index < 0) {
        alert('This record could not be found. Refresh the screen and try again.');
        return;
      }
      payments.splice(index, 1);
      const { error } = await supabase
        .from('accounts')
        .update({ payments })
        .eq('account_id', account.account_id);
      if (error) throw error;
      await fetchAccounts();
    } catch (err: any) {
      alert('Error deleting record: ' + err.message);
    }
  }

  function resetForm(defaultType = 'HomeLoan') {
    setTitle('');
    setAccountType(defaultType);
    setBalance('');
    const today = getTodayDate();
    setStartDate(today);
    setEndDate(getDefaultEndDate(defaultType, today));
    setInterestRateVal('');
    setPaymentAmount('');
    setPaymentFrequency('Monthly');
    setEditingId(null);
  }

  function startEdit(item: any) {
    setEditingId(item.account_id);
    setTitle(item.title || '');
    setAccountType(item.account_type || 'HomeLoan');
    setBalance(item.balance !== undefined ? String(item.balance) : '0');
    const accountStartDate = item.start_date || getTodayDate();
    setStartDate(accountStartDate);
    setEndDate(item.end_date || getDefaultEndDate(item.account_type || 'HomeLoan', accountStartDate));
    const savedInterestRate = getAccountInterestRate(item);
    setInterestRateVal(savedInterestRate === null ? '' : savedInterestRate.toFixed(2));
    if (item.payments?.[0]) {
      setPaymentAmount(String(item.payments[0].amount || ''));
      setPaymentFrequency(item.payments[0].frequency || 'Monthly');
    } else {
      setPaymentAmount('');
      setPaymentFrequency('Monthly');
    }

    setModalVisible(true);
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('accounts').delete().eq('account_id', id);
      if (error) throw error;
      fetchAccounts();
    } catch (err: any) {
      alert('Error deleting: ' + err.message);
    }
  }

  if (authLoading) {
    return (
      <View style={[styles.appContainer, styles.center]}>
        <ActivityIndicator size="large" color="#5d55f7" />
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  const totalDebt = projectedLoanAccounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const totalAssets = projectedTransactionAccounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);

  function toggleSeries(
    current: string[] | null,
    allIds: string[],
    id: string,
    setter: (ids: string[]) => void
  ) {
    const next = new Set(current ?? allIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter([...next]);
  }

  return (
    <View style={styles.appContainer}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userEmail={user.email} 
        onOpenProfile={() => setProfileModalVisible(true)} 
        loanCount={loanAccounts.length}
        transactionCount={transactionAccounts.length}
        compact={isCompact}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(collapsed => !collapsed)}
      />

      <View style={styles.contentArea}>
        {activeTab === 'overview' && (
          <OverviewScreen
            totalDebt={totalDebt}
            totalAssets={totalAssets}
            compact={isCompact}
            projection={projection}
            years={effectiveProjectionYears}
            selectedYears={projectionYears}
            onProjectionYearsChange={changeProjectionYears}
            selectedFinancialYear={selectedFinancialYear}
            onSelectFinancialYear={setSelectedFinancialYear}
            financialYearStartMonth={financialYearStartMonth}
          />
        )}
        {activeTab === 'loans' && (
          <LoansScreen
            loans={loanAccounts.map(item => ({
              ...item,
              displayBalance: currentBalances[item.account_id] ?? item.balance ?? 0,
            }))}
            totalDebt={totalDebt}
            compact={isCompact}
            projection={projection}
            years={effectiveProjectionYears}
            selectedYears={projectionYears}
            onProjectionYearsChange={changeProjectionYears}
            selectedFinancialYear={selectedFinancialYear}
            onSelectFinancialYear={setSelectedFinancialYear}
            financialYearStartMonth={financialYearStartMonth}
            selectedSeriesIds={selectedLoanSeriesIds}
            onToggleSeries={(id) => toggleSeries(
              selectedLoanSeriesIds,
              [
                ...projection.loanSeries.map(series => series.id),
                ...projection.scheduledLoanSeries.map(series => series.id),
              ],
              id,
              setSelectedLoanSeriesIds
            )}
            onAdd={() => { resetForm('HomeLoan'); setModalVisible(true); }}
            onEdit={item => startEdit(loanAccounts.find(account => account.account_id === item.account_id) || item)}
            onDelete={handleDelete}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsScreen
            transactions={transactionAccounts}
            currentBalances={currentBalances}
            compact={isCompact}
            projection={projection}
            years={effectiveProjectionYears}
            selectedYears={projectionYears}
            onProjectionYearsChange={changeProjectionYears}
            selectedFinancialYear={selectedFinancialYear}
            onSelectFinancialYear={setSelectedFinancialYear}
            financialYearStartMonth={financialYearStartMonth}
            selectedSeriesIds={selectedTransactionSeriesIds}
            onToggleSeries={(id) => toggleSeries(
              selectedTransactionSeriesIds,
              ['total-assets', ...transactionAccounts.map(item => item.account_id)],
              id,
              setSelectedTransactionSeriesIds
            )}
            onAdd={() => { resetForm('Savings'); setModalVisible(true); }}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        )}
        {activeTab === 'offset' && (
          <OffsetScreen
            accounts={transactionAccounts}
            loans={projectedLoanAccounts}
            currentBalances={currentBalances}
            compact={isCompact}
            projectionYears={effectiveProjectionYears}
            defaultProjectionYears={projection.defaultYears}
            selectedProjectionYears={projectionYears}
            selectedFinancialYear={selectedFinancialYear}
            financialYearStartMonth={financialYearStartMonth}
            projectionStartDate={projectionStartDate}
            projectionEndDate={projectionEndDate}
            onSelectFinancialYear={setSelectedFinancialYear}
            projectionSummary={offsetProjectionSummary}
            onProjectionYearsChange={changeProjectionYears}
            payments={spendSummary.payments}
            onAddPayment={() => openPaymentModal('loan-payment')}
            onEditPayment={entry => openPaymentEditor(entry, 'loan-payment')}
            onDeletePayment={handleDeletePayment}
            onSave={handleSaveOffset}
            onDelete={handleDeleteOffset}
          />
        )}
        {activeTab === 'save' && (
          <SaveScreen
            compact={isCompact}
            totalIncome={saveSummary.totalIncome}
            totalSaved={saveSummary.totalSaved}
            periodStart={saveSummary.periodStart}
            periodEnd={saveSummary.periodEnd}
            cashAtPeriodStart={cashAtSavePeriodStart}
            totalCashAtPeriodEnd={spendSummary.projectedAvailable}
            projectionPeriod={projectionPeriod}
            financialYearStartMonth={financialYearStartMonth}
            onProjectionPeriodChange={setProjectionPeriod}
            incomeEntries={saveEntries.incomeEntries}
            savingEntries={saveEntries.savingEntries}
            onAddIncome={() => openPaymentModal('income')}
            onAddSaving={() => openPaymentModal('saving')}
            onEditEntry={entry => openPaymentEditor(entry, entry.type === 'Income' ? 'income' : 'saving')}
            onDeleteEntry={handleDeletePayment}
          />
        )}
        {activeTab === 'spend' && (
          <SpendScreen
            compact={isCompact}
            totalSpend={spendSummary.totalSpend}
            projectedAvailable={spendSummary.projectedAvailable}
            projectedBalance={spendSummary.projectedBalance}
            billPaymentSpend={spendSummary.billPaymentSpend}
            expenseSpend={spendSummary.expenseSpend}
            periodStart={spendSummary.periodStart}
            periodEnd={spendSummary.periodEnd}
            projectionPeriod={projectionPeriod}
            financialYearStartMonth={financialYearStartMonth}
            onProjectionPeriodChange={setProjectionPeriod}
            expenses={spendSummary.expenses}
            onAddSpend={() => openPaymentModal('expense')}
            onEditEntry={entry => openPaymentEditor(
              entry,
              'expense'
            )}
            onDeleteEntry={handleDeletePayment}
          />
        )}
        {activeTab === 'help' && <HelpScreen compact={isCompact} />}
        {activeTab === 'settings' && (
          <SettingsScreen
            compact={isCompact}
            financialYearStartMonth={financialYearStartMonth}
            onFinancialYearStartMonthChange={setFinancialYearStartMonth}
          />
        )}
      </View>

      <ProfileModal 
        visible={profileModalVisible} 
        userEmail={user.email} 
        onClose={() => setProfileModalVisible(false)}
      />

      <AccountModal 
        visible={modalVisible}
        editingId={editingId}
        screen={activeTab === 'transactions' ? 'transactions' : 'loans'}
        title={title} setTitle={setTitle}
        accountType={accountType} setAccountType={setAccountType}
        balance={balance} setBalance={setBalance}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        interestRateVal={interestRateVal} setInterestRateVal={setInterestRateVal}
        paymentAmount={paymentAmount} setPaymentAmount={setPaymentAmount}
        paymentFrequency={paymentFrequency} setPaymentFrequency={setPaymentFrequency}
        initialAccount={editingId ? data.find(item => item.account_id === editingId) : undefined}
        onSave={handleSaveAccount}
        onClose={() => setModalVisible(false)}
      />

      {paymentModalVisible && (
        <PaymentModal
          key={editingPayment?.entry.id || `new-${paymentModalVariant}`}
          visible
          variant={editingPayment?.variant || paymentModalVariant}
          accounts={(editingPayment?.variant || paymentModalVariant) === 'expense'
            ? spendPaymentAccounts
            : nonLoanAccounts}
          loanAccounts={loanAccounts}
          initialEntry={editingPayment?.entry}
          initialAccountId={editingPayment?.entry.accountId}
          onSave={handleSavePayment}
          onClose={() => {
            setPaymentModalVisible(false);
            setEditingPayment(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#f8f9fa', height: '100%' },
  contentArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
});