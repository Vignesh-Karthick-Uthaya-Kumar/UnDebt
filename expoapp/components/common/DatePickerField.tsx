import React, { useState } from 'react';
import {
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { getTodayDate } from '../../config/accountTypes';
import { Colors } from '../../theme/colors';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

type PickerView = 'calendar' | 'months' | 'years';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  return date.getUTCFullYear() === Number(yearText)
    && date.getUTCMonth() === Number(monthText) - 1
    && date.getUTCDate() === Number(dayText);
}

function dateParts(value: string): [number, number, number] {
  if (isValidDate(value)) return value.split('-').map(Number) as [number, number, number];
  return getTodayDate().split('-').map(Number) as [number, number, number];
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DatePickerField({
  label,
  value,
  onChangeText,
  placeholder = 'YYYY-MM-DD',
  containerStyle,
}: DatePickerFieldProps) {
  const [visible, setVisible] = useState(false);
  const [pickerView, setPickerView] = useState<PickerView>('calendar');
  const [displayYear, setDisplayYear] = useState(() => dateParts(value)[0]);
  const [displayMonth, setDisplayMonth] = useState(() => dateParts(value)[1] - 1);
  const [yearPage, setYearPage] = useState(() => Math.floor(dateParts(value)[0] / 12) * 12);
  const [selectedDate, setSelectedDate] = useState(value);

  function openPicker() {
    const [year, month] = dateParts(value);
    setDisplayYear(year);
    setDisplayMonth(month - 1);
    setYearPage(Math.floor(year / 12) * 12);
    setSelectedDate(value);
    setPickerView('calendar');
    setVisible(true);
  }

  function selectDay(day: number) {
    onChangeText(toDateString(displayYear, displayMonth, day));
    setVisible(false);
  }

  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(displayYear, displayMonth + delta, 1));
    setDisplayYear(next.getUTCFullYear());
    setDisplayMonth(next.getUTCMonth());
  }

  const [selectedYear, selectedMonth, selectedDay] = dateParts(selectedDate);
  const firstWeekday = new Date(Date.UTC(displayYear, displayMonth, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(displayYear, displayMonth + 1, 0)).getUTCDate();
  const yearOptions = Array.from({ length: 12 }, (_, index) => yearPage + index);

  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          accessibilityLabel={label}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Choose ${label.toLowerCase()} from calendar`}
          style={styles.calendarButton}
          onPress={openPicker}
        >
          <Text style={styles.calendarButtonText}>▦</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
              {pickerView === 'calendar' ? (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    style={styles.arrowButton}
                    onPress={() => changeMonth(-1)}
                  >
                    <Text style={styles.arrowText}>‹</Text>
                  </TouchableOpacity>
                  <View style={styles.dateHeader}>
                    <TouchableOpacity onPress={() => setPickerView('months')}>
                      <Text style={styles.headerChoice}>{MONTHS[displayMonth]}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setYearPage(Math.floor(displayYear / 12) * 12);
                        setPickerView('years');
                      }}
                    >
                      <Text style={styles.headerChoice}>{displayYear}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    style={styles.arrowButton}
                    onPress={() => changeMonth(1)}
                  >
                    <Text style={styles.arrowText}>›</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={pickerView === 'years' ? 'Previous years' : 'Back to calendar'}
                    style={styles.arrowButton}
                    onPress={() => pickerView === 'years' ? setYearPage(yearPage - 12) : setPickerView('calendar')}
                  >
                    <Text style={styles.arrowText}>{pickerView === 'years' ? '‹' : '×'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>{pickerView === 'months' ? 'Select month' : `${yearPage}–${yearPage + 11}`}</Text>
                  {pickerView === 'years' ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Next years"
                      style={styles.arrowButton}
                      onPress={() => setYearPage(yearPage + 12)}
                    >
                      <Text style={styles.arrowText}>›</Text>
                    </TouchableOpacity>
                  ) : <View style={styles.arrowButton} />}
                </>
              )}
            </View>

            {pickerView === 'calendar' ? (
              <View style={styles.calendarGrid}>
                {WEEKDAYS.map(day => (
                  <View key={day} style={styles.dayCell}>
                    <Text style={styles.weekdayText}>{day}</Text>
                  </View>
                ))}
                {Array.from({ length: firstWeekday }, (_, index) => (
                  <View key={`empty-${index}`} style={styles.dayCell} />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1;
                  const isSelected = displayYear === selectedYear
                    && displayMonth === selectedMonth - 1
                    && day === selectedDay;
                  return (
                    <TouchableOpacity
                      key={day}
                      accessibilityRole="button"
                      accessibilityLabel={`${MONTHS[displayMonth]} ${day}, ${displayYear}`}
                      style={[styles.dayCell, styles.dayButton, isSelected && styles.selectedDay]}
                      onPress={() => selectDay(day)}
                    >
                      <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : pickerView === 'months' ? (
              <View style={styles.optionsGrid}>
                {MONTHS.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={[styles.monthOption, displayMonth === index && styles.selectedOption]}
                    onPress={() => {
                      setDisplayMonth(index);
                      setPickerView('calendar');
                    }}
                  >
                    <Text style={[styles.optionText, displayMonth === index && styles.selectedOptionText]}>{month.slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.optionsGrid}>
                {yearOptions.map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.yearOption, displayYear === year && styles.selectedOption]}
                    onPress={() => {
                      setDisplayYear(year);
                      setPickerView('months');
                    }}
                  >
                    <Text style={[styles.optionText, displayYear === year && styles.selectedOptionText]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={() => setVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minWidth: 0 },
  label: { fontSize: 12, fontWeight: '600', color: '#495057', marginBottom: 6, marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8f9fa', color: '#1a1d20' },
  calendarButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.border },
  calendarButtonText: { color: Colors.primary, fontSize: 22, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  calendar: { width: '100%', maxWidth: 360, borderRadius: 14, backgroundColor: '#fff', padding: 18, elevation: 5 },
  calendarHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerChoice: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', paddingHorizontal: 3 },
  headerTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  arrowButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: Colors.primary, fontSize: 28, lineHeight: 32, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', height: 38, alignItems: 'center', justifyContent: 'center' },
  weekdayText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  dayButton: { borderRadius: 19 },
  dayText: { color: Colors.textPrimary, fontSize: 13 },
  selectedDay: { backgroundColor: Colors.primary },
  selectedDayText: { color: '#fff', fontWeight: '700' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 8 },
  monthOption: { width: '33.3333%', height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  yearOption: { width: '25%', height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  selectedOption: { backgroundColor: Colors.primary },
  optionText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  selectedOptionText: { color: '#fff' },
  cancelButton: { alignSelf: 'flex-end', marginTop: 12, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: Colors.badgeBg },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
});
