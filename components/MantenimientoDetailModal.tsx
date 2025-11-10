import React, { useState, useEffect } from 'react'
import { FaTimes, FaClock, FaCheckCircle, FaUser, FaDollarSign, FaTools, FaStickyNote, FaCheckSquare, FaSave, FaPlay, FaLock, FaEdit, FaPlus, FaTrash, FaCog, FaMapMarkerAlt, FaTag, FaCalendarAlt } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { Incidencia, Tarea, Usuario, Machine } from '@/features/types/types'

interface MantenimientoDetailModalProps {
  isOpen: boolean
  onClose: () => void
  mantenimiento: Incidencia | null
  usuarios?: Usuario[]
  onUpdateTareas?: (tareas: Tarea[], estado?: string) => Promise<void>
  onUpdateNotas?: (notas: string) => Promise<void>
  onUpdate?: (data: { tecnicoAsignado?: Usuario | {}, descripcion?: string, tareas?: Tarea[] }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  validateSiEsAdmin?: (dni: string, pin: string) => Promise<boolean>
}

export const MantenimientoDetailModal: React.FC<MantenimientoDetailModalProps> = ({
  isOpen,
  onClose,
  mantenimiento,
  usuarios = [],
  onUpdateTareas,
  onUpdateNotas,
  onUpdate,
  onDelete,
  validateSiEsAdmin
}) => {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [notas, setNotas] = useState<string>('')
  const [isEditingNotas, setIsEditingNotas] = useState(false)
  const [isSavingNotas, setIsSavingNotas] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [descripcionEditada, setDescripcionEditada] = useState<string>('')
  const [tecnicoEditado, setTecnicoEditado] = useState<Usuario | {}>({})
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false)
  const [adminDni, setAdminDni] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [adminAuthError, setAdminAuthError] = useState('')
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [showDeleteAuthModal, setShowDeleteAuthModal] = useState(false)
  const [deleteDni, setDeleteDni] = useState('')
  const [deletePin, setDeletePin] = useState('')
  const [deleteAuthError, setDeleteAuthError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Sincronizar tareas cuando cambia el mantenimiento
  useEffect(() => {
    if (mantenimiento?.tareas) {
      setTareas(mantenimiento.tareas)
    } else {
      setTareas([])
    }
  }, [mantenimiento])

  // Sincronizar descripción cuando cambia el mantenimiento
  useEffect(() => {
    if (mantenimiento?.descripcion !== undefined) {
      setDescripcionEditada(mantenimiento.descripcion || '')
    } else {
      setDescripcionEditada('')
    }
  }, [mantenimiento])

  // Sincronizar técnico cuando cambia el mantenimiento
  useEffect(() => {
    if (mantenimiento?.tecnicoAsignado) {
      setTecnicoEditado(mantenimiento.tecnicoAsignado)
    } else {
      setTecnicoEditado({})
    }
  }, [mantenimiento])

  // Sincronizar notas cuando cambia el mantenimiento
  useEffect(() => {
    if (mantenimiento?.notas !== undefined) {
      setNotas(mantenimiento.notas || '')
    } else {
      setNotas('')
    }
    setIsEditingNotas(false)
  }, [mantenimiento])

  // Resetear estado solo cuando cambia el ID del mantenimiento
  useEffect(() => {
    setHasStarted(false)
    setShowPinModal(false)
    setPin('')
    setPinError('')
    setIsEditing(false)
    setShowAdminAuthModal(false)
    setAdminDni('')
    setAdminPin('')
    setAdminAuthError('')
    setShowDeleteConfirmModal(false)
    setShowDeleteAuthModal(false)
    setDeleteDni('')
    setDeletePin('')
    setDeleteAuthError('')
  }, [mantenimiento?.id])

  if (!isOpen || !mantenimiento) return null

  // Función para calcular el estado basado en las tareas
  const calcularEstado = (tareasList: Tarea[]): string => {
    if (tareasList.length === 0) {
      // Si no hay tareas, mantener el estado actual o devolver pendiente
      return mantenimiento?.estado || 'pendiente'
    }

    const tareasCompletadas = tareasList.filter(t => t.completada).length
    const totalTareas = tareasList.length

    // Si todas las tareas están completadas
    if (tareasCompletadas === totalTareas) {
      return 'completado'
    }

    // Si todas las tareas están pendientes
    if (tareasCompletadas === 0) {
      return 'pendiente'
    }

    // Si hay al menos una completada pero no todas
    return 'en_proceso'
  }

  const handleToggleTarea = async (index: number) => {
    if (!onUpdateTareas || isUpdating) return

    const nuevasTareas = tareas.map((tarea, i) => 
      i === index ? { ...tarea, completada: !tarea.completada } : tarea
    )

    // Calcular el nuevo estado basado en las tareas
    const nuevoEstado = calcularEstado(nuevasTareas)

    // Actualizar estado local inmediatamente para mejor UX
    setTareas(nuevasTareas)
    setIsUpdating(true)

    try {
      await onUpdateTareas(nuevasTareas, nuevoEstado)
    } catch (error) {
      console.error('Error al actualizar tareas:', error)
      // Revertir cambio en caso de error
      setTareas(tareas)
    } finally {
      setIsUpdating(false)
    }
  }

  const getTipoLabel = (subTipo?: string) => {
    if (!subTipo) return 'Mantenimiento'
    const tipos: Record<string, string> = {
      preventivo: 'Mantenimiento Preventivo',
      correctivo: 'Mantenimiento Correctivo',
      cambio_piezas: 'Cambio de Piezas',
      revision: 'Revisión',
      otro: 'Otro'
    }
    return tipos[subTipo] || `Mantenimiento ${subTipo}`
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

  const handleComenzar = () => {
    if (!mantenimiento?.tecnicoAsignado) {
      setPinError('No hay técnico asignado')
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

  const handlePinSubmit = (e: React.FormEvent) => {
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

    if (!mantenimiento?.tecnicoAsignado?.pin) {
      setPinError('No hay PIN configurado para el técnico')
      return
    }

    const pinIngresado = parseInt(pin, 10)
    const pinTecnico = Number(mantenimiento.tecnicoAsignado.pin)

    if (isNaN(pinIngresado)) {
      setPinError('El PIN debe ser numérico')
      return
    }

    if (pinIngresado === pinTecnico) {
      setHasStarted(true)
      setShowPinModal(false)
      setPin('')
      setPinError('')
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

  const handleAddTarea = () => {
    if (nuevaTarea.trim()) {
      const tarea: Tarea = {
        descripcion: nuevaTarea.trim(),
        completada: false
      }
      setTareas(prev => [...prev, tarea])
      setNuevaTarea('')
    }
  }

  const handleRemoveTarea = (index: number) => {
    setTareas(prev => prev.filter((_, i) => i !== index))
  }

  const handleEditTarea = (index: number, nuevaDescripcion: string) => {
    setTareas(prev => prev.map((tarea, i) => 
      i === index ? { ...tarea, descripcion: nuevaDescripcion } : tarea
    ))
  }

  const handleSaveEdit = async () => {
    if (!onUpdate || isSaving) return
    
    // Si hay función de validación, mostrar modal de autenticación primero
    if (validateSiEsAdmin) {
      setShowAdminAuthModal(true)
      setAdminDni('')
      setAdminPin('')
      setAdminAuthError('')
      return
    }
    
    // Si no hay validación, guardar directamente
    await performSave()
  }

  const performSave = async () => {
    if (!onUpdate || isSaving) return
    
    setIsSaving(true)
    try {
      const updateData: { tecnicoAsignado?: Usuario | {}, descripcion?: string, tareas?: Tarea[] } = {}
      
      if (descripcionEditada !== mantenimiento?.descripcion) {
        updateData.descripcion = descripcionEditada
      }
      
      // Comparar técnico por ID o DNI
      const tecnicoActualId = (mantenimiento?.tecnicoAsignado as Usuario)?.id || (mantenimiento?.tecnicoAsignado as Usuario)?.dni || ''
      const tecnicoEditadoId = (tecnicoEditado as Usuario)?.id || (tecnicoEditado as Usuario)?.dni || ''
      
      if (tecnicoEditadoId !== tecnicoActualId) {
        if (Object.keys(tecnicoEditado).length > 0) {
          updateData.tecnicoAsignado = tecnicoEditado
        } else {
          updateData.tecnicoAsignado = {}
        }
      }
      
      if (JSON.stringify(tareas) !== JSON.stringify(mantenimiento?.tareas || [])) {
        updateData.tareas = tareas
      }
      
      if (Object.keys(updateData).length > 0) {
        await onUpdate(updateData)
      }
      
      setIsEditing(false)
      setShowAdminAuthModal(false)
    } catch (error) {
      console.error('Error al guardar cambios:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdminDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Solo permitir números y máximo 8 dígitos
    if (value === '' || (/^\d+$/.test(value) && value.length <= 8)) {
      setAdminDni(value)
      setAdminAuthError('')
    }
  }

  const handleAdminPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Solo permitir números y máximo 4 dígitos
    if (value === '' || (/^\d+$/.test(value) && value.length <= 4)) {
      setAdminPin(value)
      setAdminAuthError('')
    }
  }

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminAuthError('')

    if (!adminDni || adminDni.length === 0) {
      setAdminAuthError('Por favor ingrese su DNI')
      return
    }

    if (adminDni.length !== 8) {
      setAdminAuthError('El DNI debe tener 8 dígitos')
      return
    }

    if (!adminPin || adminPin.length === 0) {
      setAdminAuthError('Por favor ingrese su PIN')
      return
    }

    if (adminPin.length !== 4) {
      setAdminAuthError('El PIN debe tener 4 dígitos')
      return
    }

    if (!validateSiEsAdmin) {
      setAdminAuthError('Error de validación')
      return
    }

    try {
      const esAdmin = await validateSiEsAdmin(adminDni, adminPin)
      
      if (esAdmin) {
        // Si es admin, proceder a guardar
        setShowAdminAuthModal(false)
        await performSave()
      } else {
        setAdminAuthError('Acceso denegado. Solo administradores y desarrolladores pueden editar mantenimientos.')
        setAdminDni('')
        setAdminPin('')
      }
    } catch (error) {
      console.error('Error al validar administrador:', error)
      setAdminAuthError('Error al validar credenciales. Intente nuevamente.')
    }
  }

  const handleCloseAdminAuthModal = () => {
    setShowAdminAuthModal(false)
    setAdminDni('')
    setAdminPin('')
    setAdminAuthError('')
    // No cerrar el modo edición, solo el modal de autenticación
  }

  const handleDeleteClick = () => {
    if (validateSiEsAdmin) {
      setShowDeleteAuthModal(true)
      setDeleteDni('')
      setDeletePin('')
      setDeleteAuthError('')
    } else {
      setShowDeleteConfirmModal(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!onDelete || !mantenimiento?.id || isDeleting) return
    
    setIsDeleting(true)
    try {
      await onDelete(mantenimiento.id)
      setShowDeleteConfirmModal(false)
      onClose()
    } catch (error) {
      console.error('Error al eliminar mantenimiento:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || (/^\d+$/.test(value) && value.length <= 8)) {
      setDeleteDni(value)
      setDeleteAuthError('')
    }
  }

  const handleDeletePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || (/^\d+$/.test(value) && value.length <= 4)) {
      setDeletePin(value)
      setDeleteAuthError('')
    }
  }

  const handleDeleteAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteAuthError('')

    if (!deleteDni || deleteDni.length === 0) {
      setDeleteAuthError('Por favor ingrese su DNI')
      return
    }

    if (deleteDni.length !== 8) {
      setDeleteAuthError('El DNI debe tener 8 dígitos')
      return
    }

    if (!deletePin || deletePin.length === 0) {
      setDeleteAuthError('Por favor ingrese su PIN')
      return
    }

    if (deletePin.length !== 4) {
      setDeleteAuthError('El PIN debe tener 4 dígitos')
      return
    }

    if (!validateSiEsAdmin) {
      setDeleteAuthError('Error de validación')
      return
    }

    try {
      const esAdmin = await validateSiEsAdmin(deleteDni, deletePin)
      
      if (esAdmin) {
        setShowDeleteAuthModal(false)
        setShowDeleteConfirmModal(true)
      } else {
        setDeleteAuthError('Acceso denegado. Solo administradores y desarrolladores pueden eliminar mantenimientos.')
        setDeleteDni('')
        setDeletePin('')
      }
    } catch (error) {
      console.error('Error al validar administrador:', error)
      setDeleteAuthError('Error al validar credenciales. Intente nuevamente.')
    }
  }

  const handleCloseDeleteAuthModal = () => {
    setShowDeleteAuthModal(false)
    setDeleteDni('')
    setDeletePin('')
    setDeleteAuthError('')
  }

  const handleCloseDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false)
  }

  const tareasCompletadas = tareas.filter(t => t.completada).length
  const totalTareas = tareas.length
  const progresoTareas = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0
  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
          {/* Header compacto */}
          <div className={styles.mantenimientoDetailHeader}>
            <div className={styles.mantenimientoDetailHeaderGroup}>
              <div className={styles.mantenimientoDetailIconContainer}>
                <FaTools size={18} />
              </div>
              <div>
                <h3 className={styles.mantenimientoDetailTitle}>
                  {getTipoLabel(mantenimiento.subTipo)}
                </h3>
                <div className={styles.mantenimientoDetailBadges}>
                  <span className={`${styles.statusBadge} ${getEstadoClass(mantenimiento.estado)}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                    {getEstadoLabel(mantenimiento.estado)}
                  </span>
                  <span className={`${styles.priorityBadge} ${getPrioridadClass(mantenimiento.prioridad)}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                    {getPrioridadLabel(mantenimiento.prioridad)}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {!isEditing ? (
                <>
                  {onUpdate && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className={styles.mantenimientoDetailCloseButton}
                      style={{ 
                        backgroundColor: '#3b82f6',
                        color: '#fff'
                      }}
                      aria-label="Editar mantenimiento"
                      title="Editar"
                    >
                      <FaEdit size={18} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      className={styles.mantenimientoDetailCloseButton}
                      style={{ 
                        backgroundColor: '#ef4444',
                        color: '#fff'
                      }}
                      aria-label="Eliminar mantenimiento"
                      title="Eliminar"
                    >
                      <FaTrash size={18} />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className={styles.mantenimientoDetailCloseButton}
                    style={{ 
                      backgroundColor: isSaving ? '#9ca3af' : '#22c55e',
                      color: '#fff'
                    }}
                    aria-label={isSaving ? 'Guardando...' : 'Guardar cambios'}
                    title={isSaving ? 'Guardando...' : 'Guardar'}
                  >
                    <FaSave size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      // Restaurar valores originales
                      if (mantenimiento?.descripcion !== undefined) {
                        setDescripcionEditada(mantenimiento.descripcion || '')
                      }
                      if (mantenimiento?.tecnicoAsignado) {
                        setTecnicoEditado(mantenimiento.tecnicoAsignado)
                      } else {
                        setTecnicoEditado({})
                      }
                      if (mantenimiento?.tareas) {
                        setTareas(mantenimiento.tareas)
                      } else {
                        setTareas([])
                      }
                      setNuevaTarea('')
                    }}
                    className={styles.mantenimientoDetailCloseButton}
                    style={{ 
                      backgroundColor: '#6b7280',
                      color: '#fff'
                    }}
                    aria-label="Cancelar edición"
                    title="Cancelar"
                  >
                    <FaTimes size={18} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className={styles.mantenimientoDetailCloseButton}
                aria-label="Cerrar modal"
              >
                <FaTimes size={18} />
              </button>
            </div>
          </div>

          <div className={styles.mantenimientoDetailBody}>
            {/* Card de Información de la Máquina */}
            {mantenimiento.maquina && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.875rem 1rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                marginBottom: '1.5rem'
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
                  {mantenimiento.maquina.name && (
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
                        {mantenimiento.maquina.name}
                      </span>
                    </div>
                  )}

                  {/* Marca y Modelo */}
                  {(mantenimiento.maquina.brand || mantenimiento.maquina.model) && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      fontSize: '0.8125rem'
                    }}>
                      {mantenimiento.maquina.brand && (
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
                            {mantenimiento.maquina.brand}
                          </span>
                        </>
                      )}
                      {mantenimiento.maquina.brand && mantenimiento.maquina.model && (
                        <span style={{
                          color: '#cbd5e1',
                          margin: '0 0.25rem'
                        }}>
                          •
                        </span>
                      )}
                      {mantenimiento.maquina.model && (
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
                            {mantenimiento.maquina.model}
                          </span>
                        </>
                      )}
                    </div>
                  )}


                  {/* Ubicación */}
                  {mantenimiento.maquina.location && (
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
                        {mantenimiento.maquina.location}
                      </span>
                    </div>
                  )}

                  {/* Estado */}
                  {mantenimiento.maquina.status && (
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
                      <span className={`${styles.statusBadge} ${getStatusClass(mantenimiento.maquina.status)}`} style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        fontWeight: '500'
                      }}>
                        {getStatusLabel(mantenimiento.maquina.status)}
                      </span>
                    </div>
                  )}

                  {/* Fecha de Compra */}
                  {mantenimiento.maquina.purchaseDate && (
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
                        {new Date(mantenimiento.maquina.purchaseDate).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}

                  {/* ID de la máquina */}
                  {mantenimiento.maquina.id && (
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
                        {mantenimiento.maquina.id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grid compacto de información principal */}
            <div className={styles.mantenimientoDetailInfoGrid}>
              {mantenimiento.fechaProgramada && (
                <div className={styles.mantenimientoDetailInfoCard}>
                  <div className={styles.mantenimientoDetailInfoLabel}>
                    <FaClock size={12} style={{ color: '#6b7280' }} />
                    <span className={styles.mantenimientoDetailInfoLabelText}>Programada</span>
                  </div>
                  <p className={styles.mantenimientoDetailInfoValue}>
                    {(() => {
                      const fecha = convertTimestampToDate(mantenimiento.fechaProgramada)
                      if (!fecha) return 'N/A'
                      return fecha.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    })()}
                  </p>
                </div>
              )}

              {mantenimiento.fechaResolucion && (
                <div className={styles.mantenimientoDetailInfoCard}>
                  <div className={styles.mantenimientoDetailInfoLabel}>
                    <FaCheckCircle size={12} style={{ color: '#6b7280' }} />
                    <span className={styles.mantenimientoDetailInfoLabelText}>Resolución</span>
                  </div>
                  <p className={styles.mantenimientoDetailInfoValue}>
                    {(() => {
                      const fecha = convertTimestampToDate(mantenimiento.fechaResolucion)
                      if (!fecha) return 'N/A'
                      return fecha.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    })()}
                  </p>
                </div>
              )}

              {mantenimiento.tecnicoAsignado && !isEditing && (
                <div className={styles.mantenimientoDetailInfoCard}>
                  <div className={styles.mantenimientoDetailInfoLabel}>
                    <FaUser size={12} style={{ color: '#6b7280' }} />
                    <span className={styles.mantenimientoDetailInfoLabelText}>Técnico</span>
                  </div>
                  <p className={styles.mantenimientoDetailInfoValue}>
                    {mantenimiento.tecnicoAsignado.nombres} {mantenimiento.tecnicoAsignado.apellidos}
                  </p>
                </div>
              )}
              {isEditing && (
                <div className={styles.mantenimientoDetailInfoCard} style={{ gridColumn: '1 / -1' }}>
                  <div className={styles.mantenimientoDetailInfoLabel}>
                    <FaUser size={12} style={{ color: '#6b7280' }} />
                    <span className={styles.mantenimientoDetailInfoLabelText}>Técnico</span>
                  </div>
                  <select
                    value={(tecnicoEditado as Usuario)?.dni || (tecnicoEditado as Usuario)?.id || ''}
                    onChange={(e) => {
                      const selectedDniOrId = e.target.value
                      if (!selectedDniOrId) {
                        setTecnicoEditado({})
                      } else {
                        const selectedUsuario = usuarios.find(
                          u => u.dni === selectedDniOrId || u.id === selectedDniOrId
                        )
                        if (selectedUsuario) {
                          setTecnicoEditado(selectedUsuario)
                        }
                      }
                    }}
                    className={styles.select}
                    style={{ marginTop: '0.5rem' }}
                  >
                    <option value="">Seleccione un técnico</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id || usuario.dni} value={usuario.dni || usuario.id || ''}>
                        {usuario.nombres} {usuario.apellidos} {usuario.dni ? `(${usuario.dni})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mantenimiento.costo && mantenimiento.costo > 0 && (
                <div className={styles.mantenimientoDetailInfoCardCost}>
                  <div className={styles.mantenimientoDetailInfoLabel}>
                    <FaDollarSign size={12} style={{ color: '#059669' }} />
                    <span className={styles.mantenimientoDetailInfoLabelTextCost}>Costo</span>
                  </div>
                  <p className={styles.mantenimientoDetailInfoValueCost}>
                    ${mantenimiento.costo.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Descripción compacta */}
            <div className={styles.mantenimientoDetailSection}>
              <h4 className={styles.mantenimientoDetailSectionTitle}>
                Descripción
              </h4>
              {isEditing ? (
                <textarea
                  value={descripcionEditada}
                  onChange={(e) => setDescripcionEditada(e.target.value)}
                  className={styles.textarea}
                  rows={4}
                  placeholder="Describe el mantenimiento..."
                />
              ) : (
                mantenimiento.descripcion && (
                  <p className={styles.mantenimientoDetailDescription}>
                    {mantenimiento.descripcion}
                  </p>
                )
              )}
            </div>

            {/* Checklist de Tareas con progreso */}
            <div className={styles.mantenimientoDetailSection}>
              <div className={styles.mantenimientoDetailTareasHeader}>
                <h4 className={styles.mantenimientoDetailSectionTitleWithIcon}>
                  <FaCheckSquare size={14} />
                  Tareas
                </h4>
                {!isEditing && (
                  <span className={styles.mantenimientoDetailTareasCount}>
                    {tareasCompletadas} / {totalTareas} completadas
                  </span>
                )}
              </div>
              
              {isEditing ? (
                <div style={{ 
                  padding: '0.75rem', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      value={nuevaTarea}
                      onChange={(e) => setNuevaTarea(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTarea()
                        }
                      }}
                      className={styles.input}
                      placeholder="Agregar nueva tarea..."
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTarea}
                      className={`${styles.button} ${styles.buttonSecondary}`}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <FaPlus size={14} />
                      Agregar
                    </button>
                  </div>
                  {tareas.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {tareas.map((tarea, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.75rem',
                            padding: '0.5rem',
                            backgroundColor: '#fff',
                            borderRadius: '0.25rem',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={tarea.completada}
                            onChange={() => {
                              setTareas(prev => prev.map((t, i) => 
                                i === index ? { ...t, completada: !t.completada } : t
                              ))
                            }}
                            style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                          />
                          <input
                            type="text"
                            value={tarea.descripcion}
                            onChange={(e) => handleEditTarea(index, e.target.value)}
                            className={styles.input}
                            style={{ flex: 1, margin: 0 }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTarea(index)}
                            className={styles.removeButton}
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {tareas.length === 0 && (
                    <p style={{ 
                      color: '#6b7280', 
                      fontSize: '0.875rem', 
                      fontStyle: 'italic',
                      textAlign: 'center',
                      padding: '1rem 0'
                    }}>
                      No hay tareas agregadas. Agrega una tarea para comenzar.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {tareas && tareas.length > 0 && (
                    <>
                      {/* Barra de progreso */}
                      <div className={styles.mantenimientoDetailProgressBar}>
                        <div 
                          className={`${styles.mantenimientoDetailProgressFill} ${
                            progresoTareas === 100 
                              ? styles.mantenimientoDetailProgressFillComplete 
                              : styles.mantenimientoDetailProgressFillIncomplete
                          }`}
                          style={{ width: `${progresoTareas}%` }}
                        />
                      </div>

                      <div className={styles.mantenimientoDetailTareasList}>
                        {tareas.map((tarea, index) => (
                          <label
                            key={index} 
                            className={`${styles.mantenimientoDetailTareaItem} ${
                              tarea.completada 
                                ? styles.mantenimientoDetailTareaItemCompleted 
                                : styles.mantenimientoDetailTareaItemPending
                            } ${isUpdating || !hasStarted ? styles.mantenimientoDetailTareaItemDisabled : ''} ${
                              onUpdateTareas && !isUpdating && hasStarted ? '' : styles.mantenimientoDetailTareaItemDisabled
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={tarea.completada}
                              onChange={() => handleToggleTarea(index)}
                              disabled={!onUpdateTareas || isUpdating || !hasStarted}
                              className={`${styles.mantenimientoDetailTareaCheckbox} ${
                                !onUpdateTareas || isUpdating || !hasStarted ? styles.mantenimientoDetailTareaCheckboxDisabled : ''
                              }`}
                            />
                            <span 
                              className={`${styles.mantenimientoDetailTareaText} ${
                                tarea.completada 
                                  ? styles.mantenimientoDetailTareaTextCompleted 
                                  : styles.mantenimientoDetailTareaTextPending
                              }`}
                            >
                              {tarea.descripcion}
                            </span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                  {(!tareas || tareas.length === 0) && (
                    <p style={{ 
                      color: '#6b7280', 
                      fontSize: '0.875rem', 
                      fontStyle: 'italic',
                      textAlign: 'center',
                      padding: '1rem 0'
                    }}>
                      No hay tareas asignadas.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Piezas Reemplazadas compactas */}
            {mantenimiento.piezasReemplazadas && mantenimiento.piezasReemplazadas.length > 0 && (
              <div className={styles.mantenimientoDetailSection}>
                <h4 className={styles.mantenimientoDetailSectionTitleWithIcon}>
                  <FaTools size={14} />
                  Piezas Reemplazadas
                </h4>
                <div className={styles.mantenimientoDetailPiezasList}>
                  {mantenimiento.piezasReemplazadas.map((pieza, index) => (
                    <div 
                      key={index}
                      className={styles.mantenimientoDetailPiezaItem}
                    >
                      <div className={styles.mantenimientoDetailPiezaInfo}>
                        <span className={styles.mantenimientoDetailPiezaNombre}>
                          {pieza.nombre}
                        </span>
                        <span className={styles.mantenimientoDetailPiezaCantidad}>
                          x{pieza.cantidad}
                        </span>
                        {pieza.descripcion && (
                          <span className={styles.mantenimientoDetailPiezaDescripcion}>
                            • {pieza.descripcion}
                          </span>
                        )}
                      </div>
                      {pieza.costo && pieza.costo > 0 && (
                        <span className={styles.mantenimientoDetailPiezaCosto}>
                          ${pieza.costo.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas editables - Siempre visible pero disabled hasta validar PIN */}
            <div>
              <div className={styles.mantenimientoDetailNotasHeader}>
                <h4 className={styles.mantenimientoDetailSectionTitleWithIcon}>
                  <FaStickyNote size={14} />
                  Notas
                </h4>
                {isEditingNotas && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!onUpdateNotas || isSavingNotas) return
                      setIsSavingNotas(true)
                      try {
                        await onUpdateNotas(notas)
                        setIsEditingNotas(false)
                      } catch (error) {
                        console.error('Error al guardar notas:', error)
                      } finally {
                        setIsSavingNotas(false)
                      }
                    }}
                    disabled={isSavingNotas}
                    className={styles.mantenimientoDetailSaveButton}
                  >
                    <FaSave size={12} />
                    {isSavingNotas ? 'Guardando...' : 'Guardar'}
                  </button>
                )}
              </div>
              {isEditingNotas ? (
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className={styles.mantenimientoDetailNotasTextarea}
                  placeholder="Escribe tus notas aquí..."
                  disabled={!hasStarted}
                />
              ) : (
                <div className={styles.mantenimientoDetailNotasContainer}>
                  <p 
                    onClick={() => {
                      if (onUpdateNotas && hasStarted) {
                        setIsEditingNotas(true)
                      }
                    }}
                    className={`${styles.mantenimientoDetailNotasParagraph} ${
                      notas 
                        ? styles.mantenimientoDetailNotasParagraphFilled 
                        : styles.mantenimientoDetailNotasParagraphEmpty
                    } ${
                      onUpdateNotas && hasStarted
                        ? styles.mantenimientoDetailNotasParagraphEditable 
                        : styles.mantenimientoDetailNotasParagraphNotEditable
                    }`}
                  >
                    {notas || (onUpdateNotas && hasStarted ? 'Haz clic para agregar notas...' : 'Sin notas')}
                  </p>
                </div>
              )}
            </div>

            {/* Botón Comenzar - Solo se muestra si no se ha comenzado y no está en modo edición */}
            {!hasStarted && !isEditing && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: '1rem 0',
                borderTop: '1px solid #e5e7eb',
                marginTop: '1rem'
              }}>
                <button
                  type="button"
                  onClick={handleComenzar}
                  className={styles.button}
                  style={{
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    padding: '0.5rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <FaPlay size={14} />
                  Comenzar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de PIN */}
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
                    Ingrese su PIN de técnico
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
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonSubmit} ${styles.modalButton}`}
                  >
                    Validar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Autenticación de Administrador */}
      {showAdminAuthModal && (
        <div className={styles.modalOverlay} onClick={handleCloseAdminAuthModal} style={{ zIndex: 2000 }}>
          <div 
            className={styles.modalContent} 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px' }}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <FaLock size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Validar Administrador
              </h3>
              <button
                type="button"
                onClick={handleCloseAdminAuthModal}
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleAdminAuthSubmit}>
                <div className={styles.formField}>
                  <label className={styles.label}>
                    DNI
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={adminDni}
                    onChange={handleAdminDniChange}
                    className={styles.input}
                    placeholder="Ingrese su DNI (8 dígitos)"
                    autoFocus
                    maxLength={8}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>
                    PIN de Seguridad
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={adminPin}
                    onChange={handleAdminPinChange}
                    className={styles.input}
                    placeholder="Ingrese su PIN (4 dígitos)"
                    maxLength={4}
                  />
                  {adminAuthError && (
                    <p style={{ 
                      margin: '0.5rem 0 0 0', 
                      fontSize: '0.875rem', 
                      color: '#ef4444', 
                      fontWeight: 500 
                    }}>
                      {adminAuthError}
                    </p>
                  )}
                </div>
                <div className={styles.modalButtonGroup}>
                  <button
                    type="button"
                    onClick={handleCloseAdminAuthModal}
                    className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonSubmit} ${styles.modalButton}`}
                  >
                    Validar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Autenticación para Eliminar */}
      {showDeleteAuthModal && (
        <div className={styles.modalOverlay} onClick={handleCloseDeleteAuthModal} style={{ zIndex: 2000 }}>
          <div 
            className={styles.modalContent} 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px' }}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <FaLock size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Validar Administrador
              </h3>
              <button
                type="button"
                onClick={handleCloseDeleteAuthModal}
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleDeleteAuthSubmit}>
                <div className={styles.formField}>
                  <label className={styles.label}>
                    DNI
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={deleteDni}
                    onChange={handleDeleteDniChange}
                    className={styles.input}
                    placeholder="Ingrese su DNI (8 dígitos)"
                    autoFocus
                    maxLength={8}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>
                    PIN de Seguridad
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={deletePin}
                    onChange={handleDeletePinChange}
                    className={styles.input}
                    placeholder="Ingrese su PIN (4 dígitos)"
                    maxLength={4}
                  />
                  {deleteAuthError && (
                    <p style={{ 
                      margin: '0.5rem 0 0 0', 
                      fontSize: '0.875rem', 
                      color: '#ef4444', 
                      fontWeight: 500 
                    }}>
                      {deleteAuthError}
                    </p>
                  )}
                </div>
                <div className={styles.modalButtonGroup}>
                  <button
                    type="button"
                    onClick={handleCloseDeleteAuthModal}
                    className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonSubmit} ${styles.modalButton}`}
                  >
                    Validar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar */}
      {showDeleteConfirmModal && (
        <div className={styles.modalOverlay} onClick={handleCloseDeleteConfirmModal} style={{ zIndex: 2000 }}>
          <div 
            className={styles.modalContent} 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px' }}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <FaTrash size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle', color: '#ef4444' }} />
                Confirmar Eliminación
              </h3>
              <button
                type="button"
                onClick={handleCloseDeleteConfirmModal}
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ 
                margin: '0 0 1.5rem 0', 
                fontSize: '1rem', 
                color: '#374151',
                lineHeight: '1.5'
              }}>
                ¿Está seguro de que desea eliminar este mantenimiento? Esta acción no se puede deshacer.
              </p>
              <div className={styles.modalButtonGroup}>
                <button
                  type="button"
                  onClick={handleCloseDeleteConfirmModal}
                  className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton}`}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className={`${styles.button} ${styles.modalButton}`}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff'
                  }}
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

