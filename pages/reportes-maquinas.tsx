import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useMemo, useRef } from 'react'
import { FaChartBar, FaArrowLeft, FaFilter, FaTools, FaExclamationTriangle, FaFilePdf } from 'react-icons/fa'
import { ThemeToggle } from '@/components/ThemeToggle'
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
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
    pdf,
    Font
} from '@react-pdf/renderer'

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

const pdfStyles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
    header: { marginBottom: 20, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: '#e5e7eb', paddingBottom: 10 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 10, color: '#6b7280', marginTop: 4 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#374151', marginBottom: 10, borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: '#3b82f6', paddingLeft: 8 },
    summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    summaryItem: { flex: 1, padding: 10, backgroundColor: '#f3f4f6', borderRadius: 6, alignItems: 'center' },
    summaryLabel: { fontSize: 7, color: '#6b7280', marginBottom: 2 },
    summaryValue: { fontSize: 12, fontWeight: 'bold', color: '#111827' },
    chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chartItem: { width: '48%', marginBottom: 10 },
    chartImage: { width: '100%', height: 140, objectFit: 'contain' },
    fullChart: { width: '100%', height: 180, objectFit: 'contain', marginTop: 10 },
    table: { width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e7eb', borderBottomWidth: 0 },
    tableRow: { flexDirection: 'row', borderBottomColor: '#e5e7eb', borderBottomWidth: 1, minHeight: 20, alignItems: 'center' },
    tableHeader: { backgroundColor: '#f9fafb' },
    tableCell: { padding: 4, fontSize: 7, color: '#374151' },
    colName: { width: '30%' },
    colInc: { width: '15%', textAlign: 'center' },
    colAt: { width: '15%', textAlign: 'center' },
    colPen: { width: '15%', textAlign: 'center' },
    colMaint: { width: '15%', textAlign: 'center' },
    colTotal: { width: '10%', textAlign: 'center', fontWeight: 'bold' },
    bold: { fontWeight: 'bold' }
});

interface EquipmentReportPDFProps {
    data: any;
    stats: any[];
    charts: Record<string, string>;
}

