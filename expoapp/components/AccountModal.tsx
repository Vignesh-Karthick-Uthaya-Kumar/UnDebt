// components/AccountModal.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { ACCOUNT_TYPES, getDefaultEndDate, getTodayDate } from '../config/accountTypes';
import { getPaymentEntries } from '../lib/paymentEntries';
import {
  addCalendarDays,
  addCalendarMonths,
  createDefaultLoanScheduleDraft,
  LoanPaymentType,
  LoanScheduleDraft,
  RepaymentScheduleDraft,
  validateLoanScheduleDraft,
} from '../lib/loanSchedules';
import DatePickerField from './common/DatePickerField';
import FrequencyDropdown from './common/FrequencyDropdown';

interface AccountModalProps {
  visible: boolean;
  editingId: string | null;
  screen: 'loans' | 'transactions';
  title: string; setTitle: (v: string) => void;
  accountType: string; setAccountType: (v: string) => void;
  balance: string; setBalance: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
  interestRateVal: string; setInterestRateVal: (v: string) => void;
  paymentAmount: string; setPaymentAmount: (v: string) => void;
  paymentFrequency: string; setPaymentFrequency: (v: string) => void;
  initialAccount?: Record<string, any>;
  onSave: (loanSchedule?: LoanScheduleDraft) => void;
  onClose: () => void;
}

