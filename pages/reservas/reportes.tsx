import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState, useMemo } from 'react'
import { FaArrowLeft, FaChartBar, FaCalendarAlt, FaCheck, FaClock, FaUsers, FaBuilding, FaFilter, FaMapMarkerAlt } from 'react-icons/fa'
import { useAuth } from '@/features/context/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useTheme } from '@/features/context/ThemeContext'
import { db } from '@/firebase/firebase.config'

import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import styles from './Reservas.module.css'

// Chart.js imports
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
)

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

const ReportsPage: NextPage = () => {
    const { userProfile, loading: authLoading } = useAuth()
    const { theme } = useTheme()
    const router = useRouter()

    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' })
    const [locationFilter, setLocationFilter] = useState('all')

    useEffect(() => {
        if (!authLoading && (!userProfile || userProfile.role !== 'admin')) {
            router.push('/reservas')
        }
    }, [authLoading, userProfile, router])

    useEffect(() => {
        if (userProfile?.role !== 'admin') return

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
    }, [userProfile])

    // Data Processing
    const filteredSolicitudes = useMemo(() => {
        return solicitudes.filter(s => {
            const matchesLocation = locationFilter === 'all' || s.locationId === locationFilter
            const matchesDate = (!dateRange.start || s.date >= dateRange.start) &&
                (!dateRange.end || s.date <= dateRange.end)
            return matchesLocation && matchesDate
        })
    }, [solicitudes, locationFilter, dateRange])

    const stats = useMemo(() => {
        const total = filteredSolicitudes.length
        const confirmed = filteredSolicitudes.filter(s => s.status === 'confirmada').length
        const pending = filteredSolicitudes.filter(s => s.status === 'pendiente').length
        const rejected = filteredSolicitudes.filter(s => s.status === 'rechazada').length
        const conversion = total > 0 ? ((confirmed / total) * 100).toFixed(1) : '0'

        return { total, confirmed, pending, rejected, conversion }
    }, [filteredSolicitudes])

    const locations = useMemo(() => {
        const locs = new Map<string, string>()
        solicitudes.forEach(s => locs.set(s.locationId, s.locationName))
        return Array.from(locs.entries()).map(([id, name]) => ({ id, name }))
    }, [solicitudes])

    // Chart Data Point 1: Demand by Area
    const demandByArea = useMemo(() => {
        const areas: Record<string, number> = {}
        filteredSolicitudes.filter(s => s.status === 'confirmada').forEach(s => {
            const name = s.subEnvironmentName || 'General'
            areas[name] = (areas[name] || 0) + 1
        })

        return {
            labels: Object.keys(areas),
            datasets: [{
                label: 'Reservas por Área',
                data: Object.values(areas),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 8
            }]
        }
    }, [filteredSolicitudes])

    // Chart Data Point 2: System Health (Status)
    const statusDistribution = useMemo(() => {
        return {
            labels: ['Confirmadas', 'Pendientes', 'Rechazadas'],
            datasets: [{
                data: [stats.confirmed, stats.pending, stats.rejected],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(245, 158, 11, 0.6)',
                    'rgba(239, 68, 68, 0.6)'
                ],
                borderColor: [
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 2
            }]
        }
    }, [stats])

    // Chart Data Point 3: Temporal Trends (by Date)
    const temporalTrends = useMemo(() => {
        const daily: Record<string, number> = {}
        filteredSolicitudes.filter(s => s.status === 'confirmada').forEach(s => {
            daily[s.date] = (daily[s.date] || 0) + 1
        })

        const sortedDates = Object.keys(daily).sort()
        return {
            labels: sortedDates,
            datasets: [{
                fill: true,
                label: 'Reservas Diarias',
                data: sortedDates.map(d => daily[d]),
                borderColor: 'rgba(139, 92, 246, 1)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4
            }]
        }
    }, [filteredSolicitudes])

    // Point 3: Top Clients
    const topClients = useMemo(() => {
        const clients: Record<string, { name: string, count: number }> = {}
        filteredSolicitudes.filter(s => s.status === 'confirmada').forEach(s => {
            if (!clients[s.userDni]) clients[s.userDni] = { name: s.userName, count: 0 }
            clients[s.userDni].count++
        })
        return Object.values(clients).sort((a, b) => b.count - a.count).slice(0, 5)
    }, [filteredSolicitudes])

    // Point 1: Peak Hours
    const peakHours = useMemo(() => {
        const hours: Record<string, number> = {}
        filteredSolicitudes.filter(s => s.status === 'confirmada').forEach(s => {
            hours[s.slot] = (hours[s.slot] || 0) + 1
        })
        const sortedSlots = Object.keys(hours).sort()
        return {
            labels: sortedSlots,
            datasets: [{
                label: 'Reservas por Hora',
                data: sortedSlots.map(s => hours[s]),
                backgroundColor: 'rgba(6, 182, 212, 0.6)',
                borderRadius: 4
            }]
        }
    }, [filteredSolicitudes])

    // New: Company Analysis
    const demandByCompany = useMemo(() => {
        const companies: Record<string, number> = {}
        filteredSolicitudes.filter(s => s.status === 'confirmada').forEach(s => {
            const name = s.companyName || 'Sin Empresa'
            companies[name] = (companies[name] || 0) + 1
        })

        const sortedCompanies = Object.entries(companies).sort((a, b) => b[1] - a[1])

        return {
            labels: sortedCompanies.map(c => c[0]),
            datasets: [{
                label: 'Reservas por Empresa',
                data: sortedCompanies.map(c => c[1]),
                backgroundColor: 'rgba(236, 72, 153, 0.6)',
                borderColor: 'rgba(236, 72, 153, 1)',
                borderWidth: 1,
                borderRadius: 8
            }]
        }
    }, [filteredSolicitudes])

    if (authLoading || loading) {
        return (
            <div className={styles.reportsLoader}>
                <div className={styles.reportsLoaderSpinner}></div>
            </div>
        )
    }

    if (userProfile?.role !== 'admin') return null

    const isDark = theme === 'dark'
    const textColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                titleColor: isDark ? '#fff' : '#000',
                bodyColor: isDark ? '#ccc' : '#333',
                padding: 12,
                titleFont: { size: 14, weight: 'bold' as const },
                bodyFont: { size: 13 },
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                borderWidth: 1
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { color: textColor, font: { size: 11 } }
            },
            x: {
                grid: { display: false },
                ticks: { color: textColor, font: { size: 11 } }
            }
        }
    }


    return (
        <div className={styles.container}>
            <Head>
                <title>Reportes de Reservas | Management Gym</title>
                <meta name="description" content="Análisis avanzado de reservas" />
            </Head>

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.headerTopRow}>
                        <div className={styles.titleGroup}>
                            <button onClick={() => router.push('/reservas')} className={styles.backButton} title="Volver a Reservas">
                                <FaArrowLeft />
                            </button>
                            <div className={styles.titleContainer}>
                                <h1 className={styles.title}>Reportes Inteligentes</h1>
                                <p className={styles.subtitle}>Análisis de datos y comportamiento</p>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                    <div className={styles.headerActions}>
                        {/* Otras acciones irían aquí */}
                    </div>
                </div>

            </header>

            <main className={styles.reportsMain}>
                <div className={styles.reportsContainer}>

                    {/* Filtros */}
                    <div className={styles.reportsFilterBar}>
                        <div className={styles.reportsFilterItem}>
                            <FaMapMarkerAlt className={styles.reportsIconPrimary} />
                            <select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className={styles.reportsInput}
                            >
                                <option value="all">Todos los locales</option>
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.reportsFilterItem}>
                            <FaCalendarAlt className={styles.reportsIconPrimary} />
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className={styles.reportsInput}
                            />
                            <span className={styles.reportsTextSecondary}>hasta</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className={styles.reportsInput}
                            />
                        </div>
                    </div>

                    {/* KPIs de Salud del Sistema */}
                    <div className={styles.reportsKpiUnified}>
                        <div className={styles.reportsKpiCardUnified}>
                            <div className={styles.reportsKpiItem}>
                                <div className={`${styles.reportsKpiIcon} ${styles.reportsKpiIconBlue}`}><FaCalendarAlt size={20} /></div>
                                <div>
                                    <p className={styles.reportsKpiLabel}>Solicitudes</p>
                                    <h2 className={styles.reportsKpiValue}>{stats.total}</h2>
                                </div>
                            </div>
                            <div className={styles.reportsKpiItem}>
                                <div className={`${styles.reportsKpiIcon} ${styles.reportsKpiIconGreen}`}><FaCheck size={20} /></div>
                                <div>
                                    <p className={styles.reportsKpiLabel}>Confirmadas</p>
                                    <h2 className={`${styles.reportsKpiValue} ${styles.reportsTextKpiConfirmed}`}>{stats.confirmed}</h2>
                                </div>
                            </div>
                            <div className={styles.reportsKpiItem}>
                                <div className={`${styles.reportsKpiIcon} ${styles.reportsKpiIconCyan}`}><FaChartBar size={20} /></div>
                                <div>
                                    <p className={styles.reportsKpiLabel}>Conversión</p>
                                    <h2 className={`${styles.reportsKpiValue} ${styles.reportsTextKpiConversion}`}>{stats.conversion}%</h2>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className={styles.reportsChartGrid}>
                        {/* Salud del Sistema - Distribución */}
                        <div className={styles.reportsChartCard}>
                            <h3 className={styles.reportsChartTitle}>Estado de Solicitudes</h3>
                            <div className={`${styles.reportsChartContainer} ${styles.reportsFlexCenter}`}>
                                <Doughnut
                                    data={statusDistribution}
                                    options={{
                                        plugins: {
                                            legend: {
                                                position: 'bottom' as const,
                                                labels: { color: textColor }
                                            }
                                        }
                                    }}
                                />
                            </div>

                        </div>

                        {/* Demanda por Ambiente */}
                        <div className={styles.reportsChartCard}>
                            <h3 className={styles.reportsChartTitle}>Demanda por Ambiente</h3>
                            <div className={styles.reportsChartContainer}>
                                <Bar data={demandByArea} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.reportsChartGridAsymmetric}>
                        {/* Tendencias Temporales */}
                        <div className={styles.reportsChartCard}>
                            <h3 className={styles.reportsChartTitle}>Tendencia Histórica</h3>
                            <div className={styles.reportsChartContainer}>
                                <Line data={temporalTrends} options={chartOptions} />
                            </div>
                        </div>

                        {/* Horas Pico */}
                        <div className={styles.reportsChartCard}>
                            <h3 className={styles.reportsChartTitle}>Reservas por Hora</h3>
                            <div className={styles.reportsChartContainer}>
                                <Bar data={peakHours} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.reportsChartGrid}>
                        {/* Demanda por Empresa */}
                        <div className={styles.reportsChartCard}>
                            <h3 className={styles.reportsChartTitle}>
                                <FaBuilding className={styles.reportsIconPink} /> Demanda por Empresa
                            </h3>
                            <div className={styles.reportsChartContainer} style={{ height: Math.max(300, demandByCompany.labels.length * 40) + 'px' }}>
                                <Bar
                                    data={demandByCompany}
                                    options={{
                                        ...chartOptions,
                                        indexAxis: 'y' as const,
                                        plugins: { ...chartOptions.plugins, legend: { display: false } }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Top Clientes */}
                        <div className={styles.reportsChartCard}>
                            <h3 className={styles.reportsChartTitle}>
                                <FaUsers className={styles.reportsIconPrimary} /> Clientes más activos
                            </h3>
                            <div className={styles.reportsList}>
                                {topClients.map((client, i) => (
                                    <div key={i} className={styles.reportsListItem}>
                                        <div>
                                            <p className={styles.reportsTextBoldSmall}>{client.name}</p>
                                            <p className={styles.reportsTextMutedSmall}>ID de Usuario</p>
                                        </div>
                                        <div className={styles.reportsTextAlignRight}>
                                            <span className={`${styles.reportsKpiValue} ${styles.reportsIconPrimary}`}>{client.count}</span>
                                            <p className={styles.reportsTextMutedTiny}>Reservas</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}

export default ReportsPage
