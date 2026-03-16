import { usePrediction } from '@/hooks/usePrediction';
import { useVehicleData } from '@/hooks/useVehicleData';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../../constants/theme';

export default function PredictionScreen() {
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 12 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, color: Colors.light.icon, marginBottom: 8 },
  pickerReplace: { flexDirection: 'row', flexWrap: 'wrap' },
  vehicleOption: { padding: 10, backgroundColor: '#fff', borderRadius: 8, marginRight: 8, marginBottom: 8 },
  vehicleSelected: { borderWidth: 2, borderColor: Colors.light.tint },
  vehicleOptionText: { color: Colors.light.text },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  predictButton: { backgroundColor: Colors.light.tint, padding: 14, borderRadius: 8, alignItems: 'center' },
  predictText: { color: '#fff', fontWeight: '700' },
  resultBox: { marginTop: 16, backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  resultTitle: { fontWeight: '700', marginBottom: 6 },
  resultText: { color: Colors.light.text },
  small: { color: Colors.light.icon },
});
