import React, { useState } from 'react';
import styles from '@/styles/AssignUserModal.module.css'; // Reusing styles
import { FaLock, FaTimes, FaUser } from 'react-icons/fa';
import { Usuario } from '@/features/types/types';

interface ChecklistPinModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignedUser?: Usuario | null;
    onSuccess: (user: Usuario) => void;
    validateUser: (dni: string, pin: string) => Promise<Usuario | null>;
}

export const ChecklistPinModal: React.FC<ChecklistPinModalProps> = ({
    isOpen,
    onClose,
    assignedUser,
    onSuccess,
    validateUser
}) => {
    const [pin, setPin] = useState('');
    const [dni, setDni] = useState(''); // Only used if no assigned user
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const targetDni = assignedUser ? assignedUser.dni : dni;

        if (!targetDni || !pin) {
            setError('Por favor complete todos los campos');
            return;
        }

        try {
            setIsSubmitting(true);
            const user = await validateUser(targetDni, pin);
            if (user) {
                // Check if user matches assigned user if strictness is needed, 
                // but if we are here, validateUser returned a user matching the DNI.
                onSuccess(user);
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

                <form onSubmit={handleSubmit}>
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
                                />
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {assignedUser ? 'Ingresa tu PIN para continuar' : 'Ingresa tu PIN'}
                            </label>
                            <input
                                type="password"
                                className={styles.input}
                                value={pin}
                                onChange={(e) => {
                                    setPin(e.target.value);
                                    setError('');
                                }}
                                placeholder="****"
                                maxLength={4}
                                autoFocus={!!assignedUser}
                            />
                        </div>

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
                            disabled={isSubmitting || !pin}
                        >
                            {isSubmitting ? 'Verificando...' : 'Continuar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
