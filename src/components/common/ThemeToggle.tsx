import React from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ThemeToggle() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Pressable onPress={toggleTheme} style={styles.row}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: mode === 'dark' ? '#F59E0B20' : '#EAB30820',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={mode === 'dark' ? 'moon' : 'sunny'}
              size={20}
              color={mode === 'dark' ? '#F59E0B' : '#EAB308'}
            />
          </View>
          <Text style={[styles.label, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            Dark Mode
          </Text>
        </View>
        <Switch
          value={mode === 'dark'}
          onValueChange={toggleTheme}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor={theme.colors.white}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
  },
});
