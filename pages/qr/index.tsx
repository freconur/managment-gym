import { useManagment } from '@/features/hooks/useManagment'
import React, { useEffect, useState, useMemo, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Document, Page, Text, Image, View, StyleSheet, pdf } from '@react-pdf/renderer'
import styles from '@/styles/qr.module.css'
import { Machine } from '@/features/types/types'

// Estilos para el PDF
const pdfStyles = StyleSheet.create({
    page: {
        padding: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
    },
    qrCard: {
        width: '25%',
        padding: 5,
        marginBottom: 10,
    },
    qrContainer: {
        width: '5cm',
        height: '5cm',
        border: '1px solid #000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
    },
    qrImage: {
        width: '4.5cm',
        height: '4.5cm',
        marginBottom: 3,
    },
    qrText: {
        fontSize: 8,
        textAlign: 'center',
        marginTop: 1,
    },
    qrName: {
        fontWeight: 'bold',
        fontSize: 9,
    },
    qrLocation: {
        fontSize: 7,
        color: '#666',
    },
})

const GenerarQr = () => {
    const {getMaquinas, maquinas, getUbicaciones, ubicaciones} = useManagment()
    const [filtroUbicacion, setFiltroUbicacion] = useState<string>('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [maquinasSeleccionadas, setMaquinasSeleccionadas] = useState<{ [key: string]: boolean }>({})
    const qrRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

    useEffect(() => {
        getMaquinas()
        const unsubscribeUbicaciones = getUbicaciones()
        return () => {
            unsubscribeUbicaciones()
        }
    }, [getMaquinas, getUbicaciones])

    // Inicializar todas las máquinas como seleccionadas
    useEffect(() => {
        setMaquinasSeleccionadas(prev => {
            const nuevasSelecciones: { [key: string]: boolean } = { ...prev }
            let hayCambios = false
            
            maquinas.forEach(maquina => {
                if (maquina.id && nuevasSelecciones[maquina.id] === undefined) {
                    nuevasSelecciones[maquina.id] = true
                    hayCambios = true
                }
            })
            
            return hayCambios ? nuevasSelecciones : prev
        })
    }, [maquinas])

    const maquinasFiltradas = useMemo(() => {
        if (!filtroUbicacion) {
            return maquinas
        }
        return maquinas.filter(maquina => maquina.location === filtroUbicacion)
    }, [maquinas, filtroUbicacion])

    const toggleMaquinaSeleccionada = (maquinaId: string) => {
        setMaquinasSeleccionadas(prev => ({
            ...prev,
            [maquinaId]: !prev[maquinaId]
        }))
    }

    const URL_QR = `/maquina/`

    // Función para convertir SVG a base64 usando canvas
    const svgToBase64 = (svgElement: SVGSVGElement): Promise<string> => {
        return new Promise((resolve, reject) => {
            try {
                const svgData = new XMLSerializer().serializeToString(svgElement)
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                const img = document.createElement('img')
                
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
                const url = URL.createObjectURL(svgBlob)
                
                img.onload = () => {
                    canvas.width = img.width
                    canvas.height = img.height
                    if (ctx) {
                        ctx.drawImage(img, 0, 0)
                        const base64 = canvas.toDataURL('image/png')
                        URL.revokeObjectURL(url)
                        resolve(base64)
                    } else {
                        URL.revokeObjectURL(url)
                        reject(new Error('No se pudo obtener el contexto del canvas'))
                    }
                }
                
                img.onerror = () => {
                    URL.revokeObjectURL(url)
                    reject(new Error('Error al cargar la imagen SVG'))
                }
                
                img.src = url
            } catch (error) {
                reject(error)
            }
        })
    }

    // Función para generar el PDF
    const generarPDF = async () => {
        // Usar las máquinas filtradas si hay un filtro activo, sino todas las máquinas
        const maquinasFiltradasParaPDF = filtroUbicacion ? maquinasFiltradas : maquinas
        
        // Filtrar solo las máquinas seleccionadas
        const maquinasParaPDF = maquinasFiltradasParaPDF.filter(maquina => 
            maquina.id && maquinasSeleccionadas[maquina.id] === true
        )
        
        if (maquinasParaPDF.length === 0) {
            alert('No hay máquinas seleccionadas para generar el PDF')
            return
        }

        setIsGenerating(true)
        try {
            // Esperar un momento para asegurar que todos los elementos estén renderizados
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Generar imágenes base64 de los QRs
            const qrImages: { [key: string]: string } = {}
            
            for (const maquina of maquinasParaPDF) {
                const container = qrRefs.current[maquina.id || '']
                
                if (container) {
                    const svgElement = container.querySelector('svg') as SVGSVGElement
                    if (svgElement) {
                        try {
                            const base64 = await svgToBase64(svgElement)
                            qrImages[maquina.id || ''] = base64
                        } catch (error) {
                            console.error(`Error generando QR para máquina ${maquina.id}:`, error)
                        }
                    }
                }
            }
            
            // Verificar que tengamos al menos algunas imágenes
            if (Object.keys(qrImages).length === 0) {
                alert('No se pudieron generar las imágenes de los códigos QR. Por favor, intenta nuevamente.')
                setIsGenerating(false)
                return
            }

            // Crear el documento PDF con las imágenes
            const PDFDocument = () => (
                <Document>
                    <Page size="A4" style={pdfStyles.page}>
                        {maquinasParaPDF.map((maquina) => {
                            const qrImage = qrImages[maquina.id || '']
                            
                            return (
                                <View key={maquina.id} style={pdfStyles.qrCard}>
                                    <View style={pdfStyles.qrContainer}>
                                        {qrImage && (
                                            <Image 
                                                src={qrImage} 
                                                style={pdfStyles.qrImage}
                                            />
                                        )}
                                        <Text style={[pdfStyles.qrText, pdfStyles.qrName]}>
                                            {maquina.name || `Máquina ${maquina.id}`}
                                        </Text>
                                        <Text style={[pdfStyles.qrText, pdfStyles.qrLocation]}>
                                            {maquina.location || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            )
                        })}
                    </Page>
                </Document>
            )

            // Generar y descargar el PDF
            const blob = await pdf(<PDFDocument />).toBlob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `codigos-qr-maquinas-${new Date().toISOString().split('T')[0]}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error generando PDF:', error)
            alert('Error al generar el PDF. Por favor, intenta nuevamente.')
        } finally {
            setIsGenerating(false)
        }
    }
    
    return (
        <div className={styles.main}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    Códigos QR de Máquinas
                </h1>
                {maquinas.length > 0 && (
                    <button 
                        className={styles.generateButton}
                        onClick={generarPDF}
                        disabled={isGenerating}
                    >
                        {isGenerating ? 'Generando...' : 'Generar QR PDF'}
                    </button>
                )}
            </div>
            {maquinas.length === 0 ? (
                <div className={styles.emptyState}>
                    <p className={styles.emptyStateText}>No hay máquinas disponibles</p>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.tableHeader}>
                            <tr>
                                <th></th>
                                <th>Nombre</th>
                                <th>
                                    <div className={styles.filterHeader}>
                                        <span>Ubicación</span>
                                        <select
                                            className={styles.filterSelect}
                                            value={filtroUbicacion}
                                            onChange={(e) => setFiltroUbicacion(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">Todas las ubicaciones</option>
                                            {ubicaciones.map((ubicacion) => (
                                                <option key={ubicacion.id} value={ubicacion.name}>
                                                    {ubicacion.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </th>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={maquinasFiltradas.length > 0 && maquinasFiltradas.every(m => m.id && maquinasSeleccionadas[m.id] === true)}
                                        onChange={(e) => {
                                            maquinasFiltradas.forEach(maquina => {
                                                if (maquina.id) {
                                                    setMaquinasSeleccionadas(prev => ({
                                                        ...prev,
                                                        [maquina.id!]: e.target.checked
                                                    }))
                                                }
                                            })
                                        }}
                                        className={styles.checkboxHeader}
                                        title="Seleccionar/Deseleccionar todas"
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody className={styles.tableBody}>
                            {maquinasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className={styles.noResults}>
                                        No se encontraron máquinas con la ubicación seleccionada
                                    </td>
                                </tr>
                            ) : (
                                maquinasFiltradas.map((maquina) => {
                                    const qrValue = `${URL_QR}${maquina.id}`
                                    const isSelected = maquina.id ? maquinasSeleccionadas[maquina.id] === true : false
                                    return (
                                        <tr key={maquina.id}>
                                            <td></td>
                                            <td>
                                                {maquina.name || `Máquina ${maquina.id}`}
                                            </td>
                                            <td>
                                                {maquina.location || 'N/A'}
                                            </td>
                                            <td className={styles.checkboxCell}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => maquina.id && toggleMaquinaSeleccionada(maquina.id)}
                                                    className={styles.checkbox}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Sección oculta para renderizar todos los QRs para el PDF */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
                {maquinas.map((maquina) => {
                    const qrValue = `${URL_QR}${maquina.id}`
                    return (
                        <div 
                            key={`hidden-${maquina.id}`}
                            ref={(el) => {
                                if (maquina.id) {
                                    qrRefs.current[maquina.id] = el
                                }
                            }}
                        >
                            <QRCodeSVG 
                                value={qrValue}
                                size={200}
                                level="H"
                                includeMargin={true}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default GenerarQr