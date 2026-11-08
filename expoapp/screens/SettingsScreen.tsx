// screens/SettingsScreen.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { MONTH_NAMES } from '../config/accountTypes';

interface SettingsScreenProps {
  compact: boolean;
  financialYearStartMonth: number;
  onFinancialYearStartMonthChange: (month: number) => void;
}

export default function SettingsScreen({
  compact,
  financialYearStartMonth,
  onFinancialYearStartMonthChange,
}: SettingsScreenProps) {
  const [currency, setCurrency] = useState('AUD ($)');

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compactContainer]}>
      <Text style={styles.sectionHeaderTitle}>Settings</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Currency</Text>
        <TextInput
          style={styles.input}
          value={currency}
          onChangeText={setCurrency}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Financial year starts in</Text>
        <View style={styles.monthPicker}>
          <TouchableOpacity
            style={styles.monthStep}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => onFinancialYearStartMonthChange((financialYearStartMonth + 11) % 12)}
          >
            <Text style={styles.monthStepText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.monthValue}>{MONTH_NAMES[financialYearStartMonth]}</Text>
          <TouchableOpacity
            style={styles.monthStep}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => onFinancialYearStartMonthChange((financialYearStartMonth + 1) % 12)}
          >
            <Text style={styles.monthStepText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helpBody}>
          Financial years run from this month through the month before it. AUD uses July–June by default.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 30 },
  compactContainer: { padding: 16, paddingBottom: 24 },
  sectionHeaderTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  monthStep: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#f1f3f5', alignItems: 'center', justifyContent: 'center' },
  monthStepText: { color: '#5d55f7', fontSize: 18, fontWeight: '700' },
  monthValue: { minWidth: 100, textAlign: 'center', color: '#333', fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, fontSize: 15, color: '#333', marginBottom: 12 },
  helpBody: { fontSize: 14, color: '#666', lineHeight: 20 },
});
