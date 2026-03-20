import AsyncStorage from '@react-native-async-storage/async-storage';
import SensorCard from '@/components/SensorCard';
import useAuth from '@/hooks/useAuth';
import { useVehicleData } from '@/hooks/useVehicleData';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

type SensorStatus = 'normal' | 'warning' | 'critical' | 'inactive';

type SensorHistoryPoint = {
  time: string;
  value: number;
  displayValue: string;
};

type DashboardSensor = {
  id: string;
  title: string;
  shortLabel: string;
  unit: string;
  value: string;
  subtitle: string;
  status: SensorStatus;
  accentColor: string;
  chartValue: number;
  metricLabel: string;
  lastUpdated: string;
  threshold: string;
  history: SensorHistoryPoint[];
};

type MaintenanceRecord = {
  id: string;
  vehicleName: string;
  maintenanceType: string;
  workDone: string;
  maintenanceDate: string;
  nextServiceDate: string;
  status: 'completed' | 'in-progress' | 'scheduled';
};

type MaintenanceFormState = {
  id?: string;
  vehicleName: string;
  maintenanceType: string;
  workDone: string;
  maintenanceDate: string;
  nextServiceDate: string;
  status: MaintenanceRecord['status'];
};

const sensorReadings: DashboardSensor[] = [
  {
    id: 'accelerometer',
    title: '3-Axis Accelerometer',
    shortLabel: 'Accel',
    unit: 'g',
    value: '0.82 g',
    subtitle: 'Tilt and impact within safe range',
    status: 'normal',
    accentColor: '#48B6A3',
    chartValue: 82,
    metricLabel: 'Motion balance',
    lastUpdated: '2 min ago',
    threshold: 'Alert above 1.20 g',
    history: [
      { time: '08:00', value: 0.61, displayValue: '0.61 g' },
      { time: '09:00', value: 0.68, displayValue: '0.68 g' },
      { time: '10:00', value: 0.74, displayValue: '0.74 g' },
      { time: '11:00', value: 0.82, displayValue: '0.82 g' },
      { time: '12:00', value: 0.77, displayValue: '0.77 g' },
      { time: '13:00', value: 0.82, displayValue: '0.82 g' },
    ],
  },
  {
    id: 'vibration',
    title: 'Vibration Sensor',
    shortLabel: 'Vib',
    unit: 'Hz',
    value: '4.3 Hz',
    subtitle: 'Stable chassis vibration detected',
    status: 'normal',
    accentColor: '#2FA8CC',
    chartValue: 76,
    metricLabel: 'Vibration level',
    lastUpdated: '1 min ago',
    threshold: 'Alert above 7.00 Hz',
    history: [
      { time: '08:00', value: 3.4, displayValue: '3.4 Hz' },
      { time: '09:00', value: 3.7, displayValue: '3.7 Hz' },
      { time: '10:00', value: 4.0, displayValue: '4.0 Hz' },
      { time: '11:00', value: 4.6, displayValue: '4.6 Hz' },
      { time: '12:00', value: 4.1, displayValue: '4.1 Hz' },
      { time: '13:00', value: 4.3, displayValue: '4.3 Hz' },
    ],
  },
  {
    id: 'sound',
    title: 'Sound Sensor',
    shortLabel: 'Sound',
    unit: 'dB',
    value: '61 dB',
    subtitle: 'Engine noise is slightly elevated',
    status: 'warning',
    accentColor: '#6E9CFF',
    chartValue: 61,
    metricLabel: 'Noise intensity',
    lastUpdated: 'Just now',
    threshold: 'Alert above 65 dB',
    history: [
      { time: '08:00', value: 51, displayValue: '51 dB' },
      { time: '09:00', value: 54, displayValue: '54 dB' },
      { time: '10:00', value: 57, displayValue: '57 dB' },
      { time: '11:00', value: 63, displayValue: '63 dB' },
      { time: '12:00', value: 59, displayValue: '59 dB' },
      { time: '13:00', value: 61, displayValue: '61 dB' },
    ],
  },
  {
    id: 'light',
    title: 'Light Sensor',
    shortLabel: 'Light',
    unit: 'lux',
    value: '420 lux',
    subtitle: 'Cabin lighting and ambient light normal',
    status: 'normal',
    accentColor: '#8C7CF6',
    chartValue: 84,
    metricLabel: 'Ambient light',
    lastUpdated: '2 min ago',
    threshold: 'Alert below 120 lux',
    history: [
      { time: '08:00', value: 310, displayValue: '310 lux' },
      { time: '09:00', value: 355, displayValue: '355 lux' },
      { time: '10:00', value: 398, displayValue: '398 lux' },
      { time: '11:00', value: 420, displayValue: '420 lux' },
      { time: '12:00', value: 405, displayValue: '405 lux' },
      { time: '13:00', value: 420, displayValue: '420 lux' },
    ],
  },
  {
    id: 'temperature',
    title: 'Temperature Sensor',
    shortLabel: 'Temp',
    unit: 'C',
    value: '36.4 C',
    subtitle: 'Thermal condition under threshold',
    status: 'normal',
    accentColor: '#3BB273',
    chartValue: 73,
    metricLabel: 'Engine temperature',
    lastUpdated: '1 min ago',
    threshold: 'Alert above 45 C',
    history: [
      { time: '08:00', value: 31.2, displayValue: '31.2 C' },
      { time: '09:00', value: 32.5, displayValue: '32.5 C' },
      { time: '10:00', value: 34.4, displayValue: '34.4 C' },
      { time: '11:00', value: 35.8, displayValue: '35.8 C' },
      { time: '12:00', value: 36.1, displayValue: '36.1 C' },
      { time: '13:00', value: 36.4, displayValue: '36.4 C' },
    ],
  },
  {
    id: 'battery',
    title: 'Battery Voltage Sensor',
    shortLabel: 'Batt',
    unit: 'V',
    value: '12.6 V',
    subtitle: 'Battery supply is healthy',
    status: 'normal',
    accentColor: '#F4B740',
    chartValue: 88,
    metricLabel: 'Battery health',
    lastUpdated: '3 min ago',
    threshold: 'Alert below 11.5 V',
    history: [
      { time: '08:00', value: 12.3, displayValue: '12.3 V' },
      { time: '09:00', value: 12.4, displayValue: '12.4 V' },
      { time: '10:00', value: 12.4, displayValue: '12.4 V' },
      { time: '11:00', value: 12.5, displayValue: '12.5 V' },
      { time: '12:00', value: 12.6, displayValue: '12.6 V' },
      { time: '13:00', value: 12.6, displayValue: '12.6 V' },
    ],
  },
  {
    id: 'weight',
    title: 'Over-Weight Sensor',
    shortLabel: 'Load',
    unit: '%',
    value: '78%',
    subtitle: 'Vehicle load is approaching limit',
    status: 'warning',
    accentColor: '#F05D5E',
    chartValue: 78,
    metricLabel: 'Load utilization',
    lastUpdated: '1 min ago',
    threshold: 'Alert above 85%',
    history: [
      { time: '08:00', value: 52, displayValue: '52%' },
      { time: '09:00', value: 58, displayValue: '58%' },
      { time: '10:00', value: 66, displayValue: '66%' },
      { time: '11:00', value: 71, displayValue: '71%' },
      { time: '12:00', value: 76, displayValue: '76%' },
      { time: '13:00', value: 78, displayValue: '78%' },
    ],
  },
  {
    id: 'fuel-a',
    title: 'Fuel Flow Sensor A',
    shortLabel: 'Fuel A',
    unit: 'L/min',
    value: '2.8 L/min',
    subtitle: 'Fuel intake flow is balanced',
    status: 'normal',
    accentColor: '#7D5FD6',
    chartValue: 67,
    metricLabel: 'Fuel input flow',
    lastUpdated: '2 min ago',
    threshold: 'Alert below 1.80 L/min',
    history: [
      { time: '08:00', value: 2.1, displayValue: '2.1 L/min' },
      { time: '09:00', value: 2.3, displayValue: '2.3 L/min' },
      { time: '10:00', value: 2.4, displayValue: '2.4 L/min' },
      { time: '11:00', value: 2.6, displayValue: '2.6 L/min' },
      { time: '12:00', value: 2.7, displayValue: '2.7 L/min' },
      { time: '13:00', value: 2.8, displayValue: '2.8 L/min' },
    ],
  },
  {
    id: 'fuel-b',
    title: 'Fuel Flow Sensor B',
    shortLabel: 'Fuel B',
    unit: 'L/min',
    value: '2.4 L/min',
    subtitle: 'Return flow shows no leakage',
    status: 'normal',
    accentColor: '#5567D9',
    chartValue: 64,
    metricLabel: 'Fuel return flow',
    lastUpdated: '2 min ago',
    threshold: 'Alert above 3.20 L/min',
    history: [
      { time: '08:00', value: 2.0, displayValue: '2.0 L/min' },
      { time: '09:00', value: 2.1, displayValue: '2.1 L/min' },
      { time: '10:00', value: 2.2, displayValue: '2.2 L/min' },
      { time: '11:00', value: 2.3, displayValue: '2.3 L/min' },
      { time: '12:00', value: 2.4, displayValue: '2.4 L/min' },
      { time: '13:00', value: 2.4, displayValue: '2.4 L/min' },
    ],
  },
  {
    id: 'gps',
    title: 'NEO-6M GPS Module',
    shortLabel: 'GPS',
    unit: 'sat',
    value: 'Locked',
    subtitle: 'Lat 12.9716, Lon 77.5946',
    status: 'normal',
    accentColor: '#43B39D',
    chartValue: 92,
    metricLabel: 'Satellite lock strength',
    lastUpdated: 'Just now',
    threshold: 'Alert below 4 satellites',
    history: [
      { time: '08:00', value: 5, displayValue: '5 satellites' },
      { time: '09:00', value: 6, displayValue: '6 satellites' },
      { time: '10:00', value: 7, displayValue: '7 satellites' },
      { time: '11:00', value: 8, displayValue: '8 satellites' },
      { time: '12:00', value: 8, displayValue: '8 satellites' },
      { time: '13:00', value: 9, displayValue: '9 satellites' },
    ],
  },
  {
    id: 'sos',
    title: 'SOS Button',
    shortLabel: 'SOS',
    unit: 'state',
    value: 'Standby',
    subtitle: 'Emergency trigger is armed',
    status: 'inactive',
    accentColor: '#EF6A4C',
    chartValue: 40,
    metricLabel: 'Trigger readiness',
    lastUpdated: '5 min ago',
    threshold: 'Alert when button is pressed',
    history: [
      { time: '08:00', value: 1, displayValue: 'Armed' },
      { time: '09:00', value: 1, displayValue: 'Armed' },
      { time: '10:00', value: 1, displayValue: 'Armed' },
      { time: '11:00', value: 1, displayValue: 'Armed' },
      { time: '12:00', value: 1, displayValue: 'Armed' },
      { time: '13:00', value: 1, displayValue: 'Standby' },
    ],
  },
];

