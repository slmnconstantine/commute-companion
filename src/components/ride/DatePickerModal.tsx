import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DatePickerModal({
  visible, onClose, onSelect, selectedDate, theme,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate: string;
  theme: any;
}) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full rows of 7
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <Pressable style={[pickerStyles.card, { backgroundColor: theme.colors.surface }]} onPress={() => { }}>
          {/* Header */}
          <View style={pickerStyles.calHeader}>
            <Pressable onPress={prevMonth} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
            </Pressable>
            <Text style={[pickerStyles.calTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Day-of-week headers */}
          <View style={pickerStyles.calRow}>
            {DAY_LABELS.map((d) => (
              <View key={d} style={pickerStyles.calCell}>
                <Text style={[pickerStyles.calDayLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={pickerStyles.calRow}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (day === null) return <View key={`empty-${col}`} style={pickerStyles.calCell} />;
                const dateObj = new Date(year, month, day);
                const isPast = dateObj < today;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = dateStr === selectedDate;
                const isToday = dateObj.getTime() === today.getTime();
                return (
                  <Pressable
                    key={`day-${col}`}
                    style={pickerStyles.calCell}
                    disabled={isPast}
                    onPress={() => { onSelect(dateStr); onClose(); }}
                  >
                    <View
                      style={[
                        pickerStyles.dayCircle,
                        isSelected && { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          pickerStyles.calDayNum,
                          { color: isPast ? theme.colors.textMuted : theme.colors.text, fontFamily: 'Inter-Regular' },
                          isSelected && { color: '#fff', fontFamily: 'Inter-Bold' },
                          isToday && !isSelected && { color: theme.colors.primary, fontFamily: 'Inter-Bold' },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                    {isToday && !isSelected && <View style={[pickerStyles.todayDot, { backgroundColor: theme.colors.primary }]} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calTitle: { fontSize: 17 },
  calRow: { flexDirection: 'row' },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  calDayLabel: { fontSize: 12 },
  calDayNum: { fontSize: 15 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
