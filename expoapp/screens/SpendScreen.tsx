import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MetricCard from '../components/common/MetricCard';
import SpendComparisonChart from '../components/common/SpendComparisonChart';
import SpendProjectionPeriodPicker from '../components/common/SpendProjectionPeriodPicker';
import ScreenHeader from '../components/common/ScreenHeader';
import { SpendActivity, SpendProjectionPeriod } from '../lib/paymentEntries';
import { Colors } from '../theme/colors';

interface SpendScreenProps {
  compact: boolean;
  totalSpend: number;
  projectedAvailable: number;
  projectedBalance: number;
  billPaymentSpend: number;
  expenseSpend: number;
  periodStart: string;
  periodEnd: string;
  projectionPeriod: SpendProjectionPeriod;
  financialYearStartMonth: number;
  onProjectionPeriodChange: (period: SpendProjectionPeriod) => void;
  expenses: SpendActivity[];
  onAddSpend: () => void;
  onEditEntry: (entry: SpendActivity) => void;
  onDeleteEntry: (entry: SpendActivity) => void;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function SpendScreen({
  compact,
  totalSpend,
  projectedAvailable,
  projectedBalance,
  billPaymentSpend,
  expenseSpend,
  periodStart,
  periodEnd,
  projectionPeriod,
  financialYearStartMonth,
  onProjectionPeriodChange,
  expenses,
  onAddSpend,
  onEditEntry,
  onDeleteEntry,
}: SpendScreenProps) {
  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compactContainer]}>
      <ScreenHeader category="FINANCE" title="Spend" subtitle="Track bills and expenses paid from your accounts." />

      <SpendProjectionPeriodPicker
        period={projectionPeriod}
        onChange={onProjectionPeriodChange}
        financialYearStartMonth={financialYearStartMonth}
      />
      <View style={styles.metricsRow}>
        <MetricCard dense title="Available for period" value={formatCurrency(projectedAvailable)} subtitle={`Starting cash + income · to ${periodEnd}`} accentColor={projectedAvailable >= 0 ? Colors.success : Colors.danger} />
        <MetricCard dense title="Bills and expenses" value={formatCurrency(totalSpend)} subtitle={`${periodStart} to ${periodEnd}`} accentColor={Colors.danger} />
        <MetricCard dense title="Cash after spending" value={formatCurrency(projectedBalance)} subtitle="Available cash minus bills and expenses" accentColor={projectedBalance >= 0 ? Colors.textPrimary : Colors.danger} />
      </View>
      <SpendComparisonChart
        available={projectedAvailable}
        billPayments={billPaymentSpend}
        expenses={expenseSpend}
      />

      <ActivitySection
        title="Bills and expenses"
        subtitle={`${expenses.length} record${expenses.length === 1 ? '' : 's'}`}
        buttonLabel="+ Add expense"
        entries={expenses}
        onPress={onAddSpend}
        onEditEntry={onEditEntry}
        onDeleteEntry={onDeleteEntry}
        emptyText="No bills or expenses yet."
      />
    </ScrollView>
  );
}

function ActivitySection({
  title,
  subtitle,
  buttonLabel,
  entries,
  onPress,
  onEditEntry,
  onDeleteEntry,
  emptyText,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  entries: SpendActivity[];
  onPress: () => void;
  onEditEntry: (entry: SpendActivity) => void;
  onDeleteEntry: (entry: SpendActivity) => void;
  emptyText: string;
}) {
  const sortedEntries = [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (
    <View style={styles.activitySection}>
      <View style={styles.sectionHeading}>
        <View style={styles.headingText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onPress}>
          <Text style={styles.addButtonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.activityCard}>
        {sortedEntries.length === 0 ? (
          <Text style={styles.emptyText}>{emptyText}</Text>
        ) : sortedEntries.map((entry, index) => (
          <View key={entry.id} style={[styles.activityRow, index === sortedEntries.length - 1 && styles.lastActivityRow]}>
            <View style={styles.activityDetails}>
              <Text style={styles.activityTitle}>{entry.description || entry.type}</Text>
              <Text style={styles.activityMeta}>
                {`${entry.type} · ${entry.accountTitle}`}
                {entry.startDate ? ` · ${entry.startDate}` : ''}
                {entry.frequency ? ` · ${entry.frequency}` : ''}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <Text style={styles.activityAmount}>{formatCurrency(entry.amount)}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Edit ${entry.description || entry.type}`}
                style={styles.iconButton}
                onPress={() => onEditEntry(entry)}
              >
                <Text style={styles.editIcon}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Delete ${entry.description || entry.type}`}
                style={styles.iconButton}
                onPress={() => onDeleteEntry(entry)}
              >
                <Text style={styles.deleteIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 32, paddingBottom: 40 },
  compactContainer: { padding: 16, paddingBottom: 24 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  headingText: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  sectionSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  activitySection: { marginTop: 12, marginBottom: 12 },
  addButton: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  activityCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 14, overflow: 'hidden' },
  activityRow: { minHeight: 68, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  lastActivityRow: { borderBottomWidth: 0 },
  activityDetails: { flex: 1 },
  activityTitle: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },
  activityMeta: { color: Colors.textSecondary, fontSize: 11, marginTop: 4 },
  activityAmount: { color: Colors.danger, fontWeight: '700', fontSize: 14 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  editIcon: { color: Colors.primary, fontSize: 18 },
  deleteIcon: { color: Colors.danger, fontSize: 22 },
  emptyText: { color: Colors.textMuted, fontSize: 13, padding: 18 },
});
