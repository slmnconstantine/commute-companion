import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TripFiltersModal({
  visible,
  onClose,
  theme,
  filterMaxFare,
  setFilterMaxFare,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  customFareText,
  setCustomFareText,
}: {
  visible: boolean;
  onClose: () => void;
  theme: any;
  filterMaxFare: number | null;
  setFilterMaxFare: (val: number | null) => void;
  filterStatus: 'open' | 'all';
  setFilterStatus: (val: 'open' | 'all') => void;
  sortBy: 'time' | 'price_asc' | 'price_desc';
  setSortBy: (val: 'time' | 'price_asc' | 'price_desc') => void;
  customFareText: string;
  setCustomFareText: (val: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[pickerStyles.timeSheet, { backgroundColor: theme.colors.surface }]}
        >
          <Pressable onPress={() => { }} style={{ width: '100%' }}>
            {/* Handle bar */}
            <View style={pickerStyles.sheetHandle}>
              <View style={[pickerStyles.handleBar, { backgroundColor: theme.colors.border }]} />
            </View>

            {/* Title & Close */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 }}>
              <Text style={{ color: theme.colors.text, fontFamily: 'Inter-Bold', fontSize: 18 }}>
                Filter & Sort
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ paddingHorizontal: 24, maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Sort By Section */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginBottom: 10 }}>
                  Sort By
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { id: 'time', label: 'Soonest', icon: 'time-outline' },
                    { id: 'price_asc', label: 'Price: Low to High', icon: 'trending-down-outline' },
                    { id: 'price_desc', label: 'Price: High to Low', icon: 'trending-up-outline' },
                  ].map((opt) => {
                    const active = sortBy === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: active ? `${theme.colors.primary}12` : theme.colors.inputBackground,
                          borderWidth: 1.5,
                          borderColor: active ? theme.colors.primary : 'transparent',
                        }}
                        onPress={() => setSortBy(opt.id as any)}
                      >
                        <Ionicons name={opt.icon as any} size={15} color={active ? theme.colors.primary : theme.colors.textMuted} />
                        <Text style={{
                          color: active ? theme.colors.primary : theme.colors.text,
                          fontFamily: active ? 'Inter-SemiBold' : 'Inter-Regular',
                          fontSize: 13,
                        }}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Ride Status Section */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginBottom: 10 }}>
                  Ride Status
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { id: 'open', label: 'Open Only', desc: 'Rides with available seats' },
                    { id: 'all', label: 'All Active', desc: 'Open, full, & ongoing rides' },
                  ].map((opt) => {
                    const active = filterStatus === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={{
                          flex: 1,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: active ? `${theme.colors.primary}12` : theme.colors.inputBackground,
                          borderWidth: 1.5,
                          borderColor: active ? theme.colors.primary : 'transparent',
                        }}
                        onPress={() => setFilterStatus(opt.id as any)}
                      >
                        <Text style={{
                          color: active ? theme.colors.primary : theme.colors.text,
                          fontFamily: 'Inter-SemiBold',
                          fontSize: 14,
                          marginBottom: 2,
                        }}>
                          {opt.label}
                        </Text>
                        <Text style={{
                          color: theme.colors.textMuted,
                          fontFamily: 'Inter-Regular',
                          fontSize: 11,
                        }}>
                          {opt.desc}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Max Fare Section */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginBottom: 10 }}>
                  Max Fare
                </Text>
                {/* Quick selection chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {[
                    { value: null, label: 'Any' },
                    { value: 50, label: '₱50' },
                    { value: 100, label: '₱100' },
                    { value: 150, label: '₱150' },
                    { value: 200, label: '₱200' },
                    { value: 300, label: '₱300' },
                  ].map((chip) => {
                    const active = filterMaxFare === chip.value;
                    return (
                      <Pressable
                        key={chip.label}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 100,
                          backgroundColor: active ? `${theme.colors.primary}12` : theme.colors.inputBackground,
                          borderWidth: 1.5,
                          borderColor: active ? theme.colors.primary : 'transparent',
                        }}
                        onPress={() => {
                          setFilterMaxFare(chip.value);
                          setCustomFareText(chip.value !== null ? String(chip.value) : '');
                        }}
                      >
                        <Text style={{
                          color: active ? theme.colors.primary : theme.colors.text,
                          fontFamily: active ? 'Inter-SemiBold' : 'Inter-Regular',
                          fontSize: 13,
                        }}>
                          {chip.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom Max Fare input */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.inputBackground,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: theme.colors.border,
                  paddingHorizontal: 12,
                  height: 48,
                }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 16, fontFamily: 'Inter-Medium', marginRight: 6 }}>₱</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      color: theme.colors.text,
                      fontFamily: 'Inter-Regular',
                      fontSize: 15,
                      height: '100%',
                    }}
                    placeholder="Or enter custom max fare"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={customFareText}
                    onChangeText={(val) => {
                      setCustomFareText(val);
                      const clean = val.replace(/[^0-9]/g, '');
                      if (clean) {
                        setFilterMaxFare(parseInt(clean, 10));
                      } else {
                        setFilterMaxFare(null);
                      }
                    }}
                  />
                  {customFareText !== '' && (
                    <Pressable
                      onPress={() => {
                        setCustomFareText('');
                        setFilterMaxFare(null);
                      }}
                      hitSlop={12}
                    >
                      <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginTop: 8 }}>
              <Pressable
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.inputBackground,
                  borderWidth: 1.5,
                  borderColor: theme.colors.border,
                }}
                onPress={() => {
                  setFilterMaxFare(null);
                  setFilterStatus('open');
                  setSortBy('time');
                  setCustomFareText('');
                }}
              >
                <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 15 }}>
                  Reset All
                </Text>
              </Pressable>
              <Pressable
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.primary,
                }}
                onPress={onClose}
              >
                <Text style={{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 15 }}>
                  Apply Filters
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
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
    maxHeight: '85%',
    paddingBottom: 48,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 12,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
});
