import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

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
        <Text style={[styles.th, { flex: 1.5 }]}>OUTSTANDING</Text>
        <Text style={[styles.th, { flex: 1 }]}>INTEREST</Text>
        <Text style={[styles.th, { flex: 1.2 }]}>REPAYMENT</Text>
        <Text style={[styles.th, { flex: 1.5 }]}>PROGRESS</Text>
        <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>ACTIONS</Text>
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No records found.</Text>
        </View>
      ) : (
        data.map((item, index) => {
          const balance = Number(item.balance || 0);
          const originalAmt = balance * 1.2;
          const paidPercent = Math.min(100, Math.max(5, Math.round(((originalAmt - balance) / originalAmt) * 100)));

          return (
            <View key={item.account_id || index} style={styles.tableRow}>
              <View style={[styles.td, { flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <View style={styles.rowAvatar}>
                  <Text style={styles.rowAvatarText}>{item.title?.[0]?.toUpperCase() || 'L'}</Text>
                </View>
                <View>
                  <Text style={styles.rowMainTitle}>{item.title}</Text>
                  <Text style={styles.rowSubText}>Started {item.start_date || 'N/A'}</Text>
                </View>
              </View>

              <View style={[styles.td, { flex: 1.5 }]}>
                <Text style={styles.rowMainValue}>${balance.toLocaleString()}</Text>
              </View>

              <View style={[styles.td, { flex: 1 }]}>
                <Text style={styles.rowSecondaryValue}>{item.interest_rates?.[0]?.rate ? `${item.interest_rates[0].rate}%` : '—'}</Text>
              </View>

              <View style={[styles.td, { flex: 1.2 }]}>
                <Text style={styles.rowMainValue}>${item.payments?.[0]?.amount || '—'}</Text>
                <Text style={styles.rowSubText}>{item.payments?.[0]?.frequency || 'Monthly'}</Text>
              </View>

              <View style={[styles.td, { flex: 1.5 }]}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${paidPercent}%` }]} />
                </View>
                <Text style={styles.progressText}>{paidPercent}%</Text>
              </View>

              <View style={[styles.td, { flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }]}>
                <TouchableOpacity onPress={() => onEdit(item)}><Text style={styles.actionEdit}>Edit</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item.account_id)}><Text style={styles.actionDelete}>Del</Text></TouchableOpacity>
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
  rowAvatar: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f0f0ff', justifyContent: 'center', alignItems: 'center' },
  rowAvatarText: { color: '#5d55f7', fontWeight: 'bold', fontSize: 14 },
  rowMainTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a1d20' },
  rowSubText: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  rowMainValue: { fontSize: 14, fontWeight: '600', color: '#1a1d20' },
  rowSecondaryValue: { fontSize: 14, fontWeight: '500', color: '#495057' },
  progressBarBg: { height: 6, backgroundColor: '#f1f3f5', borderRadius: 3, width: '100%', marginBottom: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#5d55f7', borderRadius: 3 },
  progressText: { fontSize: 11, color: '#6c757d' },
  actionEdit: { fontSize: 12, fontWeight: '600', color: '#5d55f7' },
  actionDelete: { fontSize: 12, fontWeight: '600', color: '#dc3545' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6c757d', fontSize: 14 },
});