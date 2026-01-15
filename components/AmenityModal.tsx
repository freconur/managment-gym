import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSave, FaCheckCircle, FaSpinner, FaConciergeBell } from 'react-icons/fa';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    Firestore
} from 'firebase/firestore';
import styles from './AccessModal.module.css'; // Reusing AccessModal styles for consistency
import { Amenity } from '@/features/types/types';

interface AmenityModalProps {
    isOpen: boolean;
    onClose: () => void;
    db: Firestore;
}

const AmenityModal: React.FC<AmenityModalProps> = ({ isOpen, onClose, db }) => {
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const q = query(collection(db, 'amenities'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Amenity[];
            setAmenities(data);
        });

        return () => unsubscribe();
    }, [isOpen, db]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        setLoading(true);
        setError('');
        try {
            await addDoc(collection(db, 'amenities'), {
                nombre: newItemName.trim(),
                createdAt: serverTimestamp()
            });
            setNewItemName('');
        } catch (err) {
            console.error("Error adding amenity", err);
            setError('Error al agregar amenidad');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar esta amenidad?')) return;
        try {
            await deleteDoc(doc(db, 'amenities', id));
        } catch (err) {
            console.error("Error deleting amenity", err);
            alert("Error al eliminar");
        }
    };

    const startUpdate = (item: Amenity) => {
        setEditingId(item.id);
        setEditingName(item.nombre);
    };

    const handleUpdate = async () => {
        if (!editingId || !editingName.trim()) return;
        try {
            await updateDoc(doc(db, 'amenities', editingId), {
                nombre: editingName.trim()
            });
            setEditingId(null);
            setEditingName('');
        } catch (err) {
            console.error("Error updating amenity", err);
            alert("Error al actualizar");
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} style={{ zIndex: 1100 }}> {/* Higher z-index than AccessModal if nested, but usually side-by-side or high enough */}
            <div className={styles.modal} style={{ maxWidth: '500px' }}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.title}>
                        <FaConciergeBell style={{ color: '#3b82f6' }} /> Gestionar Amenidades
                    </h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <form onSubmit={handleAdd} className={styles.inputGroup}>
                        <input
                            type="text"
                            placeholder="Nueva amenidad (ej. Toalla, Faja)"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className={styles.input}
                        />
                        <button
                            type="submit"
                            disabled={loading || !newItemName.trim()}
                            className={styles.searchButton} // Reuse styling
                            style={{ minWidth: '60px' }}
                        >
                            {loading ? <FaSpinner className={styles.spinAnimation} /> : <FaPlus />}
                        </button>
                    </form>

                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <div className={styles.listContainer} style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {amenities.length === 0 ? (
                            <p className={styles.noDataText}>No hay amenidades registradas</p>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {amenities.map(item => (
                                    <li key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                                        {editingId === item.id ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className={styles.input}
                                                    style={{ padding: '0.25rem 0.5rem' }}
                                                    autoFocus
                                                />
                                                <button onClick={handleUpdate} className={styles.iconButton} style={{ color: '#22c55e' }}>
                                                    <FaSave />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className={styles.iconButton} style={{ color: '#ef4444' }}>
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span style={{ fontWeight: 500, color: '#374151' }}>{item.nombre}</span>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => startUpdate(item)} className={styles.iconButton} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                        <FaEdit />
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className={styles.iconButton} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AmenityModal;
