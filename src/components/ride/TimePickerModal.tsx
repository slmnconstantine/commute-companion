import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';

export default function TimePickerModal({
  visible, onClose, onSelect, selectedTime, theme,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  selectedTime: string;
  theme: any;
}) {
  const [hour24, setHour24] = useState(() => {
    const [h] = selectedTime.split(':');
    return parseInt(h || '0', 10);
  });
  const [minute, setMinute] = useState(() => {
    const [, m] = selectedTime.split(':');
    return parseInt(m || '0', 10);
  });

  useEffect(() => {
    if (visible) {
      const [h, m] = selectedTime.split(':');
      setHour24(parseInt(h || '0', 10));
      setMinute(parseInt(m || '0', 10));
    }
  }, [selectedTime, visible]);

  const isPM = hour24 >= 12;
  const hour12 = hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24);

  const handleAmPmSelect = (pm: boolean) => {
    if (pm && !isPM) setHour24(hour24 + 12);
    if (!pm && isPM) setHour24(hour24 - 12);
  };

  const handleSave = () => {
    const hStr = String(hour24).padStart(2, '0');
    const mStr = String(minute).padStart(2, '0');
    onSelect(`${hStr}:${mStr}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <Pressable style={[pickerStyles.timeSheet, { backgroundColor: theme.colors.surface }]} onPress={() => { }}>
          {/* Header handle */}
          <View style={pickerStyles.sheetHandle}>
            <View style={[pickerStyles.handleBar, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Title Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 }}>
            <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 18 }}>
              Departure Time
            </Text>
            <Pressable
              onPress={handleSave}
              style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100 }}
            >
              <Text style={{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14 }}>Done</Text>
            </Pressable>
          </View>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            height: 250,
            marginBottom: 20
          }}>
            {/* Hour Column */}
            <View style={{ flex: 1, alignItems: 'stretch', marginRight: 8 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase', textAlign: 'center' }}>Hour</Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1, backgroundColor: theme.colors.inputBackground, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }}
                contentContainerStyle={{ paddingVertical: 10 }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                  const active = hour12 === h;
                  return (
                    <Pressable
                      key={`hour-${h}`}
                      onPress={() => {
                        const newH24 = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
                        setHour24(newH24);
                      }}
                      style={{
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginHorizontal: 8,
                        marginVertical: 2,
                        borderRadius: 10,
                        backgroundColor: active ? theme.colors.primary : 'transparent',
                      }}
                    >
                      <Text style={{
                        color: active ? '#fff' : theme.colors.text,
                        fontFamily: active ? 'Inter-Bold' : 'Inter-Medium',
                        fontSize: 16,
                      }}>
                        {h}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Minute Column */}
            <View style={{ flex: 1, alignItems: 'stretch', marginRight: 8 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase', textAlign: 'center' }}>Minute</Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1, backgroundColor: theme.colors.inputBackground, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }}
                contentContainerStyle={{ paddingVertical: 10 }}
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                  const active = minute === m;
                  return (
                    <Pressable
                      key={`min-${m}`}
                      onPress={() => setMinute(m)}
                      style={{
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginHorizontal: 8,
                        marginVertical: 2,
                        borderRadius: 10,
                        backgroundColor: active ? theme.colors.primary : 'transparent',
                      }}
                    >
                      <Text style={{
                        color: active ? '#fff' : theme.colors.text,
                        fontFamily: active ? 'Inter-Bold' : 'Inter-Medium',
                        fontSize: 16,
                      }}>
                        {String(m).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* AM/PM Column */}
            <View style={{ flex: 1, alignItems: 'stretch' }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase', textAlign: 'center' }}>AM / PM</Text>
              <View style={{
                flex: 1,
                backgroundColor: theme.colors.inputBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 8,
                justifyContent: 'center',
                gap: 12
              }}>
                <Pressable
                  onPress={() => handleAmPmSelect(false)}
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: !isPM ? theme.colors.primary : 'transparent',
                  }}
                >
                  <Text style={{
                    color: !isPM ? '#fff' : theme.colors.text,
                    fontFamily: !isPM ? 'Inter-Bold' : 'Inter-Medium',
                    fontSize: 16,
                  }}>
                    AM
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleAmPmSelect(true)}
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: isPM ? theme.colors.primary : 'transparent',
                  }}
                >
                  <Text style={{
                    color: isPM ? '#fff' : theme.colors.text,
                    fontFamily: isPM ? 'Inter-Bold' : 'Inter-Medium',
                    fontSize: 16,
                  }}>
                    PM
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
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
  timeSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 12,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 17, textAlign: 'center', marginBottom: 12 },
});
