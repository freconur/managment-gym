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
import { SubEnvironment, Amenity } from '@/features/types/types';
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
}

export const AccessModal: React.FC<AccessModalProps> = ({ isOpen, onClose }) => {
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

    const inputRef = useRef<HTMLInputElement>(null);

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

    const handleRegister = async () => {
        if (!member) return;

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
                subEnvironments: selectedSubEnvironments,
                amenities: selectedAmenities,
                amenitiesReturned: selectedAmenities.length > 0 ? false : true,
                fotoUrl: member.fotoUrl || null,
                timestamp: serverTimestamp()
            });

            // Update lastAccess for the member
            await updateDoc(doc(db, 'members', member.id), {
                lastAccess: serverTimestamp()
            });

            setSuccessMsg(`¡Ingreso registrado para ${member.nombre}!`);
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

                            <div className={styles.subEnvironmentsSection}>
                                <div className={styles.subEnvHeader}>
                                    <h4><FaMapMarkerAlt /> Sub-Ambulantes de Acceso</h4>
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

                            <button
                                onClick={handleRegister}
                                disabled={registering}
                                className={styles.confirmButton}
                            >
                                {registering ? (
                                    <>
                                        <FaSpinner className={styles.spinAnimation} /> Registrando...
                                    </>
                                ) : (
                                    <><FaCheckCircle /> CONFIRMAR INGRESO</>
                                )}
                            </button>
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
