import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { HUB_REACTIONS, HubReactionType } from '@/lib/constants';

interface ReactionPickerProps {
  visible: boolean;
  onSelect: (reactionType: HubReactionType) => void;
  onClose: () => void;
  currentReaction?: string | null;
}

export default function ReactionPicker({
  visible,
  onSelect,
  onClose,
  currentReaction,
}: ReactionPickerProps) {
  const { theme } = useTheme();
  const animScale = useRef(new Animated.Value(0.7)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(animScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      animScale.setValue(0.7);
      animOpacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: animOpacity,
              transform: [{ scale: animScale }],
            },
          ]}
        >
          {HUB_REACTIONS.map((item) => {
            const isSelected = currentReaction === item.type;
            return (
              <Pressable
                key={item.type}
                style={({ pressed }) => [
                  styles.reactionBtn,
                  isSelected && {
                    backgroundColor: `${item.color}20`,
                    borderColor: item.color,
                    borderWidth: 1,
                  },
                  pressed && { transform: [{ scale: 1.25 }] },
                ]}
                onPress={() => {
                  onSelect(item.type);
                  onClose();
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color={item.color}
                />
                <Text
                  style={[
                    styles.reactionLabel,
                    {
                      color: isSelected ? item.color : theme.colors.textMuted,
                      fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Regular',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 32,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  reactionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 4,
  },
  reactionLabel: {
    fontSize: 10,
  },
});
