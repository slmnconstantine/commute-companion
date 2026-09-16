import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/fareCalculator';

interface GCashReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  commuterName?: string;
  reservationFee?: number;
  paymentStatus?: string;
  onAccept?: () => void;
  accepting?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GCashReceiptModal({
  visible,
  onClose,
  receiptUrl,
  commuterName = 'Commuter',
  reservationFee = 0,
  paymentStatus = 'submitted',
  onAccept,
  accepting = false,
}: GCashReceiptModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  if (!visible) return null;

  const formattedUri = receiptUrl
    ? receiptUrl.startsWith('http') || receiptUrl.startsWith('data:')
      ? receiptUrl
      : `data:image/jpeg;base64,${receiptUrl}`
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              paddingTop: insets.top + 12,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconBox, { backgroundColor: '#007DFE18' }]}>
                <Ionicons name="wallet-outline" size={20} color="#007DFE" />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Inter-Bold' }]}>
                  GCash Reservation Receipt
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                  Submitted by {commuterName}
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Deposit Info Banner */}
          <View
            style={[
              styles.infoBanner,
              { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontFamily: 'Inter-Regular' }}>
                Reservation Deposit
              </Text>
              <Text style={{ color: theme.colors.primary, fontSize: 18, fontFamily: 'Inter-Bold' }}>
                {formatCurrency(reservationFee)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: paymentStatus === 'verified' ? `${theme.colors.success}18` : '#007DFE18',
              }}
            >
              <Ionicons
                name={paymentStatus === 'verified' ? 'checkmark-circle' : 'time-outline'}
                size={14}
                color={paymentStatus === 'verified' ? theme.colors.success : '#007DFE'}
              />
              <Text
                style={{
                  color: paymentStatus === 'verified' ? theme.colors.success : '#007DFE',
                  fontSize: 12,
                  fontFamily: 'Inter-SemiBold',
                  textTransform: 'capitalize',
                }}
              >
                {paymentStatus === 'verified' ? 'Verified' : 'Proof Submitted'}
              </Text>
            </View>
          </View>

          {/* Receipt Image Viewer */}
          <View style={[styles.imageContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            {formattedUri ? (
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: formattedUri }}
                  style={styles.receiptImage}
                  resizeMode="contain"
                />
              </ScrollView>
            ) : (
              <View style={styles.noImageContainer}>
                <Ionicons name="document-text-outline" size={48} color={theme.colors.textMuted} />
                <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontFamily: 'Inter-Medium', marginTop: 10 }}>
                  No receipt image available
                </Text>
              </View>
            )}
          </View>

          {/* Action Footer */}
          <View style={styles.footer}>
            {onAccept && (
              <Pressable
                style={[
                  styles.acceptBtn,
                  { backgroundColor: theme.colors.primary, opacity: accepting ? 0.7 : 1 },
                ]}
                onPress={onAccept}
                disabled={accepting}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.acceptBtnText}>
                  {accepting ? 'Verifying...' : 'Verify & Accept Booking'}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.dismissBtn,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.dismissBtnText, { color: theme.colors.text, fontFamily: 'Inter-Medium' }]}>
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 24,
    paddingHorizontal: 20,
    gap: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  imageContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.45,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptImage: {
    width: SCREEN_WIDTH - 72,
    height: SCREEN_HEIGHT * 0.45,
  },
  noImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  footer: {
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  dismissBtnText: {
    fontSize: 14,
  },
});
