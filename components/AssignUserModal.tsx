import React, { useState } from 'react';
import styles from '@/styles/AssignUserModal.module.css';
import { FaTimes, FaUserCog, FaCalendarAlt } from 'react-icons/fa';
import { Usuario } from '@/features/types/types';

interface AssignUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    usuarios: Usuario[];
    onAssign: (userId: string, startDate: string, endDate: string) => Promise<void>;
}

export const AssignUserModal: React.FC<AssignUserModalProps> = ({
    isOpen,
    onClose,
    usuarios,
    onAssign
}) => {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId || !startDate || !endDate) return;

        try {
            setIsSubmitting(true);
            await onAssign(selectedUserId, startDate, endDate);
            onClose();
        } catch (error) {
            console.error('Error assigning user:', error);
            alert('Error al asignar usuario');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>
                        <FaUserCog />
                        Configurar Encargado
                    </h3>
                    <button className={styles.modalCloseButton} onClick={onClose}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Seleccionar Usuario</label>
                            <select
                                className={styles.select}
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                required
                            >
                                <option value="">-- Seleccionar --</option>
                                {usuarios.map(user => (
                                    <option key={user.dni} value={user.dni}>
                                        {user.nombres} {user.apellidos}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.dateRangeGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    <FaCalendarAlt style={{ marginRight: '0.5rem' }} />
                                    Desde
                                </label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    <FaCalendarAlt style={{ marginRight: '0.5rem' }} />
                                    Hasta
                                </label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                    min={startDate}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={`${styles.button} ${styles.buttonCancel}`} onClick={onClose}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={`${styles.button} ${styles.buttonSubmit}`}
                            disabled={isSubmitting || !selectedUserId}
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar Asignación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
