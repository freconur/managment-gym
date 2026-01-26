import { app } from "@/firebase/firebase.config";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    getDoc,
    getDocs,
    where,
    setDoc,
    increment,
    Timestamp,
    collectionGroup,
    writeBatch,
    limit,
    deleteDoc
} from "firebase/firestore";
import { useState, useCallback } from "react";
import { Checklist, ChecklistItem, Machine, ChecklistItemStatus, ChecklistAssignment, Usuario } from "../types/types";
import { ManagmentRegister } from "../actions/actionaManagment";
import { useGlobalContextDispatch } from "../context/useGlobalContext";

const db = getFirestore(app);

export const useChecklist = () => {
    const dispatch = useGlobalContextDispatch();
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [currentChecklist, setCurrentChecklist] = useState<Checklist | null>(null);
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [monthData, setMonthData] = useState<Record<string, Record<string, ChecklistItem>>>({});
    const [usuarioChecklist, setUsuarioChecklist] = useState({});
    const [assignments, setAssignments] = useState<ChecklistAssignment[]>([]);

    const getChecklists = useCallback(() => {
        const pathRef = collection(db, 'checklists');
        const q = query(pathRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Checklist[];
            setChecklists(data);
        });
        return unsubscribe;
    }, []);

    const getChecklistById = useCallback((id: string) => {
        const docRef = doc(db, 'checklists', id);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setCurrentChecklist({ id: docSnap.id, ...docSnap.data() } as Checklist);
            }
        });
        return unsubscribe;
    }, []);

    const getChecklistItems = useCallback((checklistId: string) => {
        const pathRef = collection(db, `checklists/${checklistId}/items`);
        const unsubscribe = onSnapshot(pathRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChecklistItem[];
            setChecklistItems(data);
        });
        return unsubscribe;
    }, []);

    // NEW: Fetch all items across all checklists in real-time
    const getMonthChecklistData = useCallback((month: number, year: number) => {
        const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const q = query(collectionGroup(db, 'items'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matrix: Record<string, Record<string, ChecklistItem>> = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data() as ChecklistItem & { date?: string };
                if (data.date && data.date.startsWith(targetMonthStr)) {
                    const day = data.date.split('-')[2];
                    if (!matrix[data.id]) matrix[data.id] = {};
                    matrix[data.id][day] = data as ChecklistItem;
                }
            });
            setMonthData(matrix);
        });

        return unsubscribe;
    }, []);

    const startDailyChecklist = async (count: number, user: any, dateStr?: string) => {
        // Use provided date or local YYYY-MM-DD
        let today: string;
        if (dateStr) {
            today = dateStr;
        } else {
            const now = new Date();
            today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }

        const q = query(collection(db, 'checklists'), where('date', '==', today));
        const snapshot = await getDocs(q);

        let checklistId: string;
        if (!snapshot.empty) {
            checklistId = snapshot.docs[0].id;
        } else {
            const newChecklist: Omit<Checklist, 'id'> = {
                date: today,
                status: 'in_progress',
                totalCount: count,
                completedCount: 0,
                incidencesCount: 0,
                startTime: serverTimestamp(),
                performedBy: user,
                createdAt: serverTimestamp(),
            };
            const docRef = await addDoc(collection(db, 'checklists'), newChecklist);
            checklistId = docRef.id;
        }

        // REMOVED: Eager item initialization loop to fix performance bottleneck.
        // The system now supports lazy creation of items.

        return checklistId;
    };

    const updateChecklistItem = async (
        checklistId: string,
        machineId: string,
        status: ChecklistItemStatus,
        incidenciaId?: string,
        notes?: string
    ) => {
        const itemRef = doc(db, `checklists/${checklistId}/items`, machineId);
        const checklistRef = doc(db, 'checklists', checklistId);

        // Fetch the date from the checklist to ensure consistency in mapping
        // Optimization: Pass date as arg or context context? For now fetching is safe but adds read.
        // We can optimize this further if needed, but the bottleneck was the loop.
        const checklistSnap = await getDoc(checklistRef);
        const checklistDate = checklistSnap.data()?.date;

        const updateData: any = {
            status,
            updatedAt: serverTimestamp(),
            date: checklistDate, // Crucial for collectionGroup mapping
        };
        if (incidenciaId) updateData.incidenciaId = incidenciaId;
        if (notes) updateData.notas = notes;

        await setDoc(itemRef, updateData, { merge: true });

        if (status !== 'pending') {
            await updateDoc(checklistRef, {
                completedCount: increment(1),
                incidencesCount: status === 'incidencia' ? increment(1) : increment(0)
            });
        }
    };

    const completeChecklist = async (checklistId: string) => {
        const docRef = doc(db, 'checklists', checklistId);
        await updateDoc(docRef, {
        });
    };

    const saveChecklistBatch = async (
        checklistId: string,
        items: Record<string, { status: ChecklistItemStatus; incidenciaIds?: string[]; notes?: string }>,
        pendingIncidences: Record<string, any> = {}, // Map tempID -> IncidenceData
        user?: any // The user performing the checklist
    ) => {
        const batch = writeBatch(db);
        const checklistRef = doc(db, 'checklists', checklistId);

        // Get current date for consistency
        const checklistSnap = await getDoc(checklistRef);
        const checklistDate = checklistSnap.data()?.date;

        // 1. Process Pending Incidences
        const tempIdToRealId: Record<string, string> = {};

        for (const [tempId, incData] of Object.entries(pendingIncidences)) {
            const { machineId, ...data } = incData;
            const pathRef = collection(db, `maquinas/${machineId}/eventos/`);

            // Generate ID
            const newDocRef = doc(pathRef);
            tempIdToRealId[tempId] = newDocRef.id;

            // Ensure user is attached if not present in data
            const finalData = {
                ...data,
                id: newDocRef.id,
                machineId, // Store machineId in event? schema says yes
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                usuario: data.usuario || user // Fallback to provided user
            };

            batch.set(newDocRef, finalData);

            // Update machine status if needed
            if (data.maquinaDejoFuncionar) {
                batch.update(doc(db, 'maquinas', machineId), { status: 'inactive' });
            } else {
                // Should we enable it? Only if it was inactive? 
                // Logic in createIncidencia suggests yes:
                batch.update(doc(db, 'maquinas', machineId), { status: 'active' });
            }
        }

        let completedCount = 0;
        let incidencesCount = 0;
        const allIncidenciaIds: string[] = [];

        Object.entries(items).forEach(([machineId, data]) => {
            const itemRef = doc(db, `checklists/${checklistId}/items`, machineId);

            completedCount++;
            let finalIncidenciaIds: string[] = [];

            if (data.status === 'incidencia') {
                incidencesCount++;
                if (data.incidenciaIds) {
                    // Replace temp IDs with real IDs
                    finalIncidenciaIds = data.incidenciaIds.map(id => tempIdToRealId[id] || id);
                    allIncidenciaIds.push(...finalIncidenciaIds);
                }
            }

            batch.set(itemRef, {
                id: machineId,
                status: data.status,
                updatedAt: serverTimestamp(),
                date: checklistDate,
                ...(finalIncidenciaIds.length > 0 ? { incidenciaIds: finalIncidenciaIds } : {}),
                ...(data.notes ? { notas: data.notes } : {}),
            }, { merge: true });
        });

        // Update checklist summary
        batch.update(checklistRef, {
            status: 'completed',
            completedCount,
            incidencesCount,
            incidenciaIds: allIncidenciaIds,
            endTime: serverTimestamp(),
        });

        await batch.commit();
    };

    const assignUserChecklist = async (userId: string, startDate: string, endDate: string, gym?: string, assignmentId?: string) => {
        const pathRef = collection(db, 'checklist_assignments');

        // 1. Find potential overlaps
        const q = query(pathRef, where('startDate', '<=', endDate));
        const snapshot = await getDocs(q);

        const batch = writeBatch(db);

        // 2. Check for conflicts
        snapshot.docs.forEach(doc => {
            // Ignore the assignment we are currently editing
            if (assignmentId && doc.id === assignmentId) return;

            const data = doc.data() as ChecklistAssignment;
            if (data.endDate >= startDate) {
                // Check if it's for the same gym
                const sameGym = data.gym === gym;

                if (sameGym) {
                    throw new Error(`Ya existe un encargado asignado para el gimnasio ${gym || 'Global'} en estas fechas (${data.startDate} - ${data.endDate}).`);
                }
            }
        });

        // 3. Add or Update assignment
        let userData: Usuario | undefined;
        try {
            const userDocRef = doc(db, 'usuarios', userId);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                userData = { id: userSnap.id, ...userSnap.data() } as Usuario;
            }
        } catch (e) {
            console.error("Error fetching user for assignment:", e);
        }

        const assignmentData: any = {
            userId,
            startDate,
            endDate,
            gym,
            user: userData,
            updatedAt: serverTimestamp()
        };

        if (!assignmentId) {
            assignmentData.createdAt = serverTimestamp();
        }

        const targetRef = assignmentId ? doc(db, 'checklist_assignments', assignmentId) : doc(pathRef);
        batch.set(targetRef, assignmentData, { merge: true });

        await batch.commit();
    };

    const deleteAssignment = async (id: string) => {
        await deleteDoc(doc(db, 'checklist_assignments', id));
    };

    const deleteChecklist = async (id: string) => {
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'checklists', id));
        } catch (error) {
            console.error("Error deleting checklist:", error);
            throw error;
        }
    };

    const getChecklistAssignment = async (date: string) => {
        // date format YYYY-MM-DD
        const pathRef = collection(db, 'checklist_assignments');
        // Simple query: where startDate <= date.
        // But Firestore range queries are tricky. We can query all and filter, or cleaner if we assume usage is "fetch assignments covering X date".
        // Let's try: startDate <= date and then client filter endDate >= date.

        const q = query(
            pathRef,
            where('startDate', '<=', date),
            orderBy('startDate', 'desc')
        );

        const snapshot = await getDocs(q);

        // Find first match where endDate >= date
        for (const doc of snapshot.docs) {
            const data = doc.data() as ChecklistAssignment;
            if (data.endDate >= date) {
                return { id: doc.id, ...data };
            }
        }
        return null;
    };

    const getUsuarioCheckList = async () => {
        const pathRef = collection(db, 'checklist_assignments');
        const rta = await getDocs(pathRef);
        setUsuarioChecklist(rta.docs[0].data())
        /*  console.log('rta', rta.docs[0].data())
         console.log('tt', rta.docs.map(doc => doc.data() as ChecklistAssignment))
         return rta.docs.map(doc => doc.data() as ChecklistAssignment); */
    }
    const clearUsuarioChecklist = () => {
        setUsuarioChecklist({});
    }

    const getAssignments = useCallback(() => {
        const pathRef = collection(db, 'checklist_assignments');
        const q = query(pathRef, orderBy('startDate', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChecklistAssignment[];
            setAssignments(data);
        });
        return unsubscribe;
    }, []);

    const getMonthlyAssignments = useCallback((month: number, year: number) => {
        // Calculate start and end of the month
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);

        const startStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;
        const endStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

        const pathRef = collection(db, 'checklist_assignments');

        // Query assignments that start before the end of the month
        // We will filter client-side for those that end after the start of the month to handle overlaps completely
        // Since querying 'startDate' <= endStr is simple.
        const q = query(
            pathRef,
            where('startDate', '<=', endStr),
            orderBy('startDate', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChecklistAssignment[];

            // Client-side filter: End Date must be >= Start of Month
            const filtered = data.filter(a => a.endDate >= startStr);

            setAssignments(filtered);
        });

        return unsubscribe;
    }, []);

    return {
        checklists,
        currentChecklist,
        checklistItems,
        monthData,
        getChecklists,
        getChecklistById,
        getChecklistItems,
        getMonthChecklistData,
        startDailyChecklist,
        updateChecklistItem,
        completeChecklist,
        saveChecklistBatch,
        assignUserChecklist,
        getChecklistAssignment,
        getUsuarioCheckList,
        usuarioChecklist,
        clearUsuarioChecklist,
        assignments,
        getAssignments,
        getMonthlyAssignments,
        deleteAssignment,
        deleteChecklist
    };
};
