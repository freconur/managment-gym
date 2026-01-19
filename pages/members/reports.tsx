import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useMemo, useRef } from 'react'
import {
    getFirestore,
    collection,
    query,
    orderBy,
    getDocs,
    Timestamp
} from 'firebase/firestore'
import { app } from '@/firebase/firebase.config'
import { FaChartBar, FaArrowLeft, FaFilter, FaFilePdf } from 'react-icons/fa'
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
import { InactiveMembersFilter } from '@/components/InactiveMembersFilter'


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
    const [exporting, setExporting] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

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
            const dateObj = item.timestamp.toDate()
            // Use local date components to avoid UTC shifts
            const year = dateObj.getFullYear()
            const month = String(dateObj.getMonth() + 1).padStart(2, '0')
            const day = String(dateObj.getDate()).padStart(2, '0')
            const dateKey = `${year}-${month}-${day}`
            counts[dateKey] = (counts[dateKey] || 0) + 1
        })

        // Sort keys chronologically (ISO strings sort naturally)
        const sortedKeys = Object.keys(counts).sort()

        return {
            // Convert keys to "DD/MM(Count)" format for localized display
            labels: sortedKeys.map(key => {
                const [year, month, day] = key.split('-');
                const count = counts[key];
                return `${day}/${month}(${count})`;
            }),
            datasets: [
                {
                    label: 'Ingresos por Día',
                    data: sortedKeys.map(key => counts[key]),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.3, // Smooth curve
                },
            ],
        }
    }, [filteredData])


    const handleExportPDF = async () => {
        if (!reportRef.current) return

        setExporting(true)
        try {
            // @ts-ignore
            const jsPDF = (await import('jspdf')).default
            // @ts-ignore
            const html2canvas = (await import('html2canvas')).default

            const toBase64 = (url: string): Promise<string> => {
                return new Promise((resolve) => {
                    const img = new Image()
                    img.crossOrigin = 'Anonymous'
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas')
                            canvas.width = img.width
                            canvas.height = img.height
                            const ctx = canvas.getContext('2d')
                            ctx?.drawImage(img, 0, 0)
                            resolve(canvas.toDataURL('image/jpeg'))
                        } catch (e) { resolve(url) }
                    }
                    img.onerror = () => resolve(url)
                    img.src = url
                })
            }

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const margin = 10
            const captureWidth = 1200 // Force desktop width for PDF
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const contentWidth = pageWidth - (margin * 2)

            pdf.setFontSize(18); pdf.setTextColor(17, 24, 39)
            pdf.text('Reporte de Ingresos de Miembros', margin, margin + 5)
            pdf.setFontSize(11); pdf.setTextColor(75, 85, 99)
            pdf.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, margin, margin + 12)

            let currentY = margin + 20

            // 1. Create a "Desktop Staging" container
            const staging = document.createElement('div')
            staging.style.width = captureWidth + 'px'
            staging.style.position = 'fixed'
            staging.style.left = '-9999px'
            staging.style.top = '0'
            staging.style.backgroundColor = 'white'
            staging.className = reportRef.current.className // Keep same grid classes
            staging.style.display = 'grid'
            staging.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))'
            staging.style.gap = '2rem'

            // 2. Clone the entire report into staging
            const reportClone = reportRef.current.cloneNode(true) as HTMLElement
            reportClone.style.width = captureWidth + 'px'
            reportClone.style.maxWidth = 'none'
            staging.appendChild(reportClone)
            document.body.appendChild(staging)

            const cards = Array.from(reportClone.children) as HTMLElement[]
            const rows: HTMLElement[][] = []
            let currentRow: HTMLElement[] = []
            let lastOffsetTop = -1

            cards.forEach(card => {
                if (lastOffsetTop === -1 || Math.abs(card.offsetTop - lastOffsetTop) < 20) {
                    currentRow.push(card)
                } else {
                    rows.push(currentRow)
                    currentRow = [card]
                }
                lastOffsetTop = card.offsetTop
            })
            if (currentRow.length > 0) rows.push(currentRow)

            for (const rowCards of rows) {
                const rowContainer = document.createElement('div')
                rowContainer.className = styles.chartsGrid
                rowContainer.style.display = 'grid'
                rowContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))'
                rowContainer.style.gap = '2rem'
                rowContainer.style.width = captureWidth + 'px'
                rowContainer.style.position = 'fixed'
                rowContainer.style.left = '-9999px'
                rowContainer.style.top = '0'
                rowContainer.style.padding = '10px'
                rowContainer.style.backgroundColor = 'white'
                document.body.appendChild(rowContainer)

                const cardIndices = rowCards.map(c => Array.from(reportClone.children).indexOf(c))
                const originalCards = cardIndices.map(idx => reportRef.current!.children[idx] as HTMLElement)

                rowCards.forEach((card, cardIndexInRow) => {
                    const originalCard = originalCards[cardIndexInRow]
                    const clone = card.cloneNode(true) as HTMLElement
                    clone.style.width = card.offsetWidth + 'px'
                    rowContainer.appendChild(clone)

                    const originalCanvases = Array.from(originalCard.querySelectorAll('canvas'))
                    const clonedCanvases = Array.from(clone.querySelectorAll('canvas'))
                    originalCanvases.forEach((cvs, i) => {
                        const clonedCvs = clonedCanvases[i]
                        if (clonedCvs) {
                            clonedCvs.width = cvs.width
                            clonedCvs.height = cvs.height
                            clonedCvs.getContext('2d')?.drawImage(cvs, 0, 0)
                        }
                    })
                })

                const allImages = Array.from(rowContainer.querySelectorAll('img'))
                for (const img of allImages) if (img.src && !img.src.startsWith('data:')) img.src = await toBase64(img.src)

                const canvas = await html2canvas(rowContainer, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: 'white'
                })

                const imgData = canvas.toDataURL('image/jpeg', 0.95)
                const imgWidth = contentWidth
                const imgHeight = (canvas.height * imgWidth) / canvas.width

                if (currentY + imgHeight > pageHeight - margin) {
                    pdf.addPage()
                    currentY = margin
                }
                pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight)
                currentY += imgHeight + 5

                document.body.removeChild(rowContainer)
            }

            document.body.removeChild(staging)
            pdf.save(`reporte-ingresos-${new Date().toISOString().split('T')[0]}.pdf`)
        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Hubo un error al generar el PDF.')
        } finally {
            setExporting(false)
        }
    }

    return (
        <>
            <Head>
                <title>Reportes de Ingresos - Management Gym</title>
            </Head>
            <div className={styles.container}>
                <main className={styles.main}>

                    <div className={styles.header}>
                        <div className={styles.headerTitleGroup}>
                            <Link href="/members" className={styles.backLink}>
                                <FaArrowLeft /> Volver a Miembros
                            </Link>
                            <h1 className={styles.title}>
                                <FaChartBar className={styles.titleIcon} /> Reportes de Ingresos
                            </h1>
                        </div>
                        {!loading && (
                            <button
                                onClick={handleExportPDF}
                                disabled={exporting}
                                className={styles.exportButton}
                            >
                                <FaFilePdf /> {exporting ? 'Generando PDF...' : 'Exportar PDF'}
                            </button>
                        )}
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

                        <div ref={reportRef} className={styles.chartsGrid}>

                            {/* Line Chart - Timeline */}
                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Tendencia de Ingresos</h3>
                                <div className={styles.chartContainer}>
                                    <Line
                                        data={timelineChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            interaction: {
                                                mode: 'index',
                                                intersect: false,
                                            },
                                            plugins: {
                                                legend: { position: 'top' as const },
                                                tooltip: {
                                                    callbacks: {
                                                        label: function (context: any) {
                                                            return `Ingresos: ${context.parsed.y}`;
                                                        }
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    offset: true,
                                                    ticks: { autoSkip: true, maxRotation: 45, maxTicksLimit: 7 },
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
                                                x: {
                                                    ticks: { autoSkip: true, maxTicksLimit: 8 }
                                                },
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

                            {/* Inactive Members Section */}
                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <InactiveMembersFilter />
                            </div>
                        </div>

                    )}
                </main >
            </div >
        </>
    )
}

export default ReportsPage
