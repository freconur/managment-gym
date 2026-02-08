import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { FaHistory, FaSpinner, FaTrash } from 'react-icons/fa';
import {
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
    getDocs,
    getDoc
} from 'firebase/firestore';
import { db } from '@/firebase/firebase.config';
import styles from './RecentAccessFeed.module.css';
import { AdminPinModal } from './AdminPinModal';



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
    subEnvironmentDetails?: {
        name: string;
        tableNumber?: string;
        startTime?: any;
        endTime?: any;
        duration?: number;
    }[];
}

interface Company {
    id: string;
    nombre: string;
}

type PinActionType = 'DELETE' | 'TOGGLE_TOWEL' | 'UNLOCK_TOWEL';



interface RecentAccessFeedProps {
    environment?: string;
    locationId?: string;
}

export const RecentAccessFeed: React.FC<RecentAccessFeedProps> = ({ environment, locationId: propLocationId }) => {
    const [recentAccesses, setRecentAccesses] = useState<AccessRecord[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [now, setNow] = useState(new Date());

    // Update 'now' every minute to refresh expiration status
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const [unlockedTowelIds, setUnlockedTowelIds] = useState<string[]>([]);
    const [latestMemberPhotos, setLatestMemberPhotos] = useState<Record<string, string>>({});
    const [locationId, setLocationId] = useState<string | null>(propLocationId || null);
    const [subEnvConfigs, setSubEnvConfigs] = useState<any[]>([]);

    // PIN Protection State
    const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
    const [pendingExtendAction, setPendingExtendAction] = useState<{
        recordId: string;
        subName: string;
        currentEndTime: any;
        duration: number;
    } | null>(null);

    // Sync propLocationId to internal locationId state
    useEffect(() => {
        if (propLocationId) {
            setLocationId(propLocationId);
        }
    }, [propLocationId]);

    // Filters
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [selectedCompany, setSelectedCompany] = useState<string>('');

    const companies = React.useMemo(() => {
        const unique = new Set(recentAccesses.map(r => r.company).filter(Boolean));
        return Array.from(unique).sort().map(name => ({ id: name, nombre: name }));
    }, [recentAccesses]);

    // Fetch Accesses based on Date
    useEffect(() => {
        setLoadingRecent(true);
        setRecentAccesses([]); // Clear old data to prevent stale state if query fails

        // Parse date manually to avoid UTC conversion issues
        const [year, month, day] = selectedDate.split('-').map(Number);

        // Create local dates
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

        const constraints: any[] = [];

        if (environment) {
            constraints.push(where('environment', '==', environment));
        }

        constraints.push(
            where('timestamp', '>=', startOfDay),
            where('timestamp', '<=', endOfDay),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const asistenciasCol = locationId
            ? collection(db, 'ubicaciones', locationId, 'asistencias')
            : collection(db, 'asistencias');

        const q = query(asistenciasCol, ...constraints);

        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
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
    }, [selectedDate, environment]);

    // Fetch latest member photos
    useEffect(() => {
        const fetchPhotos = async () => {
            const memberIdsToFetch = new Set<string>();
            recentAccesses.forEach(record => {
                if (record.memberId && !latestMemberPhotos[record.memberId]) {
                    memberIdsToFetch.add(record.memberId);
                }
            });

            if (memberIdsToFetch.size === 0) return;

            const newPhotos: Record<string, string> = {};
            await Promise.all(Array.from(memberIdsToFetch).map(async (memberId) => {
                try {
                    const membersCol = locationId
                        ? collection(db, 'ubicaciones', locationId, 'members')
                        : collection(db, 'members');

                    const memberDoc = await getDoc(doc(membersCol, memberId));
                    if (memberDoc.exists()) {
                        const data = memberDoc.data();
                        if (data.fotoUrl) {
                            newPhotos[memberId] = data.fotoUrl;
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching photo for member ${memberId}:`, error);
                }
            }));

            if (Object.keys(newPhotos).length > 0) {
                setLatestMemberPhotos(prev => ({ ...prev, ...newPhotos }));
            }
        };

        if (recentAccesses.length > 0) {
            fetchPhotos();
        }
    }, [recentAccesses, latestMemberPhotos]);

    const [hasAmenities, setHasAmenities] = useState(false);

    // Listens for config changes in real-time
    useEffect(() => {
        let unsubscribe: () => void;

        const startListener = async () => {
            if (propLocationId) {
                unsubscribe = onSnapshot(doc(db, 'ubicaciones', propLocationId), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setHasAmenities(!!data.haveAmenidades);
                        setSubEnvConfigs(data.subEnvironments || []);
                    } else {
                        setSubEnvConfigs([]);
                    }
                });
            } else if (environment) {
                const q = query(collection(db, 'ubicaciones'), where('name', '==', environment));
                unsubscribe = onSnapshot(q, (snapshot) => {
                    if (!snapshot.empty) {
                        const docSnap = snapshot.docs[0];
                        const data = docSnap.data();
                        setLocationId(docSnap.id);
                        setHasAmenities(!!data.haveAmenidades);
                        setSubEnvConfigs(data.subEnvironments || []);
                    } else {
                        setSubEnvConfigs([]);
                    }
                });
            }
        };

        startListener();

        return () => {
            if (unsubscribe) unsubscribe();
        }
    }, [environment, propLocationId]);

    // ... (keep existing effects)

    // Filtered list
    const filteredAccesses = recentAccesses.filter(record => {
        if (!selectedCompany) return true;
        return record.company === selectedCompany;
    });

    const handleDeleteClick = (id: string) => {
        if (confirm("¿Estás seguro de eliminar este registro?")) {
            handlePinSuccess('DELETE', id);
        }
    };

    const handleTowelClick = (record: AccessRecord) => {
        handlePinSuccess('TOGGLE_TOWEL', { id: record.id, enable: !record.hasTowel });
    };

    const handleTowelInputClick = (id: string) => {
        if (!unlockedTowelIds.includes(id)) {
            setUnlockedTowelIds(prev => [...prev, id]);
        }
    };

    const handleTowelInputBlur = (id: string) => {
        setUnlockedTowelIds(prev => prev.filter(itemId => itemId !== id));
    };

    const handleTowelNumberChange = async (id: string, value: string) => {
        // Enforce 2 digits max
        if (value.length > 2) return;

        try {
            const asistenciasCol = locationId
                ? collection(db, 'ubicaciones', locationId, 'asistencias')
                : collection(db, 'asistencias');

            await updateDoc(doc(asistenciasCol, id), { towelNumber: value });
        } catch (error) {
            console.error("Error updating towel number:", error);
        }
    };

    const handlePinSuccess = async (type: PinActionType, payload: any) => {
        try {
            const asistenciasCol = locationId
                ? collection(db, 'ubicaciones', locationId, 'asistencias')
                : collection(db, 'asistencias');

            if (type === 'DELETE') {
                await deleteDoc(doc(asistenciasCol, payload));
            } else if (type === 'TOGGLE_TOWEL') {
                const { id, enable } = payload;
                if (enable) {
                    await updateDoc(doc(asistenciasCol, id), { hasTowel: true });
                    // Automatically unlock the newly enabled towel for input
                    setUnlockedTowelIds(prev => [...prev, id]);
                } else {
                    await updateDoc(doc(asistenciasCol, id), { hasTowel: false, towelNumber: null });
                    setUnlockedTowelIds(prev => prev.filter(uid => uid !== id));
                }
            }
        } catch (error) {
            console.error("Error executing action:", error);
            alert("Error al procesar la acción.");
        }
    };

    const handleExtendClick = (recordId: string, subName: string, currentEndTime: any, duration: number) => {
        setPendingExtendAction({ recordId, subName, currentEndTime, duration });
        setIsAdminPinModalOpen(true);
    };

    const executeExtendAction = async () => {
        if (!pendingExtendAction) return;
        const { recordId, subName, currentEndTime, duration } = pendingExtendAction;

        try {
            const asistenciasCol = locationId
                ? collection(db, 'ubicaciones', locationId, 'asistencias')
                : collection(db, 'asistencias');

            const record = recentAccesses.find(r => r.id === recordId);
            if (!record || !record.subEnvironmentDetails) return;

            // Calculate new end time
            const baseTime = currentEndTime?.toDate ? currentEndTime.toDate() : (currentEndTime instanceof Date ? currentEndTime : new Date());
            const newEndTime = new Date(baseTime.getTime() + duration * 60000);

            // Update the specific sub-environment detail
            const updatedDetails = record.subEnvironmentDetails.map(d => {
                if (d.name === subName) {
                    return { ...d, endTime: newEndTime }; // Simply update end time to extend duration
                }
                return d;
            });

            await updateDoc(doc(asistenciasCol, recordId), {
                subEnvironmentDetails: updatedDetails
            });

            setPendingExtendAction(null);
        } catch (error) {
            console.error("Error extending time:", error);
            alert("Error al extender el tiempo.");
        }
    };

    // Check if the prompt title map needs update


    return (
        <>
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
                                {(latestMemberPhotos[record.memberId] || record.fotoUrl) ? (
                                    <NextImage
                                        src={latestMemberPhotos[record.memberId] || record.fotoUrl || ''}
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
                                    {/* Display DNI as requested */}
                                    <p className={styles.metaLabel} style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.1rem 0' }}>
                                        DNI: {record.memberDni || 'N/A'}
                                    </p>
                                    <div className={styles.metaTags}>
                                        <span className={styles.tagCompany}>{record.company}</span>
                                        {record.area && <span className={styles.tagArea}>{record.area}</span>}
                                        {record.cargo && <span className={styles.tagCargo}>{record.cargo}</span>}

                                        {record.subEnvironments && record.subEnvironments.map((sub, idx) => {
                                            const detail = record.subEnvironmentDetails?.find(d => d.name === sub);
                                            let label = detail?.tableNumber ? `${sub} (#${detail.tableNumber})` : sub;
                                            let isExpired = false;
                                            let renderTimeControls = false;

                                            if (detail?.endTime) {
                                                renderTimeControls = true;
                                                try {
                                                    const getTime = (t: any) => {
                                                        if (!t) return null;
                                                        if (t.toDate) return t.toDate();
                                                        if (t.seconds) return new Date(t.seconds * 1000);
                                                        return t instanceof Date ? t : new Date(t);
                                                    };

                                                    const start = getTime(detail.startTime);
                                                    const end = getTime(detail.endTime);

                                                    if (end) {
                                                        // Check expiration
                                                        if (end < now) {
                                                            isExpired = true;
                                                        }

                                                        const format = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                                                        const startStr = start ? format(start) : '';
                                                        const endStr = format(end);

                                                        if (startStr) {
                                                            label += ` (${startStr} - ${endStr})`;
                                                        } else {
                                                            label += ` (Fin: ${endStr})`;
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error("Error formatting time", e);
                                                }
                                            }

                                            return (
                                                <div key={`${record.id}-sub-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                    <span
                                                        className={styles.tagSubEnvironment}
                                                        style={isExpired ? {
                                                            backgroundColor: '#fee2e2',
                                                            color: '#dc2626',
                                                            border: '1px solid #fca5a5'
                                                        } : {}}
                                                    >
                                                        {isExpired && "⚠️ TIEMPO CUMPLIDO: "}{label}
                                                    </span>
                                                    {renderTimeControls && detail && (
                                                        <button
                                                            onClick={() => {
                                                                const config = subEnvConfigs.find((s: any) => s.nombre === sub);
                                                                const dur = config?.maxTime || detail.duration;

                                                                if (dur) {
                                                                    handleExtendClick(record.id, sub, detail.endTime, dur);
                                                                } else {
                                                                    alert("No se encontró duración configurada para extender.");
                                                                }
                                                            }}
                                                            style={{
                                                                fontSize: '0.75rem',
                                                                padding: '2px 8px',
                                                                backgroundColor: '#3b82f6',
                                                                color: 'white',
                                                                borderRadius: '4px',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                opacity: (subEnvConfigs.find((s: any) => s.nombre === sub)?.maxTime || detail.duration) ? 1 : 0.5
                                                            }}
                                                            title={`Extender tiempo`}
                                                            disabled={!(subEnvConfigs.find((s: any) => s.nombre === sub)?.maxTime || detail.duration)}
                                                        >
                                                            + {subEnvConfigs.find((s: any) => s.nombre === sub)?.maxTime || detail.duration || '?'} min
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {hasAmenities && (
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
                                )}

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


            </div>

            <AdminPinModal
                isOpen={isAdminPinModalOpen}
                onClose={() => {
                    setIsAdminPinModalOpen(false);
                    setPendingExtendAction(null);
                }}
                onSuccess={executeExtendAction}
            />
        </>
    );
};
