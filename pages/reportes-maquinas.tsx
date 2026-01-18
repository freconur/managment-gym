import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useMemo, useRef } from 'react'
import { FaChartBar, FaArrowLeft, FaFilter, FaTools, FaExclamationTriangle, FaFilePdf } from 'react-icons/fa'
import { useManagment } from '@/features/hooks/useManagment'
import { Incidencia, Machine } from '@/features/types/types'
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
import styles from '@/styles/ReportsEquipment.module.css'

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

const EquipmentReportsPage: NextPage = () => {
    const { getAllEventos, eventos, getMaquinas, maquinas } = useManagment()
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('this_month')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    const [selectedType, setSelectedType] = useState('all')
    const [exporting, setExporting] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    const handleExportPDF = async () => {
        if (!reportRef.current) return

        setExporting(true)
        try {
            // @ts-ignore
            const jsPDF = (await import('jspdf')).default
            // @ts-ignore
            const html2canvas = (await import('html2canvas')).default

            // Configurar jsPDF (A4 en mm)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 15 // Margen de 15mm
            const contentWidth = pageWidth - (margin * 2)
            const gap = 5 // Espacio entre columnas en el PDF

            // 1. Añadir Título y Encabezado
            pdf.setFontSize(18)
            pdf.setTextColor(17, 24, 39) // #111827
            pdf.text('Reporte de Equipos - Management Gym', margin, margin + 5)

            pdf.setFontSize(11)
            pdf.setTextColor(75, 85, 99) // #4b5563
            pdf.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, margin, margin + 12)

            let currentY = margin + 20 // Posición inicial después del encabezado

            // 2. Obtener todas las secciones (cards)
            const cards = Array.from(reportRef.current.querySelectorAll(`.${styles.card}`))

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i] as HTMLElement
                const isFullWidth = card.classList.contains(styles.cardFullWidth)

                // Look-ahead para detectar grupo de hasta 3 cards pequeñas
                const card2 = !isFullWidth && cards[i + 1] ? cards[i + 1] as HTMLElement : null
                const is2Small = card2 && !card2.classList.contains(styles.cardFullWidth)

                const card3 = is2Small && cards[i + 2] ? cards[i + 2] as HTMLElement : null
                const is3Small = card3 && !card3.classList.contains(styles.cardFullWidth)

                if (is3Small) {
                    // Procesar tres cards lado a lado
                    const canvases = await Promise.all([
                        html2canvas(card, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' }),
                        html2canvas(card2!, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' }),
                        html2canvas(card3!, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
                    ])

                    const imgDatas = canvases.map(c => c.toDataURL('image/jpeg', 1.0))
                    const colWidth = (contentWidth - (gap * 2)) / 3

                    let maxHeight = 0
                    const renderedImages = imgDatas.map(data => {
                        const props = pdf.getImageProperties(data)
                        const h = (props.height * colWidth) / props.width
                        if (h > maxHeight) maxHeight = h
                        return { data, h }
                    })

                    if (currentY + maxHeight > pageHeight - margin) {
                        pdf.addPage()
                        currentY = margin
                    }

                    renderedImages.forEach((img, index) => {
                        pdf.addImage(img.data, 'JPEG', margin + (index * (colWidth + gap)), currentY, colWidth, img.h)
                    })

                    currentY += maxHeight + 10
                    i += 2 // Saltar las siguientes 2 cards
                } else if (is2Small) {
                    // Procesar dos cards lado a lado
                    const canvases = await Promise.all([
                        html2canvas(card, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' }),
                        html2canvas(card2!, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
                    ])

                    const imgDatas = canvases.map(c => c.toDataURL('image/jpeg', 1.0))
                    const colWidth = (contentWidth - gap) / 2

                    let maxHeight = 0
                    const renderedImages = imgDatas.map(data => {
                        const props = pdf.getImageProperties(data)
                        const h = (props.height * colWidth) / props.width
                        if (h > maxHeight) maxHeight = h
                        return { data, h }
                    })

                    if (currentY + maxHeight > pageHeight - margin) {
                        pdf.addPage()
                        currentY = margin
                    }

                    renderedImages.forEach((img, index) => {
                        pdf.addImage(img.data, 'JPEG', margin + (index * (colWidth + gap)), currentY, colWidth, img.h)
                    })

                    currentY += maxHeight + 10
                    i++ // Saltar la siguiente card
                } else {
                    // Procesar una sola card full width
                    const canvas = await html2canvas(card, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    })

                    const imgData = canvas.toDataURL('image/jpeg', 1.0)
                    const imgProps = pdf.getImageProperties(imgData)
                    const imgHeight = (imgProps.height * contentWidth) / imgProps.width

                    if (currentY + imgHeight > pageHeight - margin) {
                        pdf.addPage()
                        currentY = margin
                    }

                    pdf.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight)
                    currentY += imgHeight + 10
                }
            }

            pdf.save(`reporte-maquinas-${new Date().toISOString().split('T')[0]}.pdf`)
        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Hubo un error al generar el PDF. Por favor, intente de nuevo.')
        } finally {
            setExporting(false)
        }
    }

    useEffect(() => {
        const unsubscribeEventos = getAllEventos()
        const unsubscribeMaquinas = getMaquinas()

        // Simular tiempo de carga para asegurar que los datos fluyan
        const timer = setTimeout(() => {
            setLoading(false)
        }, 1000)

        return () => {
            if (typeof unsubscribeEventos === 'function') unsubscribeEventos()
            if (typeof unsubscribeMaquinas === 'function') unsubscribeMaquinas()
            clearTimeout(timer)
        }
    }, [getAllEventos, getMaquinas])

    const filteredData = useMemo(() => {
        let filtered = eventos

        // Date Filter
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        if (dateRange === 'this_month') {
            filtered = filtered.filter(item => {
                const date = item.createdAt?.toDate ? item.createdAt.toDate() : (item.fechaReporte instanceof Date ? item.fechaReporte : new Date(item.fechaReporte))
                return date >= startOfMonth
            })
        } else if (dateRange === 'today') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0))
            filtered = filtered.filter(item => {
                const date = item.createdAt?.toDate ? item.createdAt.toDate() : (item.fechaReporte instanceof Date ? item.fechaReporte : new Date(item.fechaReporte))
                return date >= startOfDay
            })
        } else if (dateRange === 'custom' && customStart && customEnd) {
            const start = new Date(customStart)
            const end = new Date(customEnd)
            end.setHours(23, 59, 59, 999)

            filtered = filtered.filter(item => {
                const date = item.createdAt?.toDate ? item.createdAt.toDate() : (item.fechaReporte instanceof Date ? item.fechaReporte : new Date(item.fechaReporte))
                return date >= start && date <= end
            })
        }

        // Type Filter
        if (selectedType !== 'all') {
            filtered = filtered.filter(item => item.tipo === selectedType)
        }

        return filtered
    }, [eventos, dateRange, customStart, customEnd, selectedType])

    // --- Chart Data Preparation ---

    // 1. Bar Chart: Incidents by Machine (Top 10)
    const topMachinesChartData = useMemo(() => {
        const machineCounts: Record<string, number> = {}

        filteredData.forEach(event => {
            const machineName = event.maquina?.name || 'Desconocida'
            machineCounts[machineName] = (machineCounts[machineName] || 0) + 1
        })

        const sortedMachines = Object.entries(machineCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)

        return {
            labels: sortedMachines.map(([name, count]) => `${name} (${count})`),
            datasets: [
                {
                    label: 'Total Eventos',
                    data: sortedMachines.map(([, count]) => count),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                },
            ],
        }
    }, [filteredData])

    // 2. Doughnut Chart: Distribution by Type (Incidencia vs Mantenimiento)
    const typeDistributionData = useMemo(() => {
        const counts = {
            incidencia: 0,
            mantenimiento: 0
        }

        filteredData.forEach(event => {
            if (event.tipo === 'incidencia') counts.incidencia += 1
            else if (event.tipo === 'mantenimiento') counts.mantenimiento += 1
        })

        return {
            labels: [`Incidencias (${counts.incidencia})`, `Mantenimientos (${counts.mantenimiento})`],
            datasets: [
                {
                    data: [counts.incidencia, counts.mantenimiento],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.6)', // Red 500
                        'rgba(34, 197, 94, 0.6)', // Green 500
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(34, 197, 94, 1)',
                    ],
                    borderWidth: 1,
                },
            ],
        }
    }, [filteredData])

    // 3. Doughnut Chart: Incident Status (Atendida vs Pendiente)
    const incidentStatusData = useMemo(() => {
        const counts = {
            atendida: 0,
            pendiente: 0
        }

        filteredData.forEach(event => {
            if (event.tipo === 'incidencia') {
                if (event.atendida) counts.atendida += 1
                else counts.pendiente += 1
            }
        })

        return {
            labels: [`Atendidas (${counts.atendida})`, `Pendientes (${counts.pendiente})`],
            datasets: [
                {
                    data: [counts.atendida, counts.pendiente],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.6)', // Green 500
                        'rgba(249, 115, 22, 0.6)', // Orange 500
                    ],
                    borderColor: [
                        'rgba(34, 197, 94, 1)',
                        'rgba(249, 115, 22, 1)',
                    ],
                    borderWidth: 1,
                },
            ],
        }
    }, [filteredData])

    // 4. Doughnut Chart: Maintenance Subtype Distribution
    const maintenanceSubtypeData = useMemo(() => {
        const subtypeCounts: Record<string, number> = {}

        filteredData.forEach(event => {
            if (event.tipo === 'mantenimiento') {
                const subType = (event as any).subTipo || 'No especificado'
                subtypeCounts[subType] = (subtypeCounts[subType] || 0) + 1
            }
        })

        const labels = Object.keys(subtypeCounts)
        const data = Object.values(subtypeCounts)

        const colors = [
            'rgba(59, 130, 246, 0.6)', // Blue 500
            'rgba(168, 85, 247, 0.6)', // Purple 500
            'rgba(236, 72, 153, 0.6)', // Pink 500
            'rgba(20, 184, 166, 0.6)', // Teal 500
            'rgba(234, 179, 8, 0.6)',  // Yellow 500
        ]

        return {
            labels: labels.map(l => `${l} (${subtypeCounts[l]})`),
            datasets: [
                {
                    data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: colors.slice(0, labels.length).map(c => c.replace('0.6', '1')),
                    borderWidth: 1,
                },
            ],
        }
    }, [filteredData])

    // 5. Bar Chart: Incidents by Reporter (User)
    const technicianIncidentsData = useMemo(() => {
        const techCounts: Record<string, number> = {}

        filteredData.forEach(event => {
            if (event.tipo === 'incidencia') {
                const firstName = event.usuario?.nombres?.split(' ')[0] || ''
                const firstLastName = event.usuario?.apellidos?.split(' ')[0] || ''
                const techName = firstName ? `${firstName} ${firstLastName}`.trim() : 'Desconocido'
                techCounts[techName] = (techCounts[techName] || 0) + 1
            }
        })

        const sortedTechs = Object.entries(techCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)

        return {
            labels: sortedTechs.map(([name, count]) => `${name} (${count})`),
            datasets: [
                {
                    label: 'Incidencias Reportadas',
                    data: sortedTechs.map(([, count]) => count),
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                },
            ],
        }
    }, [filteredData])

    // 6. Bar Chart: Maintenance by Technician
    const technicianMaintenanceData = useMemo(() => {
        const techCounts: Record<string, number> = {}

        filteredData.forEach(event => {
            if (event.tipo === 'mantenimiento') {
                const firstName = event.tecnicoAsignado?.nombres?.split(' ')[0] || ''
                const firstLastName = event.tecnicoAsignado?.apellidos?.split(' ')[0] || ''
                const techName = firstName ? `${firstName} ${firstLastName}`.trim() : 'Sin asignar'
                techCounts[techName] = (techCounts[techName] || 0) + 1
            }
        })

        const sortedTechs = Object.entries(techCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)

        return {
            labels: sortedTechs.map(([name, count]) => `${name} (${count})`),
            datasets: [
                {
                    label: 'Mantenimientos Realizados',
                    data: sortedTechs.map(([, count]) => count),
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1,
                },
            ],
        }
    }, [filteredData])

    // 7. Line Chart: Trend Over Time
    const trendChartData = useMemo(() => {
        const dailyCounts: Record<string, { incidencia: number, mantenimiento: number }> = {}

        filteredData.forEach(event => {
            const dateObj = event.createdAt?.toDate ? event.createdAt.toDate() : (event.fechaReporte instanceof Date ? event.fechaReporte : new Date(event.fechaReporte))
            const dateStr = dateObj.toLocaleDateString()

            if (!dailyCounts[dateStr]) {
                dailyCounts[dateStr] = { incidencia: 0, mantenimiento: 0 }
            }

            if (event.tipo === 'incidencia') dailyCounts[dateStr].incidencia += 1
            else dailyCounts[dateStr].mantenimiento += 1
        })

        const sortedDates = Object.keys(dailyCounts).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        return {
            labels: sortedDates,
            datasets: [
                {
                    label: 'Incidencias',
                    data: sortedDates.map(d => dailyCounts[d].incidencia),
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: 'Mantenimientos',
                    data: sortedDates.map(d => dailyCounts[d].mantenimiento),
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4,
                }
            ],
        }
    }, [filteredData])

    // 5. Data for the summary table
    const tableData = useMemo(() => {
        const machineStats: Record<string, { name: string, incidencias: number, atendidas: number, pendientes: number, mantenimiento: number, total: number }> = {}

        maquinas.forEach(m => {
            if (m.id) {
                machineStats[m.id] = { name: m.name || 'Sin nombre', incidencias: 0, atendidas: 0, pendientes: 0, mantenimiento: 0, total: 0 }
            }
        })

        filteredData.forEach(event => {
            const machineId = event.machineId
            if (machineId && machineStats[machineId]) {
                if (event.tipo === 'incidencia') {
                    machineStats[machineId].incidencias += 1
                    if (event.atendida) machineStats[machineId].atendidas += 1
                    else machineStats[machineId].pendientes += 1
                } else {
                    machineStats[machineId].mantenimiento += 1
                }
                machineStats[machineId].total += 1
            }
        })

        return Object.values(machineStats).sort((a, b) => b.total - a.total)
    }, [filteredData, maquinas])

    return (
        <div className={styles.container}>
            <Head>
                <title>Reportes de Equipos - Management Gym</title>
            </Head>

            <main className={styles.main}>
                <div className={styles.header}>
                    <Link href="/equipment" className={styles.backLink}>
                        <FaArrowLeft /> Volver a Equipos
                    </Link>
                    <h1 className={styles.title}>
                        <FaChartBar className={styles.titleIcon} /> Reportes de Equipos
                    </h1>
                    <button
                        onClick={handleExportPDF}
                        className={styles.exportButton}
                        disabled={exporting || loading}
                    >
                        <FaFilePdf /> {exporting ? 'Generando...' : 'Exportar PDF'}
                    </button>
                </div>

                {/* Filters (Excluded from PDF) */}
                <div className={styles.filtersContainer}>
                    <div className={styles.filtersTitle}>
                        <FaFilter /> Filtros de Reporte
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
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className={styles.select}
                        >
                            <option value="all">Todos los Eventos</option>
                            <option value="incidencia">Solo Incidencias</option>
                            <option value="mantenimiento">Solo Mantenimientos</option>
                        </select>
                    </div>
                </div>

                <div ref={reportRef}>
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Procesando datos de equipos...</p>
                        </div>
                    ) : (
                        <div className={styles.chartsGrid}>
                            {/* Summary Metrics */}
                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Métricas Generales</h3>
                                <div className={styles.summaryGrid}>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Total Eventos</p>
                                        <p className={styles.summaryValue}>{filteredData.length}</p>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Incidencias</p>
                                        <p className={`${styles.summaryValue} text-red-500`}>
                                            {filteredData.filter(e => e.tipo === 'incidencia').length}
                                        </p>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Atendidas</p>
                                        <p className={`${styles.summaryValue} text-green-500`}>
                                            {filteredData.filter(e => e.tipo === 'incidencia' && e.atendida).length}
                                        </p>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Pendientes</p>
                                        <p className={`${styles.summaryValue} text-orange-500`}>
                                            {filteredData.filter(e => e.tipo === 'incidencia' && !e.atendida).length}
                                        </p>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Mantenimientos</p>
                                        <p className={`${styles.summaryValue} text-blue-500`}>
                                            {filteredData.filter(e => e.tipo === 'mantenimiento').length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Doughnut Chart - Type Distribution */}
                            {selectedType === 'all' && (
                                <div className={styles.card}>
                                    <h3 className={styles.cardTitle}>Distribución por Tipo</h3>
                                    <div className={styles.doughnutContainer}>
                                        <Doughnut
                                            data={typeDistributionData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: { position: 'bottom' }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Doughnut Chart - Incident Status */}
                            {(selectedType === 'all' || selectedType === 'incidencia') && (
                                <div className={styles.card}>
                                    <h3 className={styles.cardTitle}>Estado de Incidencias</h3>
                                    <div className={styles.doughnutContainer}>
                                        <Doughnut
                                            data={incidentStatusData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: { position: 'bottom' }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Doughnut Chart - Maintenance Subtypes */}
                            {(selectedType === 'all' || selectedType === 'mantenimiento') && (
                                <div className={styles.card}>
                                    <h3 className={styles.cardTitle}>Tipos de Mantenimiento</h3>
                                    <div className={styles.doughnutContainer}>
                                        <Doughnut
                                            data={maintenanceSubtypeData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: { position: 'bottom' }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Bar Chart - Top Machines */}
                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Top 10 Equipos con Más Eventos</h3>
                                <div className={styles.chartContainer}>
                                    <Bar
                                        data={topMachinesChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    ticks: { stepSize: 1 }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Bar Chart - Technician Incidents */}
                            {(selectedType === 'all' || selectedType === 'incidencia') && (
                                <div className={`${styles.card} ${styles.cardHalfWidth}`}>
                                    <h3 className={styles.cardTitle}>Incidencias por Usuario</h3>
                                    <div className={styles.chartContainer}>
                                        <Bar
                                            data={technicianIncidentsData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        ticks: { stepSize: 1 }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Bar Chart - Technician Maintenance */}
                            {(selectedType === 'all' || selectedType === 'mantenimiento') && (
                                <div className={`${styles.card} ${styles.cardHalfWidth}`}>
                                    <h3 className={styles.cardTitle}>Mantenimientos por Técnico</h3>
                                    <div className={styles.chartContainer}>
                                        <Bar
                                            data={technicianMaintenanceData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        ticks: { stepSize: 1 }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Line Chart - Trend */}
                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Tendencia Temporal</h3>
                                <div className={styles.chartContainer}>
                                    <Line
                                        data={trendChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    ticks: { stepSize: 1 }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Detailed Table */}
                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Detalle por Equipo</h3>
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Equipo</th>
                                                <th style={{ textAlign: 'center' }}>Incidencias</th>
                                                <th style={{ textAlign: 'center' }}>Atendidas</th>
                                                <th style={{ textAlign: 'center' }}>Pendientes</th>
                                                <th style={{ textAlign: 'center' }}>Mantenimientos</th>
                                                <th style={{ textAlign: 'center' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tableData.map((stat, index) => (
                                                <tr key={index}>
                                                    <td>{stat.name}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={styles.incidenciasBadge} style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>{stat.incidencias}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={styles.mantenimientoBadge}>{stat.atendidas}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={styles.incidenciasBadge} style={{ backgroundColor: '#ffedd5', color: '#9a3412' }}>{stat.pendientes}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={styles.mantenimientoBadge} style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>{stat.mantenimiento}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <strong>{stat.total}</strong>
                                                    </td>
                                                </tr>
                                            ))}
                                            {tableData.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                                        No hay datos para mostrar en este periodo.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                .text-red-500 { color: #ef4444; }
                .text-green-500 { color: #22c55e; }
                .text-orange-500 { color: #f97316; }
                .text-blue-500 { color: #3b82f6; }
            `}</style>
        </div>
    )
}

export default EquipmentReportsPage
