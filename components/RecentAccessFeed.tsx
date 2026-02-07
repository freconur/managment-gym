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
    subEnvironmentDetails?: { name: string; tableNumber?: string }[];
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

    const [unlockedTowelIds, setUnlockedTowelIds] = useState<string[]>([]);
    const [latestMemberPhotos, setLatestMemberPhotos] = useState<Record<string, string>>({});
    const [locationId, setLocationId] = useState<string | null>(propLocationId || null);

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

    // Fetch Current Environment Configuration
    useEffect(() => {
        const fetchEnvironmentConfig = async () => {
            if (!environment) {
                setHasAmenities(false);
                return;
            }

            try {
                const q = query(collection(db, 'ubicaciones'), where('name', '==', environment));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    const data = docSnap.data();
                    setLocationId(docSnap.id);
                    setHasAmenities(!!data.haveAmenidades);
                } else {
                    setLocationId(null);
                    setHasAmenities(false);
                }
            } catch (error) {
                console.error("Error fetching environment config:", error);
                setHasAmenities(false);
            }
        };

        fetchEnvironmentConfig();
    }, [environment]);

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

    // Check if the prompt title map needs update


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
                                        const label = detail?.tableNumber ? `${sub} (#${detail.tableNumber})` : sub;
                                        return (
                                            <span key={`${record.id}-sub-${idx}`} className={styles.tagSubEnvironment}>{label}</span>
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
    );
};
