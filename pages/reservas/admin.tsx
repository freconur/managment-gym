import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { FaArrowLeft, FaCheck, FaTimes, FaCalendarAlt, FaClock, FaUser, FaBuilding, FaEnvelope, FaMapMarkerAlt, FaFilter, FaQrcode } from 'react-icons/fa'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/features/context/AuthContext'
import { useManagment } from '@/features/hooks/useManagment'
import { db } from '@/firebase/firebase.config'
import { collection, query, orderBy, onSnapshot, updateDoc, doc, Timestamp, writeBatch } from 'firebase/firestore'
import { QRCodeCanvas } from 'qrcode.react'
import { jsPDF } from 'jspdf'
import styles from './Reservas.module.css'

const URL_API_WHATSAPP = 'https://whatsapp-builderbot-production.up.railway.app/v1/messages'

interface Solicitud {
    id: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    userDni: string;
    companyName: string;
    locationId: string;
    locationName: string;
    subEnvironmentId?: string;
    subEnvironmentName?: string;
    date: string;
    slot: string;
    endTime?: string;
    status: 'pendiente' | 'confirmada' | 'rechazada';
    createdAt: Timestamp;
}

const AdminReservas: NextPage = () => {
    const router = useRouter()
    const { userProfile } = useAuth()
    const { ubicaciones } = useManagment()
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
    const [filter, setFilter] = useState<'todos' | 'pendiente' | 'confirmada' | 'rechazada'>('todos')
    const [locationFilter, setLocationFilter] = useState<string>('todas')
    const [slotFilter, setSlotFilter] = useState<string>('todos')
    const [loading, setLoading] = useState(true)
    const [solicitudToConfirm, setSolicitudToConfirm] = useState<Solicitud | null>(null)

    useEffect(() => {
        if (userProfile && userProfile.role !== 'admin') {
            router.push('/reservas')
            return
        }

        const q = query(collection(db, 'solicitudes_reserva'), orderBy('createdAt', 'desc'))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Solicitud[]
            setSolicitudes(list)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [userProfile, router])

    const handleUpdateStatus = async (id: string, newStatus: 'confirmada' | 'rechazada') => {
        const current = solicitudes.find(s => s.id === id)
        if (!current) return

        try {
            const batch = writeBatch(db)
            const mainRef = doc(db, 'solicitudes_reserva', id)
            batch.update(mainRef, { status: newStatus })

            let autoRejected: Solicitud[] = []

            if (newStatus === 'confirmada') {
                // Buscar conflictos: mismo local, sub-ambiente (o falta de él), fecha y hora
                const conflicts = solicitudes.filter(s =>
                    s.id !== id &&
                    s.status === 'pendiente' &&
                    s.locationId === current.locationId &&
                    s.subEnvironmentId === current.subEnvironmentId &&
                    s.date === current.date &&
                    s.slot === current.slot
                )

                conflicts.forEach(s => {
                    const ref = doc(db, 'solicitudes_reserva', s.id)
                    batch.update(ref, { status: 'rechazada' })
                    autoRejected.push(s)
                })
            }

            await batch.commit()

            // Notificaciones WhatsApp
            const sendWhatsApp = async (number: string, message: string) => {
                try {
                    await fetch(URL_API_WHATSAPP, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ number: `51${number}`, message })
                    })
                } catch (e) {
                    console.error("Error sending WhatsApp:", e)
                }
            }

            // Notificar al principal
            const mainMsg = newStatus === 'confirmada'
                ? `¡Hola ${current.userName}! Tu solicitud de reserva para ${current.locationName}${current.subEnvironmentName ? ' (' + current.subEnvironmentName + ')' : ''} el día ${current.date} a las ${current.slot} ha sido APROBADA. ¡Te esperamos!`
                : `Hola ${current.userName}. Lamentamos informarte que tu solicitud para ${current.locationName} el día ${current.date} a las ${current.slot} ha sido RECHAZADA.`

            await sendWhatsApp(current.userPhone, mainMsg)

            // Notificar a los auto-rechazados
            for (const s of autoRejected) {
                const rejectMsg = `Hola ${s.userName}. Lamentamos informarte que el cupo para ${s.locationName} el día ${s.date} a las ${s.slot} ya ha sido tomado. Tu solicitud ha sido RECHAZADA.`
                await sendWhatsApp(s.userPhone, rejectMsg)
            }

        } catch (error) {
            console.error("Error al actualizar estado:", error)
            alert("Error al actualizar la solicitud")
        }
    }

    const generatePDFQR = () => {
        const canvas = document.getElementById('qr-gen-canvas') as HTMLCanvasElement
        if (!canvas) {
            alert("Error al generar el QR. Intenta de nuevo.")
            return
        }

        const doc = new jsPDF()
        const qrDataUrl = canvas.toDataURL("image/png")

        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        // 1. Cabecera (Gris Slate muy tenue)
        doc.setFillColor(248, 250, 252) // #f8fafc (slate-50)
        doc.rect(0, 0, pageWidth, 45, 'F')

        // Texto de cabecera
        doc.setTextColor(51, 65, 85) // #334155 (slate-700)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(26)
        doc.text("SISTEMA DE RESERVAS", pageWidth / 2, 28, { align: 'center' })

        // 2. Título (Slate más oscuro pero suave)
        doc.setTextColor(30, 41, 59) // #1e293b (slate-800)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(19)
        doc.text("Escanea para reservar áreas recreativas", pageWidth / 2, 70, { align: 'center' })

        // Línea sutil debajo del título (azul lavado seco)
        doc.setDrawColor(219, 234, 254) // #dbeafe (blue-100)
        doc.setLineWidth(1.2)
        doc.line(pageWidth / 2 - 35, 75, pageWidth / 2 + 35, 75)

        // 3. QR Frame (Zinc muy suave)
        doc.setDrawColor(244, 244, 245) // #f4f4f5 (zinc-100)
        doc.setLineWidth(0.5)
        doc.roundedRect(pageWidth / 2 - 55, 90, 110, 110, 8, 8, 'D')

        // QR Code
        doc.addImage(qrDataUrl, 'PNG', pageWidth / 2 - 50, 95, 100, 100)

        // 4. Instrucciones de uso (Slate secundario)
        doc.setFontSize(13)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(71, 85, 105) // #475569 (slate-600)
        doc.text("https://managment-gym.vercel.app/reservas", pageWidth / 2, 215, { align: 'center' })

        // 5. Pie de página (Gris muy sutil)
        doc.setFillColor(250, 250, 250)
        doc.rect(0, pageHeight - 25, pageWidth, 25, 'F')

        doc.setFont("helvetica", "italic")
        doc.setFontSize(10)
        doc.setTextColor(156, 163, 175) // #9ca3af (gray-400)
        doc.text("Nota: Toda reserva está sujeta a previa evaluación por el administrador.", pageWidth / 2, pageHeight - 12, { align: 'center' })

        doc.save("Flyer-Reservas-Gym.pdf")
    }

    const getFullTime = (s: Solicitud) => {
        if (s.endTime) return `${s.slot} - ${s.endTime}`
        // Fallback for old records
        const location = ubicaciones.find(u => u.id === s.locationId)
        const duration = (location as any)?.reservationConfig?.slotDuration || 60
        const [h, m] = s.slot.split(':').map(Number)
        const endMins = h * 60 + m + duration
        const endH = Math.floor(endMins / 60)
        const endM = endMins % 60
        const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
        return `${s.slot} - ${endTime}`
    }

    const filteredSolicitudes = solicitudes.filter(s => {
        const matchesStatus = filter === 'todos' ? true : s.status === filter
        const matchesLocation = locationFilter === 'todas' ? true : s.locationName === locationFilter
        const matchesSlot = slotFilter === 'todos' ? true : s.slot === slotFilter
        return matchesStatus && matchesLocation && matchesSlot
    })

    const uniqueLocations = Array.from(new Set(solicitudes.map(s => s.locationName))).sort()
    const uniqueSlots = Array.from(new Set(
        solicitudes
            .filter(s => s.status === 'pendiente')
            .filter(s => locationFilter === 'todas' ? true : s.locationName === locationFilter)
            .map(s => s.slot)
    )).sort().map(slotStart => {
        const sample = solicitudes.find(s => s.status === 'pendiente' && s.slot === slotStart && (locationFilter === 'todas' ? true : s.locationName === locationFilter))
        return { start: slotStart, full: sample ? getFullTime(sample) : slotStart }
    })

    const stats = {
        total: solicitudes.length,
        pendientes: solicitudes.filter(s => s.status === 'pendiente').length,
        aprobadas: solicitudes.filter(s => s.status === 'confirmada').length
    }

    if (!userProfile || userProfile.role !== 'admin') return null

    return (
        <div className={styles.container}>
            <Head>
                <title>Admin - Solicitudes de Reserva</title>
            </Head>

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.headerTopRow}>
                        <div className={styles.titleGroup}>
                            <button onClick={() => router.push('/reservas')} className={styles.backButton}>
                                <FaArrowLeft />
                            </button>
                            <div className={styles.titleContainer}>
                                <h1 className={styles.title}>Gestión de Solicitudes</h1>
                                <p className={styles.subtitle}>Aprueba o rechaza las reservas de los clientes</p>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            onClick={generatePDFQR}
                            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                            title="Generar Flyer QR para Clientes"
                        >
                            <FaQrcode size={16} /> QR Cliente
                        </button>
                    </div>
                </div>

            </header>

            <main className={`${styles.mainContent} ${styles.adminMain}`}>
                <div className={styles.adminContainer}>
                    {/* Dashboard de Stats */}
                    <div className={styles.statsDashboard}>
                        <div className={`${styles.statItem} ${styles.statTotal}`}>
                            <div className={styles.statIcon}>
                                <FaFilter />
                            </div>
                            <div className={styles.statInfo}>
                                <p className={styles.statLabel}>Total Recibidas</p>
                                <h2 className={styles.statValue}>{stats.total}</h2>
                            </div>
                        </div>

                        <div className={`${styles.statItem} ${styles.statPending}`}>
                            <div className={styles.statIcon}>
                                <FaClock />
                            </div>
                            <div className={styles.statInfo}>
                                <p className={styles.statLabel}>Pendientes</p>
                                <h2 className={styles.statValue}>{stats.pendientes}</h2>
                            </div>
                        </div>

                        <div className={`${styles.statItem} ${styles.statApproved}`}>
                            <div className={styles.statIcon}>
                                <FaCheck />
                            </div>
                            <div className={styles.statInfo}>
                                <p className={styles.statLabel}>Aprobadas</p>
                                <h2 className={styles.statValue}>{stats.aprobadas}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Contenido Principal (Grilla) */}
                    {loading ? (
                        <div className={styles.adminLoading}>
                            <div className={styles.adminLoaderSpinner}></div>
                            <p style={{ color: 'var(--text-secondary)' }}>Cargando solicitudes...</p>
                        </div>
                    ) : (
                        <div className={styles.adminGrid}>

                            {/* COLUMNA IZQUIERDA: HISTORIAL COMPLETO EN TABLA */}
                            <div className={styles.adminColumn}>
                                <h2 className={styles.adminColumnTitle}>
                                    <FaCalendarAlt color="#10b981" /> Historial de Reservas
                                </h2>
                                <div className={styles.adminTableContainer}>
                                    <table className={styles.adminTable}>
                                        <thead className={styles.adminTableHead}>
                                            <tr>
                                                <th>Fecha/Hora</th>
                                                <th>Ubicación</th>
                                                <th>Cliente</th>
                                                <th>DNI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {solicitudes.filter(s => s.status === 'confirmada').length === 0 ? (
                                                <tr className={styles.adminTableRow}>
                                                    <td colSpan={4} className={styles.adminTableCell} style={{ textAlign: 'center', padding: '3rem' }}>No hay reservas confirmadas aún.</td>
                                                </tr>
                                            ) : (
                                                solicitudes.filter(s => s.status === 'confirmada').slice(0, 50).map(s => (
                                                    <tr key={s.id} className={styles.adminTableRow}>
                                                        <td className={styles.adminTableCell}>
                                                            <div className={styles.adminTableCellBold}>{s.date}</div>
                                                            <div className={styles.adminTableCellSub}>{getFullTime(s)}</div>
                                                        </td>
                                                        <td className={styles.adminTableCell}>
                                                            <div style={{ fontWeight: '600' }}>{s.locationName}</div>
                                                            <div className={styles.adminTableCellSub}>{s.subEnvironmentName || '-'}</div>
                                                        </td>
                                                        <td className={styles.adminTableCell}>
                                                            <div className={styles.adminTableCellBold}>{s.userName}</div>
                                                            <div className={styles.adminTableCellSub}>{s.companyName}</div>
                                                        </td>
                                                        <td className={styles.adminTableCell}>
                                                            <div>{s.userDni}</div>
                                                            <div className={styles.adminTableCellAccent}>{s.userPhone}</div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: FILTROS + SOLICITUDES PENDIENTES */}
                            <div className={styles.adminColumn}>
                                {/* Filtros */}
                                <div className={styles.filterSection} style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                                    {/* Filtro por Estado */}
                                    <div className={styles.filterGroup}>
                                        <span className={styles.filterLabel}>
                                            <FaFilter size={14} /> Filtrar por Estado
                                        </span>
                                        <div className={styles.filterList}>
                                            {(['todos', 'pendiente', 'confirmada', 'rechazada'] as const).map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => setFilter(s)}
                                                    className={`${styles.filterBtn} ${filter === s ? styles.filterBtnActive : ''}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Filtro por Ubicación */}
                                    <div className={styles.filterGroup}>
                                        <span className={styles.filterLabel}>
                                            <FaMapMarkerAlt size={14} /> Por Localización
                                        </span>
                                        <div className={styles.filterList}>
                                            <button
                                                onClick={() => {
                                                    setLocationFilter('todas')
                                                    setSlotFilter('todos')
                                                }}
                                                className={`${styles.filterBtn} ${locationFilter === 'todas' ? styles.filterBtnLocActive : ''}`}
                                            >
                                                Todas
                                            </button>
                                            {uniqueLocations.map(loc => (
                                                <button
                                                    key={loc}
                                                    onClick={() => {
                                                        setLocationFilter(loc)
                                                        setSlotFilter('todos')
                                                    }}
                                                    className={`${styles.filterBtn} ${locationFilter === loc ? styles.filterBtnLocActive : ''}`}
                                                >
                                                    {loc}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Filtro por Horario (Solo si se selecciona un local) */}
                                    {locationFilter !== 'todas' && (
                                        <div className={styles.filterGroup}>
                                            <span className={styles.filterLabel}>
                                                <FaClock size={14} /> Por Horario
                                            </span>
                                            <div className={styles.filterList}>
                                                <button
                                                    onClick={() => setSlotFilter('todos')}
                                                    className={`${styles.filterBtn} ${slotFilter === 'todos' ? styles.filterBtnActive : ''}`}
                                                >
                                                    Todos
                                                </button>
                                                {uniqueSlots.map(slot => (
                                                    <button
                                                        key={slot.start}
                                                        onClick={() => setSlotFilter(slot.start)}
                                                        className={`${styles.filterBtn} ${slotFilter === slot.start ? styles.filterBtnActive : ''}`}
                                                    >
                                                        {slot.full}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Resumen por Usuario (Historial de referencia) */}
                                {solicitudes.length > 0 && filter === 'pendiente' && (
                                    <div className={styles.historyRefBox} style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                                        <h3 className={styles.historyRefTitle} style={{ fontSize: '1rem' }}>
                                            <FaCalendarAlt color="var(--primary-color)" /> Referencia de Historial
                                        </h3>
                                        <div className={styles.historyClientGrid} style={{ gridTemplateColumns: '1fr' }}>
                                            {Array.from(new Set(filteredSolicitudes.filter(s => s.status === 'pendiente').map(s => s.userDni))).map(dni => {
                                                const client = solicitudes.find(s => s.userDni === dni)
                                                const history = solicitudes
                                                    .filter(s => s.userDni === dni && s.status === 'confirmada')
                                                    .sort((a, b) => b.date.localeCompare(a.date))
                                                    .slice(0, 1)

                                                return (
                                                    <div key={dni} className={styles.historyClientCard} style={{ padding: '0.75rem' }}>
                                                        <p className={styles.historyClientName} style={{ fontSize: '0.8rem' }}>{client?.userName}</p>
                                                        {history.length > 0 ? (
                                                            <div className={styles.historyClientRecords}>
                                                                {history.map(h => (
                                                                    <div key={h.id} className={styles.historyRecordRow} style={{ fontSize: '0.7rem' }}>
                                                                        <span>{h.date}</span>
                                                                        <span className={styles.historyRecordLoc}>{h.locationName}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className={styles.historyClientEmpty}>Sin previas</p>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                <h2 className={styles.adminColumnTitle}>
                                    <FaClock color="var(--accent-primary)" /> Pendientes por Aprobar
                                </h2>
                                {filteredSolicitudes.filter(s => s.status === 'pendiente').length === 0 ? (
                                    <div className={styles.adminEmpty}>
                                        <p style={{ color: 'var(--text-secondary)' }}>No hay solicitudes pendientes.</p>
                                    </div>
                                ) : (
                                    filteredSolicitudes.filter(s => s.status === 'pendiente').map(req => (
                                        <div key={req.id} className={styles.adminCard}>
                                            <div className={styles.adminCardHeader}>
                                                <h3 className={styles.adminCardName}>{req.userName}</h3>
                                                <div className={styles.adminCardInfo}>
                                                    <p className={styles.adminCardInfoItem}>
                                                        <FaBuilding size={12} style={{ opacity: 0.6 }} /> {req.companyName}
                                                    </p>
                                                    <p className={styles.adminCardInfoItem}>
                                                        <FaUser size={12} style={{ opacity: 0.6 }} /> DNI: {req.userDni}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={styles.slotModern} style={{ cursor: 'default', marginBottom: '1.25rem', padding: '1rem', '--dynamic-color': 'var(--primary-color)' } as any}>
                                                <span className={styles.slotModernTime}>
                                                    <FaClock size={14} /> {getFullTime(req)}
                                                </span>
                                                <div className={styles.slotModernRight}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>{req.date}</span>
                                                    <p className={styles.slotModernLocation} style={{ fontSize: '0.75rem' }}>{req.locationName} {req.subEnvironmentName ? `(${req.subEnvironmentName})` : ''}</p>
                                                </div>
                                            </div>

                                            <div className={styles.adminCardBtnGroup}>
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, 'rechazada')}
                                                    className={styles.adminBtnReject}
                                                >
                                                    <FaTimes /> Rechazar
                                                </button>
                                                <button
                                                    onClick={() => setSolicitudToConfirm(req)}
                                                    className={styles.adminBtnApprove}
                                                >
                                                    <FaCheck /> Aprobar
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Hidden QR Generator Canvas */}
            <div style={{ display: 'none' }}>
                <QRCodeCanvas
                    id="qr-gen-canvas"
                    value="https://managment-gym.vercel.app/reservas"
                    size={512}
                    level="H"
                    includeMargin={true}
                />
            </div>
            {/* Confirmación de Aprobación */}
            {solicitudToConfirm && (
                <div className={styles.adminModalOverlay}>
                    <div className={styles.adminModalCard}>
                        <div className={styles.adminModalIcon}>
                            <FaCheck size={32} />
                        </div>
                        <h2 className={styles.adminModalTitle}>¿Confirmar Aprobación?</h2>
                        <p className={styles.adminModalText}>
                            Estás a punto de aprobar la reserva de <strong>{solicitudToConfirm.userName}</strong> para <strong>{solicitudToConfirm.locationName}</strong> el día <strong>{solicitudToConfirm.date}</strong> a las <strong>{solicitudToConfirm.slot}</strong>.
                        </p>
                        <div className={styles.adminModalActions}>
                            <button
                                onClick={() => setSolicitudToConfirm(null)}
                                className={styles.adminModalBtnCancel}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    handleUpdateStatus(solicitudToConfirm.id, 'confirmada')
                                    setSolicitudToConfirm(null)
                                }}
                                className={styles.adminModalBtnConfirm}
                            >
                                Sí, Aprobar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminReservas
