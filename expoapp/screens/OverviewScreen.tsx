// screens/OverviewScreen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import ScreenHeader from '../components/common/ScreenHeader';
import MetricCard from '../components/common/MetricCard';
import { Colors } from '../theme/colors';

interface OverviewScreenProps {
  totalDebt: number;
  totalAssets: number;
}

export default function OverviewScreen({ totalDebt, totalAssets }: OverviewScreenProps) {
  const netWorth = totalAssets - totalDebt;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader 
        category="FINANCE" 
        title="Overview" 
        subtitle="Yearly financial position and long-term debt projections." 
      />

      <View style={styles.metricsRow}>
        <MetricCard title="Total Loan Debt" value={`$${totalDebt.toFixed(2)}`} subtitle="Active liabilities" accentColor={Colors.danger} />
        <MetricCard title="Savings & Assets" value={`$${totalAssets.toFixed(2)}`} subtitle="Liquid accounts & offset" accentColor={Colors.success} />
        <MetricCard title="Net Position" value={`$${netWorth.toFixed(2)}`} subtitle="Assets minus total liabilities" accentColor={Colors.primary} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, paddingBottom: 40 },
  metricsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
});