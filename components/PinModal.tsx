import React, { useState, useRef, useEffect } from 'react';
import { FaLock, FaTimes, FaCheck } from 'react-icons/fa';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/firebase.config';

interface PinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
}


const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess, title = "Ingrese PIN de Seguridad" }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [validPins, setValidPins] = useState<string[]>([]);
    const [fetching, setFetching] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen && !fetching) {
            // Small timeout to ensure render
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, fetching]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Fetch valid PINs on mount
    React.useEffect(() => {
        if (!isOpen) return;

        const fetchPins = async () => {
            setFetching(true);
            try {
                const pinCollection = collection(db, 'pin');
                const snapshot = await getDocs(pinCollection);
                const pins: string[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.pin) pins.push(String(data.pin));
                    if (data.code) pins.push(String(data.code));
                    if (data.value) pins.push(String(data.value));
                });

                // Add fallback if list is empty, though based on previous code it was conditional
                // strict check against DB is better.
                if (pins.length === 0) {
                    // Optional: debug log or fallback
                    // console.log("No PINs found in DB");
                }

                setValidPins(pins);
            } catch (err) {
                console.error("Error fetching PINs:", err);
                setError('Error al cargar sistema de seguridad');
            } finally {
                setFetching(false);
            }
        };

        fetchPins();
        setPin('');
        setError('');
    }, [isOpen]);

    const handlePinChange = (value: string) => {
        setPin(value);
        setError('');

        if (fetching) return;

        // Check exact match
        if (validPins.includes(value)) {
            onSuccess();
            setPin('');
            onClose();
            return;
        }

        // Check if it's a valid prefix or potential PIN
        // If the value is NOT a prefix of any valid PIN, and length >= 4, show error
        const isPotential = validPins.some(p => p.startsWith(value));
        if (!isPotential && value.length >= 4) {
            setError('PIN incorrecto');
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
                <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#1f2937', textTransform: 'uppercase' }}>
                    <FaLock /> {title}
                </h3>

                <div>
                    <input
                        ref={inputRef}
                        type="password"
                        name="pin_security_code"
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={pin}
                        onChange={(e) => handlePinChange(e.target.value)}
                        placeholder="****"
                        maxLength={6}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1.5rem',
                            letterSpacing: '0.5rem',
                            textAlign: 'center',
                            borderRadius: '0.5rem',
                            border: `2px solid ${error ? '#ef4444' : '#e5e7eb'}`,
                            marginBottom: '1rem',
                            outline: 'none',
                            color: '#1f2937'
                        }}
                        autoFocus
                        disabled={fetching}
                    />

                    {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</p>}

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
                                gap: '0.5rem',
                                color: '#4b5563',
                                textTransform: 'uppercase'
                            }}
                        >
                            <FaTimes /> Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PinModal;
