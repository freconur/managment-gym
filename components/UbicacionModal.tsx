import React from 'react'
import { FaTimes } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { Ubicacion } from '@/features/hooks/useManagment'
import { useSmartSearch } from '@/features/hooks/useSmartSearch'

interface UbicacionModalProps {
  isOpen: boolean
  onClose: () => void
  ubicaciones: Ubicacion[]
  selectedUbicacionId: string
  ubicacionName: string
  isEditing: boolean
  onSelectUbicacion: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onNewUbicacion: () => void
  onSaveUbicacion: () => void
  onDeleteUbicacion: () => void
  onUbicacionNameChange: (value: string) => void
}

export const UbicacionModal: React.FC<UbicacionModalProps> = ({
  isOpen,
  onClose,
  ubicaciones,
  selectedUbicacionId,
  ubicacionName,
  isEditing,
  onSelectUbicacion,
  onNewUbicacion,
  onSaveUbicacion,
  onDeleteUbicacion,
  onUbicacionNameChange
}) => {
  const ubicacionSearch = useSmartSearch({
    items: ubicaciones,
    debounceDelay: 300,
    autoSelect: false
  })

  if (!isOpen) return null

  const handleClose = () => {
    ubicacionSearch.clearSearch()
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Ubicaciones</h3>
          <button
            type="button"
            onClick={handleClose}
            className={styles.modalCloseButton}
            aria-label="Cerrar modal"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalSection}>
            <label className={styles.label}>
              Buscar Ubicación
            </label>
            <input
              type="text"
              value={ubicacionSearch.searchTerm}
              onChange={(e) => ubicacionSearch.setSearchTerm(e.target.value)}
              placeholder="Buscar ubicación por nombre..."
              className={styles.input}
            />
          </div>
          <div className={styles.modalSection}>
            <label className={styles.label}>
              Seleccionar Ubicación {ubicacionSearch.filteredItems.length !== ubicaciones.length && `(${ubicacionSearch.filteredItems.length} de ${ubicaciones.length})`}
            </label>
            <select
              value={selectedUbicacionId}
              onChange={(e) => {
                ubicacionSearch.clearSearch()
                onSelectUbicacion(e)
              }}
              className={styles.select}
            >
              <option value="">Seleccione una ubicación para editar o eliminar</option>
              {ubicacionSearch.filteredItems.length === 0 ? (
                <option value="" disabled>No se encontraron ubicaciones</option>
              ) : (
                ubicacionSearch.filteredItems.map((ubicacion) => (
                  <option key={ubicacion.id} value={ubicacion.id}>
                    {ubicacion.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className={styles.modalSection}>
            <div className={styles.labelContainer}>
              <label className={styles.label}>
                {isEditing ? 'Editar Ubicación' : 'Nueva Ubicación'}
              </label>
              {isEditing && (
                <button
                  type="button"
                  onClick={onNewUbicacion}
                  className={styles.buttonSecondary}
                >
                  Nueva Ubicación
                </button>
              )}
            </div>
            <div className={styles.modalInputGroup}>
              <input
                type="text"
                value={ubicacionName}
                onChange={(e) => onUbicacionNameChange(e.target.value)}
                placeholder="Nombre de la ubicación"
                className={styles.input}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onSaveUbicacion()
                  }
                }}
              />
              <div className={styles.modalButtonGroup}>
                <button
                  type="button"
                  onClick={onSaveUbicacion}
                  disabled={!ubicacionName.trim()}
                  className={`${styles.button} ${styles.buttonPrimary} ${styles.modalButton}`}
                >
                  {isEditing ? 'Actualizar' : 'Agregar'}
                </button>
                {isEditing && selectedUbicacionId && (
                  <button
                    type="button"
                    onClick={onDeleteUbicacion}
                    className={`${styles.button} ${styles.buttonDanger} ${styles.modalButton}`}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

