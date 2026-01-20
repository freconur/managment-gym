import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useMemo, useRef } from 'react'
import { FaChartBar, FaArrowLeft, FaTools, FaExclamationTriangle, FaFilePdf, FaTable, FaThLarge, FaImage } from 'react-icons/fa'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useManagment } from '@/features/hooks/useManagment'
import { Incidencia } from '@/features/types/types'
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
    Filler,
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
    LineElement,
    Filler
)

// Register fonts for react-pdf if needed
// Font.register({ family: 'Inter', src: '...' });

const pdfStyles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff'
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomStyle: 'solid',
        borderBottomColor: '#e5e7eb',
        paddingBottom: 10
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 10,
        color: '#6b7280'
    },
    section: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftStyle: 'solid',
        borderLeftColor: '#3b82f6',
        paddingLeft: 8
    },
    machineInfo: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
        backgroundColor: '#f9fafb',
        padding: 15,
        borderRadius: 8
    },
    machineImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
        objectFit: 'cover'
    },
    machineDetails: {
        flex: 1,
        justifyContent: 'center'
    },
    badge: {
        flexDirection: 'row',
        marginBottom: 4
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4b5563',
        width: 80
    },
    value: {
        fontSize: 10,
        color: '#111827'
    },
    metricsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15
    },
    metricCard: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: 6,
        alignItems: 'center'
    },
    metricTitle: {
        fontSize: 8,
        color: '#6b7280',
        marginBottom: 4
    },
    metricValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827'
    },
    chartGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15
    },
    chartItem: {
        width: '48%',
        marginBottom: 10
    },
    chartImage: {
        width: '100%',
        height: 150,
        objectFit: 'contain'
    },
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderBottomWidth: 0
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomColor: '#e5e7eb',
        borderBottomWidth: 1,
        minHeight: 25,
        alignItems: 'center'
    },
    tableHeader: {
        backgroundColor: '#f9fafb'
    },
    tableCell: {
        padding: 5,
        fontSize: 8,
        color: '#374151'
    },
    colDate: { width: '15%' },
    colType: { width: '15%' },
    colDesc: { width: '40%' },
    colResp: { width: '15%' },
    colStatus: { width: '15%' },

    eventCard: {
        flexDirection: 'row',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 6,
        overflow: 'hidden'
    },
    eventImageContainer: {
        width: 100,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center'
    },
    eventImage: {
        width: 100,
        height: 100,
        objectFit: 'cover'
    },
    eventContent: {
        flex: 1,
        padding: 10
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5
    },
    eventTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#111827'
    },
    eventDate: {
        fontSize: 8,
        color: '#6b7280'
    },
    eventBody: {
        marginTop: 5
    },
    eventDetail: {
        fontSize: 8,
        marginBottom: 2
    },
    bold: {
        fontWeight: 'bold'
    }
});

interface MachineReportPDFProps {
    machine: any;
    data: any[];
    charts: {
        trend: string;
        status: string;
        maintType: string;
        maintStatus: string;
        participation: string;
    };
}

