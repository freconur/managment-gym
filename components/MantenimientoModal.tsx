import React, { useState, useEffect, useRef } from 'react'
import { FaTools, FaTimes, FaUser, FaCalendarAlt, FaPlus, FaCheckSquare, FaCog, FaEdit, FaTrash, FaCheck, FaSpinner } from 'react-icons/fa'
import { tipoDeMantenimiento, estadoDeMantenimiento, prioridadDeMantenimiento } from '@/utils/data'
import { Tarea, Usuario } from '@/features/types/types'
import { useManagment } from '@/features/hooks/useManagment'
import styles from './MantenimientoModal.module.css'

interface MantenimientoModalProps {
  isOpen: boolean
  onClose: () => void
  usuarios?: Usuario[]
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

import { useEscapeKey } from '@/features/hooks/useEscapeKey'

export const MantenimientoModal: React.FC<MantenimientoModalProps> = ({
  isOpen,
  onClose,
  usuarios = [],
  onSubmit
}) => {
  useEscapeKey(onClose, isOpen);
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
  const dateInputRef = useRef<HTMLInputElement>(null)

  const [saveAsReusable, setSaveAsReusable] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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
    // Si no hay validación, proceder directamente
    await performSubmit()
  }

  const performSubmit = async () => {
    setIsSaving(true)
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
      onClose()
    } catch (error) {
      console.error('Error al guardar mantenimiento:', error)
      // No re-lanzamos el error aquí para que la UI no rompa, pero mantenemos el loading false al final
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Loading Overlay */}
        {isSaving && (
          <div className={styles.loadingOverlay}>
            <FaSpinner className={styles.spinner} />
            <span className={styles.loadingText}>Guardando mantenimiento...</span>
          </div>
        )}

        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            <FaTools size={20} style={{ marginRight: '0.5rem' }} />
            Registrar Mantenimiento
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Cerrar modal"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className={styles.body}>
          <form id="mantenimiento-form" onSubmit={handleSubmit}>
            <div className={styles.formGrid}>

