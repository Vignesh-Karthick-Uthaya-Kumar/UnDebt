import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  accentColor?: string;
  dense?: boolean;
  secondaryMetric?: {
    label: string;
    value: string;
    accentColor?: string;
  };
}

export default function MetricCard({
  title,
  value,
  subtitle,
  accentColor = Colors.textPrimary,
  dense = false,
  secondaryMetric,
}: MetricCardProps) {
  return (
    <View style={[styles.card, dense && styles.denseCard]}>
      <Text style={styles.metricLabel}>{title}</Text>
      <Text style={[styles.metricValue, dense && styles.denseMetricValue, { color: accentColor }]}>{value}</Text>
      {secondaryMetric && (
        <View style={styles.secondaryMetric}>
          <Text style={styles.metricLabel}>{secondaryMetric.label}</Text>
          <Text style={[
            styles.metricValue,
            dense && styles.denseMetricValue,
            { color: secondaryMetric.accentColor || accentColor },
          ]}>
            {secondaryMetric.value}
          </Text>
        </View>
      )}
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
  denseCard: { minWidth: 150, padding: 14 },
  denseMetricValue: { fontSize: 20 },
  secondaryMetric: { marginTop: 4 },
});