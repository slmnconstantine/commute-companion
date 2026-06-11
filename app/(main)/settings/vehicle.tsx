import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Vehicle } from '@/types/database';
import { getVehicles, addVehicle, deleteVehicle } from '@/services/vehicles';

export default function VehicleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [addingLoading, setAddingLoading] = useState(false);
  
  // Form State
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [classification, setClassification] = useState<'private' | 'public'>('private');
  const [capacity, setCapacity] = useState('4');

  useEffect(() => {
    fetchVehicles();
  }, [profile]);

  const fetchVehicles = async () => {
    if (!profile) return;
    setLoading(true);
    const data = await getVehicles(profile.id);
    setVehicles(data);
    setLoading(false);
  };

  const handleAddVehicle = async () => {
    if (!profile) return;
    if (!model.trim() || !plateNumber.trim() || !capacity.trim()) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }

    setAddingLoading(true);
    try {
      // Store classification in type (e.g. 'private' or 'public')
      const newVehicle = await addVehicle(profile.id, plateNumber.toUpperCase(), classification, model, capacity);
      if (newVehicle) {
        setVehicles([newVehicle, ...vehicles]);
        setIsAdding(false);
        setModel('');
        setPlateNumber('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add vehicle');
    } finally {
      setAddingLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Vehicle', 'Are you sure you want to remove this vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          const success = await deleteVehicle(id);
          if (success) {
            setVehicles(v => v.filter(vec => vec.id !== id));
          }
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>My Vehicles</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.listSection}>
              {vehicles.length === 0 && !isAdding ? (
                <View style={styles.emptyState}>
                  <Ionicons name="car-outline" size={48} color={theme.colors.border} />
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>You haven't registered any vehicles yet.</Text>
                </View>
              ) : (
                vehicles.map(v => (
                  <View key={v.id} style={[styles.vehicleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[styles.vehicleIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                      <Ionicons name="car" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.vehicleInfo}>
                      <Text style={[styles.vehicleModel, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>{v.model}</Text>
                      <Text style={[styles.vehiclePlate, { color: theme.colors.textMuted }]}>{v.plate_number} • {v.capacity} seats</Text>
                      <View style={[styles.badge, { backgroundColor: v.type === 'public' ? theme.colors.accent : theme.colors.textMuted }]}>
                        <Text style={styles.badgeText}>{v.type === 'public' ? 'Public (PUV)' : 'Private'}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => handleDelete(v.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {isAdding ? (
              <View style={[styles.addForm, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.formTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Add New Vehicle</Text>
                
                {/* Classification Picker */}
                <View style={styles.classificationRow}>
                  <Pressable 
                    style={[styles.classBtn, classification === 'private' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                    onPress={() => setClassification('private')}
                  >
                    <Text style={[styles.classBtnText, classification === 'private' ? { color: '#fff' } : { color: theme.colors.text }]}>Private</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.classBtn, classification === 'public' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                    onPress={() => setClassification('public')}
                  >
                    <Text style={[styles.classBtnText, classification === 'public' ? { color: '#fff' } : { color: theme.colors.text }]}>Public (PUV)</Text>
                  </Pressable>
                </View>

                <TextInput
                  value={model}
                  onChangeText={setModel}
                  placeholder="Vehicle Model (e.g. Toyota Vios)"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                />
                <TextInput
                  value={plateNumber}
                  onChangeText={t => setPlateNumber(t.toUpperCase())}
                  placeholder="Plate Number"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="characters"
                  style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                />
                <TextInput
                  value={capacity}
                  onChangeText={setCapacity}
                  placeholder="Passenger Capacity (e.g. 4)"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                />

                <View style={styles.formActions}>
                  <Pressable style={[styles.cancelBtn, { borderColor: theme.colors.border }]} onPress={() => setIsAdding(false)}>
                    <Text style={[styles.cancelBtnText, { color: theme.colors.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleAddVehicle} disabled={addingLoading}>
                    <Text style={styles.saveBtnText}>{addingLoading ? 'Saving...' : 'Save Vehicle'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={[styles.addBtn, { borderColor: theme.colors.border }]} onPress={() => setIsAdding(true)}>
                <Ionicons name="add" size={24} color={theme.colors.primary} />
                <Text style={[styles.addBtnText, { color: theme.colors.primary, fontFamily: 'Inter-Medium' }]}>Register New Vehicle</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  content: { padding: 20 },
  listSection: { gap: 12, marginBottom: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, opacity: 0.5 },
  emptyText: { marginTop: 12, fontSize: 15 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 16 },
  vehicleIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  vehicleInfo: { flex: 1 },
  vehicleModel: { fontSize: 16, marginBottom: 2 },
  vehiclePlate: { fontSize: 13, marginBottom: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter-Bold', textTransform: 'uppercase' },
  deleteBtn: { padding: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', gap: 8 },
  addBtnText: { fontSize: 15 },
  addForm: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 16 },
  formTitle: { fontSize: 16, marginBottom: 4 },
  classificationRow: { flexDirection: 'row', gap: 12 },
  classBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  classBtnText: { fontSize: 14, fontFamily: 'Inter-Medium' },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, fontFamily: 'Inter-Regular' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
