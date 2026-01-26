import React, { useState, useEffect } from 'react';
import { ChecklistItem, Machine } from '@/features/types/types';
import styles from './MonthlyChecklistGrid.module.css';
import { FaCheck, FaTimes, FaMinus, FaExclamationTriangle } from 'react-icons/fa';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableRow } from './SortableRow';

interface MonthlyChecklistGridProps {
    machines: (Machine & { type?: string })[]; // Extended for DnD support
    monthData: Record<string, Record<string, ChecklistItem>>;
    currentMonth: number;
    currentYear: number;
    onCellClick: (machineId: string, day: number) => void;
    onIncidenceClick?: (machineId: string, incId: string) => void;
    onDateClick?: (day: number) => void;
    onReorder?: (items: (Machine & { type?: string })[]) => void;
}

export const MonthlyChecklistGrid: React.FC<MonthlyChecklistGridProps> = ({
    machines,
    monthData,
    currentMonth,
    currentYear,
    onCellClick,
    onIncidenceClick,
    onDateClick,
    onReorder
}) => {
    const [items, setItems] = useState(machines);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const today = new Date();
    const isToday = (day: number) =>
        today.getDate() === day &&
        today.getMonth() === currentMonth &&
        today.getFullYear() === currentYear;

    useEffect(() => {
        setItems(machines);
    }, [machines]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                if (onReorder) {
                    onReorder(newItems);
                }
                return newItems;
            });
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.scrollWrapper}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <table className={styles.table}>
                        <thead>
                            <tr className={styles.headerRow}>
                                <th className={`${styles.th} ${styles.thIndex}`}>#</th>
                                <th className={`${styles.th} ${styles.thSticky}`}>Nombre de Artículos</th>
                                <th className={styles.th}>Ubicación</th>
                                {daysArray.map(day => (
                                    <th
                                        key={day}
                                        className={`${styles.th} ${isToday(day) ? styles.today : ''}`}
                                        onClick={() => onDateClick && onDateClick(day)}
                                        style={{ cursor: onDateClick ? 'pointer' : 'default', textDecoration: onDateClick ? 'underline' : 'none', textDecorationColor: 'var(--accent-primary)' }}
                                        title="Click para ver opciones (Editar/Borrar)"
                                    >
                                        {day}
                                    </th>
                                ))}
                                <th className={styles.th}>Total X Mes</th>
                                <th className={styles.th}>Observación</th>
                            </tr>
                        </thead>
                        <SortableContext
                            items={items.map(m => m.id!)}
                            strategy={verticalListSortingStrategy}
                        >
                            <tbody>
                                {items.map(machine => {
                                    const machineEntries = monthData[machine.id!] || {};

                                    return (
                                        <SortableRow key={machine.id} id={machine.id!}>
                                            <td className={`${styles.td} ${styles.tdIndex}`}>
                                                {items.indexOf(machine) + 1}
                                            </td>
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
                                        </SortableRow>
                                    );
                                })}
                            </tbody>
                        </SortableContext>
                    </table>
                </DndContext>
            </div>
        </div>
    );
};
