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
    doc,
    updateDoc,
    where,
    Timestamp,
    getDocs
} from 'firebase/firestore';
import { app } from '@/firebase/firebase.config';
import styles from './RecentAccessFeed.module.css';
import PinModal from './PinModal';

const db = getFirestore(app);

// ... AccessRecord interface
interface AccessRecord {
    id: string;
    memberId: string;
    memberName: string;
    memberDni: string;
    company: string;
    area?: string;
    cargo?: string;
    timestamp: any;
    fotoUrl?: string;
    hasTowel?: boolean;
    towelNumber?: string;
    subEnvironments?: string[];
}

interface Company {
    id: string;
    nombre: string;
}

type PinActionType = 'DELETE' | 'TOGGLE_TOWEL' | 'UNLOCK_TOWEL';

interface PinAction {
    type: PinActionType;
    payload: any;
}

export const RecentAccessFeed: React.FC = () => {
    const [recentAccesses, setRecentAccesses] = useState<AccessRecord[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pinAction, setPinAction] = useState<PinAction | null>(null);
    const [unlockedTowelIds, setUnlockedTowelIds] = useState<string[]>([]);

    // Filters
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [companies, setCompanies] = useState<Company[]>([]);

    // Fetch Companies
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const q = query(collection(db, 'empresas'), orderBy('nombre', 'asc'));
                const snapshot = await getDocs(q);
                const companyList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Company[];
                setCompanies(companyList);
            } catch (error) {
                console.error("Error fetching companies:", error);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch Accesses based on Date
    useEffect(() => {
        setLoadingRecent(true);

        // Parse date manually to avoid UTC conversion issues
        const [year, month, day] = selectedDate.split('-').map(Number);

        // Create local dates
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

        const q = query(
            collection(db, 'asistencias'),
            where('timestamp', '>=', startOfDay),
            where('timestamp', '<=', endOfDay),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AccessRecord[];
            setRecentAccesses(docs);
            setLoadingRecent(false);
        }, (error) => {
            console.error("Error fetching accesses:", error);
            setLoadingRecent(false);
        });

        return () => unsubscribe();
    }, [selectedDate]);

    // Filtered list
    const filteredAccesses = recentAccesses.filter(record => {
        if (!selectedCompany) return true;
        return record.company === selectedCompany;
    });

    const handleDeleteClick = (id: string) => {
        setPinAction({ type: 'DELETE', payload: id });
        setIsPinModalOpen(true);
    };

    const handleTowelClick = (record: AccessRecord) => {
        setPinAction({
            type: 'TOGGLE_TOWEL',
            payload: { id: record.id, enable: !record.hasTowel }
        });
        setIsPinModalOpen(true);
    };

    const handleTowelInputClick = (id: string) => {
        if (!unlockedTowelIds.includes(id)) {
            setPinAction({ type: 'UNLOCK_TOWEL', payload: id });
            setIsPinModalOpen(true);
        }
    };

    const handleTowelInputBlur = (id: string) => {
        setUnlockedTowelIds(prev => prev.filter(itemId => itemId !== id));
    };

    const handleTowelNumberChange = async (id: string, value: string) => {
        // Enforce 2 digits max
        if (value.length > 2) return;

        try {
            await updateDoc(doc(db, 'asistencias', id), { towelNumber: value });
        } catch (error) {
            console.error("Error updating towel number:", error);
        }
    };

    const handlePinSuccess = async () => {
        if (!pinAction) return;

        try {
            if (pinAction.type === 'DELETE') {
                await deleteDoc(doc(db, 'asistencias', pinAction.payload));
            } else if (pinAction.type === 'TOGGLE_TOWEL') {
                const { id, enable } = pinAction.payload;
                if (enable) {
                    await updateDoc(doc(db, 'asistencias', id), { hasTowel: true });
                    // Automatically unlock the newly enabled towel for input
                    setUnlockedTowelIds(prev => [...prev, id]);
                } else {
                    await updateDoc(doc(db, 'asistencias', id), { hasTowel: false, towelNumber: null });
                    setUnlockedTowelIds(prev => prev.filter(uid => uid !== id));
                }
            } else if (pinAction.type === 'UNLOCK_TOWEL') {
                setUnlockedTowelIds(prev => [...prev, pinAction.payload]);
            }
        } catch (error) {
            console.error("Error executing pin action:", error);
            alert("Error al procesar la acción.");
        }
    };

    // Check if the prompt title map needs update
    const getModalTitle = () => {
        switch (pinAction?.type) {
            case 'DELETE': return "PIN eliminar";
            case 'TOGGLE_TOWEL': return pinAction.payload.enable ? "PIN activar toalla" : "PIN devolver toalla";
            case 'UNLOCK_TOWEL': return "PIN editar número";
            default: return "PIN de seguridad";
        }
    };

    return (
        <div className={styles.activitySection}>
            <h2 className={styles.activityTitle}>
                <FaHistory /> Ingresos Recientes
            </h2>

            <div className={styles.filterSection}>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={styles.dateInput}
                />
                <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className={styles.companySelect}
                >
                    <option value="">Todas las empresas</option>
                    {companies.map(company => (
                        <option key={company.id} value={company.nombre}>
                            {company.nombre}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.activityList}>
                {loadingRecent ? (
                    <div className={styles.loadingState}>
                        <FaSpinner className={`${styles.spinAnimation} ${styles.loadingSpinner}`} />
                        <p>Cargando ingresos...</p>
                    </div>
                ) : filteredAccesses.length === 0 ? (
                    <p className={styles.emptyState}>
                        {recentAccesses.length === 0
                            ? "No hay ingresos para esta fecha"
                            : "No hay ingresos para esta empresa"}
                    </p>
                ) : (
                    filteredAccesses.map((record) => (
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
                                <div className={styles.metaTags}>
                                    <span className={styles.tagCompany}>{record.company}</span>
                                    {record.area && <span className={styles.tagArea}>{record.area}</span>}
                                    {record.cargo && <span className={styles.tagCargo}>{record.cargo}</span>}
                                    {record.subEnvironments && record.subEnvironments.map((sub, idx) => (
                                        <span key={`${record.id}-sub-${idx}`} className={styles.tagSubEnvironment}>{sub}</span>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.towelSection}>
                                <label className={styles.towelCheckboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={record.hasTowel || false}
                                        onChange={() => handleTowelClick(record)}
                                        className={styles.towelCheckbox}
                                    />
                                    <span className={styles.towelText}>Toalla</span>
                                </label>
                                {record.hasTowel && (
                                    <input
                                        type="number"
                                        value={record.towelNumber || ''}
                                        onChange={(e) => handleTowelNumberChange(record.id, e.target.value)}
                                        className={styles.towelInput}
                                        placeholder="#"
                                        readOnly={!unlockedTowelIds.includes(record.id)}
                                        onClick={() => handleTowelInputClick(record.id)}
                                        onBlur={() => handleTowelInputBlur(record.id)}
                                        style={{
                                            opacity: !unlockedTowelIds.includes(record.id) ? 0.7 : 1,
                                            cursor: !unlockedTowelIds.includes(record.id) ? 'pointer' : 'text'
                                        }}
                                    />
                                )}
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
                    setPinAction(null);
                }}
                onSuccess={handlePinSuccess}
                title={getModalTitle()}
            />
        </div>
    );
};