const defaultMaintenanceRecords: MaintenanceRecord[] = [
  {
    id: 'maint-1',
    vehicleName: 'Pulsar NS 200',
    maintenanceType: 'Preventive Service',
    workDone: 'Engine diagnostics, brake cleaning, software reset',
    maintenanceDate: '2026-03-18',
    nextServiceDate: '2026-06-18',
    status: 'completed',
  },
];

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { vehicles, loading, refresh } = useVehicleData();
  const [showCharts, setShowCharts] = useState(true);
  const [selectedSensorId, setSelectedSensorId] = useState(sensorReadings[0].id);
  const [isSensorModalVisible, setIsSensorModalVisible] = useState(false);
  const [maintenanceEntries, setMaintenanceEntries] = useState<MaintenanceRecord[]>(defaultMaintenanceRecords);
  const [isMaintenanceModalVisible, setIsMaintenanceModalVisible] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormState>({
    vehicleName: 'Pulsar NS 200',
    maintenanceType: '',
    workDone: '',
    maintenanceDate: '',
    nextServiceDate: '',
    status: 'completed',
  });
  const screenWidth = Dimensions.get('window').width;
  const canRenderCharts = true;

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const selectedSensor = useMemo(
    () => sensorReadings.find((sensor) => sensor.id === selectedSensorId) ?? sensorReadings[0],
    [selectedSensorId]
  );
  const registeredVehicle = vehicles?.[0] ?? null;
  const registeredVehicleName = registeredVehicle
    ? `${registeredVehicle.make ?? ''} ${registeredVehicle.model ?? ''}`.trim() || 'My Vehicle'
    : 'Pulsar NS 200';
  const maintenanceStorageKey = `maintenance-records:${user?.id ?? 'guest'}`;

  useEffect(() => {
    const loadMaintenanceRecords = async () => {
      try {
        const stored = await AsyncStorage.getItem(maintenanceStorageKey);
        if (stored) {
          setMaintenanceEntries(JSON.parse(stored));
          return;
        }
      } catch {}

      setMaintenanceEntries(defaultMaintenanceRecords);
    };

    loadMaintenanceRecords().catch(() => {});
  }, [maintenanceStorageKey]);

  const fuelEfficiencyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [28, 30, 32, 29, 31, 33],
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['MPG'],
  };

  const vehicleMaintenanceRecords = registeredVehicle
    ? maintenanceEntries.map((record) => ({
        ...record,
        vehicleName: registeredVehicleName,
      }))
    : maintenanceEntries.slice(0, 1);
  const latestVehicleMaintenance = vehicleMaintenanceRecords[0] ?? null;

  const maintenanceData = {
    labels: vehicleMaintenanceRecords.map((record, index) => `Job ${index + 1}`),
    datasets: [
      {
        data: vehicleMaintenanceRecords.map((record) => {
          switch (record.status) {
            case 'completed':
              return 100;
            default:
              return 0;
          }
        }),
      },
    ],
  };

  const sensorChartData = {
    labels: sensorReadings.map((sensor) => sensor.shortLabel),
    datasets: [
      {
        data: sensorReadings.map((sensor) => sensor.chartValue),
      },
    ],
  };

  const sensorStatusDistribution = [
    {
      name: 'Normal',
      population: sensorReadings.filter((sensor) => sensor.status === 'normal').length,
      color: '#2FA8CC',
      legendFontColor: '#7F7F7F',
    },
    {
      name: 'Warning',
      population: sensorReadings.filter((sensor) => sensor.status === 'warning').length,
      color: '#F2A516',
      legendFontColor: '#7F7F7F',
    },
    {
      name: 'Inactive',
      population: sensorReadings.filter((sensor) => sensor.status === 'inactive').length,
      color: '#7A869A',
      legendFontColor: '#7F7F7F',
    },
  ];

  const topSensorData = {
    labels: [...sensorReadings]
      .sort((a, b) => b.chartValue - a.chartValue)
      .slice(0, 5)
      .map((sensor) => sensor.shortLabel),
    datasets: [
      {
        data: [...sensorReadings]
          .sort((a, b) => b.chartValue - a.chartValue)
          .slice(0, 5)
          .map((sensor) => sensor.chartValue),
      },
    ],
  };

  const environmentTrendData = {
    labels: selectedSensor.history.map((point) => point.time),
    datasets: [
      {
        data: sensorReadings.find((sensor) => sensor.id === 'temperature')?.history.map((point) => point.value) ?? [],
        color: (opacity = 1) => `rgba(59, 178, 115, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: sensorReadings.find((sensor) => sensor.id === 'sound')?.history.map((point) => point.value) ?? [],
        color: (opacity = 1) => `rgba(110, 156, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Temp', 'Sound'],
  };

  const fuelComparisonData = {
    labels: ['08', '09', '10', '11', '12', '13'],
    datasets: [
      {
        data: sensorReadings.find((sensor) => sensor.id === 'fuel-a')?.history.map((point) => point.value) ?? [],
        color: (opacity = 1) => `rgba(125, 95, 214, ${opacity})`,
      },
      {
        data: sensorReadings.find((sensor) => sensor.id === 'fuel-b')?.history.map((point) => point.value) ?? [],
        color: (opacity = 1) => `rgba(85, 103, 217, ${opacity})`,
      },
    ],
    legend: ['Fuel A', 'Fuel B'],
  };

  const selectedSensorHistoryChart = {
    labels: selectedSensor.history.map((point) => point.time),
    datasets: [
      {
        data: selectedSensor.history.map((point) => point.value),
        color: (opacity = 1) => hexToRgba(selectedSensor.accentColor, opacity),
        strokeWidth: 3,
      },
    ],
    legend: [selectedSensor.metricLabel],
  };

  const vehicleDistributionData = [
    {
      name: 'Active',
      population: vehicles?.filter((vehicle) => vehicle.status === 'active').length || 0,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
    },
    {
      name: 'Maintenance',
      population: vehicles?.filter((vehicle) => vehicle.status === 'maintenance').length || 0,
      color: '#FF9800',
      legendFontColor: '#7F7F7F',
    },
    {
      name: 'Inactive',
      population: vehicles?.filter((vehicle) => vehicle.status === 'inactive').length || 0,
      color: '#F44336',
      legendFontColor: '#7F7F7F',
    },
  ];

  const totalVehicles = registeredVehicle ? 1 : 0;
  const activeVehicles = registeredVehicle?.status === 'active' ? 1 : 0;
  const maintenanceDue = registeredVehicle?.nextMaintenance ? 1 : 0;
  const sensorsInAlert = sensorReadings.filter(
    (sensor) => sensor.status === 'warning' || sensor.status === 'critical'
  ).length;

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  const selectedSensorChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => hexToRgba(selectedSensor.accentColor, opacity),
  };

  const handleOpenSensorDetails = (sensorId: string) => {
    setSelectedSensorId(sensorId);
    setIsSensorModalVisible(true);
  };

  const handleOpenMaintenanceModal = (record?: MaintenanceRecord) => {
    setMaintenanceForm(
      record ?? {
        vehicleName: registeredVehicleName,
        maintenanceType: '',
        workDone: '',
        maintenanceDate: '',
        nextServiceDate: '',
        status: 'completed',
      }
    );
    setIsMaintenanceModalVisible(true);
  };

  const handleSaveMaintenance = async () => {
    const nextRecord: MaintenanceRecord = {
      id: maintenanceForm.id ?? `maint-${Date.now()}`,
      vehicleName: maintenanceForm.vehicleName || registeredVehicleName,
      maintenanceType: maintenanceForm.maintenanceType,
      workDone: maintenanceForm.workDone,
      maintenanceDate: maintenanceForm.maintenanceDate,
      nextServiceDate: maintenanceForm.nextServiceDate,
      status: maintenanceForm.status,
    };

    const nextEntries = maintenanceForm.id
      ? maintenanceEntries.map((record) => (record.id === maintenanceForm.id ? nextRecord : record))
      : [nextRecord, ...maintenanceEntries];

    setMaintenanceEntries(nextEntries);
    await AsyncStorage.setItem(maintenanceStorageKey, JSON.stringify(nextEntries));
    setIsMaintenanceModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        visible={isMaintenanceModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsMaintenanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {maintenanceForm.id ? 'Edit Maintenance' : 'Add Maintenance'}
                </Text>
                <Text style={styles.modalSubtitle}>Update vehicle service details for this user</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsMaintenanceModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                value={maintenanceForm.vehicleName}
                onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, vehicleName: value }))}
                placeholder="Vehicle Name"
              />
              <TextInput
                style={styles.input}
                value={maintenanceForm.maintenanceType}
                onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, maintenanceType: value }))}
                placeholder="Maintenance Type"
              />
              <TextInput
                style={[styles.input, styles.inputLarge]}
                value={maintenanceForm.workDone}
                onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, workDone: value }))}
                placeholder="Work Done"
                multiline
              />
              <TextInput
                style={styles.input}
                value={maintenanceForm.maintenanceDate}
                onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, maintenanceDate: value }))}
                placeholder="Maintenance Date YYYY-MM-DD"
              />
              <TextInput
                style={styles.input}
                value={maintenanceForm.nextServiceDate}
                onChangeText={(value) => setMaintenanceForm((current) => ({ ...current, nextServiceDate: value }))}
                placeholder="Next Service Date YYYY-MM-DD"
              />

              <View style={styles.statusOptionRow}>
                {(['completed', 'in-progress', 'scheduled'] as MaintenanceRecord['status'][]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      maintenanceForm.status === status && styles.statusOptionActive,
                    ]}
                    onPress={() => setMaintenanceForm((current) => ({ ...current, status }))}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        maintenanceForm.status === status && styles.statusOptionTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveMaintenance}>
                <Text style={styles.primaryButtonText}>Save Maintenance</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isSensorModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsSensorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedSensor.title}</Text>
                <Text style={styles.modalSubtitle}>{selectedSensor.subtitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsSensorModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailStatsRow}>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatLabel}>Current</Text>
                  <Text style={styles.detailStatValue}>{selectedSensor.value}</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatLabel}>Last Updated</Text>
                  <Text style={styles.detailStatValueSmall}>{selectedSensor.lastUpdated}</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatLabel}>Threshold</Text>
                  <Text style={styles.detailStatValueSmall}>{selectedSensor.threshold}</Text>
                </View>
              </View>

              <LineChart
                data={selectedSensorHistoryChart}
                width={Math.min(screenWidth - 48, 700)}
                height={240}
                chartConfig={selectedSensorChartConfig}
                bezier
                style={styles.chart}
              />

              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Previous {selectedSensor.title} Data</Text>
                <Text style={styles.historyHint}>Recent sensor values</Text>
              </View>

              {selectedSensor.history.map((point) => (
                <View key={`modal-${selectedSensor.id}-${point.time}`} style={styles.historyRow}>
                  <Text style={styles.historyTime}>{point.time}</Text>
                  <Text style={styles.historyValue}>{point.displayValue}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Vehicle Dashboard{user?.name ? `, ${user.name}` : ''}</Text>
            <Text style={styles.subGreeting}>Smart monitoring for all connected sensors</Text>
          </View>
          <TouchableOpacity style={styles.chartToggle} onPress={() => setShowCharts(!showCharts)}>
            <Text style={styles.chartToggleText}>{showCharts ? 'Hide Charts' : 'Show Charts'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Registered Vehicle</Text>
            <Text style={styles.cardValue}>{registeredVehicleName}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Active</Text>
            <Text style={styles.cardValue}>{activeVehicles}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sensor Alerts</Text>
            <Text style={styles.cardValue}>{sensorsInAlert}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Due Maint.</Text>
            <Text style={styles.cardValue}>{maintenanceDue}</Text>
          </View>
        </View>

        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>ESP32 Vehicle Health Monitoring</Text>
          <Text style={styles.bannerText}>
            Tap any sensor card or graph card below to open the full chart, current status, and
            previous readings for that particular module.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Sensor Monitor</Text>
            <Text style={styles.sectionSubtitle}>Tap a sensor to inspect detailed history</Text>
          </View>
          <View style={styles.sensorGrid}>
            {sensorReadings.map((sensor) => (
              <SensorCard
                key={sensor.id}
                title={sensor.title}
                value={sensor.value}
                subtitle={sensor.subtitle}
                status={sensor.status}
                accentColor={sensor.accentColor}
                onPress={() => handleOpenSensorDetails(sensor.id)}
                active={sensor.id === selectedSensor.id}
              />
            ))}
          </View>
        </View>

        {showCharts && canRenderCharts && (
          <View style={styles.chartsContainer}>
            <Text style={styles.sectionTitle}>Sensor Infographic Board</Text>
            <Text style={styles.sectionSubtitle}>Compact charts for quick dashboard scanning</Text>

            <View style={styles.infographicGrid}>
              <View style={styles.infographicCard}>
                <Text style={styles.chartTitle}>Sensor Status Mix</Text>
                <PieChart
                  data={sensorStatusDistribution}
                  width={screenWidth / 2 - 8}
                  height={170}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="12"
                  absolute
                />
              </View>

              <View style={styles.infographicCard}>
                <Text style={styles.chartTitle}>Top Sensor Scores</Text>
                <BarChart
                  data={topSensorData}
                  width={screenWidth / 2 - 8}
                  height={170}
                  chartConfig={chartConfig}
                  fromZero
                  showValuesOnTopOfBars
                  withInnerLines={false}
                  style={styles.miniChart}
                  yAxisLabel=""
                  yAxisSuffix="%"
                />
              </View>

              <View style={styles.infographicCardWide}>
                <Text style={styles.chartTitle}>Environment Trend</Text>
                <LineChart
                  data={environmentTrendData}
                  width={screenWidth - 72}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.miniChart}
                />
              </View>

              <View style={styles.infographicCardWide}>
                <Text style={styles.chartTitle}>Fuel Flow Comparison</Text>
                <BarChart
                  data={fuelComparisonData}
                  width={screenWidth - 72}
                  height={180}
                  chartConfig={chartConfig}
                  fromZero
                  style={styles.miniChart}
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>All Sensor Overview</Text>
              <BarChart
                data={sensorChartData}
                width={Math.max(screenWidth - 40, 360)}
                height={250}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix="%"
                showValuesOnTopOfBars
                fromZero
              />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Fuel Efficiency Trend</Text>
              <LineChart
                data={fuelEfficiencyData}
                width={screenWidth - 40}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                formatYLabel={(value) => `${value} MPG`}
              />
            </View>

            <View style={styles.chartCard}>
              <View style={styles.maintenanceHeaderRow}>
                <Text style={styles.chartTitle}>Maintenance Status by Vehicle</Text>
                <View style={styles.maintenanceActionRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleOpenMaintenanceModal(latestVehicleMaintenance ?? undefined)}
                  >
                    <Text style={styles.secondaryButtonText}>Edit Info</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleOpenMaintenanceModal()}
                  >
                    <Text style={styles.secondaryButtonText}>Add New</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <BarChart
                data={maintenanceData}
                width={screenWidth - 40}
                height={180}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix="%"
                showValuesOnTopOfBars
                fromZero
              />
              <Text style={styles.maintenanceSubtitle}>
                Shows how much of each vehicle maintenance job is completed.
              </Text>

              {vehicleMaintenanceRecords.map((record) => (
                <View key={record.id} style={styles.maintenanceRow}>
                  <View style={styles.maintenanceTopRow}>
                    <Text style={styles.maintenanceVehicle}>{record.vehicleName}</Text>
                    <View
                      style={[
                        styles.maintenanceBadge,
                        { backgroundColor: getMaintenanceStatusColor(record.status) },
                      ]}
                    >
                      <Text style={styles.maintenanceBadgeText}>{record.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.maintenanceText}>Type: {record.maintenanceType}</Text>
                  <Text style={styles.maintenanceText}>Work Done: {record.workDone}</Text>
                  <Text style={styles.maintenanceText}>
                    Maintenance Date: {formatDisplayDate(record.maintenanceDate)}
                  </Text>
                  <Text style={styles.maintenanceText}>
                    Next Service: {formatDisplayDate(record.nextServiceDate)}
                  </Text>
                </View>
              ))}
            </View>

            {totalVehicles > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Vehicle Status Distribution</Text>
                <PieChart
                  data={vehicleDistributionData}
                  width={screenWidth - 40}
                  height={180}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            )}
          </View>
        )}

        {showCharts && !canRenderCharts && (
          <View style={styles.chartFallbackCard}>
            <Text style={styles.chartTitle}>Insights</Text>
            <Text style={styles.chartFallbackText}>
              Dashboard charts are disabled on this platform to avoid rendering crashes.
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('VehicleDetail')}>
            <Text style={styles.actionText}>{registeredVehicle ? 'View Vehicle' : 'Add Vehicle'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Prediction')}>
            <Text style={styles.actionText}>Run Prediction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => refresh()}>
            <Text style={styles.actionText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Registered Vehicle</Text>
          {loading ? (
            <Text style={styles.small}>Loading...</Text>
          ) : registeredVehicle ? (
            <TouchableOpacity
              style={styles.vehicleRow}
              onPress={() => navigation.navigate('VehicleDetail', { id: registeredVehicle.id })}
            >
              <View style={styles.vehicleHeader}>
                <Text style={styles.vehicleTitle}>
                  {registeredVehicle.make ?? 'Unknown'} {registeredVehicle.model ?? ''}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(registeredVehicle.status) }]}>
                  <Text style={styles.statusText}>{registeredVehicle.status || 'Active'}</Text>
                </View>
              </View>
              <Text style={styles.vehicleMeta}>
                {registeredVehicle.year ?? ''} | {registeredVehicle.plateNumber ?? '-'} |
                {registeredVehicle.nextMaintenance
                  ? ` Next maint: ${new Date(registeredVehicle.nextMaintenance).toLocaleDateString()}`
                  : ' No maint. due'}
              </Text>
              {latestVehicleMaintenance && (
                <View style={styles.vehicleMaintenanceBox}>
                  <View style={styles.maintenanceActionRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleOpenMaintenanceModal(latestVehicleMaintenance)}
                    >
                      <Text style={styles.secondaryButtonText}>Edit Info</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleOpenMaintenanceModal()}
                    >
                      <Text style={styles.secondaryButtonText}>Add New</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.vehicleMaintenanceTitle}>Maintenance Work Details</Text>
                  <Text style={styles.vehicleMaintenanceText}>
                    Type: {latestVehicleMaintenance.maintenanceType}
                  </Text>
                  <Text style={styles.vehicleMaintenanceText}>
                    Work Done: {latestVehicleMaintenance.workDone}
                  </Text>
                  <Text style={styles.vehicleMaintenanceText}>
                    Date: {formatDisplayDate(latestVehicleMaintenance.maintenanceDate)}
                  </Text>
                  <Text style={styles.vehicleMaintenanceText}>
                    Status: {latestVehicleMaintenance.status}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleHeader}>
                <Text style={styles.vehicleTitle}>{registeredVehicleName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor('active') }]}>
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>
              <Text style={styles.vehicleMeta}>Bike | Demo registered vehicle for this user</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'active':
      return '#4CAF50';
    case 'maintenance':
      return '#FF9800';
    case 'inactive':
      return '#F44336';
    default:
      return '#4CAF50';
  }
};

