// screens/TransactionsScreen.tsx
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenHeader from '../components/common/ScreenHeader';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface TransactionsScreenProps {
  transactions: any[];
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

export default function TransactionsScreen({ transactions, onAdd, onEdit, onDelete }: TransactionsScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader 
        category="ACCOUNTS" 
        title="Transactions & Savings" 
        subtitle="Manage everyday spending accounts, checking, and offset savings." 
        buttonLabel="+ Add Account"
        onPressButton={onAdd}
      />

      <View style={styles.tableCard}>
        <View style={styles.tableHeaderRow}>
          <Text style={[Typography.th, { flex: 2 }]}>ACCOUNT</Text>
          <Text style={[Typography.th, { flex: 1.5 }]}>TYPE</Text>
          <Text style={[Typography.th, { flex: 1.5 }]}>BALANCE</Text>
          <Text style={[Typography.th, { flex: 1, textAlign: 'right' }]}>ACTIONS</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={{ color: Colors.textSecondary }}>No transaction or savings accounts added yet.</Text>
          </View>
        ) : (
          transactions.map((item) => (
            <View key={item.account_id} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={Typography.cardTitle}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted }}>Started {item.start_date || 'N/A'}</Text>
              </View>
              <View style={{ flex: 1.5 }}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.account_type}</Text>
                </View>
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.success }}>${Number(item.balance || 0).toFixed(2)}</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}><Text style={styles.btnText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item.account_id)}><Text style={styles.btnText}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, paddingBottom: 40 },
  tableCard: { backgroundColor: Colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#fafbfc', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center' },
  badge: { backgroundColor: Colors.badgeBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: Colors.primary },
  editBtn: { backgroundColor: Colors.warning, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  deleteBtn: { backgroundColor: Colors.danger, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  btnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyRow: { padding: 40, alignItems: 'center' },
});