const MachineReportPDF = ({ machine, data, charts }: MachineReportPDFProps) => {
    const totalIncidencias = data.filter(e => e.tipo === 'incidencia').length;
    const totalMantenimientos = data.filter(e => e.tipo === 'mantenimiento').length;

    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                {/* Header */}
                <View style={pdfStyles.header}>
                    <Text style={pdfStyles.title}>Reporte de Equipo: {machine.name}</Text>
                    <Text style={pdfStyles.subtitle}>Generado el {new Date().toLocaleDateString()}</Text>
                </View>

                {/* Machine Details */}
                <View style={pdfStyles.section}>
                    <Text style={pdfStyles.sectionTitle}>Detalle del Equipo</Text>
                    <View style={pdfStyles.machineInfo}>
                        {machine.image && (
                            <Image src={machine.image} style={pdfStyles.machineImage} />
                        )}
                        <View style={pdfStyles.machineDetails}>
                            <View style={pdfStyles.badge}>
                                <Text style={pdfStyles.label}>Nombre:</Text>
                                <Text style={pdfStyles.value}>{machine.name}</Text>
                            </View>
                            <View style={pdfStyles.badge}>
                                <Text style={pdfStyles.label}>Estado Actual:</Text>
                                <Text style={pdfStyles.value}>{machine.status}</Text>
                            </View>
                            <View style={pdfStyles.badge}>
                                <Text style={pdfStyles.label}>Ubicación:</Text>
                                <Text style={pdfStyles.value}>{machine.location || machine.ubicacion || 'No especificada'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Summary Metrics */}
                <View style={pdfStyles.metricsGrid}>
                    <View style={pdfStyles.metricCard}>
                        <Text style={pdfStyles.metricTitle}>Total Eventos</Text>
                        <Text style={pdfStyles.metricValue}>{data.length}</Text>
                    </View>
                    <View style={pdfStyles.metricCard}>
                        <Text style={pdfStyles.metricTitle}>Incidencias</Text>
                        <Text style={pdfStyles.metricValue}>{totalIncidencias}</Text>
                    </View>
                    <View style={pdfStyles.metricCard}>
                        <Text style={pdfStyles.metricTitle}>Mantenimientos</Text>
                        <Text style={pdfStyles.metricValue}>{totalMantenimientos}</Text>
                    </View>
                </View>

                {/* Charts Section */}
                <View style={pdfStyles.section}>
                    <Text style={pdfStyles.sectionTitle}>Análisis de Datos</Text>
                    <View style={pdfStyles.chartGrid}>
                        <View style={pdfStyles.chartItem}>
                            <Text style={{ fontSize: 9, textAlign: 'center', marginBottom: 5 }}>Estado Incidencias</Text>
                            <Image src={charts.status} style={pdfStyles.chartImage} />
                        </View>
                        <View style={pdfStyles.chartItem}>
                            <Text style={{ fontSize: 9, textAlign: 'center', marginBottom: 5 }}>Estado Mantenimientos</Text>
                            <Image src={charts.maintStatus} style={pdfStyles.chartImage} />
                        </View>
                        <View style={pdfStyles.chartItem}>
                            <Text style={{ fontSize: 9, textAlign: 'center', marginBottom: 5 }}>Tipos de Mantenimiento</Text>
                            <Image src={charts.maintType} style={pdfStyles.chartImage} />
                        </View>
                        <View style={[pdfStyles.chartItem, { width: '100%', marginTop: 10 }]}>
                            <Text style={{ fontSize: 9, textAlign: 'center', marginBottom: 5 }}>Tendencia Temporal</Text>
                            <Image src={charts.trend} style={{ width: '100%', height: 200, objectFit: 'contain' }} />
                        </View>
                    </View>
                </View>

                {/* Participation Chart */}
                <View style={pdfStyles.section} break>
                    <Text style={pdfStyles.sectionTitle}>Participación por Usuario</Text>
                    <Image src={charts.participation} style={{ width: '100%', height: 200, objectFit: 'contain' }} />
                </View>

                {/* Chronological Summary Table */}
                <View style={[pdfStyles.section, { marginTop: 10 }]}>
                    <Text style={pdfStyles.sectionTitle}>Resumen Cronológico</Text>
                    <View style={pdfStyles.table}>
                        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colDate, pdfStyles.bold]}>Fecha</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colType, pdfStyles.bold]}>Tipo</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colDesc, pdfStyles.bold]}>Descripción / Tareas</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colResp, pdfStyles.bold]}>Responsable</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.colStatus, pdfStyles.bold]}>Estado</Text>
                        </View>
                        {data
                            .sort((a, b) => {
                                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.fechaReporte instanceof Date ? a.fechaReporte : new Date(a.fechaReporte))
                                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.fechaReporte instanceof Date ? b.fechaReporte : new Date(b.fechaReporte))
                                return dateB.getTime() - dateA.getTime()
                            })
                            .slice(0, 15) // Limit to 15 for the summary table
                            .map((event, index) => {
                                const date = event.createdAt?.toDate ? event.createdAt.toDate() : (event.fechaReporte instanceof Date ? event.fechaReporte : new Date(event.fechaReporte))
                                return (
                                    <View key={index} style={pdfStyles.tableRow}>
                                        <Text style={[pdfStyles.tableCell, pdfStyles.colDate]}>{date.toLocaleDateString()}</Text>
                                        <Text style={[pdfStyles.tableCell, pdfStyles.colType]}>{event.tipo}</Text>
                                        <Text style={[pdfStyles.tableCell, pdfStyles.colDesc]}>
                                            {event.tipo === 'incidencia'
                                                ? (event as any).descripcion
                                                : (event as any).tareas?.map((t: any) => typeof t === 'string' ? t : t.descripcion).join(', ') || 'N/A'}
                                        </Text>
                                        <Text style={[pdfStyles.tableCell, pdfStyles.colResp]}>
                                            {event.tipo === 'incidencia'
                                                ? `${event.usuario?.nombres} ${event.usuario?.apellidos}`
                                                : `${event.tecnicoAsignado?.nombres} ${event.tecnicoAsignado?.apellidos}`}
                                        </Text>
                                        <Text style={[pdfStyles.tableCell, pdfStyles.colStatus]}>
                                            {event.tipo === 'incidencia' ? (event.atendida ? 'Atendida' : 'Pendiente') : (event.estado || 'Completado')}
                                        </Text>
                                    </View>
                                )
                            })}
                    </View>
                </View>

                {/* Visual Log */}
                <View style={pdfStyles.section} break>
                    <Text style={pdfStyles.sectionTitle}>Registro Visual de Eventos</Text>
                    {data
                        .sort((a, b) => {
                            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.fechaReporte instanceof Date ? a.fechaReporte : new Date(a.fechaReporte))
                            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.fechaReporte instanceof Date ? b.fechaReporte : new Date(b.fechaReporte))
                            return dateB.getTime() - dateA.getTime()
                        })
                        .map((event, index) => {
                            const date = event.createdAt?.toDate ? event.createdAt.toDate() : (event.fechaReporte instanceof Date ? event.fechaReporte : new Date(event.fechaReporte))
                            return (
                                <View key={index} style={pdfStyles.eventCard} wrap={false}>
                                    <View style={pdfStyles.eventImageContainer}>
                                        {event.fotoUrl ? (
                                            <Image src={event.fotoUrl} style={pdfStyles.eventImage} />
                                        ) : (
                                            <Text style={{ fontSize: 8, color: '#9ca3af' }}>Sin imagen</Text>
                                        )}
                                    </View>
                                    <View style={pdfStyles.eventContent}>
                                        <View style={pdfStyles.eventHeader}>
                                            <Text style={pdfStyles.eventTitle}>{event.tipo.toUpperCase()} - {event.subTipo || 'General'}</Text>
                                            <Text style={pdfStyles.eventDate}>{date.toLocaleDateString()}</Text>
                                        </View>
                                        <View style={pdfStyles.eventBody}>
                                            <Text style={pdfStyles.eventDetail}>
                                                <Text style={pdfStyles.bold}>Descripción: </Text>
                                                {event.descripcion || 'Sin descripción.'}
                                            </Text>
                                            {event.tipo === 'mantenimiento' && event.tareas && event.tareas.length > 0 && (
                                                <Text style={pdfStyles.eventDetail}>
                                                    <Text style={pdfStyles.bold}>Tareas: </Text>
                                                    {event.tareas.map((t: any) => typeof t === 'string' ? t : t.descripcion).join(', ')}
                                                </Text>
                                            )}
                                            <Text style={pdfStyles.eventDetail}>
                                                <Text style={pdfStyles.bold}>Responsable: </Text>
                                                {event.tipo === 'incidencia'
                                                    ? `${event.usuario?.nombres} ${event.usuario?.apellidos}`
                                                    : `${event.tecnicoAsignado?.nombres} ${event.tecnicoAsignado?.apellidos}`}
                                            </Text>
                                            <Text style={pdfStyles.eventDetail}>
                                                <Text style={pdfStyles.bold}>Estado: </Text>
                                                {event.tipo === 'incidencia' ? (event.atendida ? 'Resuelta' : 'Pendiente') : (event.estado || 'Completado')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )
                        })}
                </View>
            </Page>
        </Document>
    );
}

