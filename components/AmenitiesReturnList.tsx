import React, { useState, useEffect } from 'react';
import { FaConciergeBell, FaCheck, FaSpinner, FaUndo } from 'react-icons/fa';
import {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    updateDoc,
    doc
} from 'firebase/firestore';
import { app } from '@/firebase/firebase.config';
import styles from './AmenitiesReturnList.module.css';

const db = getFirestore(app);

interface AccessRecord {
    id: string;
    memberName: string;
    memberDni?: string;
    amenities?: string[];
    amenitiesReturned?: boolean;
    timestamp: any;
}

export const AmenitiesReturnList: React.FC = () => {
    const [pendingReturns, setPendingReturns] = useState<AccessRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        // Fetch recent records to check for pending returns.
        // We limit to 100 to ensure we catch recent active ones without reading entire DB.
        // Filtering client-side allows us to catch 'undefined' status (legacy/test data) and avoids complex index setup.
        const q = query(
            collection(db, 'asistencias'),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AccessRecord[];

            // Filter: Has amenities AND (returned is false OR undefined)
            const filtered = data.filter(item =>
                item.amenities &&
                item.amenities.length > 0 &&
                item.amenitiesReturned !== true
            );

            setPendingReturns(filtered);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching amenities returns:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleReturn = async (id: string) => {
        setProcessingId(id);
        try {
            await updateDoc(doc(db, 'asistencias', id), {
                amenitiesReturned: true
            });
        } catch (error) {
            console.error("Error marking amenities as returned", error);
            alert("Error al actualizar estado");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className={styles.loading}><FaSpinner className={styles.spin} /> Cargando pendientes...</div>;

    // Auto-hide if no pending items
    if (pendingReturns.length === 0) return null;

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>
                <FaConciergeBell /> Devolución de Amenidades Pendientes
            </h3>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Miembro</th>
                            <th>DNI</th>
                            <th>Amenidades</th>
                            <th>Hora</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingReturns.map(record => (
                            <tr key={record.id}>
                                <td className={styles.nameCell}>{record.memberName}</td>
                                <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{record.memberDni || 'N/A'}</td>
                                <td>
                                    <div className={styles.amenityTags}>
                                        {record.amenities?.map((am, idx) => (
                                            <span key={idx} className={styles.tag}>{am}</span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    {record.timestamp?.toDate
                                        ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : '...'}
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleReturn(record.id)}
                                        disabled={processingId === record.id}
                                        className={styles.returnButton}
                                        title="Marcar como devuelto"
                                    >
                                        {processingId === record.id ? <FaSpinner className={styles.spin} /> : <FaCheck />} Devolver
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
