import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  FINANCIAL_YEAR_START_MONTH,
  formatFinancialYear,
  getFinancialYearStartYear,
  getTodayDate,
} from '../../config/accountTypes';
import { Colors } from '../../theme/colors';

interface ProjectionPeriodPickerProps {
  years: number;
  defaultYears: number;
  selectedYears: number | null;
  onChange: (years: number | null) => void;
  selectedFinancialYear: number | null;
  onSelectFinancialYear: (startYear: number | null) => void;
  financialYearStartMonth?: number;
}

export default function ProjectionPeriodPicker({
  years,
  defaultYears,
  selectedYears,
  onChange,
  selectedFinancialYear,
  onSelectFinancialYear,
  financialYearStartMonth = FINANCIAL_YEAR_START_MONTH,
}: ProjectionPeriodPickerProps) {
  const [inputValue, setInputValue] = useState(String(years));
  const [sliderWidth, setSliderWidth] = useState(0);
  const trackWidth = useRef(0);
  const startX = useRef(0);
  const currentValue = useRef(years);
  const maxYears = 30;
  const currentFinancialYear = getFinancialYearStartYear(getTodayDate(), financialYearStartMonth);
  const financialYearOptions = [
    currentFinancialYear - 1,
    currentFinancialYear,
    currentFinancialYear + 1,
  ];

  useEffect(() => {
    setInputValue(String(years));
    currentValue.current = years;
  }, [years]);

  function setPeriod(value: number) {
    const next = Math.min(maxYears, Math.max(1, Math.round(value)));
    currentValue.current = next;
    setInputValue(String(next));
    onChange(next);
  }

  function updateFromPosition(position: number) {
    if (trackWidth.current <= 18) return;
    const progress = (position - 9) / (trackWidth.current - 18);
    setPeriod(1 + (progress * (maxYears - 1)));
  }

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: event => {
      startX.current = event.nativeEvent.locationX;
      updateFromPosition(startX.current);
    },
    onPanResponderMove: (_, gesture) => {
      updateFromPosition(startX.current + gesture.dx);
    },
  }), [onChange]);
  const progress = (years - 1) / (maxYears - 1);

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Text style={styles.label}>Period</Text>
        {selectedFinancialYear === null ? (
          <>
            <View
              style={styles.sliderTouchArea}
              onLayout={event => {
                const width = event.nativeEvent.layout.width;
                trackWidth.current = width;
                setSliderWidth(width);
              }}
              {...panResponder.panHandlers}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Projection period in years"
              accessibilityValue={{ min: 1, max: maxYears, now: years }}
            >
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
                <View style={[styles.thumb, { left: sliderWidth > 18 ? 9 + progress * (sliderWidth - 18) : 9 }]} />
              </View>
            </View>
            <TextInput
              accessibilityLabel="Projection period in years"
              style={styles.input}
              value={inputValue}
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={value => {
                if (!/^\d{0,2}$/.test(value)) return;
                if (value && Number(value) > maxYears) return;
                setInputValue(value);
                const parsed = Number(value);
                if (parsed >= 1 && parsed <= maxYears) {
                  currentValue.current = parsed;
                  onChange(parsed);
                }
              }}
              onBlur={() => setPeriod(Number(inputValue) || currentValue.current)}
              onSubmitEditing={() => setPeriod(Number(inputValue) || currentValue.current)}
            />
            <Text style={styles.yearLabel}>yr</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Use automatic projection of ${defaultYears} years`}
              style={[styles.button, selectedYears === null && styles.selectedButton]}
              onPress={() => onChange(null)}
            >
              <Text style={[styles.buttonText, selectedYears === null && styles.selectedButtonText]}>
                Auto {defaultYears}y
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: false }}
              style={styles.modeButton}
              onPress={() => onSelectFinancialYear(currentFinancialYear)}
            >
              <Text style={styles.buttonText}>FY</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.modeButton}
              onPress={() => onSelectFinancialYear(null)}
            >
              <Text style={styles.buttonText}>Years</Text>
            </TouchableOpacity>
            <View style={styles.fyOptions}>
              {financialYearOptions.map(year => (
                <TouchableOpacity
                  key={year}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedFinancialYear === year }}
                  style={[styles.fyButton, selectedFinancialYear === year && styles.selectedButton]}
                  onPress={() => onSelectFinancialYear(year)}
                >
                  <Text style={[styles.fyButtonText, selectedFinancialYear === year && styles.selectedButtonText]}>
                    {formatFinancialYear(year).replace('FY ', '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.border, borderRadius: 10 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  button: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7, backgroundColor: Colors.badgeBg },
  modeButton: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, backgroundColor: Colors.badgeBg },
  fyOptions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 5 },
  fyButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7, backgroundColor: Colors.badgeBg },
  fyButtonText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  selectedButton: { backgroundColor: Colors.primaryLight },
  buttonText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  selectedButtonText: { color: Colors.primary },
  sliderTouchArea: { flex: 1, minWidth: 40, height: 26, justifyContent: 'center' },
  track: { height: 5, borderRadius: 3, backgroundColor: Colors.badgeBg, justifyContent: 'center' },
  trackFill: { height: 5, borderRadius: 3, backgroundColor: Colors.primary },
  thumb: { position: 'absolute', width: 18, height: 18, marginLeft: -9, borderRadius: 9, backgroundColor: '#fff', borderWidth: 2, borderColor: Colors.primary },
  input: { width: 42, height: 28, paddingHorizontal: 4, borderWidth: 1, borderColor: Colors.border, borderRadius: 7, backgroundColor: '#fff', color: Colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  yearLabel: { color: Colors.textSecondary, fontSize: 11, marginLeft: -5 },
});
