import React, { useState } from 'react'
import { FaTimes, FaClock, FaExclamationCircle, FaStickyNote, FaCalendarAlt, FaInfoCircle, FaUser, FaIdCard, FaTrash, FaLock, FaCog, FaMapMarkerAlt, FaTag } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { Incidencia, Machine } from '@/features/types/types'

interface IncidenciaDetailModalProps {
  isOpen: boolean
  onClose: () => void
  incidencia: Incidencia | null
  onDelete?: (id: string) => Promise<void>
}

export const IncidenciaDetailModal: React.FC<IncidenciaDetailModalProps> = ({
  isOpen,
  onClose,
  incidencia,
  onDelete
}) => {
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen || !incidencia) return null

  const handleDeleteClick = () => {
    if (!incidencia.usuario?.pin) {
      setPinError('No hay PIN configurado para el usuario que reportó esta incidencia')
      return
    }
    setShowPinModal(true)
    setPin('')
    setPinError('')
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Solo permitir números y máximo 4 dígitos
    if (value === '' || (/^\d+$/.test(value) && value.length <= 4)) {
      setPin(value)
      setPinError('')
    }
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError('')

    if (!pin || pin.length === 0) {
      setPinError('Por favor ingrese su PIN')
      return
    }

    if (pin.length !== 4) {
      setPinError('El PIN debe tener 4 dígitos')
      return
    }

    if (!incidencia.usuario?.pin) {
      setPinError('No hay PIN configurado para el usuario')
      return
    }

    const pinIngresado = parseInt(pin, 10)
    const pinUsuario = Number(incidencia.usuario.pin)

    if (isNaN(pinIngresado)) {
      setPinError('El PIN debe ser numérico')
      return
    }

    if (pinIngresado === pinUsuario) {
      // PIN correcto, proceder a eliminar
      setIsDeleting(true)
      try {
        if (onDelete && incidencia.id) {
          await onDelete(incidencia.id)
          setShowPinModal(false)
          onClose()
        }
      } catch (error) {
        console.error('Error al eliminar incidencia:', error)
        setPinError('Error al eliminar la incidencia. Intente nuevamente.')
      } finally {
        setIsDeleting(false)
      }
    } else {
      setPinError('PIN incorrecto. Intente nuevamente.')
      setPin('')
    }
  }

  const handleClosePinModal = () => {
    setShowPinModal(false)
    setPin('')
    setPinError('')
  }

  const getEstadoLabel = (estado?: string) => {
    if (!estado) return 'Sin estado'
    const estados: Record<string, string> = {
      pendiente: 'Pendiente',
      en_proceso: 'En Proceso',
      completado: 'Completado',
      cancelado: 'Cancelado'
    }
    return estados[estado] || estado
  }

  const getPrioridadLabel = (prioridad: string) => {
    const prioridades: Record<string, string> = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
      urgente: 'Urgente'
    }
    return prioridades[prioridad] || prioridad
  }

  const getPrioridadClass = (prioridad: string) => {
    const classes: Record<string, string> = {
      baja: styles.priorityLow,
      media: styles.priorityMedium,
      alta: styles.priorityHigh,
      urgente: styles.priorityUrgent
    }
    return classes[prioridad] || ''
  }

  const getEstadoClass = (estado?: string) => {
    if (!estado) return ''
    const classes: Record<string, string> = {
      pendiente: styles.statusPending,
      en_proceso: styles.statusInProcess,
      completado: styles.statusCompleted,
      cancelado: styles.statusCancelled
    }
    return classes[estado] || ''
  }

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

  // Función para convertir Timestamp de Firebase a Date
  const convertTimestampToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null
    
    // Si es un Timestamp de Firebase con método toDate
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate()
    }
    
    // Si ya es un Date
    if (timestamp instanceof Date) {
      return timestamp
    }
    
    // Si es un objeto con seconds (formato Firestore)
    if (typeof timestamp === 'object' && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000)
    }
    
    // Intentar convertir directamente
    try {
      return new Date(timestamp)
    } catch {
      return null
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <FaExclamationCircle size={20} style={{ color: '#ef4444' }} />
            <h3 className={styles.modalTitle}>
              Detalles de la Incidencia
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className={styles.modalCloseButton}
                style={{ 
                  backgroundColor: '#ef4444',
                  color: '#fff'
                }}
                aria-label="Eliminar incidencia"
                title="Eliminar"
              >
                <FaTrash size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={styles.modalCloseButton}
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          {/* <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '2rem', 
            flexWrap: 'wrap',
            alignItems: 'center',
            paddingBottom: '1.5rem',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <span className={`${styles.statusBadge} ${getEstadoClass(incidencia.estado)}`} style={{
              fontSize: '0.875rem',
              padding: '0.5rem 1rem',
              fontWeight: '600'
            }}>
              {getEstadoLabel(incidencia.estado)}
            </span>
            <span className={`${styles.priorityBadge} ${getPrioridadClass(incidencia.prioridad)}`} style={{
              fontSize: '0.875rem',
              padding: '0.5rem 1rem',
              fontWeight: '600'
            }}>
              {getPrioridadLabel(incidencia.prioridad)}
            </span>
          </div> */}

          {/* Sección de Información Principal */}
          <div style={{ 
            display: 'grid', 
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Card de Información del Usuario */}
            {incidencia.usuario && incidencia.usuario.dni && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.875rem 1rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#475569',
                    fontSize: '0.8125rem',
                    fontWeight: '600'
                  }}>
                    <FaUser size={14} style={{ color: '#3b82f6' }} />
                    <span>Usuario:</span>
                  </div>
                  
                  {(incidencia.usuario.nombres || incidencia.usuario.apellidos) && (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}>
                        <span style={{
                          color: '#64748b',
                          fontSize: '0.8125rem'
                        }}>
                          {incidencia.usuario.nombres || ''} {incidencia.usuario.apellidos || ''}
                        </span>
                      </div>
                      <div style={{
                        width: '1px',
                        height: '16px',
                        backgroundColor: '#cbd5e1'
                      }} />
                    </>
                  )}
                  
                  {incidencia.usuario.dni && (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}>
                        <FaIdCard size={12} style={{ color: '#64748b' }} />
                        <span style={{
                          color: '#475569',
                          fontSize: '0.8125rem',
                          fontWeight: '500'
                        }}>
                          {incidencia.usuario.dni}
                        </span>
                      </div>
                      {incidencia.usuario.rol && (
                        <div style={{
                          width: '1px',
                          height: '16px',
                          backgroundColor: '#cbd5e1'
                        }} />
                      )}
                    </>
                  )}
                  
                  {incidencia.usuario.rol && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      <span style={{
                        color: '#64748b',
                        fontSize: '0.75rem',
                        backgroundColor: '#e2e8f0',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontWeight: '500'
                      }}>
                        {incidencia.usuario.rol}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card de Información de la Máquina */}
            {incidencia.maquina && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.875rem 1rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                  color: '#475569',
                  fontSize: '0.8125rem',
                  fontWeight: '600'
                }}>
                  <FaCog size={14} style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                  Información de la Máquina
                </div>
                <div style={{
                  display: 'grid',
                  gap: '0.75rem'
                }}>
                  {/* Nombre de la máquina */}
                  {incidencia.maquina.name && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem'
                    }}>
                      <span style={{
                        color: '#64748b',
                        fontWeight: '500',
                        minWidth: '80px'
                      }}>
                        Nombre:
                      </span>
                      <span style={{
                        color: '#475569',
                        fontWeight: '600'
                      }}>
                        {incidencia.maquina.name}
                      </span>
                    </div>
                  )}

                  {/* Marca y Modelo */}
                  {(incidencia.maquina.brand || incidencia.maquina.model) && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      fontSize: '0.8125rem'
                    }}>
                      {incidencia.maquina.brand && (
                        <>
                          <span style={{
                            color: '#64748b',
                            fontWeight: '500',
                            minWidth: '80px'
                          }}>
                            Marca:
                          </span>
                          <span style={{
                            color: '#475569',
                            fontWeight: '500'
                          }}>
                            {incidencia.maquina.brand}
                          </span>
                        </>
                      )}
                      {incidencia.maquina.brand && incidencia.maquina.model && (
                        <span style={{
                          color: '#cbd5e1',
                          margin: '0 0.25rem'
                        }}>
                          •
                        </span>
                      )}
                      {incidencia.maquina.model && (
                        <>
                          <span style={{
                            color: '#64748b',
                            fontWeight: '500'
                          }}>
                            Modelo:
                          </span>
                          <span style={{
                            color: '#475569',
                            fontWeight: '500'
                          }}>
                            {incidencia.maquina.model}
                          </span>
                        </>
                      )}
                    </div>
                  )}


                  {/* Ubicación */}
                  {incidencia.maquina.location && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem'
                    }}>
                      <FaMapMarkerAlt size={12} style={{ color: '#64748b' }} />
                      <span style={{
                        color: '#64748b',
                        fontWeight: '500',
                        minWidth: '80px'
                      }}>
                        Ubicación:
                      </span>
                      <span style={{
                        color: '#475569',
                        fontWeight: '500'
                      }}>
                        {incidencia.maquina.location}
                      </span>
                    </div>
                  )}

                  {/* Estado */}
                  {incidencia.maquina.status && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem'
                    }}>
                      <FaTag size={12} style={{ color: '#64748b' }} />
                      <span style={{
                        color: '#64748b',
                        fontWeight: '500',
                        minWidth: '80px'
                      }}>
                        Estado:
                      </span>
                      <span className={`${styles.statusBadge} ${getStatusClass(incidencia.maquina.status)}`} style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        fontWeight: '500'
                      }}>
                        {getStatusLabel(incidencia.maquina.status)}
                      </span>
                    </div>
                  )}

                  {/* Fecha de Compra */}
                  {incidencia.maquina.purchaseDate && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem'
                    }}>
                      <FaCalendarAlt size={12} style={{ color: '#64748b' }} />
                      <span style={{
                        color: '#64748b',
                        fontWeight: '500',
                        minWidth: '80px'
                      }}>
                        Compra:
                      </span>
                      <span style={{
                        color: '#475569',
                        fontWeight: '500'
                      }}>
                        {new Date(incidencia.maquina.purchaseDate).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}

                  {/* ID de la máquina */}
                  {incidencia.maquina.id && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem'
                    }}>
                      <span style={{
                        color: '#64748b',
                        fontWeight: '500',
                        minWidth: '80px'
                      }}>
                        ID:
                      </span>
                      <span style={{
                        color: '#475569',
                        fontWeight: '500',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        backgroundColor: '#e2e8f0',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem'
                      }}>
                        {incidencia.maquina.id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card de Descripción */}
            {incidencia.descripcion && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.875rem 1rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                  color: '#475569',
                  fontSize: '0.8125rem',
                  fontWeight: '600'
                }}>
                  <FaInfoCircle size={14} style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                  Descripción
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem'
                }}>
                  {(() => {
                    const lines = incidencia.descripcion.split('\n')
                    const items: JSX.Element[] = []
                    let processedIndex = -1
                    
                    lines.forEach((line, index) => {
                      // Saltar líneas ya procesadas o vacías
                      if (index <= processedIndex || !line.trim()) return
                      
                      // Detectar preguntas
                      if (line.includes('¿') && line.includes('?')) {
                        const parts = line.split('?')
                        const pregunta = parts[0] + '?'
                        const respuesta = parts.slice(1).join('?').trim()
                        
                        items.push(
                          <div key={index} style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.8125rem'
                          }}>
                            <span style={{
                              color: '#64748b',
                              fontWeight: '500'
                            }}>
                              {pregunta}
                            </span>
                            <span style={{
                              color: '#475569',
                              fontWeight: '600',
                              backgroundColor: '#e2e8f0',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '0.25rem'
                            }}>
                              {respuesta || 'N/A'}
                            </span>
                          </div>
                        )
                      }
                      // Detectar "Descripción adicional:" que puede tener el contenido en la siguiente línea
                      else if (line.trim() === 'Descripción adicional:' || line.startsWith('Descripción adicional:')) {
                        const parts = line.split(':')
                        const etiqueta = parts[0] + ':'
                        let valor = parts.slice(1).join(':').trim()
                        
                        // Si no hay valor en la misma línea, buscar en las siguientes líneas
                        if (!valor && index + 1 < lines.length) {
                          const siguienteLinea = lines[index + 1]?.trim()
                          if (siguienteLinea) {
                            valor = siguienteLinea
                            processedIndex = index + 1
                          }
                        }
                        
                        if (valor) {
                          items.push(
                            <div key={index} style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.375rem',
                              fontSize: '0.8125rem'
                            }}>
                              <span style={{
                                color: '#64748b',
                                fontWeight: '500'
                              }}>
                                {etiqueta}
                              </span>
                              <div style={{
                                padding: '0.625rem',
                                backgroundColor: '#ffffff',
                                borderRadius: '0.375rem',
                                border: '1px solid #e2e8f0',
                                color: '#475569',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {valor}
                              </div>
                            </div>
                          )
                        }
                      }
                      // Detectar otras etiquetas con dos puntos (ej: "Pieza rota:", "Fecha de reporte:")
                      else if (line.includes(':') && !line.startsWith('Reporte de')) {
                        const parts = line.split(':')
                        const etiqueta = parts[0] + ':'
                        const valor = parts.slice(1).join(':').trim()
                        
                        if (valor) {
                          items.push(
                            <div key={index} style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.8125rem'
                            }}>
                              <span style={{
                                color: '#64748b',
                                fontWeight: '500'
                              }}>
                                {etiqueta}
                              </span>
                              <span style={{
                                color: '#475569',
                                fontWeight: '500'
                              }}>
                                {valor}
                              </span>
                            </div>
                          )
                        }
                      }
                      // Texto largo que no coincide con ningún patrón anterior
                      else if (line.trim() && !line.includes('Reporte de') && line.length > 30 && !line.includes('¿') && !line.includes(':')) {
                        items.push(
                          <div key={index} style={{
                            padding: '0.625rem',
                            backgroundColor: '#ffffff',
                            borderRadius: '0.375rem',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.8125rem',
                            color: '#475569',
                            lineHeight: '1.5',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {line}
                          </div>
                        )
                      }
                    })
                    
                    return items.length > 0 ? items : (
                      <div style={{
                        fontSize: '0.8125rem',
                        color: '#64748b',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5'
                      }}>
                        {incidencia.descripcion}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Card de Fecha de Registro */}
            {incidencia.createdAt && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.875rem 1rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#475569',
                  fontSize: '0.8125rem',
                  fontWeight: '500'
                }}>
                  <FaClock size={14} style={{ color: '#3b82f6' }} />
                  <span style={{ fontWeight: '600' }}>Registrado:</span>
                  <span>
                    {(() => {
                      const fechaRegistro = convertTimestampToDate(incidencia.fechaProgramada)
                      if (!fechaRegistro) return 'N/A'
                      return fechaRegistro.toLocaleString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* Card de Notas Adicionales */}
            {incidencia.notas && (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  color: '#111827',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}>
                  <FaStickyNote size={18} style={{ marginRight: '0.5rem', color: '#f59e0b' }} />
                  Notas Adicionales
                </div>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.7',
                  color: '#374151',
                  fontSize: '0.9375rem'
                }}>
                  {incidencia.notas}
                </div>
              </div>
            )}
          </div>

          {/* Botón de Cerrar */}
          <div className={styles.modalButtonGroup} style={{ 
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '2px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              className={`${styles.button} ${styles.buttonPrimary} ${styles.modalButton}`}
              style={{
                minWidth: '120px'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Validación de PIN */}
      {showPinModal && (
        <div className={styles.modalOverlay} onClick={handleClosePinModal} style={{ zIndex: 2000 }}>
          <div 
            className={styles.modalContent} 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px' }}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <FaLock size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Validar PIN
              </h3>
              <button
                type="button"
                onClick={handleClosePinModal}
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handlePinSubmit}>
                <div className={styles.formField}>
                  <label className={styles.label}>
                    Ingrese el PIN del usuario que reportó esta incidencia
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={handlePinChange}
                    className={styles.input}
                    placeholder="Ingrese su PIN (4 dígitos)"
                    autoFocus
                    maxLength={4}
                    disabled={isDeleting}
                  />
                  {pinError && (
                    <p style={{ 
                      margin: '0.5rem 0 0 0', 
                      fontSize: '0.875rem', 
                      color: '#ef4444', 
                      fontWeight: 500 
                    }}>
                      {pinError}
                    </p>
                  )}
                </div>
                <div className={styles.modalButtonGroup}>
                  <button
                    type="button"
                    onClick={handleClosePinModal}
                    className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton}`}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonSubmit} ${styles.modalButton}`}
                    disabled={isDeleting}
                    style={{
                      backgroundColor: isDeleting ? '#9ca3af' : '#ef4444'
                    }}
                  >
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

