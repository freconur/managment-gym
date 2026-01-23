import React from 'react';
import { ChecklistItem, Machine } from '@/features/types/types';
import styles from './MonthlyChecklistGrid.module.css';
import { FaCheck, FaTimes, FaMinus, FaExclamationTriangle } from 'react-icons/fa';

interface MonthlyChecklistGridProps {
    machines: Machine[];
    monthData: Record<string, Record<string, ChecklistItem>>;
    currentMonth: number;
    currentYear: number;
    onCellClick: (machineId: string, day: number) => void;
    onIncidenceClick?: (machineId: string, incId: string) => void;
}

export const MonthlyChecklistGrid: React.FC<MonthlyChecklistGridProps> = ({
    machines,
    monthData,
    currentMonth,
    currentYear,
    onCellClick,
    onIncidenceClick
}) => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const today = new Date();
    const isToday = (day: number) =>
        today.getDate() === day &&
        today.getMonth() === currentMonth &&
        today.getFullYear() === currentYear;

    return (
        <div className={styles.container}>
            <div className={styles.scrollWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr className={styles.headerRow}>
                            <th className={`${styles.th} ${styles.thSticky}`}>Nombre de Artículos</th>
                            <th className={styles.th}>Ubicación</th>
                            {daysArray.map(day => (
                                <th key={day} className={`${styles.th} ${isToday(day) ? styles.today : ''}`}>
                                    {day}
                                </th>
                            ))}
                            <th className={styles.th}>Total X Mes</th>
                            <th className={styles.th}>Observación</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machines.map(machine => {
                            const machineEntries = monthData[machine.id!] || {};

                            return (
                                <tr key={machine.id}>
                                    <td className={`${styles.td} ${styles.tdSticky}`}>
                                        {machine.name}
                                    </td>
                                    <td className={styles.td}>
                                        {machine.location || '-'}
                                    </td>
                                    {daysArray.map(day => {
                                        const dayStr = String(day).padStart(2, '0');
                                        const entry = machineEntries[dayStr];

                                        return (
                                            <td
                                                key={day}
                                                className={`${styles.td} ${styles.dayCell} ${isToday(day) ? styles.today : ''}`}
                                                onClick={() => onCellClick(machine.id!, day)}
                                            >
                                                {entry ? (
                                                    entry.status === 'ok' ? (
                                                        <FaCheck className={styles.checkIcon} />
                                                    ) : (
                                                        <FaTimes className={styles.incIcon} />
                                                    )
                                                ) : (
                                                    <FaMinus className={styles.pendingIcon} />
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className={styles.td}>
                                        {Object.values(machineEntries).filter(e => e.status === 'ok').length}
                                    </td>
                                    <td className={`${styles.td} ${styles.observationCell}`}>
                                        {(() => {
                                            const allIncidences = Object.values(machineEntries).reduce((acc: string[], entry) => {
                                                const ids = entry.incidenciaIds || (entry.incidenciaId ? [entry.incidenciaId] : []);
                                                return [...acc, ...ids];
                                            }, []);

                                            const uniqueIncidences = Array.from(new Set(allIncidences));

                                            if (uniqueIncidences.length === 0) return '-';

                                            return (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {uniqueIncidences.map((incId, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={styles.incidenceChip}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onIncidenceClick) onIncidenceClick(machine.id!, incId);
                                                            }}
                                                            style={{ cursor: onIncidenceClick ? 'pointer' : 'default' }}
                                                            title="Ver detalle"
                                                        >
                                                            <FaExclamationTriangle size={8} />
                                                            {incId.slice(0, 6)}...
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
