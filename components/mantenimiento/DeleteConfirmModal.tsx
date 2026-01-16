import React from 'react';
import { FaTrash, FaTimes } from 'react-icons/fa';
import styles from '@/styles/MantenimientoDetailModal.module.css';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isDeleting
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={`${styles.modalContent} ${styles.modalContentAuth}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>
                        <FaTrash size={20} className={styles.modalTitleIconDanger} />
                        Confirmar Eliminación
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
                    <p className={styles.modalConfirmText}>
                        ¿Está seguro de que desea eliminar este mantenimiento? Esta acción no se puede deshacer.
                    </p>
                    <div className={styles.modalButtonGroup}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isDeleting}
                            className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className={`${styles.button} ${styles.modalButton} ${styles.buttonDanger}`}
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
