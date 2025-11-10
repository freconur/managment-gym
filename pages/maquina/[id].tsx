import { useManagment } from '@/features/hooks/useManagment'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { FaArrowLeft, FaCog, FaCalendarAlt, FaMapMarkerAlt, FaTag, FaStickyNote, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaTools, FaExclamationCircle } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { IncidenciasSection } from '@/components/IncidenciasSection'
import { MantenimientoModal } from '@/components/MantenimientoModal'
import { IncidenciaModal } from '@/components/IncidenciaModal'
import { CalendarView } from '@/components/CalendarView'
import { MantenimientoDetailModal } from '@/components/MantenimientoDetailModal'
import { IncidenciaDetailModal } from '@/components/IncidenciaDetailModal'
import { AuthModal } from '@/components/AuthModal'
import { Machine, Incidencia, Usuario, Tarea } from '@/features/types/types'

const MaquinaPAge = () => {
  const router = useRouter()
  const { id } = router.query
  const { getMaquina, maquina, getIncidencias, incidencias, createIncidencia, createMantenimiento, updateIncidencia, deleteIncidencia, getUsuarios, usuarios, validateUsuario, usuariosValidate, validateSiEsAdmin } = useManagment()
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const selectedIncidenciaIdRef = useRef<string | null>(null)
  
  // Estado para los modales
  const [showMantenimientoModal, setShowMantenimientoModal] = useState(false)
  const [showIncidenciaModal, setShowIncidenciaModal] = useState(false)
  const [showEventoDetailModal, setShowEventoDetailModal] = useState(false)
  const [selectedIncidencia, setSelectedIncidencia] = useState<Incidencia | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar que router esté listo y que id esté disponible
    if (!router.isReady) {
      return
    }

    const machineId = id && typeof id === 'string' ? id : null
    
    if (!machineId) {
      setError('ID de máquina no válido')
      setIsLoading(false)
      return
    }

    // Limpiar estado anterior
    setIsLoading(true)
    setError(null)

    // Función para cargar los datos
    const loadData = async () => {
      try {
        await getMaquina(machineId)
        getUsuarios()
        // Suscribirse a incidencias
        if (unsubscribeRef.current) {
          unsubscribeRef.current()
        }
        unsubscribeRef.current = getIncidencias(machineId)
        setIsLoading(false)
      } catch (err) {
        console.error('Error al cargar datos de la máquina:', err)
        setError('Error al cargar los datos de la máquina')
        setIsLoading(false)
      }
    }

    loadData()
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [router.isReady, id, getMaquina, getIncidencias, getUsuarios])

  // Sincronizar selectedIncidencia cuando cambien las incidencias
  useEffect(() => {
    if (selectedIncidenciaIdRef.current) {
      const updatedIncidencia = incidencias.find(inc => inc.id === selectedIncidenciaIdRef.current)
      if (updatedIncidencia) {
        setSelectedIncidencia(updatedIncidencia)
      }
    }
  }, [incidencias])

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'maintenance':
        return 'En Mantenimiento'
      case 'inactive':
        return 'Inactivo'
      default:
        return 'N/A'
    }
  }

  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'active':
        return styles.statusActive
      case 'maintenance':
        return styles.statusMaintenance
      case 'inactive':
        return styles.statusInactive
      default:
        return ''
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <FaCheckCircle size={16} />
      case 'maintenance':
        return <FaExclamationTriangle size={16} />
      case 'inactive':
        return <FaTimesCircle size={16} />
      default:
        return null
    }
  }

  // Handlers para los modales
  const handleOpenMantenimientoModal = () => {
    setShowMantenimientoModal(true)
  }

  const handleCloseMantenimientoModal = () => {
    setShowMantenimientoModal(false)
  }

  const handleSubmitMantenimiento = async (data: {
    subTipo: string
    fechaProgramada: Date
    estado: string
    descripcion: string
    prioridad: string
    tecnicoAsignado: Usuario | {}
    notas: string
    tareas: Tarea[]
    mantenimientoRecurrente?: boolean
    frecuenciaDias?: number
  }) => {
    if (!maquina?.id) return

    try {
      const fechaReporte = new Date()
      
      // Obtener el objeto Usuario completo o undefined si es un objeto vacío
      const tecnicoAsignado = Object.keys(data.tecnicoAsignado).length > 0 
        ? (data.tecnicoAsignado as Usuario)
        : undefined
      
      // Si es mantenimiento recurrente, crear múltiples mantenimientos (12 para un año completo)
      if (data.mantenimientoRecurrente && data.fechaProgramada && data.frecuenciaDias) {
        const frecuenciaDias = data.frecuenciaDias || 7
        const numeroRepeticiones = 12 // Número fijo de repeticiones (un año)
        
        // Crear una copia de la fecha base para no mutarla
        const fechaBaseOriginal = new Date(data.fechaProgramada)
        
        // Crear mantenimientos para cada repetición
        for (let i = 0; i < numeroRepeticiones; i++) {
          // Crear una nueva fecha para cada evento sumando la frecuencia de días
          const fechaProgramada = new Date(fechaBaseOriginal)
          fechaProgramada.setDate(fechaProgramada.getDate() + (i * frecuenciaDias))
          
          
          const mantenimientoData = {
            machineId: maquina.id,
            tipo: 'mantenimiento',
            subTipo: data.subTipo,
            fechaReporte: fechaReporte,
            fechaProgramada: fechaProgramada,
            estado: data.estado,
            descripcion: data.descripcion,
            prioridad: data.prioridad,
            tecnicoAsignado: tecnicoAsignado,
            piezasReemplazadas: [],
            tareas: data.tareas || [],
            notas: data.notas || ""
          }
          
          await createMantenimiento(mantenimientoData, maquina)
        }
      } else {
        // Mantenimiento único (comportamiento original)
        const mantenimientoData = {
          machineId: maquina.id,
          tipo: 'mantenimiento',
          subTipo: data.subTipo,
          fechaReporte: fechaReporte,
          fechaProgramada: data.fechaProgramada,
          estado: data.estado,
          descripcion: data.descripcion,
          prioridad: data.prioridad,
          tecnicoAsignado: tecnicoAsignado,
          piezasReemplazadas: [],
          tareas: data.tareas || [],
          notas: data.notas || ""
        }
        
        await createMantenimiento(mantenimientoData, maquina)
      }
      
      handleCloseMantenimientoModal()
    } catch (error) {
      console.error('Error al guardar mantenimiento:', error)
      throw error
    }
  }

  const handleOpenIncidenciaModal = () => {
    setShowAuthModal(true)
    setAuthError('')
  }

  const handleCloseIncidenciaModal = () => {
    setShowIncidenciaModal(false)
  }

  const handleCloseAuthModal = () => {
    setShowAuthModal(false)
    setAuthError('')
  }

  const handleAuthAccept = async(dni: string, pin: string) => {
    // Validar DNI y PIN contra los usuarios
    // validateUsuario retorna true si existe el usuario, false si no existe
    const usuarioValidado = await validateUsuario(dni, pin)
    
    if (!usuarioValidado) {
      // Si no existe el usuario, mostrar error y no continuar
      setAuthError('DNI o PIN incorrecto')
      return
    }
    
    // Si el usuario existe (retorna true), cerrar el modal de auth y abrir el de incidencia
    setShowAuthModal(false)
    setAuthError('')
    setShowIncidenciaModal(true)
  }

  const handleSubmitIncidencia = async (data: {
    tipo: 'incidencia'
    maquinaDejoFuncionar: boolean
    piezaRota: boolean
    nombrePiezaRota: string
    fechaProgramada: Date
    fechaReporte: Date
    descripcion: string
    prioridad: 'baja' | 'media' | 'alta' | 'urgente'
    usuario?: Usuario
  }) => {
    if (!maquina?.id) return

    try {
      // Construir la descripción completa con toda la información
      let descripcionCompleta = `Reporte de Incidencia\n\n`
      descripcionCompleta += `¿La máquina dejó de funcionar? ${data.maquinaDejoFuncionar ? 'Sí' : 'No'}\n`
      descripcionCompleta += `¿Se rompió alguna pieza? ${data.piezaRota ? 'Sí' : 'No'}\n`
      
      if (data.piezaRota && data.nombrePiezaRota) {
        descripcionCompleta += `Pieza rota: ${data.nombrePiezaRota}\n`
      }
      
      if (data.descripcion) {
        descripcionCompleta += `Descripción adicional:\n${data.descripcion}`
      }
      const incidenciaData = {
        machineId: maquina.id,
        tipo: data.tipo,
        usuario: data.usuario,
        fechaReporte: data.fechaReporte,
        fechaProgramada: data.fechaProgramada,
        descripcion: descripcionCompleta,
        prioridad: data.prioridad,
        maquinaDejoFuncionar: data.maquinaDejoFuncionar,
      }
      
      await createIncidencia(incidenciaData, maquina)
      handleCloseIncidenciaModal()
    } catch (error) {
      console.error('Error al guardar incidencia:', error)
      throw error
    }
  }

  // Mostrar estado de carga o error
  if (isLoading) {
    return (
      <>
        <Head>
          <title>Cargando... - Management Gym</title>
        </Head>
        <main className={styles.main}>
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>Cargando información del equipo...</p>
          </div>
        </main>
      </>
    )
  }

  // Mostrar error si no se pudo cargar la máquina
  if (error || !maquina) {
    return (
      <>
        <Head>
          <title>Error - Management Gym</title>
        </Head>
        <main className={styles.main}>
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              {error || 'No se encontró la máquina con el ID proporcionado'}
            </p>
            <Link href="/equipment" className={styles.backButton} style={{ marginTop: '1rem' }}>
              <FaArrowLeft size={18} />
              <span>Volver a Equipos</span>
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{maquina.name || 'Equipo'} - Management Gym</title>
        <meta name="description" content={`Detalles del equipo ${maquina.name}`} />
      </Head>
      <main className={styles.main}>
        {/* Header con botón de volver */}
        <div className={styles.detailHeader}>
          <Link href="/equipment" className={styles.backButton}>
            <FaArrowLeft size={18} />
            <span>Volver a Equipos</span>
          </Link>
        </div>

        {/* Header principal con nombre y estado */}
        <div className={styles.detailTitleSection}>
          <div className={styles.detailTitleGroup}>
            <h1 className={styles.detailTitle}>{maquina.name || 'Sin nombre'}</h1>
            <div className={styles.detailSubtitle}>
              <span>{maquina.brand || 'N/A'}</span>
              {maquina.brand && maquina.model && <span className={styles.separator}>•</span>}
              <span>{maquina.model || 'N/A'}</span>
            </div>
          </div>
          <div className={styles.detailStatusBadge}>
            <span className={`${styles.statusBadge} ${styles.statusBadgeLarge} ${getStatusClass(maquina.status)}`}>
              {getStatusIcon(maquina.status)}
              <span>{getStatusLabel(maquina.status)}</span>
            </span>
          </div>
        </div>

        {/* Sección de acciones rápidas */}
        <div className={styles.actionButtonsSection}>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleOpenMantenimientoModal}
          >
            <FaTools size={18} />
            <span>Mantenimiento</span>
          </button>
          <button
            className={`${styles.button} ${styles.buttonSubmit}`}
            onClick={handleOpenIncidenciaModal}
          >
            <FaExclamationCircle size={18} />
            <span>Incidencia</span>
          </button>
        </div>

        {/* Grid de información */}
        <div className={styles.detailGrid}>
          {/* Información General */}
          <div className={styles.detailCard}>
            <div className={styles.detailCardHeader}>
              <FaCog size={20} />
              <h2 className={styles.detailCardTitle}>Información General</h2>
            </div>
            <div className={styles.detailCardBody}>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>Nombre</span>
                <span className={styles.detailInfoValue}>{maquina.name || 'N/A'}</span>
              </div>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>Marca</span>
                <span className={styles.detailInfoValue}>{maquina.brand || 'N/A'}</span>
              </div>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>Modelo</span>
                <span className={styles.detailInfoValue}>{maquina.model || 'N/A'}</span>
              </div>
              {maquina.id && (
                <div className={styles.detailInfoRow}>
                  <span className={styles.detailInfoLabel}>ID</span>
                  <span className={styles.detailInfoValueId}>{maquina.id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Información de Ubicación y Fecha */}
          <div className={styles.detailCard}>
            <div className={styles.detailCardHeader}>
              <FaMapMarkerAlt size={20} />
              <h2 className={styles.detailCardTitle}>Ubicación y Fecha</h2>
            </div>
            <div className={styles.detailCardBody}>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>
                  <FaMapMarkerAlt size={14} style={{ marginRight: '0.5rem' }} />
                  Ubicación
                </span>
                <span className={styles.detailInfoValue}>{maquina.location || 'N/A'}</span>
              </div>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>
                  <FaCalendarAlt size={14} style={{ marginRight: '0.5rem' }} />
                  Fecha de Compra
                </span>
                <span className={styles.detailInfoValue}>
                  {maquina.purchaseDate 
                    ? new Date(maquina.purchaseDate).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'N/A'}
                </span>
              </div>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>
                  <FaTag size={14} style={{ marginRight: '0.5rem' }} />
                  Estado
                </span>
                <span className={`${styles.statusBadge} ${getStatusClass(maquina.status)}`}>
                  {getStatusIcon(maquina.status)}
                  <span>{getStatusLabel(maquina.status)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        {maquina.notes && (
          <div className={styles.detailCard}>
            <div className={styles.detailCardHeader}>
              <FaStickyNote size={20} />
              <h2 className={styles.detailCardTitle}>Notas</h2>
            </div>
            <div className={styles.detailCardBody}>
              <p className={styles.detailNotesText}>{maquina.notes}</p>
            </div>
          </div>
        )}

        {/* Calendario de Eventos */}
        {maquina.id && incidencias.length > 0 && (
          <div className={styles.detailCard}>
            <CalendarView
              incidencias={incidencias}
              onSelectEvent={(incidencia) => {
                setSelectedIncidencia(incidencia)
                selectedIncidenciaIdRef.current = incidencia.id || null
                setShowEventoDetailModal(true)
              }}
            />
          </div>
        )}

        {/* Sección de Incidencias */}
        {/* {maquina.id && (
          <IncidenciasSection
            machineId={maquina.id}
            incidencias={incidencias}
            onCreate={async (incidencia) => {
              await createIncidencia(incidencia, maquina)
            }}
            onUpdate={updateIncidencia}
            onDelete={async (id) => {
              if (maquina?.id) {
                await deleteIncidencia(maquina.id, id)
              }
            }}
          />
        )} */}

        {/* Modal de Mantenimiento */}
        <MantenimientoModal
          isOpen={showMantenimientoModal}
          onClose={handleCloseMantenimientoModal}
          usuarios={usuarios}
          onSubmit={handleSubmitMantenimiento}
        />

        {/* Modal de Autenticación */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={handleCloseAuthModal}
          onAccept={handleAuthAccept}
          error={authError}
        />

        {/* Modal de Incidencia */}
        <IncidenciaModal
          isOpen={showIncidenciaModal}
          onClose={handleCloseIncidenciaModal}
          onSubmit={handleSubmitIncidencia}
          usuariosValidate={usuariosValidate}
        />

        {/* Modal de Detalles del Mantenimiento */}
        {selectedIncidencia?.tipo === 'mantenimiento' && (
          <MantenimientoDetailModal
            isOpen={showEventoDetailModal}
            onClose={() => {
              setShowEventoDetailModal(false)
              setSelectedIncidencia(null)
              selectedIncidenciaIdRef.current = null
            }}
            mantenimiento={selectedIncidencia}
            usuarios={usuarios}
            onUpdateTareas={async (tareas, estado) => {
              if (selectedIncidencia?.id && maquina?.id) {
                const updateData: any = { tareas }
                if (estado) {
                  updateData.estado = estado
                }
                await updateIncidencia(maquina.id, selectedIncidencia.id, updateData)
              }
            }}
            onUpdateNotas={async (notas) => {
              if (selectedIncidencia?.id && maquina?.id) {
                await updateIncidencia(maquina.id, selectedIncidencia.id, { notas })
              }
            }}
            onUpdate={async (data) => {
              if (selectedIncidencia?.id && maquina?.id) {
                const updateData: any = {}
                if (data.tecnicoAsignado !== undefined) {
                  updateData.tecnicoAsignado = Object.keys(data.tecnicoAsignado).length > 0 
                    ? data.tecnicoAsignado 
                    : null
                }
                if (data.descripcion !== undefined) {
                  updateData.descripcion = data.descripcion
                }
                if (data.tareas !== undefined) {
                  updateData.tareas = data.tareas
                }
                await updateIncidencia(maquina.id, selectedIncidencia.id, updateData)
              }
            }}
            validateSiEsAdmin={validateSiEsAdmin}
            onDelete={async (id) => {
              if (selectedIncidencia?.id && maquina?.id) {
                await deleteIncidencia(maquina.id, id)
              }
            }}
          />
        )}

        {/* Modal de Detalles de la Incidencia */}
        {selectedIncidencia?.tipo === 'incidencia' && (
          <IncidenciaDetailModal
            isOpen={showEventoDetailModal}
            onClose={() => {
              setShowEventoDetailModal(false)
              setSelectedIncidencia(null)
              selectedIncidenciaIdRef.current = null
            }}
            incidencia={selectedIncidencia}
            onDelete={async (id) => {
              if (selectedIncidencia?.id && maquina?.id) {
                await deleteIncidencia(maquina.id, id)
              }
            }}
          />
        )}
      </main>
    </>
  )
}

export default MaquinaPAge