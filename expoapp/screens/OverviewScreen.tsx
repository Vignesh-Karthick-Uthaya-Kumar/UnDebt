// screens/OverviewScreen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import ScreenHeader from '../components/common/ScreenHeader';
import MetricCard from '../components/common/MetricCard';
import ProjectionChart from '../components/common/ProjectionChart';
import ProjectionPeriodPicker from '../components/common/ProjectionPeriodPicker';
import { FinancialProjection } from '../lib/financialProjection';
import { Colors } from '../theme/colors';

interface OverviewScreenProps {
  totalDebt: number;
  totalAssets: number;
  compact: boolean;
  projection: FinancialProjection;
  years: number;
  selectedYears: number | null;
  onProjectionYearsChange: (years: number | null) => void;
  selectedFinancialYear: number | null;
  onSelectFinancialYear: (startYear: number | null) => void;
  financialYearStartMonth: number;
}

export default function OverviewScreen({
  totalDebt,
  totalAssets,
  compact,
  projection,
  years,
  selectedYears,
  onProjectionYearsChange,
  selectedFinancialYear,
  onSelectFinancialYear,
  financialYearStartMonth
}: OverviewScreenProps) {
  const netWorth = totalAssets - totalDebt;

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compactContainer]}>
      <ScreenHeader 
        category="FINANCE" 
        title="Overview" 
        subtitle="See your current finances and projected balances."
      />

      <View style={styles.metricsRow}>
        <MetricCard dense title="Loan balances" value={`$${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} subtitle="Current total" accentColor={Colors.danger} />
        <MetricCard dense title="Cash and assets" value={`$${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} subtitle="Current total, including offsets" accentColor={Colors.success} />
        <MetricCard dense title="Net worth" value={`$${netWorth.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} subtitle="Assets minus loans" accentColor={Colors.primary} />
      </View>
      <ProjectionPeriodPicker
        years={years}
        defaultYears={projection.defaultYears}
        selectedYears={selectedYears}
        onChange={onProjectionYearsChange}
        selectedFinancialYear={selectedFinancialYear}
        onSelectFinancialYear={onSelectFinancialYear}
        financialYearStartMonth={financialYearStartMonth}
      />
      <ProjectionChart
        title="Projected loans and assets"
        series={projection.combinedSeries}
        years={years}
        compact={compact}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, paddingBottom: 40 },
  compactContainer: { padding: 16, paddingBottom: 24 },
  metricsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
});