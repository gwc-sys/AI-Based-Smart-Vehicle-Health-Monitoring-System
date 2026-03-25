import { usePrediction } from '@/hooks/usePrediction';
import { useVehicleData } from '@/hooks/useVehicleData';
import { useAppTheme } from '@/context/ThemeContext';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PredictionScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { predict, loading } = usePrediction();
  const { vehicles } = useVehicleData();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(vehicles?.[0]?.id ?? null);
  const [mileage, setMileage] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);

  const runPrediction = async () => {
    if (!selectedVehicle) return Alert.alert('Select vehicle', 'Please select a vehicle first.');
    const payload = { vehicleId: selectedVehicle, mileage: Number(mileage || 0) };
    try {
      const res = await predict(payload as any);
      if (res) setResult(JSON.stringify(res));
      else setResult('No prediction available');
    } catch (err) {
      Alert.alert('Prediction failed', (err as Error).message || 'Error');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Prediction</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Vehicle</Text>
          <View style={styles.pickerReplace}>
            {vehicles && vehicles.length > 0 ? (
              vehicles.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleOption, selectedVehicle === v.id && styles.vehicleSelected]}
                  onPress={() => setSelectedVehicle(v.id ?? null)}
                >
                  <Text style={styles.vehicleOptionText}>{v.make} {v.model}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.small}>No vehicles available</Text>
            )}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mileage (km)</Text>
          <TextInput
            style={styles.input}
            value={mileage}
            onChangeText={setMileage}
            keyboardType="numeric"
            placeholder="Enter current mileage"
          />
        </View>

        <TouchableOpacity style={styles.predictButton} onPress={runPrediction} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.predictText}>Run Prediction</Text>}
        </TouchableOpacity>

        {result && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Result</Text>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: {
  background: string;
  card: string;
  inputBackground: string;
  tint: string;
  text: string;
  icon: string;
  border: string;
}) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { padding: 20 },
    title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
    field: { marginBottom: 16 },
    label: { fontSize: 14, color: colors.icon, marginBottom: 8 },
    pickerReplace: { flexDirection: 'row', flexWrap: 'wrap' },
    vehicleOption: {
      padding: 10,
      backgroundColor: colors.card,
      borderRadius: 8,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    vehicleSelected: { borderWidth: 2, borderColor: colors.tint },
    vehicleOptionText: { color: colors.text },
    input: {
      backgroundColor: colors.inputBackground,
      padding: 12,
      borderRadius: 8,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    predictButton: { backgroundColor: colors.tint, padding: 14, borderRadius: 8, alignItems: 'center' },
    predictText: { color: '#fff', fontWeight: '700' },
    resultBox: {
      marginTop: 16,
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resultTitle: { fontWeight: '700', marginBottom: 6, color: colors.text },
    resultText: { color: colors.text },
    small: { color: colors.icon },
  });
