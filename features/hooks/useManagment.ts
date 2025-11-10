import { app } from "@/firebase/firebase.config";
import { initializeApp } from "firebase/app";
import {
  OrderByDirection,
  QuerySnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  endAt,
  endBefore,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { useState, useCallback } from "react";
import { Machine, Marca, Incidencia, Mantenimiento, Usuario } from "../types/types";

const db = getFirestore(app);


export type Ubicacion = {
  id?: string;
  name: string;
};

export const useManagment = () => {
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [maquinas, setMaquinas] = useState<Machine[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [maquina, setMaquina] = useState<Machine | null>(null);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosValidate, setUsuariosValidate] = useState<Usuario>({});
  const [eventos, setEventos] = useState<Incidencia[]>([]);
  const getUbicaciones = useCallback(() => {
    const pathRef = collection(db, 'ubicaciones');
    const q = query(pathRef, orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ubicaciones = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setUbicaciones(ubicaciones);
    });
    return unsubscribe;
  }, [])



  //////////////////////////USUARIOS//////////////////////////

  const validateSiEsAdmin = async(dni:string, pin:string) => {
    const pathRef = collection(db, 'usuarios');
    const q = query(pathRef, where('dni', '==', dni), where('pin', '==', Number(pin)));
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      const usuario = snapshot.docs[0].data() as Usuario;
      if(usuario.rol === 'Administrador' || usuario.rol === 'Desarrollador') {
        return true;
      }
    }
    return false;
  }
