import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { FaHistory, FaSpinner, FaTrash } from 'react-icons/fa';
import {
    getFirestore,
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    deleteDoc,
    doc
} from 'firebase/firestore';
import { app } from '@/firebase/firebase.config';
import styles from './RecentAccessFeed.module.css';
import PinModal from './PinModal';

const db = getFirestore(app);

interface AccessRecord {
    id: string;
    memberId: string;
    memberName: string;
    memberDni: string;
    company: string;
    timestamp: any;
    fotoUrl?: string;
}

export const RecentAccessFeed: React.FC = () => {
    const [recentAccesses, setRecentAccesses] = useState<AccessRecord[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'asistencias'),
            orderBy('timestamp', 'desc'),
            limit(20)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AccessRecord[];
            setRecentAccesses(docs);
            setLoadingRecent(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDeleteClick = (id: string) => {
        setSelectedDeleteId(id);
        setIsPinModalOpen(true);
    };

    const handlePinSuccess = async () => {
        if (selectedDeleteId) {
            try {
                await deleteDoc(doc(db, 'asistencias', selectedDeleteId));
            } catch (error) {
                console.error("Error al eliminar asistencia:", error);
                alert("Error al eliminar el registro.");
            }
        }
    };

    return (
        <div className={styles.activitySection}>
            <h2 className={styles.activityTitle}>
                <FaHistory /> Ingresos Recientes
            </h2>

            <div className={styles.activityList}>
                {loadingRecent ? (
                    <div className={styles.loadingState}>
                        <FaSpinner className={`${styles.spinAnimation} ${styles.loadingSpinner}`} />
                        <p>Cargando ingresos...</p>
                    </div>
                ) : recentAccesses.length === 0 ? (
                    <p className={styles.emptyState}>No hay ingresos recientes</p>
                ) : (
                    recentAccesses.map((record) => (
                        <div key={record.id} className={styles.activityItem}>
                            {record.fotoUrl ? (
                                <NextImage
                                    src={record.fotoUrl}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className={styles.activityAvatar}
                                />
                            ) : (
                                <div className={styles.activityAvatarPlaceholder}>
                                    N/A
                                </div>
                            )}
                            <div className={styles.activityInfo}>
                                <p className={styles.activityName}>{record.memberName}</p>
                                <p className={styles.activityDetails}>{record.company}</p>
                            </div>
                            <div className={styles.activityTimeContainer}>
                                <p className={styles.activityTime}>
                                    {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                </p>
                                <p className={styles.activityDate}>
                                    {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDeleteClick(record.id)}
                                className={styles.deleteButton}
                                title="Eliminar registro"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <PinModal
                isOpen={isPinModalOpen}
                onClose={() => {
                    setIsPinModalOpen(false);
                    setSelectedDeleteId(null);
                }}
                onSuccess={handlePinSuccess}
                title="PIN requerido para eliminar"
            />
        </div>
    );
};
