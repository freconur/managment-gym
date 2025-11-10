import React, { useState, useEffect } from 'react'
import { FaTools, FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaExclamationCircle, FaCheckCircle, FaClock, FaTimes, FaDollarSign, FaUser, FaCog } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { Incidencia, PiezaReemplazada, Usuario } from '@/features/types/types'

interface IncidenciasSectionProps {
  machineId: string
  incidencias: Incidencia[]
  onCreate: (incidencia: Omit<Incidencia, 'id'>) => Promise<string | void>
  onUpdate: (id: string, incidencia: Partial<Incidencia>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export const IncidenciasSection: React.FC<IncidenciasSectionProps> = ({
  machineId,
  incidencias,
  onCreate,
  onUpdate,
  onDelete
}) => {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Omit<Incidencia, 'id'>>({
    machineId,
    tipo: 'preventivo',
    fechaReporte: new Date(),
    estado: 'pendiente',
    descripcion: '',
    prioridad: 'media',
    tecnicoAsignado: undefined,
    costo: 0,
    piezasReemplazadas: [],
    notas: ''
  })
  const [piezasForm, setPiezasForm] = useState<PiezaReemplazada>({
    nombre: '',
    cantidad: 1,
    costo: 0,
    descripcion: ''
  })

  // Función helper para convertir Date a string YYYY-MM-DD sin problemas de zona horaria
  const formatDateToString = (date: Date | undefined): string => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Función helper para convertir string a Date
  const parseDateFromString = (dateString: string): Date => {
    if (!dateString) return new Date()
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Función helper para convertir cualquier tipo de fecha a Date
  const toDate = (date: Date | any): Date => {
    if (!date) return new Date()
    if (date instanceof Date) return date
    // Si es un Timestamp de Firebase
    if (date.toDate && typeof date.toDate === 'function') return date.toDate()
    // Si es un string o número
    return new Date(date)
  }

  const resetForm = () => {
    setFormData({
      machineId,
      tipo: 'preventivo',
      fechaReporte: new Date(),
      estado: 'pendiente',
      descripcion: '',
      prioridad: 'media',
      tecnicoAsignado: undefined,
      costo: 0,
      piezasReemplazadas: [],
      notas: ''
    })
    setPiezasForm({
      nombre: '',
      cantidad: 1,
      costo: 0,
      descripcion: ''
    })
    setShowForm(false)
    setEditingId(null)
  }

  const handleEdit = (incidencia: Incidencia) => {
    setFormData({
      machineId: incidencia.machineId,
      tipo: incidencia.tipo,
      fechaReporte: incidencia.fechaReporte,
      fechaProgramada: incidencia.fechaProgramada,
      fechaResolucion: incidencia.fechaResolucion,
      estado: incidencia.estado || 'pendiente',
      descripcion: incidencia.descripcion,
      prioridad: incidencia.prioridad || 'media',
      tecnicoAsignado: incidencia.tecnicoAsignado,
      costo: incidencia.costo || 0,
      piezasReemplazadas: incidencia.piezasReemplazadas || [],
      notas: incidencia.notas || ''
    })
    setEditingId(incidencia.id || null)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await onUpdate(editingId, formData)
      } else {
        await onCreate(formData)
      }
      resetForm()
    } catch (error) {
      console.error('Error al guardar incidencia:', error)
    }
  }

  const handleAddPieza = () => {
    if (piezasForm.nombre.trim()) {
      setFormData(prev => ({
        ...prev,
        piezasReemplazadas: [...(prev.piezasReemplazadas || []), { ...piezasForm }]
      }))
      setPiezasForm({
        nombre: '',
        cantidad: 1,
        costo: 0,
        descripcion: ''
      })
    }
  }

  const handleRemovePieza = (index: number) => {
    setFormData(prev => ({
      ...prev,
      piezasReemplazadas: prev.piezasReemplazadas?.filter((_, i) => i !== index) || []
    }))
  }

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      preventivo: 'Preventivo',
      correctivo: 'Correctivo',
      cambio_piezas: 'Cambio de Piezas',
      revision: 'Revisión',
      otro: 'Otro'
    }
    return tipos[tipo] || tipo
  }

  const getEstadoLabel = (estado: string) => {
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

  const getEstadoClass = (estado: string) => {
    const classes: Record<string, string> = {
      pendiente: styles.statusPending,
      en_proceso: styles.statusInProcess,
      completado: styles.statusCompleted,
      cancelado: styles.statusCancelled
    }
    return classes[estado] || ''
  }

  return (
    <div className={styles.incidenciasSection}>
      <div className={styles.incidenciasHeader}>
        <div className={styles.incidenciasTitleGroup}>
          <FaTools size={24} />
          <h2 className={styles.incidenciasTitle}>Incidencias y Mantenimiento</h2>
          <span className={styles.incidenciasCount}>({incidencias.length})</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          <FaPlus size={16} />
          <span>{showForm ? 'Cancelar' : 'Nueva Incidencia'}</span>
        </button>
      </div>

      {showForm && (
        <div className={styles.incidenciaForm}>
          <h3 className={styles.formTitle}>
            {editingId ? 'Editar Incidencia' : 'Nueva Incidencia'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Tipo *</label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  <option value="preventivo">Preventivo</option>
                  <option value="correctivo">Correctivo</option>
                  <option value="cambio_piezas">Cambio de Piezas</option>
                  <option value="revision">Revisión</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Estado *</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Prioridad *</label>
                <select
                  name="prioridad"
                  value={formData.prioridad}
                  onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Fecha de Reporte *</label>
                <input
                  type="date"
                  name="fechaReporte"
                  value={formatDateToString(formData.fechaReporte)}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaReporte: parseDateFromString(e.target.value) }))}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Fecha Programada</label>
                <input
                  type="date"
                  name="fechaProgramada"
                  value={formatDateToString(formData.fechaProgramada)}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaProgramada: e.target.value ? parseDateFromString(e.target.value) : undefined }))}
                  className={styles.input}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Fecha de Resolución</label>
                <input
                  type="date"
                  name="fechaResolucion"
                  value={formatDateToString(formData.fechaResolucion)}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaResolucion: e.target.value ? parseDateFromString(e.target.value) : undefined }))}
                  className={styles.input}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Técnico Asignado</label>
                <input
                  type="text"
                  name="tecnicoAsignado"
                  value={formData.tecnicoAsignado ? `${formData.tecnicoAsignado.nombres || ''} ${formData.tecnicoAsignado.apellidos || ''}`.trim() : ''}
                  onChange={(e) => {
                    // Por ahora, solo permitimos texto. Si necesitas seleccionar de una lista, necesitarías un select
                    // Para mantener compatibilidad, dejamos esto como texto pero no lo guardamos en tecnicoAsignado
                    // Si necesitas guardar un Usuario completo, necesitarías un componente de selección
                  }}
                  className={styles.input}
                  placeholder="Nombre del técnico"
                  disabled
                />
                <small style={{ color: '#666', fontSize: '0.875rem' }}>
                  Nota: La asignación de técnico debe hacerse desde el sistema de usuarios
                </small>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Costo</label>
                <input
                  type="number"
                  name="costo"
                  value={formData.costo || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, costo: parseFloat(e.target.value) || 0 }))}
                  className={styles.input}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Descripción *</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                className={styles.textarea}
                rows={3}
                required
                placeholder="Describe el problema o mantenimiento necesario..."
              />
            </div>

            {/* Piezas Reemplazadas */}
            <div className={styles.formField}>
              <label className={styles.label}>Piezas Reemplazadas</label>
              <div className={styles.piezasForm}>
                <div className={styles.piezasInputs}>
                  <input
                    type="text"
                    placeholder="Nombre de la pieza"
                    value={piezasForm.nombre}
                    onChange={(e) => setPiezasForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className={styles.input}
                  />
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={piezasForm.cantidad}
                    onChange={(e) => setPiezasForm(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                    className={styles.input}
                    min="1"
                  />
                  <input
                    type="number"
                    placeholder="Costo"
                    value={piezasForm.costo}
                    onChange={(e) => setPiezasForm(prev => ({ ...prev, costo: parseFloat(e.target.value) || 0 }))}
                    className={styles.input}
                    min="0"
                    step="0.01"
                  />
                  <button
                    type="button"
                    onClick={handleAddPieza}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                  >
                    <FaPlus size={14} />
                    Agregar
                  </button>
                </div>
                {formData.piezasReemplazadas && formData.piezasReemplazadas.length > 0 && (
                  <div className={styles.piezasList}>
                    {formData.piezasReemplazadas.map((pieza, index) => (
                      <div key={index} className={styles.piezaItem}>
                        <span>{pieza.nombre} x{pieza.cantidad}</span>
                        {pieza.costo && pieza.costo > 0 && (
                          <span>${pieza.costo.toFixed(2)}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePieza(index)}
                          className={styles.removeButton}
                        >
                          <FaTimes size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Notas Adicionales</label>
              <textarea
                name="notas"
                value={formData.notas || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                className={styles.textarea}
                rows={2}
                placeholder="Notas adicionales sobre la incidencia..."
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={resetForm}
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonSubmit}`}
              >
                {editingId ? 'Actualizar' : 'Crear'} Incidencia
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Incidencias */}
      {incidencias.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            No hay incidencias registradas. Haz clic en &quot;Nueva Incidencia&quot; para comenzar.
          </p>
        </div>
      ) : (
        <div className={styles.incidenciasList}>
          {incidencias.map((incidencia) => (
            <div key={incidencia.id} className={styles.incidenciaCard}>
              <div className={styles.incidenciaCardHeader}>
                <div className={styles.incidenciaCardTitleGroup}>
                  <h3 className={styles.incidenciaCardTitle}>
                    {getTipoLabel(incidencia.tipo)}
                  </h3>
                  <div className={styles.incidenciaBadges}>
                    <span className={`${styles.statusBadge} ${getEstadoClass(incidencia.estado || 'pendiente')}`}>
                      {getEstadoLabel(incidencia.estado || 'pendiente')}
                    </span>
                    <span className={`${styles.priorityBadge} ${getPrioridadClass(incidencia.prioridad || 'media')}`}>
                      {getPrioridadLabel(incidencia.prioridad || 'media')}
                    </span>
                  </div>
                </div>
                <div className={styles.incidenciaActions}>
                  <button
                    onClick={() => handleEdit(incidencia)}
                    className={styles.iconButton}
                    title="Editar"
                  >
                    <FaEdit size={16} />
                  </button>
                  <button
                    onClick={() => incidencia.id && onDelete(incidencia.id)}
                    className={styles.iconButton}
                    title="Eliminar"
                    style={{ color: '#ef4444' }}
                  >
                    <FaTrash size={16} />
                  </button>
                </div>
              </div>
              <div className={styles.incidenciaCardBody}>
                <p className={styles.incidenciaDescription}>{incidencia.descripcion}</p>
                <div className={styles.incidenciaDetails}>
                  <div className={styles.incidenciaDetailItem}>
                    <FaCalendarAlt size={14} />
                    <span>Reporte: {toDate(incidencia.fechaReporte).toLocaleDateString('es-ES')}</span>
                  </div>
                  {incidencia.fechaProgramada && (
                    <div className={styles.incidenciaDetailItem}>
                      <FaClock size={14} />
                      <span>Programada: {toDate(incidencia.fechaProgramada).toLocaleDateString('es-ES')}</span>
                    </div>
                  )}
                  {incidencia.fechaResolucion && (
                    <div className={styles.incidenciaDetailItem}>
                      <FaCheckCircle size={14} />
                      <span>Resuelta: {toDate(incidencia.fechaResolucion).toLocaleDateString('es-ES')}</span>
                    </div>
                  )}
                  {incidencia.tecnicoAsignado && (
                    <div className={styles.incidenciaDetailItem}>
                      <FaUser size={14} />
                      <span>{incidencia.tecnicoAsignado.nombres || ''} {incidencia.tecnicoAsignado.apellidos || ''}</span>
                    </div>
                  )}
                  {incidencia.costo && incidencia.costo > 0 && (
                    <div className={styles.incidenciaDetailItem}>
                      <FaDollarSign size={14} />
                      <span>${incidencia.costo.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                {incidencia.piezasReemplazadas && incidencia.piezasReemplazadas.length > 0 && (
                  <div className={styles.piezasSection}>
                    <h4 className={styles.piezasTitle}>Piezas Reemplazadas:</h4>
                    <ul className={styles.piezasList}>
                      {incidencia.piezasReemplazadas.map((pieza, index) => (
                        <li key={index} className={styles.piezaListItem}>
                          {pieza.nombre} x{pieza.cantidad}
                          {pieza.costo && pieza.costo > 0 && (
                            <span> - ${pieza.costo.toFixed(2)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {incidencia.notas && (
                  <div className={styles.incidenciaNotas}>
                    <strong>Notas:</strong> {incidencia.notas}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

