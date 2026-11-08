// screens/TransactionsScreen.tsx
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenHeader from '../components/common/ScreenHeader';
import AccountTypeMark from '../components/common/AccountTypeMark';
import MetricCard from '../components/common/MetricCard';
import ProjectionChart from '../components/common/ProjectionChart';
import ProjectionPeriodPicker from '../components/common/ProjectionPeriodPicker';
import { Colors } from '../theme/colors';
import { formatAccountInterestRate } from '../lib/accountDisplay';
import { FinancialProjection, ProjectionSeries } from '../lib/financialProjection';

interface TransactionsScreenProps {
  transactions: any[];
  currentBalances: Record<string, number>;
  compact: boolean;
  projection: FinancialProjection;
  years: number;
  selectedYears: number | null;
  onProjectionYearsChange: (years: number | null) => void;
  selectedFinancialYear: number | null;
  onSelectFinancialYear: (startYear: number | null) => void;
  financialYearStartMonth: number;
  selectedSeriesIds: string[] | null;
  onToggleSeries: (id: string) => void;
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function TransactionsScreen({
  transactions,
  currentBalances,
  compact,
  projection,
  years,
  selectedYears,
  onProjectionYearsChange,
  selectedFinancialYear,
  onSelectFinancialYear,
  financialYearStartMonth,
  selectedSeriesIds,
  onToggleSeries,
  onAdd,
  onEdit,
  onDelete
}: TransactionsScreenProps) {
  const totalAssets = transactions.reduce(
    (sum, item) => sum + (currentBalances[item.account_id] ?? (Number(item.balance) || 0)),
    0
  );
  const projectedBalance = projection.transactionBalancesByYear[years];
  const projectedGrowth = projectedBalance - totalAssets;
  const startingOffsetBalance = projection.totalOffsetBalanceByYear[0] || 0;
  const endingOffsetBalance = projection.totalOffsetBalanceByYear[years] || 0;
  const startingInterestBalance = projection.remainingTransactionBalanceByYear[0] || 0;
  const endingInterestBalance = projection.remainingTransactionBalanceByYear[years] || 0;
  const selectedIds = selectedSeriesIds === null
    ? null
    : selectedSeriesIds.filter(id => id !== 'total-assets');
  const displayedAccounts = projection.transactionSeries.filter(series =>
    selectedIds === null || selectedIds.includes(series.id));
  const totalSeries: ProjectionSeries = {
    id: 'total-assets',
    label: 'Selected account total',
    color: Colors.success,
    values: Array.from({ length: 31 }, (_, year) =>
      displayedAccounts.reduce((sum, series) => sum + (series.values[year] || 0), 0)),
  };
  const chartSeries = [totalSeries, ...projection.transactionSeries];

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compactContainer]}>
      <ScreenHeader 
        category="ACCOUNTS" 
        title="Accounts"
        subtitle="Track cash, savings and offset accounts."
        buttonLabel="+ Add account"
        onPressButton={onAdd}
      />

      <ProjectionPeriodPicker
        years={years}
        defaultYears={projection.defaultYears}
        selectedYears={selectedYears}
        onChange={onProjectionYearsChange}
        selectedFinancialYear={selectedFinancialYear}
        onSelectFinancialYear={onSelectFinancialYear}
        financialYearStartMonth={financialYearStartMonth}
      />
      <View style={styles.metricsRow}>
        <MetricCard
          dense
          title="Total account balances"
          value={formatCurrency(totalAssets)}
          subtitle={`As of today · ${transactions.length} accounts`}
          accentColor={Colors.success}
        />
        <MetricCard
          dense
          title="Interest-earning balance · start"
          value={formatCurrency(startingInterestBalance)}
          subtitle={`Offset balance: ${formatCurrency(startingOffsetBalance)}`}
        />
        <MetricCard
          dense
          title="Interest-earning balance · end"
          value={formatCurrency(endingInterestBalance)}
          subtitle={`Offset balance: ${formatCurrency(endingOffsetBalance)}`}
        />
        <MetricCard
          dense
          title="Projected account balance"
          value={formatCurrency(projectedBalance)}
          subtitle={`Growth: ${formatCurrency(projectedGrowth)} · ${years} years`}
          accentColor={projectedGrowth >= 0 ? Colors.success : Colors.danger}
        />
      </View>
      <ProjectionChart
        title="Account balance forecast"
        series={chartSeries}
        years={years}
        compact={compact}
        selectedSeriesIds={selectedSeriesIds}
        onToggleSeries={onToggleSeries}
      />

      <ScrollView horizontal={compact} showsHorizontalScrollIndicator={compact}>
        <View style={[styles.tableCard, compact && styles.compactTableCard]}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeading, { flex: 2.4 }]}>ACCOUNT</Text>
            <Text style={[styles.tableHeading, { flex: 1.2 }]}>BALANCE</Text>
            <Text style={[styles.tableHeading, { flex: 1 }]}>INTEREST</Text>
            <Text style={[styles.tableHeading, { flex: 0.8, textAlign: 'right' }]}>ACTIONS</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={{ color: Colors.textSecondary }}>No accounts yet. Add an account to get started.</Text>
            </View>
          ) : (
            transactions.map((item) => (
              <View key={item.account_id} style={styles.tableRow}>
                <View style={styles.accountCell}>
                  <AccountTypeMark accountType={item.account_type} />
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountTitle}>{item.title}</Text>
                    <Text style={styles.accountSubTitle}>{item.account_type}</Text>
                    {item.offset_config && (
                      <View style={styles.offsetBadge}>
                        <Text style={styles.offsetIcon}>↔</Text>
                        <Text style={styles.offsetText}>Offset · {item.offset_config.offset_type || item.offset_config.offsetType || 'Full Offset'}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.balanceValue}>${(currentBalances[item.account_id] ?? (Number(item.balance) || 0)).toFixed(2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.interestValue}>{formatAccountInterestRate(item)}</Text>
                </View>
                <View style={styles.actionsCell}>
                  <TouchableOpacity accessibilityLabel={`Edit ${item.title}`} style={styles.iconButton} onPress={() => onEdit(item)}>
                    <Text style={styles.editIcon}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityLabel={`Delete ${item.title}`} style={styles.iconButton} onPress={() => onDelete(item.account_id)}>
                    <Text style={styles.deleteIcon}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, paddingBottom: 40 },
  compactContainer: { padding: 16, paddingBottom: 24 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  tableCard: { backgroundColor: Colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  compactTableCard: { width: 680 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#fafbfc', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center' },
  accountCell: { flex: 2.4, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  accountDetails: { flexShrink: 1 },
  tableHeading: { fontSize: 11, fontWeight: 'bold', color: Colors.textSecondary, letterSpacing: 0.5 },
  accountTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },
  accountSubTitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  balanceValue: { fontSize: 14, fontWeight: '600', color: Colors.success },
  interestValue: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  offsetBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 5, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#eaf7ee', gap: 4 },
  offsetIcon: { fontSize: 12, fontWeight: '700', color: Colors.success },
  offsetText: { fontSize: 10, fontWeight: '600', color: Colors.success },
  actionsCell: { flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  editIcon: { color: Colors.primary, fontSize: 18 },
  deleteIcon: { color: Colors.danger, fontSize: 22 },
  emptyRow: { padding: 40, alignItems: 'center' },
});