              {/* Tipo */}
              <div className={styles.formField}>
                <label className={styles.label}>Tipo de Mantenimiento *</label>
                <select
                  value={mantenimientoForm.subTipo}
                  onChange={(e) => setMantenimientoForm(prev => ({ ...prev, subTipo: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  {tipoDeMantenimiento.map((tipo) => {
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

              {/* Estado */}
              <div className={styles.formField}>
                <label className={styles.label}>Estado *</label>
                <select
                  value={mantenimientoForm.estado}
                  onChange={(e) => setMantenimientoForm(prev => ({ ...prev, estado: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  {estadoDeMantenimiento.map((estado) => {
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

              {/* Prioridad */}
              <div className={styles.formField}>
                <label className={styles.label}>Prioridad *</label>
                <select
                  value={mantenimientoForm.prioridad}
                  onChange={(e) => setMantenimientoForm(prev => ({ ...prev, prioridad: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  {prioridadDeMantenimiento.map((prioridad) => {
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

              {/* Fecha */}
              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaCalendarAlt size={14} style={{ marginRight: '0.5rem' }} />
                  Fecha Programada
                </label>
                <div className={styles.dateInputWrapper}>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={formatDateToString(mantenimientoForm.fechaProgramada)}
                    onChange={(e) => {
                      const [year, month, day] = e.target.value.split('-').map(Number)
                      const fecha = new Date(year, month - 1, day)
                      setMantenimientoForm(prev => ({ ...prev, fechaProgramada: fecha }))
                    }}
                    onClick={() => dateInputRef.current?.showPicker()}
                    className={styles.input}
                  />
                  <FaCalendarAlt className={styles.calendarIconOverlay} />
                </div>

              </div>

              {/* Recurrente */}
              <div className={`${styles.formField} ${styles.formFieldFull}`}>
                <label className={styles.checkboxLabel}>
                  <input
                    className={styles.checkboxInput}
                    type="checkbox"
                    checked={mantenimientoForm.mantenimientoRecurrente}
                    onChange={(e) => setMantenimientoForm(prev => ({ ...prev, mantenimientoRecurrente: e.target.checked }))}
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

              {/* Responsable */}
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
                  {usuarios
                    .filter(u => u.rol?.toLowerCase() === 'instructor')
                    .map((usuario) => (
                      <option key={usuario.id || usuario.dni} value={usuario.dni || usuario.id || ''}>
                        {usuario.name || (usuario.nombres + ' ' + usuario.apellidos)} {usuario.dni ? `(${usuario.dni})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div className={styles.formField}>
              <label className={styles.label}>Descripción</label>
              <textarea
                value={mantenimientoForm.descripcion}
                onChange={(e) => setMantenimientoForm(prev => ({ ...prev, descripcion: e.target.value.toLowerCase() }))}
                className={styles.textarea}
                rows={3}
                placeholder="Describe el mantenimiento a realizar..."
              />
            </div>

            {/* Checklist de Tareas - Completely Refactored CSS */}
            <div className={styles.formField}>
              <label className={styles.label}>
                <FaCheckSquare size={14} style={{ marginRight: '0.5rem' }} />
                Tareas (Checklist)
              </label>

              <div className={styles.taskContainer}>

                {/* Header with Manage Button */}
                <div className={styles.taskHeader}>
                  <span className={styles.taskLabel}>Tareas Frecuentes</span>
                  <button
                    type="button"
                    onClick={() => setIsManagingTasks(!isManagingTasks)}
                    className={`${styles.iconButton} ${isManagingTasks ? styles.iconButtonActive : ''}`}
                    title={isManagingTasks ? "Cerrar gestión" : "Gestionar tareas frecuentes"}
                  >
                    <FaCog size={14} />
                    <span>Gestionar</span>
                  </button>
                </div>

                {/* Manage Panel */}
                {isManagingTasks ? (
                  <div className={styles.manageTasksPanel}>
                    {reusableTasks.length === 0 ? (
                      <p className={styles.emptyState}>No hay tareas frecuentes guardadas.</p>
                    ) : (
                      <ul className={styles.reusableTaskList}>
                        {reusableTasks.map((task) => (
                          <li key={task.id} className={styles.reusableTaskItem}>
                            {editingTaskId === task.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editingTaskText}
                                  onChange={(e) => setEditingTaskText(e.target.value.toLowerCase())}
                                  className={styles.input}
                                  style={{ padding: '0.25rem 0.5rem' }}
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
                                  className={`${styles.actionButton} ${styles.btnCheck}`}
                                >
                                  <FaCheck size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className={`${styles.actionButton} ${styles.btnTimes}`}
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
                                  className={`${styles.actionButton} ${styles.btnEdit}`}
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
                                  className={`${styles.actionButton} ${styles.btnDelete}`}
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
                  <div style={{ marginBottom: '1rem' }}>
                    <select
                      className={styles.select}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddFromReusable(e.target.value)
                          e.target.value = ''
                        }
                      }}
                    >
                      <option value="">+ Seleccionar tarea frecuente...</option>
                      {reusableTasks.map((task) => (
                        <option key={task.id} value={task.descripcion}>
                          {task.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Add New Task Input */}
                <div className={styles.addTaskRow}>
                  <div className={styles.taskInputGroup}>
                    <input
                      type="text"
                      value={nuevaTarea}
                      onChange={(e) => setNuevaTarea(e.target.value.toLowerCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTarea()
                        }
                      }}
                      className={styles.input}
                      placeholder="Escribir nueva tarea..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTarea}
                      className={styles.addButton}
                    >
                      <FaPlus size={14} />
                      Agregar
                    </button>
                  </div>
                  <label className={`${styles.saveReusableCheckbox} ${!nuevaTarea.trim() ? styles.saveReusableCheckboxDisabled : ''}`}>
                    <input
                      type="checkbox"
                      checked={saveAsReusable}
                      onChange={(e) => setSaveAsReusable(e.target.checked)}
                      disabled={!nuevaTarea.trim()}
                      className={styles.checkboxInput}
                    />
                    Guardar como tarea frecuente
                  </label>
                </div>

                {/* Task List Visualization */}
                {mantenimientoForm.tareas.length > 0 ? (
                  <div className={styles.taskList}>
                    {mantenimientoForm.tareas.map((tarea, index) => (
                      <div key={index} className={styles.taskItem}>
                        <input
                          type="checkbox"
                          checked={tarea.completada}
                          onChange={() => handleToggleTarea(index)}
                          className={styles.checkboxInput}
                        />
                        <span className={`${styles.taskText} ${tarea.completada ? styles.taskCompleted : ''}`}>
                          {tarea.descripcion}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTarea(index)}
                          className={`${styles.actionButton} ${styles.btnTimes}`}
                          title="Quitar"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>No hay tareas agregadas. Agrega una tarea para comenzar.</p>
                )}
              </div>
            </div>

            {/* Notas */}
            <div className={styles.formField}>
              <label className={styles.label}>Notas Adicionales</label>
              <textarea
                value={mantenimientoForm.notas}
                onChange={(e) => setMantenimientoForm(prev => ({ ...prev, notas: e.target.value.toLowerCase() }))}
                className={styles.textarea}
                rows={2}
                placeholder="Notas adicionales sobre el mantenimiento..."
              />
            </div>
          </form>
        </div>

        {/* Sticky Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={`${styles.btnFooter} ${styles.btnCancel}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="mantenimiento-form" /* Binds to the form in the body */
            className={`${styles.btnFooter} ${styles.btnSubmit}`}
          >
            Registrar Mantenimiento
          </button>
        </div>

      </div>
    </div>
  )
}

