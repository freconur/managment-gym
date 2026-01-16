import React, { useState, useEffect } from 'react';
import { FaLock, FaTimes, FaSpinner } from 'react-icons/fa';
import styles from '@/styles/MantenimientoDetailModal.module.css';

interface AdminAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void> | void;
    validateAdmin: (dni: string, pin: string) => Promise<boolean>;
}

const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    validateAdmin
}) => {
    const [dni, setDni] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setDni('');
            setPin('');
            setError('');
            setIsValidating(false);
        }
    }, [isOpen]);

    const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || (/^\d+$/.test(value) && value.length <= 8)) {
            setDni(value);
            setError('');
            if (value.length === 8) {
                const pinInput = document.getElementById('adminPinInput');
                if (pinInput) pinInput.focus();
            }
        }
    };

    const handlePinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || (/^\d+$/.test(value) && value.length <= 4)) {
            setPin(value);
            setError('');

            if (value.length === 4 && dni.length === 8) {
                setIsValidating(true);
                try {
                    const esAdmin = await validateAdmin(dni, value);
                    if (esAdmin) {
                        onClose(); // Close first or after? Original closed first.
                        setIsValidating(false);
                        await onSuccess();
                    } else {
                        setError('Acceso denegado. Solo administradores y desarrolladores pueden editar mantenimientos.');
                        setDni('');
                        setPin('');
                        setIsValidating(false);
                    }
                } catch (error) {
                    console.error('Error al validar administrador:', error);
                    setError('Error al validar credenciales. Intente nuevamente.');
                    setIsValidating(false);
                }
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={`${styles.modalContent} ${styles.modalContentAuth}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>
                        <FaLock size={20} className={styles.modalTitleIcon} />
                        Validar Administrador
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
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className={styles.formField}>
                            <label className={styles.label}>
                                DNI
                            </label>
                            <input
                                ref={(el) => {
                                    if (el && isOpen && !dni) {
                                        el.focus();
                                    }
                                }}
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={dni}
                                onChange={handleDniChange}
                                className={styles.input}
                                placeholder="Ingrese su DNI (8 dígitos)"
                                min="0"
                                max="99999999"
                            />
                        </div>
                        <div className={styles.formField}>
                            <label className={styles.label}>
                                PIN de Seguridad
                            </label>
                            <input
                                id="adminPinInput"
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={pin}
                                onChange={handlePinChange}
                                className={styles.input}
                                placeholder="Ingrese su PIN (4 dígitos)"
                                min="0"
                                max="9999"
                                disabled={isValidating}
                            />
                            {isValidating && (
                                <div className={styles.modalValidatingContainer}>
                                    <FaSpinner className={styles.spinAnimation} />
                                    <span>Validando credenciales...</span>
                                </div>
                            )}
                            {error && !isValidating && (
                                <p className={styles.modalErrorMessage}>
                                    {error === 'Error de autenticación' ? 'DNI o PIN incorrecto' : error}
                                </p>
                            )}
                        </div>
                        <div className={styles.modalButtonGroup}>
                            <button
                                type="button"
                                onClick={onClose}
                                className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton} ${styles.buttonFullWidth}`}
                                disabled={isValidating}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminAuthModal;
