import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import {
    getFirestore,
    collection,
    query,
    orderBy,
    getDocs,
    Timestamp
} from 'firebase/firestore'
import { app } from '@/firebase/firebase.config'
import { FaChartBar, FaArrowLeft, FaFilter } from 'react-icons/fa'
import { SubEnvironment } from '@/features/types/types'
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
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import styles from './Reports.module.css'


ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
)

const db = getFirestore(app)

interface AccessRecord {
    id: string;
    company: string;
    sexo?: string;
    subEnvironments?: string[];
    timestamp: any;
}

const ReportsPage: NextPage = () => {
    const [accessData, setAccessData] = useState<AccessRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('this_month')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    const [selectedCompany, setSelectedCompany] = useState<string>('all')

    const [selectedSex, setSelectedSex] = useState<string>('all')
    const [subEnvironmentsList, setSubEnvironmentsList] = useState<SubEnvironment[]>([])
    const [selectedSubEnv, setSelectedSubEnv] = useState<string>('all')

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // Fetch all data and filter client-side for flexibility
                // In a production app with huge data, we would add date range constraints to the query
                const q = query(collection(db, 'asistencias'), orderBy('timestamp', 'desc'))
                const snapshot = await getDocs(q)
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as AccessRecord[]
                setAccessData(data)
            } catch (error) {
                console.error("Error fetching report data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()

        // Fetch SubEnvironments
        const fetchSubEnvs = async () => {
            const q = query(collection(db, 'sub_environments'), orderBy('createdAt', 'desc'))
            const snapshot = await getDocs(q)
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SubEnvironment[]
            setSubEnvironmentsList(data)
        }
        fetchSubEnvs()
    }, [])

    const filteredData = useMemo(() => {
        let filtered = accessData

        // Date Filter
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        if (dateRange === 'this_month') {
            filtered = filtered.filter(item => item.timestamp?.toDate() >= startOfMonth)
        } else if (dateRange === 'today') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0))
            filtered = filtered.filter(item => item.timestamp?.toDate() >= startOfDay)
        } else if (dateRange === 'custom' && customStart && customEnd) {
            // Create dates and adjust for local timezone offset to ensure correct day comparison
            const start = new Date(customStart)
            start.setMinutes(start.getMinutes() + start.getTimezoneOffset())

            const end = new Date(customEnd)
            end.setMinutes(end.getMinutes() + end.getTimezoneOffset())

            // Set end of day for the end date
            end.setHours(23, 59, 59, 999)

            filtered = filtered.filter(item => {
                const date = item.timestamp?.toDate()
                return date >= start && date <= end
            })
        }


        // Company Filter
        if (selectedCompany !== 'all') {
            filtered = filtered.filter(item => item.company === selectedCompany)
        }

        // Sex Filter
        if (selectedSex !== 'all') {
            filtered = filtered.filter(item => item.sexo === selectedSex)
        }

        // SubEnvironment Filter
        if (selectedSubEnv !== 'all') {
            filtered = filtered.filter(item =>
                item.subEnvironments && item.subEnvironments.includes(selectedSubEnv)
            )
        }

        return filtered
    }, [accessData, dateRange, selectedCompany, selectedSex, customStart, customEnd, selectedSubEnv])

    // Get unique companies for filter
    const companies = useMemo(() => {
        const unique = new Set(accessData.map(item => item.company).filter(Boolean))
        return Array.from(unique).sort()
    }, [accessData])

    // --- Chart Data Preparation ---

    // 1. Bar Chart: Access by Company
    const companyChartData = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredData.forEach(item => {
            const comp = item.company || 'Sin Empresa'
            counts[comp] = (counts[comp] || 0) + 1
        })

        return {
            labels: Object.keys(counts),
            datasets: [
                {
                    label: 'Ingresos',
                    data: Object.values(counts),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                },
            ],
        }
    }, [filteredData])

    // 2. Doughnut Chart: Access by Sex
    // 2. Doughnut Chart: Access by Sex
    const sexChartData = useMemo(() => {
        const counts = {
            'Hombre': 0,
            'Mujer': 0,
            'Otro': 0
        }

        filteredData.forEach(item => {
            const sex = item.sexo
            if (sex === 'Hombre') counts['Hombre'] += 1
            else if (sex === 'Mujer') counts['Mujer'] += 1
            else counts['Otro'] += 1
        })

        // Remove 'Otro' if 0 to keep chart clean, or keep it if you prefer consistency
        // Keeping buckets fixed ensures color consistency
        const labels = ['Hombre', 'Mujer', 'Otro']
        const data = [counts['Hombre'], counts['Mujer'], counts['Otro']]
        const backgroundColor = [
            'rgba(54, 162, 235, 0.6)', // Blue for Hombre
            'rgba(255, 99, 132, 0.6)', // Pink for Mujer
            'rgba(201, 203, 207, 0.6)' // Grey for Other
        ]
        const borderColor = [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(201, 203, 207, 1)'
        ]

        // Filter out zero values if desired, or keep as is. 
        // Let's filter slightly for visual cleanliness but keep arrays aligned
        const finalLabels: string[] = []
        const finalData: number[] = []
        const finalBg: string[] = []
        const finalBorder: string[] = []

        labels.forEach((label, idx) => {
            if (data[idx] > 0) {
                finalLabels.push(label)
                finalData.push(data[idx])
                finalBg.push(backgroundColor[idx])
                finalBorder.push(borderColor[idx])
            }
        })

        return {
            labels: finalLabels,
            datasets: [
                {
                    data: finalData,
                    backgroundColor: finalBg,
                    borderColor: finalBorder,
                    borderWidth: 1,
                },
            ],
        }
    }, [filteredData])

    // 3. Line Chart: Timeline (Last 7 days or filtered range distribution)
    const timelineChartData = useMemo(() => {
        const counts: Record<string, number> = {}

        filteredData.forEach(item => {
            if (!item.timestamp?.toDate) return
            const date = item.timestamp.toDate().toLocaleDateString()
            counts[date] = (counts[date] || 0) + 1
        })

        // Sort by date
        const sortedDates = Object.keys(counts).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        return {
            labels: sortedDates,
            datasets: [
                {
                    label: 'Ingresos por Día',
                    data: sortedDates.map(d => counts[d]),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.3, // Smooth curve
                },
            ],
        }
    }, [filteredData])


    return (
        <>
            <Head>
                <title>Reportes de Ingresos - Management Gym</title>
            </Head>
            <div className={styles.container}>
                <main className={styles.main}>

                    <div className={styles.header}>
                        <Link href="/members" className={styles.backLink}>
                            <FaArrowLeft /> Volver a Miembros
                        </Link>
                        <h1 className={styles.title}>
                            <FaChartBar className={styles.titleIcon} /> Reportes de Ingresos
                        </h1>
                    </div>

                    {/* Filters */}
                    <div className={styles.filtersContainer}>
                        <div className={styles.filtersTitle}>
                            <FaFilter /> Filtros
                        </div>
                        <div className={styles.filtersGrid}>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className={styles.select}
                            >
                                <option value="all">Todo el Historial</option>
                                <option value="this_month">Este Mes</option>
                                <option value="today">Hoy</option>
                                <option value="custom">Rango Personalizado</option>
                            </select>

                            {dateRange === 'custom' && (
                                <div className={styles.customDateContainer}>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className={styles.dateInput}
                                    />
                                    <span className={styles.dateSeparator}>a</span>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className={styles.dateInput}
                                    />
                                </div>
                            )}


                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className={styles.select}
                            >
                                <option value="all">Todas las Empresas</option>
                                {companies.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <select
                                value={selectedSex}
                                onChange={(e) => setSelectedSex(e.target.value)}
                                className={styles.select}
                            >
                                <option value="all">Todos los Sexos</option>
                                <option value="Hombre">Hombre</option>
                                <option value="Mujer">Mujer</option>
                            </select>

                            <select
                                value={selectedSubEnv}
                                onChange={(e) => setSelectedSubEnv(e.target.value)}
                                className={styles.select}
                            >
                                <option value="all">Todos los Sub-ambientes</option>
                                {subEnvironmentsList.map(env => (
                                    <option key={env.id} value={env.nombre}>{env.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className={styles.loading}>Cargando datos...</div>
                    ) : (

                        <div className={styles.chartsGrid}>

                            {/* Line Chart - Timeline */}
                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Tendencia de Ingresos</h3>
                                <div className={styles.chartContainer}>
                                    <Line
                                        data={timelineChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { position: 'top' as const } },
                                            scales: {
                                                x: {
                                                    offset: true, // Centers points away from the Y-axis
                                                    grid: { display: false }
                                                },
                                                y: {
                                                    // beginAtZero: true, // Removed to make it dynamic based on data range
                                                    ticks: { precision: 0 },
                                                    grid: {
                                                        tickLength: 8,
                                                        color: 'rgba(0, 0, 0, 0.1)'
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Bar Chart - Company */}
                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Ingresos por Empresa</h3>
                                <div className={styles.chartContainer}>
                                    <Bar
                                        data={companyChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                y: {
                                                    ticks: { precision: 0 },
                                                    grid: {
                                                        tickLength: 8,
                                                        color: 'rgba(0, 0, 0, 0.1)'
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Doughnut Chart - Sex */}
                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Distribución por Sexo</h3>
                                <div className={`${styles.chartContainer} ${styles.doughnutContainer}`}>
                                    <Doughnut
                                        data={sexChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Resumen</h3>
                                <div className={styles.summaryGrid}>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Total Ingresos</p>
                                        <p className={styles.summaryValue}>{filteredData.length}</p>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Empresas Activas</p>
                                        <p className={styles.summaryValue}>{companyChartData.labels?.length || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    )}
                </main >
            </div >
        </>
    )
}

export default ReportsPage
