// screens/TransactionsScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

interface TransactionsScreenProps {
  transactions: any[];
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

export default function TransactionsScreen({ transactions, onAdd, onEdit, onDelete }: TransactionsScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerTopRow}>
        <Text style={styles.sectionHeaderTitle}>Transactions & Savings Accounts</Text>
        <TouchableOpacity style={styles.addNewButton} onPress={onAdd}>
          <Text style={styles.addNewButtonText}>+ Add Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transaction or savings accounts added.</Text>
            <Text style={styles.emptySub}>Add offset savings or checking accounts using the button above.</Text>
          </View>
        ) : (
          transactions.map((item) => (
            <View key={item.account_id} style={styles.card}>
              <View style={styles.cardInfo}>
                <View style={styles.badgeRow}>
                  <Text style={styles.badgeText}>{item.account_type}</Text>
                  <Text style={styles.dateText}>Start: {item.start_date || 'N/A'}</Text>
                </View>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemBalance}>Balance: ${Number(item.balance || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
                  <Text style={styles.btnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item.account_id)}>
                  <Text style={styles.btnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 30 },
  sectionHeaderTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addNewButton: { backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addNewButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  listContainer: { gap: 12 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderWidth: 1, borderColor: '#eee' },
  cardInfo: { flex: 1 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#007AFF', backgroundColor: '#eef3ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  dateText: { fontSize: 11, color: '#777' },
  itemTitle: { fontSize: 17, fontWeight: 'bold', color: '#222', marginTop: 2 },
  itemBalance: { fontSize: 15, fontWeight: '600', color: '#2e7d32', marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 6, marginLeft: 10 },
  editBtn: { backgroundColor: '#ffc107', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  deleteBtn: { backgroundColor: '#dc3545', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#444' },
  emptySub: { fontSize: 13, color: '#777', textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