const validateUsuario = async(dni:string, pin:string) => {
  const pathRef = collection(db, 'usuarios');
  const q = query(pathRef, where('dni', '==', dni), where('pin', '==', Number(pin)));
  const snapshot = await getDocs(q);
  if (snapshot.docs.length > 0) {
    setUsuariosValidate(snapshot.docs[0].data() as Usuario);
    return true;
  }
  return false;
}

  const getUsuarios = useCallback(() => {
    const pathRef = collection(db, 'usuarios');
    const q = query(pathRef, orderBy('apellidos', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Usuario[];
      setUsuarios(usuarios);
    });
    return unsubscribe;
  }, [])
  const createUsuario = async(usuario: Usuario) => {
    const pathRef = collection(db, 'usuarios');
    await setDoc(doc(pathRef, usuario.dni), usuario);
  }

  const updateUsuario = async(id: string, usuario: Partial<Usuario>) => {
    const docRef = doc(db, 'usuarios', id);
    await updateDoc(docRef, {
      ...usuario,
      updatedAt: serverTimestamp()
    });
  }

  const deleteUsuario = async(id: string) => {
    const docRef = doc(db, 'usuarios', id);
    await deleteDoc(docRef);
  }
  //////////////////////////USUARIOS//////////////////////////
  const agregarMaquina = async (maquina: Machine) => {
    const pathref = collection(db, 'maquinas');
    const newMachine = {
      ...maquina,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(pathref, newMachine);
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  }
  const getMaquinas = useCallback(async () => {
    const pathRef = collection(db, 'maquinas');
    const q = query(pathRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const maquinas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setMaquinas(maquinas);
  }, [])

  ///////////////////////MARCAS///////////////////////
  const getMarcas = useCallback(() => {
    const pathRef = collection(db,'marcas')
    const q = query(pathRef, orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const marcas = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setMarcas(marcas);
    });
    return unsubscribe;
  }, [])
  const createMarcas = async(newMarca:Marca) => {
    const pathRef = collection(db, "marcas");
    const docRef = await addDoc(pathRef, newMarca);
    await updateDoc(docRef, { id: docRef.id });
  }
  const updateMarcas = async(id: string, updateMarca:Marca) => {
    const docRef = doc(db, "marcas", id);
    await updateDoc(docRef, updateMarca);
  }

  const deleteMarcas = async(id: string) => {
    const docRef = doc(db, "marcas", id);
    await deleteDoc(docRef);
  }

  ///////////////////////MARCAS///////////////////////

///////////////////////UBICACIONES///////////////////////
const createUbicaciones = async(ubicacion:Omit<Ubicacion, 'id'>) => {
  const pathRef = collection(db, "ubicaciones");
  const docRef = await addDoc(pathRef, ubicacion);
  await updateDoc(docRef, { id: docRef.id });
}
const updateUbicaciones = async(id: string, updateUbicacion:Partial<Ubicacion>) => {
  const docRef = doc(db, "ubicaciones", id);
  await updateDoc(docRef, updateUbicacion);
}

const deleteUbicaciones = async(id: string) => {
  const docRef = doc(db, "ubicaciones", id);
  await deleteDoc(docRef);
}
///////////////////////UBICACIONES///////////////////////
  

//////////////////////MAQUINAS//////////////////////////

const updateMaquinas = async(id: string, updateMaquina:Partial<Machine>) => {
  const docRef = doc(db, "maquinas", id);
  await updateDoc(docRef, updateMaquina);
}

const deleteMaquinas = async(id: string) => {
  const docRef = doc(db, "maquinas", id);
  await deleteDoc(docRef);
}

const getMaquina = useCallback(async(id: string) => {
  const docRef = doc(db, "maquinas", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    setMaquina({ id: docSnap.id, ...docSnap.data() } as Machine);
  } else {
    setMaquina(null);
  }
}, [])
//////////////////////MAQUINAS//////////////////////////


//////////////////////INCIDENCIAS//////////////////////////
const getIncidencias = useCallback((machineId: string) => {
  if (!machineId) return () => {};
  
  const pathRef = collection(db, `maquinas/${machineId}/eventos/`);
 /*  const q = query(pathRef, orderBy('fechaReporte', 'desc')); */
  const unsubscribe = onSnapshot(pathRef, (snapshot) => {
    const incidencias = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Incidencia[];
    setIncidencias(incidencias);
  });
  return unsubscribe;
}, [])

const createIncidencia = useCallback(async(incidencia: Omit<Incidencia, 'id'>, maquina: Machine) => {
  const pathRefMaquina = doc(db, 'maquinas', `${maquina.id}`);
  if(incidencia.maquinaDejoFuncionar) {
    await updateDoc(pathRefMaquina, {
      status: "inactive"
    });
  }else {
    await updateDoc(pathRefMaquina, {
      status: "active"
    });
  }
  const pathRef = collection(db, `maquinas/${maquina.id}/eventos/`);
  const newIncidencia = {
    ...incidencia,
    maquina: {...maquina, status: incidencia.maquinaDejoFuncionar ? "inactive" : "active"},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(pathRef, newIncidencia);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}, [])

const updateIncidencia = useCallback(async(machineId: string, id: string, incidencia: Partial<Incidencia>) => {
  const docRef = doc(db, `maquinas/${machineId}/eventos/`, id);
  await updateDoc(docRef, {
    ...incidencia,
    updatedAt: serverTimestamp()
  });
}, [])

const deleteIncidencia = useCallback(async(machineId: string, id: string) => {
  const docRef = doc(db, `maquinas/${machineId}/eventos/`, id);
  await deleteDoc(docRef);
}, [])
//////////////////////INCIDENCIAS//////////////////////////





//////////////////////MANTENIMIENTOS//////////////////////////


const createMantenimiento = useCallback(async(mantenimiento: Omit<Mantenimiento, 'id'>, maquina: Machine) => {
  const pathRef = collection(db, `maquinas/${maquina.id}/eventos/`);
  
  // Construir el objeto base sin campos undefined
  const newMantenimiento: any = {
    machineId: mantenimiento.machineId,
    tipo: mantenimiento.tipo,
    descripcion: mantenimiento.descripcion,
    prioridad: mantenimiento.prioridad,
    fechaReporte: mantenimiento.fechaReporte instanceof Date 
      ? serverTimestamp() 
      : mantenimiento.fechaReporte,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  // Agregar campos opcionales solo si están definidos
  if (mantenimiento.subTipo !== undefined) {
    newMantenimiento.subTipo = mantenimiento.subTipo;
  }
  if (mantenimiento.estado !== undefined) {
    newMantenimiento.estado = mantenimiento.estado;
  }
  if (mantenimiento.tecnicoAsignado !== undefined) {
    newMantenimiento.tecnicoAsignado = mantenimiento.tecnicoAsignado;
  }
  if (mantenimiento.costo !== undefined) {
    newMantenimiento.costo = mantenimiento.costo;
  }
  if (mantenimiento.piezasReemplazadas !== undefined) {
    newMantenimiento.piezasReemplazadas = mantenimiento.piezasReemplazadas;
  }
  if (mantenimiento.tareas !== undefined) {
    newMantenimiento.tareas = mantenimiento.tareas;
  }
  if (mantenimiento.notas !== undefined) {
    newMantenimiento.notas = mantenimiento.notas;
  }
  if (mantenimiento.usuario !== undefined) {
    newMantenimiento.usuario = mantenimiento.usuario;
  }
  
  // Solo agregar fechaProgramada si está definida
  if (mantenimiento.fechaProgramada !== undefined) {
    newMantenimiento.fechaProgramada = mantenimiento.fechaProgramada instanceof Date 
      ? Timestamp.fromDate(mantenimiento.fechaProgramada)
      : mantenimiento.fechaProgramada;
  }
  
  // Solo agregar fechaResolucion si está definida
  if (mantenimiento.fechaResolucion !== undefined) {
    newMantenimiento.fechaResolucion = mantenimiento.fechaResolucion instanceof Date 
      ? serverTimestamp() 
      : mantenimiento.fechaResolucion;
  }
  
  const docRef = await addDoc(pathRef, {...newMantenimiento, maquina: maquina});
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}, [])

//////////////////////MANTENIMIENTOS//////////////////////////


///////////////////////MAIN CALENDARVIEW///////////////////////

const getAllEventos = useCallback(async() => {
  const pathRef = collection(db, 'maquinas');
  const todasLasMaquinas = await getDocs(pathRef);
  const todasLasMaquinasIds = todasLasMaquinas.docs.map(doc => doc.id);
  const todasLasIncidencias = await Promise.all(todasLasMaquinasIds.map(async(maquinaId) => {
    const pathRefIncidencias = collection(db, `maquinas/${maquinaId}/eventos/`);
    const incidencias = await getDocs(pathRefIncidencias);
    return incidencias.docs.map(doc => doc.data() as Incidencia);
  }));

  const eventosPlano = todasLasIncidencias.flat();
  setEventos(eventosPlano);
  return eventosPlano;
}, [])

///////////////////////MAIN CALENDARVIEW///////////////////////

  return {
    getUbicaciones,
    ubicaciones,
    agregarMaquina,
    getMaquinas,
    maquinas,
    createMarcas,
    getMarcas,
    marcas,
    updateMarcas,
    deleteMarcas,
    createUbicaciones,
    updateUbicaciones,
    deleteUbicaciones,
    updateMaquinas,
    deleteMaquinas,
    getMaquina,
    maquina,
    getIncidencias,
    incidencias,
    createIncidencia,
    updateIncidencia,
    deleteIncidencia,
    createMantenimiento,
    getUsuarios,
    usuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    validateUsuario,
    usuariosValidate,
    validateSiEsAdmin,
    getAllEventos,
    eventos
  };
};
