import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect, useMemo, useRef } from 'react'
import { FaArrowLeft, FaCog, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaCheck, FaUser, FaBuilding, FaEnvelope, FaTimes, FaIdCard, FaPhone, FaSignOutAlt } from 'react-icons/fa'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/features/context/AuthContext'
import { useManagment } from '@/features/hooks/useManagment'
import { db } from '@/firebase/firebase.config'
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore'
import styles from './Reservas.module.css'

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

const getNextDays = (count: number) => {
    const days = []
    // Basado en el requerimiento: los clientes solo ven desde MAÑANA (+1 offset)
    const startDateStr = getPeruDate(1)
    const start = new Date(startDateStr + 'T00:00:00')

    for (let i = 0; i < count; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        days.push(new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Lima',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(d))
    }
    return days
}

const Reservas: NextPage = () => {
    const router = useRouter()
    const { userProfile, loading, logout } = useAuth()
    const { getUbicaciones, ubicaciones, loadingUbicaciones } = useManagment()
    const URL_API_WHATSAPP = 'https://whatsapp-builderbot-production.up.railway.app/v1/messages'
    const [selectedUbicacionId, setSelectedUbicacionId] = useState<string | null>(null)
    const [selectedSubEnvironmentId, setSelectedSubEnvironmentId] = useState<string | null>(null)
    const [selectedSubEnvironmentName, setSelectedSubEnvironmentName] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState(getPeruDate())
    const [localDateOverrides, setLocalDateOverrides] = useState<Record<string, any>>({})

    const [selectedSlotData, setSelectedSlotData] = useState<{ time: string, subId: string | null, subName: string | null } | null>(null)
    const [occupiedSlots, setOccupiedSlots] = useState<Record<string, string[]>>({}) // { "YYYY-MM-DD": ["10:00", ...]}

    const mainContentRef = useRef<HTMLElement>(null)
    const timeContainerRef = useRef<HTMLDivElement>(null)
    const summaryPanelRef = useRef<HTMLDivElement>(null)

    // Estado para el modal de solicitud
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSearchingDNI, setIsSearchingDNI] = useState(false)
    const [customerData, setCustomerData] = useState({
        dni: '',
        name: '',
        email: '',
        phone: '',
        company: '',
        companyId: ''
    })
    const [dniExists, setDniExists] = useState(false)
    const [companySuggestions, setCompanySuggestions] = useState<any[]>([])
    const [showCompanySuggestions, setShowCompanySuggestions] = useState(false)

    useEffect(() => {
        const searchDNI = async () => {
            if (customerData.dni.length === 8 && selectedUbicacionId) {
                setIsSearchingDNI(true)
                try {
                    const docRef = doc(db, 'ubicaciones', selectedUbicacionId, 'members', customerData.dni)
                    const docSnap = await getDoc(docRef)
                    if (docSnap.exists()) {
                        const data = docSnap.data()
                        setDniExists(true)

                        let initialCompanyId = ''
                        if (data.empresa) {
                            try {
                                const q = query(collection(db, 'empresas'), where('nombre', '==', data.empresa.toUpperCase()))
                                const snap = await getDocs(q)
                                if (!snap.empty) {
                                    initialCompanyId = snap.docs[0].id
                                }
                            } catch (e) {
                                console.error("Error auto-validating company:", e)
                            }
                        }

                        setCustomerData(prev => ({
                            ...prev,
                            name: `${data.nombre || ''} ${data.apellidos || ''}`.trim(),
                            phone: data.celular || data.telefono || prev.phone,
                            company: data.empresa || '',
                            companyId: initialCompanyId
                        }))
                    } else {
                        setDniExists(false)
                    }
                } catch (error) {
                    console.error("Error al buscar miembro por DNI:", error)
                    setDniExists(false)
                } finally {
                    setIsSearchingDNI(false)
                }
            } else {
                setDniExists(false)
            }
        }

        searchDNI()
    }, [customerData.dni, selectedUbicacionId])

    // Effect for Company Autocomplete with Debouncing
    useEffect(() => {
        // Solo buscamos empresas si el DNI NO fue encontrado (dniExists === false)
        if (customerData.companyId || !customerData.company.trim() || customerData.company.length < 2) {
            setCompanySuggestions([])
            setShowCompanySuggestions(false)
            return
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                const term = customerData.company.toLowerCase()
                const q = query(
                    collection(db, 'empresas'),
                    where('nombre', '>=', term),
                    where('nombre', '<=', term + '\uf8ff')
                )
                const querySnapshot = await getDocs(q)
                const suggestions = querySnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                }))
                setCompanySuggestions(suggestions)
                setShowCompanySuggestions(suggestions.length > 0)
            } catch (error) {
                console.error("Error searching companies:", error)
            }
        }, 500)

        return () => clearTimeout(delayDebounceFn)
    }, [customerData.company, dniExists])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    useEffect(() => {
        const unsubscribe = getUbicaciones()
        return () => unsubscribe()
    }, [getUbicaciones])

    // Fetch occupied slots from tomorrow onwards for the selected location (All areas)
    useEffect(() => {
        if (!selectedUbicacionId) {
            setOccupiedSlots({})
            return
        }

        const tomorrowStr = getPeruDate(1)
        const q = query(
            collection(db, 'solicitudes_reserva'),
            where('locationId', '==', selectedUbicacionId),
            where('date', '>=', tomorrowStr),
            where('status', '==', 'confirmada')
        )

        const unsubscribeOccupied = onSnapshot(q, (snapshot) => {
            const occupied: Record<string, string[]> = {}
            snapshot.docs.forEach(doc => {
                const data = doc.data()
                const key = `${data.date}_${data.subEnvironmentId || 'all'}`
                if (!occupied[key]) occupied[key] = []
                occupied[key].push(data.slot)
            })
            setOccupiedSlots(occupied)
        })

        return () => {
            unsubscribeOccupied()
        }
    }, [selectedUbicacionId])

    // Listener para los Date Overrides de la fecha actual
    useEffect(() => {
        if (!selectedUbicacionId) {
            setLocalDateOverrides({})
            return
        }

        const q = query(
            collection(db, 'reservation_date_overrides'),
            where('locationId', '==', selectedUbicacionId)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const overridesObj: Record<string, any> = {}
            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data()
                if (data.status === 'closed') return // Omitir configuraciones finalizadas

                const key = data.subId === 'all' ? data.date : `${data.date}_${data.subId}`
                overridesObj[key] = {
                    enabled: data.enabled,
                    maxCapacity: data.maxCapacity,
                    intervals: data.intervals
                }
            })
            setLocalDateOverrides(overridesObj)
        }, (error) => {
            console.error("Error fetching date overrides:", error)
        })

        return () => unsubscribe()
    }, [selectedUbicacionId])

    // Efecto para auto-seleccionar fecha y validaciones
    const activeUbicaciones = (ubicaciones as any[]).filter(u => u.reservationConfig?.enabled)
    const selectedUbicacion = activeUbicaciones.find(u => u.id === selectedUbicacionId)

    useEffect(() => {
        if (selectedUbicacion) {
            const config = (selectedUbicacion as any).reservationConfig

            // Si tiene sub-ambientes, verificamos disponibilidad global para encontrar la fecha mas proxima
            const checkHasSlotsInAnyArea = (date: string) => {
                if (!selectedUbicacion.haveSubEnvironments || !selectedUbicacion.subEnvironments) {
                    return generateSlots(config, date, null).length > 0
                }
                return selectedUbicacion.subEnvironments.some((se: any) => generateSlots(config, date, se.id).length > 0)
            }

            // Si la fecha actual no tiene cupos, buscamos la siguiente
            if (!checkHasSlotsInAnyArea(selectedDate)) {
                const nextDays = getNextDays(30)
                for (const d of nextDays) {
                    if (checkHasSlotsInAnyArea(d)) {
                        setSelectedDate(d)
                        setSelectedSlotData(null)
                        break
                    }
                }
            }

            // Si ya hay un sub-ambiente seleccionado, verificamos que siga teniendo cupos para la fecha (si no, deseleccionar)
            if (selectedUbicacion.haveSubEnvironments && selectedSubEnvironmentId) {
                const slots = generateSlots(config, selectedDate, selectedSubEnvironmentId)
                if (slots.length === 0) {
                    setSelectedSubEnvironmentId(null)
                    setSelectedSubEnvironmentName(null)
                }
            }
        }
    }, [selectedUbicacionId, selectedUbicacion, selectedSubEnvironmentId, selectedDate, localDateOverrides])

    // Generar slots base (sin filtrar de ocupados)
    const generateSlots = (config: any, dateStr: string, subId?: string | null) => {
        if (!config) return []
        let dateOverride = subId ? localDateOverrides[`${dateStr}_${subId}`] : null
        if (!dateOverride) {
            dateOverride = localDateOverrides[dateStr]
        }

        if (dateOverride) {
            if (!dateOverride.enabled) return []
        } else {
            if (!config.enabled) return []
            const date = new Date(dateStr + 'T00:00:00')
            const dayOfWeek = (date.getDay() + 6) % 7
            if (!config.days[dayOfWeek]) return []
        }

        const effectiveIntervals = dateOverride ? dateOverride.intervals : config.intervals
        const duration = config.slotDuration

        const slots: string[] = []
        effectiveIntervals.forEach((interval: { start: string, end: string }) => {
            const [startH, startM] = interval.start.split(':').map(Number)
            const [endH, endM] = interval.end.split(':').map(Number)
            let currentMinutes = startH * 60 + startM
            const endMinutes = endH * 60 + endM

            while (currentMinutes + duration <= endMinutes) {
                const h = Math.floor(currentMinutes / 60)
                const m = currentMinutes % 60
                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                slots.push(timeStr)
                currentMinutes += duration
            }
        })
        return slots
    }

    // Slots disponibles (filtrados y agregados)
    const availableSlots = useMemo(() => {
        if (!selectedUbicacion) return []
        const config = (selectedUbicacion as any).reservationConfig

        const getSlotsForArea = (subId: string | null, subName: string | null) => {
            const baseSlots = generateSlots(config, selectedDate, subId)
            const occupiedKey = `${selectedDate}_${subId || 'all'}`
            const occupied = occupiedSlots[occupiedKey] || []
            const duration = config.slotDuration || 60

            return baseSlots
                .map(time => {
                    const [h, m] = time.split(':').map(Number)
                    const endMins = h * 60 + m + duration
                    const endH = Math.floor(endMins / 60)
                    const endM = endMins % 60
                    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

                    return {
                        time,
                        endTime,
                        subId,
                        subName
                    }
                })
        }

        if (!selectedUbicacion.haveSubEnvironments) {
            return getSlotsForArea(null, null)
        }

        if (selectedSubEnvironmentId) {
            return getSlotsForArea(selectedSubEnvironmentId, selectedSubEnvironmentName)
        }

        // Vista agregada (Todos)
        let all: any[] = []
            ; (selectedUbicacion as any).subEnvironments?.forEach((se: any) => {
                all = [...all, ...getSlotsForArea(se.id, se.nombre)]
            })
        return all.sort((a, b) => a.time.localeCompare(b.time))
    }, [selectedUbicacion, selectedDate, selectedSubEnvironmentId, occupiedSlots, selectedSubEnvironmentName, localDateOverrides])


    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUbicacion || !selectedSlotData) return

        setIsSubmitting(true)
        try {
            const reservationData = {
                userDni: customerData.dni,
                userName: customerData.name,
                userEmail: customerData.email,
                userPhone: customerData.phone,
                companyName: customerData.company,
                companyId: customerData.companyId,
                locationId: selectedUbicacionId,
                locationName: (selectedUbicacion as any).name,
                subEnvironmentId: selectedSlotData.subId,
                subEnvironmentName: selectedSlotData.subName,
                date: selectedDate,
                slot: selectedSlotData.time,
                status: 'pendiente',
                createdAt: serverTimestamp()
            }

            await addDoc(collection(db, 'solicitudes_reserva'), reservationData)

            // WhatsApp Notification
            if (customerData.phone) {
                try {
                    const dateObj = new Date(selectedDate + 'T00:00:00')
                    const dayName = new Intl.DateTimeFormat('es-PE', { weekday: 'long' }).format(dateObj)
                    const dayNum = dateObj.getDate()
                    const monthName = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(dateObj)

                    // Format Time (e.g. 18:00 to 6PM)
                    const [h, m] = selectedSlotData.time.split(':').map(Number)
                    const ampm = h >= 12 ? 'PM' : 'AM'
                    const h12 = h % 12 || 12
                    const timeFormatted = `${h12}${m !== 0 ? ':' + m.toString().padStart(2, '0') : ''}${ampm}`

                    const message = `${customerData.dni} - ${customerData.name} ha solicitado una reserva para ${(selectedUbicacion as any).name}${selectedSlotData.subName ? ' ' + selectedSlotData.subName : ''} para el dia ${dayName} ${dayNum} de ${monthName} a las ${timeFormatted}.`

                    await fetch(URL_API_WHATSAPP, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            number: `51${customerData.phone}`,
                            message: message
                        })
                    })
                } catch (wsError) {
                    console.error("Error sending WhatsApp message:", wsError)
                }
            }

            setSubmitSuccess(true)
            setTimeout(() => {
                setIsModalOpen(false)
                setSubmitSuccess(false)
                setSelectedSlotData(null)
            }, 3000)
        } catch (error) {
            console.error("Error al enviar solicitud:", error)
            alert("Hubo un error al enviar tu solicitud. Por favor intenta de nuevo.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const getAreaColor = (name: string | null) => {
        if (!name) return 'var(--color-generic)';
        const n = name.toLowerCase();
        if (n.includes('gym')) return 'var(--color-gym)';
        if (n.includes('tennis')) return 'var(--color-tennis)';
        if (n.includes('poli')) return 'var(--color-polideportivo)';
        if (n.includes('campo')) return 'var(--color-campo)';
        if (n.includes('pisci')) return 'var(--color-piscina)';
        return 'var(--color-generic)';
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Reservas | Management Gym</title>
                <meta name="description" content="Gestiona tus reservas en el gimnasio" />
            </Head>

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.titleGroup}>
                        {userProfile && (
                            <button
                                onClick={() => router.push('/')}
                                className={styles.backButton}
                                title="Volver al Inicio"
                            >
                                <FaArrowLeft />
                            </button>
                        )}
                        <div className={styles.titleContainer}>
                            <h1 className={styles.title}>Reservas</h1>
                            <p className={styles.subtitle}>Gestiona las clases y espacios de tu gimnasio</p>
                        </div>
                    </div>

                    <div className={styles.headerActions}>
                        {!loading && userProfile?.role === 'admin' && (
                            <>
                                <button
                                    onClick={() => router.push('/reservas/admin')}
                                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                                    title="Ver Solicitudes de Clientes"
                                >
                                    <FaCalendarAlt size={16} /> Solicitudes
                                </button>
                                <button
                                    onClick={() => router.push('/reservas/config')}
                                    className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                                    title="Configuración de Reservas"
                                >
                                    <FaCog size={16} /> Configurar
                                </button>
                                <button
                                    onClick={logout}
                                    className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                    title="Cerrar Sesión"
                                >
                                    <FaSignOutAlt size={16} /> Salir
                                </button>
                            </>
                        )}
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className={styles.mainContent}>
                <div className={styles.layoutGrid}>
                    {/* Sección Principal (Full Width ahora) */}
                    <section className={styles.mainSection} ref={mainContentRef}>
                        {!selectedUbicacionId ? null : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{selectedUbicacion?.name}</h2>
                                            <button
                                                onClick={() => {
                                                    setSelectedUbicacionId(null)
                                                    setSelectedSlotData(null)
                                                    setSelectedSubEnvironmentId(null)
                                                }}
                                                style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                                                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                            >
                                                <FaMapMarkerAlt /> Cambiar Local
                                            </button>
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Escoge el día y la hora de tu preferencia.</p>
                                    </div>
                                </div>

                                {selectedUbicacion?.haveSubEnvironments && (selectedUbicacion as any).subEnvironments?.length > 0 && (
                                    <div style={{ marginBottom: '2.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--border-glass)' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FaBuilding size={16} /> Filtra por ambiente
                                        </h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            {/* Opción Todos */}
                                            <button
                                                onClick={() => {
                                                    setSelectedSubEnvironmentId(null)
                                                    setSelectedSubEnvironmentName(null)
                                                    setSelectedSlotData(null)
                                                }}
                                                style={{
                                                    padding: '0.75rem 1.5rem',
                                                    borderRadius: '1rem',
                                                    border: selectedSubEnvironmentId === null ? '2px solid var(--primary-color)' : '1px solid var(--border-glass)',
                                                    background: selectedSubEnvironmentId === null ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                    color: selectedSubEnvironmentId === null ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                Todos
                                            </button>
                                            {(selectedUbicacion as any).subEnvironments
                                                .filter((se: any) => generateSlots((selectedUbicacion as any).reservationConfig, selectedDate, se.id).length > 0)
                                                .map((se: any) => (
                                                    <button
                                                        key={se.id}
                                                        onClick={() => {
                                                            setSelectedSubEnvironmentId(se.id)
                                                            setSelectedSubEnvironmentName(se.nombre)
                                                            setSelectedSlotData(null)
                                                        }}
                                                        style={{
                                                            padding: '0.75rem 1.5rem',
                                                            borderRadius: '1rem',
                                                            border: selectedSubEnvironmentId === se.id ? '2px solid var(--primary-color)' : '1px solid var(--border-glass)',
                                                            background: selectedSubEnvironmentId === se.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                            color: selectedSubEnvironmentId === se.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    >
                                                        {se.nombre}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginBottom: '3rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FaCalendarAlt size={18} /> Selecciona una Fecha
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '2rem' }}>Próximos 30 días</p>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        overflowX: 'auto',
                                        paddingBottom: '1rem',
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none'
                                    }}>
                                        {getNextDays(30).map(dateStr => {
                                            const config = (selectedUbicacion as any).reservationConfig

                                            const hasSlots = selectedUbicacion?.haveSubEnvironments && (selectedUbicacion as any).subEnvironments?.length > 0
                                                ? (selectedUbicacion as any).subEnvironments.some((se: any) => generateSlots(config, dateStr, se.id).length > 0)
                                                : generateSlots(config, dateStr, null).length > 0

                                            if (!hasSlots) return null

                                            const d = new Date(dateStr + 'T00:00:00')
                                            const dayName = new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(d)
                                            const dayNum = d.getDate()
                                            const monthName = new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(d)
                                            const isSelected = selectedDate === dateStr

                                            return (
                                                <button
                                                    key={dateStr}
                                                    onClick={() => {
                                                        setSelectedDate(dateStr)
                                                        setSelectedSlotData(null)
                                                        if (window.innerWidth <= 768) {
                                                            setTimeout(() => {
                                                                timeContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                            }, 150)
                                                        }
                                                    }}
                                                    className={`${styles.dateCard} ${isSelected ? styles.dateCardSelected : ''}`}
                                                >
                                                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.05em' }}>
                                                        {dayName}
                                                    </span>
                                                    <span style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>
                                                        {dayNum}
                                                    </span>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                        {monthName}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2rem' }} ref={timeContainerRef}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FaClock size={18} /> Horarios para el {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
                                    </h3>

                                    {availableSlots.length === 0 ? (
                                        <div style={{ padding: '4rem 1rem', textAlign: 'center', border: '1px dashed var(--border-glass)', borderRadius: '1.5rem', color: 'var(--text-secondary)' }}>
                                            <FaClock size={32} style={{ marginBottom: '1rem', opacity: 0.1 }} />
                                            <p>No hay turnos programados.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                            {availableSlots.map((slot: any, idx: number) => {
                                                const isOccupied = occupiedSlots[`${selectedDate}_${slot.subId || 'all'}`]?.includes(slot.time);
                                                const isSelected = selectedSlotData?.time === slot.time && selectedSlotData?.subId === slot.subId;
                                                const areaColor = getAreaColor(slot.subName);

                                                return (
                                                    <button
                                                        key={`${slot.time}_${slot.subId || idx}`}
                                                        disabled={isOccupied}
                                                        onClick={() => {
                                                            setSelectedSlotData(slot)
                                                            if (window.innerWidth <= 768) {
                                                                setTimeout(() => {
                                                                    summaryPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                                }, 150)
                                                            }
                                                        }}
                                                        className={`${styles.slotModern} ${isSelected ? styles.slotModernSelected : ''}`}
                                                        style={{
                                                            opacity: isOccupied ? 0.4 : 1,
                                                            '--dynamic-color': areaColor
                                                        } as React.CSSProperties}
                                                    >
                                                        <span className={styles.slotModernTime}>
                                                            <FaClock size={16} style={{ opacity: isSelected ? 0.8 : 0.4 }} />
                                                            {slot.time} - {slot.endTime}
                                                        </span>

                                                        <div className={styles.slotModernRight}>
                                                            {isOccupied ? (
                                                                <span className={styles.slotModernOccupied}>OCUPADO</span>
                                                            ) : slot.subName ? (
                                                                <span className={styles.slotModernBadge}>
                                                                    {slot.subName}
                                                                </span>
                                                            ) : (
                                                                <span className={styles.slotModernBadge} style={{ opacity: 0.5 }}>
                                                                    DISPONIBLE
                                                                </span>
                                                            )}
                                                            <p className={styles.slotModernLocation}>
                                                                {(selectedUbicacion as any).nombre}
                                                            </p>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {selectedSlotData && (
                                    <div className={styles.summaryPanel} ref={summaryPanelRef}>
                                        <div className={styles.summaryInfo}>
                                            <h4 className={styles.summaryTitle}>Resumen de Selección</h4>
                                            <p className={styles.summaryDetails}>
                                                <FaMapMarkerAlt size={14} style={{ color: 'var(--primary-color)' }} />
                                                <span>{selectedUbicacion?.name} {selectedSlotData.subName ? `• ${selectedSlotData.subName}` : ''}</span>
                                            </p>
                                            <p className={styles.summaryDetails}>
                                                <FaCalendarAlt size={14} style={{ color: 'var(--primary-color)' }} />
                                                <span>
                                                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedSlotData.time}
                                                </span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className={styles.submitButton}
                                        >
                                            <FaCheck /> Confirmar Reserva
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Loader de Ubicaciones */}
            {loadingUbicaciones && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'var(--bg-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3000
                }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-glass)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Cargando locales...</p>
                </div>
            )}

            {/* Modal de Selección de Local Inicial */}
            {!loadingUbicaciones && !selectedUbicacionId && activeUbicaciones.length > 0 && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'var(--bg-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '1.5rem'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        width: '100%',
                        maxWidth: '450px',
                        borderRadius: '1.5rem',
                        border: '1px solid var(--border-glass)',
                        padding: '2.5rem 2rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <FaMapMarkerAlt size={28} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>¡Hola! 👋</h2>
                            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>¿En qué local te gustaría reservar hoy?</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {activeUbicaciones.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => {
                                        setSelectedUbicacionId(u.id || null)
                                        setSelectedSlotData(null)
                                        setSelectedSubEnvironmentId(null)
                                        setSelectedSubEnvironmentName(null)
                                    }}
                                    className={styles.modalLocalBtn}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div className={styles.modalLocalIcon}>
                                            <FaBuilding size={18} />
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                            {u.name}
                                        </span>
                                    </div>
                                    <FaArrowLeft style={{ transform: 'rotate(180deg)', opacity: 0.5 }} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Solicitud de Reserva */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '1.5rem',
                        border: '1px solid var(--border-glass)',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        {/* Header del Modal */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Solicitar Reserva</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <FaTimes size={20} />
                            </button>
                        </div>

                        {submitSuccess ? (
                            <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <FaCheck size={32} />
                                </div>
                                <h3 style={{ marginBottom: '0.5rem' }}>¡Solicitud Enviada!</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Tu solicitud ha sido registrada correctamente. El administrador se pondrá en contacto contigo pronto.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitRequest} style={{ padding: '2rem' }}>
                                {/* Resumen Visual */}
                                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid var(--border-glass)' }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Resumen de Reserva:</p>
                                    <p style={{ margin: '0.5rem 0 0', fontWeight: '700', color: 'var(--primary-color)' }}>
                                        {selectedUbicacion?.name} {selectedSlotData?.subName ? `• ${selectedSlotData.subName}` : ''} • {selectedDate} • {selectedSlotData?.time}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>DNI</label>
                                        <div style={{ position: 'relative' }}>
                                            <FaIdCard style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }} />
                                            <input
                                                required
                                                type="text"
                                                maxLength={8}
                                                value={customerData.dni}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '')
                                                    setCustomerData({ ...customerData, dni: val })
                                                }}
                                                placeholder="Ej. 12345678"
                                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                                            />
                                            {isSearchingDNI && <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Buscando...</span>}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nombres y Apellidos</label>
                                        <div style={{ position: 'relative' }}>
                                            <FaUser style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }} />
                                            <input
                                                required
                                                type="text"
                                                value={customerData.name}
                                                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                                                placeholder="Ej. Juan Pérez"
                                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nombre de Empresa</label>
                                        <div style={{ position: 'relative' }}>
                                            <FaBuilding style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }} />
                                            <input
                                                required
                                                type="text"
                                                value={customerData.company}
                                                onChange={(e) => setCustomerData({ ...customerData, company: e.target.value, companyId: '' })}
                                                onFocus={() => dniExists && customerData.company.trim().length >= 2 && setShowCompanySuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 200)}
                                                placeholder="Empresa SAC"
                                                autoComplete="off"
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                                                    borderRadius: '0.75rem',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    border: customerData.companyId ? '1px solid #10b981' : '1px solid var(--border-glass)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    transition: 'all 0.3s'
                                                }}
                                            />
                                            {customerData.companyId && (
                                                <FaCheck style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: '0.9rem' }} />
                                            )}
                                            {showCompanySuggestions && companySuggestions.length > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    zIndex: 10,
                                                    marginTop: '0.5rem',
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--border-glass)',
                                                    borderRadius: '0.75rem',
                                                    maxHeight: '200px',
                                                    overflowY: 'auto',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                                    backdropFilter: 'blur(10px)'
                                                }}>
                                                    {companySuggestions.map((suggestion) => (
                                                        <div
                                                            key={suggestion.id}
                                                            onClick={() => {
                                                                setCustomerData({
                                                                    ...customerData,
                                                                    company: suggestion.nombre.toUpperCase(),
                                                                    companyId: suggestion.id
                                                                })
                                                                setShowCompanySuggestions(false)
                                                            }}
                                                            style={{
                                                                padding: '0.75rem 1rem',
                                                                cursor: 'pointer',
                                                                borderBottom: '1px solid var(--border-glass)',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '0.9rem',
                                                                textTransform: 'uppercase',
                                                                transition: 'background 0.2s'
                                                            }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            {suggestion.nombre}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Correo Electrónico</label>
                                        <div style={{ position: 'relative' }}>
                                            <FaEnvelope style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }} />
                                            <input
                                                required
                                                type="email"
                                                value={customerData.email}
                                                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                                                placeholder="juan@empresa.com"
                                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Teléfono o Celular</label>
                                        <div style={{ position: 'relative' }}>
                                            <FaPhone style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }} />
                                            <input
                                                required
                                                type="tel"
                                                value={customerData.phone}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '')
                                                    setCustomerData({ ...customerData, phone: val })
                                                }}
                                                placeholder="Ej. 987654321"
                                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{
                                        width: '100%',
                                        marginTop: '2rem',
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        background: (isSubmitting || !customerData.companyId) ? 'var(--text-secondary)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: '700',
                                        cursor: (isSubmitting || !customerData.companyId) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: (isSubmitting || !customerData.companyId) ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2)'
                                    }}
                                >
                                    {isSubmitting ? 'Enviando...' : !customerData.companyId ? 'Selecciona una empresa' : 'Enviar Solicitud'}
                                </button>
                                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    * Tu reserva está sujeta a aprobación del administrador.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Reservas
