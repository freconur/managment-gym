import { ManagmentRegister } from "../actions/actionaManagment";

export type Machine = {
  id?: string;
  name?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  status?: 'active' | 'maintenance' | 'inactive';
  location?: string;
  notes?: string;
  maquinaDejoFuncionar?: boolean;
}

export type Managment = {
  machine: Machine[];
}

export type Marca = {
  id?: string;
  name?: string;
}

export type ManagmentAction =
  | { type: ManagmentRegister.MACHINE_REGISTER; payload: Machine }
  | { type: ManagmentRegister.MACHINE_UPDATE; payload: Machine }
  | { type: ManagmentRegister.MACHINE_DELETE; payload: { id: string } }

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

export type Incidencia = {
  id?: string;
  machineId: string; // ID de la máquina
  tipo: string;
  subTipo?: string; // Subtipo para mantenimientos (preventivo, correctivo, etc.)
  fechaReporte: Date; // Fecha cuando se reportó
  fechaProgramada?: Date; // Fecha programada para el mantenimiento
  fechaResolucion?: Date; // Fecha cuando se resolvió
  estado?: string; // Estado del mantenimiento o incidencia
  descripcion: string;
  prioridad: string; // Prioridad del mantenimiento o incidencia
  tecnicoAsignado?: Usuario; // Técnico asignado
  costo?: number;
  piezasReemplazadas?: PiezaReemplazada[];
  tareas?: Tarea[]; // Checklist de tareas
  notas?: string;
  createdAt?: any; // Timestamp de Firebase
  updatedAt?: any; // Timestamp de Firebase
  usuario?: Usuario;
  maquina?: Machine;
  maquinaDejoFuncionar?: boolean;
}

export type Mantenimiento = Incidencia;

export type Usuario = {
  id?: string;
  dni?: string;
  nombres?: string;
  apellidos?: string;
  rol?: string;
  pin?:number;
  createdAt?: any; // Timestamp de Firebase
  updatedAt?: any; // Timestamp de Firebase
}