const getMaintenanceStatusColor = (status: MaintenanceRecord['status']) => {
  switch (status) {
    case 'completed':
      return '#1E9E64';
    case 'in-progress':
      return '#F2A516';
    case 'scheduled':
      return '#5567D9';
    default:
      return '#7A869A';
  }
};

const formatDisplayDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

function hexToRgba(hex: string, opacity: number) {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: 4,
  },
  modalCloseButton: {
    backgroundColor: '#0A7EA4',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D7E0E8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 12,
    backgroundColor: '#F8FBFD',
  },
  inputLarge: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  statusOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    borderWidth: 1,
    borderColor: '#C9D8E3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  statusOptionActive: {
    backgroundColor: '#0A7EA4',
    borderColor: '#0A7EA4',
  },
  statusOptionText: {
    fontSize: 12,
    color: Colors.light.text,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#0A7EA4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subGreeting: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: 4,
  },
  chartToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E9F6FA',
    borderRadius: 999,
  },
  chartToggleText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 6,
  },
  bannerCard: {
    backgroundColor: '#0A7EA4',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#DFF4FB',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  liveBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  detailStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailStatBox: {
    width: '31%',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  detailStatLabel: {
    fontSize: 11,
    color: Colors.light.icon,
    marginBottom: 6,
  },
  detailStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  detailStatValueSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  historyHeader: {
    marginTop: 8,
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  historyHint: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F5',
  },
  historyTime: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  chartsContainer: {
    marginBottom: 20,
  },
  infographicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infographicCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  infographicCardWide: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  miniChart: {
    marginVertical: 0,
    borderRadius: 8,
  },
  chartFallbackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartFallbackText: {
    fontSize: 14,
    color: Colors.light.icon,
    lineHeight: 20,
  },
  maintenanceSubtitle: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 8,
    marginBottom: 12,
  },
  maintenanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  maintenanceActionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  maintenanceRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F5',
    paddingTop: 12,
    marginTop: 12,
  },
  maintenanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  maintenanceVehicle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  maintenanceBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  maintenanceBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  maintenanceText: {
    fontSize: 13,
    color: Colors.light.icon,
    lineHeight: 20,
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  vehicleRow: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  vehicleMeta: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 4,
  },
  vehicleMaintenanceBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F5',
  },
  secondaryButton: {
    backgroundColor: '#E9F6FA',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  secondaryButtonText: {
    color: '#0A7EA4',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleMaintenanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  vehicleMaintenanceText: {
    fontSize: 12,
    color: Colors.light.icon,
    lineHeight: 18,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  small: {
    color: Colors.light.icon,
    textAlign: 'center',
    padding: 20,
  },
});
