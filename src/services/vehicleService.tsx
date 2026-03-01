import api from './api';

export type Vehicle = {
  id?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  plateNumber?: string;
  fuelType?: string;
};

export async function getVehicles(): Promise<Vehicle[]> {
  const res = await api.get('/vehicles');
  return res.data;
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
