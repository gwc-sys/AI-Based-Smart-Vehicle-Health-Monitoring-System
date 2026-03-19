import api from './api';

export type Vehicle = {
  id?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  plateNumber?: string;
  fuelType?: string;
  status?: 'active' | 'maintenance' | 'inactive' | string;
  nextMaintenance?: string | null;
};

export async function getVehicles(): Promise<Vehicle[]> {
  // Local fallback: disable remote vehicle list calls during development.
  return [];
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const res = await api.get(`/vehicles/${id}`);
  return res.data;
}

export async function createVehicle(payload: Vehicle): Promise<Vehicle> {
  const res = await api.post('/vehicles', payload);
  return res.data;
}

export async function updateVehicle(id: string, payload: Partial<Vehicle>): Promise<Vehicle> {
  const res = await api.put(`/vehicles/${id}`, payload);
  return res.data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await api.delete(`/vehicles/${id}`);
}

export default {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
