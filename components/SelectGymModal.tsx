import React from 'react';
import styles from '@/styles/SelectGymModal.module.css';
import { FaTimes, FaBuilding, FaChevronRight } from 'react-icons/fa';

interface Ubicacion {
    id?: string;
    name?: string;
}

interface SelectGymModalProps {
    isOpen: boolean;
    onClose: () => void;
    ubicaciones: Ubicacion[];
    onSelect: (gymId: string, gymName: string) => void;
}

export const SelectGymModal: React.FC<SelectGymModalProps> = ({
    isOpen,
    onClose,
    ubicaciones,
    onSelect
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>
                        <FaBuilding />
                        Seleccionar Ambiente
                    </h3>
                    <button className={styles.modalCloseButton} onClick={onClose}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.gymGrid}>
                        {ubicaciones.length === 0 ? (
                            <p className={styles.emptyState}>No hay sedes registradas.</p>
                        ) : (
                            ubicaciones.map((gym) => (
                                <button
                                    key={gym.id}
                                    className={styles.gymCard}
                                    onClick={() => onSelect(gym.id || '', gym.name || '')}
                                >
                                    <div className={styles.gymIcon}>
                                        <FaBuilding size={20} />
                                    </div>
                                    <div className={styles.gymInfo}>
                                        <div className={styles.gymName}>{gym.name}</div>
                                        <div className={styles.gymSubtitle}>Iniciar checklist para esta sede</div>
                                    </div>
                                    <FaChevronRight size={16} color="var(--text-secondary)" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
