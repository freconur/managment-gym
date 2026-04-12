import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useMemo, useRef } from 'react'
import {
    collection,
    query,
    orderBy,
    getDocs,
    doc,
    getDoc,
    Timestamp
} from 'firebase/firestore'
import { db } from '@/firebase/firebase.config'
import { FaChartBar, FaArrowLeft, FaFilter, FaFilePdf, FaSpinner, FaChevronDown, FaChevronUp, FaFileExcel } from 'react-icons/fa'
import { SubEnvironment, Ubicacion } from '@/features/types/types'
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
import ChartDataLabels from 'chartjs-plugin-datalabels' // Added
import styles from '../Reports.module.css'
import { InactiveMembersFilter } from '@/components/InactiveMembersFilter'
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
import { ThemeToggle } from '@/components/ThemeToggle'

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
    ChartDataLabels // Added
)

const pdfStyles = StyleSheet.create({
    table: { display: 'flex', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0, marginTop: 10 },
    tableRow: { margin: 'auto', flexDirection: 'row' },
    tableColHeader: { width: '33%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f3f4f6' },
    tableColAreaHeader: { width: '50%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f3f4f6' },
    tableCol: { width: '33%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0 },
    tableColArea: { width: '50%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0 },
    tableCellHeader: { margin: 5, fontSize: 10, fontWeight: 'bold' },
    tableCell: { margin: 5, fontSize: 10 },
    page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
    header: { marginBottom: 25, borderBottom: 1, borderBottomColor: '#e5e7eb', paddingBottom: 15 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 10, color: '#6b7280', marginTop: 5 },
    section: { marginBottom: 1 },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#1f2937', marginBottom: 10, borderLeft: 3, borderLeftColor: '#10b981', paddingLeft: 8 },
    summaryGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    summaryItem: { flex: 1, padding: 15, backgroundColor: '#f9fafb', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderStyle: 'solid', borderColor: '#f3f4f6' },
    summaryLabel: { fontSize: 8, color: '#6b7280', marginBottom: 4 },
    summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
    chartContainer: { width: '100%', marginBottom: 1, alignItems: 'center' },
    chartImage: { width: '100%', height: 220, objectFit: 'contain' },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#f3f4f6', paddingTop: 10, alignItems: 'center' },
    footerText: { fontSize: 8, color: '#9ca3af' }
});

interface MembersReportPDFProps {
    data: any[];
    charts: {
        timeline: string;
        company: string;
        uniqueCompany: string;
        area: string;
        sex: string;
    };
    stats: {
        totalIngresos: number;
        empresasActivas: number;
        totalUsuariosUnicos: number;
        areasActivas: number;
    };
    locationName: string;
    tableDataCompany: any[];
    tableDataArea: any[];
    tableDataUniqueUsers: any[];
}

const MembersReportPDF = ({ data, charts, stats, locationName, tableDataCompany, tableDataArea, tableDataUniqueUsers }: MembersReportPDFProps) => (
    <Document>
        <Page size="A4" style={pdfStyles.page}>
            <Text style={pdfStyles.title}>Reporte de Ingresos - {locationName}</Text>
            <Text style={pdfStyles.subtitle}>Management Gym - Generado el {new Date().toLocaleDateString()}</Text>

            <View style={[pdfStyles.section, { marginTop: 15 }]} wrap={false}>
                <Text style={pdfStyles.sectionTitle}>Resumen Ejecutivo</Text>
                <View style={pdfStyles.summaryGrid}>
                    <View style={pdfStyles.summaryItem}>
                        <Text style={pdfStyles.summaryLabel}>Total de Ingresos</Text>
                        <Text style={pdfStyles.summaryValue}>{stats.totalIngresos}</Text>
                    </View>
                    <View style={pdfStyles.summaryItem}>
                        <Text style={pdfStyles.summaryLabel}>Usuarios Únicos</Text>
                        <Text style={pdfStyles.summaryValue}>{stats.totalUsuariosUnicos}</Text>
                    </View>
                    <View style={pdfStyles.summaryItem}>
                        <Text style={pdfStyles.summaryLabel}>Empresas Activas</Text>
                        <Text style={pdfStyles.summaryValue}>{stats.empresasActivas}</Text>
                    </View>
                    <View style={pdfStyles.summaryItem}>
                        <Text style={pdfStyles.summaryLabel}>Áreas Activas</Text>
                        <Text style={pdfStyles.summaryValue}>{stats.areasActivas}</Text>
                    </View>
                </View>
            </View>

            <View style={pdfStyles.section} wrap={false}>
                <Text style={pdfStyles.sectionTitle}>Tendencia de Ingresos</Text>
                {charts.timeline && (
                    <View style={pdfStyles.chartContainer}>
                        <Image src={charts.timeline} style={[pdfStyles.chartImage, { height: 170 }]} />
                    </View>
                )}
            </View>

            <View style={pdfStyles.section} wrap={false}>
                <Text style={pdfStyles.sectionTitle}>Ingresos por Empresa</Text>
                {charts.company && (
                    <View style={pdfStyles.chartContainer}>
                        <Image src={charts.company} style={[pdfStyles.chartImage, { height: 250 }]} />
                    </View>
                )}
            </View>

            <View style={pdfStyles.section} wrap={false} break>
                <Text style={pdfStyles.sectionTitle}>Usuarios Únicos por Empresa</Text>
                {charts.uniqueCompany && (
                    <View style={pdfStyles.chartContainer}>
                        <Image src={charts.uniqueCompany} style={[pdfStyles.chartImage, { height: 240 }]} />
                    </View>
                )}
            </View>

            <View style={pdfStyles.section} wrap={false}>
                <Text style={pdfStyles.sectionTitle}>Ingresos por Área</Text>
                {charts.area && (
                    <View style={pdfStyles.chartContainer}>
                        <Image src={charts.area} style={[pdfStyles.chartImage, { height: 240 }]} />
                    </View>
                )}
            </View>


            <View style={pdfStyles.section} wrap={false}>
                <Text style={pdfStyles.sectionTitle}>Distribución por Sexo</Text>
                {charts.sex && (
                    <View style={pdfStyles.chartContainer}>
                        <Image src={charts.sex} style={[pdfStyles.chartImage, { height: 180 }]} />
                    </View>
                )}
            </View>



            <View style={pdfStyles.footer}>
                <Text style={pdfStyles.footerText}>
                    Este reporte contiene información consolidada de los registros de asistencia en {locationName}.
                </Text>
            </View>
        </Page>
    </Document>
);


interface AccessRecord {
    id: string;
    company: string;
    sexo?: string;
    subEnvironments?: string[];
    environment?: string;
    timestamp: any;
    memberId?: string;
    memberDni?: string;
    dni?: string;
    area?: string;
    memberName?: string;
    cargo?: string;
}

const DynamicReportsPage: NextPage = () => {
    const router = useRouter()
    const { id } = router.query

    const [accessData, setAccessData] = useState<AccessRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('this_month')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    const [selectedCompany, setSelectedCompany] = useState<string>('all')
    const [selectedArea, setSelectedArea] = useState<string>('all')
    const [exporting, setExporting] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    const [selectedSex, setSelectedSex] = useState<string>('all')
    const [selectedSubEnv, setSelectedSubEnv] = useState<string>('all')
    const [location, setLocation] = useState<Ubicacion | null>(null)

    const [timeRange, setTimeRange] = useState<string>('all')
    const [customStartTime, setCustomStartTime] = useState<string>('')
    const [customEndTime, setCustomEndTime] = useState<string>('')

    const [companyPage, setCompanyPage] = useState(0)
    const [uniqueCompanyPage, setUniqueCompanyPage] = useState(0)
    const [areaPage, setAreaPage] = useState(0)
    const [uniqueUsersPage, setUniqueUsersPage] = useState(0)

    const [showCompanyTable, setShowCompanyTable] = useState(false)
    const [showAreaTable, setShowAreaTable] = useState(false)
    const [showUsersTable, setShowUsersTable] = useState(false)

    // ── Sync filters from URL on initial load ────────────────────────────────
    const [queryReady, setQueryReady] = useState(false)
    useEffect(() => {
        if (!router.isReady) return
        const q = router.query
        if (q.dateRange) setDateRange(q.dateRange as string)
        if (q.customStart) setCustomStart(q.customStart as string)
        if (q.customEnd) setCustomEnd(q.customEnd as string)
        if (q.company) setSelectedCompany(q.company as string)
        if (q.area) setSelectedArea(q.area as string)
        if (q.sex) setSelectedSex(q.sex as string)
        if (q.subEnv) setSelectedSubEnv(q.subEnv as string)
        if (q.timeRange) setTimeRange(q.timeRange as string)
        if (q.startTime) setCustomStartTime(q.startTime as string)
        if (q.endTime) setCustomEndTime(q.endTime as string)
        setQueryReady(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady])

    /** Push the current filter state to the URL (shallow, no navigation) */
    const pushFiltersToUrl = (overrides: Record<string, string>) => {
        const current = {
            dateRange,
            customStart,
            customEnd,
            company: selectedCompany,
            area: selectedArea,
            sex: selectedSex,
            subEnv: selectedSubEnv,
            timeRange,
            startTime: customStartTime,
            endTime: customEndTime,
            ...overrides,
        }
        // Drop keys that are defaults so the URL stays clean
        const cleaned: Record<string, string> = {}
        const defaults: Record<string, string> = {
            dateRange: 'this_month', customStart: '', customEnd: '',
            company: 'all', area: 'all', sex: 'all', subEnv: 'all',
            timeRange: 'all', startTime: '', endTime: ''
        }
        Object.entries(current).forEach(([k, v]) => {
            if (v && v !== defaults[k]) cleaned[k] = v
        })
        router.replace({ query: { id, ...cleaned } }, undefined, { shallow: true })
    }


    useEffect(() => {
        if (!id) return

        const fetchData = async () => {
            setLoading(true)
            try {
                // Fetch location metadata
                const locDoc = await getDoc(doc(db, 'ubicaciones', id as string))
                if (locDoc.exists()) {
                    setLocation({ id: locDoc.id, ...locDoc.data() } as Ubicacion)
                }

                // Fetch data from location-specific subcollection
                const q = query(
                    collection(db, 'ubicaciones', id as string, 'asistencias'),
                    orderBy('timestamp', 'desc')
                )
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

    }, [id])

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
            const start = new Date(customStart)
            start.setMinutes(start.getMinutes() + start.getTimezoneOffset())
            const end = new Date(customEnd)
            end.setMinutes(end.getMinutes() + end.getTimezoneOffset())
            end.setHours(23, 59, 59, 999)

            filtered = filtered.filter(item => {
                const date = item.timestamp?.toDate()
                return date >= start && date <= end
            })

            console.log(`Filtrados por fecha (${customStart} a ${customEnd}):`, filtered)
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

        // Time Filter
        if (timeRange !== 'all') {
            let startMin: number | null = null;
            let endMin: number | null = null;

            if (timeRange === '07:00-11:00') { startMin = 7 * 60; endMin = 11 * 60; }
            else if (timeRange === '14:00-17:00') { startMin = 14 * 60; endMin = 17 * 60; }
            else if (timeRange === '18:30-19:30') { startMin = 18 * 60 + 30; endMin = 19 * 60 + 30; }
            else if (timeRange === '19:30-20:30') { startMin = 19 * 60 + 30; endMin = 20 * 60 + 30; }
            else if (timeRange === '20:30-21:30') { startMin = 20 * 60 + 30; endMin = 21 * 60 + 30; }
            else if (timeRange === '21:30-22:30') { startMin = 21 * 60 + 30; endMin = 22 * 60 + 30; }
            else if (timeRange === 'custom' && customStartTime && customEndTime) {
                const [sH, sM] = customStartTime.split(':').map(Number);
                const [eH, eM] = customEndTime.split(':').map(Number);
                startMin = sH * 60 + sM;
                endMin = eH * 60 + eM;
            }

            if (startMin !== null && endMin !== null) {
                filtered = filtered.filter(item => {
                    const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
                    const itemMin = date.getHours() * 60 + date.getMinutes();
                    if (startMin! <= endMin!) {
                        return itemMin >= startMin! && itemMin < endMin!;
                    } else {
                        return itemMin >= startMin! || itemMin < endMin!;
                    }
                });
            }
        }

        return filtered
    }, [accessData, dateRange, selectedCompany, selectedSex, customStart, customEnd, selectedSubEnv, timeRange, customStartTime, customEndTime])

    // Companies derived from data filtered by all active filters EXCEPT the company filter.
    // This ensures the dropdown only shows companies with actual accesses in the current context.
    const companies = useMemo(() => {
        let filtered = accessData

        // Date filter
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        if (dateRange === 'this_month') {
            filtered = filtered.filter(item => item.timestamp?.toDate() >= startOfMonth)
        } else if (dateRange === 'today') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0))
            filtered = filtered.filter(item => item.timestamp?.toDate() >= startOfDay)
        } else if (dateRange === 'custom' && customStart && customEnd) {
            const start = new Date(customStart)
            start.setMinutes(start.getMinutes() + start.getTimezoneOffset())
            const end = new Date(customEnd)
            end.setMinutes(end.getMinutes() + end.getTimezoneOffset())
            end.setHours(23, 59, 59, 999)
            filtered = filtered.filter(item => {
                const date = item.timestamp?.toDate()
                return date >= start && date <= end
            })
        }

        // Sex filter
        if (selectedSex !== 'all') {
            filtered = filtered.filter(item => item.sexo === selectedSex)
        }

        // SubEnvironment filter
        if (selectedSubEnv !== 'all') {
            filtered = filtered.filter(item =>
                item.subEnvironments && item.subEnvironments.includes(selectedSubEnv)
            )
        }

        // Time filter
        if (timeRange !== 'all') {
            let startMin: number | null = null
            let endMin: number | null = null
            if (timeRange === '07:00-11:00') { startMin = 7 * 60; endMin = 11 * 60 }
            else if (timeRange === '14:00-17:00') { startMin = 14 * 60; endMin = 17 * 60 }
            else if (timeRange === '18:30-19:30') { startMin = 18 * 60 + 30; endMin = 19 * 60 + 30 }
            else if (timeRange === '19:30-20:30') { startMin = 19 * 60 + 30; endMin = 20 * 60 + 30 }
            else if (timeRange === '20:30-21:30') { startMin = 20 * 60 + 30; endMin = 21 * 60 + 30 }
            else if (timeRange === '21:30-22:30') { startMin = 21 * 60 + 30; endMin = 22 * 60 + 30 }
            else if (timeRange === 'custom' && customStartTime && customEndTime) {
                const [sH, sM] = customStartTime.split(':').map(Number)
                const [eH, eM] = customEndTime.split(':').map(Number)
                startMin = sH * 60 + sM
                endMin = eH * 60 + eM
            }
            if (startMin !== null && endMin !== null) {
                filtered = filtered.filter(item => {
                    const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp)
                    const itemMin = date.getHours() * 60 + date.getMinutes()
                    return startMin! <= endMin!
                        ? itemMin >= startMin! && itemMin < endMin!
                        : itemMin >= startMin! || itemMin < endMin!
                })
            }
        }

        const unique = new Set(filtered.map(item => item.company).filter(Boolean))
        return Array.from(unique).sort()
    }, [accessData, dateRange, customStart, customEnd, selectedSex, selectedSubEnv, timeRange, customStartTime, customEndTime])

    const areas = useMemo(() => {
        let filtered = accessData

        // Date filter
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        if (dateRange === 'this_month') {
            filtered = filtered.filter(item => item.timestamp?.toDate() >= startOfMonth)
        } else if (dateRange === 'today') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0))
            filtered = filtered.filter(item => item.timestamp?.toDate() >= startOfDay)
        } else if (dateRange === 'custom' && customStart && customEnd) {
            const start = new Date(customStart)
            start.setMinutes(start.getMinutes() + start.getTimezoneOffset())
            const end = new Date(customEnd)
            end.setMinutes(end.getMinutes() + end.getTimezoneOffset())
            end.setHours(23, 59, 59, 999)
            filtered = filtered.filter(item => {
                const date = item.timestamp?.toDate()
                return date >= start && date <= end
            })
        }

        // Company filter
        if (selectedCompany !== 'all') {
            filtered = filtered.filter(item => item.company === selectedCompany)
        }

        // Sex filter
        if (selectedSex !== 'all') {
            filtered = filtered.filter(item => item.sexo === selectedSex)
        }

        // SubEnvironment filter
        if (selectedSubEnv !== 'all') {
            filtered = filtered.filter(item =>
                item.subEnvironments && item.subEnvironments.includes(selectedSubEnv)
            )
        }

        // Time filter
        if (timeRange !== 'all') {
            let startMin: number | null = null
            let endMin: number | null = null
            if (timeRange === '07:00-11:00') { startMin = 7 * 60; endMin = 11 * 60 }
            else if (timeRange === '14:00-17:00') { startMin = 14 * 60; endMin = 17 * 60 }
            else if (timeRange === '18:30-19:30') { startMin = 18 * 60 + 30; endMin = 19 * 60 + 30 }
            else if (timeRange === '19:30-20:30') { startMin = 19 * 60 + 30; endMin = 20 * 60 + 30 }
            else if (timeRange === '20:30-21:30') { startMin = 20 * 60 + 30; endMin = 21 * 60 + 30 }
            else if (timeRange === '21:30-22:30') { startMin = 21 * 60 + 30; endMin = 22 * 60 + 30 }
            else if (timeRange === 'custom' && customStartTime && customEndTime) {
                const [sH, sM] = customStartTime.split(':').map(Number)
                const [eH, eM] = customEndTime.split(':').map(Number)
                startMin = sH * 60 + sM
                endMin = eH * 60 + eM
            }
            if (startMin !== null && endMin !== null) {
                filtered = filtered.filter(item => {
                    const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp)
                    const itemMin = date.getHours() * 60 + date.getMinutes()
                    return startMin! <= endMin!
                        ? itemMin >= startMin! && itemMin < endMin!
                        : itemMin >= startMin! || itemMin < endMin!
                })
            }
        }

        const unique = new Set(filtered.map(item => item.area).filter(Boolean))
        return Array.from(unique).sort()
    }, [accessData, dateRange, customStart, customEnd, selectedCompany, selectedSex, selectedSubEnv, timeRange, customStartTime, customEndTime])

    const tableDataCompany = useMemo(() => {
        const uniqueByComp: Record<string, Set<string>> = {}
        const incomesByComp: Record<string, number> = {}

        filteredData.forEach(item => {
            const comp = item.company || 'Sin Empresa'
            const identifier = item.memberId || item.memberDni || item.dni || item.id

            incomesByComp[comp] = (incomesByComp[comp] || 0) + 1
            if (!uniqueByComp[comp]) uniqueByComp[comp] = new Set()
            uniqueByComp[comp].add(identifier)
        })

        const mapped = Object.keys(incomesByComp).map(comp => ({
            company: comp.toUpperCase(),
            ingresos: incomesByComp[comp],
            usuariosUnicos: uniqueByComp[comp].size
        }))

        return mapped.sort((a, b) => b.ingresos - a.ingresos)
    }, [filteredData])
    const tableDataArea = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredData.forEach(item => {
            const ar = item.area || 'Sin Área'
            counts[ar] = (counts[ar] || 0) + 1
        })
        const mapped = Object.entries(counts).map(([a, count]) => ({
            area: a.toUpperCase(),
            ingresos: count
        }))
        return mapped.sort((a, b) => b.ingresos - a.ingresos)
    }, [filteredData])

    const tableDataUniqueUsers = useMemo(() => {
        const uniqueMap = new Map<string, any>()
        filteredData.forEach(item => {
            const identifier = item.memberDni || item.dni || item.memberId || item.id
            if (!uniqueMap.has(identifier)) {
                uniqueMap.set(identifier, {
                    dni: item.memberDni || item.dni || 'N/A',
                    name: item.memberName || 'Usuario',
                    company: item.company || 'Sin Empresa',
                    cargo: item.cargo || 'N/A',
                    area: item.area || 'Sin Área',
                    ingresos: 1,
                })
            } else {
                const existing = uniqueMap.get(identifier)
                existing.ingresos += 1
            }
        })
        const arr = Array.from(uniqueMap.values())

        // Apply Local Area Filter
        const filteredArr = selectedArea === 'all'
            ? arr
            : arr.filter(u => u.area === selectedArea)

        return filteredArr.sort((a, b) => b.ingresos - a.ingresos)
    }, [filteredData, selectedArea])


    const companyChartData = useMemo(() => {
        const paginated = tableDataCompany.slice(companyPage * 10, (companyPage + 1) * 10)
        return {
            labels: paginated.map(p => p.company),
            datasets: [
                {
                    label: 'Ingresos',
                    data: paginated.map(p => p.ingresos),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    barPercentage: 0.8,
                    categoryPercentage: 0.9,
                },
            ],
        }
    }, [tableDataCompany, companyPage])

    const companyChartHeight = useMemo(() => {
        const numLabels = companyChartData.labels?.length || 0
        return Math.max(300, numLabels * 40 + 50)
    }, [companyChartData.labels])

    const uniqueCompanyChartData = useMemo(() => {
        const sorted = [...tableDataCompany].sort((a, b) => b.usuariosUnicos - a.usuariosUnicos)
        const paginated = sorted.slice(uniqueCompanyPage * 10, (uniqueCompanyPage + 1) * 10)
        return {
            labels: paginated.map(p => p.company),
            datasets: [
                {
                    label: 'Usuarios Únicos',
                    data: paginated.map(p => p.usuariosUnicos),
                    backgroundColor: 'rgba(168, 85, 247, 0.6)',
                    borderColor: 'rgba(168, 85, 247, 1)',
                    borderWidth: 1,
                    barPercentage: 0.8,
                    categoryPercentage: 0.9,
                },
            ],
        }
    }, [tableDataCompany, uniqueCompanyPage])

    const uniqueCompanyChartHeight = useMemo(() => {
        const numLabels = uniqueCompanyChartData.labels?.length || 0
        return Math.max(300, numLabels * 40 + 50)
    }, [uniqueCompanyChartData.labels])

    const areaChartData = useMemo(() => {
        const paginated = tableDataArea.slice(areaPage * 10, (areaPage + 1) * 10)
        return {
            labels: paginated.map(p => p.area),
            datasets: [
                {
                    label: 'Ingresos por Área',
                    data: paginated.map(p => p.ingresos),
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1,
                    barPercentage: 0.8,
                    categoryPercentage: 0.9,
                },
            ],
        }
    }, [tableDataArea, areaPage])

    const areaChartHeight = useMemo(() => {
        const numLabels = areaChartData.labels?.length || 0
        return Math.max(300, numLabels * 40 + 50)
    }, [areaChartData.labels])

    const sexChartData = useMemo(() => {
        const counts = { 'Hombre': 0, 'Mujer': 0, 'Otro': 0 }
        filteredData.forEach(item => {
            const sex = item.sexo
            if (sex === 'Hombre') counts['Hombre'] += 1
            else if (sex === 'Mujer') counts['Mujer'] += 1
            else counts['Otro'] += 1
        })
        const labels = ['Hombre', 'Mujer', 'Otro']
        const data = [counts['Hombre'], counts['Mujer'], counts['Otro']]
        const backgroundColor = ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(201, 203, 207, 0.6)']
        const borderColor = ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)', 'rgba(201, 203, 207, 1)']

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
            datasets: [{ data: finalData, backgroundColor: finalBg, borderColor: finalBorder, borderWidth: 1 }],
        }
    }, [filteredData])

    const timelineChartData = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredData.forEach(item => {
            if (!item.timestamp?.toDate) return
            const dateObj = item.timestamp.toDate()
            const year = dateObj.getFullYear()
            const month = String(dateObj.getMonth() + 1).padStart(2, '0')
            const day = String(dateObj.getDate()).padStart(2, '0')
            const dateKey = `${year}-${month}-${day}`
            counts[dateKey] = (counts[dateKey] || 0) + 1
        })
        const sortedKeys = Object.keys(counts).sort()
        return {
            labels: sortedKeys.map(key => {
                const [, , day] = key.split('-');
                return day; // Show only the day (e.g., "01", "15")
            }),
            datasets: [
                {
                    label: 'Ingresos por Día',
                    data: sortedKeys.map(key => counts[key]),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.3,
                },
            ],
        }
    }, [filteredData])

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
            const charts = {
                timeline: getChartImage(0),
                company: getChartImage(1),
                uniqueCompany: getChartImage(2),
                area: getChartImage(3),
                sex: getChartImage(4),
            };
            const stats = {
                totalIngresos: filteredData.length,
                totalUsuariosUnicos: new Set(filteredData.map(item => item.memberId || item.memberDni || item.dni || item.id)).size,
                empresasActivas: tableDataCompany.length,
                areasActivas: tableDataArea.length
            };
            const blob = await pdf(
                <MembersReportPDF
                    data={filteredData}
                    charts={charts}
                    stats={stats}
                    locationName={location?.name || ''}
                    tableDataCompany={tableDataCompany}
                    tableDataArea={tableDataArea}
                    tableDataUniqueUsers={tableDataUniqueUsers}
                />
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte-ingresos-${location?.name || 'ubicacion'}-${new Date().toISOString().split('T')[0]}.pdf`;
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

    const handleExportExcel = (data: any[], filename: string) => {
        import('xlsx').then(({ utils, writeFile }) => {
            const ws = utils.json_to_sheet(data);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Reporte");
            writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
        }).catch(err => {
            console.error("Error cargando xlsx:", err);
            alert("No se pudo exportar a Excel.");
        });
    }

    if (loading && !location) {
        return (
            <div className={styles.loadingContainer}>
                <FaSpinner className={styles.spinAnimation} />
                <p>Cargando reportes...</p>
            </div>
        )
    }

    return (
        <>
            <Head>
                <title>Reportes {location?.name ? `- ${location.name}` : ''} - Management Gym</title>
            </Head>
            <div className={styles.container}>
                <main className={styles.main}>

                    <div className={styles.header}>
                        <div className={styles.headerTitleGroup}>
                            <Link href={`/members/${id}`} className={styles.backLink}>
                                <FaArrowLeft /> Volver a Gestión
                            </Link>
                            <h1 className={styles.title}>
                                <FaChartBar className={styles.titleIcon} /> Reportes: <span style={{ color: '#3b82f6' }}>{location?.name}</span>
                            </h1>
                        </div>
                        {!loading && (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <ThemeToggle />
                                <button
                                    onClick={handleExportPDF}
                                    disabled={exporting}
                                    className={styles.exportButton}
                                >
                                    <FaFilePdf /> {exporting ? 'Generando PDF...' : 'Exportar PDF'}
                                </button>
                            </div>
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
                                onChange={(e) => {
                                    setDateRange(e.target.value)
                                    pushFiltersToUrl({ dateRange: e.target.value })
                                }}
                                className={styles.select}
                            >
                                <option value="this_month">Este Mes</option>
                                <option value="today">Hoy</option>
                                <option value="custom">Rango Personalizado</option>
                            </select>

                            {dateRange === 'custom' && (
                                <div className={styles.customDateContainer}>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => {
                                            setCustomStart(e.target.value)
                                            pushFiltersToUrl({ customStart: e.target.value })
                                        }}
                                        className={styles.dateInput}
                                    />
                                    <span className={styles.dateSeparator}>a</span>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => {
                                            setCustomEnd(e.target.value)
                                            pushFiltersToUrl({ customEnd: e.target.value })
                                        }}
                                        className={styles.dateInput}
                                    />
                                </div>
                            )}

                            <select
                                value={selectedCompany}
                                onChange={(e) => {
                                    setSelectedCompany(e.target.value)
                                    pushFiltersToUrl({ company: e.target.value })
                                }}
                                className={styles.select}
                            >
                                <option value="all">Todas las Empresas</option>
                                {companies.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <select
                                value={selectedSex}
                                onChange={(e) => {
                                    setSelectedSex(e.target.value)
                                    pushFiltersToUrl({ sex: e.target.value })
                                }}
                                className={styles.select}
                            >
                                <option value="all">Todos los Sexos</option>
                                <option value="Hombre">Hombre</option>
                                <option value="Mujer">Mujer</option>
                            </select>

                            {location?.haveSubEnvironments && location.subEnvironments && location.subEnvironments.length > 0 && (
                                <select
                                    value={selectedSubEnv}
                                    onChange={(e) => {
                                        setSelectedSubEnv(e.target.value)
                                        pushFiltersToUrl({ subEnv: e.target.value })
                                    }}
                                    className={styles.select}
                                >
                                    <option value="all">Todos los Sub-ambientes</option>
                                    {location.subEnvironments.map(env => (
                                        <option key={env.id} value={env.nombre}>{env.nombre}</option>
                                    ))}
                                </select>
                            )}

                            <select
                                value={timeRange}
                                onChange={(e) => {
                                    setTimeRange(e.target.value)
                                    pushFiltersToUrl({ timeRange: e.target.value })
                                }}
                                className={styles.select}
                            >
                                <option value="all">Todo el día</option>
                                <option value="07:00-11:00">07:00 - 11:00</option>
                                <option value="14:00-17:00">14:00 - 17:00</option>
                                <option value="18:30-19:30">18:30 - 19:30</option>
                                <option value="19:30-20:30">19:30 - 20:30</option>
                                <option value="20:30-21:30">20:30 - 21:30</option>
                                <option value="21:30-22:30">21:30 - 22:30</option>
                                <option value="custom">Rango Horario Pers.</option>
                            </select>

                            {timeRange === 'custom' && (
                                <div className={styles.customDateContainer}>
                                    <input
                                        type="time"
                                        value={customStartTime}
                                        onChange={(e) => {
                                            setCustomStartTime(e.target.value)
                                            pushFiltersToUrl({ startTime: e.target.value })
                                        }}
                                        className={styles.dateInput}
                                    />
                                    <span className={styles.dateSeparator}>a</span>
                                    <input
                                        type="time"
                                        value={customEndTime}
                                        onChange={(e) => {
                                            setCustomEndTime(e.target.value)
                                            pushFiltersToUrl({ endTime: e.target.value })
                                        }}
                                        className={styles.dateInput}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className={styles.loading}>Cargando datos...</div>
                    ) : (
                        <div ref={reportRef} className={styles.chartsGrid}>
                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Resumen</h3>
                                <div className={styles.summaryGrid}>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Total Ingresos</p>
                                        <p className={styles.summaryValue}>{filteredData.length}</p>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Usuarios Únicos</p>
                                        <p className={styles.summaryValue}>{new Set(filteredData.map(item => item.memberId || item.memberDni || item.dni || item.id)).size}</p>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Empresas Activas</p>
                                        <p className={styles.summaryValue}>{tableDataCompany.length}</p>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <p className={styles.summaryLabel}>Áreas Activas</p>
                                        <p className={styles.summaryValue}>{tableDataArea.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Tendencia de Ingresos</h3>
                                <div className={styles.chartContainer}>
                                    <Line
                                        data={timelineChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            interaction: { mode: 'index', intersect: false },
                                            plugins: {
                                                legend: { position: 'top' as const },
                                                datalabels: { // Permanent values on points
                                                    display: true,
                                                    color: '#4bc0c0',
                                                    align: 'top',
                                                    offset: 4,
                                                    font: {
                                                        weight: 'bold'
                                                    }
                                                },
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
                                                    beginAtZero: false,
                                                    grace: '10%',
                                                    ticks: { precision: 0 },
                                                    grid: { tickLength: 8, color: 'rgba(0, 0, 0, 0.1)' }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Ingresos por Empresa</h3>
                                <div className={styles.chartContainer} style={{ height: `${companyChartHeight}px` }}>
                                    <Bar
                                        data={companyChartData}
                                        options={{
                                            indexAxis: 'y' as const, // Added for horizontal bars
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    callbacks: {
                                                        label: function (context: any) {
                                                            return `Ingresos: ${context.parsed.x}`;
                                                        }
                                                    }
                                                },
                                                datalabels: { // Permanent values on bars
                                                    display: true,
                                                    color: '#3b82f6',
                                                    anchor: 'end',
                                                    align: 'right',
                                                    offset: 4,
                                                    font: {
                                                        weight: 'bold'
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    ticks: { precision: 0 },
                                                    grid: { tickLength: 8, color: 'rgba(0, 0, 0, 0.1)' }
                                                },
                                                y: {
                                                    ticks: { autoSkip: false }, // Don't skip names for better readability
                                                    grid: { display: false }
                                                }
                                            },
                                            elements: {
                                                bar: {
                                                    borderWidth: 1,
                                                }
                                            },
                                        }}
                                    />
                                </div>
                                {tableDataCompany.length > 10 && (
                                    <div className={styles.paginationContainer}>
                                        <button onClick={() => setCompanyPage(p => Math.max(0, p - 1))} disabled={companyPage === 0} className={styles.paginationButton}>Anterior</button>
                                        <span className={styles.paginationInfo}>Página {companyPage + 1} de {Math.ceil(tableDataCompany.length / 10)}</span>
                                        <button onClick={() => setCompanyPage(p => p + 1 < (tableDataCompany.length / 10) ? p + 1 : p)} disabled={companyPage + 1 >= Math.ceil(tableDataCompany.length / 10)} className={styles.paginationButton}>Siguiente</button>
                                    </div>
                                )}
                            </div>

                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Usuarios Únicos por Empresa</h3>
                                <div className={styles.chartContainer} style={{ height: `${uniqueCompanyChartHeight}px` }}>
                                    <Bar
                                        data={uniqueCompanyChartData}
                                        options={{
                                            indexAxis: 'y' as const, // Added for horizontal bars
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    callbacks: {
                                                        label: function (context: any) {
                                                            return `Usuarios Únicos: ${context.parsed.x}`;
                                                        }
                                                    }
                                                },
                                                datalabels: { // Permanent values on bars
                                                    display: true,
                                                    color: '#a855f7',
                                                    anchor: 'end',
                                                    align: 'right',
                                                    offset: 4,
                                                    font: {
                                                        weight: 'bold'
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    ticks: { precision: 0 },
                                                    grid: { tickLength: 8, color: 'rgba(0, 0, 0, 0.1)' }
                                                },
                                                y: {
                                                    ticks: { autoSkip: false }, // Don't skip names for better readability
                                                    grid: { display: false }
                                                }
                                            },
                                            elements: {
                                                bar: {
                                                    borderWidth: 1,
                                                }
                                            },
                                        }}
                                    />
                                </div>
                                {tableDataCompany.length > 10 && (
                                    <div className={styles.paginationContainer}>
                                        <button onClick={() => setUniqueCompanyPage(p => Math.max(0, p - 1))} disabled={uniqueCompanyPage === 0} className={styles.paginationButton}>Anterior</button>
                                        <span className={styles.paginationInfo}>Página {uniqueCompanyPage + 1} de {Math.ceil(tableDataCompany.length / 10)}</span>
                                        <button onClick={() => setUniqueCompanyPage(p => p + 1 < (tableDataCompany.length / 10) ? p + 1 : p)} disabled={uniqueCompanyPage + 1 >= Math.ceil(tableDataCompany.length / 10)} className={styles.paginationButton}>Siguiente</button>
                                    </div>
                                )}
                            </div>

                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Ingresos por Área</h3>
                                <div className={styles.chartContainer} style={{ height: `${areaChartHeight}px` }}>
                                    <Bar
                                        data={areaChartData}
                                        options={{
                                            indexAxis: 'y' as const, // Added for horizontal bars
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    callbacks: {
                                                        label: function (context: any) {
                                                            return `Ingresos: ${context.parsed.x}`;
                                                        }
                                                    }
                                                },
                                                datalabels: { // Permanent values on bars
                                                    display: true,
                                                    color: '#10b981',
                                                    anchor: 'end',
                                                    align: 'right',
                                                    offset: 4,
                                                    font: {
                                                        weight: 'bold'
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    ticks: { precision: 0 },
                                                    grid: { tickLength: 8, color: 'rgba(0, 0, 0, 0.1)' }
                                                },
                                                y: {
                                                    ticks: { autoSkip: false }, // Don't skip names for better readability
                                                    grid: { display: false }
                                                }
                                            },
                                            elements: {
                                                bar: {
                                                    borderWidth: 1,
                                                }
                                            },
                                        }}
                                    />
                                </div>
                                {tableDataArea.length > 10 && (
                                    <div className={styles.paginationContainer}>
                                        <button onClick={() => setAreaPage(p => Math.max(0, p - 1))} disabled={areaPage === 0} className={styles.paginationButton}>Anterior</button>
                                        <span className={styles.paginationInfo}>Página {areaPage + 1} de {Math.ceil(tableDataArea.length / 10)}</span>
                                        <button onClick={() => setAreaPage(p => p + 1 < (tableDataArea.length / 10) ? p + 1 : p)} disabled={areaPage + 1 >= Math.ceil(tableDataArea.length / 10)} className={styles.paginationButton}>Siguiente</button>
                                    </div>
                                )}
                            </div>

                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle} style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 15 }}>Datos Detallados</h3>

                                <div style={{ border: '1px solid var(--border-glass)', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setShowCompanyTable(!showCompanyTable)}
                                        className={styles.accordionButton}
                                    >
                                        1. Tabla de Ingresos y Usuarios Únicos por Empresa
                                        {showCompanyTable ? <FaChevronUp /> : <FaChevronDown />}
                                    </button>
                                    {showCompanyTable && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                                                <button onClick={() => handleExportExcel(tableDataCompany, `Ingresos_Empresa_${location?.name?.replace(/\s+/g, '_')}`)} className={styles.exportButton} style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white' }}>
                                                    <FaFileExcel /> Exportar Excel
                                                </button>
                                            </div>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table className={styles.dataTable}>
                                                    <thead>
                                                        <tr className={styles.dataTableHeader}>
                                                            <th>Empresa</th>
                                                            <th>Ingresos Totales</th>
                                                            <th>Usuarios Únicos</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tableDataCompany.map((row, i) => (
                                                            <tr key={row.company} className={styles.dataTableRow}>
                                                                <td>{row.company}</td>
                                                                <td>{row.ingresos}</td>
                                                                <td>{row.usuariosUnicos}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ border: '1px solid var(--border-glass)', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setShowAreaTable(!showAreaTable)}
                                        className={styles.accordionButton}
                                    >
                                        2. Tabla de Ingresos por Área
                                        {showAreaTable ? <FaChevronUp /> : <FaChevronDown />}
                                    </button>
                                    {showAreaTable && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                                                <button onClick={() => handleExportExcel(tableDataArea, `Ingresos_Area_${location?.name?.replace(/\s+/g, '_')}`)} className={styles.exportButton} style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white' }}>
                                                    <FaFileExcel /> Exportar Excel
                                                </button>
                                            </div>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table className={styles.dataTable}>
                                                    <thead>
                                                        <tr className={styles.dataTableHeader}>
                                                            <th>Área</th>
                                                            <th>Ingresos Totales</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tableDataArea.map((row, i) => (
                                                            <tr key={row.area} className={styles.dataTableRow}>
                                                                <td>{row.area}</td>
                                                                <td>{row.ingresos}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ border: '1px solid var(--border-glass)', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setShowUsersTable(!showUsersTable)}
                                        className={styles.accordionButton}
                                    >
                                        3. Tabla Detalle de Cada Usuario Único
                                        {showUsersTable ? <FaChevronUp /> : <FaChevronDown />}
                                    </button>
                                    {showUsersTable && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
                                                <select
                                                    value={selectedArea}
                                                    onChange={(e) => {
                                                        setSelectedArea(e.target.value)
                                                        pushFiltersToUrl({ area: e.target.value })
                                                    }}
                                                    className={styles.select}
                                                    style={{ width: 'auto', textTransform: 'uppercase' }}
                                                >
                                                    <option value="all">TODAS LAS ÁREAS</option>
                                                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                                                    {accessData.some(item => !item.area) && <option value="Sin Área">SIN ÁREA</option>}
                                                </select>

                                                <button onClick={() => handleExportExcel(tableDataUniqueUsers, `Usuarios_Unicos_${location?.name?.replace(/\s+/g, '_')}`)} className={styles.exportButton} style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white' }}>
                                                    <FaFileExcel /> Exportar Excel
                                                </button>
                                            </div>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table className={styles.dataTable}>
                                                    <thead>
                                                        <tr className={styles.dataTableHeader}>
                                                            <th>#</th>
                                                            <th>DNI</th>
                                                            <th>Usuario</th>
                                                            <th>Empresa</th>
                                                            <th>Cargo</th>
                                                            <th>Área</th>
                                                            <th>Ingresos</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(tableDataUniqueUsers.slice(uniqueUsersPage * 20, (uniqueUsersPage + 1) * 20)).map((row: any, i: number) => (
                                                            <tr key={i} className={styles.dataTableRow} style={{ textTransform: 'capitalize' }}>
                                                                <td style={{ padding: '12px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>{uniqueUsersPage * 20 + i + 1}</td>
                                                                <td>{row.dni}</td>
                                                                <td>{row.name}</td>
                                                                <td>{row.company}</td>
                                                                <td>{row.cargo}</td>
                                                                <td>{row.area}</td>
                                                                <td>{row.ingresos}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {tableDataUniqueUsers.length > 20 && (
                                                <div className={styles.paginationContainer}>
                                                    <button onClick={() => setUniqueUsersPage(p => Math.max(0, p - 1))} disabled={uniqueUsersPage === 0} className={styles.paginationButton}>Anterior</button>
                                                    <span className={styles.paginationInfo}>Página {uniqueUsersPage + 1} de {Math.ceil(tableDataUniqueUsers.length / 20)}</span>
                                                    <button onClick={() => setUniqueUsersPage(p => p + 1 < (tableDataUniqueUsers.length / 20) ? p + 1 : p)} disabled={uniqueUsersPage + 1 >= Math.ceil(tableDataUniqueUsers.length / 20)} className={styles.paginationButton}>Siguiente</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <h3 className={styles.cardTitle}>Distribución por Sexo</h3>
                                <div className={`${styles.chartContainer} ${styles.doughnutContainer}`}>
                                    <Doughnut
                                        data={sexChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                datalabels: { // Permanent values on segments
                                                    display: true,
                                                    color: '#fff',
                                                    font: {
                                                        weight: 'bold',
                                                        size: 14
                                                    },
                                                    formatter: (value: any) => value
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className={`${styles.card} ${styles.cardFullWidth}`}>
                                <InactiveMembersFilter locationId={id as string} />
                            </div>
                        </div>
                    )}
                </main >
            </div >
        </>
    )
}

export default DynamicReportsPage
