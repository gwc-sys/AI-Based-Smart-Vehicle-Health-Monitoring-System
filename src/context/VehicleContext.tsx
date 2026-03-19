import { getVehicles, Vehicle } from '@/services/vehicleService';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type VehicleContextType = {
  vehicles: Vehicle[];
  loading: boolean;
  refresh: () => Promise<void>;
  selected?: Vehicle | null;
  selectVehicle: (id: string | null) => void;
};

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider = ({ children }: { children: ReactNode }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch {
      // swallow for now; consider reporting error
    } finally {
      setLoading(false);
    }
  }, []);

  const selectVehicle = useCallback((id: string | null) => {
    if (!id) return setSelected(null);
    const v = vehicles.find((x) => x.id === id) ?? null;
    setSelected(v);
  }, [vehicles]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const value = useMemo(
    () => ({ vehicles, loading, refresh, selected, selectVehicle }),
    [vehicles, loading, refresh, selected, selectVehicle]
  );

  return (
    <VehicleContext.Provider value={value}>
      {children}
    </VehicleContext.Provider>
  );
};

export function useVehicles() {
  const ctx = useContext(VehicleContext);
  if (!ctx) throw new Error('useVehicles must be used within a VehicleProvider');
  return ctx;
}

export default VehicleContext;