const MachineIndividualReportPage: NextPage = () => {
    const router = useRouter()
    const { id } = router.query
    const { getAllEventos, eventos, getMaquinas, maquinas } = useManagment()
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    const machine = useMemo(() => maquinas.find(m => m.id === id), [maquinas, id])

    const handleExportPDF = async () => {
        if (!reportRef.current || !machine) return

        setExporting(true)
        try {
            // Function to get image data from Chart.js canvas
            const getChartImage = (chartId: string): string => {
                const canvases = reportRef.current?.querySelectorAll('canvas');
                if (!canvases) return '';

                // We need to find the canvas by looking at the parent structure
                // In this page, charts are inside cards.
                // It's easier to find all canvases and match them if possible, 
                // but since labels are dynamic, let's just use the index if we know the order.
                // Order in the DOM:
                // 1. statusChartData (Doughnut)
                // 2. maintenanceStatusChartData (Doughnut)
                // 3. maintenanceTypeChartData (Doughnut)
                // 4. trendChartData (Line)
                // 5. userParticipationChartData (Bar)

                const indexMap: Record<string, number> = {
                    'status': 0,
                    'maintStatus': 1,
                    'maintType': 2,
                    'trend': 3,
                    'participation': 4
                };

                const idx = indexMap[chartId];
                if (idx !== undefined && canvases[idx]) {
                    return canvases[idx].toDataURL('image/png');
                }
                return '';
            };

            const charts = {
                status: getChartImage('status'),
                maintStatus: getChartImage('maintStatus'),
                maintType: getChartImage('maintType'),
                trend: getChartImage('trend'),
                participation: getChartImage('participation')
            };

            const blob = await pdf(
                <MachineReportPDF
                    machine={machine}
                    data={filteredData}
                    charts={charts}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte-${(machine.name || 'equipo').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Hubo un error al generar el PDF. Por favor, intente de nuevo.');
        } finally {
            setExporting(false);
        }
    }

    useEffect(() => {
        const unsubscribeEventos = getAllEventos()
        const unsubscribeMaquinas = getMaquinas()
        const timer = setTimeout(() => setLoading(false), 1000)
        return () => {
            if (typeof unsubscribeEventos === 'function') unsubscribeEventos()
            if (typeof unsubscribeMaquinas === 'function') unsubscribeMaquinas()
            clearTimeout(timer)
        }
    }, [getAllEventos, getMaquinas])

    const filteredData = useMemo(() => {
        return eventos.filter(item => item.machineId === id)
    }, [eventos, id])

    // Specific charts for this machine
    const trendChartData = useMemo(() => {
        const dailyCounts: Record<string, { incidencia: number, mantenimiento: number }> = {}
        filteredData.forEach(event => {
            const dateObj = event.createdAt?.toDate ? event.createdAt.toDate() : (event.fechaReporte instanceof Date ? event.fechaReporte : new Date(event.fechaReporte))
            const dateStr = dateObj.toLocaleDateString()
            if (!dailyCounts[dateStr]) dailyCounts[dateStr] = { incidencia: 0, mantenimiento: 0 }
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
                    tension: 0.5,
                },
                {
                    label: 'Mantenimientos',
                    data: sortedDates.map(d => dailyCounts[d].mantenimiento),
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.5,
                }
            ],
        }
    }, [filteredData])

    const statusChartData = useMemo(() => {
        const counts = { atendida: 0, pendiente: 0 }
        filteredData.forEach(event => {
            if (event.tipo === 'incidencia') {
                if (event.atendida) counts.atendida += 1
                else counts.pendiente += 1
            }
        })
        return {
            labels: [`Atendidas (${counts.atendida})`, `Pendientes (${counts.pendiente})`],
            datasets: [{
                data: [counts.atendida, counts.pendiente],
                backgroundColor: ['rgba(34, 197, 94, 0.6)', 'rgba(249, 115, 22, 0.6)'],
                borderWidth: 1,
            }]
        }
    }, [filteredData])

    const maintenanceTypeChartData = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredData.forEach(event => {
            if (event.tipo === 'mantenimiento') {
                const type = event.subTipo || 'General'
                counts[type] = (counts[type] || 0) + 1
            }
        })
        const labels = Object.keys(counts)
        const data = Object.values(counts)

        return {
            labels: labels.map((l, i) => `${l} (${data[i]})`),
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(147, 51, 234, 0.6)',
                    'rgba(236, 72, 153, 0.6)',
                    'rgba(20, 184, 166, 0.6)',
                ],
                borderWidth: 1,
            }]
        }
    }, [filteredData])

    const maintenanceStatusChartData = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredData.forEach(event => {
            if (event.tipo === 'mantenimiento') {
                const status = event.estado || 'Completado'
                counts[status] = (counts[status] || 0) + 1
            }
        })
        const labels = Object.keys(counts)
        const data = Object.values(counts)

        return {
            labels: labels.map((l, i) => `${l} (${data[i]})`),
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(249, 115, 22, 0.6)',
                    'rgba(239, 68, 68, 0.6)',
                ],
                borderWidth: 1,
            }]
        }
    }, [filteredData])

    const userParticipationChartData = useMemo(() => {
        const userCounts: Record<string, { incidencia: number, mantenimiento: number }> = {}

        filteredData.forEach(event => {
            let userName = 'Desconocido'
            if (event.tipo === 'incidencia' && event.usuario) {
                userName = `${event.usuario.nombres} ${event.usuario.apellidos}`
            } else if (event.tipo === 'mantenimiento' && event.tecnicoAsignado) {
                userName = `${event.tecnicoAsignado.nombres} ${event.tecnicoAsignado.apellidos}`
            }

            if (!userCounts[userName]) userCounts[userName] = { incidencia: 0, mantenimiento: 0 }
            if (event.tipo === 'incidencia') userCounts[userName].incidencia += 1
            else userCounts[userName].mantenimiento += 1
        })

        const labels = Object.keys(userCounts)

        return {
            labels,
            datasets: [
                {
                    label: 'Incidencias',
                    data: labels.map(l => userCounts[l].incidencia),
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                },
                {
                    label: 'Mantenimientos',
                    data: labels.map(l => userCounts[l].mantenimiento),
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                }
            ]
        }
    }, [filteredData])

    if (!id || loading) return <div className={styles.loading}><div className={styles.spinner}></div></div>
    if (!machine) return <div className={styles.container}>Máquina no encontrada.</div>

    return (
        <div className={styles.container}>
            <Head>
                <title>Reporte: {machine.name}</title>
            </Head>

            <main className={styles.main}>
                <div className={styles.header}>
                    <Link href="/reportes-maquinas" className={styles.backLink}>
                        <FaArrowLeft /> Volver a Reportes Generales
                    </Link>
                    <h1 className={styles.title}>
                        <FaChartBar className={styles.titleIcon} /> Reporte de Equipo: {machine.name}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <ThemeToggle />
                        <button onClick={handleExportPDF} className={styles.exportButton} disabled={exporting}>
                            <FaFilePdf /> {exporting ? 'Generando...' : 'Exportar PDF'}
                        </button>
                    </div>
                </div>

                <div ref={reportRef} className={styles.chartsGrid}>
                    {/* Machine Details Card */}
                    <div className={`${styles.card} ${styles.cardFullWidth}`}>
                        <h3 className={styles.cardTitle}>Detalle del Equipo</h3>
                        <div className={styles.machineInfoContainer}>
                            {machine.image && (
                                <div className={styles.machineReportImageContainer}>
                                    <img
                                        src={machine.image}
                                        alt={machine.name}
                                        className={styles.machineReportImage}
                                    />
                                </div>
                            )}
                            <div className={styles.machineDetailGrid}>
                                <div className={styles.machineBadge}>
                                    <span className={styles.label}>Nombre:</span>
                                    <span className={styles.value}>{machine.name}</span>
                                </div>
                                <div className={styles.machineBadge}>
                                    <span className={styles.label}>Estado Actual:</span>
                                    <span className={`${styles.value} ${styles.statusText}`}>{machine.status}</span>
                                </div>
                                <div className={styles.machineBadge}>
                                    <span className={styles.label}>Ubicación:</span>
                                    <span className={styles.value}>{(machine as any).location || (machine as any).ubicacion || 'No especificada'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Metrics */}
                    <div className={`${styles.card} ${styles.cardThirdWidth}`}>
                        <h3 className={styles.cardTitle}>Total Eventos</h3>
                        <div className={styles.metricBig}>{filteredData.length}</div>
                        <p className={styles.metricSub}>{filteredData.filter(e => e.tipo === 'incidencia').length} Incidencias / {filteredData.filter(e => e.tipo === 'mantenimiento').length} Mantenimientos</p>
                    </div>

                    <div className={`${styles.card} ${styles.cardThirdWidth}`}>
                        <h3 className={styles.cardTitle}>Estado Incidencias</h3>
                        <div className={styles.chartContainerSmall}>
                            <Doughnut data={statusChartData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>

                    <div className={`${styles.card} ${styles.cardThirdWidth}`}>
                        <h3 className={styles.cardTitle}>Estado Mantenimientos</h3>
                        <div className={styles.chartContainerSmall}>
                            <Doughnut data={maintenanceStatusChartData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>

                    <div className={`${styles.card} ${styles.cardThirdWidth}`}>
                        <h3 className={styles.cardTitle}>Tipos de Mantenimiento</h3>
                        <div className={styles.chartContainerSmall}>
                            <Doughnut data={maintenanceTypeChartData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>

                    {/* Trend Chart Card */}
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
                                            grace: '10%', // Add 10% space at the top
                                            ticks: { stepSize: 1 }
                                        },
                                        x: {
                                            offset: true // Add spacing at start/end of x-axis
                                        }
                                    },
                                    plugins: {
                                        legend: {
                                            position: 'top',
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* User Participation Chart Card */}
                    <div className={`${styles.card} ${styles.cardFullWidth}`}>
                        <h3 className={styles.cardTitle}>Participación por Usuario</h3>
                        <div className={styles.chartContainer}>
                            <Bar
                                data={userParticipationChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            grace: '10%',
                                            ticks: { stepSize: 1 }
                                        },
                                        x: {
                                            offset: true
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Timeline Table Card */}
                    <div className={`${styles.card} ${styles.cardFullWidth}`}>
                        <h3 className={styles.cardTitle}>Resumen Cronológico</h3>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Descripción / Tareas</th>
                                        <th>Responsable</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData
                                        .sort((a, b) => {
                                            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.fechaReporte instanceof Date ? a.fechaReporte : new Date(a.fechaReporte))
                                            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.fechaReporte instanceof Date ? b.fechaReporte : new Date(b.fechaReporte))
                                            return dateB.getTime() - dateA.getTime()
                                        })
                                        .map((event, index) => {
                                            const date = event.createdAt?.toDate ? event.createdAt.toDate() : (event.fechaReporte instanceof Date ? event.fechaReporte : new Date(event.fechaReporte))
                                            return (
                                                <tr key={index}>
                                                    <td>{date.toLocaleDateString()}</td>
                                                    <td>
                                                        <span className={event.tipo === 'incidencia' ? styles.incidenciasBadge : styles.mantenimientoBadge}>
                                                            {event.tipo}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {event.tipo === 'incidencia'
                                                            ? (event as any).descripcion
                                                            : (event as any).tareas?.map((t: any) => typeof t === 'string' ? t : t.descripcion).join(', ') || 'N/A'}
                                                    </td>
                                                    <td>
                                                        {event.tipo === 'incidencia'
                                                            ? `${event.usuario?.nombres} ${event.usuario?.apellidos}`
                                                            : `${event.tecnicoAsignado?.nombres} ${event.tecnicoAsignado?.apellidos}`}
                                                    </td>
                                                    <td>
                                                        {event.tipo === 'incidencia' ? (event.atendida ? 'Atendida' : 'Pendiente') : (event.estado || 'Completado')}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Visual Event Log Card */}
                    <div className={`${styles.card} ${styles.cardFullWidth}`}>
                        <h3 className={styles.cardTitle}>Registro Visual y Detalle de Eventos</h3>
                        <div className={styles.eventCardsGrid}>
                            {filteredData
                                .sort((a, b) => {
                                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.fechaReporte instanceof Date ? a.fechaReporte : new Date(a.fechaReporte))
                                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.fechaReporte instanceof Date ? b.fechaReporte : new Date(b.fechaReporte))
                                    return dateB.getTime() - dateA.getTime()
                                })
                                .map((event, index) => {
                                    const date = event.createdAt?.toDate ? event.createdAt.toDate() : (event.fechaReporte instanceof Date ? event.fechaReporte : new Date(event.fechaReporte))
                                    return (
                                        <div key={index} className={styles.eventCard}>
                                            <div className={styles.eventCardImageContainer}>
                                                {event.fotoUrl ? (
                                                    <img src={event.fotoUrl} alt="Evidencia" className={styles.eventCardImage} />
                                                ) : (
                                                    <div className={styles.noImagePlaceholder}>
                                                        <FaThLarge size={40} />
                                                        <span>Sin imagen adjunta</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.eventCardContent}>
                                                <div className={styles.eventCardHeader}>
                                                    <div>
                                                        <span className={styles.eventCardDate}>{date.toLocaleDateString()}</span>
                                                        <h4 className={styles.eventCardTitle}>
                                                            {event.tipo.toUpperCase()} - {event.subTipo || 'General'}
                                                        </h4>
                                                    </div>
                                                    <span className={event.tipo === 'incidencia' ? styles.incidenciasBadge : styles.mantenimientoBadge}>
                                                        {event.tipo === 'incidencia' ? (event.atendida ? 'Resuelta' : 'Pendiente') : (event.estado || 'Completado')}
                                                    </span>
                                                </div>

                                                <div className={styles.eventCardBadges}>
                                                    {event.prioridad && (
                                                        <span className={styles.incidenciasBadge} style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
                                                            Prioridad: {event.prioridad}
                                                        </span>
                                                    )}
                                                    {event.costo && (
                                                        <span className={styles.mantenimientoBadge} style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                                                            Costo: ${event.costo}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className={styles.eventCardBody}>
                                                    <div className={styles.eventDetailGroup}>
                                                        <p className={styles.eventDetailLabel}>Descripción</p>
                                                        <p className={styles.eventDetailValue}>{event.descripcion || 'Sin descripción.'}</p>
                                                    </div>

                                                    {event.tipo === 'mantenimiento' && event.tareas && event.tareas.length > 0 && (
                                                        <div className={styles.eventDetailGroup}>
                                                            <p className={styles.eventDetailLabel}>Tareas Realizadas</p>
                                                            <ul className={styles.taskList}>
                                                                {event.tareas.map((t: any, idx: number) => (
                                                                    <li key={idx} className={styles.eventDetailValue}>
                                                                        {typeof t === 'string' ? t : t.descripcion}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {(event as any).piezasReemplazadas && (event as any).piezasReemplazadas.length > 0 && (
                                                        <div className={styles.eventDetailGroup}>
                                                            <p className={styles.eventDetailLabel}>Piezas Reemplazadas</p>
                                                            <ul className={styles.partsList}>
                                                                {(event as any).piezasReemplazadas.map((p: any, idx: number) => (
                                                                    <li key={idx} className={styles.eventDetailValue}>
                                                                        {p.nombre} ({p.cantidad})
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    <div className={styles.eventDetailGroup}>
                                                        <p className={styles.eventDetailLabel}>Responsable</p>
                                                        <p className={styles.eventDetailValue}>
                                                            {event.tipo === 'incidencia'
                                                                ? `${event.usuario?.nombres} ${event.usuario?.apellidos}`
                                                                : `${event.tecnicoAsignado?.nombres} ${event.tecnicoAsignado?.apellidos}`}
                                                        </p>
                                                    </div>

                                                    {(event as any).notas && (
                                                        <div className={styles.eventDetailGroup}>
                                                            <p className={styles.eventDetailLabel}>Notas Adicionales</p>
                                                            <p className={styles.eventDetailValue}>{(event as any).notas}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                    {filteredData.length === 0 && (
                        <div className={styles.card} style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                            <p>No hay eventos registrados para este equipo.</p>
                        </div>
                    )}
                </div>
            </main>
            <style jsx>{`
                .text-red-500 { color: #ef4444; }
                .text-blue-500 { color: #3b82f6; }
            `}</style>
        </div>
    )
}

export default MachineIndividualReportPage
