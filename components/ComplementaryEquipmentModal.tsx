import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaEdit, FaTrash, FaBoxOpen, FaSpinner } from 'react-icons/fa';
import styles from '@/styles/equipment.module.css';
import { ComplementaryEquipment } from '@/features/types/types';
import { useComplementaryEquipment } from '@/features/hooks/useComplementaryEquipment';
import { useManagment } from '@/features/hooks/useManagment';

interface ComplementaryEquipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ComplementaryEquipmentModal: React.FC<ComplementaryEquipmentModalProps> = ({
    isOpen,
    onClose
}) => {
    const {
        equipment,
        getComplementaryEquipment,
        createComplementaryEquipment,
        updateComplementaryEquipment,
        deleteComplementaryEquipment,
        loading
    } = useComplementaryEquipment();
    const { ubicaciones, getUbicaciones } = useManagment();

    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingItem, setEditingItem] = useState<ComplementaryEquipment | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<ComplementaryEquipment>>({
        name: '',
        location: '',
        quantity: 1,
        status: 'active',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            const unsubscribe = getComplementaryEquipment();
            const unsubscribeUbicaciones = getUbicaciones();
            return () => {
                unsubscribe();
                unsubscribeUbicaciones();
            };
        }
    }, [isOpen, getComplementaryEquipment, getUbicaciones]);

    const resetForm = () => {
        setFormData({
            name: '',
            location: '',
            quantity: 1,
            status: 'active',
            notes: ''
        });
        setEditingItem(null);
        setView('list');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleEdit = (item: ComplementaryEquipment) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            location: item.location || '',
            quantity: item.quantity || 1,
            status: item.status,
            notes: item.notes || ''
        });
        setView('form');
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este equipo complementario?')) {
            await deleteComplementaryEquipment(id);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || isSubmitting) return;

        try {
            setIsSubmitting(true);
            if (editingItem && editingItem.id) {
                await updateComplementaryEquipment(editingItem.id, formData);
            } else {
                await createComplementaryEquipment(formData as Omit<ComplementaryEquipment, 'id'>);
            }
            resetForm();
        } catch (error) {
            console.error("Error saving equipment:", error);
            alert("Error al guardar el equipo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitleGroup}>
                        <FaBoxOpen size={24} style={{ color: '#3b82f6' }} />
                        <h3 className={styles.modalTitle}>
                            {view === 'list' ? 'Equipos Complementarios' : (editingItem ? 'Editar Equipo' : 'Nuevo Equipo')}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className={styles.modalCloseButton}
                        aria-label="Cerrar modal"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {view === 'list' ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                <button
                                    onClick={() => setView('form')}
                                    className={`${styles.button} ${styles.buttonPrimary}`}
                                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                                >
                                    <FaPlus size={12} /> Nuevo Equipo
                                </button>
                            </div>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>
                            ) : equipment.length === 0 ? (
                                <div className={styles.emptyState} style={{ padding: '2rem' }}>
                                    <p className={styles.emptyStateText}>No hay equipos complementarios registrados.</p>
                                </div>
                            ) : (
                                <div className={styles.tableContainer}>
                                    <table className={styles.equipmentTable}>
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Ubicación</th>
                                                <th>Cant.</th>
                                                <th>Estado</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {equipment.map((item) => (
                                                <tr key={item.id}>
                                                    <td style={{ fontWeight: 500 }}>{item.name.toUpperCase()}</td>
                                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {(item.location || 'Sin ubicación').toUpperCase()}
                                                    </td>
                                                    <td>{item.quantity}</td>
                                                    <td>
                                                        <span className={`${styles.statusBadge} ${item.status === 'active' ? styles.statusActive : styles.statusInactive
                                                            }`}>
                                                            {item.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className={styles.tableActionButton}
                                                                title="Editar"
                                                            >
                                                                <FaEdit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => item.id && handleDelete(item.id)}
                                                                className={styles.tableActionButton}
                                                                title="Eliminar"
                                                                style={{ color: '#ef4444' }}
                                                            >
                                                                <FaTrash size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className={styles.modalSection}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                                        <label className={styles.label}>Nombre *</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase() })}
                                            required
                                            placeholder="Ej. Mancuernas, Colchonetas..."
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className={styles.formField}>
                                        <label className={styles.label}>Ubicación</label>
                                        <select
                                            className={styles.select}
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            disabled={isSubmitting}
                                        >
                                            <option value="">Seleccione una ubicación</option>
                                            {ubicaciones.map((u) => (
                                                <option key={u.id} value={u.name}>
                                                    {u.name.toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.formField}>
                                        <label className={styles.label}>Cantidad</label>
                                        <input
                                            type="number"
                                            className={styles.input}
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                            min="0"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className={styles.formField}>
                                        <label className={styles.label}>Estado</label>
                                        <select
                                            className={styles.select}
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                            disabled={isSubmitting}
                                        >
                                            <option value="active">ACTIVO</option>
                                            <option value="inactive">INACTIVO</option>
                                        </select>
                                    </div>
                                </div>
                                <div className={styles.formField}>
                                    <label className={styles.label}>Notas</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value.toLowerCase() })}
                                        rows={3}
                                        placeholder="Detalles adicionales..."
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className={styles.modalButtonGroup} style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className={`${styles.button} ${styles.buttonSecondary}`}
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={`${styles.button} ${styles.buttonPrimary}`}
                                    disabled={!formData.name || isSubmitting}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', minWidth: '100px' }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <FaSpinner className={styles.spinner} />
                                            Guardando...
                                        </>
                                    ) : (
                                        editingItem ? 'Actualizar' : 'Guardar'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div >
    );
};
