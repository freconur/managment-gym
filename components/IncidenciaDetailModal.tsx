import React, { useState } from 'react'
import { FaTimes, FaClock, FaExclamationCircle, FaStickyNote, FaCalendarAlt, FaInfoCircle, FaUser, FaIdCard, FaTrash, FaLock, FaCog, FaMapMarkerAlt, FaTag, FaCamera, FaTools } from 'react-icons/fa'
import styles from '@/styles/IncidenciaDetailModal.module.css'
import { Incidencia, Machine } from '@/features/types/types'
import { useEscapeKey } from '@/features/hooks/useEscapeKey'

interface IncidenciaDetailModalProps {
  isOpen: boolean
  onClose: () => void
  incidencia: Incidencia | null
  onDelete?: (id: string) => Promise<void>
  onCreateMaintenance?: () => void
}

export const IncidenciaDetailModal: React.FC<IncidenciaDetailModalProps> = ({
  isOpen,
  onClose,
  incidencia,
  onDelete,
  onCreateMaintenance
}) => {
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEscapeKey(() => {
    if (showPinModal) {
      handleClosePinModal()
      return
    }
    onClose()
  }, isOpen)

  if (!isOpen || !incidencia) return null

  const handleDeleteClick = () => {
    setShowPinModal(true)
    setPin('')

    if (!incidencia.usuario?.pin) {
      setPinError('No hay PIN configurado para el usuario que reportó esta incidencia')
    } else {
      setPinError('')
    }
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
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
      case 'active': return 'Activo'
      case 'maintenance': return 'En Mantenimiento'
      case 'inactive': return 'Inactivo'
      default: return 'N/A'
    }
  }

  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'active': return styles.statusActive
      case 'maintenance': return styles.statusMaintenance
      case 'inactive': return styles.statusInactive
      default: return ''
    }
  }

  const convertTimestampToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null
    if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate()
    if (timestamp instanceof Date) return timestamp
    if (typeof timestamp === 'object' && timestamp.seconds) return new Date(timestamp.seconds * 1000)
    try { return new Date(timestamp) } catch { return null }
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
          <div className={styles.modalActions}>
            {onCreateMaintenance && (
              <button
                type="button"
                onClick={onCreateMaintenance}
                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                aria-label="Crear Mantenimiento"
                title="Crear Mantenimiento"
              >
                <FaTools size={18} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
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
          {/* Card de Información del Usuario */}
          {incidencia.usuario && incidencia.usuario.dni && (
            <div className={styles.infoCard}>
              <div className={styles.userInfoGrid}>
                <div className={styles.userInfoItem}>
                  <FaUser size={14} className={styles.headerIconBlue} />
                  <span>Usuario:</span>
                </div>

                {(incidencia.usuario.nombres || incidencia.usuario.apellidos) && (
                  <>
                    <div className={styles.userDniContainer}>
                      <span className={styles.userName}>
                        {incidencia.usuario.nombres || ''} {incidencia.usuario.apellidos || ''}
                      </span>
                    </div>
                    <div className={styles.separator} />
                  </>
                )}

                {incidencia.usuario.dni && (
                  <>
                    <div className={styles.userDniContainer}>
                      <FaIdCard size={12} style={{ color: '#64748b' }} />
                      <span className={styles.userDni}>
                        {incidencia.usuario.dni}
                      </span>
                    </div>
                    {incidencia.usuario.rol && (
                      <div className={styles.separator} />
                    )}
                  </>
                )}

                {incidencia.usuario.rol && (
                  <div className={styles.userDniContainer}>
                    <span className={styles.userRole}>
                      {incidencia.usuario.rol}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card de Información de la Máquina */}
          {incidencia.maquina && (
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <FaCog size={14} className={styles.headerIconBlue} />
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
                  <div className={styles.infoRow}>
                    <FaMapMarkerAlt size={12} className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Ubicación:</span>
                    <span className={styles.infoValue}>{incidencia.maquina.location}</span>
                  </div>
                )}

                {/* Estado */}
                {incidencia.maquina.status && (
                  <div className={styles.infoRow}>
                    <FaTag size={12} className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Estado:</span>
                    <span className={`${styles.statusBadge} ${getStatusClass(incidencia.maquina.status)}`}>
                      {getStatusLabel(incidencia.maquina.status)}
                    </span>
                  </div>
                )}

                {/* Fecha de Compra */}
                {incidencia.maquina.purchaseDate && (
                  <div className={styles.infoRow}>
                    <FaCalendarAlt size={12} className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Compra:</span>
                    <span className={styles.infoValue}>
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
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>ID:</span>
                    <span className={styles.machineIdBadge}>
                      {incidencia.maquina.id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card de Descripción */}
          {incidencia.descripcion && (
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <FaInfoCircle size={14} className={styles.headerIconBlue} />
                Descripción
              </div>
              <div className={styles.descriptionList}>
                {(() => {
                  const lines = incidencia.descripcion.split('\n')
                  const items: JSX.Element[] = []
                  let processedIndex = -1

                  lines.forEach((line, index) => {
                    if (index <= processedIndex || !line.trim()) return

                    // Detectar preguntas
                    if (line.includes('¿') && line.includes('?')) {
                      const parts = line.split('?')
                      const pregunta = parts[0] + '?'
                      const respuesta = parts.slice(1).join('?').trim()

                      items.push(
                        <div key={index} className={styles.questionRow}>
                          <span className={styles.questionText}>{pregunta}</span>
                          <span className={styles.answerBadge}>{respuesta || 'N/A'}</span>
                        </div>
                      )
                    }
                    // Detectar "Descripción adicional:"
                    else if (line.trim() === 'Descripción adicional:' || line.startsWith('Descripción adicional:')) {
                      const parts = line.split(':')
                      const etiqueta = parts[0] + ':'
                      let valor = parts.slice(1).join(':').trim()

                      if (!valor && index + 1 < lines.length) {
                        const siguienteLinea = lines[index + 1]?.trim()
                        if (siguienteLinea) {
                          valor = siguienteLinea
                          processedIndex = index + 1
                        }
                      }

                      if (valor) {
                        items.push(
                          <div key={index} className={styles.additionalInfoContainer}>
                            <span className={styles.questionText}>{etiqueta}</span>
                            <div className={styles.additionalInfoBox}>
                              {valor}
                            </div>
                          </div>
                        )
                      }
                    }
                    // Detectar otras etiquetas
                    else if (line.includes(':') && !line.startsWith('Reporte de')) {
                      const parts = line.split(':')
                      const etiqueta = parts[0] + ':'
                      const valor = parts.slice(1).join(':').trim()

                      if (valor) {
                        items.push(
                          <div key={index} className={styles.questionRow}>
                            <span className={styles.questionText}>{etiqueta}</span>
                            <span className={styles.infoValueBold}>{valor}</span>
                          </div>
                        )
                      }
                    }
                    // Texto largo
                    else if (line.trim() && !line.includes('Reporte de') && line.length > 30 && !line.includes('¿') && !line.includes(':')) {
                      items.push(
                        <div key={index} className={styles.additionalInfoBox}>
                          {line}
                        </div>
                      )
                    }
                  })

                  return items.length > 0 ? items : (
                    <div className={styles.infoValue} style={{ whiteSpace: 'pre-wrap' }}>
                      {incidencia.descripcion}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Card de Evidencia (Foto) */}
          {incidencia.fotoUrl && (
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <FaCamera size={14} className={styles.headerIconBlue} />
                Evidencia Fotográfica
              </div>
              <div className={styles.evidenceImageContainer}>
                <a href={incidencia.fotoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', maxWidth: '100%' }}>
                  <img
                    src={incidencia.fotoUrl}
                    alt="Evidencia de la incidencia"
                    className={styles.evidenceImage}
                  />
                </a>
              </div>
              <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                <a
                  href={incidencia.fotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}
                >
                  Ver imagen en tamaño completo
                </a>
              </div>
            </div>
          )}

          {/* Card de Fecha de Registro */}
          {incidencia.createdAt && (
            <div className={styles.infoCard}>
              <div className={styles.infoRow}>
                <FaClock size={14} className={styles.headerIconBlue} />
                <span className={styles.infoLabel} style={{ minWidth: 'auto' }}>Registrado:</span>
                <span className={styles.infoValue}>
                  {(() => {
                    const fechaRegistro = convertTimestampToDate(incidencia.fechaProgramada) // Using fechaProgramada as per original code logic usually, or createdAt? Original used fechaProgramada in the block.
                    if (!fechaRegistro) return 'N/A'
                    return fechaRegistro.toLocaleString('es-ES', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })
                  })()}
                </span>
              </div>
            </div>
          )}

          {/* Card de Notas Adicionales */}
          {incidencia.notas && (
            <div className={styles.infoCard} style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
              <div className={styles.infoCardHeader} style={{ color: '#111827', fontSize: '1rem' }}>
                <FaStickyNote size={18} style={{ marginRight: '0.5rem', color: '#f59e0b' }} />
                Notas Adicionales
              </div>
              <div className={styles.additionalInfoBox} style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#374151' }}>
                {incidencia.notas}
              </div>
            </div>
          )}


          {/* Botón de Cerrar Footer */}
          <div className={styles.modalButtonGroup} style={{ justifyContent: 'flex-end', borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className={`${styles.button} ${styles.buttonSubmit} ${styles.modalButton}`}
              style={{ minWidth: '120px' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Validación de PIN */}
      {
        showPinModal && (
          <div className={styles.modalOverlay} onClick={handleClosePinModal} style={{ zIndex: 2000 }}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
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
                      name="incident_pin_delete"
                      autoComplete="new-password"
                      data-lpignore="true"
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
                      <p className={styles.dangerMessage}>
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
        )
      }
    </div >
  )
}

