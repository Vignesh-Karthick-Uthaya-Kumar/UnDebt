import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  accentColor?: string;
}

export default function MetricCard({ title, value, subtitle, accentColor = Colors.textPrimary }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.metricLabel}>{title}</Text>
      <Text style={[styles.metricValue, { color: accentColor }]}>{value}</Text>
      <Text style={styles.subText}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 220,
  },
  metricLabel: { fontSize: 13, color: '#6c757d', fontWeight: '500' },
  metricValue: { fontSize: 26, fontWeight: 'bold', marginVertical: 4 },
  subText: { fontSize: 12, color: '#adb5bd' },
});