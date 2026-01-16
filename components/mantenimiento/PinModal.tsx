import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { FaLock, FaTimes } from 'react-icons/fa';
import styles from '@/styles/MantenimientoDetailModal.module.css';

interface PinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    validatePin: (pin: string) => string | boolean; // Returns true if valid, or error message string if invalid
}

const PinModal: React.FC<PinModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    validatePin
}) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPin('');
            setError('');
        }
    }, [isOpen]);

    const handlePinChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || (/^\d+$/.test(value) && value.length <= 4)) {
            setPin(value);
            setError('');
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const result = validatePin(pin);
        if (result === true) {
            onSuccess();
            onClose(); // Optional: Close on success? The parent usually handles UI changes.
        } else {
            setError(typeof result === 'string' ? result : 'PIN incorrecto');
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
                        Validar PIN
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
                    <form onSubmit={handleSubmit}>
                        <div className={styles.formField}>
                            <label className={styles.label}>
                                Ingrese su PIN de técnico
                            </label>
                            <input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={pin}
                                onChange={handlePinChange}
                                className={styles.input}
                                placeholder="Ingrese su PIN (4 dígitos)"
                                autoFocus
                                maxLength={4}
                            />
                            {error && (
                                <p className={styles.modalErrorMessage}>
                                    {error}
                                </p>
                            )}
                        </div>
                        <div className={styles.modalButtonGroup}>
                            <button
                                type="button"
                                onClick={onClose}
                                className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton}`}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className={`${styles.button} ${styles.buttonSubmit} ${styles.modalButton}`}
                            >
                                Validar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PinModal;
