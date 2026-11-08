import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';

interface SpendComparisonChartProps {
  available: number;
  billPayments: number;
  expenses: number;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function SpendComparisonChart({
  available,
  billPayments,
  expenses,
}: SpendComparisonChartProps) {
  const maximum = Math.max(0, available, billPayments, expenses);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cash and spending</Text>
      {maximum > 0 ? (
        <View style={styles.chart}>
          <ComparisonBar label="Available for period" value={available} maximum={maximum} color={Colors.success} />
          <ComparisonBar label="Bill payments" value={billPayments} maximum={maximum} color="#f08c00" />
          <ComparisonBar label="Expenses" value={expenses} maximum={maximum} color="#7048e8" />
        </View>
      ) : (
        <Text style={styles.emptyText}>Add an account or spending record to see this comparison.</Text>
      )}
    </View>
  );
}

function ComparisonBar({
  label,
  value,
  maximum,
  color,
}: {
  label: string;
  value: number;
  maximum: number;
  color: string;
}) {
  return (
    <View style={styles.barRow} accessibilityLabel={`${label}: ${formatCurrency(value)}`}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{formatCurrency(value)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${Math.max(0, value / maximum * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 18, marginBottom: 20 },
  title: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 16 },
  chart: { gap: 18, paddingVertical: 6 },
  barRow: { gap: 8 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  barLabel: { color: Colors.textSecondary, fontSize: 13 },
  barValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  track: { height: 14, borderRadius: 7, backgroundColor: '#f1f3f5', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 7 },
  emptyText: { color: Colors.textMuted, fontSize: 13, paddingVertical: 20, textAlign: 'center' },
});
