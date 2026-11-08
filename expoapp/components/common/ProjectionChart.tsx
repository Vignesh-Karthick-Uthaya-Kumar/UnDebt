import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ProjectionSeries } from '../../lib/financialProjection';
import { Colors } from '../../theme/colors';

interface ProjectionChartProps {
  title: string;
  series: ProjectionSeries[];
  years: number;
  compact: boolean;
  selectedSeriesIds?: string[] | null;
  onToggleSeries?: (id: string) => void;
}

const CHART_HEIGHT = 250;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 30;
const PLOT_LEFT = 68;
const PLOT_RIGHT = 16;

export default function ProjectionChart({
  title,
  series,
  years,
  compact,
  selectedSeriesIds,
  onToggleSeries
}: ProjectionChartProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const availableWidth = compact ? viewportWidth - 32 : viewportWidth - 340;
  const chartWidth = Math.max(compact ? 620 : 500, availableWidth);
  const plotWidth = chartWidth - PLOT_LEFT - PLOT_RIGHT;
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const visibleSeries = series.filter(item => !selectedSeriesIds || selectedSeriesIds.includes(item.id));
  const maxValue = Math.max(1, ...visibleSeries.flatMap(item => item.values.slice(0, years + 1)));
  const roundedMax = Math.pow(10, Math.floor(Math.log10(maxValue))) * Math.ceil(maxValue / Math.pow(10, Math.floor(Math.log10(maxValue))));
  const yMax = Math.max(roundedMax, 1);
  const yFor = (value: number) => PLOT_TOP + (1 - value / yMax) * plotHeight;
  const xFor = (index: number) => PLOT_LEFT + (index / Math.max(1, years)) * plotWidth;
  const yTicks = [0, 0.5, 1];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {onToggleSeries && (
        <View style={styles.legend}>
          {series.map(item => {
            const selected = !selectedSeriesIds || selectedSeriesIds.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.legendItem, !selected && styles.legendItemDisabled]}
                onPress={() => onToggleSeries(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${selected ? 'Hide' : 'Show'} ${item.label}`}
              >
                <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={chartWidth > availableWidth}>
        <View style={{ width: chartWidth, height: CHART_HEIGHT }}>
          {yTicks.map(tick => {
            const y = PLOT_TOP + tick * plotHeight;
            const value = yMax * (1 - tick);
            return (
              <React.Fragment key={tick}>
                <View style={[styles.gridLine, { left: PLOT_LEFT, top: y, width: plotWidth }]} />
                <Text style={[styles.axisLabel, { left: 0, top: y - 8 }]}>${Math.round(value).toLocaleString()}</Text>
              </React.Fragment>
            );
          })}
          {Array.from({ length: years + 1 }, (_, year) => (
            <Text key={year} style={[styles.xLabel, { left: xFor(year) - 12, top: CHART_HEIGHT - PLOT_BOTTOM + 8 }]}>
              {year}y
            </Text>
          ))}
          {visibleSeries.map(item => {
            const points = item.values.slice(0, years + 1);
            return points.slice(1).map((value, index) => {
              const x1 = xFor(index);
              const y1 = yFor(points[index]);
              const x2 = xFor(index + 1);
              const y2 = yFor(value);
              const length = Math.hypot(x2 - x1, y2 - y1);
              const rotation = `${Math.atan2(y2 - y1, x2 - x1)}rad`;
              return (
                <View
                  key={`${item.id}-${index}`}
                  style={[
                    styles.line,
                    {
                      backgroundColor: item.color,
                      width: length,
                      left: (x1 + x2 - length) / 2,
                      top: (y1 + y2) / 2,
                      transform: [{ rotate: rotation }],
                    },
                  ]}
                />
              );
            });
          })}
          {visibleSeries.length === 0 && (
            <Text style={[styles.emptyChart, { top: PLOT_TOP + plotHeight / 2 - 8 }]}>Choose a series to show.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, marginTop: 12, overflow: 'hidden' },
  title: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border, borderRadius: 16 },
  legendItemDisabled: { opacity: 0.4 },
  legendSwatch: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, color: Colors.textSecondary },
  gridLine: { position: 'absolute', height: 1, backgroundColor: Colors.border },
  axisLabel: { position: 'absolute', width: PLOT_LEFT - 8, textAlign: 'right', fontSize: 10, color: Colors.textMuted },
  xLabel: { position: 'absolute', width: 28, textAlign: 'center', fontSize: 10, color: Colors.textMuted },
  line: { position: 'absolute', height: 2, borderRadius: 1 },
  emptyChart: { position: 'absolute', left: PLOT_LEFT, color: Colors.textMuted, fontSize: 12 },
});