const EquipmentReportPDF = ({ data, stats, charts }: EquipmentReportPDFProps) => {
    const counts = {
        total: data.length,
        incidencias: data.filter((e: any) => e.tipo === 'incidencia').length,
        atendidas: data.filter((e: any) => e.tipo === 'incidencia' && e.atendida).length,
        pendientes: data.filter((e: any) => e.tipo === 'incidencia' && !e.atendida).length,
        mantenimientos: data.filter((e: any) => e.tipo === 'mantenimiento').length,
    };

    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                <View style={pdfStyles.header}>
                    <Text style={pdfStyles.title}>Reporte General de Equipos</Text>
                    <Text style={pdfStyles.subtitle}>Management Gym - Generado el {new Date().toLocaleDateString()}</Text>
                </View>

                <View style={pdfStyles.section}>
                    <Text style={pdfStyles.sectionTitle}>Métricas Generales</Text>
                    <View style={pdfStyles.summaryGrid}>
                        <View style={pdfStyles.summaryItem}><Text style={pdfStyles.summaryLabel}>Total Eventos</Text><Text style={pdfStyles.summaryValue}>{counts.total}</Text></View>
                        <View style={pdfStyles.summaryItem}><Text style={pdfStyles.summaryLabel}>Incidencias</Text><Text style={[pdfStyles.summaryValue, { color: '#ef4444' }]}>{counts.incidencias}</Text></View>
                        <View style={pdfStyles.summaryItem}><Text style={pdfStyles.summaryLabel}>Atendidas</Text><Text style={[pdfStyles.summaryValue, { color: '#22c55e' }]}>{counts.atendidas}</Text></View>
                        <View style={pdfStyles.summaryItem}><Text style={pdfStyles.summaryLabel}>Pendientes</Text><Text style={[pdfStyles.summaryValue, { color: '#f97316' }]}>{counts.pendientes}</Text></View>
                        <View style={pdfStyles.summaryItem}><Text style={pdfStyles.summaryLabel}>Mantenimientos</Text><Text style={[pdfStyles.summaryValue, { color: '#3b82f6' }]}>{counts.mantenimientos}</Text></View>
                    </View>
                </View>

                <View style={pdfStyles.section}>
                    <Text style={pdfStyles.sectionTitle}>Distribución y Estados</Text>
                    <View style={pdfStyles.chartGrid}>
                        {charts.type && <View style={pdfStyles.chartItem}><Text style={{ fontSize: 8, textAlign: 'center' }}>Distribución por Tipo</Text><Image src={charts.type} style={pdfStyles.chartImage} /></View>}
                        {charts.status && <View style={pdfStyles.chartItem}><Text style={{ fontSize: 8, textAlign: 'center' }}>Estado de Incidencias</Text><Image src={charts.status} style={pdfStyles.chartImage} /></View>}
                        {charts.maintType && <View style={pdfStyles.chartItem}><Text style={{ fontSize: 8, textAlign: 'center' }}>Tipos de Mantenimiento</Text><Image src={charts.maintType} style={pdfStyles.chartImage} /></View>}
                    </View>
                </View>

                <View style={pdfStyles.section}>
                    <Text style={pdfStyles.sectionTitle}>Tendencia Temporal</Text>
                    {charts.trend && <Image src={charts.trend} style={pdfStyles.fullChart} />}
                </View>

                <View style={pdfStyles.section} break>
                    <Text style={pdfStyles.sectionTitle}>Análisis por Equipo y Usuario</Text>
                    <View style={pdfStyles.chartGrid}>
                        {charts.topMachines && <View style={{ width: '100%', marginBottom: 15 }}><Text style={{ fontSize: 8, textAlign: 'center' }}>Top 10 Equipos</Text><Image src={charts.topMachines} style={pdfStyles.fullChart} /></View>}
                        {charts.techInc && <View style={pdfStyles.chartItem}><Text style={{ fontSize: 8, textAlign: 'center' }}>Incidencias por Usuario</Text><Image src={charts.techInc} style={pdfStyles.chartImage} /></View>}
                        {charts.techMaint && <View style={pdfStyles.chartItem}><Text style={{ fontSize: 8, textAlign: 'center' }}>Mantenimientos por Técnico</Text><Image src={charts.techMaint} style={pdfStyles.chartImage} /></View>}
                    </View>
                </View>

                <View style={pdfStyles.section}>
                    <Text style={pdfStyles.sectionTitle}>Resumen estadístico por Máquina</Text>
                    <View style={pdfStyles.table}>
                        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colName, pdfStyles.bold]}>Equipo</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colInc, pdfStyles.bold]}>Inc.</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colAt, pdfStyles.bold]}>Atend.</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colPen, pdfStyles.bold]}>Pend.</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colMaint, pdfStyles.bold]}>Mant.</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colTotal, pdfStyles.bold]}>Total</Text>
                        </View>
                        {stats.map((row, idx) => (
                            <View key={idx} style={pdfStyles.tableRow}>
                                <Text style={[pdfStyles.tableCell, pdfStyles.colName]}>{row.name}</Text>
                                <Text style={[pdfStyles.tableCell, pdfStyles.colInc]}>{row.incidencias}</Text>
                                <Text style={[pdfStyles.tableCell, pdfStyles.colAt]}>{row.atendidas}</Text>
                                <Text style={[pdfStyles.tableCell, pdfStyles.colPen]}>{row.pendientes}</Text>
                                <Text style={[pdfStyles.tableCell, pdfStyles.colMaint]}>{row.mantenimiento}</Text>
                                <Text style={[pdfStyles.tableCell, pdfStyles.colTotal]}>{row.total}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </Page>
        </Document>
    );
};

const EquipmentReportsPage: NextPage = () => {
    const { getAllEventos, eventos, getMaquinas, maquinas } = useManagment()
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('this_month')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    const [selectedType, setSelectedType] = useState('all')
    const [selectedMachineId, setSelectedMachineId] = useState('all')
    const [exporting, setExporting] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    const handleExportPDF = async () => {
        if (!reportRef.current) return

        setExporting(true)
        try {
            const getChartImage = (index: number): string => {
                const canvases = reportRef.current?.querySelectorAll('canvas');
                if (canvases && canvases[index]) {
                    return (canvases[index] as HTMLCanvasElement).toDataURL('image/png');
                }
                return '';
            };

            // Order of charts in the DOM:
            // 0: Type Distribution
            // 1: Incident Status
            // 2: Maintenance Types
            // 3: Top Machines
            // 4: Tech Incidents
            // 5: Tech Maintenance
            // 6: Trend Chart

            const charts = {
                type: getChartImage(0),
                status: getChartImage(1),
                maintType: getChartImage(2),
                topMachines: getChartImage(3),
                techInc: getChartImage(4),
                techMaint: getChartImage(5),
                trend: getChartImage(6)
            };

            const blob = await pdf(
                <EquipmentReportPDF
                    data={filteredData}
                    stats={tableData}
                    charts={charts}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte-maquinas-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Hubo un error al generar el PDF.');
        } finally {
            setExporting(false);
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

        // Machine Filter
        if (selectedMachineId !== 'all') {
            filtered = filtered.filter(item => item.machineId === selectedMachineId)
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
        const machineStats: Record<string, { id: string, name: string, incidencias: number, atendidas: number, pendientes: number, mantenimiento: number, total: number }> = {}

        maquinas.forEach(m => {
            if (m.id) {
                machineStats[m.id] = { id: m.id, name: m.name || 'Sin nombre', incidencias: 0, atendidas: 0, pendientes: 0, mantenimiento: 0, total: 0 }
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
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <ThemeToggle />
                        <button
                            onClick={handleExportPDF}
                            className={styles.exportButton}
                            disabled={exporting || loading}
                        >
                            <FaFilePdf /> {exporting ? 'Generando...' : 'Exportar PDF'}
                        </button>
                    </div>
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

                        <select
                            value={selectedMachineId}
                            onChange={(e) => setSelectedMachineId(e.target.value)}
                            className={styles.select}
                        >
                            <option value="all">Todas las Máquinas</option>
                            {maquinas.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
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
                                            {tableData
                                                .filter(stat => selectedMachineId === 'all' || stat.id === selectedMachineId)
                                                .map((stat, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <Link href={`/reportes/maquina/${stat.id}`} className={styles.machineLink}>
                                                                {stat.name}
                                                            </Link>
                                                        </td>
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
