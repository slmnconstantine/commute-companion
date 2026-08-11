import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { createCheckoutSession } from '@/services/paymongo';
import * as WebBrowser from 'expo-web-browser';

export default function PayFeesScreen() {
  const { theme } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const outstandingBalance = profile?.platform_fee_balance || 0;

  // Form States
  const [payAmount, setPayAmount] = useState(outstandingBalance.toString());
  const [loading, setLoading] = useState(false);

  // Mock Paymongo Simulator Modal States
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorStep, setSimulatorStep] = useState<1 | 2>(1);

  const parsedAmount = parseFloat(payAmount) || 0;

  const handleProcessPayment = async () => {
    if (parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than 0.');
      return;
    }
    if (parsedAmount > outstandingBalance) {
      Alert.alert('Invalid Amount', `You cannot pay more than your outstanding balance of ₱${outstandingBalance.toFixed(2)}.`);
      return;
    }

    setLoading(true);

    try {
      // Create checkout session using Paymongo service
      const res = await createCheckoutSession({
        amount: Math.round(parsedAmount * 100),
        currency: 'PHP',
        description: `Payment of Platform Fees for driver: ${profile?.full_name || 'Driver Account'}`,
        billing: {
          name: profile?.full_name || 'Driver Account',
          email: 'driver@commutecompanion.com',
        },
        line_items: [
          {
            amount: Math.round(parsedAmount * 100),
            currency: 'PHP',
            name: 'Commute Companion - Platform Fee Settlement',
            quantity: 1,
          },
        ],
        reference_number: profile?.id, // Sent to PayMongo to identify user in webhook
        success_url: 'commute-companion://payment/success',
        cancel_url: 'commute-companion://payment/cancel',
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to start payment session.');
      }

      if (res.isMock) {
        // If no API key, launch local interactive QR code simulator
        setSimulatorStep(1);
        setShowSimulator(true);
      } else {
        // Open the live Paymongo checkout url (which displays the QR code)
        Alert.alert(
          'Redirecting to Paymongo',
          'You will be redirected to the secure Paymongo portal to scan the QR code and complete your payment.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Proceed',
              onPress: async () => {
                await WebBrowser.openBrowserAsync(res.checkoutUrl);

                // In a live app we would check payment status via webhook or polling.
                Alert.alert(
                  'Did you complete the payment?',
                  'If you successfully completed the QR payment in the browser, press confirm to update your account.',
                  [
                    {
                      text: 'Yes, Confirm',
                      onPress: async () => {
                        await finalizeDatabasePayment(parsedAmount);
                      },
                    },
                    { text: 'No, Cancel', style: 'cancel' },
                  ]
                );
              },
            },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert('Payment Initialization Failed', e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Finalizes database platform fee deduction.
   */
  const finalizeDatabasePayment = async (amountPaid: number) => {
    if (!profile) return;

    // Bounds & sanity validation
    const currentBalance = profile.platform_fee_balance || 0;
    if (amountPaid <= 0 || amountPaid > currentBalance + 0.01) {
      Alert.alert('Invalid Payment', 'Payment amount exceeds current balance or is invalid.');
      return;
    }

    setLoading(true);
    try {
      const newBalance = Math.max(0, currentBalance - amountPaid);

      const { error } = await supabase
        .from('profiles')
        .update({ platform_fee_balance: newBalance })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();

      Alert.alert('Payment Successful!', `Successfully settled ₱${amountPaid.toFixed(2)} of platform fees.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Database Error', 'Failed to update your account balance in the database. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimAuthorize = async () => {
    setSimulatorStep(2); // Success screen
    setTimeout(async () => {
      setShowSimulator(false);
      await finalizeDatabasePayment(parsedAmount);
    }, 1800);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Pay Platform Fee</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Outstanding box */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted, fontFamily: 'Inter-Medium' }]}>Outstanding Balance</Text>
          <Text style={[styles.summaryAmount, { color: theme.colors.text, fontFamily: 'Outfit-Bold' }]}>
            ₱{outstandingBalance.toFixed(2)}
          </Text>
          <Text style={[styles.summarySubtitle, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
            Settle your accumulated platform commission fees to keep taking riders.
          </Text>
        </View>

        {/* Input fields */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Payment Amount</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.currencyPrefix, { color: theme.colors.text, fontFamily: 'Outfit-Bold' }]}>₱</Text>
            <TextInput
              style={[styles.inputField, { color: theme.colors.text, fontFamily: 'Outfit-SemiBold' }]}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Pressable
              style={[styles.maxBtn, { backgroundColor: `${theme.colors.primary}15` }]}
              onPress={() => setPayAmount(outstandingBalance.toString())}
            >
              <Text style={[styles.maxBtnText, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }]}>PAY ALL</Text>
            </Pressable>
          </View>
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed || loading ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          disabled={loading}
          onPress={handleProcessPayment}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <Text style={[styles.submitButtonText, { color: theme.colors.white, fontFamily: 'Inter-SemiBold' }]}>
                Proceed to Payment
              </Text>
              <Ionicons name="shield-checkmark" size={18} color={theme.colors.white} />
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* MOCK CHECKOUT PORTAL MODAL */}
      <Modal visible={showSimulator} animationType="slide" transparent={true}>
        <View style={styles.simContainer}>
          <View style={[styles.simContent, { backgroundColor: '#1E293B' }]}>
            {/* Modal Sim Header */}
            <View style={styles.simHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="qr-code-outline" size={22} color="#FFF" />
                <Text style={styles.simLogoText}>QR Ph Checkout</Text>
              </View>
              <Pressable style={styles.simCloseBtn} onPress={() => setShowSimulator(false)}>
                <Ionicons name="close-circle" size={24} color="#FFF" />
              </Pressable>
            </View>

            {/* Sim Body Content */}
            <View style={styles.simBody}>
              {simulatorStep === 1 ? (
                <>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.simMerchantLabel}>Merchant: Commute Companion</Text>
                    <Text style={styles.simAmountLabel}>Amount Due: ₱{parsedAmount.toFixed(2)}</Text>
                  </View>

                  {/* QR Code Container */}
                  <View style={styles.simQrCard}>
                    <Ionicons name="qr-code" size={160} color="#0F172A" />
                    <View style={styles.simQrBadge}>
                      <Text style={styles.simQrBadgeText}>QR Ph Standard</Text>
                    </View>
                  </View>

                  <Text style={styles.simQrInstruction}>
                    Scan this QR code using GCash, Maya, ShopeePay, or any mobile banking app to pay.
                  </Text>

                  <Pressable style={styles.simBtn} onPress={handleSimAuthorize}>
                    <Text style={styles.simBtnText}>Simulate Scan & Pay</Text>
                  </Pressable>
                </>
              ) : (
                /* STEP 2: Success Loading Screen */
                <View style={styles.simStepFrame}>
                  <Ionicons name="checkmark-circle" size={64} color="#10B981" style={{ alignSelf: 'center', marginBottom: 12 }} />
                  <Text style={styles.simSuccessTitle}>Payment Received!</Text>
                  <Text style={styles.simSuccessSubtitle}>Updating platform fee balance...</Text>
                  <ActivityIndicator color="#10B981" style={{ marginTop: 12 }} />
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  summaryCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 36,
  },
  summarySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  currencyPrefix: {
    fontSize: 24,
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 24,
    padding: 0,
  },
  maxBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  maxBtnText: {
    fontSize: 11,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
  },

  /* Simulator Styles */
  simContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  simContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  simLogoText: {
    fontSize: 20,
    color: '#FFF',
    fontFamily: 'Outfit-Bold',
  },
  simCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  simBody: {
    padding: 24,
    backgroundColor: '#0F172A',
    gap: 16,
    alignItems: 'center',
  },
  simMerchantLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter-Regular',
  },
  simAmountLabel: {
    fontSize: 20,
    color: '#FFF',
    fontFamily: 'Outfit-Bold',
    marginTop: 2,
  },
  simQrCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  simQrBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  simQrBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  simQrInstruction: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
    fontFamily: 'Inter-Regular',
  },
  simStepFrame: {
    gap: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  simBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  simBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  simSuccessTitle: {
    fontSize: 18,
    color: '#FFF',
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  simSuccessSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
