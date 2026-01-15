import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import NextImage from 'next/image'
import { useState, useEffect, useRef } from 'react'
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore'
import { app } from '@/firebase/firebase.config'
import { FaSearch, FaCheckCircle, FaHistory, FaUserClock, FaArrowLeft, FaBarcode, FaSpinner } from 'react-icons/fa'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import styles from './Access.module.css'

const db = getFirestore(app)

interface Member {
    id: string;
    nombre: string;
    apellidos: string;
    dni: string;
    empresa: string;
    fotoUrl?: string;
    sexo: string;
}

interface AccessRecord {
    id: string;
    memberId: string;
    memberName: string;
    memberDni: string;
    company: string;
    timestamp: any;
    fotoUrl?: string;
}

const AccessPage: NextPage = () => {
    const [dni, setDni] = useState('')
    const [member, setMember] = useState<Member | null>(null)
    const [loading, setLoading] = useState(false)
    const [registering, setRegistering] = useState(false)
    const [recentAccesses, setRecentAccesses] = useState<AccessRecord[]>([])
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [showScanner, setShowScanner] = useState(false)
    const [loadingRecent, setLoadingRecent] = useState(true)
    const inputRef = useRef<HTMLInputElement>(null)

    // Initial focus on mount
    useEffect(() => {
        // Small timeout to ensure DOM is ready
        setTimeout(() => {
            inputRef.current?.focus()
        }, 100)
    }, [])

    useEffect(() => {
        if (showScanner) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 }, // Rectangular for barcodes
                    aspectRatio: 1.0,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.CODABAR
                    ]
                },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);

            function onScanSuccess(decodedText: string, decodedResult: any) {
                // Assuming the barcode contains the DNI (8 digits)
                // Filter non-numeric just in case, or take just the digits
                const numericCode = decodedText.replace(/[^0-9]/g, '');

                // If it's a DNI (8 digits), update state and search
                // User mentioned 8 digits specifically.
                if (numericCode.length >= 8) {
                    // Sometimes scanners read extra chars, but let's assume the code IS the DNI or contains it.
                    // The user said "barcodes of 8 digits".
                    setDni(numericCode);
                    scanner.clear().then(() => {
                        setShowScanner(false);
                        // Trigger search immediately
                        // We need to call handleSearch but it uses 'dni' state which might not be updated yet in closure
                        // So we'll use an effect or just manually call logic.
                        // For simplicity, we just set DNI and let user click or we can use a separate effect.
                        // Better: execute search logic directly with the value.
                        searchByDni(numericCode);
                    }).catch(err => console.error("Failed to clear scanner", err));
                }
            }

            function onScanFailure(error: any) {
                // handle scan failure, usually better to ignore and keep scanning.
                // console.warn(`Code scan error = ${error}`);
            }

            return () => {
                scanner.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner. ", error);
                });
            }
        }
    }, [showScanner])

    const searchByDni = async (dniVal: string) => {
        if (!dniVal.trim()) return
        setLoading(true)
        setError('')
        setMember(null)
        setSuccessMsg('')
        try {
            const q = query(collection(db, 'members'), where('dni', '==', dniVal.trim()))
            const querySnapshot = await getDocs(q)
            if (!querySnapshot.empty) {
                const docData = querySnapshot.docs[0].data()
                setMember({ id: querySnapshot.docs[0].id, ...docData } as Member)
            } else {
                setError('Miembro no encontrado')
            }
        } catch (err) {
            console.error(err)
            setError('Error al buscar miembro')
        } finally {
            setLoading(false)
        }
    }

    // Real-time listener for recent accesses
    useEffect(() => {
        const q = query(
            collection(db, 'asistencias'),
            orderBy('timestamp', 'desc'),
            limit(20)
        )
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AccessRecord[]
            setRecentAccesses(docs)
            setLoadingRecent(false)
        })
        return () => unsubscribe()
    }, [])

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!dni.trim()) return

        setLoading(true)
        setError('')
        setMember(null)
        setSuccessMsg('')

        try {
            const q = query(collection(db, 'members'), where('dni', '==', dni.trim()))
            const querySnapshot = await getDocs(q)

            if (!querySnapshot.empty) {
                const docData = querySnapshot.docs[0].data()
                setMember({ id: querySnapshot.docs[0].id, ...docData } as Member)
            } else {
                setError('Miembro no encontrado')
            }
        } catch (err) {
            console.error(err)
            setError('Error al buscar miembro')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async () => {
        if (!member) return

        setRegistering(true)
        try {
            await addDoc(collection(db, 'asistencias'), {
                memberId: member.id,
                memberName: `${member.nombre} ${member.apellidos}`,
                memberDni: member.dni,
                company: member.empresa,
                sexo: member.sexo,
                fotoUrl: member.fotoUrl || null,
                timestamp: serverTimestamp()
            })
            setSuccessMsg(`¡Ingreso registrado para ${member.nombre}!`)
            setDni('')
            setMember(null)
            // Auto-hide success message after 3 seconds
            setTimeout(() => setSuccessMsg(''), 3000)

            // Auto-focus input for next user
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        } catch (err) {
            console.error(err)
            setError('Error al registrar ingreso')
        } finally {
            setRegistering(false)
        }
    }

    return (
        <>
            <Head>
                <title>Control de Acceso - Management Gym</title>
            </Head>
            <div className={styles.container}>
                <main style={{ maxWidth: '1200px', margin: '0 auto' }}>

                    <div style={{ marginBottom: '2rem' }}>
                        <Link href="/members" className={styles.backLink}>
                            <FaArrowLeft /> Volver a Miembros
                        </Link>
                    </div>


                    <div className={styles.contentGrid}>


                        {/* Search & Action Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div className={styles.searchContainer}>
                                <h1 className={styles.title} style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', textAlign: 'left' }}>
                                    <FaUserClock style={{ color: '#3b82f6' }} /> Registrar Ingreso
                                </h1>

                                <button
                                    className={styles.scanButton}
                                    onClick={() => setShowScanner(true)}
                                    type="button"
                                >
                                    <FaBarcode style={{ marginRight: '0.5rem' }} /> Escanear DNI
                                </button>

                                <form onSubmit={handleSearch} className={styles.inputGroup}>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Ingrese DNI..."
                                        value={dni}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '')
                                            if (val.length <= 8) setDni(val)
                                        }}
                                        className={styles.input}
                                        autoFocus
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
                                    <div className={styles.userCard} style={{ backgroundColor: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '0.75rem', padding: '1.5rem', marginTop: 0 }}>
                                        {member.fotoUrl ? (
                                            <NextImage
                                                src={member.fotoUrl}
                                                alt={member.nombre}
                                                width={128}
                                                height={128}
                                                className={styles.avatar}
                                                style={{ margin: '0 auto 1rem auto' }}
                                                loading="eager"
                                            />
                                        ) : (
                                            <div className={styles.avatarPlaceholder}>
                                                <span style={{ fontSize: '3rem', color: '#64748b' }}>?</span>
                                            </div>
                                        )}

                                        <h2 className={styles.userName} style={{ color: '#1e3a8a' }}>{member.nombre} {member.apellidos}</h2>
                                        <p className={styles.userDni}>DNI: {member.dni}</p>
                                        <p style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.75rem',
                                            backgroundColor: '#dbeafe',
                                            color: '#1e40af',
                                            borderRadius: '9999px',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            marginBottom: '1.5rem'
                                        }}>
                                            {member.empresa}
                                        </p>

                                        <button
                                            onClick={handleRegister}
                                            disabled={registering}
                                            style={{
                                                width: '100%',
                                                padding: '1rem',
                                                backgroundColor: '#059669',
                                                color: 'white',
                                                fontSize: '1.25rem',
                                                fontWeight: 'bold',
                                                borderRadius: '0.5rem',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                transition: 'transform 0.1s',
                                                opacity: registering ? 0.7 : 1
                                            }}
                                        >
                                            {registering ? (
                                                <>
                                                    <FaCheckCircle className={styles.spinAnimation} /> Registrando...
                                                </>
                                            ) : (
                                                <><FaCheckCircle /> CONFIRMAR INGRESO</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Access Feed */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className={styles.activitySection} style={{ height: 'fit-content' }}>
                                <h2 className={styles.activityTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FaHistory /> Ingresos Recientes
                                </h2>

                                <div className={styles.activityList}>
                                    {loadingRecent ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                            <FaSpinner className={styles.spinAnimation} style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
                                            <p>Cargando ingresos...</p>
                                        </div>
                                    ) : recentAccesses.length === 0 ? (
                                        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No hay ingresos recientes</p>
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
                                                <div style={{ textAlign: 'right' }}>
                                                    <p className={styles.activityTime}>
                                                        {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                    </p>
                                                    <p style={{ fontSize: '0.65rem', color: '#9ca3af', margin: 0 }}>
                                                        {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {showScanner && (
                        <div className={styles.scannerOverlay}>
                            <div className={styles.scannerModal}>
                                <div id="reader" style={{ width: '100%' }}></div>
                                <button
                                    className={styles.closeScannerButton}
                                    onClick={() => setShowScanner(false)}
                                >
                                    Cancelar / Cerrar Escáner
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    )
}

export default AccessPage
