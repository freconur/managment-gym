import React, { useState } from 'react';
import styles from '@/styles/AssignUserModal.module.css'; // Reusing styles
import { FaLock, FaTimes, FaUser } from 'react-icons/fa';
import { Usuario } from '@/features/types/types';

interface ChecklistPinModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignedUser?: Usuario | null;
    onSuccess: (user: Usuario) => Promise<void> | void;
    validateUser: (dni: string) => Promise<Usuario | null>;
}

export const ChecklistPinModal: React.FC<ChecklistPinModalProps> = ({
    isOpen,
    onClose,
    assignedUser,
    onSuccess,
    validateUser
}) => {

    const [dni, setDni] = useState(''); // Only used if no assigned user
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const targetDni = assignedUser ? assignedUser.dni : dni;

        if (!targetDni) {
            setError('Por favor complete todos los campos');
            return;
        }

        try {
            setIsSubmitting(true);
            const user = await validateUser(targetDni);
            if (user) {
                // Wait for the success callback to finish (e.g., checklist creation/navigation)
                await Promise.resolve(onSuccess(user));
                onClose();
            } else {
                setError('Credenciales incorrectas');
            }
        } catch (err) {
            console.error(err);
            setError('Error de validación');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>
                        <FaLock />
                        {assignedUser ? `Hola, ${assignedUser.nombres}` : 'Identificación'}
                    </h3>
                    <button className={styles.modalCloseButton} onClick={onClose}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className={styles.modalBody}>
                        {!assignedUser && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Ingresa tu DNI</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={dni}
                                    onChange={(e) => setDni(e.target.value)}
                                    placeholder="DNI del encargado"
                                    autoFocus
                                    name="user_dni_search"
                                    autoComplete="off"
                                />
                            </div>
                        )}



                        {error && (
                            <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                {error}
                            </div>
                        )}
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={`${styles.button} ${styles.buttonCancel}`} onClick={onClose}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={`${styles.button} ${styles.buttonSubmit}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                assignedUser ? 'Iniciando revisión...' : 'Verificando...'
                            ) : 'Continuar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
