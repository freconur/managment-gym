import React from 'react'
import { FaTimes } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'

interface DeleteMarcaModalProps {
  isOpen: boolean
  marcaName: string
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteMarcaModal: React.FC<DeleteMarcaModalProps> = ({
  isOpen,
  marcaName,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Confirmar Eliminación</h3>
          <button
            type="button"
            onClick={onCancel}
            className={styles.modalCloseButton}
            aria-label="Cerrar modal"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.deleteMessage}>
            ¿Está seguro de que desea eliminar la marca{' '}
            <strong>{marcaName}</strong>?
          </p>
          <p className={styles.deleteWarning}>
            Esta acción no se puede deshacer.
          </p>
          <div className={styles.modalButtonGroup}>
            <button
              type="button"
              onClick={onCancel}
              className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`${styles.button} ${styles.buttonDanger} ${styles.modalButton}`}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

