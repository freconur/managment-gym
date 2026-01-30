import React, { useState } from 'react';
import styles from '@/styles/AssignUserModal.module.css';
import { FaTimes, FaUserCog, FaCalendarAlt, FaBuilding, FaTrash } from 'react-icons/fa';
import { Usuario } from '@/features/types/types';
import { useManagment } from '@/features/hooks/useManagment';
import { useChecklist } from '@/features/hooks/useChecklist';

interface AssignUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    usuarios: Usuario[];
    onAssign: (userId: string, startDate: string, endDate: string, gym: string, assignmentId?: string) => Promise<void>;
    defaultGym?: string;
}

export const AssignUserModal: React.FC<AssignUserModalProps> = ({
    isOpen,
    onClose,
    usuarios,
    onAssign,
    defaultGym
}) => {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedGym, setSelectedGym] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterGym, setFilterGym] = useState('');
    const { ubicaciones, getUbicaciones } = useManagment();
    const { assignments, getAssignments, deleteAssignment } = useChecklist();

    const toggleSort = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    React.useEffect(() => {
        if (isOpen) {
            const unsub = getUbicaciones();
            const unsubAssignments = getAssignments();
            return () => {
                unsub();
                unsubAssignments();
            };
        } else {
            // Reset state on close
            setEditingId(null);
            setSelectedUserId('');
            setSelectedGym(defaultGym || '');
            // Reset dates to default
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;
            setStartDate(today);
            setEndDate(today);
        }
    }, [isOpen, getUbicaciones, getAssignments]);

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
            await onAssign(selectedUserId, startDate, endDate, selectedGym, editingId || undefined);
            onClose();
        } catch (error) {
            console.error('Error assigning user:', error);
            alert(error instanceof Error ? error.message : 'Error al asignar usuario');
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
                        {editingId ? 'Editar Encargado' : 'Configurar Encargado'}
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

                        {!defaultGym && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    <FaBuilding style={{ marginRight: '0.5rem' }} />
                                    Gym / Ubicación
                                </label>
                                <select
                                    className={styles.select}
                                    value={selectedGym}
                                    onChange={(e) => setSelectedGym(e.target.value)}
                                    required
                                >
                                    <option value="">-- Seleccionar Gym --</option>
                                    {ubicaciones.map(u => (
                                        <option key={u.id} value={u.name}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={styles.dateRangeGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    <FaCalendarAlt style={{ marginRight: '0.5rem' }} />
                                    Fecha Inicio
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
                                    Fecha Fin
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
                            {isSubmitting ? 'Guardando...' : (editingId ? 'Actualizar Asignación' : 'Guardar Asignación')}
                        </button>
                    </div>
                </form>

                <div className={styles.assignmentsSection}>
                    <h4 className={styles.assignmentsHeader}>Asignaciones Recientes</h4>
                    {assignments.length === 0 ? (
                        <p className={styles.emptyState}>No hay asignaciones registradas.</p>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th className={styles.th}>Encargado</th>
                                        <th
                                            className={`${styles.th} ${styles.sortHeader}`}
                                            onClick={toggleSort}
                                            title="Click para ordenar"
                                            style={{ whiteSpace: 'nowrap', width: '140px' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                Rango
                                                {sortOrder === 'asc' ? <span style={{ fontSize: '0.7em' }}>▲</span> : <span style={{ fontSize: '0.7em' }}>▼</span>}
                                            </div>
                                        </th>
                                        {!defaultGym && (
                                            <th className={styles.th}>
                                                <div className={styles.gymFilterContainer}>
                                                    Gym
                                                    <select
                                                        value={filterGym}
                                                        onChange={(e) => setFilterGym(e.target.value)}
                                                        className={styles.gymFilterSelect}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="">Todos</option>
                                                        {ubicaciones.map(u => (
                                                            <option key={u.id} value={u.name}>{u.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </th>
                                        )}
                                        <th className={styles.th} style={{ textAlign: 'center', width: '80px' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...assignments]
                                        .filter(a => defaultGym ? a.gym === defaultGym : (filterGym ? a.gym === filterGym : true))
                                        .sort((a, b) => {
                                            return sortOrder === 'asc'
                                                ? a.startDate.localeCompare(b.startDate)
                                                : b.startDate.localeCompare(a.startDate);
                                        }).map((assignment) => (
                                            <tr key={assignment.id} className={styles.tr}>
                                                <td className={styles.td}>
                                                    {assignment.user ? `${assignment.user.nombres} ${assignment.user.apellidos}` : 'Usuario desconocido'}
                                                </td>
                                                <td className={styles.td} style={{ fontSize: '0.85rem' }}>
                                                    {assignment.startDate.split('-').reverse().join('/')} - {assignment.endDate.split('-').reverse().join('/')}
                                                </td>
                                                {!defaultGym && (
                                                    <td className={styles.td}>
                                                        {assignment.gym || '-'}
                                                    </td>
                                                )}
                                                <td className={styles.td} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUserId(assignment.userId);
                                                            setStartDate(assignment.startDate);
                                                            setEndDate(assignment.endDate);
                                                            setSelectedGym(assignment.gym || '');
                                                            setEditingId(assignment.id || null);
                                                        }}
                                                        title="Editar"
                                                        style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
                                                    >
                                                        <FaUserCog />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('¿Estás seguro de eliminar esta asignación?')) {
                                                                try {
                                                                    await deleteAssignment(assignment.id!);
                                                                } catch (error) {
                                                                    console.error(error);
                                                                    alert('Error al eliminar');
                                                                }
                                                            }
                                                        }}
                                                        title="Eliminar"
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
