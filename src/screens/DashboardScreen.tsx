import useAuth from '@/hooks/useAuth';
import { useVehicleData } from '@/hooks/useVehicleData';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { Colors } from '../../constants/theme';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { vehicles, loading, refresh } = useVehicleData();
  const [showCharts, setShowCharts] = useState(true);
  const screenWidth = Dimensions.get('window').width;
  const canRenderCharts = Platform.OS !== 'web';

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  // Mock data for charts - replace with actual data from your API
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

  const maintenanceData = {
    labels: ['Oil', 'Tires', 'Brakes', 'Battery', 'Filter'],
    datasets: [
      {
        data: [85, 65, 45, 90, 30],
      },
    ],
  };

  const vehicleDistributionData = [
    {
      name: 'Active',
      population: vehicles?.filter(v => v.status === 'active').length || 0,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
    },
    {
      name: 'Maintenance',
      population: vehicles?.filter(v => v.status === 'maintenance').length || 0,
      color: '#FF9800',
      legendFontColor: '#7F7F7F',
    },
    {
      name: 'Inactive',
      population: vehicles?.filter(v => v.status === 'inactive').length || 0,
      color: '#F44336',
      legendFontColor: '#7F7F7F',
    },
  ];

  // Calculate totals
  const totalVehicles = vehicles?.length ?? 0;
  const activeVehicles = vehicles?.filter(v => v.status === 'active').length ?? 0;
  const maintenanceDue = vehicles?.filter(v => v.nextMaintenance).length ?? 0;

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>Hello{user?.name ? `, ${user.name}` : ''} 👋</Text>
          <TouchableOpacity 
            style={styles.chartToggle} 
            onPress={() => setShowCharts(!showCharts)}
          >
            <Text style={styles.chartToggleText}>
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Quick Stats */}
        <View style={styles.quickRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Vehicles</Text>
            <Text style={styles.cardValue}>{totalVehicles}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Active</Text>
            <Text style={styles.cardValue}>{activeVehicles}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Due Maint.</Text>
            <Text style={styles.cardValue}>{maintenanceDue}</Text>
          </View>
        </View>

        {/* Charts Section */}
        {showCharts && canRenderCharts && (
          <View style={styles.chartsContainer}>
            {/* Fuel Efficiency Line Chart */}
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

            {/* Maintenance Bar Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Maintenance Status (%)</Text>
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
            </View>

            {/* Vehicle Status Pie Chart */}
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
            <Text style={styles.actionText}>Add Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Prediction')}>
            <Text style={styles.actionText}>Run Prediction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => refresh()}>
            <Text style={styles.actionText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Vehicles</Text>
          {loading ? (
            <Text style={styles.small}>Loading...</Text>
          ) : vehicles && vehicles.length > 0 ? (
            vehicles.slice(0, 3).map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.vehicleRow}
                onPress={() => navigation.navigate('VehicleDetail', { id: v.id })}
              >
                <View style={styles.vehicleHeader}>
                  <Text style={styles.vehicleTitle}>{v.make ?? 'Unknown'} {v.model ?? ''}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(v.status) }]}>
                    <Text style={styles.statusText}>{v.status || 'Active'}</Text>
                  </View>
                </View>
                <Text style={styles.vehicleMeta}>
                  {v.year ?? ''} • {v.plateNumber ?? '—'} • 
                  {v.nextMaintenance ? ` Next maint: ${new Date(v.nextMaintenance).toLocaleDateString()}` : ' No maint. due'}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.small}>No vehicles registered yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function for status colors
const getStatusColor = (status?: string) => {
  switch(status) {
    case 'active': return '#4CAF50';
    case 'maintenance': return '#FF9800';
    case 'inactive': return '#F44336';
    default: return '#4CAF50';
  }
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { padding: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  chartToggle: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  chartToggleText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  card: { 
    flex: 1, 
    backgroundColor: '#fff', 
    marginHorizontal: 6, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: { fontSize: 12, color: Colors.light.icon },
  cardValue: { fontSize: 24, fontWeight: '700', color: Colors.light.text, marginTop: 6 },
  
  // Charts styles
  chartsContainer: {
    marginBottom: 20,
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
  
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  actionButton: { 
    backgroundColor: Colors.light.tint, 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
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
  vehicleTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
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
  vehicleMeta: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  small: { color: Colors.light.icon, textAlign: 'center', padding: 20 },
});
