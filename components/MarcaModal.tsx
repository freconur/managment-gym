import React from 'react'
import { FaTimes, FaSpinner } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { Marca } from '@/features/types/types'
import { useSmartSearch } from '@/features/hooks/useSmartSearch'

interface MarcaModalProps {
  isOpen: boolean
  onClose: () => void
  marcas: Marca[]
  selectedMarcaId: string
  marcaName: string
  isEditing: boolean
  onSelectMarca: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onNewMarca: () => void
  onSaveMarca: () => void
  onDeleteMarca: () => void
  onMarcaNameChange: (value: string) => void
  isSaving?: boolean
}

export const MarcaModal: React.FC<MarcaModalProps> = ({
  isOpen,
  onClose,
  marcas,
  selectedMarcaId,
  marcaName,
  isEditing,
  onSelectMarca,
  onNewMarca,
  onSaveMarca,
  onDeleteMarca,
  onMarcaNameChange,
  isSaving = false
}) => {
  const marcaSearch = useSmartSearch({
    items: marcas,
    debounceDelay: 300,
    autoSelect: false
  })

  if (!isOpen) return null

  const handleClose = () => {
    marcaSearch.clearSearch()
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Marcas</h3>
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
              Buscar Marca
            </label>
            <input
              type="text"
              value={marcaSearch.searchTerm}
              onChange={(e) => marcaSearch.setSearchTerm(e.target.value)}
              placeholder="Buscar marca por nombre..."
              className={styles.input}
              disabled={isSaving}
            />
          </div>
          <div className={styles.modalSection}>
            <label className={styles.label}>
              Seleccionar Marca {marcaSearch.filteredItems.length !== marcas.length && `(${marcaSearch.filteredItems.length} de ${marcas.length})`}
            </label>
            <select
              value={selectedMarcaId}
              onChange={(e) => {
                marcaSearch.clearSearch()
                onSelectMarca(e)
              }}
              className={styles.select}
              disabled={isSaving}
            >
              <option value="">Seleccione una marca para editar o eliminar</option>
              {marcaSearch.filteredItems.length === 0 ? (
                <option value="" disabled>No se encontraron marcas</option>
              ) : (
                marcaSearch.filteredItems.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className={styles.modalSection}>
            <div className={styles.labelContainer}>
              <label className={styles.label}>
                {isEditing ? 'Editar Marca' : 'Nueva Marca'}
              </label>
              {isEditing && (
                <button
                  type="button"
                  onClick={onNewMarca}
                  className={styles.buttonSecondary}
                  disabled={isSaving}
                >
                  Nueva Marca
                </button>
              )}
            </div>
            <div className={styles.modalInputGroup}>
              <input
                type="text"
                value={marcaName}
                onChange={(e) => onMarcaNameChange(e.target.value)}
                placeholder="Nombre de la marca"
                className={styles.input}
                disabled={isSaving}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onSaveMarca()
                  }
                }}
              />
              <div className={styles.modalButtonGroup}>
                <button
                  type="button"
                  onClick={onSaveMarca}
                  disabled={!marcaName.trim() || isSaving}
                  className={`${styles.button} ${styles.buttonPrimary} ${styles.modalButton}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', minWidth: '100px' }}
                >
                  {isSaving ? (
                    <>
                      <FaSpinner className={styles.spinner} />
                      {isEditing ? 'Guardando...' : 'Agregando...'}
                    </>
                  ) : (
                    isEditing ? 'Actualizar' : 'Agregar'
                  )}
                </button>
                {isEditing && selectedMarcaId && (
                  <button
                    type="button"
                    onClick={onDeleteMarca}
                    disabled={isSaving}
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

