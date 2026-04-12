import React, { useState } from 'react';
import styles from './AdminPinModal.module.css';
import { FaLock, FaTimes, FaShieldAlt } from 'react-icons/fa';

interface AdminPinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    expectedPin?: string; // Prop opcional para PIN dinámico
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    expectedPin = '2026' // Fallback a 2026 si no hay PIN en DB
}) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleVerify = (value: string) => {
        if (value === expectedPin) {
            onSuccess();
            setPin('');
            onClose();
        } else {
            setError('PIN incorrecto. Intente de nuevo.');
            setPin('');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
        setPin(val);
        setError(''); // Clear error on change

        if (val.length === 4) {
            // Use a small timeout to let the user see the last digit if needed, 
            // or just execute immediately for speed as requested.
            setTimeout(() => handleVerify(val), 100);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length === 4) {
            handleVerify(pin);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        <FaShieldAlt style={{ color: '#3b82f6' }} />
                        Autorización
                    </h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <FaTimes size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className={styles.body}>
                        <p className={styles.description}>
                            Esta acción requiere autorización. Ingrese el PIN de 4 dígitos para continuar.
                        </p>

                        <input
                            type="password"
                            className={styles.pinInput}
                            value={pin}
                            onChange={handleChange}
                            placeholder="****"
                            autoFocus
                        />

                        {error && (
                            <div className={styles.error}>
                                {error}
                            </div>
                        )}
                    </div>

                    <div className={styles.footer}>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={pin.length < 4}
                        >
                            <FaLock size={14} /> Verificar y Continuar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
