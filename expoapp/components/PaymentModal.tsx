import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getTodayDate } from '../config/accountTypes';
import { NewPaymentEntry, PaymentEntry } from '../lib/paymentEntries';
import DatePickerField from './common/DatePickerField';
import FrequencyDropdown from './common/FrequencyDropdown';

export interface PaymentAccountOption {
  account_id: string;
  title: string;
  account_type: string;
}

export interface LoanAccountOption {
  account_id: string;
  title: string;
  account_type: string;
}

interface PaymentModalProps {
  visible: boolean;
  variant: 'income' | 'saving' | 'loan-payment' | 'expense';
  accounts: PaymentAccountOption[];
  loanAccounts?: LoanAccountOption[];
  initialEntry?: PaymentEntry;
  initialAccountId?: string;
  onSave: (
    entry: NewPaymentEntry,
    accountId: string,
    originalEntryId?: string,
    originalAccountId?: string
  ) => Promise<boolean>;
  onClose: () => void;
}

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  return date.getUTCFullYear() === Number(yearText)
    && date.getUTCMonth() === Number(monthText) - 1
    && date.getUTCDate() === Number(dayText);
}

export default function PaymentModal({
  visible,
  variant,
  accounts,
  loanAccounts = [],
  initialEntry,
  initialAccountId,
  onSave,
  onClose,
}: PaymentModalProps) {
  const [description, setDescription] = useState(initialEntry?.description || '');
  const [amount, setAmount] = useState(initialEntry?.amount !== undefined ? String(initialEntry.amount) : '');
  const [startDate, setStartDate] = useState(initialEntry?.startDate || initialEntry?.date || getTodayDate());
  const [frequency, setFrequency] = useState(initialEntry?.frequency || '');
  const [endDate, setEndDate] = useState(initialEntry?.endDate || '');
  const [accountId, setAccountId] = useState(initialAccountId || accounts[0]?.account_id || '');
  const [linkedAccountId, setLinkedAccountId] = useState(
    initialEntry?.linkedAccountId || initialEntry?.linked_account_id || accounts[1]?.account_id || accounts[0]?.account_id || ''
  );
  const [expandedAccount, setExpandedAccount] = useState<'account' | 'linked' | null>(null);
  const [saving, setSaving] = useState(false);
  const [expenseType, setExpenseType] = useState<'Bill Payment' | 'Expense'>(
    initialEntry?.type === 'Bill Payment' ? 'Bill Payment' : 'Expense'
  );
  const [expenseTypeExpanded, setExpenseTypeExpanded] = useState(false);

  const isIncome = variant === 'income';
  const isSaving = variant === 'saving';
  const isLoanPayment = variant === 'loan-payment';
  const isExpense = variant === 'expense';
  const title = initialEntry
    ? isIncome ? 'Edit income' : isSaving ? 'Edit savings transfer' : isLoanPayment ? 'Edit additional loan payment' : 'Edit spending'
    : isIncome ? 'Add income' : isSaving ? 'Add savings transfer' : isLoanPayment ? 'Add additional loan payment' : 'Add spending';
  const selectedAccount = accounts.find(account => account.account_id === accountId);
  const linkedOptions = isSaving ? accounts : loanAccounts;
  const selectedLinkedAccount = linkedOptions.find(account => account.account_id === linkedAccountId);

  async function submit() {
    const parsedAmount = Number(amount);
    if (!description.trim()) {
      alert('Enter a description.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('Enter an amount greater than $0.');
      return;
    }
    if (!isValidDate(startDate)) {
      alert('Enter a valid start date (YYYY-MM-DD).');
      return;
    }
    if (endDate.trim() && !isValidDate(endDate)) {
      alert('Enter a valid end date (YYYY-MM-DD).');
      return;
    }
    if (endDate.trim() && endDate.trim() < startDate) {
      alert('End date must be on or after the start date.');
      return;
    }
    if (!accountId || !selectedAccount) {
      alert('Choose an account.');
      return;
    }
    if ((isSaving || isLoanPayment) && (!linkedAccountId || !selectedLinkedAccount)) {
      alert(isLoanPayment ? 'Choose a loan or credit card.' : 'Choose the destination account.');
      return;
    }

    const type = isIncome ? 'Income'
      : isSaving ? 'Payment'
        : isLoanPayment ? 'Part Payment'
          : expenseType;
    const entry: NewPaymentEntry = {
      id: initialEntry?.id || `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      description: description.trim(),
      amount: parsedAmount,
      startDate,
      ...(frequency.trim() ? { frequency: frequency.trim() } : {}),
      ...(endDate.trim() ? { endDate } : {}),
      ...((isSaving || isLoanPayment) ? { linkedAccountId } : {}),
    };

    setSaving(true);
    if (await onSave(entry, accountId, initialEntry?.id, initialAccountId)) {
      onClose();
    }
    else setSaving(false);
  }

  function renderAccountPicker(
    label: string,
    key: 'account' | 'linked',
    selected: PaymentAccountOption | undefined,
    onSelect: (id: string) => void,
    options: PaymentAccountOption[] = accounts,
    disabled = false
  ) {
    const expanded = expandedAccount === key;
    return (
      <>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setExpandedAccount(expanded ? null : key)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${selected?.title || 'Select account'}`}
        >
          <Text style={styles.dropdownButtonText}>{selected?.title || 'Select an account'}</Text>
          <Text style={styles.dropdownButtonText}>{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {expanded && (
          <View style={styles.dropdownOptions}>
            {options.length === 0 ? (
              <Text style={styles.emptyOptionText}>
                {key === 'linked' && isLoanPayment ? 'Add a loan or credit card first.' : 'Add an account first.'}
              </Text>
            ) : options.map(account => (
              <TouchableOpacity
                key={account.account_id}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(account.account_id);
                  setExpandedAccount(null);
                }}
              >
                <View style={[styles.radio, selected?.account_id === account.account_id && styles.radioSelected]} />
                <View>
                  <Text style={styles.dropdownOptionTitle}>{account.title}</Text>
                  <Text style={styles.dropdownOptionSubtitle}>{account.account_type}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>
              Description
            </Text>
            <TextInput
              style={styles.input}
              placeholder={isIncome ? 'e.g. Salary' : isSaving ? 'e.g. Savings transfer' : isLoanPayment ? 'e.g. Extra repayment' : 'e.g. Electricity bill'}
              value={description}
              onChangeText={setDescription}
              maxLength={120}
            />

            {isExpense && (
              <>
                <Text style={styles.label}>Spending type</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setExpenseTypeExpanded(!expenseTypeExpanded)}
                  accessibilityRole="button"
                  accessibilityLabel={`Spend type: ${expenseType}`}
                  accessibilityState={{ expanded: expenseTypeExpanded }}
                >
                  <Text style={styles.dropdownButtonText}>{expenseType}</Text>
                  <Text style={styles.dropdownButtonText}>{expenseTypeExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {expenseTypeExpanded && (
                  <View style={styles.dropdownOptions}>
                    {(['Bill Payment', 'Expense'] as const).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setExpenseType(type);
                          setExpenseTypeExpanded(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionTitle}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <Text style={styles.label}>Amount ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <DatePickerField label="Start date" value={startDate} onChangeText={setStartDate} />

            <FrequencyDropdown label="Repeat" value={frequency} onChange={setFrequency} optional />

            <DatePickerField
              label="End date (optional)"
              value={endDate}
              onChangeText={setEndDate}
            />

            {renderAccountPicker(
              isIncome ? 'Deposit into' : isExpense ? 'Account used' : 'Paid from',
              'account',
              selectedAccount,
              setAccountId,
              accounts,
              !!initialEntry && !isIncome
            )}
            {isExpense && (
              <Text style={styles.accountHelp}>
                Card and BNPL charges increase the loan balance and affect interest and repayments.
              </Text>
            )}
            {(isSaving || isLoanPayment) && renderAccountPicker(
              isLoanPayment ? 'Loan or credit card' : 'Transfer to',
              'linked',
              selectedLinkedAccount,
              setLinkedAccountId,
              linkedOptions
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (saving || accounts.length === 0) && styles.disabledButton]}
              onPress={submit}
              disabled={saving || accounts.length === 0}
            >
              <Text style={styles.saveText}>
                {saving ? 'Saving…' : `${initialEntry ? 'Save changes' : 'Add'} ${isIncome ? 'income' : isSaving ? 'transfer' : isLoanPayment ? 'payment' : 'spending'}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90%', padding: 24, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1d20', marginBottom: 16 },
  formScroll: { paddingBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#495057', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8f9fa', color: '#1a1d20' },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8f9fa' },
  dropdownButtonText: { fontSize: 14, color: '#495057' },
  dropdownOptions: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  dropdownOptionTitle: { fontSize: 14, color: '#1a1d20', fontWeight: '500' },
  dropdownOptionSubtitle: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  emptyOptionText: { fontSize: 13, color: '#6c757d', padding: 12 },
  accountHelp: { fontSize: 11, color: '#6c757d', marginTop: 6 },
  radio: { width: 18, height: 18, borderWidth: 1, borderColor: '#adb5bd', borderRadius: 9 },
  radioSelected: { borderWidth: 5, borderColor: '#5d55f7' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: '#e9ecef', paddingTop: 16 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f1f3f5' },
  cancelText: { color: '#495057', fontWeight: '600' },
  saveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#5d55f7' },
  disabledButton: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: 'bold' },
});
