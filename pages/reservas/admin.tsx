import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { FaArrowLeft, FaCheck, FaTimes, FaCalendarAlt, FaClock, FaUser, FaBuilding, FaEnvelope, FaMapMarkerAlt, FaFilter, FaQrcode } from 'react-icons/fa'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/features/context/AuthContext'
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
    status: 'pendiente' | 'confirmada' | 'rechazada';
    createdAt: Timestamp;
}

const AdminReservas: NextPage = () => {
    const router = useRouter()
    const { userProfile } = useAuth()
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
    const [filter, setFilter] = useState<'todos' | 'pendiente' | 'confirmada' | 'rechazada'>('todos')
    const [locationFilter, setLocationFilter] = useState<string>('todas')
    const [loading, setLoading] = useState(true)

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

    const filteredSolicitudes = solicitudes.filter(s => {
        const matchesStatus = filter === 'todos' ? true : s.status === filter
        const matchesLocation = locationFilter === 'todas' ? true : s.locationName === locationFilter
        return matchesStatus && matchesLocation
    })

    const uniqueLocations = Array.from(new Set(solicitudes.map(s => s.locationName))).sort()

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
                    <div className={styles.titleGroup}>
                        <button onClick={() => router.push('/reservas')} className={styles.backButton}>
                            <FaArrowLeft />
                        </button>
                        <div className={styles.titleContainer}>
                            <h1 className={styles.title}>Gestión de Solicitudes</h1>
                            <p className={styles.subtitle}>Aprueba o rechaza las reservas de los clientes</p>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            onClick={generatePDFQR}
                            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                            title="Generar Flyer QR para Clientes"
                        >
                            <FaQrcode size={16} /> QR Cliente
                        </button>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className={styles.mainContent} style={{ padding: '0 2rem', marginTop: '2rem' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    {/* Dashboard de Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                <FaFilter size={24} />
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Total Recibidas</p>
                                <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: '800' }}>{stats.total}</h2>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                <FaClock size={24} />
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: '600' }}>Pendientes</p>
                                <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: '800', color: 'var(--accent-primary)' }}>{stats.pendientes}</h2>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                <FaCheck size={24} />
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>Aprobadas</p>
                                <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: '800', color: '#10b981' }}>{stats.aprobadas}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border-glass)' }}>
                        {/* Filtro por Estado */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FaFilter size={14} /> Filtrar por Estado
                            </span>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {(['todos', 'pendiente', 'confirmada', 'rechazada'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setFilter(s)}
                                        style={{
                                            padding: '0.6rem 1.25rem',
                                            borderRadius: '1rem',
                                            border: filter === s ? '2px solid var(--primary-color)' : '1px solid var(--border-glass)',
                                            background: filter === s ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            color: filter === s ? 'var(--primary-color)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            textTransform: 'capitalize',
                                            transition: 'all 0.2s',
                                            fontWeight: '700'
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filtro por Ubicación */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FaMapMarkerAlt size={14} /> Por Localización
                            </span>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setLocationFilter('todas')}
                                    style={{
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '1rem',
                                        border: locationFilter === 'todas' ? '2px solid var(--accent-secondary)' : '1px solid var(--border-glass)',
                                        background: locationFilter === 'todas' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                        color: locationFilter === 'todas' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s',
                                        fontWeight: '700'
                                    }}
                                >
                                    Todas
                                </button>
                                {uniqueLocations.map(loc => (
                                    <button
                                        key={loc}
                                        onClick={() => setLocationFilter(loc)}
                                        style={{
                                            padding: '0.6rem 1.25rem',
                                            borderRadius: '1rem',
                                            border: locationFilter === loc ? '2px solid var(--accent-secondary)' : '1px solid var(--border-glass)',
                                            background: locationFilter === loc ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                            color: locationFilter === loc ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            transition: 'all 0.2s',
                                            fontWeight: '700'
                                        }}
                                    >
                                        {loc}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Resumen por Usuario (Historial) */}
                    {solicitudes.length > 0 && filter === 'pendiente' && (
                        <div style={{ marginBottom: '3rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.03)', borderRadius: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <FaCalendarAlt color="var(--primary-color)" /> Referencia de Historial para Pendientes
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                A continuación se muestran las últimas reservas confirmadas de los clientes que tienen solicitudes pendientes.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {Array.from(new Set(filteredSolicitudes.filter(s => s.status === 'pendiente').map(s => s.userDni))).map(dni => {
                                    const client = solicitudes.find(s => s.userDni === dni)
                                    const history = solicitudes
                                        .filter(s => s.userDni === dni && s.status === 'confirmada')
                                        .sort((a, b) => b.date.localeCompare(a.date))
                                        .slice(0, 2)

                                    return (
                                        <div key={dni} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border-glass)' }}>
                                            <p style={{ margin: '0 0 0.5rem', fontWeight: '800', fontSize: '0.9rem' }}>{client?.userName}</p>
                                            {history.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    {history.map(h => (
                                                        <div key={h.id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>{h.date}</span>
                                                            <span style={{ fontWeight: '600' }}>{h.locationName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin reservas previas confirmadas</p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
                            <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-glass)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite' }}></div>
                            <p style={{ color: 'var(--text-secondary)' }}>Cargando solicitudes...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) minmax(500px, 1.2fr)', gap: '2.5rem', alignItems: 'flex-start' }}>

                            {/* COLUMNA IZQUIERDA: SOLICITUDES PENDIENTES */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem' }}>
                                    <FaClock color="var(--accent-primary)" /> Pendientes por Aprobar
                                </h2>
                                {filteredSolicitudes.filter(s => s.status === 'pendiente').length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px dashed var(--border-glass)' }}>
                                        <p style={{ color: 'var(--text-secondary)' }}>No hay solicitudes pendientes.</p>
                                    </div>
                                ) : (
                                    filteredSolicitudes.filter(s => s.status === 'pendiente').map(req => (
                                        <div key={req.id} style={{
                                            background: 'var(--bg-card)',
                                            borderRadius: '1.5rem',
                                            border: '1px solid var(--border-glass)',
                                            padding: '1.5rem',
                                            transition: 'all 0.3s'
                                        }}>
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem', fontWeight: '800' }}>{req.userName}</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <FaBuilding size={12} style={{ opacity: 0.6 }} /> {req.companyName}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <FaUser size={12} style={{ opacity: 0.6 }} /> DNI: {req.userDni}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={styles.slotModern} style={{ cursor: 'default', marginBottom: '1.25rem', padding: '1rem', '--dynamic-color': 'var(--primary-color)' } as any}>
                                                <span className={styles.slotModernTime}>
                                                    <FaClock size={14} /> {req.slot}
                                                </span>
                                                <div className={styles.slotModernRight}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>{req.date}</span>
                                                    <p className={styles.slotModernLocation} style={{ fontSize: '0.75rem' }}>{req.locationName} {req.subEnvironmentName ? `(${req.subEnvironmentName})` : ''}</p>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, 'rechazada')}
                                                    style={{ padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                                >
                                                    <FaTimes /> Rechazar
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, 'confirmada')}
                                                    style={{ padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                                >
                                                    <FaCheck /> Aprobar
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* COLUMNA DERECHA: HISTORIAL COMPLETO EN TABLA */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem' }}>
                                    <FaCalendarAlt color="#10b981" /> Historial de Reservas
                                </h2>
                                <div style={{ background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)' }}>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Fecha/Hora</th>
                                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Ubicación</th>
                                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Cliente</th>
                                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>DNI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {solicitudes.filter(s => s.status === 'confirmada').length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No hay reservas confirmadas aún.</td>
                                                </tr>
                                            ) : (
                                                solicitudes.filter(s => s.status === 'confirmada').slice(0, 50).map(s => (
                                                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div style={{ fontWeight: '700' }}>{s.date}</div>
                                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{s.slot}</div>
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div style={{ fontWeight: '600' }}>{s.locationName}</div>
                                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{s.subEnvironmentName || '-'}</div>
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div style={{ fontWeight: '700' }}>{s.userName}</div>
                                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{s.companyName}</div>
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div>{s.userDni}</div>
                                                            <div style={{ color: 'var(--primary-color)', fontSize: '0.75rem' }}>{s.userPhone}</div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
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
        </div>
    )
}

export default AdminReservas
