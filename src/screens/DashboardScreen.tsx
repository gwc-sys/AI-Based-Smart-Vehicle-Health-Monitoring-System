import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/context/ThemeContext';
import SensorCard from '@/components/SensorCard';
import SosAlertModal from '@/components/SosAlertModal';
import useAuth from '@/hooks/useAuth';
import { useVehicleData } from '@/hooks/useVehicleData';
import {
  HospitalAiRecommendation,
  isSosVehicleAlert,
  subscribeToVehicleAlerts,
  subscribeToVehicleReadings,
  subscribeToVehicleStatus,
  VehicleRealtimeAlert,
  VehicleRealtimeReading,
  VehicleRealtimeStatus,
} from '@/services/vehicleRealtimeService';
import { buildCallLink, buildDirectionsLink, buildGoogleMapsLink } from '@/services/emergencyConfigService';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Linking,
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

type SensorStatus = 'normal' | 'warning' | 'critical' | 'inactive';

type SensorHistoryPoint = {
  time: string;
  value: number;
  displayValue: string;
};

type DashboardSensor = {
  id: (typeof SENSOR_ORDER)[number];
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

type DashboardRealtimeAlert = {
  id: string;
  title: string;
  message: string;
  type: string;
  deviceId: string;
  receivedAt?: number;
  timestamp?: number;
  level: 'info' | 'warning' | 'critical';
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

const SENSOR_ORDER = [
  'accelerometer',
  'accel-x',
  'accel-y',
  'accel-z',
  'vibration',
  'sound',
  'light',
  'temperature',
  'heart-rate',
  'spo2',
  'motion',
  'tilt',
  'accident',
  'alarm',
] as const;

const defaultMaintenanceRecords: MaintenanceRecord[] = [];

function formatReadingLabel(timestamp: number | undefined, fallbackIndex: number) {
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    const normalizedTimestamp =
      timestamp > 1000000000000
        ? timestamp
        : timestamp > 1000000000
          ? timestamp * 1000
          : null;

    if (normalizedTimestamp) {
      return new Date(normalizedTimestamp).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  return `#${fallbackIndex + 1}`;
}

function inferReadingTime(
  reading: VehicleRealtimeReading,
  latestReading: VehicleRealtimeReading | undefined,
  fallbackIndex: number
) {
  const timestamp = reading.timestamp;

  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    if (timestamp > 1000000000000) {
      return formatReadingLabel(timestamp, fallbackIndex);
    }

    if (timestamp > 1000000000) {
      return formatReadingLabel(timestamp, fallbackIndex);
    }

    if (
      latestReading &&
      typeof latestReading.timestamp === 'number' &&
      Number.isFinite(latestReading.timestamp) &&
      typeof latestReading.receivedAt === 'number'
    ) {
      const offsetSeconds = latestReading.timestamp - timestamp;
      const inferredTime = latestReading.receivedAt - offsetSeconds * 1000;

      if (Number.isFinite(inferredTime) && inferredTime > 0) {
        return new Date(inferredTime).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
  }

  if (typeof reading.receivedAt === 'number' && Number.isFinite(reading.receivedAt)) {
    return new Date(reading.receivedAt).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return formatReadingLabel(timestamp, fallbackIndex);
}

function formatLiveTimestamp(timestamp?: number, receivedAt?: number) {
  const sourceTime =
    typeof timestamp === 'number' && timestamp > 1000000000 ? timestamp : receivedAt;

  if (typeof sourceTime !== 'number') {
    return 'Waiting';
  }

  const diffMs = Date.now() - sourceTime;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 5) {
    return 'just now';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds} sec ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toPercent(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function buildNumericHistory(
  readings: VehicleRealtimeReading[],
  selector: (reading: VehicleRealtimeReading) => number,
  unit: string,
  digits: number = 0
): SensorHistoryPoint[] {
  const latestReading = readings[readings.length - 1];

  return readings.map((reading, index) => {
    const value = selector(reading);
    return {
      time: inferReadingTime(reading, latestReading, index),
      value,
      displayValue: `${value.toFixed(digits)} ${unit}`.trim(),
    };
  });
}

function buildBooleanHistory(
  readings: VehicleRealtimeReading[],
  selector: (reading: VehicleRealtimeReading) => boolean,
  activeLabel: string,
  inactiveLabel: string
): SensorHistoryPoint[] {
  const latestReading = readings[readings.length - 1];

  return readings.map((reading, index) => {
    const enabled = selector(reading);
    return {
      time: inferReadingTime(reading, latestReading, index),
      value: enabled ? 100 : 0,
      displayValue: enabled ? activeLabel : inactiveLabel,
    };
  });
}

function createSensorReadings(
  readings: VehicleRealtimeReading[],
  alerts: VehicleRealtimeAlert[]
): DashboardSensor[] {
  const latest = readings[readings.length - 1];
  const lastUpdated = formatLiveTimestamp(latest?.timestamp, latest?.receivedAt);
  const hasData = Boolean(latest);
  const heartRateReadings = readings.filter(
    (reading) => typeof reading.heart_rate_bpm === 'number' && Number.isFinite(reading.heart_rate_bpm)
  );
  const spo2Readings = readings.filter(
    (reading) =>
      typeof reading.oxygen_saturation_spo2 === 'number' && Number.isFinite(reading.oxygen_saturation_spo2)
  );
  const latestHeartRateReading = heartRateReadings[heartRateReadings.length - 1];
  const latestSpo2Reading = spo2Readings[spo2Readings.length - 1];

  const createNumericSensor = ({
    id,
    title,
    shortLabel,
    unit,
    accentColor,
    metricLabel,
    threshold,
    value,
    history,
    status,
    subtitle,
    maxChartValue,
    digits = 0,
  }: {
    id: (typeof SENSOR_ORDER)[number];
    title: string;
    shortLabel: string;
    unit: string;
    accentColor: string;
    metricLabel: string;
    threshold: string;
    value: number;
    history: SensorHistoryPoint[];
    status: SensorStatus;
    subtitle: string;
    maxChartValue: number;
    digits?: number;
  }): DashboardSensor => ({
    id,
    title,
    shortLabel,
    unit,
    value: hasData ? `${value.toFixed(digits)} ${unit}`.trim() : '--',
    subtitle: hasData ? subtitle : 'Waiting for realtime database values',
    status: hasData ? status : 'inactive',
    accentColor,
    chartValue: hasData ? toPercent(value, maxChartValue) : 0,
    metricLabel,
    lastUpdated,
    threshold,
    history,
  });

  const accelValue = toNumber(latest?.accel_total_g);
  const accelXValue = toNumber(latest?.accel_x);
  const accelYValue = toNumber(latest?.accel_y);
  const accelZValue = toNumber(latest?.accel_z);
  const vibrationValue = toNumber(latest?.vibration);
  const soundValue = toNumber(latest?.sound);
  const lightValue = toNumber(latest?.light);
  const temperatureValue = toNumber(latest?.temperature);
  const heartRateValue = toNumber(latestHeartRateReading?.heart_rate_bpm);
  const heartRateValid = Boolean(latestHeartRateReading?.heart_rate_valid);
  const spo2Value = toNumber(latestSpo2Reading?.oxygen_saturation_spo2);
  const spo2Valid = Boolean(latestSpo2Reading?.spo2_valid);
  const motionActive = Boolean(latest?.motion_detected);
  const tiltActive = Boolean(latest?.tilt_detected);
  const accidentActive = Boolean(latest?.accident_detected);
  const alarmActive = Boolean(latest?.alarm);

  return [
    createNumericSensor({
      id: 'accelerometer',
      title: 'accel_total_g',
      shortLabel: 'Total G',
      unit: 'g',
      accentColor: '#48B6A3',
      metricLabel: 'Total acceleration',
      threshold: 'Alert above 1.20 g',
      value: accelValue,
      history: buildNumericHistory(readings, (reading) => toNumber(reading.accel_total_g), 'g', 2),
      status: accelValue > 1.2 ? 'critical' : accelValue > 0.6 ? 'warning' : 'normal',
      subtitle: 'Direct value from readings.accel_total_g',
      maxChartValue: 1.2,
      digits: 2,
    }),
    createNumericSensor({
      id: 'accel-x',
      title: 'accel_x',
      shortLabel: 'Accel X',
      unit: 'g',
      accentColor: '#2FA8CC',
      metricLabel: 'Acceleration X',
      threshold: 'Live axis reading',
      value: accelXValue,
      history: buildNumericHistory(readings, (reading) => toNumber(reading.accel_x), 'g', 2),
      status: Math.abs(accelXValue) > 1 ? 'warning' : 'normal',
      subtitle: 'Direct value from readings.accel_x',
      maxChartValue: 1.5,
      digits: 2,
    }),
    createNumericSensor({
      id: 'accel-y',
      title: 'accel_y',
      shortLabel: 'Accel Y',
      unit: 'g',
      accentColor: '#6E9CFF',
      metricLabel: 'Acceleration Y',
      threshold: 'Live axis reading',
      value: accelYValue,
      history: buildNumericHistory(readings, (reading) => toNumber(reading.accel_y), 'g', 2),
      status: Math.abs(accelYValue) > 1 ? 'warning' : 'normal',
      subtitle: 'Direct value from readings.accel_y',
      maxChartValue: 1.5,
      digits: 2,
    }),
    createNumericSensor({
      id: 'accel-z',
      title: 'accel_z',
      shortLabel: 'Accel Z',
      unit: 'g',
      accentColor: '#8C7CF6',
      metricLabel: 'Acceleration Z',
      threshold: 'Live axis reading',
      value: accelZValue,
      history: buildNumericHistory(readings, (reading) => toNumber(reading.accel_z), 'g', 2),
      status: Math.abs(accelZValue) > 1 ? 'warning' : 'normal',
      subtitle: 'Direct value from readings.accel_z',
      maxChartValue: 1.5,
      digits: 2,
    }),
    createNumericSensor({
      id: 'vibration',
      title: 'vibration',
      shortLabel: 'Vibration',
      unit: 'raw',
      accentColor: '#43B39D',
      metricLabel: 'Vibration',
      threshold: 'Direct sensor reading',
      value: vibrationValue,
      history: buildNumericHistory(readings, (reading) => toNumber(reading.vibration), 'raw'),
      status: vibrationValue > 100 ? 'critical' : vibrationValue > 30 ? 'warning' : 'normal',
      subtitle: 'Direct value from readings.vibration',
      maxChartValue: 150,
    }),
    createNumericSensor({
      id: 'sound',
      title: 'sound',
      shortLabel: 'Sound',
      unit: 'raw',
      accentColor: '#F4B740',
      metricLabel: 'Sound',
      threshold: 'Direct sensor reading',
      value: soundValue,
      history: buildNumericHistory(readings, (reading) => toNumber(reading.sound), 'raw'),
      status: soundValue > 3000 ? 'critical' : soundValue > 1800 ? 'warning' : 'normal',
      subtitle: 'Direct value from readings.sound',
      maxChartValue: 4000,
    }),
    createNumericSensor({
      id: 'light',
      title: 'light',
      shortLabel: 'Light',
      unit: 'raw',
      accentColor: '#F05D5E',
      metricLabel: 'Light',
      threshold: 'Direct sensor reading',
      value: lightValue,
      history: buildNumericHistory(readings, (reading) => toNumber(reading.light), 'raw'),
      status: lightValue < 30 ? 'critical' : lightValue < 100 ? 'warning' : 'normal',
      subtitle: 'Direct value from readings.light',
      maxChartValue: 800,
    }),
    createNumericSensor({
      id: 'temperature',
      title: 'temperature',
      shortLabel: 'Temp',
      unit: 'C',
      accentColor: '#3BB273',
      metricLabel: 'Temperature',
      threshold: 'Direct sensor reading',
      value: temperatureValue,
      history: buildNumericHistory(readings, (reading) => toNumber(reading.temperature), 'C', 1),
      status: temperatureValue > 90 ? 'critical' : temperatureValue > 60 ? 'warning' : 'normal',
      subtitle: 'Direct value from readings.temperature',
      maxChartValue: 100,
      digits: 1,
    }),
    {
      id: 'heart-rate',
      title: 'heart_rate_bpm',
      shortLabel: 'Heart',
      unit: 'bpm',
      value: latestHeartRateReading ? `${heartRateValue.toFixed(0)} bpm` : '--',
      subtitle: latestHeartRateReading
        ? heartRateValid
          ? 'Direct value from readings.heart_rate_bpm'
          : 'Signal present but heart rate is not yet valid'
        : 'Waiting for realtime database values',
      status: latestHeartRateReading
        ? !heartRateValid
          ? 'inactive'
          : heartRateValue > 120 || (heartRateValue > 0 && heartRateValue < 50)
            ? 'critical'
            : heartRateValue > 100 || heartRateValue < 60
              ? 'warning'
              : 'normal'
        : 'inactive',
      accentColor: '#E85D75',
      chartValue: latestHeartRateReading ? toPercent(heartRateValue, 180) : 0,
      metricLabel: 'Heart rate',
      lastUpdated: formatLiveTimestamp(latestHeartRateReading?.timestamp, latestHeartRateReading?.receivedAt),
      threshold: 'Healthy readings usually sit around 60-100 bpm',
      history: buildNumericHistory(heartRateReadings, (reading) => toNumber(reading.heart_rate_bpm), 'bpm'),
    },
    {
      id: 'spo2',
      title: 'oxygen_saturation_spo2',
      shortLabel: 'SpO2',
      unit: '%',
      value: latestSpo2Reading ? `${spo2Value.toFixed(0)} %` : '--',
      subtitle: latestSpo2Reading
        ? spo2Valid
          ? 'Direct value from readings.oxygen_saturation_spo2'
          : 'Signal present but SpO2 is not yet valid'
        : 'Waiting for realtime database values',
      status: latestSpo2Reading
        ? !spo2Valid
          ? 'inactive'
          : spo2Value > 0 && spo2Value < 90
            ? 'critical'
            : spo2Value > 0 && spo2Value < 95
              ? 'warning'
              : 'normal'
        : 'inactive',
      accentColor: '#2FA8CC',
      chartValue: latestSpo2Reading ? toPercent(spo2Value, 100) : 0,
      metricLabel: 'Oxygen saturation',
      lastUpdated: formatLiveTimestamp(latestSpo2Reading?.timestamp, latestSpo2Reading?.receivedAt),
      threshold: 'Healthy readings are usually 95% and above',
      history: buildNumericHistory(
        spo2Readings,
        (reading) => toNumber(reading.oxygen_saturation_spo2),
        '%'
      ),
    },
    {
      id: 'motion',
      title: 'motion_detected',
      shortLabel: 'Motion',
      unit: 'state',
      value: hasData ? String(motionActive) : '--',
      subtitle: hasData ? 'Direct value from readings.motion_detected' : 'Waiting for realtime database values',
      status: hasData ? (motionActive ? 'warning' : 'normal') : 'inactive',
      accentColor: '#F4B740',
      chartValue: hasData ? (motionActive ? 100 : 0) : 0,
      metricLabel: 'Motion detected',
      lastUpdated,
      threshold: 'Boolean value',
      history: buildBooleanHistory(readings, (reading) => Boolean(reading.motion_detected), 'true', 'false'),
    },
    {
      id: 'tilt',
      title: 'tilt_detected',
      shortLabel: 'Tilt',
      unit: 'state',
      value: hasData ? String(tiltActive) : '--',
      subtitle: hasData ? 'Direct value from readings.tilt_detected' : 'Waiting for realtime database values',
      status: hasData ? (tiltActive ? 'critical' : 'normal') : 'inactive',
      accentColor: '#5567D9',
      chartValue: hasData ? (tiltActive ? 100 : 0) : 0,
      metricLabel: 'Tilt detected',
      lastUpdated,
      threshold: 'Boolean value',
      history: buildBooleanHistory(readings, (reading) => Boolean(reading.tilt_detected), 'true', 'false'),
    },
    {
      id: 'accident',
      title: 'accident_detected',
      shortLabel: 'Accident',
      unit: 'state',
      value: hasData ? String(accidentActive) : '--',
      subtitle: hasData ? 'Direct value from readings.accident_detected' : 'Waiting for realtime database values',
      status: hasData ? (accidentActive ? 'critical' : 'normal') : 'inactive',
      accentColor: '#D84C4C',
      chartValue: hasData ? (accidentActive ? 100 : 0) : 0,
      metricLabel: 'Accident detected',
      lastUpdated,
      threshold: 'Boolean value',
      history: buildBooleanHistory(readings, (reading) => Boolean(reading.accident_detected), 'true', 'false'),
    },
    {
      id: 'alarm',
      title: 'alarm',
      shortLabel: 'Alarm',
      unit: 'state',
      value: hasData ? String(alarmActive) : '--',
      subtitle: hasData ? 'Direct value from readings.alarm' : 'Waiting for realtime database values',
      status: hasData ? (alarmActive ? 'critical' : 'inactive') : 'inactive',
      accentColor: '#EF6A4C',
      chartValue: hasData ? (alarmActive ? 100 : 0) : 0,
      metricLabel: 'Alarm state',
      lastUpdated,
      threshold: 'Boolean value',
      history: buildBooleanHistory(readings, (reading) => Boolean(reading.alarm), 'true', 'false'),
    },
  ];
}

function buildChartSeries(points: SensorHistoryPoint[]) {
  if (points.length === 0) {
    return {
      labels: ['No Data'],
      values: [0],
    };
  }

  return {
    labels: points.map((point, index) => formatChartAxisLabel(point.time, index, points.length)),
    values: points.map((point) => point.value),
  };
}

function formatChartAxisLabel(label: string, index: number, total: number) {
  if (label === 'No Data') {
    return label;
  }

  const compactLabel = label.includes(',')
    ? label.split(',').slice(-1)[0].trim()
    : label;

  const maxVisibleLabels = total > 10 ? 4 : total > 6 ? 5 : 6;
  const interval = Math.max(1, Math.ceil(total / maxVisibleLabels));

  return index % interval === 0 || index === total - 1 ? compactLabel : '';
}

function mapDashboardAlert(alert: VehicleRealtimeAlert): DashboardRealtimeAlert {
  const normalizedType = String(alert.type ?? 'info').toLowerCase();
  const isSos = isSosVehicleAlert(alert);
  const level =
    isSos
      ? 'critical'
      : normalizedType === 'vibration'
        ? 'warning'
        : normalizedType === 'accident'
          ? 'critical'
          : 'info';

  return {
    id: alert.id ?? `${normalizedType}-${alert.timestamp ?? Date.now()}`,
    title:
      isSos
        ? 'SOS Emergency'
        : normalizedType === 'vibration'
          ? 'Vibration Alert'
          : normalizedType.toUpperCase(),
    message: alert.message ?? alert.type ?? 'Vehicle alert received',
    type: isSos ? 'sos' : normalizedType,
    deviceId: alert.device_name ?? alert.device_id ?? 'Unknown device',
    receivedAt: alert.receivedAt,
    timestamp: alert.timestamp,
    level,
  };
}

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { vehicles, loading, refresh } = useVehicleData();
  const [showCharts, setShowCharts] = useState(true);
  const [realtimeReadings, setRealtimeReadings] = useState<VehicleRealtimeReading[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<VehicleRealtimeStatus | null>(null);
  const [realtimeAlerts, setRealtimeAlerts] = useState<VehicleRealtimeAlert[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<(typeof SENSOR_ORDER)[number]>('accelerometer');
  const [isSensorModalVisible, setIsSensorModalVisible] = useState(false);
  const [isSosModalVisible, setIsSosModalVisible] = useState(false);
  const lastSosIdRef = React.useRef<string | null>(null);
  const sosHydratedRef = React.useRef(false);
  const [maintenanceEntries, setMaintenanceEntries] = useState<MaintenanceRecord[]>(defaultMaintenanceRecords);
  const [isMaintenanceModalVisible, setIsMaintenanceModalVisible] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormState>({
    vehicleName: '',
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

  useEffect(() => {
    const unsubscribeReadings = subscribeToVehicleReadings(setRealtimeReadings);
    const unsubscribeStatus = subscribeToVehicleStatus(setDeviceStatus);
    const unsubscribeAlerts = subscribeToVehicleAlerts((alerts) => {
      setRealtimeAlerts(alerts);

      const nextSosAlert = alerts.find(isSosVehicleAlert) ?? null;
      const nextSosKey = nextSosAlert
        ? `${nextSosAlert.id ?? 'no-id'}|${nextSosAlert.last_updated ?? nextSosAlert.timestamp ?? 'no-time'}`
        : null;

      // First stabilized snapshot is baseline only; do not show stale SOS from previous sessions.
      if (!sosHydratedRef.current) {
        lastSosIdRef.current = nextSosKey;
        sosHydratedRef.current = true;
        return;
      }

      if (nextSosKey && nextSosKey !== lastSosIdRef.current) {
        setIsSosModalVisible(true);
      } else if (!nextSosKey) {
        setIsSosModalVisible(false);
      }

      lastSosIdRef.current = nextSosKey;
    });

    return () => {
      unsubscribeReadings();
      unsubscribeStatus();
      unsubscribeAlerts();
    };
  }, []);

  const sensorReadings = useMemo(
    () => createSensorReadings(realtimeReadings, realtimeAlerts),
    [realtimeAlerts, realtimeReadings]
  );

  useEffect(() => {
    if (!sensorReadings.some((sensor) => sensor.id === selectedSensorId)) {
      setSelectedSensorId((sensorReadings[0]?.id as (typeof SENSOR_ORDER)[number]) ?? 'accelerometer');
    }
  }, [selectedSensorId, sensorReadings]);

  const selectedSensor = useMemo(
    () => sensorReadings.find((sensor) => sensor.id === selectedSensorId) ?? sensorReadings[0],
    [selectedSensorId, sensorReadings]
  );
  const dashboardAlerts = useMemo(
    () => realtimeAlerts.map(mapDashboardAlert).slice(0, 5),
    [realtimeAlerts]
  );
  const latestSosAlert = useMemo(
    () => dashboardAlerts.find((alert) => alert.type === 'sos') ?? null,
    [dashboardAlerts]
  );
  const latestRealtimeReading = realtimeReadings[realtimeReadings.length - 1] ?? null;
  const latestHeartReading = useMemo(
    () =>
      [...realtimeReadings]
        .reverse()
        .find(
          (reading) =>
            typeof reading.heart_rate_bpm === 'number' && Number.isFinite(reading.heart_rate_bpm)
        ) ?? null,
    [realtimeReadings]
  );
  const latestSpo2Reading = useMemo(
    () =>
      [...realtimeReadings]
        .reverse()
        .find(
          (reading) =>
            typeof reading.oxygen_saturation_spo2 === 'number' &&
            Number.isFinite(reading.oxygen_saturation_spo2)
        ) ?? null,
    [realtimeReadings]
  );
  const latestAiAlert = useMemo(() => {
    const current = realtimeAlerts.find((alert) => alert.fromCurrentEmergency);
    if (current) return current;
    const sos = realtimeAlerts.find((alert) => isSosVehicleAlert(alert));
    if (sos) return sos;
    return realtimeAlerts[0] ?? null;
  }, [realtimeAlerts]);
  const heartRateValid = Boolean(latestHeartReading?.heart_rate_valid);
  const spo2Valid = Boolean(latestSpo2Reading?.spo2_valid);
  const heartRateRawValue = latestHeartReading?.heart_rate_bpm;
  const spo2RawValue = latestSpo2Reading?.oxygen_saturation_spo2;
  const heartRateDisplay =
    typeof heartRateRawValue === 'number' && Number.isFinite(heartRateRawValue)
      ? `${heartRateRawValue.toFixed(0)} bpm`
      : '--';
  const spo2Display =
    typeof spo2RawValue === 'number' && Number.isFinite(spo2RawValue)
      ? `${spo2RawValue.toFixed(0)}%`
      : '--';
  const lastLocationReading = useMemo(
    () =>
      [...realtimeReadings]
        .reverse()
        .find(
          (reading) =>
            typeof reading.gps_lat === 'number' &&
            Number.isFinite(reading.gps_lat) &&
            typeof reading.gps_lon === 'number' &&
            Number.isFinite(reading.gps_lon)
        ) ?? null,
    [realtimeReadings]
  );
  const aiHospital = useMemo(() => {
    if (!latestAiAlert) return null;
    const source = latestAiAlert.aiHospital;
    const fallback: HospitalAiRecommendation = {
      name: latestAiAlert.hospital_name,
      address: latestAiAlert.hospital_address,
      distance_km: latestAiAlert.hospital_distance_km,
      emergency_available: latestAiAlert.hospital_emergency_available,
      phone: latestAiAlert.hospital_phone,
      map_url: latestAiAlert.hospital_map_url,
      latitude: latestAiAlert.hospital_latitude,
      longitude: latestAiAlert.hospital_longitude,
    };
    const hasFallback =
      fallback.name ||
      fallback.address ||
      typeof fallback.distance_km === 'number' ||
      fallback.phone ||
      fallback.map_url;
    return source ?? (hasFallback ? fallback : null);
  }, [latestAiAlert]);
  const aiHeartRateDisplay =
    typeof latestAiAlert?.heart_rate_bpm === 'number' && Number.isFinite(latestAiAlert.heart_rate_bpm)
      ? `${latestAiAlert.heart_rate_bpm.toFixed(0)} bpm`
      : '--';
  const aiSpo2Display =
    typeof latestAiAlert?.spo2 === 'number' && Number.isFinite(latestAiAlert.spo2)
      ? `${latestAiAlert.spo2.toFixed(0)}%`
      : '--';
  const aiFingerDetected = latestAiAlert?.finger_detected;
  const aiLastUpdatedLabel = formatLiveTimestamp(
    latestAiAlert?.last_updated ?? latestAiAlert?.timestamp,
    latestAiAlert?.receivedAt
  );
  const aiMapUrl =
    aiHospital?.map_url ||
    (typeof aiHospital?.latitude === 'number' &&
    typeof aiHospital?.longitude === 'number'
      ? buildGoogleMapsLink(aiHospital.latitude, aiHospital.longitude)
      : undefined);
  const aiDirectionsUrl =
    typeof aiHospital?.latitude === 'number' &&
    typeof aiHospital?.longitude === 'number' &&
    typeof lastLocationReading?.gps_lat === 'number' &&
    typeof lastLocationReading?.gps_lon === 'number'
      ? buildDirectionsLink(
          lastLocationReading.gps_lat,
          lastLocationReading.gps_lon,
          aiHospital.latitude,
          aiHospital.longitude
        )
      : undefined;
  const aiCallUrl = aiHospital?.phone ? buildCallLink(aiHospital.phone) : undefined;

  const registeredVehicle = vehicles?.[0] ?? null;
  const registeredVehicleName = registeredVehicle
    ? `${registeredVehicle.make ?? ''} ${registeredVehicle.model ?? ''}`.trim() || 'My Vehicle'
    : deviceStatus?.device_id ?? 'No vehicle added';
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

      setMaintenanceEntries([]);
    };

    loadMaintenanceRecords().catch(() => {});
  }, [maintenanceStorageKey]);

  const vehicleMaintenanceRecords = registeredVehicle
    ? maintenanceEntries.map((record) => ({
        ...record,
        vehicleName: registeredVehicleName,
      }))
    : maintenanceEntries;
  const latestVehicleMaintenance = vehicleMaintenanceRecords[0] ?? null;
  const temperatureSensor = sensorReadings.find((sensor) => sensor.id === 'temperature');
  const soundSensor = sensorReadings.find((sensor) => sensor.id === 'sound');
  const vibrationSensor = sensorReadings.find((sensor) => sensor.id === 'vibration');
  const lightSensor = sensorReadings.find((sensor) => sensor.id === 'light');
  const motionSensor = sensorReadings.find((sensor) => sensor.id === 'motion');
  const tiltSensor = sensorReadings.find((sensor) => sensor.id === 'tilt');

  const maintenanceData = {
    labels: vehicleMaintenanceRecords.length
      ? vehicleMaintenanceRecords.map((record, index) => `Job ${index + 1}`)
      : ['No Data'],
    datasets: [
      {
        data: vehicleMaintenanceRecords.length
          ? vehicleMaintenanceRecords.map((record) => {
              switch (record.status) {
                case 'completed':
                  return 100;
                case 'in-progress':
                  return 60;
                case 'scheduled':
                  return 20;
                default:
                  return 0;
              }
            })
          : [0],
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
      legendFontColor: colors.icon,
    },
    {
      name: 'Warning',
      population: sensorReadings.filter((sensor) => sensor.status === 'warning').length,
      color: '#F2A516',
      legendFontColor: colors.icon,
    },
    {
      name: 'Critical',
      population: sensorReadings.filter((sensor) => sensor.status === 'critical').length,
      color: '#D84C4C',
      legendFontColor: colors.icon,
    },
    {
      name: 'Inactive',
      population: sensorReadings.filter((sensor) => sensor.status === 'inactive').length,
      color: '#7A869A',
      legendFontColor: colors.icon,
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

  const environmentSeries = buildChartSeries(temperatureSensor?.history ?? []);
  const soundSeries = buildChartSeries(soundSensor?.history ?? []);
  const movementSeries = buildChartSeries(vibrationSensor?.history ?? []);
  const lightSeries = buildChartSeries(lightSensor?.history ?? []);
  const safetySeries = buildChartSeries(motionSensor?.history ?? []);
  const tiltSeries = buildChartSeries(tiltSensor?.history ?? []);
  const selectedSensorSeries = buildChartSeries(selectedSensor?.history ?? []);
  const selectedSensorHistoryRows = [...(selectedSensor?.history ?? [])].reverse();

  const environmentTrendData = {
    labels: environmentSeries.labels,
    datasets: [
      {
        data: environmentSeries.values,
        color: (opacity = 1) => `rgba(59, 178, 115, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: soundSeries.values,
        color: (opacity = 1) => `rgba(110, 156, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Temp', 'Sound'],
  };

  const movementComparisonData = {
    labels: movementSeries.labels,
    datasets: [
      {
        data: movementSeries.values,
        color: (opacity = 1) => `rgba(125, 95, 214, ${opacity})`,
      },
      {
        data: lightSeries.values,
        color: (opacity = 1) => `rgba(85, 103, 217, ${opacity})`,
      },
    ],
    legend: ['Vibration', 'Light'],
  };

  const selectedSensorHistoryChart = {
    labels: selectedSensorSeries.labels,
    datasets: [
      {
        data: selectedSensorSeries.values,
        color: (opacity = 1) => hexToRgba(selectedSensor.accentColor, opacity),
        strokeWidth: 3,
      },
    ],
    legend: [selectedSensor.metricLabel],
  };

  const safetySignalData = {
    labels: safetySeries.labels,
    datasets: [
      {
        data: safetySeries.values,
        color: (opacity = 1) => `rgba(244, 183, 64, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: tiltSeries.values,
        color: (opacity = 1) => `rgba(240, 93, 94, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Motion', 'Tilt'],
  };

  const vehicleDistributionData = [
    {
      name: 'Active',
      population: vehicles?.filter((vehicle) => vehicle.status === 'active').length || 0,
      color: '#4CAF50',
      legendFontColor: colors.icon,
    },
    {
      name: 'Maintenance',
      population: vehicles?.filter((vehicle) => vehicle.status === 'maintenance').length || 0,
      color: '#FF9800',
      legendFontColor: colors.icon,
    },
    {
      name: 'Inactive',
      population: vehicles?.filter((vehicle) => vehicle.status === 'inactive').length || 0,
      color: '#F44336',
      legendFontColor: colors.icon,
    },
  ];

  const totalVehicles = registeredVehicle ? 1 : 0;
  const maintenanceDue = registeredVehicle?.nextMaintenance ? 1 : 0;
  const sensorsInAlert = sensorReadings.filter(
    (sensor) => sensor.status === 'warning' || sensor.status === 'critical'
  ).length;
  const criticalRealtimeAlerts = dashboardAlerts.filter((alert) => alert.level === 'critical').length;
  const currentDeviceStatus = deviceStatus?.status ?? 'offline';

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => hexToRgba(colors.tint, opacity),
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => hexToRgba(colors.text, opacity),
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

  const handleOpenLink = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return;
      await Linking.openURL(url);
    } catch {
      // no-op
    }
  };

  const handleOpenSensorDetails = (sensorId: (typeof SENSOR_ORDER)[number]) => {
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
                verticalLabelRotation={18}
                xLabelsOffset={-6}
              />

              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Previous {selectedSensor.title} Data</Text>
                <Text style={styles.historyHint}>Recent sensor values</Text>
              </View>

              {selectedSensorHistoryRows.map((point) => (
                <View key={`modal-${selectedSensor.id}-${point.time}`} style={styles.historyRow}>
                  <Text style={styles.historyTime}>{point.time}</Text>
                  <Text style={styles.historyValue}>{point.displayValue}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <SosAlertModal
        visible={isSosModalVisible && Boolean(latestSosAlert)}
        onClose={() => setIsSosModalVisible(false)}
        alert={latestSosAlert}
        reading={latestRealtimeReading ?? null}
        fallbackLocationReading={lastLocationReading}
        deviceId={deviceStatus?.device_id ?? null}
      />

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
            <Text style={styles.cardLabel}>Connected Device</Text>
            <Text style={styles.cardValue}>{registeredVehicleName}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Device Status</Text>
            <Text style={styles.cardValue}>{currentDeviceStatus}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sensor Alerts</Text>
            <Text style={styles.cardValue}>{sensorsInAlert + dashboardAlerts.length}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Due Maint.</Text>
            <Text style={styles.cardValue}>{maintenanceDue}</Text>
          </View>
        </View>

        <View style={styles.healthSummaryPanel}>
          <View style={styles.healthSummaryGlowPrimary} />
          <View style={styles.healthSummaryGlowSecondary} />

          <View style={styles.healthSummaryHeader}>
            <View>
              <Text style={styles.healthSummaryEyebrow}>AI Health Layer</Text>
              <Text style={styles.healthSummaryTitle}>Semantic Vitals Overview</Text>
              <Text style={styles.healthSummarySubtext}>
                Interpreted live signals from the wearable sensor stream
              </Text>
            </View>
            <View style={styles.healthSummaryCluster}>
              <View style={styles.healthSummaryClusterDot} />
              <View style={styles.healthSummaryClusterDot} />
              <View style={styles.healthSummaryClusterDotLarge} />
            </View>
          </View>

          <View style={styles.healthSummaryRow}>
            <TouchableOpacity
              style={[styles.healthSummaryCard, styles.healthSummaryCardHeart]}
              activeOpacity={0.88}
              onPress={() => handleOpenSensorDetails('heart-rate')}
            >
              <View style={styles.healthSummaryMetricTop}>
                <Text style={styles.healthSummaryLabel}>heart_rate_bpm</Text>
                <View style={styles.healthSummaryPill}>
                  <Text style={styles.healthSummaryPillText}>{heartRateValid ? 'Stable' : 'Pending'}</Text>
                </View>
              </View>
              <Text style={styles.healthSummaryValue}>{heartRateDisplay}</Text>
              <Text style={styles.healthSummaryHint}>
                {heartRateValid ? 'Pulse classification active' : 'Awaiting a valid pulse window'}
              </Text>
              <View style={styles.healthSummarySignalRow}>
                <View style={styles.healthSummarySignalBarShort} />
                <View style={styles.healthSummarySignalBarMedium} />
                <View style={styles.healthSummarySignalBarTall} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.healthSummaryCard, styles.healthSummaryCardSpo2]}
              activeOpacity={0.88}
              onPress={() => handleOpenSensorDetails('spo2')}
            >
              <View style={styles.healthSummaryMetricTop}>
                <Text style={styles.healthSummaryLabel}>oxygen_saturation_spo2</Text>
                <View style={styles.healthSummaryPill}>
                  <Text style={styles.healthSummaryPillText}>{spo2Valid ? 'Stable' : 'Pending'}</Text>
                </View>
              </View>
              <Text style={styles.healthSummaryValue}>{spo2Display}</Text>
              <Text style={styles.healthSummaryHint}>
                {spo2Valid ? 'Oxygen signal inference active' : 'Awaiting a valid oxygen sample'}
              </Text>
              <View style={styles.healthSummarySignalRow}>
                <View style={styles.healthSummarySignalBarShort} />
                <View style={styles.healthSummarySignalBarTall} />
                <View style={styles.healthSummarySignalBarMedium} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {latestSosAlert && (
          <TouchableOpacity style={styles.sosBanner} onPress={() => setIsSosModalVisible(true)}>
            <View>
              <Text style={styles.sosBannerTitle}>SOS Emergency Active</Text>
              <Text style={styles.sosBannerText}>{latestSosAlert.message}</Text>
            </View>
            <Text style={styles.sosBannerAction}>Open</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.section, styles.liveMonitorPanel]}>
          <View style={styles.liveMonitorGlowPrimary} />
          <View style={styles.liveMonitorGlowSecondary} />
          <View style={styles.liveMonitorHeader}>
            <View>
              <Text style={styles.liveMonitorEyebrow}>AI Health Layer</Text>
              <Text style={styles.liveMonitorTitle}>Live Sensor Monitor</Text>
              <Text style={styles.liveMonitorSubtitle}>
                Interpreted live signals from the connected vehicle stream
              </Text>
            </View>
            <View style={styles.liveMonitorCluster}>
              <View style={styles.liveMonitorClusterDot} />
              <View style={styles.liveMonitorClusterDot} />
              <View style={styles.liveMonitorClusterDotLarge} />
            </View>
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
                  verticalLabelRotation={18}
                  xLabelsOffset={-4}
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
                  verticalLabelRotation={18}
                  xLabelsOffset={-4}
                />
              </View>

              <View style={styles.infographicCardWide}>
                <Text style={styles.chartTitle}>Vibration vs Light</Text>
                <BarChart
                  data={movementComparisonData}
                  width={screenWidth - 72}
                  height={180}
                  chartConfig={chartConfig}
                  fromZero
                  style={styles.miniChart}
                  yAxisLabel=""
                  yAxisSuffix=""
                  verticalLabelRotation={18}
                  xLabelsOffset={-4}
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
                verticalLabelRotation={18}
                xLabelsOffset={-6}
              />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Motion and Tilt Signals</Text>
              <LineChart
                data={safetySignalData}
                width={screenWidth - 40}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                verticalLabelRotation={18}
                xLabelsOffset={-4}
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
                verticalLabelRotation={18}
                xLabelsOffset={-4}
              />
              <Text style={styles.maintenanceSubtitle}>
                Maintenance records stored locally for this signed-in user.
              </Text>

              {vehicleMaintenanceRecords.length === 0 ? (
                <Text style={styles.maintenanceText}>No maintenance records added yet.</Text>
              ) : vehicleMaintenanceRecords.map((record) => (
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
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentDeviceStatus) }]}>
                  <Text style={styles.statusText}>{currentDeviceStatus}</Text>
                </View>
              </View>
              <Text style={styles.vehicleMeta}>
                No vehicle profile found locally. Realtime device data is still streaming from Firebase.
              </Text>
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
    case 'online':
      return '#4CAF50';
    case 'maintenance':
      return '#FF9800';
    case 'inactive':
    case 'offline':
      return '#F44336';
    default:
      return '#7A869A';
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

const formatDisplayDate = (value: string) => {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function hexToRgba(hex: string, opacity: number) {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function formatDateString(value?: string) {
  if (!value) {
    return 'Awaiting selection';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 760,
      maxHeight: '88%',
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      shadowColor: colors.shadow,
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
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.icon,
      marginTop: 4,
    },
    modalCloseButton: {
      backgroundColor: colors.tint,
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
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
      marginBottom: 12,
      backgroundColor: colors.inputBackground,
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
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.card,
    },
    statusOptionActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    statusOptionText: {
      fontSize: 12,
      color: colors.text,
      textTransform: 'capitalize',
      fontWeight: '600',
    },
    statusOptionTextActive: {
      color: '#fff',
    },
    primaryButton: {
      backgroundColor: colors.tint,
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
      gap: 2,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 18,
      gap: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.7,
    },
    subGreeting: {
      fontSize: 13,
      color: colors.icon,
      marginTop: 6,
      lineHeight: 19,
    },
    chartToggle: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: hexToRgba(colors.card, 0.62),
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chartToggleText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '700',
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    card: {
      width: '48%',
      backgroundColor: hexToRgba(colors.card, 0.9),
      marginBottom: 12,
      padding: 16,
      borderRadius: 22,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 3,
      overflow: 'hidden',
    },
    cardLabel: {
      fontSize: 12,
      color: colors.icon,
      textAlign: 'left',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
    },
    cardValue: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginTop: 10,
    },
    healthSummaryPanel: {
      marginBottom: 20,
      borderRadius: 28,
      padding: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 4,
      overflow: 'hidden',
      position: 'relative',
    },
    healthSummaryGlowPrimary: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 999,
      top: -90,
      right: -40,
      backgroundColor: 'rgba(47, 168, 204, 0.12)',
    },
    healthSummaryGlowSecondary: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 999,
      bottom: -90,
      left: -30,
      backgroundColor: 'rgba(232, 93, 117, 0.12)',
    },
    healthSummaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      gap: 16,
    },
    healthSummaryEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.icon,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    healthSummaryTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    healthSummarySubtext: {
      fontSize: 12,
      color: colors.icon,
      marginTop: 4,
      lineHeight: 18,
      maxWidth: 360,
    },
    healthSummaryCluster: {
      width: 72,
      height: 72,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: hexToRgba(colors.card, 0.45),
      position: 'relative',
    },
    healthSummaryClusterDot: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: '#2FA8CC',
      top: 18,
      left: 18,
    },
    healthSummaryClusterDotLarge: {
      width: 16,
      height: 16,
      borderRadius: 999,
      backgroundColor: '#E85D75',
    },
    healthSummaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    },
    healthSummaryCard: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '48%',
      minWidth: 240,
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderWidth: 1,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    healthSummaryCardHeart: {
      backgroundColor: 'rgba(232, 93, 117, 0.08)',
      borderColor: 'rgba(232, 93, 117, 0.26)',
    },
    healthSummaryCardSpo2: {
      backgroundColor: 'rgba(47, 168, 204, 0.08)',
      borderColor: 'rgba(47, 168, 204, 0.26)',
    },
    healthSummaryMetricTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 10,
    },
    healthSummaryLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.icon,
    },
    healthSummaryPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    healthSummaryPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    healthSummaryValue: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.8,
    },
    healthSummaryHint: {
      fontSize: 12,
      color: colors.icon,
      lineHeight: 18,
    },
    healthSummarySignalRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      marginTop: 14,
    },
    healthSummarySignalBarShort: {
      width: 8,
      height: 16,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.28)',
    },
    healthSummarySignalBarMedium: {
      width: 8,
      height: 26,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.45)',
    },
    healthSummarySignalBarTall: {
      width: 8,
      height: 38,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.78)',
    },
    sosBanner: {
      backgroundColor: 'rgba(92, 26, 32, 0.42)',
      borderRadius: 24,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 90, 82, 0.26)',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 3,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sosBannerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFD5D2',
      marginBottom: 4,
    },
    sosBannerText: {
      fontSize: 13,
      color: '#F7B9B4',
      lineHeight: 18,
      maxWidth: 260,
    },
    sosBannerAction: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
      backgroundColor: 'rgba(255, 90, 82, 0.82)',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
    },
    section: {
      marginBottom: 22,
      backgroundColor: hexToRgba(colors.card, 0.74),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 28,
      padding: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 3,
    },
    liveMonitorPanel: {
      overflow: 'hidden',
      position: 'relative',
      paddingTop: 20,
    },
    liveMonitorGlowPrimary: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 999,
      top: -92,
      right: -36,
      backgroundColor: 'rgba(47, 168, 204, 0.12)',
    },
    liveMonitorGlowSecondary: {
      position: 'absolute',
      width: 190,
      height: 190,
      borderRadius: 999,
      bottom: -98,
      left: -42,
      backgroundColor: 'rgba(232, 93, 117, 0.08)',
    },
    liveMonitorHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
      marginBottom: 18,
    },
    liveMonitorEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.icon,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    liveMonitorTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    liveMonitorSubtitle: {
      fontSize: 12,
      color: colors.icon,
      marginTop: 4,
      lineHeight: 18,
      maxWidth: 360,
    },
    liveMonitorCluster: {
      width: 72,
      height: 72,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: hexToRgba(colors.card, 0.45),
      position: 'relative',
    },
    liveMonitorClusterDot: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: '#2FA8CC',
      top: 18,
      left: 18,
    },
    liveMonitorClusterDotLarge: {
      width: 16,
      height: 16,
      borderRadius: 999,
      backgroundColor: '#E85D75',
    },
    sectionHeader: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
      letterSpacing: -0.4,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.icon,
      lineHeight: 19,
    },
    sensorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 0,
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
      backgroundColor: colors.mutedSurface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    detailStatLabel: {
      fontSize: 11,
      color: colors.icon,
      marginBottom: 6,
    },
    detailStatValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    detailStatValueSmall: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    historyHeader: {
      marginTop: 8,
      marginBottom: 8,
    },
    historyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    historyHint: {
      fontSize: 12,
      color: colors.icon,
      marginTop: 2,
    },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    historyTime: {
      fontSize: 13,
      color: colors.icon,
    },
    historyValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    chartsContainer: {
      marginBottom: 20,
    },
    infographicGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    infographicCard: {
      width: '48%',
      backgroundColor: hexToRgba(colors.card, 0.8),
      borderRadius: 22,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 3,
    },
    infographicCardWide: {
      width: '100%',
      backgroundColor: hexToRgba(colors.card, 0.8),
      borderRadius: 22,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 3,
    },
    chartCard: {
      backgroundColor: hexToRgba(colors.card, 0.8),
      borderRadius: 24,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 3,
    },
    chartTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
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
      backgroundColor: hexToRgba(colors.card, 0.8),
      borderRadius: 22,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 3,
    },
    chartFallbackText: {
      fontSize: 14,
      color: colors.icon,
      lineHeight: 20,
    },
    maintenanceSubtitle: {
      fontSize: 12,
      color: colors.icon,
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
      borderTopColor: colors.border,
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
      color: colors.text,
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
      color: colors.icon,
      lineHeight: 20,
      marginBottom: 2,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 22,
      gap: 10,
    },
    actionButton: {
      backgroundColor: hexToRgba(colors.card, 0.82),
      paddingVertical: 13,
      paddingHorizontal: 14,
      borderRadius: 18,
      flex: 1,
      marginHorizontal: 0,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.3,
    },
    vehicleRow: {
      backgroundColor: hexToRgba(colors.card, 0.86),
      padding: 18,
      borderRadius: 24,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 3,
    },
    vehicleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    vehicleTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
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
      color: colors.icon,
      marginTop: 6,
      lineHeight: 18,
    },
    vehicleMaintenanceBox: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    secondaryButton: {
      backgroundColor: colors.secondaryButtonBackground,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    secondaryButtonText: {
      color: colors.secondaryButtonText,
      fontSize: 12,
      fontWeight: '700',
    },
    vehicleMaintenanceTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    vehicleMaintenanceText: {
      fontSize: 12,
      color: colors.icon,
      lineHeight: 18,
      marginBottom: 2,
      textTransform: 'capitalize',
    },
    small: {
      color: colors.icon,
      textAlign: 'center',
      padding: 20,
    },
  });
