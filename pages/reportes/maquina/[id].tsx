import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useMemo, useRef } from 'react'
import { FaChartBar, FaArrowLeft, FaTools, FaExclamationTriangle, FaFilePdf, FaTable, FaThLarge, FaImage } from 'react-icons/fa'
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
            pdf.text(`Reporte de Equipo: ${machine.name || 'Sin Nombre'}`, margin, margin + 5)
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

            // 2. Clone the entire report into staging
            const reportClone = reportRef.current.cloneNode(true) as HTMLElement
            // Ensure the clone itself doesn't have restrictive styles that could break the width
            reportClone.style.width = captureWidth + 'px'
            reportClone.style.maxWidth = 'none'
            staging.appendChild(reportClone)
            document.body.appendChild(staging)

            // Need to wait a bit for layout to settle if there are charts, but since we sync later...
            // Let's find rows in the STAGING environment
            const cards = Array.from(reportClone.children) as HTMLElement[]
            const rows: HTMLElement[][] = []
            let currentRow: HTMLElement[] = []
            let lastOffsetTop = -1

            cards.forEach(card => {
                // If it's a card and visible
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
                // Create a temporary container for capturing the row
                const rowContainer = document.createElement('div')
                rowContainer.className = styles.chartsGrid
                rowContainer.style.width = captureWidth + 'px'
                rowContainer.style.position = 'fixed'
                rowContainer.style.left = '-9999px'
                rowContainer.style.top = '0'
                rowContainer.style.padding = '10px'
                rowContainer.style.backgroundColor = 'white'
                document.body.appendChild(rowContainer)

                // We need to sync charts from ORIGINAL to CLONE
                // Match the original card by index
                const cardIndices = rowCards.map(c => Array.from(reportClone.children).indexOf(c))
                const originalCards = cardIndices.map(idx => reportRef.current!.children[idx] as HTMLElement)

                // Clone cards into the container
                rowCards.forEach((card, cardIndexInRow) => {
                    const originalCard = originalCards[cardIndexInRow]
                    const clone = card.cloneNode(true) as HTMLElement
                    // Maintain computed widths/styles
                    clone.style.width = card.offsetWidth + 'px'
                    rowContainer.appendChild(clone)

                    // Sync canvases using the ORIGINAL (real) DOM
                    const originalCanvases = Array.from(originalCard.querySelectorAll('canvas'))
                    const clonedCanvases = Array.from(clone.querySelectorAll('canvas'))
                    originalCanvases.forEach((cvs, i) => {
                        const clonedCvs = clonedCanvases[i]
                        if (clonedCvs) {
                            // Ensure size matches for sync
                            clonedCvs.width = cvs.width
                            clonedCvs.height = cvs.height
                            clonedCvs.getContext('2d')?.drawImage(cvs, 0, 0)
                        }
                    })

                    const images = Array.from(clone.querySelectorAll('img'))
                    // This async part is tricky in a loop, so we've pre-defined toBase64
                })

                // Heavy lifting: convert images to base64 inside the row
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

                // Check if row fits on current page
                if (currentY + imgHeight > pageHeight - margin) {
                    // If it's a single tall card (like the table), split it
                    if (rowCards.length === 1 && imgHeight > (pageHeight - margin * 2)) {
                        let heightLeft = imgHeight
                        let position = 0

                        // Current page slice
                        const spaceLeft = pageHeight - margin - currentY
                        pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight)
                        heightLeft -= spaceLeft
                        position -= spaceLeft

                        while (heightLeft > 0) {
                            pdf.addPage()
                            pdf.addImage(imgData, 'JPEG', margin, margin + position, imgWidth, imgHeight)
                            heightLeft -= (pageHeight - margin * 2)
                            position -= (pageHeight - margin * 2)
                        }
                        currentY = pageHeight // Effectively end of doc
                    } else {
                        // Move whole row to next page
                        pdf.addPage()
                        currentY = margin
                        pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight)
                        currentY += imgHeight + 5
                    }
                } else {
                    pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight)
                    currentY += imgHeight + 5
                }

                // Cleanup row container
                document.body.removeChild(rowContainer)
            }

            // Cleanup staging
            document.body.removeChild(staging)

            pdf.save(`reporte-${(machine.name || 'equipo').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Hubo un error al generar el PDF.')
        } finally {
            setExporting(false)
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
                    <button onClick={handleExportPDF} className={styles.exportButton} disabled={exporting}>
                        <FaFilePdf /> {exporting ? 'Generando...' : 'Exportar PDF'}
                    </button>
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
