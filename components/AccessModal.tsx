import React, { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';
import { FaSearch, FaBarcode, FaCheckCircle, FaSpinner, FaUserClock, FaTimes, FaEdit, FaMapMarkerAlt, FaConciergeBell } from 'react-icons/fa';
import {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import { app } from '@/firebase/firebase.config';
import styles from './AccessModal.module.css';
import { SubEnvironment, Amenity, AllowedCompany } from '@/features/types/types';
import SubEnvironmentModal from './SubEnvironmentModal';
import AmenityModal from './AmenityModal';

const db = getFirestore(app);

interface Member {
    id: string;
    nombre: string;
    apellidos: string;
    dni: string;
    empresa: string;
    area?: string;
    cargo?: string;
    fotoUrl?: string;
    sexo: string;
}

interface AccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    environment?: string;
}

import { useEscapeKey } from '@/features/hooks/useEscapeKey'

export const AccessModal: React.FC<AccessModalProps> = ({ isOpen, onClose, environment }) => {
    const [dni, setDni] = useState('');
    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [subEnvironments, setSubEnvironments] = useState<SubEnvironment[]>([]);
    const [selectedSubEnvironments, setSelectedSubEnvironments] = useState<string[]>([]);
    const [isSubEnvModalOpen, setIsSubEnvModalOpen] = useState(false);

    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false);

    // Authorization State
    const [allowedCompaniesConfig, setAllowedCompaniesConfig] = useState<AllowedCompany[] | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    useEscapeKey(() => {
        if (showScanner) {
            setShowScanner(false);
            return;
        }
        if (isSubEnvModalOpen) {
            setIsSubEnvModalOpen(false);
            return;
        }
        if (isAmenityModalOpen) {
            setIsAmenityModalOpen(false);
            return;
        }
        onClose();
    }, isOpen);

    // Focus input when modal opens
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }

        return () => window.removeEventListener('resize', checkMobile);
    }, [isOpen]);

    // Fetch SubEnvironments
    useEffect(() => {
        if (!isOpen) return;
        const qSub = query(collection(db, 'sub_environments'), orderBy('createdAt', 'desc'));
        const unsubSub = onSnapshot(qSub, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SubEnvironment[];
            setSubEnvironments(data);
        });

        const qAm = query(collection(db, 'amenities'), orderBy('createdAt', 'desc'));
        const unsubAm = onSnapshot(qAm, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Amenity[];
            setAmenities(data);
        });

        return () => {
            unsubSub();
            unsubAm();
        };
    }, [isOpen]);

    // Scanner Logic
    useEffect(() => {
        let scanner: any = null;

        const startScanner = async () => {
            if (showScanner && isOpen) {
                try {
                    const { Html5Qrcode } = await import('html5-qrcode');
                    scanner = new Html5Qrcode("reader");

                    const config = {
                        fps: 10,
                        qrbox: { width: 250, height: 150 },
                        aspectRatio: 1.0
                    };

                    await scanner.start(
                        { facingMode: "environment" },
                        config,
                        onScanSuccess,
                        onScanFailure
                    );
                } catch (err) {
                    console.error("Error starting scanner", err);
                }
            }
        };

        startScanner();

        function onScanSuccess(decodedText: string, decodedResult: any) {
            const numericCode = decodedText.replace(/[^0-9]/g, '');
            if (numericCode.length >= 8) {
                setDni(numericCode);
                scanner?.stop().then(() => {
                    scanner?.clear();
                    setShowScanner(false);
                    searchByDni(numericCode);
                }).catch((err: any) => {
                    console.error("Failed to stop scanner", err);
                    setShowScanner(false);
                    searchByDni(numericCode);
                });
            }
        }

        function onScanFailure(error: any) {
            // console.warn(`Code scan error = ${error}`);
        }

        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().then(() => scanner?.clear()).catch(console.error);
            }
        };
    }, [showScanner, isOpen]);

    const searchByDni = async (dniVal: string) => {
        if (!dniVal.trim()) return;
        setLoading(true);
        setError('');
        setMember(null);
        setSuccessMsg('');
        try {
            const q = query(collection(db, 'members'), where('dni', '==', dniVal.trim()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const docData = querySnapshot.docs[0].data();
                setMember({ id: querySnapshot.docs[0].id, ...docData } as Member);
            } else {
                setError('Miembro no encontrado');
            }
        } catch (err) {
            console.error(err);
            setError('Error al buscar miembro');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        searchByDni(dni);
    };

    const [haveSubEnvironments, setHaveSubEnvironments] = useState(false);

    // Fetch environment config
    useEffect(() => {
        const fetchEnvironmentConfig = async () => {
            if (!environment) {
                setHaveSubEnvironments(false);
                return;
            }
            try {
                const q = query(collection(db, 'ubicaciones'), where('name', '==', environment));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    setHaveSubEnvironments(!!data.haveSubEnvironments);
                    setAllowedCompaniesConfig(data.allowedCompanies || null);
                } else {
                    setHaveSubEnvironments(false);
                    setAllowedCompaniesConfig(null);
                }
            } catch (error) {
                console.error("Error fetching environment config:", error);
                setHaveSubEnvironments(false);
            }
        };
        fetchEnvironmentConfig();
    }, [environment]);

    const handleRegister = async () => {
        if (!member) return;

        // Only validate if environment has sub-environments enabled
        if (haveSubEnvironments && selectedSubEnvironments.length === 0) {
            setError('Debe seleccionar al menos un Sub-Ambiente de Acceso');
            return;
        }

        setRegistering(true);
        try {
            await addDoc(collection(db, 'asistencias'), {
                memberId: member.id,
                memberName: `${member.nombre} ${member.apellidos}`,
                memberDni: member.dni,
                company: member.empresa,
                area: member.area || null,
                cargo: member.cargo || null,
                sexo: member.sexo,
                subEnvironments: selectedSubEnvironments, // Will be empty array if !haveSubEnvironments
                amenities: selectedAmenities,
                amenitiesReturned: selectedAmenities.length > 0 ? false : true,
                fotoUrl: member.fotoUrl || null,
                environment: environment || null,
                timestamp: new Date() // Use client-side time for immediate UI update (avoids serverTimestamp latency affecting queries)
            });

            // Update lastAccess for the member
            await updateDoc(doc(db, 'members', member.id), {
                lastAccess: serverTimestamp()
            });

            setSuccessMsg(`¡Ingreso registrado para ${member.nombre}!`);
            setError(''); // Clear any previous errors
            setDni('');
            setMember(null);
            setSelectedSubEnvironments([]);
            setSelectedAmenities([]);

            // Auto-hide success message
            setTimeout(() => setSuccessMsg(''), 3000);

            // Focus input for next user
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } catch (err) {
            console.error(err);
            setError('Error al registrar ingreso');
        } finally {
            setRegistering(false);
        }
    };

    const handleClose = () => {
        setDni('');
        setMember(null);
        setError('');
        setSuccessMsg('');
        setShowScanner(false);
        setSelectedSubEnvironments([]);
        setSelectedAmenities([]);
        onClose();
    };

    const toggleSubEnvironment = (name: string) => {
        setSelectedSubEnvironments(prev =>
            prev.includes(name)
                ? prev.filter(item => item !== name)
                : [...prev, name]
        );
    };

    const toggleAmenity = (name: string) => {
        setSelectedAmenities(prev =>
            prev.includes(name)
                ? prev.filter(item => item !== name)
                : [...prev, name]
        );
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.title}>
                        <FaUserClock style={{ color: '#3b82f6' }} /> Registrar Ingreso
                    </h2>
                    <button onClick={handleClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {isMobile && (
                        <button
                            className={styles.scanButton}
                            onClick={() => setShowScanner(true)}
                            type="button"
                        >
                            <FaBarcode /> Escanear DNI
                        </button>
                    )}

                    <form onSubmit={handleSearch} className={styles.inputGroup}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Ingrese DNI..."
                            value={dni}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                if (val.length <= 8) setDni(val);
                            }}
                            className={styles.input}
                        />
                        <button
                            type="submit"
                            disabled={loading || !dni}
                            className={`${styles.searchButton} ${(loading || !dni) ? styles.searchButtonDisabled : ''}`}
                        >
                            <FaSearch />
                        </button>
                    </form>

                    {error && (
                        <div className={`${styles.statusMessage} ${styles.errorMessage}`}>
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className={`${styles.statusMessage} ${styles.successMessage}`}>
                            {successMsg}
                        </div>
                    )}

                    {member && (
                        <div className={styles.userCard}>
                            {member.fotoUrl ? (
                                <NextImage
                                    src={member.fotoUrl}
                                    alt={member.nombre}
                                    width={160}
                                    height={160}
                                    className={styles.avatar}
                                />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    ?
                                </div>
                            )}

                            <h3 className={styles.userName}>{member.nombre} {member.apellidos}</h3>
                            <p className={styles.userDni}>DNI: {member.dni}</p>
                            <div className={styles.userDetailsGrid}>
                                <span className={styles.userBadge}><strong>Empresa:</strong> {member.empresa}</span>
                                {member.area && <span className={styles.userBadge}><strong>Área:</strong> {member.area}</span>}
                                {member.cargo && <span className={styles.userBadge}><strong>Cargo:</strong> {member.cargo}</span>}
                                <span className={styles.userBadge}><strong>Sexo:</strong> {member.sexo}</span>
                            </div>

                            {haveSubEnvironments && (
                                <div className={styles.subEnvironmentsSection}>
                                    <div className={styles.subEnvHeader}>
                                        <h4><FaMapMarkerAlt /> Sub ambientes de acceso</h4>
                                        <button
                                            onClick={() => setIsSubEnvModalOpen(true)}
                                            className={styles.manageSubEnvBtn}
                                            title="Gestionar Sub-ambientes"
                                        >
                                            <FaEdit />
                                        </button>
                                    </div>
                                    <div className={styles.subEnvGrid}>
                                        {subEnvironments.length === 0 ? (
                                            <p className={styles.noDataText}>No hay sub-ambientes registrados.</p>
                                        ) : (
                                            subEnvironments.map(env => (
                                                <label key={env.id} className={styles.checkboxLabel}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSubEnvironments.includes(env.nombre)}
                                                        onChange={() => toggleSubEnvironment(env.nombre)}
                                                    />
                                                    <span>{env.nombre}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/*  <div className={styles.subEnvironmentsSection} style={{ marginTop: '1rem' }}>
                                <div className={styles.subEnvHeader}>
                                    <h4><FaConciergeBell /> Amenidades (Servicios)</h4>
                                    <button
                                        onClick={() => setIsAmenityModalOpen(true)}
                                        className={styles.manageSubEnvBtn}
                                        title="Gestionar Amenidades"
                                    >
                                        <FaEdit />
                                    </button>
                                </div>
                                <div className={styles.subEnvGrid}>
                                    {amenities.length === 0 ? (
                                        <p className={styles.noDataText}>No hay amenidades registradas.</p>
                                    ) : (
                                        amenities.map(item => (
                                            <label key={item.id} className={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAmenities.includes(item.nombre)}
                                                    onChange={() => toggleAmenity(item.nombre)}
                                                />
                                                <span>{item.nombre}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div> */}


                            {(() => {
                                // Access Validation Logic
                                if (!allowedCompaniesConfig) return null; // Legacy or no config -> Allow

                                const allowed = allowedCompaniesConfig.find(ac => ac.companyName === member.empresa);
                                if (!allowed) {
                                    return (
                                        <div className={`${styles.statusMessage} ${styles.errorMessage}`} style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                            🚫 Acceso Denegado: La empresa &quot;<strong>{member.empresa}</strong>&quot; no tiene permiso en este ambiente.
                                        </div>
                                    );
                                }

                                if (allowed.haveSchedule) {
                                    if (!allowed.schedules || allowed.schedules.length === 0) {
                                        return (
                                            <div className={`${styles.statusMessage} ${styles.errorMessage}`} style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                                🚫 Acceso Denegado: Restricción de horario activa pero sin configuración.
                                            </div>
                                        );
                                    }
                                    const now = new Date();
                                    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                    const isAllowedTime = allowed.schedules.some(s => current >= s.start && current <= s.end);

                                    if (!isAllowedTime) {
                                        const slots = allowed.schedules.map(s => `${s.start}-${s.end}`).join(', ');
                                        return (
                                            <div className={`${styles.statusMessage} ${styles.errorMessage}`} style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                                🕒 Acceso Denegado: Fuera de horario permitido.<br />
                                                <span style={{ fontSize: '0.85rem' }}>Horarios: {slots}</span>
                                            </div>
                                        );
                                    }
                                }

                                if (allowed.haveRoleRestriction) {
                                    if (!allowed.allowedRoles || allowed.allowedRoles.length === 0) {
                                        return (
                                            <div className={`${styles.statusMessage} ${styles.errorMessage}`} style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                                🚫 Acceso Denegado: Restricción por cargo activa pero sin configuración.
                                            </div>
                                        );
                                    }
                                    if (!allowed.allowedRoles.includes(member.cargo || '')) {
                                        return (
                                            <div className={`${styles.statusMessage} ${styles.errorMessage}`} style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                                🚫 Acceso Denegado: Su cargo &quot;<strong>{member.cargo || 'N/A'}</strong>&quot; no tiene permiso en este ambiente.
                                            </div>
                                        );
                                    }
                                }
                                return null;
                            })()}

                            {(() => {
                                // Boolean helper to avoid type warnings and improve readability
                                const isAuthorized = (() => {
                                    if (!allowedCompaniesConfig) return true;
                                    const allowed = allowedCompaniesConfig.find(ac => ac.companyName === member.empresa);
                                    if (!allowed) return false;
                                    if (allowed.haveSchedule) {
                                        if (!allowed.schedules || allowed.schedules.length === 0) return false;
                                        const now = new Date();
                                        const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                        if (!allowed.schedules.some(s => current >= s.start && current <= s.end)) return false;
                                    }
                                    if (allowed.haveRoleRestriction) {
                                        if (!allowed.allowedRoles || allowed.allowedRoles.length === 0) return false;
                                        if (!allowed.allowedRoles.includes(member.cargo || '')) return false;
                                    }
                                    return true;
                                })();

                                return (
                                    <button
                                        onClick={handleRegister}
                                        disabled={registering || !isAuthorized}
                                        className={styles.confirmButton}
                                        style={!isAuthorized ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#ef4444' } : {}}
                                    >
                                        {registering ? (
                                            <>
                                                <FaSpinner className={styles.spinAnimation} /> Registrando...
                                            </>
                                        ) : (
                                            <><FaCheckCircle /> CONFIRMAR INGRESO</>
                                        )}
                                    </button>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {showScanner && (
                <div className={styles.scannerOverlay}>
                    <div className={styles.scannerContainer}>
                        <div id="reader" style={{ width: '100%', borderRadius: '1rem', overflow: 'hidden', backgroundColor: 'white' }}></div>
                        <button
                            className={styles.closeScannerButton}
                            onClick={() => setShowScanner(false)}
                        >
                            Cancelar / Cerrar Escáner
                        </button>
                    </div>
                </div>
            )}

            <SubEnvironmentModal
                isOpen={isSubEnvModalOpen}
                onClose={() => setIsSubEnvModalOpen(false)}
                db={db}
            />
            <AmenityModal
                isOpen={isAmenityModalOpen}
                onClose={() => setIsAmenityModalOpen(false)}
                db={db}
            />
        </div>
    );
};
