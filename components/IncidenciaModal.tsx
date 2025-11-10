import React, { useState } from 'react'
import { FaExclamationCircle, FaTimes, FaTools, FaCalendarAlt, FaUser, FaIdCard } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { useManagment } from '@/features/hooks/useManagment'
import { Usuario } from '@/features/types/types'

interface IncidenciaModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    tipo: 'incidencia'
    maquinaDejoFuncionar: boolean
    piezaRota: boolean
    nombrePiezaRota: string
    fechaProgramada: Date
    fechaReporte: Date
    descripcion: string
    prioridad: 'baja' | 'media' | 'alta' | 'urgente'
    usuario?: Usuario
  }) => Promise<void>
  usuariosValidate: Usuario
}

export const IncidenciaModal: React.FC<IncidenciaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  usuariosValidate
}) => {
  /* const { usuariosValidate } = useManagment() */
  const [incidenciaForm, setIncidenciaForm] = useState({
    tipo: 'incidencia' as const,
    maquinaDejoFuncionar: false,
    piezaRota: false,
    nombrePiezaRota: '',
    fechaReporte: new Date(),
    fechaProgramada: new Date(),
    descripcion: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'urgente',
    usuario: usuariosValidate
  })

  // Función helper para convertir Date a string YYYY-MM-DD sin problemas de zona horaria
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      /* setIncidenciaForm({...incidenciaForm,usuario:usuariosValidate}) */
      await onSubmit({...incidenciaForm,usuario:usuariosValidate})
      // Resetear formulario después de enviar
      setIncidenciaForm({
        tipo: 'incidencia',
        maquinaDejoFuncionar: false,
        piezaRota: false,
        nombrePiezaRota: '',
        fechaReporte: new Date(),
        fechaProgramada: new Date(),
        descripcion: '',
        prioridad: 'media',
        usuario: {}
      })
    } catch (error) {
      console.error('Error al guardar incidencia:', error)
    }
  }

  if (!isOpen) return null
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <FaExclamationCircle size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Reportar Incidencia
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
          {/* Información del usuario validado */}
          {usuariosValidate && usuariosValidate.dni && (
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '1rem', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '0.75rem',
                color: '#374151',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}>
                <FaUser size={16} style={{ marginRight: '0.5rem' }} />
                Información del Usuario
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Nombres</span>
                  <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                    {usuariosValidate.nombres || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Apellidos</span>
                  <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                    {usuariosValidate.apellidos || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                    <FaIdCard size={12} style={{ marginRight: '0.25rem', display: 'inline' }} />
                    DNI
                  </span>
                  <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                    {usuariosValidate.dni || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaExclamationCircle size={14} style={{ marginRight: '0.5rem' }} />
                  ¿La máquina dejó de funcionar? *
                </label>
                <select
                  value={incidenciaForm.maquinaDejoFuncionar ? 'true' : 'false'}
                  onChange={(e) => setIncidenciaForm(prev => ({ ...prev, maquinaDejoFuncionar: e.target.value === 'true' }))}
                  className={styles.select}
                  required
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaTools size={14} style={{ marginRight: '0.5rem' }} />
                  ¿Se rompió alguna pieza? *
                </label>
                <select
                  value={incidenciaForm.piezaRota ? 'true' : 'false'}
                  onChange={(e) => setIncidenciaForm(prev => ({ ...prev, piezaRota: e.target.value === 'true' }))}
                  className={styles.select}
                  required
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>

              {incidenciaForm.piezaRota && (
                <div className={styles.formField}>
                  <label className={styles.label}>Nombre de la pieza rota *</label>
                  <input
                    type="text"
                    value={incidenciaForm.nombrePiezaRota}
                    onChange={(e) => setIncidenciaForm(prev => ({ ...prev, nombrePiezaRota: e.target.value }))}
                    className={styles.input}
                    required={incidenciaForm.piezaRota}
                    placeholder="Ej: Correa, Motor, Batería, etc."
                  />
                </div>
              )}

              {/* <div className={styles.formField}>
                <label className={styles.label}>
                  <FaCalendarAlt size={14} style={{ marginRight: '0.5rem' }} />
                  Fecha del reporte *
                </label>
                <input
                  type="date"
                  value={incidenciaForm.fechaReporte}
                  onChange={(e) => setIncidenciaForm(prev => ({ ...prev, fechaReporte: e.target.value }))}
                  className={styles.input}
                  required
                />
              </div> */}

              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaCalendarAlt size={14} style={{ marginRight: '0.5rem' }} />
                  Fecha del reporte *
                </label>
                <input
                  type="date"
                  value={formatDateToString(incidenciaForm.fechaProgramada)}
                  onChange={(e) => {
                    const fecha = new Date(e.target.value)
                    setIncidenciaForm(prev => ({ ...prev, fechaProgramada: fecha }))
                  }}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Prioridad *</label>
                <select
                  value={incidenciaForm.prioridad}
                  onChange={(e) => setIncidenciaForm(prev => ({ ...prev, prioridad: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Descripción adicional del problema</label>
              <textarea
                value={incidenciaForm.descripcion}
                onChange={(e) => setIncidenciaForm(prev => ({ ...prev, descripcion: e.target.value }))}
                className={styles.textarea}
                rows={4}
                placeholder="Describe detalladamente el problema, qué estaba haciendo cuando ocurrió, síntomas observados, etc..."
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
                Reportar Incidencia
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

