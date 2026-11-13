import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const PAYMENT_FREQUENCIES = [
  'Weekly',
  'Fortnightly',
  'Monthly',
  'Quarterly',
  'Bi Annual',
  'Annual',
] as const;

interface FrequencyDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  frequencies?: readonly string[];
}

export default function FrequencyDropdown({
  label,
  value,
  onChange,
  optional = false,
  frequencies = PAYMENT_FREQUENCIES,
}: FrequencyDropdownProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || (optional ? 'No repeat' : 'Choose frequency')}`}
        accessibilityState={{ expanded }}
      >
        <Text style={styles.dropdownButtonText}>{value || (optional ? 'No repeat' : 'Choose frequency')}</Text>
        <Text style={styles.dropdownButtonText}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.dropdownOptions}>
          {optional && (
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={() => {
                onChange('');
                setExpanded(false);
              }}
            >
              <Text style={styles.dropdownOptionText}>No repeat</Text>
            </TouchableOpacity>
          )}
          {frequencies.map(frequency => (
            <TouchableOpacity
              key={frequency}
              style={styles.dropdownOption}
              onPress={() => {
                onChange(frequency);
                setExpanded(false);
              }}
            >
              <Text style={styles.dropdownOptionText}>{frequency}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: '#495057', marginBottom: 6, marginTop: 12 },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8f9fa' },
  dropdownButtonText: { fontSize: 14, color: '#495057' },
  dropdownOptions: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  dropdownOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  dropdownOptionText: { fontSize: 14, color: '#1a1d20' },
});
