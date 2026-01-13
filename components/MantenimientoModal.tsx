import React, { useState, useEffect } from 'react'
import { FaTools, FaTimes, FaUser, FaCalendarAlt, FaPlus, FaCheckSquare, FaCog, FaEdit, FaTrash, FaCheck } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { tipoDeMantenimiento, estadoDeMantenimiento, prioridadDeMantenimiento } from '@/utils/data'
import { Tarea, Usuario } from '@/features/types/types'
import { AuthModal } from '@/components/AuthModal'
import { useManagment } from '@/features/hooks/useManagment'

interface MantenimientoModalProps {
  isOpen: boolean
  onClose: () => void
  usuarios?: Usuario[]
  validateSiEsAdmin?: (dni: string, pin: string) => Promise<boolean>
  onSubmit: (data: {
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
  }) => Promise<void>
}

export const MantenimientoModal: React.FC<MantenimientoModalProps> = ({
  isOpen,
  onClose,
  usuarios = [],
  validateSiEsAdmin,
  onSubmit
}) => {
  // Función helper para obtener el valor del primer elemento del array
  const getInitialValue = (array: Array<{ id: number; name: string }>): string => {
    const valueMap: Record<string, string> = {
      'Preventivo': 'preventivo',
      'Correctivo': 'correctivo',
      'Cambio de Piezas': 'cambio_piezas',
      'Revisión': 'revision',
      'Otro': 'otro',
      'Pendiente': 'pendiente',
      'En Proceso': 'en_proceso',
      'Completado': 'completado',
      'Cancelado': 'cancelado',
      'Baja': 'baja',
      'Media': 'media',
      'Alta': 'alta',
      'Urgente': 'urgente'
    }
    const firstItem = array[0]
    return valueMap[firstItem?.name] || firstItem?.name.toLowerCase() || ''
  }

  const [mantenimientoForm, setMantenimientoForm] = useState({
    subTipo: getInitialValue(tipoDeMantenimiento),
    fechaProgramada: new Date(),
    estado: getInitialValue(estadoDeMantenimiento),
    descripcion: '',
    prioridad: getInitialValue(prioridadDeMantenimiento),
    tecnicoAsignado: {} as Usuario | {},
    notas: '',
    tareas: [] as Tarea[],
    mantenimientoRecurrente: false,
    frecuenciaDias: 7
  })
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState<string>('')
  const [saveAsReusable, setSaveAsReusable] = useState(false)

  // Estados para la gestión de tareas frecuentes
  const [isManagingTasks, setIsManagingTasks] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskText, setEditingTaskText] = useState('')

  const { getReusableTasks, reusableTasks, createReusableTask, updateReusableTask, deleteReusableTask } = useManagment()

  useEffect(() => {
    if (isOpen) {
      const unsubscribe = getReusableTasks()
      return () => unsubscribe()
    }
  }, [isOpen, getReusableTasks])

  // Función helper para convertir Date a string YYYY-MM-DD sin problemas de zona horaria
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleAddTarea = async () => {
    if (nuevaTarea.trim()) {
      const tarea: Tarea = {
        descripcion: nuevaTarea.trim(),
        completada: false
      }
      setMantenimientoForm(prev => ({
        ...prev,
        tareas: [...prev.tareas, tarea]
      }))

      // Guardar como tarea frecuente si está marcado
      if (saveAsReusable) {
        try {
          // Verificar duplicados en la lista local antes de intentar guardar (opcional, pero buena UX)
          const exists = reusableTasks.some(t => t.descripcion.toLowerCase() === nuevaTarea.trim().toLowerCase())
          if (!exists) {
            await createReusableTask(nuevaTarea.trim())
          }
        } catch (error) {
          console.error("Error al guardar tarea frecuente:", error)
        }
      }

      setNuevaTarea('')
      setSaveAsReusable(false)
    }
  }

  const handleAddFromReusable = (descripcion: string) => {
    if (descripcion) {
      const tarea: Tarea = {
        descripcion: descripcion,
        completada: false
      }
      setMantenimientoForm(prev => ({
        ...prev,
        tareas: [...prev.tareas, tarea]
      }))
    }
  }

  const handleRemoveTarea = (index: number) => {
    setMantenimientoForm(prev => ({
      ...prev,
      tareas: prev.tareas.filter((_, i) => i !== index)
    }))
  }

  const handleToggleTarea = (index: number) => {
    setMantenimientoForm(prev => ({
      ...prev,
      tareas: prev.tareas.map((tarea, i) =>
        i === index ? { ...tarea, completada: !tarea.completada } : tarea
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Si hay función de validación, mostrar modal de autenticación primero
    if (validateSiEsAdmin) {
      setShowAuthModal(true)
      setAuthError('')
      return
    }

    // Si no hay validación, proceder directamente
    await performSubmit()
  }

  const performSubmit = async () => {
    try {
      await onSubmit(mantenimientoForm)
      // Resetear formulario después de enviar
      setMantenimientoForm({
        subTipo: getInitialValue(tipoDeMantenimiento),
        fechaProgramada: new Date(),
        estado: getInitialValue(estadoDeMantenimiento),
        descripcion: '',
        prioridad: getInitialValue(prioridadDeMantenimiento),
        tecnicoAsignado: {},
        notas: '',
        tareas: [],
        mantenimientoRecurrente: false,
        frecuenciaDias: 7
      })
      setNuevaTarea('')
      setSaveAsReusable(false)
      setIsManagingTasks(false)
      setEditingTaskId(null)
      setShowAuthModal(false)
      onClose()
    } catch (error) {
      console.error('Error al guardar mantenimiento:', error)
      throw error
    }
  }

  const handleAuthAccept = async (dni: string, pin: string) => {
    if (!validateSiEsAdmin) {
      setAuthError('Error de validación')
      return
    }

    try {
      const esAdmin = await validateSiEsAdmin(dni, pin)

      if (esAdmin) {
        // Si es admin, proceder con el registro del mantenimiento
        setShowAuthModal(false)
        setAuthError('')
        await performSubmit()
      } else {
        setAuthError('Acceso denegado. Solo administradores y desarrolladores pueden registrar mantenimientos.')
      }
    } catch (error) {
      console.error('Error al validar administrador:', error)
      setAuthError('Error al validar credenciales. Intente nuevamente.')
    }
  }

  const handleCloseAuthModal = () => {
    setShowAuthModal(false)
    setAuthError('')
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <FaTools size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Registrar Mantenimiento
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={styles.modalCloseButton}
            aria-label="Cerrar modal"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Tipo de Mantenimiento *</label>
                <select
                  value={mantenimientoForm.subTipo}
                  onChange={(e) => setMantenimientoForm(prev => ({ ...prev, subTipo: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  {tipoDeMantenimiento.map((tipo) => {
                    // Mapear el nombre a el valor que se usa en el código
                    const valueMap: Record<string, string> = {
                      'Preventivo': 'preventivo',
                      'Correctivo': 'correctivo',
                      'Cambio de Piezas': 'cambio_piezas',
                      'Revisión': 'revision',
                      'Otro': 'otro'
                    }
                    return (
                      <option key={tipo.id} value={valueMap[tipo.name] || tipo.name.toLowerCase()}>
                        {tipo.name}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Estado *</label>
                <select
                  value={mantenimientoForm.estado}
                  onChange={(e) => setMantenimientoForm(prev => ({ ...prev, estado: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  {estadoDeMantenimiento.map((estado) => {
                    // Mapear el nombre a el valor que se usa en el código
                    const valueMap: Record<string, string> = {
                      'Pendiente': 'pendiente',
                      'En Proceso': 'en_proceso',
                      'Completado': 'completado',
                      'Cancelado': 'cancelado'
                    }
                    return (
                      <option key={estado.id} value={valueMap[estado.name] || estado.name.toLowerCase()}>
                        {estado.name}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Prioridad *</label>
                <select
                  value={mantenimientoForm.prioridad}
                  onChange={(e) => setMantenimientoForm(prev => ({ ...prev, prioridad: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  {prioridadDeMantenimiento.map((prioridad) => {
                    // Mapear el nombre a el valor que se usa en el código
                    const valueMap: Record<string, string> = {
                      'Baja': 'baja',
                      'Media': 'media',
                      'Alta': 'alta',
                      'Urgente': 'urgente'
                    }
                    return (
                      <option key={prioridad.id} value={valueMap[prioridad.name] || prioridad.name.toLowerCase()}>
                        {prioridad.name}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaCalendarAlt size={14} style={{ marginRight: '0.5rem' }} />
                  Fecha Programada
                </label>
                <input
                  type="date"
                  value={formatDateToString(mantenimientoForm.fechaProgramada)}
                  onChange={(e) => {
                    // Parsear la fecha manualmente para evitar problemas de zona horaria
                    const [year, month, day] = e.target.value.split('-').map(Number)
                    const fecha = new Date(year, month - 1, day)
                    setMantenimientoForm(prev => ({ ...prev, fechaProgramada: fecha }))
                  }}
                  className={styles.input}
                />
              </div>

              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={mantenimientoForm.mantenimientoRecurrente}
                    onChange={(e) => setMantenimientoForm(prev => ({ ...prev, mantenimientoRecurrente: e.target.checked }))}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  <span>Programar mantenimiento recurrente</span>
                </label>
              </div>

              {mantenimientoForm.mantenimientoRecurrente && (
                <div className={styles.formField}>
                  <label className={styles.label}>Frecuencia (días)</label>
                  <select
                    value={mantenimientoForm.frecuenciaDias}
                    onChange={(e) => setMantenimientoForm(prev => ({ ...prev, frecuenciaDias: parseInt(e.target.value) }))}
                    className={styles.select}
                  >
                    <option value={7}>Cada 7 días</option>
                    <option value={15}>Cada 15 días</option>
                    <option value={30}>Cada 30 días</option>
                  </select>
                </div>
              )}

              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaUser size={14} style={{ marginRight: '0.5rem' }} />
                  Responsable
                </label>
                <select
                  value={(mantenimientoForm.tecnicoAsignado as Usuario)?.dni || (mantenimientoForm.tecnicoAsignado as Usuario)?.id || ''}
                  onChange={(e) => {
                    const selectedDniOrId = e.target.value
                    if (!selectedDniOrId) {
                      setMantenimientoForm(prev => ({ ...prev, tecnicoAsignado: {} }))
                    } else {
                      const selectedUsuario = usuarios.find(
                        u => u.dni === selectedDniOrId || u.id === selectedDniOrId
                      )
                      if (selectedUsuario) {
                        setMantenimientoForm(prev => ({ ...prev, tecnicoAsignado: selectedUsuario }))
                      }
                    }
                  }}
                  className={styles.select}
                >
                  <option value="">Seleccione un responsable</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id || usuario.dni} value={usuario.dni || usuario.id || ''}>
                      {usuario.nombres} {usuario.apellidos} {usuario.dni ? `(${usuario.dni})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Descripción *</label>
              <textarea
                value={mantenimientoForm.descripcion}
                onChange={(e) => setMantenimientoForm(prev => ({ ...prev, descripcion: e.target.value }))}
                className={styles.textarea}
                rows={3}
                required
                placeholder="Describe el mantenimiento a realizar..."
              />
            </div>

            {/* Checklist de Tareas */}
            <div className={styles.formField}>
              <label className={styles.label}>
                <FaCheckSquare size={14} style={{ marginRight: '0.5rem' }} />
                Tareas (Checklist)
              </label>
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className={styles.label} style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 0 }}>
                      Tareas Frecuentes
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManagingTasks(!isManagingTasks)}
                      className={styles.button}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.8rem',
                        backgroundColor: isManagingTasks ? '#e5e7eb' : 'transparent',
                        color: '#4b5563',
                        border: '1px solid #d1d5db'
                      }}
                      title={isManagingTasks ? "Cerrar gestión" : "Gestionar tareas frecuentes"}
                    >
                      <FaCog size={14} />
                    </button>
                  </div>

                  {isManagingTasks ? (
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      backgroundColor: '#f9fafb',
                      padding: '0.5rem'
                    }}>
                      {reusableTasks.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
                          No hay tareas frecuentes guardadas.
                        </p>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {reusableTasks.map((task) => (
                            <li key={task.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 0',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              {editingTaskId === task.id ? (
                                <>
                                  <input
                                    type="text"
                                    value={editingTaskText}
                                    onChange={(e) => setEditingTaskText(e.target.value)}
                                    className={styles.input}
                                    style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem', height: 'auto' }}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (editingTaskText.trim() && task.id) {
                                        await updateReusableTask(task.id, editingTaskText.trim())
                                        setEditingTaskId(null)
                                      }
                                    }}
                                    className={styles.button}
                                    style={{ padding: '0.25rem', color: '#10b981', background: 'none' }}
                                  >
                                    <FaCheck size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingTaskId(null)}
                                    className={styles.button}
                                    style={{ padding: '0.25rem', color: '#6b7280', background: 'none' }}
                                  >
                                    <FaTimes size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span style={{ flex: 1, fontSize: '0.9rem' }}>{task.descripcion}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTaskId(task.id || null)
                                      setEditingTaskText(task.descripcion)
                                    }}
                                    className={styles.button}
                                    style={{ padding: '0.25rem', color: '#3b82f6', background: 'none' }}
                                    title="Editar"
                                  >
                                    <FaEdit size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.confirm('¿Estás seguro de eliminar esta tarea frecuente?')) {
                                        if (task.id) await deleteReusableTask(task.id)
                                      }
                                    }}
                                    className={styles.button}
                                    style={{ padding: '0.25rem', color: '#ef4444', background: 'none' }}
                                    title="Eliminar"
                                  >
                                    <FaTrash size={14} />
                                  </button>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <select
                      className={styles.select}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddFromReusable(e.target.value)
                          e.target.value = '' // Reset select
                        }
                      }}
                      style={{ fontSize: '0.9rem' }}
                    >
                      <option value="">Seleccionar tarea frecuente...</option>
                      {reusableTasks.map((task) => (
                        <option key={task.id} value={task.descripcion}>
                          {task.descripcion}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                      placeholder="Escribir nueva tarea..."
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#4b5563', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={saveAsReusable}
                      onChange={(e) => setSaveAsReusable(e.target.checked)}
                      style={{ width: 'auto', margin: 0 }}
                      disabled={!nuevaTarea.trim()}
                    />
                    Guardar como tarea frecuente
                  </label>
                </div>
                {mantenimientoForm.tareas.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {mantenimientoForm.tareas.map((tarea, index) => (
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
                          onChange={() => handleToggleTarea(index)}
                          style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                        />
                        <span
                          style={{
                            flex: 1,
                            textDecoration: tarea.completada ? 'line-through' : 'none',
                            color: tarea.completada ? '#6b7280' : '#111827',
                            fontSize: '0.875rem'
                          }}
                        >
                          {tarea.descripcion}
                        </span>
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
                {mantenimientoForm.tareas.length === 0 && (
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
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Notas Adicionales</label>
              <textarea
                value={mantenimientoForm.notas}
                onChange={(e) => setMantenimientoForm(prev => ({ ...prev, notas: e.target.value }))}
                className={styles.textarea}
                rows={2}
                placeholder="Notas adicionales sobre el mantenimiento..."
              />
            </div>

            <div className={styles.modalButtonGroup}>
              <button
                type="button"
                onClick={onClose}
                className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton}`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonSubmit} ${styles.modalButton}`}
              >
                Registrar Mantenimiento
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Autenticación */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
        onAccept={handleAuthAccept}
        error={authError}
      />
    </div>
  )
}

