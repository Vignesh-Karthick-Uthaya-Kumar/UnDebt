// components/AccountModal.tsx
import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { LOAN_TYPES, TRANSACTION_TYPES } from '../lib/supabase';

interface AccountModalProps {
  visible: boolean;
  editingId: string | null;
  title: string;
  setTitle: (val: string) => void;
  accountType: string;
  setAccountType: (val: string) => void;
  balance: string;
  setBalance: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  interestRateVal: string;
  setInterestRateVal: (val: string) => void;
  paymentAmount: string;
  setPaymentAmount: (val: string) => void;
  paymentFrequency: string;
  setPaymentFrequency: (val: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function AccountModal({
  visible, editingId, title, setTitle, accountType, setAccountType,
  balance, setBalance, startDate, setStartDate, endDate, setEndDate,
  interestRateVal, setInterestRateVal, paymentAmount, setPaymentAmount,
  paymentFrequency, setPaymentFrequency, onSave, onClose
}: AccountModalProps) {
  const allTypes = [...LOAN_TYPES, ...TRANSACTION_TYPES];

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalHeader}>
            {editingId !== null ? 'Edit Account' : 'New Account Entry'}
          </Text>

          <Text style={styles.label}>Account Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Primary Mortgage, Everyday Savings"
            placeholderTextColor="#888"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Account Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {allTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, accountType === type && styles.typeChipActive]}
                onPress={() => setAccountType(type)}
              >
                <Text style={[styles.typeChipText, accountType === type && styles.typeChipTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Current Balance ($)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={balance}
            onChangeText={setBalance}
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#888"
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End Date (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#888"
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>

          {LOAN_TYPES.includes(accountType) && (
            <>
              <Text style={styles.sectionHeader}>Loan & Offset Specifications</Text>
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Interest Rate (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 5.99"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={interestRateVal}
                    onChangeText={setInterestRateVal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Payment Amount ($)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 1200"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                  />
                </View>
              </View>

              <Text style={styles.label}>Payment Frequency</Text>
              <TextInput
                style={styles.input}
                placeholder="Weekly, Fortnightly, Monthly..."
                placeholderTextColor="#888"
                value={paymentFrequency}
                onChangeText={setPaymentFrequency}
              />
            </>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>Save Account</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelModalButton} onPress={onClose}>
            <Text style={styles.cancelModalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, paddingBottom: 30 },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#111' },
  sectionHeader: { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, fontSize: 15, color: '#333' },
  typeScroll: { flexDirection: 'row', marginBottom: 4 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f2f5', borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#e1e4e8' },
  typeChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  typeChipText: { fontSize: 12, color: '#444', fontWeight: '500' },
  typeChipTextActive: { color: '#fff', fontWeight: 'bold' },
  rowInputs: { flexDirection: 'row', gap: 10 },
  saveButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelModalButton: { backgroundColor: '#6c757d', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  cancelModalButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
