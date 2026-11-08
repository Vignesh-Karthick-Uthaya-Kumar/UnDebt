import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MetricCard from '../components/common/MetricCard';
import ProjectionPeriodPicker from '../components/common/ProjectionPeriodPicker';
import ScreenHeader from '../components/common/ScreenHeader';
import { getLinkedLoanIds, getOffsetAccountConfig, OffsetType } from '../lib/offsetAccounts';
import { SpendActivity } from '../lib/paymentEntries';
import { Colors } from '../theme/colors';

interface OffsetAccount {
  account_id: string;
  title: string;
  account_type: string;
  balance?: number | string | null;
  offset_config?: unknown;
}

interface LoanAccount extends OffsetAccount {}

interface OffsetConfig {
  offset_type: OffsetType;
  percentage: number | null;
  linked_accounts: string[];
  links_configured: boolean;
}

interface OffsetProjectionValues {
  cash: number;
  offsetBalances: number;
}

interface OffsetScreenProps {
  accounts: OffsetAccount[];
  loans: LoanAccount[];
  currentBalances: Record<string, number>;
  compact: boolean;
  projectionYears: number;
  defaultProjectionYears: number;
  selectedProjectionYears: number | null;
  selectedFinancialYear: number | null;
  financialYearStartMonth: number;
  projectionStartDate: string;
  projectionEndDate: string;
  onSelectFinancialYear: (startYear: number | null) => void;
  projectionSummary: {
    start: OffsetProjectionValues;
    end: OffsetProjectionValues;
    loanPayments: number;
    totalInterestSaved: number;
  };
  onProjectionYearsChange: (years: number | null) => void;
  payments: SpendActivity[];
  onAddPayment: () => void;
  onEditPayment: (entry: SpendActivity) => void;
  onDeletePayment: (entry: SpendActivity) => void;
  onSave: (accountId: string, config: OffsetConfig) => Promise<boolean>;
  onDelete: (accountId: string) => Promise<boolean>;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function getBalance(account: OffsetAccount, balances: Record<string, number>): number {
  const balance = Number(account.balance);
  return balances[account.account_id] ?? (Number.isFinite(balance) ? balance : 0);
}

export default function OffsetScreen({
  accounts,
  loans,
  currentBalances,
  compact,
  projectionYears,
  defaultProjectionYears,
  selectedProjectionYears,
  selectedFinancialYear,
  financialYearStartMonth,
  projectionStartDate,
  projectionEndDate,
  onSelectFinancialYear,
  projectionSummary,
  onProjectionYearsChange,
  payments,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  onSave,
  onDelete,
}: OffsetScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [offsetType, setOffsetType] = useState<OffsetType>('Full Offset');
  const [percentage, setPercentage] = useState('');
  const [linkedLoanIds, setLinkedLoanIds] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const accountSummaries = useMemo(() => accounts.map(account => ({
    account,
    linkedIds: getLinkedLoanIds(account, loans).filter(id =>
      loans.some(loan => loan.account_id === id)),
  })), [accounts, loans]);
  const linkedSummaries = accountSummaries.filter(item => item.linkedIds.length > 0);
  const availableAccounts = accounts.filter(account =>
    !accountSummaries.some(item =>
      item.account.account_id === account.account_id && item.linkedIds.length > 0));
  const selectedAccount = accounts.find(account => account.account_id === selectedAccountId);
  const editingAccount = accounts.find(account => account.account_id === editingAccountId);

  function openAddModal() {
    const firstAvailable = availableAccounts[0];
    setEditingAccountId(null);
    setSelectedAccountId(firstAvailable?.account_id || '');
    setOffsetType('Full Offset');
    setPercentage('');
    setLinkedLoanIds([]);
    setModalVisible(true);
  }

  function openEditModal(account: OffsetAccount) {
    const config = getOffsetAccountConfig(account);
    const configuredType = config?.offset_type || config?.offsetType;
    setEditingAccountId(account.account_id);
    setSelectedAccountId(account.account_id);
    setOffsetType(configuredType === 'Partial Offset' || configuredType === 'Capped Offset'
      ? configuredType
      : 'Full Offset');
    setPercentage(config?.percentage == null ? '' : String(config.percentage));
    setLinkedLoanIds(getLinkedLoanIds(account, loans).filter(id =>
      loans.some(loan => loan.account_id === id)));
    setModalVisible(true);
  }

  function closeModal() {
    if (saving) return;
    setModalVisible(false);
    setEditingAccountId(null);
  }

  function toggleLoan(id: string) {
    setLinkedLoanIds(current => current.includes(id)
      ? current.filter(loanId => loanId !== id)
      : [...current, id]);
  }

  async function saveOffset() {
    const account = editingAccount || selectedAccount;
    const parsedPercentage = Number(percentage);
    if (!account) {
      alert('Choose an account to use as an offset.');
      return;
    }
    if (!linkedLoanIds.length) {
      alert('Link the offset to at least one loan.');
      return;
    }
    if (offsetType !== 'Full Offset'
      && (!Number.isFinite(parsedPercentage) || parsedPercentage <= 0 || parsedPercentage > 100)) {
      alert('Enter an offset percentage from 1% to 100%.');
      return;
    }

    setSaving(true);
    try {
      const saved = await onSave(account.account_id, {
        offset_type: offsetType,
        percentage: offsetType === 'Full Offset' ? null : parsedPercentage,
        linked_accounts: linkedLoanIds,
        links_configured: true,
      });
      if (saved) {
        setModalVisible(false);
        setEditingAccountId(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteOffset(accountId: string) {
    setDeleting(true);
    try {
      const deleted = await onDelete(accountId);
      if (deleted) setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compactContainer]}>
      <ScreenHeader
        category="ACCOUNTS"
        title="Loan management"
        subtitle="Link cash accounts to loans to estimate interest savings."
      />

      <ProjectionPeriodPicker
        years={projectionYears}
        defaultYears={defaultProjectionYears}
        selectedYears={selectedProjectionYears}
        onChange={onProjectionYearsChange}
        selectedFinancialYear={selectedFinancialYear}
        onSelectFinancialYear={onSelectFinancialYear}
        financialYearStartMonth={financialYearStartMonth}
      />

      <View style={styles.metricsRow}>
        <MetricCard
          dense
          title="Total cash at period start"
          value={formatCurrency(projectionSummary.start.cash)}
          subtitle={`Includes ${formatCurrency(projectionSummary.start.offsetBalances)} offset balance · ${projectionStartDate}`}
          accentColor={projectionSummary.start.cash >= 0 ? Colors.success : Colors.danger}
        />
        <MetricCard
          dense
          title="Additional loan payments"
          value={formatCurrency(projectionSummary.loanPayments)}
          subtitle={`For period · ${projectionStartDate} to ${projectionEndDate}`}
          secondaryMetric={{
            label: 'Offset amount',
            value: formatCurrency(projectionSummary.end.offsetBalances),
            accentColor: Colors.primary,
          }}
          accentColor={Colors.primary}
        />
        <MetricCard
          dense
          title="Interest saved"
          value={formatCurrency(projectionSummary.totalInterestSaved)}
          subtitle="Estimated benefit over this projection period"
          accentColor={Colors.success}
        />
      </View>
      <View style={styles.paymentSection}>
        <View style={styles.listHeader}>
          <View style={styles.listHeading}>
            <Text style={styles.sectionTitle}>Additional loan payments</Text>
            <Text style={styles.sectionSubtitle}>
              Record extra payments and choose the source account and loan.
            </Text>
          </View>
          <TouchableOpacity style={styles.paymentAddButton} onPress={onAddPayment}>
            <Text style={styles.paymentAddButtonText}>+ Add payment</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.paymentCard}>
          {payments.length ? [...payments]
            .sort((a, b) => b.startDate.localeCompare(a.startDate))
            .map((payment, index, entries) => (
              <View
                key={`${payment.accountId}-${payment.id}`}
                style={[styles.paymentRow, index === entries.length - 1 && styles.lastPaymentRow]}
              >
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentTitle}>{payment.description || 'Loan payment'}</Text>
                  <Text style={styles.paymentSubtitle}>
                    {payment.accountTitle} → {payment.linkedAccountTitle || 'Loan account'}
                    {payment.startDate ? ` · ${payment.startDate}` : ''}
                    {payment.frequency ? ` · ${payment.frequency}` : ''}
                  </Text>
                </View>
                <View style={styles.paymentActions}>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${payment.description || 'loan payment'}`}
                    style={styles.paymentAction}
                    onPress={() => onEditPayment(payment)}
                  >
                    <Text style={styles.editButtonText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${payment.description || 'loan payment'}`}
                    style={styles.paymentAction}
                    onPress={() => onDeletePayment(payment)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )) : (
            <Text style={styles.emptyText}>No additional loan payments yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.paymentSection}>
        <View style={styles.listHeader}>
          <View style={styles.listHeading}>
            <Text style={styles.sectionTitle}>Offset accounts</Text>
            <Text style={styles.sectionSubtitle}>
              Link each cash account to one or more loans.
            </Text>
          </View>
          {availableAccounts.length > 0 && (
          <TouchableOpacity style={styles.paymentAddButton} onPress={openAddModal}>
            <Text style={styles.paymentAddButtonText}>+ Link account</Text>
          </TouchableOpacity>
          )}
        </View>

        <View style={styles.paymentCard}>
          {linkedSummaries.length ? linkedSummaries.map(({ account, linkedIds }, index) => {
          const config = getOffsetAccountConfig(account);
          const type = config?.offset_type || config?.offsetType || 'Full Offset';
          const loanNames = linkedIds.map(id => {
            const loan = loans.find(item => item.account_id === id);
            return loan?.title || loan?.account_type || 'Loan';
          });
          const isConfirmingDelete = confirmDeleteId === account.account_id;

          return (
            <View
              key={account.account_id}
              style={[styles.paymentRow, index === linkedSummaries.length - 1 && styles.lastPaymentRow]}
            >
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentTitle}>{account.title || account.account_type}</Text>
                <Text style={styles.paymentSubtitle}>
                  {type}{type !== 'Full Offset' && config?.percentage != null
                    ? ` · ${config.percentage}%`
                    : ''} · {loanNames.join(', ')}
                </Text>
              </View>
              {isConfirmingDelete ? (
                <View style={styles.paymentActions}>
                  <TouchableOpacity
                    style={styles.cancelDeleteButton}
                    onPress={() => setConfirmDeleteId(null)}
                    disabled={deleting}
                  >
                    <Text style={styles.cancelDeleteText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, deleting && styles.disabledButton]}
                    onPress={() => deleteOffset(account.account_id)}
                    disabled={deleting}
                  >
                    <Text style={styles.deleteButtonText}>{deleting ? 'Removing…' : 'Confirm'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.paymentActions}>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(getBalance(account, currentBalances))}
                  </Text>
                  <TouchableOpacity
                    style={styles.paymentAction}
                    onPress={() => openEditModal(account)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit offset for ${account.title || account.account_type}`}
                  >
                    <Text style={styles.editButtonText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.paymentAction}
                    onPress={() => setConfirmDeleteId(account.account_id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete offset for ${account.title || account.account_type}`}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
          }) : (
          <Text style={styles.emptyText}>No offset accounts yet. Link an account to a loan.</Text>
          )}
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, compact && styles.compactModalCard]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {editingAccount ? 'Edit offset account' : 'Link an offset account'}
                  </Text>
                  <Text style={styles.sectionSubtitle}>Choose a cash account and the loans it can offset.</Text>
                </View>
                <TouchableOpacity onPress={closeModal} disabled={saving} accessibilityRole="button">
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Cash account</Text>
              {editingAccount ? (
                <View style={styles.selectedAccount}>
                  <Text style={styles.optionTitle}>
                    {editingAccount.title || editingAccount.account_type}
                  </Text>
                  <Text style={styles.optionBalance}>
                    {formatCurrency(getBalance(editingAccount, currentBalances))}
                  </Text>
                </View>
              ) : availableAccounts.length ? (
                <View style={styles.accountChoices}>
                  {availableAccounts.map(account => {
                    const selected = account.account_id === selectedAccountId;
                    return (
                      <TouchableOpacity
                        key={account.account_id}
                        style={[styles.accountChoice, selected && styles.accountChoiceSelected]}
                        onPress={() => setSelectedAccountId(account.account_id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <View style={styles.optionTextContainer}>
                          <Text style={styles.optionTitle}>
                            {account.title || account.account_type}
                          </Text>
                          <Text style={styles.optionSubtitle}>{account.account_type}</Text>
                        </View>
                        <Text style={styles.optionBalance}>
                          {formatCurrency(getBalance(account, currentBalances))}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>All cash accounts are already linked.</Text>
              )}

              <Text style={styles.label}>Offset method</Text>
              <View style={styles.typeOptions}>
                {(['Full Offset', 'Partial Offset', 'Capped Offset'] as OffsetType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeOption, offsetType === type && styles.typeOptionSelected]}
                    onPress={() => setOffsetType(type)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: offsetType === type }}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      offsetType === type && styles.typeOptionTextSelected,
                    ]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {offsetType !== 'Full Offset' && (
                <>
                  <Text style={styles.label}>
                    {offsetType === 'Capped Offset' ? 'Maximum offset (%)' : 'Balance included (%)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 50"
                    value={percentage}
                    onChangeText={value => {
                      if (/^\d{0,3}(\.\d{0,2})?$/.test(value)) setPercentage(value);
                    }}
                  />
                  <Text style={styles.helpText}>
                    {offsetType === 'Capped Offset'
                      ? 'Limits the offset to this share of each linked loan balance.'
                      : 'Uses this share of the cash account balance to offset interest.'}
                  </Text>
                </>
              )}

              <Text style={styles.label}>Loans to link</Text>
              <View style={styles.accountChoices}>
                {loans.length ? loans.map(loan => {
                  const selected = linkedLoanIds.includes(loan.account_id);
                  return (
                    <TouchableOpacity
                      key={loan.account_id}
                      style={styles.loanChoice}
                      onPress={() => toggleLoan(loan.account_id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                        {selected && <Text style={styles.checkboxCheck}>✓</Text>}
                      </View>
                      <View style={styles.optionTextContainer}>
                        <Text style={styles.optionTitle}>{loan.title || loan.account_type}</Text>
                        <Text style={styles.optionSubtitle}>{loan.account_type}</Text>
                      </View>
                      <Text style={styles.optionBalance}>
                        {formatCurrency(getBalance(loan, currentBalances))}
                      </Text>
                    </TouchableOpacity>
                  );
                }) : <Text style={styles.emptyText}>Add a loan before setting up an offset.</Text>}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.disabledButton]}
                  onPress={saveOffset}
                  disabled={saving || (!editingAccount && !availableAccounts.length)}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save link'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 32, paddingBottom: 40 },
  compactContainer: { padding: 16, paddingBottom: 24 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  paymentSection: { marginBottom: 12 },
  paymentAddButton: { backgroundColor: Colors.primary, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10 },
  paymentAddButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  paymentCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 14, overflow: 'hidden' },
  paymentRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  lastPaymentRow: { borderBottomWidth: 0 },
  paymentDetails: { flex: 1, minWidth: 0 },
  paymentTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  paymentSubtitle: { color: Colors.textSecondary, fontSize: 10, lineHeight: 14, marginTop: 3 },
  paymentActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paymentAmount: { color: Colors.danger, fontSize: 12, fontWeight: '700' },
  paymentAction: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  listHeading: { flex: 1 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },
  sectionSubtitle: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  disabledButton: { opacity: 0.6 },
  editButtonText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  removeButtonText: { color: '#c92a2a', fontSize: 11, fontWeight: '700' },
  cancelDeleteButton: { paddingHorizontal: 8, paddingVertical: 7 },
  cancelDeleteText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  deleteButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 7, backgroundColor: '#c92a2a' },
  deleteButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyText: { color: Colors.textMuted, fontSize: 12, paddingVertical: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.42)' },
  modalCard: { width: '100%', maxWidth: 640, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 22 },
  compactModalCard: { maxWidth: 520, maxHeight: '95%', padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  closeText: { color: Colors.textMuted, fontSize: 28, lineHeight: 30, paddingHorizontal: 4 },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 17, marginBottom: 7 },
  accountChoices: { borderWidth: 1, borderColor: Colors.border, borderRadius: 9, overflow: 'hidden' },
  accountChoice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border },
  accountChoiceSelected: { backgroundColor: Colors.primaryLight },
  selectedAccount: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 9, backgroundColor: '#f8f9fa' },
  loanChoice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border },
  optionTextContainer: { flex: 1 },
  optionTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  optionSubtitle: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  optionBalance: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: Colors.badgeBg },
  typeOptionSelected: { backgroundColor: Colors.primaryLight },
  typeOptionText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  typeOptionTextSelected: { color: Colors.primary },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8f9fa', color: Colors.textPrimary, fontSize: 14 },
  helpText: { color: Colors.textMuted, fontSize: 11, marginTop: 6 },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: Colors.textMuted, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxCheck: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20, marginBottom: 4 },
  modalCancelButton: { justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  modalCancelText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  saveButton: { backgroundColor: Colors.primary, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 11 },
  saveButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
