import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';

interface LoanProjectionSummaryProps {
  years: number;
  compact: boolean;
  loanCount: number;
  outstanding: number;
  scheduledMonthlyRepayment: number;
  additionalMonthlyRepayment: number;
  scheduledInterest: number;
  actualInterest: number;
  scheduledBalance: number;
  actualBalance: number;
  interestSaved: number;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function LoanProjectionSummary({
  years,
  compact,
  loanCount,
  outstanding,
  scheduledMonthlyRepayment,
  additionalMonthlyRepayment,
  scheduledInterest,
  actualInterest,
  scheduledBalance,
  actualBalance,
  interestSaved,
}: LoanProjectionSummaryProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const columns = containerWidth < 440 ? 1 : compact || containerWidth < 780 ? 2 : 4;
  const tileWidth = containerWidth
    ? (containerWidth - (columns - 1) * 8) / columns
    : columns === 4 ? 170 : columns === 2 ? 150 : 280;

  return (
    <View
      style={styles.container}
      onLayout={({ nativeEvent }) => {
        const width = nativeEvent.layout.width;
        setContainerWidth(current => current === width ? current : width);
      }}
      accessibilityLabel={`Loan forecast for ${years} years`}
    >
      <View style={styles.tiles}>
        <SummaryTile
          width={tileWidth}
          title="Loan balances today"
          value={formatCurrency(outstanding)}
          subtitle={`${loanCount} active loans`}
        />
        <ProjectionTile
          width={tileWidth}
          title="Scheduled repayments"
          monthlyRepayment={scheduledMonthlyRepayment}
          interest={scheduledInterest}
          balance={scheduledBalance}
          years={years}
        />
        <ProjectionTile
          width={tileWidth}
          title="With extra payments"
          monthlyRepayment={scheduledMonthlyRepayment + additionalMonthlyRepayment}
          interest={actualInterest}
          balance={actualBalance}
          years={years}
          compareInterest={scheduledInterest}
          note={`Includes ${formatCurrency(additionalMonthlyRepayment)}/mo extra`}
          accent
        />
        <SummaryTile
          width={tileWidth}
          title="Estimated interest saved"
          value={formatCurrency(interestSaved)}
          subtitle={`Over ${years} years`}
          accent
        />
      </View>
    </View>
  );
}

function SummaryTile({
  width,
  title,
  value,
  subtitle,
  accent = false,
}: {
  width: number;
  title: string;
  value: string;
  subtitle: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.tile, { width }, accent && styles.accentTile]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.mainValue, accent && styles.accentValue]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function ProjectionTile({
  width,
  title,
  monthlyRepayment,
  interest,
  balance,
  years,
  compareInterest,
  note,
  accent = false,
}: {
  width: number;
  title: string;
  monthlyRepayment: number;
  interest: number;
  balance: number;
  years: number;
  compareInterest?: number;
  note?: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.tile, styles.projectionTile, { width }, accent && styles.accentTile]}>
      <Text style={[styles.title, accent && styles.accentTitle]}>{title}</Text>
      <Text style={styles.detailLabel}>Balance in {years} years</Text>
      <Text style={[styles.mainValue, styles.balanceValue]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(balance)}
      </Text>
      <View style={styles.details}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Monthly payment</Text>
          <Text style={styles.detailValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(monthlyRepayment)}/mo
          </Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Interest paid</Text>
          <Text
            style={[
              styles.detailValue,
              compareInterest !== undefined && interest < compareInterest && styles.savingsDetailValue,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(interest)}
          </Text>
        </View>
      </View>
      {note && <Text style={styles.note} numberOfLines={1}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 8, width: '100%' },
  tile: { minHeight: 132, padding: 14, justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef' },
  projectionTile: { justifyContent: 'flex-start' },
  accentTile: { backgroundColor: '#f8fcfa' },
  title: { color: '#6c757d', fontSize: 13, fontWeight: '500' },
  accentTitle: { color: Colors.success },
  mainValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: 'bold', marginVertical: 5, flexShrink: 1 },
  accentValue: { color: Colors.success },
  subtitle: { color: '#adb5bd', fontSize: 12 },
  detailLabel: { color: '#adb5bd', fontSize: 9, lineHeight: 12 },
  balanceValue: { marginTop: 1, marginBottom: 5 },
  details: { flexDirection: 'row', gap: 8, marginTop: 'auto' },
  detail: { flex: 1, minWidth: 0 },
  detailValue: { color: Colors.textPrimary, fontSize: 10, lineHeight: 13, fontWeight: '600' },
  savingsDetailValue: { color: Colors.success },
  note: { color: Colors.success, fontSize: 8, lineHeight: 10, marginTop: 5 },
});
