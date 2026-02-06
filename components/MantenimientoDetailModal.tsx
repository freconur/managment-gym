import React, { useState, useEffect } from 'react'
import { FaTimes, FaClock, FaCheckCircle, FaUser, FaDollarSign, FaTools, FaStickyNote, FaCheckSquare, FaSave, FaPlay, FaLock, FaEdit, FaPlus, FaTrash, FaCog, FaMapMarkerAlt, FaTag, FaCalendarAlt, FaTimesCircle, FaSpinner, FaCamera, FaCloudUploadAlt, FaImage } from 'react-icons/fa'
import styles from '@/styles/MantenimientoDetailModal.module.css'
import { Incidencia, Tarea, Usuario, Machine } from '@/features/types/types'
import { useEscapeKey } from '@/features/hooks/useEscapeKey'
import { useAuth } from '@/features/context/AuthContext'

import DeleteConfirmModal from './mantenimiento/DeleteConfirmModal'
import MantenimientoInfo from './mantenimiento/MantenimientoInfo'
import MantenimientoTareas from './mantenimiento/MantenimientoTareas'
import MantenimientoNotas from './mantenimiento/MantenimientoNotas'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebase/firebase.config'
import { compressImage } from '@/utils/imageUtils'

interface MantenimientoDetailModalProps {
  isOpen: boolean
  onClose: () => void
  mantenimiento: Incidencia | null
  usuarios?: Usuario[]
  onUpdateTareas?: (tareas: Tarea[], estado?: string) => Promise<void>
  onUpdateNotas?: (notas: string) => Promise<void>
  onUpdate?: (data: { tecnicoAsignado?: Usuario | {}, descripcion?: string, tareas?: Tarea[] }) => Promise<void>
  onDelete?: (id: string) => Promise<void>

  onUpdateMachineStatus?: (status: string) => Promise<void>
  onUpdateFoto?: (fotoUrl: string) => Promise<void>
  maquinaRealTime?: Machine
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

