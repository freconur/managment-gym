import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState, useRef } from 'react'
import { FaArrowLeft, FaCog, FaMapMarkerAlt, FaCheck, FaPlus, FaTrash, FaCalendarAlt, FaWhatsapp, FaQrcode } from 'react-icons/fa'
import { useAuth } from '@/features/context/AuthContext'
import { useManagment } from '@/features/hooks/useManagment'
import { ThemeToggle } from '@/components/ThemeToggle'
import { db } from '@/firebase/firebase.config'
import { doc, getDoc, setDoc, deleteDoc, writeBatch, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore'
import styles from './Reservas.module.css'
import { FaEnvelope } from 'react-icons/fa'

const getPeruDate = (offsetDays = 0) => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }))
    d.setHours(0, 0, 0, 0)
    if (offsetDays !== 0) {
        d.setDate(d.getDate() + offsetDays)
    }
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
}

const ReservasConfig: NextPage = () => {
    const { userProfile, loading } = useAuth()
    const { getUbicaciones, ubicaciones, updateUbicaciones } = useManagment()
    const router = useRouter()
    const [selectedUbicacionId, setSelectedUbicacionId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const lastLoadedIdRef = useRef<string | null>(null)

    // Form State
    const [config, setConfig] = useState({
        enabled: false,
        maxCapacity: 10,
        slotDuration: 60,
        days: [true, true, true, true, true, false, false], // Mon-Sun
        intervals: [{ start: '08:00', end: '20:00' }],
        dateOverrides: {} as Record<string, any>
    })
    const [newOverrideDate, setNewOverrideDate] = useState(getPeruDate())
    const [newOverrideSubId, setNewOverrideSubId] = useState<string>('all') // Para granularidad
    // Notification Config State
    const [adminEmails, setAdminEmails] = useState<string[]>([])
    const [newEmail, setNewEmail] = useState('')
    const [senderEmail, setSenderEmail] = useState('')
    const [senderPass, setSenderPass] = useState('')
    const [isSavingEmails, setIsSavingEmails] = useState(false)
    const [showClosed, setShowClosed] = useState(false)
    const [isResettingBot, setIsResettingBot] = useState(false)
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [isGeneratingQR, setIsGeneratingQR] = useState(false)

    useEffect(() => {
        if (!loading && (!userProfile || userProfile.role !== 'admin')) {
            router.push('/reservas')
        }
    }, [loading, userProfile, router])

    useEffect(() => {
        if (userProfile?.role === 'admin') {
            const unsubscribe = getUbicaciones()

            // Load admin emails
            const loadAdminEmails = async () => {
                try {
                    const docRef = doc(db, 'config', 'reservas')
                    const snap = await getDoc(docRef)
                    if (snap.exists()) {
                        const data = snap.data()
                        setAdminEmails(data.adminEmails || [])
                        setSenderEmail(data.senderEmail || '')
                        setSenderPass(data.senderPass || '')
                    }
                } catch (error) {
                    console.error("Error loading admin emails:", error)
                }
            }
            loadAdminEmails()

            return () => unsubscribe()
        }
    }, [getUbicaciones, userProfile])

    useEffect(() => {
        if (!selectedUbicacionId) {
            setConfig({
                enabled: false,
                maxCapacity: 10,
                slotDuration: 60,
                days: [true, true, true, true, true, false, false],
                intervals: [{ start: '08:00', end: '20:00' }],
                dateOverrides: {}
            })
            lastLoadedIdRef.current = null
            return
        }

        // Si ya cargamos este ambiente y ya tenemos datos, no lo pisamos (para proteger cambios locales)
        if (lastLoadedIdRef.current === selectedUbicacionId) return

        const u = ubicaciones.find(u => u.id === selectedUbicacionId)
        if (u) {
            if ((u as any).reservationConfig) {
                const remoteConfig = (u as any).reservationConfig
                setConfig({
                    ...remoteConfig,
                    dateOverrides: {} // We'll rely on the real-time listener for this
                })
            } else {
                // Si no tiene config, reseteamos a valores por defecto
                setConfig({
                    enabled: false,
                    maxCapacity: 10,
                    slotDuration: 60,
                    days: [true, true, true, true, true, false, false],
                    intervals: [{ start: '08:00', end: '20:00' }],
                    dateOverrides: {}
                })
            }
            lastLoadedIdRef.current = selectedUbicacionId
        }
    }, [selectedUbicacionId, ubicaciones])

    useEffect(() => {
        if (!selectedUbicacionId) return

        const overridesRef = collection(db, 'reservation_date_overrides')
        const q = query(overridesRef, where('locationId', '==', selectedUbicacionId))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const overridesObj: Record<string, any> = {}
            snapshot.docs.forEach(d => {
                const data = d.data()
                const key = data.subId === 'all' ? data.date : `${data.date}_${data.subId}`
                overridesObj[key] = {
                    enabled: data.enabled,
                    maxCapacity: data.maxCapacity,
                    intervals: data.intervals,
                    status: data.status || 'active'
                }
            })
            setConfig(prev => ({ ...prev, dateOverrides: overridesObj }))
        })

        return () => unsubscribe()
    }, [selectedUbicacionId])

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
                <p>Cargando configuración...</p>
            </div>
        )
    }

    if (userProfile?.role !== 'admin') return null

    const selectedUbicacion = ubicaciones.find(u => u.id === selectedUbicacionId)

    const handleSave = async () => {
        if (!selectedUbicacionId) {
            console.error("No selected location ID to save.")
            return
        }
        setIsSaving(true)
        console.log("Saving config for location:", selectedUbicacionId)
        console.log("Config payload:", config)
        try {
            const configToSave = { ...config }
            const overrides = { ...configToSave.dateOverrides }
            delete (configToSave as any).dateOverrides // We do not want to save this inside the document

            await updateUbicaciones(selectedUbicacionId, {
                reservationConfig: configToSave
            } as any)

            const batch = writeBatch(db)
            const overridesCol = collection(db, 'reservation_date_overrides')

            Object.entries(overrides).forEach(([key, override]) => {
                const parts = key.split('_')
                const date = parts[0]
                const subId = parts[1] || 'all'
                const docId = `${selectedUbicacionId}_${date}_${subId}`

                batch.set(doc(overridesCol, docId), {
                    locationId: selectedUbicacionId,
                    date: date,
                    subId: subId,
                    enabled: override.enabled as boolean,
                    maxCapacity: override.maxCapacity as number,
                    intervals: override.intervals,
                    status: override.status || 'active'
                })
            })

            await batch.commit()

            alert('Configuración guardada correctamente.')
        } catch (error) {
            console.error('Error saving config:', error)
            alert('Error al guardar: ' + (error as Error).message)
        } finally {
            setIsSaving(false)
        }
    }

    const addInterval = () => {
        setConfig({ ...config, intervals: [...config.intervals, { start: '08:00', end: '20:00' }] })
    }

    const removeInterval = (index: number) => {
        const newIntervals = config.intervals.filter((_, i) => i !== index)
        setConfig({ ...config, intervals: newIntervals })
    }

    const updateInterval = (index: number, field: 'start' | 'end', value: string) => {
        const newIntervals = [...config.intervals]
        newIntervals[index][field] = value
        setConfig({ ...config, intervals: newIntervals })
    }

    const toggleDay = (index: number) => {
        const newDays = [...config.days]
        newDays[index] = !newDays[index]
        setConfig({ ...config, days: newDays })
    }

    const handleAddEmail = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            alert('Por favor ingresa un correo válido.')
            return
        }
        if (adminEmails.includes(newEmail)) {
            alert('Este correo ya está en la lista.')
            return
        }

        const updatedEmails = [...adminEmails, newEmail]
        setIsSavingEmails(true)
        try {
            await setDoc(doc(db, 'config', 'reservas'), {
                adminEmails: updatedEmails,
                senderEmail,
                senderPass
            }, { merge: true })
            setAdminEmails(updatedEmails)
            setNewEmail('')
        } catch (error) {
            console.error("Error adding email:", error)
        } finally {
            setIsSavingEmails(false)
        }
    }

    const handleRemoveEmail = async (emailToRemove: string) => {
        const updatedEmails = adminEmails.filter(e => e !== emailToRemove)
        setIsSavingEmails(true)
        try {
            await setDoc(doc(db, 'config', 'reservas'), {
                adminEmails: updatedEmails,
                senderEmail,
                senderPass
            }, { merge: true })
            setAdminEmails(updatedEmails)
        } catch (error) {
            console.error("Error removing email:", error)
        } finally {
            setIsSavingEmails(false)
        }
    }

    const handleSaveSenderConfig = async () => {
        setIsSavingEmails(true)
        try {
            await setDoc(doc(db, 'config', 'reservas'), {
                adminEmails,
                senderEmail,
                senderPass
            }, { merge: true })
            alert('Configuración de remitente guardada.')
        } catch (error) {
            console.error("Error saving sender config:", error)
            alert('Error al guardar datos de remitente.')
        } finally {
            setIsSavingEmails(false)
        }
    }

    const addDateOverride = (date: string, subId: string = 'all') => {
        if (!date) return
        const key = subId === 'all' ? date : `${date}_${subId}`
        const newOverrides = { ...config.dateOverrides }
        newOverrides[key] = {
            enabled: true,
            maxCapacity: config.maxCapacity,
            status: 'active',
            // Clonamos profundamente los intervalos para evitar mutaciones compartidas
            intervals: config.intervals.map(inv => ({ ...inv }))
        }
        setConfig({ ...config, dateOverrides: newOverrides })
    }

    const removeDateOverride = async (key: string) => {
        if (!selectedUbicacionId) return
        if (confirm("¿Estás seguro de eliminar este horario especial? Esto afectará en tiempo real.")) {
            const parts = key.split('_')
            const date = parts[0]
            const subId = parts[1] || 'all'
            const docId = `${selectedUbicacionId}_${date}_${subId}`

            try {
                await deleteDoc(doc(db, 'reservation_date_overrides', docId))
            } catch (err) {
                console.error("Error removing override", err)
            }
        }
    }

    const closeDateOverride = async (key: string) => {
        if (!selectedUbicacionId) return
        const parts = key.split('_')
        const date = parts[0]
        const subId = parts[1] || 'all'
        const docId = `${selectedUbicacionId}_${date}_${subId}`

        try {
            await updateDoc(doc(db, 'reservation_date_overrides', docId), {
                status: 'closed'
            })
        } catch (err) {
            console.error("Error closing override:", err)
            alert("No se pudo finalizar la reserva")
        }
    }

    const updateOverride = (key: string, field: string, value: any) => {
        const newOverrides = { ...config.dateOverrides }
        // Si el valor es una mutación de un objeto (como intervalos), aseguramos nueva referencia
        newOverrides[key] = { ...newOverrides[key], [field]: value }
        setConfig({ ...config, dateOverrides: newOverrides })
    }

    const handleResetBot = async () => {
        if (!confirm('¿Estás seguro de que deseas desvincular todos los dispositivos de WhatsApp? Esta acción es irreversible.')) {
            return
        }

        setIsResettingBot(true)
        try {
            const response = await fetch('https://whatsapp-builderbot-production.up.railway.app/v1/reset', {
                method: 'POST',
            })

            if (response.ok) {
                alert('Dispositivos desvinculados correctamente.')
                setQrCode(null) // Reset QR if it was visible
            } else {
                const errorData = await response.json().catch(() => ({}))
                alert(`Error al desvincular: ${errorData.message || response.statusText}`)
            }
        } catch (error) {
            console.error('Error resetting bot:', error)
            alert('Error de red al intentar desvincular dispositivos.')
        } finally {
            setIsResettingBot(false)
        }
    }

    const handleGenerateQR = async () => {
        setIsGeneratingQR(true)
        try {
            const response = await fetch('https://whatsapp-builderbot-production.up.railway.app/')
            if (response.ok) {
                // If it's a direct image URL or base64, we might need to handle it.
                // Given the instructions, we just hit the endpoint. 
                // Often these endpoints return an image/png or similar.
                // We'll use the URL directly as the src if it's an image.
                setQrCode('https://whatsapp-builderbot-production.up.railway.app/')
            } else {
                alert('Error al generar QR. Intenta de nuevo.')
            }
        } catch (error) {
            console.error('Error generating QR:', error)
            alert('Error de red al generar QR')
        } finally {
            setIsGeneratingQR(false)
        }
    }

    const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

    return (
        <div className={styles.container}>
            {/* Mobile Restriction Overlay */}
            <div className={styles.mobileRestriction}>
                <FaCog className={styles.mobileRestrictionIcon} />
                <h1 className={styles.mobileRestrictionTitle}>Configuración No Disponible</h1>
                <p className={styles.mobileRestrictionText}>
                    Esta sección contiene ajustes avanzados y requiere una pantalla más grande. Por favor, accede desde una PC.
                </p>
                <button
                    onClick={() => router.push('/reservas')}
                    className={styles.mobileRestrictionBtn}
                >
                    Volver a Reservas
                </button>
            </div>

            <Head>

                <title>Configuración de Reservas | Management Gym</title>
                <meta name="description" content="Configuración administrativa de reservas" />
            </Head>

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.titleGroup}>
                        <button
                            onClick={() => router.push('/reservas')}
                            className={styles.backButton}
                            title="Volver a Reservas"
                        >
                            <FaArrowLeft />
                        </button>
                        <div className={styles.titleContainer}>
                            <h1 className={styles.title}>Configuración de Reservas</h1>
                            <p className={styles.subtitle}>Panel administrativo de ambientes y horarios</p>
                        </div>
                    </div>

                    <div className={styles.headerActions}>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className={styles.mainContent} style={{ padding: '0 2rem' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2.5fr', gap: '2rem', marginTop: '2rem' }}>
                    {/* Lista de Ambientes */}
                    <aside style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', height: 'fit-content' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaMapMarkerAlt style={{ color: 'var(--primary-color)' }} /> Ambientes
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {ubicaciones.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No hay ambientes configurados.</p>
                            ) : (
                                ubicaciones.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => setSelectedUbicacionId(u.id || null)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '1rem',
                                            borderRadius: '0.75rem',
                                            border: selectedUbicacionId === u.id ? '2px solid var(--primary-color)' : '1px solid var(--border-glass)',
                                            background: selectedUbicacionId === u.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s',
                                            width: '100%'
                                        }}
                                    >
                                        <span style={{ fontWeight: selectedUbicacionId === u.id ? '600' : '400', color: 'var(--text-primary)' }}>
                                            {u.name}
                                        </span>
                                        {selectedUbicacionId === u.id && <FaCheck style={{ color: 'var(--primary-color)' }} />}
                                    </button>
                                ))
                            )}
                        </div>
                    </aside>

                    <section style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
                        {selectedUbicacion ? (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Configurar: {selectedUbicacion.name}</h2>
                                        <p style={{ color: 'var(--text-secondary)' }}>Define los horarios y reglas específicas para este ambiente.</p>

                                        {/* Sub-Ambientes Info */}
                                        {selectedUbicacion.haveSubEnvironments && (selectedUbicacion as any).subEnvironments?.length > 0 && (
                                            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', width: '100%', marginBottom: '0.25rem' }}>Sub-ambientes detectados:</span>
                                                {(selectedUbicacion as any).subEnvironments.map((se: any) => (
                                                    <span key={se.id} style={{ padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.4rem', fontSize: '0.75rem', border: '1px solid var(--border-glass)' }}>
                                                        {se.nombre}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        style={{
                                            padding: '0.85rem 2.5rem',
                                            borderRadius: '1rem',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            border: 'none',
                                            fontWeight: '700',
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            opacity: isSaving ? 0.7 : 1,
                                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        {isSaving ? 'Guardando...' : 'Guardar Todo'}
                                    </button>
                                </div>

                                <div >
                                    {/* <div style={{ padding: '1.5rem', border: '1px solid var(--border-glass)', borderRadius: '1rem' }}>
                                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Ajustes Generales</h3>

                                        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <input
                                                type="checkbox"
                                                id="enabled"
                                                checked={config.enabled}
                                                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                                style={{ width: '1.2rem', height: '1.2rem' }}
                                            />
                                            <label htmlFor="enabled" style={{ fontWeight: '500' }}>Habilitar reservas para este ambiente</label>
                                        </div>

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cupos por turno</label>
                                            <input
                                                type="number"
                                                value={config.maxCapacity}
                                                onChange={(e) => setConfig({ ...config, maxCapacity: parseInt(e.target.value) })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)' }}
                                            />
                                        </div>

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Duración del turno (minutos)</label>
                                            <select
                                                value={config.slotDuration}
                                                onChange={(e) => setConfig({ ...config, slotDuration: parseInt(e.target.value) })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)' }}
                                            >
                                                <option value={15}>15 minutos</option>
                                                <option value={30}>30 minutos</option>
                                                <option value={45}>45 minutos</option>
                                                <option value={60}>1 hora</option>
                                                <option value={90}>1.5 horas</option>
                                                <option value={120}>2 horas</option>
                                            </select>
                                        </div>
                                    </div> */}

                                    {/* <div style={{ padding: '1.5rem', border: '1px solid var(--border-glass)', borderRadius: '1rem' }}>
                                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Días Disponibles</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                            {dayLabels.map((label, i) => (
                                                <button
                                                    key={label}
                                                    onClick={() => toggleDay(i)}
                                                    className={`${styles.dayButton} ${config.days[i] ? styles.dayButtonActive : ''}`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div> */}
                                </div>

                                {/* Intervalos de Horarios */}
                                {/* <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--border-glass)', borderRadius: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.1rem' }}>Intervalos de Horarios</h3>
                                        <button
                                            onClick={addInterval}
                                            style={{ background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', padding: '0.4rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}
                                        >
                                            <FaPlus size={12} /> Añadir Rango
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {config.intervals.map((interval, index) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Desde:</span>
                                                    <input
                                                        type="time"
                                                        value={interval.start}
                                                        onChange={(e) => updateInterval(index, 'start', e.target.value)}
                                                        style={{ padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Hasta:</span>
                                                    <input
                                                        type="time"
                                                        value={interval.end}
                                                        onChange={(e) => updateInterval(index, 'end', e.target.value)}
                                                        style={{ padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                {config.intervals.length > 1 && (
                                                    <button
                                                        onClick={() => removeInterval(index)}
                                                        style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                        title="Eliminar rango"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Tip: Los turnos se generarán automáticamente entre estos rangos basándose en la duración definida.
                                    </p>
                                </div> */}

                                {/* Configuraciones de Fecha Específica (Overrides) */}
                                <div style={{ marginTop: '2.5rem', padding: '2rem', border: '2px solid rgba(59, 130, 246, 0.3)', borderRadius: '1.25rem', background: 'rgba(59, 130, 246, 0.05)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-primary)' }}>
                                        <FaCalendarAlt /> Configuraciones de Fecha Específica
                                    </h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                        Usa esta sección para definir horarios especiales para un día concreto (como feriados o eventos), lo cual tendrá prioridad sobre el horario semanal normal.
                                    </p>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                            <input
                                                type="checkbox"
                                                checked={showClosed}
                                                onChange={(e) => setShowClosed(e.target.checked)}
                                                style={{ width: '1rem', height: '1rem' }}
                                            />
                                            Mostrar configuraciones finalizadas
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Paso 1: Fecha</label>
                                            <input
                                                type="date"
                                                value={newOverrideDate}
                                                onChange={(e) => setNewOverrideDate(e.target.value)}
                                                style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                                            />
                                        </div>

                                        {selectedUbicacion.haveSubEnvironments && (selectedUbicacion as any).subEnvironments?.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Paso 2: Sub-ambiente</label>
                                                <select
                                                    value={newOverrideSubId}
                                                    onChange={(e) => setNewOverrideSubId(e.target.value)}
                                                    style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                                                >
                                                    <option value="all">Aplica a todo el local</option>
                                                    {(selectedUbicacion as any).subEnvironments.map((se: any) => (
                                                        <option key={se.id} value={se.id}>{se.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                            <button
                                                onClick={() => {
                                                    if (!newOverrideDate) {
                                                        alert('Por favor selecciona una fecha primero.')
                                                        return
                                                    }
                                                    addDateOverride(newOverrideDate, newOverrideSubId)
                                                }}
                                                className={styles.configButton}
                                                style={{ padding: '0.85rem 1.5rem', fontSize: '0.9rem' }}
                                            >
                                                <FaPlus size={12} /> Añadir reserva
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                                        {Object.entries(config.dateOverrides).sort().map(([key, override]: [string, any]) => {
                                            const parts = key.split('_')
                                            const date = parts[0]
                                            const subId = parts[1] || 'all'
                                            const subName = subId !== 'all' ? (selectedUbicacion as any).subEnvironments?.find((se: any) => se.id === subId)?.nombre || 'Área Desconocida' : 'Todo el local'

                                            return (
                                                <div key={key} style={{
                                                    padding: '1.5rem',
                                                    background: 'var(--bg-card)',
                                                    borderRadius: '1rem',
                                                    border: '1px solid var(--border-glass)',
                                                    position: 'relative',
                                                    boxShadow: 'var(--shadow-sm)',
                                                    opacity: override.status === 'closed' ? 0.6 : 1,
                                                    display: (override.status === 'closed' && !showClosed) ? 'none' : 'block'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ padding: '0.4rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem' }}>
                                                                <FaCalendarAlt size={14} style={{ color: 'var(--accent-primary)' }} />
                                                            </div>
                                                            <div>
                                                                <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)', display: 'block' }}>
                                                                    {date}
                                                                    {override.status === 'closed' && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '0.3rem' }}>FINALIZADA</span>}
                                                                </span>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: '700' }}>{subId !== 'all' ? `Área: ${subName}` : 'Todo el local'}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            {override.status !== 'closed' && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm("¿Estás seguro de finalizar esta reserva? Se moverá al historial y dejará de ser pública.")) {
                                                                            closeDateOverride(key)
                                                                        }
                                                                    }}
                                                                    title="Finalizar Reserva (Mover al historial)"
                                                                    style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                >
                                                                    <FaCheck size={12} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => removeDateOverride(key)}
                                                                title="Eliminar permanentemente"
                                                                style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                            >
                                                                <FaTrash size={12} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.05)', borderRadius: '0.75rem' }}>
                                                            <input
                                                                type="checkbox"
                                                                id={`enable-${key}`}
                                                                checked={override.enabled}
                                                                onChange={(e) => updateOverride(key, 'enabled', e.target.checked)}
                                                                style={{ width: '1.2rem', height: '1.2rem' }}
                                                            />
                                                            <label htmlFor={`enable-${key}`} style={{ fontWeight: '600', fontSize: '0.9rem' }}>Habilitado</label>
                                                        </div>
                                                        {/* <div>
                                                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cupos</label>
                                                            <input
                                                                type="number"
                                                                value={override.maxCapacity}
                                                                onChange={(e) => updateOverride(key, 'maxCapacity', parseInt(e.target.value))}
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)', fontWeight: '600' }}
                                                            />
                                                        </div> */}
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Intervalos Especiales:</span>
                                                            <button
                                                                onClick={() => updateOverride(key, 'intervals', [...override.intervals, { start: '08:00', end: '20:00' }])}
                                                                style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                                                            >
                                                                + Añadir Horario
                                                            </button>
                                                        </div>
                                                        {override.intervals.map((inv: any, idx: number) => (
                                                            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-glass)' }}>
                                                                <input type="time" value={inv.start} onChange={(e) => {
                                                                    const newInv = [...override.intervals]; newInv[idx].start = e.target.value; updateOverride(key, 'intervals', newInv)
                                                                }} style={{ padding: '0.3rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)', borderRadius: '0.3rem', outline: 'none' }} />
                                                                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                                                <input type="time" value={inv.end} onChange={(e) => {
                                                                    const newInv = [...override.intervals]; newInv[idx].end = e.target.value; updateOverride(key, 'intervals', newInv)
                                                                }} style={{ padding: '0.3rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)', borderRadius: '0.3rem', outline: 'none' }} />
                                                                {override.intervals.length > 1 && (
                                                                    <button onClick={() => updateOverride(key, 'intervals', override.intervals.filter((_: any, i: number) => i !== idx))} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>
                                                                        <FaTrash size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {Object.keys(config.dateOverrides).length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-glass)', borderRadius: '1rem' }}>
                                            No hay fechas específicas configuradas.
                                        </div>
                                    )}
                                </div>

                                {/* Configuración de Notificaciones */}
                                <div style={{ marginTop: '2.5rem', padding: '2rem', background: 'var(--bg-card)', borderRadius: '1.25rem', border: '1px solid var(--border-glass)' }}>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <FaEnvelope style={{ color: 'var(--primary-color)' }} /> Notificaciones de Reserva
                                    </h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                        Configura el correo desde el cual saldrán los avisos y los destinatarios que los recibirán.
                                    </p>

                                    <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid var(--border-glass)' }}>
                                        <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>1. Cuenta de Envío</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                            Este correo enviará las notificaciones. Usa Gmail y una &quot;Contraseña de aplicación&quot;.
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Correo del Gimnasio</label>
                                                <input
                                                    type="email"
                                                    placeholder="gym@gmail.com"
                                                    value={senderEmail}
                                                    onChange={(e) => setSenderEmail(e.target.value)}
                                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Contraseña de Aplicación (16 letras)</label>
                                                <input
                                                    type="password"
                                                    placeholder="•••• •••• •••• ••••"
                                                    value={senderPass}
                                                    onChange={(e) => setSenderPass(e.target.value)}
                                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)' }}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSaveSenderConfig}
                                            disabled={isSavingEmails}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--primary-color)', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', opacity: isSavingEmails ? 0.7 : 1 }}
                                        >
                                            Guardar Datos de Envío
                                        </button>
                                    </div>

                                    <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>2. Correos que recibirán avisos</h4>
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <input
                                            type="email"
                                            placeholder="ejemplo@correo.com"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)' }}
                                        />
                                        <button
                                            onClick={handleAddEmail}
                                            disabled={isSavingEmails}
                                            style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'var(--primary-color)', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', opacity: isSavingEmails ? 0.7 : 1 }}
                                        >
                                            Añadir
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {adminEmails.length === 0 ? (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem', border: '1px dashed var(--border-glass)', borderRadius: '0.75rem' }}>
                                                No hay correos configurados. Las notificaciones no se enviarán.
                                            </p>
                                        ) : (
                                            adminEmails.map(email => (
                                                <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid var(--border-glass)' }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{email}</span>
                                                    <button
                                                        onClick={() => handleRemoveEmail(email)}
                                                        disabled={isSavingEmails}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Configuración de WhatsApp */}
                                <div style={{ marginTop: '2.5rem', padding: '2rem', background: 'var(--bg-card)', borderRadius: '1.25rem', border: '1px solid var(--border-glass)', borderLeft: '4px solid #25D366' }}>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <FaWhatsapp style={{ color: '#25D366' }} /> Configuración de WhatsApp
                                    </h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                        Gestiona la conexión del bot de WhatsApp. Si el bot no está respondiendo o deseas cambiar de dispositivo, puedes desvincular las sesiones activas.
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <button
                                                onClick={handleResetBot}
                                                disabled={isResettingBot}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '0.75rem',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    transition: 'all 0.2s',
                                                    opacity: isResettingBot ? 0.7 : 1
                                                }}
                                                onMouseOver={(e) => {
                                                    if (!isResettingBot) {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                                    }
                                                }}
                                                onMouseOut={(e) => {
                                                    if (!isResettingBot) {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                    }
                                                }}
                                            >
                                                {isResettingBot ? 'Procesando...' : 'Desvincular dispositivos'}
                                            </button>

                                            <button
                                                onClick={handleGenerateQR}
                                                disabled={isGeneratingQR}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '0.75rem',
                                                    background: 'rgba(37, 211, 102, 0.1)',
                                                    color: '#25D366',
                                                    border: '1px solid rgba(37, 211, 102, 0.2)',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    transition: 'all 0.2s',
                                                    opacity: isGeneratingQR ? 0.7 : 1
                                                }}
                                                onMouseOver={(e) => {
                                                    if (!isGeneratingQR) {
                                                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.2)';
                                                    }
                                                }}
                                                onMouseOut={(e) => {
                                                    if (!isGeneratingQR) {
                                                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
                                                    }
                                                }}
                                            >
                                                <FaQrcode /> {isGeneratingQR ? 'Generando...' : 'Generar QR'}
                                            </button>
                                        </div>

                                        {qrCode && (
                                            <div style={{ textAlign: 'center', padding: '1rem', background: '#fff', borderRadius: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <p style={{ color: '#000', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '500' }}>Escanea este código con tu WhatsApp:</p>
                                                <img
                                                    src={`${qrCode}?t=${new Date().getTime()}`}
                                                    alt="WhatsApp QR Code"
                                                    style={{ maxWidth: '250px', width: '100%', borderRadius: '0.5rem' }}
                                                />
                                            </div>
                                        )}

                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                            Nota: Después de desvincular, deberás escanear el código QR nuevamente desde el servidor del bot.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                <FaMapMarkerAlt size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                <p>Selecciona un ambiente de la izquierda para comenzar a configurar.</p>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    )
}

export default ReservasConfig
