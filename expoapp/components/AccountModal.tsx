// components/AccountModal.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { ACCOUNT_TYPES, getDefaultEndDate } from '../config/accountTypes';
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
  onSave: () => void;
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
  onSave, onClose
}: AccountModalProps) {
  const currentConfig = ACCOUNT_TYPES[accountType] || ACCOUNT_TYPES['HomeLoan'];
  const availableAccountTypes = Object.values(ACCOUNT_TYPES).filter(type => type.screen === screen);

  const handleTypeChange = (key: string) => {
    setAccountType(key);
    const cfg = ACCOUNT_TYPES[key];
    if (cfg) {
      setBalance(cfg.defaultBalance !== undefined ? String(cfg.defaultBalance) : '');
      setInterestRateVal(cfg.defaultInterestRate !== undefined ? cfg.defaultInterestRate.toFixed(2) : '');
      setPaymentAmount(cfg.defaultPaymentAmount !== undefined ? String(cfg.defaultPaymentAmount) : '');
      setPaymentFrequency(cfg.defaultPaymentFrequency || 'Monthly');
      setEndDate(getDefaultEndDate(key, startDate));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{editingId ? 'Edit account' : 'Add account'}</Text>

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
                  onChangeText={setStartDate}
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                {currentConfig.defaultEndDate && (
                  <DatePickerField
                    label="End Date"
                    value={endDate}
                    onChangeText={setEndDate}
                    containerStyle={{ flex: 1, marginLeft: 8 }}
                  />
                )}
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

            {currentConfig.fields.showPaymentDetails && (
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
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveText}>Save account</Text>
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
  input: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8f9fa', color: '#1a1d20' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', backgroundColor: '#f8f9fa' },
  typeChipSelected: { backgroundColor: '#5d55f7', borderColor: '#5d55f7' },
  typeChipText: { fontSize: 12, color: '#495057', fontWeight: '500' },
  typeChipTextSelected: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: '#e9ecef', paddingTop: 16 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f1f3f5' },
  cancelText: { color: '#495057', fontWeight: '600' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#5d55f7' },
  saveText: { color: '#fff', fontWeight: 'bold' },
});