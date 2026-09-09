import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface LiveFacePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  photoUri?: string | null;
  userName: string;
  role: 'driver' | 'commuter';
  timestamp?: string;
  pickupLocation?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export default function LiveFacePreviewModal({
  visible,
  onClose,
  photoUri,
  userName,
  role,
  timestamp,
  pickupLocation,
  actionLabel,
  onActionPress,
}: LiveFacePreviewModalProps) {
  const { theme } = useTheme();

  if (!visible) return null;

  const isDriver = role === 'driver';
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'Recently';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
              <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                {isDriver ? 'Driver Live Face Verification' : 'Passenger Pickup Verification'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.body}>
            {/* Live Photo Container */}
            <View style={[styles.imageContainer, { borderColor: theme.colors.primary }]}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.emptyPhoto, { backgroundColor: theme.colors.background }]}>
                  <Ionicons name="person" size={72} color={theme.colors.textMuted} />
                </View>
              )}
              <View style={[styles.liveBadge, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            </View>

            {/* Identity Info */}
            <Text style={[styles.userName, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
              {userName}
            </Text>

            <View style={[styles.rolePill, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Text style={[styles.roleText, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }]}>
                {isDriver ? '🚗 Verified Driver' : '🎒 Commuter Passenger'}
              </Text>
            </View>

            <Text style={[styles.timestampText, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
              Captured live at {formattedTime} for this trip
            </Text>

            {pickupLocation && (
              <View style={[styles.pickupBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <Ionicons name="location" size={18} color={theme.colors.error} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickupLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                    Pickup Location
                  </Text>
                  <Text style={[styles.pickupValue, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]} numberOfLines={2}>
                    {pickupLocation}
                  </Text>
                </View>
              </View>
            )}

            {/* Security Tip */}
            <View style={[styles.securityTip, { backgroundColor: `${theme.colors.accent}15` }]}>
              <Ionicons name="information-circle" size={18} color={theme.colors.accent} />
              <Text style={[styles.securityTipText, { color: theme.colors.text, fontFamily: 'Inter-Regular' }]}>
                {isDriver
                  ? 'Confirm that this face matches the driver operating the vehicle before boarding.'
                  : 'Look out your window and match this face with the commuter waiting at the pickup point.'}
              </Text>
            </View>

            {/* Action Buttons */}
            {actionLabel && onActionPress ? (
              <View style={styles.btnRow}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: theme.colors.success }]}
                  onPress={() => {
                    onActionPress();
                    onClose();
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>{actionLabel}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary, marginTop: 16 }]}
                onPress={onClose}
              >
                <Text style={styles.actionBtnText}>Done</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
  },
  body: {
    padding: 24,
    alignItems: 'center',
  },
  imageContainer: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emptyPhoto: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 19,
    marginBottom: 6,
    textAlign: 'center',
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 13,
  },
  timestampText: {
    fontSize: 12,
    marginBottom: 16,
  },
  pickupBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    marginBottom: 14,
  },
  pickupLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  pickupValue: {
    fontSize: 13,
  },
  securityTip: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  securityTipText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  btnRow: {
    width: '100%',
    marginTop: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
});
