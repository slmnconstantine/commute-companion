import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
          Dark Mode
        </Text>
        <Switch
          value={mode === 'dark'}
          onValueChange={toggleTheme}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor={theme.colors.white}
        />
      </View>
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
