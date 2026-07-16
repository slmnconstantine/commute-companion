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
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { createCheckoutSession } from '@/services/paymongo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

type PaymentMethod = 'gcash' | 'maya' | 'card';

export default function PayFeesScreen() {
  const { theme } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const outstandingBalance = profile?.platform_fee_balance || 0;

  // Form States
  const [payAmount, setPayAmount] = useState(outstandingBalance.toString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [loading, setLoading] = useState(false);

  // Mock Paymongo Simulator Modal States
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorStep, setSimulatorStep] = useState<1 | 2 | 3 | 4>(1);
  const [simPhoneNumber, setSimPhoneNumber] = useState('');
  const [simOtp, setSimOtp] = useState('');
  const [simCardNum, setSimCardNum] = useState('');
  const [simCardExpiry, setSimCardExpiry] = useState('');
  const [simCardCvv, setSimCardCvv] = useState('');

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
          email: 'driver@commutecompanion.com'
        },
        line_items: [
          {
            amount: Math.round(parsedAmount * 100),
            currency: 'PHP',
            name: 'Commute Companion - Platform Fee Settlement',
            quantity: 1
          }
        ],
        reference_number: profile?.id, // Sent to PayMongo to identify user in webhook
        success_url: 'commute-companion://payment/success',
        cancel_url: 'commute-companion://payment/cancel'
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to start payment session.');
      }

      if (res.isMock) {
        // If no API key, launch our local custom interactive checkout simulator
        setSimPhoneNumber('');
        setSimOtp('');
        setSimCardNum('');
        setSimCardExpiry('');
        setSimCardCvv('');
        setSimulatorStep(1);
        setShowSimulator(true);
      } else {
        // Open the live Paymongo checkout url
        Alert.alert(
          'Redirecting to Paymongo',
          'You will be redirected to the secure Paymongo portal to complete your payment.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Proceed', 
              onPress: async () => {
                const result = await WebBrowser.openBrowserAsync(res.checkoutUrl);
                
                // In a live app we would check payment status via webhook or polling.
                  // For demo, we will simulate the completion after user returns
                  Alert.alert(
                    'Did you complete the payment?',
                    'If you successfully completed the checkout in the browser, press confirm to update your account.',
                    [
                      { 
                        text: 'Yes, Confirm', 
                        onPress: async () => {
                          await finalizeDatabasePayment(parsedAmount);
                        } 
                      },
                      { text: 'No, Cancel', style: 'cancel' }
                    ]
                  );
              }
            }
          ]
        );
      }
    } catch (e: any) {
      Alert.alert('Payment Initialization Failed', e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const finalizeDatabasePayment = async (amountPaid: number) => {
    if (!profile) return;
    setLoading(true);
    try {
      const currentBalance = profile.platform_fee_balance || 0;
      const newBalance = Math.max(0, currentBalance - amountPaid);

      const { error } = await supabase
        .from('profiles')
        .update({ platform_fee_balance: newBalance })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      
      Alert.alert('Payment Successful!', `Successfully settled ₱${amountPaid.toFixed(2)} of platform fees.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Database Error', 'Failed to update your account balance in the database. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  // Mock Simulator Steps handlers
  const handleSimStep1Next = () => {
    if (paymentMethod === 'card') {
      if (simCardNum.length < 12 || simCardExpiry.length < 4 || simCardCvv.length < 3) {
        Alert.alert('Invalid Card', 'Please enter valid credit card details.');
        return;
      }
      setSimulatorStep(3); // Go directly to confirmation
    } else {
      if (simPhoneNumber.length < 10) {
        Alert.alert('Invalid Phone', 'Please enter a valid mobile number.');
        return;
      }
      setSimulatorStep(2); // Go to OTP
    }
  };

  const handleSimStep2Next = () => {
    if (simOtp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP code.');
      return;
    }
    setSimulatorStep(3); // Go to confirmation
  };

  const handleSimAuthorize = async () => {
    setSimulatorStep(4); // Success screen
    setTimeout(async () => {
      setShowSimulator(false);
      await finalizeDatabasePayment(parsedAmount);
    }, 2000);
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

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Select Payment Option</Text>
          
          <Pressable
            style={[
              styles.methodCard,
              { backgroundColor: theme.colors.surface, borderColor: paymentMethod === 'gcash' ? theme.colors.primary : theme.colors.border }
            ]}
            onPress={() => setPaymentMethod('gcash')}
          >
            <View style={[styles.methodSelector, { borderColor: paymentMethod === 'gcash' ? theme.colors.primary : theme.colors.textMuted }]}>
              {paymentMethod === 'gcash' && <View style={[styles.methodSelectedDot, { backgroundColor: theme.colors.primary }]} />}
            </View>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodName, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>GCash</Text>
              <Text style={[styles.methodDesc, { color: theme.colors.textMuted }]}>Pay instantly using your GCash E-Wallet</Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.methodCard,
              { backgroundColor: theme.colors.surface, borderColor: paymentMethod === 'maya' ? theme.colors.primary : theme.colors.border }
            ]}
            onPress={() => setPaymentMethod('maya')}
          >
            <View style={[styles.methodSelector, { borderColor: paymentMethod === 'maya' ? theme.colors.primary : theme.colors.textMuted }]}>
              {paymentMethod === 'maya' && <View style={[styles.methodSelectedDot, { backgroundColor: theme.colors.primary }]} />}
            </View>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodName, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Maya</Text>
              <Text style={[styles.methodDesc, { color: theme.colors.textMuted }]}>Settle using your Maya Account balance</Text>
            </View>
          </Pressable>
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed || loading ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }]
            }
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
          <View style={[styles.simContent, { backgroundColor: paymentMethod === 'gcash' ? '#005CE6' : paymentMethod === 'maya' ? '#02D35A' : '#1F2937' }]}>
            
            {/* Modal Sim Header */}
            <View style={styles.simHeader}>
              <Text style={styles.simLogoText}>
                {paymentMethod === 'gcash' ? 'GCash' : paymentMethod === 'maya' ? 'Maya' : 'Card Checkout'}
              </Text>
              <Pressable style={styles.simCloseBtn} onPress={() => setShowSimulator(false)}>
                <Ionicons name="close-circle" size={24} color="#FFF" />
              </Pressable>
            </View>

            {/* Sim Body Content */}
            <View style={styles.simBody}>
              <Text style={styles.simMerchantLabel}>Merchant: Commute Companion</Text>
              <Text style={styles.simAmountLabel}>Amount Owed: ₱{parsedAmount.toFixed(2)}</Text>

              {/* STEP 1: Phone / Card Input */}
              {simulatorStep === 1 && (
                <View style={styles.simStepFrame}>
                  {paymentMethod === 'card' ? (
                    <>
                      <Text style={styles.simInputTitle}>Enter Credit Card Number</Text>
                      <TextInput
                        style={styles.simInput}
                        placeholder="4111 2222 3333 4444"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={simCardNum}
                        onChangeText={setSimCardNum}
                      />
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.simInputTitle}>Expiry</Text>
                          <TextInput
                            style={styles.simInput}
                            placeholder="MM/YY"
                            placeholderTextColor="#9CA3AF"
                            value={simCardExpiry}
                            onChangeText={setSimCardExpiry}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.simInputTitle}>CVV</Text>
                          <TextInput
                            style={styles.simInput}
                            placeholder="123"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            secureTextEntry
                            value={simCardCvv}
                            onChangeText={setSimCardCvv}
                          />
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.simInputTitle}>Enter registered mobile number</Text>
                      <View style={styles.simPhoneInputWrapper}>
                        <Text style={styles.simPhonePrefix}>+63</Text>
                        <TextInput
                          style={styles.simPhoneInput}
                          placeholder="917 123 4567"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={simPhoneNumber}
                          onChangeText={setSimPhoneNumber}
                        />
                      </View>
                    </>
                  )}
                  <Pressable style={styles.simBtn} onPress={handleSimStep1Next}>
                    <Text style={styles.simBtnText}>Next</Text>
                  </Pressable>
                </View>
              )}

              {/* STEP 2: OTP authentication */}
              {simulatorStep === 2 && (
                <View style={styles.simStepFrame}>
                  <Text style={styles.simInputTitle}>A 6-digit authentication code has been sent to +63 {simPhoneNumber}</Text>
                  <TextInput
                    style={styles.simInput}
                    placeholder="123456"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={6}
                    value={simOtp}
                    onChangeText={setSimOtp}
                  />
                  <Text style={styles.simHelperText}>For testing, type any 6-digit number.</Text>
                  <Pressable style={styles.simBtn} onPress={handleSimStep2Next}>
                    <Text style={styles.simBtnText}>Verify OTP</Text>
                  </Pressable>
                </View>
              )}

              {/* STEP 3: Confirm and Authorize */}
              {simulatorStep === 3 && (
                <View style={styles.simStepFrame}>
                  <Text style={styles.simInputTitle}>Confirm payment authorization to Commute Companion.</Text>
                  <View style={styles.simConfirmBox}>
                    <Text style={styles.simConfirmText}>Merchant: Commute Companion</Text>
                    <Text style={styles.simConfirmText}>Reference ID: REF-PAY-MOCK</Text>
                    <Text style={styles.simConfirmTextAmount}>Total Amount: ₱{parsedAmount.toFixed(2)}</Text>
                  </View>
                  <Pressable style={[styles.simBtn, { backgroundColor: '#F59E0B' }]} onPress={handleSimAuthorize}>
                    <Text style={styles.simBtnText}>Authorize Payment</Text>
                  </Pressable>
                </View>
              )}

              {/* STEP 4: Success Loading Screen */}
              {simulatorStep === 4 && (
                <View style={styles.simStepFrame}>
                  <Ionicons name="checkmark-circle" size={64} color="#FFF" style={{ alignSelf: 'center', marginBottom: 12 }} />
                  <Text style={styles.simSuccessTitle}>Payment Processing Success!</Text>
                  <Text style={styles.simSuccessSubtitle}>Updating account details...</Text>
                  <ActivityIndicator color="#FFF" style={{ marginTop: 10 }} />
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
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  methodSelector: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodSelectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  methodInfo: {
    flex: 1,
    gap: 2,
  },
  methodName: {
    fontSize: 14,
  },
  methodDesc: {
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
    fontSize: 22,
    color: '#FFF',
    fontFamily: 'Outfit-Bold',
  },
  simCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  simBody: {
    padding: 24,
    backgroundColor: '#111827',
    gap: 16,
  },
  simMerchantLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  simAmountLabel: {
    fontSize: 18,
    color: '#FFF',
    fontFamily: 'Inter-SemiBold',
  },
  simStepFrame: {
    gap: 14,
    marginTop: 10,
  },
  simInputTitle: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  simInput: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    color: '#FFF',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
  },
  simPhoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  simPhonePrefix: {
    color: '#9CA3AF',
    marginRight: 6,
    fontSize: 14,
  },
  simPhoneInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    padding: 0,
  },
  simBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  simBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  simHelperText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  simConfirmBox: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 6,
  },
  simConfirmText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  simConfirmTextAmount: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 8,
  },
  simSuccessTitle: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  simSuccessSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  }
});
