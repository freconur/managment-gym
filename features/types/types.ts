import { ManagmentRegister } from "../actions/actionaManagment";

export type Machine = {
  id?: string;
  name?: string;
  image?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  status?: 'active' | 'maintenance' | 'inactive';
  location?: string;
  notes?: string;
  maquinaDejoFuncionar?: boolean;
  order?: number;
}

export type Managment = {
  machine: Machine[];
}

export type Marca = {
  id?: string;
  name?: string;
}

export type ComplementaryEquipment = {
  id?: string;
  name: string;
  // category?: string; // Removed as per request, keeping commenting out or just leave it
  category?: string;
  location?: string;
  quantity?: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
  order?: number;
}

export type ManagmentAction =
  | { type: ManagmentRegister.MACHINE_REGISTER; payload: Machine }
  | { type: ManagmentRegister.MACHINE_UPDATE; payload: Machine }
  | { type: ManagmentRegister.MACHINE_DELETE; payload: { id: string } }
  | { type: ManagmentRegister.USER_CHECKLIST; payload: { id: Usuario } }

export type PiezaReemplazada = {
  id?: string;
  nombre: string;
  cantidad: number;
  costo?: number;
  descripcion?: string;
}

export type Tarea = {
  id?: string;
  descripcion: string;
  completada: boolean;
}

export type ReusableTask = {
  id?: string;
  descripcion: string;
  createdAt?: any;
}

export type Incidencia = {
  id?: string;
  machineId: string; // ID de la máquina
  tipo: string;
  subTipo?: string; // Subtipo para mantenimientos (preventivo, correctivo, etc.)
  fechaReporte: Date; // Fecha cuando se reportó
  fechaProgramada?: Date; // Fecha programada para el mantenimiento
  fechaResolucion?: Date; // Fecha cuando se resolvió
  estado?: string; // Estado del mantenimiento o incidencia
  atendida?: boolean;
  descripcion: string;
  prioridad: string; // Prioridad del mantenimiento o incidencia
  tecnicoAsignado?: Usuario; // Técnico asignado
  costo?: number;
  piezasReemplazadas?: PiezaReemplazada[];
  tareas?: Tarea[]; // Checklist de tareas
  notes?: string;
  notas?: string;
  createdAt?: any; // Timestamp de Firebase
  updatedAt?: any; // Timestamp de Firebase
  usuario?: Usuario;
  maquina?: Machine;
  maquinaDejoFuncionar?: boolean;
  fotoUrl?: string;
  userChecklist?: Usuario;
}

export type Mantenimiento = Incidencia;

export type Usuario = {
  id?: string;
  dni?: string;
  nombres?: string;
  apellidos?: string;
  rol?: string;
  pin?: number;
  createdAt?: any; // Timestamp de Firebase
  updatedAt?: any; // Timestamp de Firebase
}

export interface Member {
  id?: string;
  nombre: string;
  dni: string;
  apellidos: string;
  empresa: string;
  area?: string;
  cargo?: string;
  sexo: string;
  fotoUrl?: string;
  lastAccess?: any;
  createdAt?: any;
}

export interface Company {
  id: string;
  nombre: string;
  createdAt?: any;
}

export interface Area {
  id: string;
  nombre: string;
  createdAt?: any;
}

export interface Cargo {
  id: string;
  nombre: string;
  createdAt?: any;
}

export interface SubEnvironment {
  id: string;
  nombre: string;
  createdAt?: any;
}

export interface Ubicacion {
  id: string;
  name: string;
  haveAmenidades?: boolean;
  haveSubEnvironments?: boolean;
  createdAt?: any;
}

export interface Amenity {
  id: string;
  nombre: string;
  createdAt?: any;
}

export type ChecklistStatus = 'in_progress' | 'completed';
export type ChecklistItemStatus = 'pending' | 'ok' | 'incidencia';

export interface Checklist {
  id?: string;
  date: string; // YYYY-MM-DD
  gym?: string;
  status: ChecklistStatus;
  totalCount: number;
  completedCount: number;
  incidencesCount: number;
  incidenciaIds?: string[]; // Aggregated list of all incidences in this checklist
  startTime: any;
  endTime?: any;
  performedBy?: Usuario;
  createdAt: any;
}

export interface ChecklistItem {
  id: string; // machineId
  machineName: string;
  location: string;
  status: ChecklistItemStatus;
  incidenciaId?: string;
  updatedAt: any;
  incidenciaIds?: string[]; // Multiple incidences
  notas?: string;
}

export interface ChecklistAssignment {
  id?: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  user?: Usuario;
  gym?: string;
  createdAt?: any;
}