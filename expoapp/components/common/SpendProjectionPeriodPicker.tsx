import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  FINANCIAL_YEAR_START_MONTH,
  formatFinancialYear,
  getFinancialYearStartYear,
  getTodayDate,
} from '../../config/accountTypes';
import { SpendProjectionPeriod } from '../../lib/paymentEntries';
import { Colors } from '../../theme/colors';

interface SpendProjectionPeriodPickerProps {
  period: SpendProjectionPeriod;
  onChange: (period: SpendProjectionPeriod) => void;
  label?: string;
  financialYearStartMonth?: number;
}

export default function SpendProjectionPeriodPicker({
  period,
  onChange,
  label = 'Period',
  financialYearStartMonth = FINANCIAL_YEAR_START_MONTH,
}: SpendProjectionPeriodPickerProps) {
  const currentFyStart = getFinancialYearStartYear(getTodayDate(), financialYearStartMonth);
  const isFinancialYear = period.type === 'financial-year';
  const periodLabel = isFinancialYear
    ? formatFinancialYear(period.startYear)
    : `${period.months} ${period.months === 1 ? 'month' : 'months'}`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.modeButtons}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: !isFinancialYear }}
          style={[styles.modeButton, !isFinancialYear && styles.selectedButton]}
          onPress={() => onChange({ type: 'months', months: 1 })}
        >
          <Text style={[styles.buttonText, !isFinancialYear && styles.selectedText]}>Months</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: isFinancialYear }}
          style={[styles.modeButton, isFinancialYear && styles.selectedButton]}
          onPress={() => onChange({ type: 'financial-year', startYear: currentFyStart })}
        >
          <Text style={[styles.buttonText, isFinancialYear && styles.selectedText]}>FY</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.periodControls}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isFinancialYear ? 'Previous financial year' : 'Decrease projection by one month'}
          style={styles.stepButton}
          disabled={isFinancialYear ? period.startYear <= currentFyStart - 10 : period.months <= 1}
          onPress={() => onChange(isFinancialYear
            ? { type: 'financial-year', startYear: period.startYear - 1 }
            : { type: 'months', months: period.months - 1 })}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.currentPeriod}>{periodLabel}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isFinancialYear ? 'Next financial year' : 'Increase projection by one month'}
          style={styles.stepButton}
          disabled={isFinancialYear ? period.startYear >= currentFyStart + 10 : period.months >= 12}
          onPress={() => onChange(isFinancialYear
            ? { type: 'financial-year', startYear: period.startYear + 1 }
            : { type: 'months', months: period.months + 1 })}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  modeButtons: { flexDirection: 'row', gap: 6 },
  modeButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.badgeBg },
  selectedButton: { backgroundColor: Colors.primaryLight },
  buttonText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  selectedText: { color: Colors.primary },
  periodControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: Colors.badgeBg },
  stepButtonText: { fontSize: 18, fontWeight: '600', color: Colors.primary },
  currentPeriod: { minWidth: 90, textAlign: 'center', color: Colors.textPrimary, fontWeight: '700', fontSize: 13 },
});
