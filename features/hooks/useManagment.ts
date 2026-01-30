import { db } from "@/firebase/firebase.config";
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
  collectionGroup,
  writeBatch,
} from "firebase/firestore";
import { useState, useCallback } from "react";
import { Machine, Marca, Incidencia, Mantenimiento, Usuario, ReusableTask } from "../types/types";

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
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [usuariosValidate, setUsuariosValidate] = useState<Usuario>({});
  const [eventos, setEventos] = useState<Incidencia[]>([]);
  const [reusableTasks, setReusableTasks] = useState<ReusableTask[]>([]);



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

  const validateSiEsAdmin = async (dni: string, pin: string) => {
    const pathRef = collection(db, 'usuarios');
    const q = query(pathRef, where('dni', '==', dni), where('pin', '==', Number(pin)));
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      const usuario = snapshot.docs[0].data() as Usuario;
      if (usuario.rol === 'Administrador' || usuario.rol === 'Desarrollador') {
        return true;
      }
    }
    return false;
  }
  const validateUsuario = async (dni: string, pin: string) => {
    const pathRef = collection(db, 'usuarios');
    const q = query(pathRef, where('dni', '==', dni), where('pin', '==', Number(pin)));
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      setUsuariosValidate(snapshot.docs[0].data() as Usuario);
      return true;
    }
    return false;
  }

  const validateAndGetUser = async (dni: string, pin: string): Promise<Usuario | null> => {
    const pathRef = collection(db, 'usuarios');
    const q = query(pathRef, where('dni', '==', dni), where('pin', '==', Number(pin)));
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      return snapshot.docs[0].data() as Usuario;
    }
    return null;
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
      setLoadingUsuarios(false);
    });
    return unsubscribe;
  }, [])
  const createUsuario = async (usuario: Usuario) => {
    const pathRef = collection(db, 'usuarios');
    await setDoc(doc(pathRef, usuario.dni), usuario);
  }

  const updateUsuario = async (id: string, usuario: Partial<Usuario>) => {
    const docRef = doc(db, 'usuarios', id);
    await updateDoc(docRef, {
      ...usuario,
      updatedAt: serverTimestamp()
    });
  }

  const deleteUsuario = async (id: string) => {
    const docRef = doc(db, 'usuarios', id);
    await deleteDoc(docRef);
  }

  //////////////////////////MAQUINAS//////////////////////////
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
  const getMaquinas = useCallback(() => {
    const pathRef = collection(db, 'maquinas');
    const q = query(pathRef, orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const maquinas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Machine[];
      setMaquinas(maquinas);
    });
    return unsubscribe;
  }, []);

  const saveMachineOrder = async (items: { id?: string; type?: string }[]) => {
    const batch = writeBatch(db);
    items.forEach((item, index) => {
      if (!item.id) return;

      let collectionName = 'maquinas';
      if (item.type === 'complementary') {
        collectionName = 'complementary_equipment';
      }

      const ref = doc(db, collectionName, item.id);
      batch.update(ref, { order: index });
    });
    await batch.commit();
  };

  ///////////////////////MARCAS///////////////////////
  const getMarcas = useCallback(() => {
    const pathRef = collection(db, 'marcas')
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
  const createMarcas = async (newMarca: Marca) => {
    const pathRef = collection(db, "marcas");
    const docRef = await addDoc(pathRef, newMarca);
    await updateDoc(docRef, { id: docRef.id });
  }
  const updateMarcas = async (id: string, updateMarca: Marca) => {
    const docRef = doc(db, "marcas", id);
    await updateDoc(docRef, updateMarca);
  }

  const deleteMarcas = async (id: string) => {
    const docRef = doc(db, "marcas", id);
    await deleteDoc(docRef);
  }

  ///////////////////////UBICACIONES///////////////////////
  const createUbicaciones = async (ubicacion: Omit<Ubicacion, 'id'>) => {
    const pathRef = collection(db, "ubicaciones");
    const docRef = await addDoc(pathRef, ubicacion);
    await updateDoc(docRef, { id: docRef.id });
  }
  const updateUbicaciones = async (id: string, updateUbicacion: Partial<Ubicacion>) => {
    const docRef = doc(db, "ubicaciones", id);
    await updateDoc(docRef, updateUbicacion);
  }

  const deleteUbicaciones = async (id: string) => {
    const docRef = doc(db, "ubicaciones", id);
    await deleteDoc(docRef);
  }

  const updateMaquinas = async (id: string, updateMaquina: Partial<Machine>) => {
    const docRef = doc(db, "maquinas", id);
    await updateDoc(docRef, updateMaquina);
  }

  const deleteMaquinas = async (id: string) => {
    const docRef = doc(db, "maquinas", id);
    await deleteDoc(docRef);
  }

  const getMaquina = useCallback((id: string) => {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('ID de máquina no válido');
      return () => { };
    }

    const docRef = doc(db, "maquinas", id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setMaquina({ id: docSnap.id, ...docSnap.data() } as Machine);
      } else {
        setMaquina(null);
      }
    }, (error) => {
      console.error('Error en getMaquina:', error);
      setMaquina(null);
    });

    return unsubscribe;
  }, [])

  //////////////////////INCIDENCIAS//////////////////////////
  const getIncidencias = useCallback((machineId: string) => {
    if (!machineId) return () => { };

    const pathRef = collection(db, `maquinas/${machineId}/eventos/`);
    const unsubscribe = onSnapshot(pathRef, (snapshot) => {
      const incidencias = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Incidencia[];
      setIncidencias(incidencias);
    });
    return unsubscribe;
  }, [])

  const createIncidencia = useCallback(async (incidencia: Omit<Incidencia, 'id'>, maquina: Machine) => {
    const pathRefMaquina = doc(db, 'maquinas', `${maquina.id}`);
    if (incidencia.maquinaDejoFuncionar) {
      await updateDoc(pathRefMaquina, {
        status: "inactive"
      });
    } else {
      await updateDoc(pathRefMaquina, {
        status: "active"
      });
    }
    const pathRef = collection(db, `maquinas/${maquina.id}/eventos/`);
    const newIncidencia = {
      ...incidencia,
      maquina: { ...maquina, status: incidencia.maquinaDejoFuncionar ? "inactive" : "active" },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(pathRef, newIncidencia);
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  }, [])

  const updateIncidencia = useCallback(async (machineId: string, id: string, incidencia: Partial<Incidencia>) => {
    const docRef = doc(db, `maquinas/${machineId}/eventos/`, id);
    await updateDoc(docRef, {
      ...incidencia,
      updatedAt: serverTimestamp()
    });
  }, [])

  const deleteIncidencia = useCallback(async (machineId: string, id: string) => {
    const docRef = doc(db, `maquinas/${machineId}/eventos/`, id);
    await deleteDoc(docRef);
  }, [])

  //////////////////////MANTENIMIENTOS//////////////////////////

  const createMantenimiento = useCallback(async (mantenimiento: Omit<Mantenimiento, 'id'>, maquina: Machine) => {
    const pathRef = collection(db, `maquinas/${maquina.id}/eventos/`);

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

    if (mantenimiento.fechaProgramada !== undefined) {
      newMantenimiento.fechaProgramada = mantenimiento.fechaProgramada instanceof Date
        ? Timestamp.fromDate(mantenimiento.fechaProgramada)
        : mantenimiento.fechaProgramada;
    }

    if (mantenimiento.fechaResolucion !== undefined) {
      newMantenimiento.fechaResolucion = mantenimiento.fechaResolucion instanceof Date
        ? serverTimestamp()
        : mantenimiento.fechaResolucion;
    }

    const docRef = await addDoc(pathRef, { ...newMantenimiento, maquina: maquina });
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  }, [])

  const getUserByDni = async (dni: string): Promise<Usuario | null> => {
    const pathRef = collection(db, 'usuarios');
    const q = query(pathRef, where('dni', '==', dni));
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      return snapshot.docs[0].data() as Usuario;
    }
    return null;
  }

  const getAllEventos = useCallback(() => {
    const q = query(collectionGroup(db, 'eventos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Incidencia[];
      setEventos(eventos);
    });
    return unsubscribe;
  }, [])

  //////////////////////REUSABLE TASKS//////////////////////////
  const getReusableTasks = useCallback(() => {
    const pathRef = collection(db, 'reusable-taks')
    const q = query(pathRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReusableTask[];
      setReusableTasks(tasks);
    });
    return unsubscribe;
  }, [])

  const createReusableTask = async (descripcion: string) => {
    const pathRef = collection(db, 'reusable-taks');
    const newTask = {
      descripcion,
      createdAt: serverTimestamp()
    };
    await addDoc(pathRef, newTask);
  }

  const updateReusableTask = async (id: string, descripcion: string) => {
    const docRef = doc(db, 'reusable-taks', id);
    await updateDoc(docRef, {
      descripcion,
      updatedAt: serverTimestamp()
    });
  }

  const deleteReusableTask = async (id: string) => {
    const docRef = doc(db, 'reusable-taks', id);
    await deleteDoc(docRef);
  }

  const getIncidencia = useCallback(async (machineId: string, id: string) => {
    if (!machineId || !id) return null;
    const docRef = doc(db, `maquinas/${machineId}/eventos/`, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Incidencia;
    }
    return null;
  }, [])

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
    loadingUsuarios,
    usuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    validateUsuario,
    usuariosValidate,
    validateSiEsAdmin,
    getAllEventos,
    eventos,
    getReusableTasks,
    reusableTasks,
    createReusableTask,
    updateReusableTask,
    deleteReusableTask,
    getIncidencia,
    validateAndGetUser,
    getUserByDni,
    saveMachineOrder
  };
};
