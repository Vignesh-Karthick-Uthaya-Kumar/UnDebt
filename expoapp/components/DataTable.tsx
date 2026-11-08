import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import AccountTypeMark from './common/AccountTypeMark';
import { formatAccountInterestRate } from '../lib/accountDisplay';

interface DataTableProps {
  sectionTitle: string;
  itemCountText: string;
  data: any[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

export default function DataTable({ sectionTitle, itemCountText, data, onEdit, onDelete }: DataTableProps) {
  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHeaderSection}>
        <View>
          <Text style={styles.tableTitle}>{sectionTitle}</Text>
          <Text style={styles.tableSubtitle}>{itemCountText}</Text>
        </View>
      </View>

      <View style={styles.tableHeadRow}>
        <Text style={[styles.th, { flex: 2.2 }]}>LOAN</Text>
        <Text style={[styles.th, { flex: 1.5 }]}>BALANCE</Text>
        <Text style={[styles.th, { flex: 1 }]}>RATE</Text>
        <Text style={[styles.th, { flex: 1.2 }]}>PAYMENT</Text>
        <Text style={[styles.th, { flex: 1.5 }]}>END DATE</Text>
        <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>ACTIONS</Text>
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No loans yet.</Text>
        </View>
      ) : (
        data.map((item, index) => {
          const balance = Number(item.displayBalance ?? item.balance ?? 0);

          return (
            <View key={item.account_id || index} style={styles.tableRow}>
              <View style={[styles.td, styles.loanCell]}>
                <AccountTypeMark accountType={item.account_type || 'Loan'} />
                <View style={styles.loanDetails}>
                  <Text style={styles.rowMainTitle}>{item.title}</Text>
                </View>
              </View>

              <View style={[styles.td, { flex: 1.5 }]}>
                <Text style={styles.rowMainValue}>${balance.toLocaleString()}</Text>
              </View>

              <View style={[styles.td, { flex: 1 }]}>
                <Text style={styles.rowSecondaryValue}>{formatAccountInterestRate(item)}</Text>
              </View>

              <View style={[styles.td, { flex: 1.2 }]}>
                <Text style={styles.rowMainValue}>${item.payments?.[0]?.amount || '—'}</Text>
                <Text style={styles.rowSubText}>{item.payments?.[0]?.frequency || 'Monthly'}</Text>
              </View>

              <View style={[styles.td, { flex: 1.5 }]}>
                <Text style={styles.rowSecondaryValue}>{item.end_date || '—'}</Text>
              </View>

              <View style={[styles.td, { flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }]}>
                <TouchableOpacity accessibilityLabel={`Edit ${item.title}`} onPress={() => onEdit(item)}><Text style={styles.actionEdit}>✎</Text></TouchableOpacity>
                <TouchableOpacity accessibilityLabel={`Delete ${item.title}`} onPress={() => onDelete(item.account_id)}><Text style={styles.actionDelete}>×</Text></TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tableCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden', marginTop: 10 },
  tableHeaderSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  tableTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1d20' },
  tableSubtitle: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  tableHeadRow: { flexDirection: 'row', backgroundColor: '#fafbfc', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  th: { fontSize: 11, fontWeight: '700', color: '#6c757d', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', alignItems: 'center' },
  td: { justifyContent: 'center' },
  loanCell: { flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  loanDetails: { flexShrink: 1 },
  rowMainTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a1d20' },
  rowSubText: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  rowMainValue: { fontSize: 14, fontWeight: '600', color: '#1a1d20' },
  rowSecondaryValue: { fontSize: 14, fontWeight: '500', color: '#495057' },
  actionEdit: { fontSize: 18, fontWeight: '600', color: '#5d55f7', paddingHorizontal: 4 },
  actionDelete: { fontSize: 21, fontWeight: '500', color: '#dc3545', paddingHorizontal: 4 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6c757d', fontSize: 14 },
});