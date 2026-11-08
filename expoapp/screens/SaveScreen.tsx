import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MetricCard from '../components/common/MetricCard';
import SaveComparisonChart from '../components/common/SaveComparisonChart';
import SpendProjectionPeriodPicker from '../components/common/SpendProjectionPeriodPicker';
import ScreenHeader from '../components/common/ScreenHeader';
import { SaveActivity, SpendProjectionPeriod } from '../lib/paymentEntries';
import { Colors } from '../theme/colors';

interface SaveScreenProps {
  compact: boolean;
  totalIncome: number;
  totalSaved: number;
  periodStart: string;
  periodEnd: string;
  cashAtPeriodStart: number;
  totalCashAtPeriodEnd: number;
  projectionPeriod: SpendProjectionPeriod;
  financialYearStartMonth: number;
  onProjectionPeriodChange: (period: SpendProjectionPeriod) => void;
  incomeEntries: SaveActivity[];
  savingEntries: SaveActivity[];
  onAddIncome: () => void;
  onAddSaving: () => void;
  onEditEntry: (entry: SaveActivity) => void;
  onDeleteEntry: (entry: SaveActivity) => void;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function SaveScreen({
  compact,
  totalIncome,
  totalSaved,
  periodStart,
  periodEnd,
  cashAtPeriodStart,
  totalCashAtPeriodEnd,
  projectionPeriod,
  financialYearStartMonth,
  onProjectionPeriodChange,
  incomeEntries,
  savingEntries,
  onAddIncome,
  onAddSaving,
  onEditEntry,
  onDeleteEntry,
}: SaveScreenProps) {
  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compactContainer]}>
      <ScreenHeader
        category="FINANCE"
        title="Save"
        subtitle="Track income and transfers into savings."
      />

      <SpendProjectionPeriodPicker
        period={projectionPeriod}
        onChange={onProjectionPeriodChange}
        label="Period"
        financialYearStartMonth={financialYearStartMonth}
      />
      <View style={styles.metricsRow}>
        <MetricCard
          dense
          title="Cash at period start"
          value={formatCurrency(cashAtPeriodStart)}
          subtitle={`All non-loan accounts · ${periodStart}`}
          accentColor={Colors.success}
        />
        <MetricCard dense title="Income" value={formatCurrency(totalIncome)} subtitle={`${periodStart} to ${periodEnd}`} accentColor={Colors.success} />
        <MetricCard
          dense
          title="Cash at period end"
          value={formatCurrency(totalCashAtPeriodEnd)}
          subtitle={`Available for period · Saved ${formatCurrency(totalSaved)} · ${periodEnd}`}
          accentColor={totalCashAtPeriodEnd >= 0 ? Colors.success : Colors.danger}
        />
      </View>
      <SaveComparisonChart income={totalIncome} saved={totalSaved} />

      <ActivitySection
        title="Income"
        subtitle={`${incomeEntries.length} record${incomeEntries.length === 1 ? '' : 's'}`}
        buttonLabel="+ Add income"
        entries={incomeEntries}
        onPress={onAddIncome}
        onEditEntry={onEditEntry}
        onDeleteEntry={onDeleteEntry}
        emptyText="No income records yet."
      />
      <ActivitySection
        title="Savings transfers"
        subtitle={`${savingEntries.length} record${savingEntries.length === 1 ? '' : 's'}`}
        buttonLabel="+ Add transfer"
        entries={savingEntries}
        onPress={onAddSaving}
        onEditEntry={onEditEntry}
        onDeleteEntry={onDeleteEntry}
        emptyText="No savings transfers yet."
        saving
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
  saving = false,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  entries: SaveActivity[];
  onPress: () => void;
  onEditEntry: (entry: SaveActivity) => void;
  onDeleteEntry: (entry: SaveActivity) => void;
  emptyText: string;
  saving?: boolean;
}) {
  const sortedEntries = [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (
    <View style={styles.activitySection}>
      <View style={styles.sectionHeading}>
        <View>
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
              <Text style={styles.activityTitle}>{entry.description || (saving ? 'Saving' : 'Income')}</Text>
              <Text style={styles.activityMeta}>
                {saving ? `${entry.accountTitle} → ${entry.linkedAccountTitle || 'Linked account'}` : entry.accountTitle}
                {entry.startDate ? ` · ${entry.startDate}` : ''}
                {entry.frequency ? ` · ${entry.frequency}` : ''}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <Text style={[styles.activityAmount, saving && styles.savingAmount]}>
                {formatCurrency(entry.amount)}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Edit ${entry.description || (saving ? 'saving' : 'income')}`}
                style={styles.iconButton}
                onPress={() => onEditEntry(entry)}
              >
                <Text style={styles.editIcon}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Delete ${entry.description || (saving ? 'saving' : 'income')}`}
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
  activityAmount: { color: Colors.success, fontWeight: '700', fontSize: 14 },
  savingAmount: { color: Colors.primary },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  editIcon: { color: Colors.primary, fontSize: 18 },
  deleteIcon: { color: Colors.danger, fontSize: 22 },
  emptyText: { color: Colors.textMuted, fontSize: 13, padding: 18 },
});
