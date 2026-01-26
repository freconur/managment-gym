import { app } from "@/firebase/firebase.config";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { useState, useCallback } from "react";
import { ComplementaryEquipment } from "../types/types";

const db = getFirestore(app);

export const useComplementaryEquipment = () => {
    const [equipment, setEquipment] = useState<ComplementaryEquipment[]>([]);
    const [loading, setLoading] = useState(true);

    const getComplementaryEquipment = useCallback(() => {
        const pathRef = collection(db, 'complementary_equipment');
        const q = query(pathRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ComplementaryEquipment[];
            setEquipment(items);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const createComplementaryEquipment = async (item: Omit<ComplementaryEquipment, 'id'>) => {
        const pathRef = collection(db, 'complementary_equipment');
        const newItem = {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(pathRef, newItem);
        await updateDoc(docRef, { id: docRef.id });
        return docRef.id;
    };

    const updateComplementaryEquipment = async (id: string, item: Partial<ComplementaryEquipment>) => {
        const docRef = doc(db, 'complementary_equipment', id);
        await updateDoc(docRef, {
            ...item,
            updatedAt: serverTimestamp()
        });
    };

    const deleteComplementaryEquipment = async (id: string) => {
        const docRef = doc(db, 'complementary_equipment', id);
        await deleteDoc(docRef);
    };

    return {
        getComplementaryEquipment,
        equipment,
        loading,
        createComplementaryEquipment,
        updateComplementaryEquipment,
        deleteComplementaryEquipment
    };
};