export default function AccountModal({
  visible, editingId,
  screen,
  title, setTitle,
  accountType, setAccountType,
  balance, setBalance,
  startDate, setStartDate,
  endDate, setEndDate,
  interestRateVal, setInterestRateVal,
  paymentAmount, setPaymentAmount,
  paymentFrequency, setPaymentFrequency,
  initialAccount,
  onSave, onClose
}: AccountModalProps) {
  const currentConfig = ACCOUNT_TYPES[accountType] || ACCOUNT_TYPES['HomeLoan'];
  const availableAccountTypes = Object.values(ACCOUNT_TYPES).filter(type => type.screen === screen);
  const isLoan = screen === 'loans';
  const isCreditCard = accountType === 'CreditCard';
  const isBNPL = accountType === 'BuyNowPayLater';
  const [scheduleDraft, setScheduleDraft] = useState(() =>
    createDefaultLoanScheduleDraft(accountType, startDate, endDate)
  );
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    if (!visible || !isLoan) return;
    const defaults = createDefaultLoanScheduleDraft(accountType, startDate, endDate);
    const savedPayments = getPaymentEntries(initialAccount?.payments);
    const savedRates = Array.isArray(initialAccount?.interest_rates)
      ? initialAccount.interest_rates
      : [];
    const interestOnlyPeriod = savedPayments.find(entry => entry.periodKind === 'interest-only');
    const interestFreePeriod = savedRates.find((entry: Record<string, any>) => entry.periodKind === 'interest-free');
    const savedRepayments = savedPayments.filter(entry =>
      ['Principal and Interest', 'Interest Only', 'Min balance', 'Full payment'].includes(entry.type || '')
      && entry.periodKind !== 'interest-only'
    );

    const repayments = savedRepayments.length
      ? savedRepayments.map((entry, index) => ({
          id: `${Date.now()}-${index}`,
          amount: entry.amount === undefined || entry.amount === null ? '' : String(entry.amount),
          type: (entry.type || (isCreditCard ? 'Min balance' : 'Principal and Interest')) as LoanPaymentType,
          frequency: entry.frequency || defaults.repayments[0].frequency,
          startDate: entry.startDate || startDate,
          endDate: entry.endDate || '',
          sameInterestRate: entry.sameInterestRate !== false,
          interestRate: entry.interestRate === undefined ? '' : String(entry.interestRate),
        }))
      : defaults.repayments;

    setScheduleDraft({
      ...defaults,
      interestOnlyPeriodEnabled: !!interestOnlyPeriod,
      interestOnlyStartDate: interestOnlyPeriod?.startDate || defaults.interestOnlyStartDate,
      interestOnlyEndDate: interestOnlyPeriod?.endDate || defaults.interestOnlyEndDate,
      interestFreePeriodEnabled: !!interestFreePeriod,
      interestFreeStartDate: interestFreePeriod?.date || defaults.interestFreeStartDate,
      interestFreeEndDate: interestFreePeriod?.endDate || defaults.interestFreeEndDate,
      creditCardPaymentType: repayments[0]?.type === 'Full payment' ? 'Full payment' : 'Min balance',
      repayments,
    });
    setValidationMessage('');
  }, [visible, editingId]);

  const handleTypeChange = (key: string) => {
    setAccountType(key);
    const cfg = ACCOUNT_TYPES[key];
    if (cfg) {
      setBalance(cfg.defaultBalance !== undefined ? String(cfg.defaultBalance) : '');
      setInterestRateVal(cfg.defaultInterestRate !== undefined ? cfg.defaultInterestRate.toFixed(2) : '');
      setPaymentAmount(cfg.defaultPaymentAmount !== undefined ? String(cfg.defaultPaymentAmount) : '');
      setPaymentFrequency(cfg.defaultPaymentFrequency || 'Monthly');
      const nextEndDate = getDefaultEndDate(key, startDate);
      setEndDate(nextEndDate);
      setScheduleDraft(createDefaultLoanScheduleDraft(key, startDate, nextEndDate));
      setValidationMessage('');
    }
  };

  const handleLoanStartDateChange = (value: string) => {
    const effectivePreviousStart = startDate > getTodayDate() ? startDate : getTodayDate();
    setStartDate(value);
    setScheduleDraft(current => ({
      ...current,
      repayments: current.repayments.map((repayment, index) =>
        (isBNPL || (index === 0 && repayment.startDate === effectivePreviousStart
          && !current.interestOnlyPeriodEnabled && !current.interestFreePeriodEnabled))
          ? { ...repayment, startDate: value > getTodayDate() ? value : getTodayDate() }
          : repayment
      ),
    }));
  };

  const handleLoanEndDateChange = (value: string) => {
    const previousEndDate = endDate;
    setEndDate(value);
    setScheduleDraft(current => ({
      ...current,
      repayments: current.repayments.map(repayment =>
        isBNPL || repayment.endDate === previousEndDate
          ? { ...repayment, endDate: value }
          : repayment
      ),
    }));
  };

  const updateRepayment = (id: string, changes: Partial<RepaymentScheduleDraft>) => {
    setScheduleDraft(current => ({
      ...current,
      repayments: current.repayments.map(repayment =>
        repayment.id === id ? { ...repayment, ...changes } : repayment
      ),
    }));
    setValidationMessage('');
  };

  const toggleInterestOnlyPeriod = (enabled: boolean) => {
    const today = getTodayDate();
    const defaultEnd = addCalendarMonths(today, 6);
    setScheduleDraft(current => ({
      ...current,
      interestOnlyPeriodEnabled: enabled,
      interestOnlyStartDate: enabled ? today : current.interestOnlyStartDate,
      interestOnlyEndDate: enabled ? defaultEnd : current.interestOnlyEndDate,
      repayments: current.repayments.map((repayment, index) => index === 0
        ? { ...repayment, startDate: enabled ? addCalendarDays(defaultEnd, 1) : (startDate > today ? startDate : today) }
        : repayment),
    }));
    setValidationMessage('');
  };

  const toggleInterestFreePeriod = (enabled: boolean) => {
    setScheduleDraft(current => ({
      ...current,
      interestFreePeriodEnabled: enabled,
      interestFreeStartDate: enabled ? getTodayDate() : current.interestFreeStartDate,
      interestFreeEndDate: enabled ? '' : current.interestFreeEndDate,
      repayments: current.repayments.map((repayment, index) => index === 0
        ? { ...repayment, startDate: enabled && current.interestFreeEndDate
          ? addCalendarDays(current.interestFreeEndDate, 1)
          : getTodayDate() }
        : repayment),
    }));
    setValidationMessage('');
  };

  const addRepaymentSchedule = () => {
    setScheduleDraft(current => {
      const previous = current.repayments[current.repayments.length - 1];
      const previousEndsAtMaturity = !!endDate && previous?.endDate === endDate;
      const nextStartDate = previous?.endDate && endDate && previous.endDate < endDate
        ? addCalendarDays(previous.endDate, 1)
        : '';
      return {
        ...current,
        repayments: [
          ...current.repayments,
          {
            id: `${Date.now()}-${current.repayments.length}`,
            amount: '',
            type: 'Principal and Interest',
            frequency: previous?.frequency || 'Monthly',
            startDate: previousEndsAtMaturity ? '' : nextStartDate,
            endDate: previousEndsAtMaturity ? '' : nextStartDate ? endDate : '',
            sameInterestRate: true,
            interestRate: '',
          },
        ],
      };
    });
    setValidationMessage('');
  };

  const removeRepaymentSchedule = (id: string) => {
    setScheduleDraft(current => current.repayments.length > 1
      ? { ...current, repayments: current.repayments.filter(repayment => repayment.id !== id) }
      : current);
    setValidationMessage('');
  };

  const handleSave = () => {
    if (isLoan) {
      const validation = validateLoanScheduleDraft(accountType, startDate, endDate, scheduleDraft);
      if (validation) {
        setValidationMessage(validation);
        return;
      }
      if (!interestRateVal || !Number.isFinite(Number(interestRateVal))) {
        setValidationMessage('Enter a valid interest rate.');
        return;
      }
      onSave(scheduleDraft);
      return;
    }
    onSave();
  };

  const repaymentTypeOptions: LoanPaymentType[] = isCreditCard
    ? ['Min balance', 'Full payment']
    : ['Principal and Interest', 'Interest Only'];

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{editingId ? (isLoan ? 'Edit loan' : 'Edit account') : (isLoan ? 'Add Loan' : 'Add Account')}</Text>

          <ScrollView contentContainerStyle={styles.formScroll}>
            <Text style={styles.label}>Account type</Text>
            <View style={styles.typeGrid}>
              {availableAccountTypes.map((type) => {
                const isSelected = accountType === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                    onPress={() => handleTypeChange(type.key)}
                  >
                    <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>{type.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {currentConfig.fields.showTitle && (
              <>
                <Text style={styles.label}>Account name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Home loan or Emergency fund"
                  value={title}
                  onChangeText={setTitle}
                />
              </>
            )}

            {currentConfig.fields.showBalance && (
              <>
                <Text style={styles.label}>Balance ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={balance}
                  onChangeText={setBalance}
                />
              </>
            )}

            {/* Conditional Fields based on Config */}
            {currentConfig.fields.showDates && (
              <View style={styles.row}>
                <DatePickerField
                  label="Start Date"
                  value={startDate}
                  onChangeText={isLoan ? handleLoanStartDateChange : setStartDate}
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                {currentConfig.defaultEndDate && (
                  <DatePickerField
                    label="End Date"
                    value={endDate}
                    onChangeText={isLoan ? handleLoanEndDateChange : setEndDate}
                    containerStyle={{ flex: 1, marginLeft: 8 }}
                  />
                )}
              </View>
            )}

            {isLoan && !isCreditCard && !isBNPL && (
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.label}>Interest-only period</Text>
                  <Text style={styles.helperText}>Pay interest only for an introductory period.</Text>
                </View>
                <Switch
                  value={scheduleDraft.interestOnlyPeriodEnabled}
                  onValueChange={toggleInterestOnlyPeriod}
                  accessibilityLabel="Interest-only period applicable"
                />
              </View>
            )}

            {isLoan && isCreditCard && (
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.label}>Interest-free period</Text>
                  <Text style={styles.helperText}>Set the dates when the interest rate is 0%.</Text>
                </View>
                <Switch
                  value={scheduleDraft.interestFreePeriodEnabled}
                  onValueChange={toggleInterestFreePeriod}
                  accessibilityLabel="Interest-free period applicable"
                />
              </View>
            )}

            {scheduleDraft.interestOnlyPeriodEnabled && (
              <View style={styles.row}>
                <DatePickerField
                  label="Interest-only start date"
                  value={scheduleDraft.interestOnlyStartDate}
                  onChangeText={value => setScheduleDraft(current => ({ ...current, interestOnlyStartDate: value }))}
                  containerStyle={styles.halfFieldLeft}
                />
                <DatePickerField
                  label="Interest-only end date"
                  value={scheduleDraft.interestOnlyEndDate}
                  onChangeText={value => setScheduleDraft(current => ({
                    ...current,
                    interestOnlyEndDate: value,
                    repayments: current.repayments.map((repayment, index) => index === 0
                      ? { ...repayment, startDate: addCalendarDays(value, 1) }
                      : repayment),
                  }))}
                  containerStyle={styles.halfFieldRight}
                />
              </View>
            )}

            {scheduleDraft.interestFreePeriodEnabled && (
              <View style={styles.row}>
                <DatePickerField
                  label="Interest-free start date"
                  value={scheduleDraft.interestFreeStartDate}
                  onChangeText={value => setScheduleDraft(current => ({ ...current, interestFreeStartDate: value }))}
                  containerStyle={styles.halfFieldLeft}
                />
                <DatePickerField
                  label="Interest-free end date"
                  value={scheduleDraft.interestFreeEndDate}
                  onChangeText={value => setScheduleDraft(current => ({
                    ...current,
                    interestFreeEndDate: value,
                    repayments: current.repayments.map((repayment, index) => index === 0
                      ? { ...repayment, startDate: value ? addCalendarDays(value, 1) : getTodayDate() }
                      : repayment),
                  }))}
                  containerStyle={styles.halfFieldRight}
                />
              </View>
            )}

            {currentConfig.fields.showInterestRate && (
              <>
                <Text style={styles.label}>Interest rate (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 6.1"
                  keyboardType="numeric"
                  value={interestRateVal}
                  onChangeText={(value) => {
                    if (/^\d*(\.\d{0,2})?$/.test(value)) setInterestRateVal(value);
                  }}
                />
              </>
            )}

            {isLoan && (
              <View style={styles.repaymentSection}>
                <Text style={styles.sectionTitle}>Repayments</Text>
                {scheduleDraft.repayments.map((repayment, index) => (
                  <View key={repayment.id} style={styles.scheduleBlock}>
                    {!isBNPL && !isCreditCard && scheduleDraft.repayments.length > 1 && (
                      <View style={styles.scheduleHeader}>
                        <Text style={styles.scheduleTitle}>Schedule {index + 1}</Text>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Remove schedule ${index + 1}`}
                          style={styles.removeScheduleButton}
                          onPress={() => removeRepaymentSchedule(repayment.id)}
                        >
                          <Text style={styles.removeScheduleText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {isCreditCard ? (
                      <View>
                        <Text style={styles.label}>Repay every billing cycle</Text>
                        <View style={styles.optionRow}>
                          {repaymentTypeOptions.map(type => (
                            <TouchableOpacity
                              key={type}
                              accessibilityRole="button"
                              accessibilityState={{ selected: scheduleDraft.creditCardPaymentType === type }}
                              style={[styles.optionButton, scheduleDraft.creditCardPaymentType === type && styles.optionButtonSelected]}
                              onPress={() => {
                                setScheduleDraft(current => ({
                                  ...current,
                                  creditCardPaymentType: type as 'Min balance' | 'Full payment',
                                  repayments: current.repayments.map((item, itemIndex) => itemIndex === 0
                                    ? { ...item, type }
                                    : item),
                                }));
                              }}
                            >
                              <Text style={[styles.optionText, scheduleDraft.creditCardPaymentType === type && styles.optionTextSelected]}>{type}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <Text style={styles.helperText}>Frequency: Monthly</Text>
                        <View style={styles.row}>
                          <DatePickerField
                            label="Repayment start date"
                            value={repayment.startDate}
                            onChangeText={value => updateRepayment(repayment.id, { startDate: value })}
                            containerStyle={styles.halfFieldLeft}
                          />
                          <DatePickerField
                            label="Repayment end date"
                            value={repayment.endDate}
                            onChangeText={value => updateRepayment(repayment.id, { endDate: value })}
                            containerStyle={styles.halfFieldRight}
                          />
                        </View>
                      </View>
                    ) : (
                      <>
                        {isBNPL && (
                          <View style={styles.row}>
                            <View style={styles.flexField}>
                              <Text style={styles.label}>Repayment amount ($)</Text>
                              <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={repayment.amount}
                                onChangeText={value => updateRepayment(repayment.id, { amount: value })}
                              />
                            </View>
                            <View style={styles.frequencyField}>
                              <FrequencyDropdown
                                label="Frequency"
                                value={repayment.frequency}
                                onChange={value => updateRepayment(repayment.id, { frequency: value })}
                                frequencies={['Weekly', 'Fortnightly', 'Monthly', 'Quarterly']}
                              />
                            </View>
                          </View>
                        )}
                        {!isBNPL && (
                          <>
                            <View style={styles.row}>
                              <View style={styles.flexField}>
                                <Text style={styles.label}>Repayment amount ($)</Text>
                                <TextInput
                                  style={styles.input}
                                  placeholder="0.00"
                                  keyboardType="numeric"
                                  value={repayment.amount}
                                  onChangeText={value => updateRepayment(repayment.id, { amount: value })}
                                />
                              </View>
                              <View style={styles.frequencyField}>
                                <FrequencyDropdown
                                  label="Frequency"
                                  value={repayment.frequency}
                                  onChange={value => updateRepayment(repayment.id, { frequency: value })}
                                />
                              </View>
                            </View>
                            <Text style={styles.label}>Payment type</Text>
                            <View style={styles.optionRow}>
                              {repaymentTypeOptions.map(type => (
                                <TouchableOpacity
                                  key={type}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected: repayment.type === type }}
                                  style={[styles.optionButton, repayment.type === type && styles.optionButtonSelected]}
                                  onPress={() => updateRepayment(repayment.id, { type })}
                                >
                                  <Text style={[styles.optionText, repayment.type === type && styles.optionTextSelected]}>{type}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            {(scheduleDraft.interestOnlyPeriodEnabled || index > 0) && (
                              <View style={styles.toggleRow}>
                                <Text style={styles.label}>Interest rate remains the same</Text>
                                <Switch
                                  value={repayment.sameInterestRate}
                                  onValueChange={value => updateRepayment(repayment.id, { sameInterestRate: value })}
                                  accessibilityLabel={`Schedule ${index + 1} uses the same interest rate`}
                                />
                              </View>
                            )}
                            {!repayment.sameInterestRate && (
                              <>
                                <Text style={styles.label}>Interest rate for this schedule (%)</Text>
                                <TextInput
                                  style={styles.input}
                                  placeholder="e.g. 6.1"
                                  keyboardType="numeric"
                                  value={repayment.interestRate}
                                  onChangeText={value => {
                                    if (/^\d*(\.\d{0,2})?$/.test(value)) {
                                      updateRepayment(repayment.id, { interestRate: value });
                                    }
                                  }}
                                />
                              </>
                            )}
                            <View style={styles.row}>
                              <DatePickerField
                                label="Schedule start date"
                                value={repayment.startDate}
                                onChangeText={value => updateRepayment(repayment.id, { startDate: value })}
                                containerStyle={styles.halfFieldLeft}
                              />
                              <DatePickerField
                                label="Schedule end date"
                                value={repayment.endDate}
                                onChangeText={value => updateRepayment(repayment.id, { endDate: value })}
                                containerStyle={styles.halfFieldRight}
                              />
                            </View>
                          </>
                        )}
                      </>
                    )}
                  </View>
                ))}

                {!isBNPL && !isCreditCard && (
                  <TouchableOpacity style={styles.addScheduleButton} onPress={addRepaymentSchedule}>
                    <Text style={styles.addScheduleText}>+ Add repayment schedule</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!isLoan && currentConfig.fields.showPaymentDetails && (
              <View style={styles.row}>
                <View style={{ flex: 2, marginRight: 8 }}>
                  <Text style={styles.label}>Scheduled repayment ($)</Text>
                  <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={paymentAmount} onChangeText={setPaymentAmount} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FrequencyDropdown label="Frequency" value={paymentFrequency} onChange={setPaymentFrequency} />
                </View>
              </View>
            )}
            {!!validationMessage && <Text style={styles.validationMessage}>{validationMessage}</Text>}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>{isLoan ? 'Save loan' : 'Save account'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90%', padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1d20', marginBottom: 16 },
  formScroll: { paddingBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#495057', marginBottom: 6, marginTop: 12 },
  helperText: { color: '#6c757d', fontSize: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8f9fa', color: '#1a1d20' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', backgroundColor: '#f8f9fa' },
  typeChipSelected: { backgroundColor: '#5d55f7', borderColor: '#5d55f7' },
  typeChipText: { fontSize: 12, color: '#495057', fontWeight: '500' },
  typeChipTextSelected: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 12 },
  halfFieldLeft: { flex: 1, marginRight: 0 },
  halfFieldRight: { flex: 1, marginLeft: 0 },
  flexField: { flex: 1 },
  frequencyField: { width: 150 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  toggleCopy: { flex: 1 },
  repaymentSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e9ecef', paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1d20', marginTop: 8 },
  scheduleBlock: { marginTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduleTitle: { fontSize: 13, fontWeight: '700', color: '#495057', marginTop: 8 },
  removeScheduleButton: { paddingVertical: 8, paddingHorizontal: 10 },
  removeScheduleText: { color: '#c92a2a', fontSize: 13, fontWeight: '600' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  optionButtonSelected: { backgroundColor: '#f0f0ff', borderColor: '#5d55f7' },
  optionText: { color: '#495057', fontSize: 13, fontWeight: '600' },
  optionTextSelected: { color: '#5d55f7' },
  addScheduleButton: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 8, paddingHorizontal: 10 },
  addScheduleText: { color: '#5d55f7', fontSize: 13, fontWeight: '700' },
  validationMessage: { color: '#c92a2a', fontSize: 13, marginTop: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: '#e9ecef', paddingTop: 16 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f1f3f5' },
  cancelText: { color: '#495057', fontWeight: '600' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#5d55f7' },
  saveText: { color: '#fff', fontWeight: 'bold' },
});