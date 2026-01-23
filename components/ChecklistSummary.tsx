import React from 'react';
import { Checklist } from '@/features/types/types';
import styles from './ChecklistSummary.module.css';
import { useRouter } from 'next/router';
import { FaEye, FaCalendarAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

interface ChecklistSummaryProps {
    checklists: Checklist[];
}

export const ChecklistSummary: React.FC<ChecklistSummaryProps> = ({ checklists }) => {
    const router = useRouter();

    if (checklists.length === 0) {
        return <div className={styles.emptyState}>No hay registros de checklists diarios todavía.</div>;
    }

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.th}>Fecha</th>
                        <th className={styles.th}>Estado</th>
                        <th className={styles.th}>Máquinas</th>
                        <th className={styles.th}>Incidencias</th>
                        <th className={styles.th}>Técnico</th>
                        <th className={styles.th}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {checklists.map((checklist) => (
                        <tr key={checklist.id} className={styles.tr}>
                            <td className={styles.td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FaCalendarAlt color="var(--accent-primary)" />
                                    {checklist.date}
                                </div>
                            </td>
                            <td className={styles.td}>
                                <span className={`${styles.statusBadge} ${checklist.status === 'completed' ? styles.completed : styles.inProgress}`}>
                                    {checklist.status === 'completed' ? 'Completado' : 'En Progreso'}
                                </span>
                            </td>
                            <td className={styles.td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheckCircle color="#10b981" />
                                    {checklist.completedCount} / {checklist.totalCount}
                                </div>
                            </td>
                            <td className={styles.td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaExclamationTriangle color={checklist.incidencesCount > 0 ? "#ef4444" : "#94a3b8"} />
                                    {checklist.incidencesCount}
                                </div>
                            </td>
                            <td className={styles.td}>
                                {checklist.performedBy?.nombres || 'Sistema'}
                            </td>
                            <td className={styles.td}>
                                <button
                                    className={styles.viewButton}
                                    onClick={() => router.push(`/checklist/${checklist.id}`)}
                                >
                                    <FaEye style={{ marginRight: '0.4rem' }} />
                                    Ver Detalles
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
