import React, { useState } from 'react';
import { FaLock, FaTimes, FaCheck } from 'react-icons/fa';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { app } from '@/firebase/firebase.config';

interface PinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
}

const db = getFirestore(app);

const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess, title = "Ingrese PIN de Seguridad" }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Check against 'pin' library/collection
            const pinCollection = collection(db, 'pin');
            const snapshot = await getDocs(pinCollection);

            let isValid = false;
            snapshot.forEach(doc => {
                const data = doc.data();
                // Check various possible field names or just if the doc contains the pin
                if (String(data.pin) === pin || String(data.code) === pin || String(data.value) === pin) {
                    isValid = true;
                }
            });

            // Hardcode fallback for '2026' if DB is empty or fails, as requested by user initially
            // But prefer DB.
            if (!isValid && pin === '2026') {
                // isValid = true; // Uncomment if we want hardcoded fallback
            }

            if (isValid) {
                onSuccess();
                setPin('');
                onClose();
            } else {
                setError('PIN incorrecto');
            }
        } catch (err) {
            console.error("Error verifying PIN:", err);
            setError('Error al verificar PIN. Revise la consola.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '1rem',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#1f2937' }}>
                    <FaLock /> {title}
                </h3>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="****"
                        maxLength={6}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1.5rem',
                            letterSpacing: '0.5rem',
                            textAlign: 'center',
                            borderRadius: '0.5rem',
                            border: '2px solid #e5e7eb',
                            marginBottom: '1rem',
                            outline: 'none'
                        }}
                        autoFocus
                    />

                    {error && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <FaTimes /> Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !pin}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                opacity: (loading || !pin) ? 0.7 : 1
                            }}
                        >
                            {loading ? '...' : <><FaCheck /> Confirmar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PinModal;
