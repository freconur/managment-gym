import React, { useState, useEffect } from 'react'
import { FaTimes, FaEdit, FaSave, FaTrash } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { Machine } from '@/features/types/types'
import { Marca } from '@/features/types/types'
import { Ubicacion } from '@/features/hooks/useManagment'
import { estadoDeMaquina } from '@/utils/data'
import { DeleteMachineModal } from './DeleteMachineModal'
import { AuthModal } from './AuthModal'

interface MachineDetailsModalProps {
  isOpen: boolean
  machine: Machine | null
  onClose: () => void
  onUpdate: (id: string, machine: Partial<Machine>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  marcas: Marca[]
  ubicaciones: Ubicacion[]
  validateSiEsAdmin?: (dni: string, pin: string) => Promise<boolean>
}

export const MachineDetailsModal: React.FC<MachineDetailsModalProps> = ({
  isOpen,
  machine,
  onClose,
  onUpdate,
  onDelete,
  marcas,
  ubicaciones,
  validateSiEsAdmin
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMachine, setEditedMachine] = useState<Partial<Machine>>({})
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState<string>('')
  const [authType, setAuthType] = useState<'save' | 'delete'>('save')

  useEffect(() => {
    if (machine) {
      setEditedMachine({
        name: machine.name || '',
        brand: machine.brand || '',
        model: machine.model || '',
        purchaseDate: machine.purchaseDate || '',
        location: machine.location || '',
        status: machine.status || 'active',
        notes: machine.notes || ''
      })
    }
  }, [machine])

  if (!isOpen || !machine) return null

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (machine) {
      setEditedMachine({
        name: machine.name || '',
        brand: machine.brand || '',
        model: machine.model || '',
        purchaseDate: machine.purchaseDate || '',
        location: machine.location || '',
        status: machine.status || 'active',
        notes: machine.notes || ''
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditedMachine(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    if (!machine?.id) return
    
    // Si hay función de validación, mostrar modal de autenticación primero
    if (validateSiEsAdmin) {
      setAuthType('save')
      setShowAuthModal(true)
      setAuthError('')
      return
    }
    
    // Si no hay validación, guardar directamente
    await performSave()
  }

  const performSave = async () => {
    if (!machine?.id) return
    
    try {
      await onUpdate(machine.id, editedMachine)
      setIsEditing(false)
      setShowAuthModal(false)
    } catch (error) {
      console.error('Error al actualizar máquina:', error)
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
        // Si es admin, proceder con la acción
        setShowAuthModal(false)
        setAuthError('')
        
        if (authType === 'save') {
          await performSave()
        } else if (authType === 'delete') {
          setIsDeleteModalOpen(true)
        }
      } else {
        setAuthError('Acceso denegado. Solo administradores y desarrolladores pueden realizar esta acción.')
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

  const handleDeleteClick = () => {
    // Si hay función de validación, mostrar modal de autenticación primero
    if (validateSiEsAdmin) {
      setAuthType('delete')
      setShowAuthModal(true)
      setAuthError('')
      return
    }
    
    // Si no hay validación, abrir modal de eliminación directamente
    setIsDeleteModalOpen(true)
  }

  const getStatusValue = (status?: string) => {
    if (status === 'active') return '1'
    if (status === 'maintenance') return '2'
    if (status === 'inactive') return '3'
    return '1'
  }

  const getStatusFromValue = (value: string) => {
    if (value === '1') return 'active'
    if (value === '2') return 'maintenance'
    if (value === '3') return 'inactive'
    return 'active'
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

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Detalles del Equipo</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleEdit}
                  className={styles.modalCloseButton}
                  aria-label="Editar equipo"
                  title="Editar"
                >
                  <FaEdit size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className={styles.modalCloseButton}
                  aria-label="Eliminar equipo"
                  title="Eliminar"
                  style={{ color: '#ef4444' }}
                >
                  <FaTrash size={20} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  className={styles.modalCloseButton}
                  aria-label="Guardar cambios"
                  title="Guardar"
                >
                  <FaSave size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className={styles.modalCloseButton}
                  aria-label="Cancelar edición"
                  title="Cancelar"
                >
                  <FaTimes size={20} />
                </button>
              </>
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
          <div className={styles.modalSection}>
            <h4 style={{ marginBottom: '1rem', color: '#111827', fontSize: '1.125rem', fontWeight: 600 }}>
              Información General
            </h4>
            <div className={styles.cardGrid}>
              <div>
                <p className={styles.cardLabel}>Nombre</p>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={editedMachine.name || ''}
                    onChange={handleChange}
                    className={styles.input}
                  />
                ) : (
                  <p className={styles.cardValue}>{machine.name || 'N/A'}</p>
                )}
              </div>
              <div>
                <p className={styles.cardLabel}>Marca</p>
                {isEditing ? (
                  <select
                    name="brand"
                    value={editedMachine.brand || ''}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="">Seleccione una marca</option>
                    {marcas.map((marca) => (
                      <option key={marca.id} value={marca.name}>
                        {marca.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={styles.cardValue}>{machine.brand || 'N/A'}</p>
                )}
              </div>
              <div>
                <p className={styles.cardLabel}>Modelo</p>
                {isEditing ? (
                  <input
                    type="text"
                    name="model"
                    value={editedMachine.model || ''}
                    onChange={handleChange}
                    className={styles.input}
                  />
                ) : (
                  <p className={styles.cardValue}>{machine.model || 'N/A'}</p>
                )}
              </div>
              <div>
                <p className={styles.cardLabel}>Fecha de Compra</p>
                {isEditing ? (
                  <input
                    type="date"
                    name="purchaseDate"
                    value={editedMachine.purchaseDate || ''}
                    onChange={handleChange}
                    className={styles.input}
                  />
                ) : (
                  <p className={styles.cardValue}>
                    {machine.purchaseDate 
                      ? new Date(machine.purchaseDate).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'N/A'}
                  </p>
                )}
              </div>
              <div>
                <p className={styles.cardLabel}>Ubicación</p>
                {isEditing ? (
                  <select
                    name="location"
                    value={editedMachine.location || ''}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="">Seleccione una ubicación</option>
                    {ubicaciones.map((ubicacion) => (
                      <option key={ubicacion.id} value={ubicacion.name}>
                        {ubicacion.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={styles.cardValue}>{machine.location || 'N/A'}</p>
                )}
              </div>
              <div>
                <p className={styles.cardLabel}>Estado</p>
                {isEditing ? (
                  <select
                    name="status"
                    value={getStatusValue(editedMachine.status)}
                    onChange={(e) => {
                      setEditedMachine(prev => ({
                        ...prev,
                        status: getStatusFromValue(e.target.value) as 'active' | 'maintenance' | 'inactive'
                      }))
                    }}
                    className={styles.select}
                  >
                    {estadoDeMaquina.map((estado) => (
                      <option key={estado.id} value={estado.id}>
                        {estado.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`${styles.statusBadge} ${getStatusClass(machine.status)}`}>
                    {getStatusLabel(machine.status)}
                  </span>
                )}
              </div>
              {machine.id && (
                <div>
                  <p className={styles.cardLabel}>ID</p>
                  <p className={styles.cardValueId}>{machine.id}</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.modalSection}>
            <h4 style={{ marginBottom: '1rem', color: '#111827', fontSize: '1.125rem', fontWeight: 600 }}>
              Notas
            </h4>
            {isEditing ? (
              <textarea
                name="notes"
                value={editedMachine.notes || ''}
                onChange={handleChange}
                rows={3}
                className={styles.textarea}
              />
            ) : (
              <div className={styles.cardNotes}>
                <p className={styles.cardNotesText}>{machine.notes || 'Sin notas'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
        onAccept={handleAuthAccept}
        error={authError}
      />
      <DeleteMachineModal
        isOpen={isDeleteModalOpen}
        machineName={machine?.name || ''}
        onConfirm={async () => {
          if (machine?.id) {
            await onDelete(machine.id)
            setIsDeleteModalOpen(false)
            onClose()
          }
        }}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  )
}