  onUpdateMachineStatus,
  onUpdateFoto,
  maquinaRealTime
}) => {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)


  const [isEditing, setIsEditing] = useState(false)
  const [descripcionEditada, setDescripcionEditada] = useState<string>('')
  const [tecnicoEditado, setTecnicoEditado] = useState<Usuario | {}>({})
  const [statusEditado, setStatusEditado] = useState<string>('')
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [isSaving, setIsSaving] = useState(false)


  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)


  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const { user } = useAuth();



  const handleEscape = () => {

    if (showDeleteConfirmModal) {
      setShowDeleteConfirmModal(false);
      return;
    }

    onClose();
  };

  useEscapeKey(handleEscape, isOpen);

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

  // Sincronizar status de máquina cuando cambia el mantenimiento o la máquina en tiempo real
  useEffect(() => {
    // Priorizamos maquinaRealTime que es la data más fresca del contexto superior
    const statusActual = maquinaRealTime?.status || mantenimiento?.maquina?.status
    if (statusActual) {
      setStatusEditado(statusActual)
    }
  }, [mantenimiento?.maquina?.status, maquinaRealTime?.status])



  // Resetear estado solo cuando cambia el ID del mantenimiento
  useEffect(() => {
    setHasStarted(false)
    setIsEditing(false)
    setShowDeleteConfirmModal(false)
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



  const handleComenzar = () => {
    setHasStarted(true)
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



    // Si no hay validación, guardar directamente
    await performSave()
  }

  const performSave = async () => {
    if (!onUpdate || isSaving) return

    setIsSaving(true)
    try {
      if (onUpdateMachineStatus && mantenimiento?.maquina?.status && statusEditado !== mantenimiento.maquina.status) {
        await onUpdateMachineStatus(statusEditado)
      }

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
      setIsEditing(false)
    } catch (error) {
      console.error('Error al guardar cambios:', error)
    } finally {
      setIsSaving(false)
    }
  }



  const handleDeleteClick = () => {
    setShowDeleteConfirmModal(true)
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



  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, useCamera: boolean = false) => {
    const file = e.target.files?.[0]
    if (!file || !onUpdateFoto) return

    setUploadingImage(true)
    try {
      console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)

      const compressedFile = await compressImage(file, 0.1) // 0.1 MB = ~100KB
      console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(4)} MB`)

      const storageRef = ref(storage, `mantenimiento-evidencia/${file.name}-${Date.now()}`)
      await uploadBytes(storageRef, compressedFile)
      const url = await getDownloadURL(storageRef)

      await onUpdateFoto(url)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir la imagen. Por favor intente de nuevo.')
    } finally {
      setUploadingImage(false)
    }
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
              {/* <div className={styles.mantenimientoDetailIconContainer}>
                <FaTools size={18} />
              </div> */}
              <div>
                <h3 className={styles.mantenimientoDetailTitle}>
                  {getTipoLabel(mantenimiento.subTipo)}
                </h3>
                <div className={styles.mantenimientoDetailBadges}>
                  <span className={`${styles.statusBadge} ${getEstadoClass(mantenimiento.estado)}`}>
                    {getEstadoLabel(mantenimiento.estado)}
                  </span>
                  <span className={`${styles.priorityBadge} ${getPrioridadClass(mantenimiento.prioridad)}`}>
                    {getPrioridadLabel(mantenimiento.prioridad)}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.mantenimientoDetailHeaderActions}>
              {!isEditing ? (
                <>
                  {onUpdate && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className={`${styles.mantenimientoDetailCloseButton} ${styles.mantenimientoDetailActionButtonEdit}`}
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
                      className={`${styles.mantenimientoDetailCloseButton} ${styles.mantenimientoDetailActionButtonDelete}`}
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
                    className={`${styles.mantenimientoDetailCloseButton} ${isSaving ? styles.mantenimientoDetailActionButtonSaveSaving : styles.mantenimientoDetailActionButtonSave}`}
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
                      if (maquinaRealTime?.status || mantenimiento?.maquina?.status) {
                        setStatusEditado(maquinaRealTime?.status || mantenimiento?.maquina?.status || '')
                      }
                      if (mantenimiento?.tareas) {
                        setTareas(mantenimiento.tareas)
                      } else {
                        setTareas([])
                      }
                      setNuevaTarea('')
                    }}
                    className={`${styles.mantenimientoDetailCloseButton} ${styles.mantenimientoDetailActionButtonCancel}`}
                    aria-label="Cancelar edición"
                    title="Cancelar"
                  >
                    <FaTimes size={18} />
                  </button>
                </>
              )}
              {!isEditing && (
                <button
                  type="button"
                  onClick={onClose}
                  className={styles.mantenimientoDetailCloseButton}
                  aria-label="Cerrar modal"
                >
                  <FaTimes size={18} />
                </button>
              )}
            </div>
          </div>

          <div className={styles.mantenimientoDetailBody}>
            <MantenimientoInfo
              mantenimiento={mantenimiento}
              isEditing={isEditing}
              tecnicoEditado={tecnicoEditado}
              setTecnicoEditado={setTecnicoEditado}
              usuarios={usuarios}
              descripcionEditada={descripcionEditada}
              setDescripcionEditada={setDescripcionEditada}
              statusEditado={statusEditado}
              setStatusEditado={setStatusEditado}
              maquinaRealTime={maquinaRealTime}
            />

            <MantenimientoTareas
              tareas={tareas}
              setTareas={setTareas}
              isEditing={isEditing}
              isUpdating={isUpdating}
              hasStarted={hasStarted}
              onUpdateTareas={onUpdateTareas}
              nuevaTarea={nuevaTarea}
              setNuevaTarea={setNuevaTarea}
              handleAddTarea={handleAddTarea}
              handleRemoveTarea={handleRemoveTarea}
              handleEditTarea={handleEditTarea}
              handleToggleTarea={handleToggleTarea}
            />

            {/* Selector de Estado del Equipo para el Técnico */}
            {!isEditing && hasStarted && (
              <div className={styles.mantenimientoDetailSection}>
                <h4 className={styles.mantenimientoDetailSectionTitleWithIcon}>
                  <FaTag size={14} />
                  Estado del Equipo
                </h4>
                <div className={styles.mantenimientoDetailStatusSectionContainer}>
                  <p className={styles.mantenimientoDetailStatusSectionLabel}>
                    Determine el estado operativo del equipo al finalizar el mantenimiento:
                  </p>
                  <div className={styles.mantenimientoDetailStatusButtonsContainer}>
                    {[
                      { value: 'active', label: 'Activo', color: '#10b981', bg: '#ecfdf5', icon: FaCheckCircle },
                      { value: 'maintenance', label: 'En Mantenimiento', color: '#f59e0b', bg: '#fffbeb', icon: FaTools },
                      { value: 'inactive', label: 'Inactivo', color: '#ef4444', bg: '#fef2f2', icon: FaTimesCircle }
                    ].map((statusOption) => {
                      const isSelected = statusEditado === statusOption.value
                      const Icon = statusOption.icon
                      return (
                        <button
                          key={statusOption.value}
                          type="button"
                          onClick={async () => {
                            setStatusEditado(statusOption.value)
                            if (onUpdateMachineStatus) {
                              try {
                                await onUpdateMachineStatus(statusOption.value)
                              } catch (error) {
                                console.error('Error al actualizar estado:', error)
                              }
                            }
                          }}
                          className={`${styles.mantenimientoDetailStatusButton} ${isSelected
                            ? statusOption.value === 'active'
                              ? styles.mantenimientoDetailStatusButtonActive
                              : statusOption.value === 'maintenance'
                                ? styles.mantenimientoDetailStatusButtonMaintenance
                                : styles.mantenimientoDetailStatusButtonInactive
                            : ''
                            }`}
                        >
                          <Icon size={16} />
                          {statusOption.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Piezas Reemplazadas */}
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

            {/* Evidencia de Mantenimiento (Foto) */}
            {(hasStarted || mantenimiento.fotoUrl) && (
              <div className={styles.mantenimientoDetailSection}>
                <h4 className={styles.mantenimientoDetailSectionTitleWithIcon}>
                  <FaImage size={14} />
                  Evidencia de Mantenimiento
                </h4>
                <div className={styles.evidenceContainer}>
                  {mantenimiento.fotoUrl ? (
                    <div className={styles.evidencePreview}>
                      <img src={mantenimiento.fotoUrl} alt="Evidencia de mantenimiento" className={styles.evidenceImage} />
                      {hasStarted && (
                        <div className={styles.evidenceActions}>
                          <label htmlFor="evidence-upload" className={`${styles.button} ${styles.evidenceButtonSmall}`}>
                            <FaCloudUploadAlt /> Cambiar
                          </label>
                          <label htmlFor="evidence-camera" className={`${styles.button} ${styles.evidenceButtonSmall}`}>
                            <FaCamera /> Tomar otra
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.evidenceUploadPlaceholder}>
                      <p className={styles.evidencePlaceholderText}>Cargue una imagen o tome una foto como prueba del mantenimiento realizado.</p>
                      <div className={styles.evidenceButtonsGroup}>
                        <label htmlFor="evidence-upload" className={`${styles.button} ${styles.evidenceButton}`}>
                          {uploadingImage ? <FaSpinner className={styles.spinner} /> : <FaCloudUploadAlt />}
                          {uploadingImage ? ' Subiendo...' : ' Subir Imagen'}
                        </label>
                        <label htmlFor="evidence-camera" className={`${styles.button} ${styles.evidenceButton}`}>
                          {uploadingImage ? <FaSpinner className={styles.spinner} /> : <FaCamera />}
                          {uploadingImage ? ' Tomando...' : ' Tomar Foto'}
                        </label>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    id="evidence-upload"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e)}
                    style={{ display: 'none' }}
                    disabled={uploadingImage}
                  />
                  <input
                    type="file"
                    id="evidence-camera"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleImageUpload(e, true)}
                    style={{ display: 'none' }}
                    disabled={uploadingImage}
                  />
                </div>
              </div>
            )}

            <MantenimientoNotas
              initialNotas={mantenimiento.notas}
              onUpdateNotas={onUpdateNotas}
              hasStarted={hasStarted}
            />

            {/* Botón Comenzar - Solo se muestra si no se ha comenzado y no está en modo edición */}
            {!hasStarted && !isEditing && (
              <div className={styles.mantenimientoDetailStartButtonContainer}>
                {user?.uid === (mantenimiento?.tecnicoAsignado as Usuario)?.id ? (
                  <button
                    type="button"
                    onClick={handleComenzar}
                    className={`${styles.button} ${styles.mantenimientoDetailStartButton}`}
                  >
                    <FaPlay size={14} />
                    Comenzar
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={`${styles.button} ${styles.mantenimientoDetailStartButton}`}
                    style={{ opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#9ca3af' }}
                    title="Solo el responsable asignado puede comenzar este mantenimiento"
                  >
                    <FaLock size={14} />
                    Comenzar (No Asignado)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>



      <DeleteConfirmModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  )
}

