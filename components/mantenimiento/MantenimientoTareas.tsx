import React from 'react'
import { FaCheckSquare, FaPlus, FaTimes } from 'react-icons/fa'
import { Tarea } from '@/features/types/types'
import styles from '@/styles/MantenimientoDetailModal.module.css'

interface MantenimientoTareasProps {
    tareas: Tarea[]
    setTareas: React.Dispatch<React.SetStateAction<Tarea[]>>
    isEditing: boolean
    isUpdating: boolean
    hasStarted: boolean
    onUpdateTareas?: (tareas: Tarea[], estado?: string) => Promise<void>
    nuevaTarea: string
    setNuevaTarea: (s: string) => void
    handleAddTarea: () => void
    handleRemoveTarea: (index: number) => void
    handleEditTarea: (index: number, text: string) => void
    handleToggleTarea: (index: number) => Promise<void>
}

export default function MantenimientoTareas({
    tareas,
    setTareas,
    isEditing,
    isUpdating,
    hasStarted,
    onUpdateTareas,
    nuevaTarea,
    setNuevaTarea,
    handleAddTarea,
    handleRemoveTarea,
    handleEditTarea,
    handleToggleTarea
}: MantenimientoTareasProps) {

    const tareasCompletadas = tareas.filter(t => t.completada).length
    const totalTareas = tareas.length
    const progresoTareas = totalTareas === 0 ? 0 : Math.round((tareasCompletadas / totalTareas) * 100)

    return (
        <div className={styles.mantenimientoDetailSection}>
            <div className={styles.mantenimientoDetailTareasHeader}>
                <h4 className={styles.mantenimientoDetailSectionTitleWithIcon}>
                    <FaCheckSquare size={14} />
                    Tareas
                </h4>
                {!isEditing && (
                    <span className={styles.mantenimientoDetailTareasCount}>
                        {tareasCompletadas} / {totalTareas} completadas
                    </span>
                )}
            </div>

            {isEditing ? (
                <div className={styles.mantenimientoDetailNewTaskContainer}>
                    <div className={styles.mantenimientoDetailNewTaskInputWrapper}>
                        <input
                            type="text"
                            value={nuevaTarea}
                            onChange={(e) => setNuevaTarea(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddTarea()
                                }
                            }}
                            className={`${styles.input} ${styles.mantenimientoDetailInputFlex}`}
                            placeholder="Nueva tarea..."
                        />
                        <button
                            type="button"
                            onClick={handleAddTarea}
                            className={`${styles.button} ${styles.buttonSecondary} ${styles.mantenimientoDetailButtonNoWrap}`}
                        >
                            <FaPlus size={14} />
                            Agregar
                        </button>
                    </div>
                    {tareas.length > 0 && (
                        <div className={styles.mantenimientoDetailTaskListGap}>
                            {tareas.map((tarea, index) => (
                                <div
                                    key={index}
                                    className={styles.mantenimientoDetailTaskItemEditable}
                                >
                                    <input
                                        type="checkbox"
                                        checked={tarea.completada}
                                        onChange={() => {
                                            setTareas(prev => prev.map((t, i) =>
                                                i === index ? { ...t, completada: !t.completada } : t
                                            ))
                                        }}
                                        className={styles.mantenimientoDetailCheckboxAuto}
                                    />
                                    <input
                                        type="text"
                                        value={tarea.descripcion}
                                        onChange={(e) => handleEditTarea(index, e.target.value)}
                                        className={`${styles.input} ${styles.mantenimientoDetailInputNoMargin}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTarea(index)}
                                        className={`${styles.removeButton} ${styles.mantenimientoDetailRemoveButton}`}
                                    >
                                        <FaTimes size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {tareas.length === 0 && (
                        <p className={styles.mantenimientoDetailEmptyState}>
                            No hay tareas agregadas. Agrega una tarea para comenzar.
                        </p>
                    )}
                </div>
            ) : (
                <>
                    {tareas && tareas.length > 0 && (
                        <>
                            {/* Barra de progreso */}
                            <div className={styles.mantenimientoDetailProgressBar}>
                                <div
                                    className={`${styles.mantenimientoDetailProgressFill} ${progresoTareas === 100
                                        ? styles.mantenimientoDetailProgressFillComplete
                                        : styles.mantenimientoDetailProgressFillIncomplete
                                        }`}
                                    style={{ width: `${progresoTareas}%` }}
                                />
                            </div>

                            <div className={styles.mantenimientoDetailTareasList}>
                                {tareas.map((tarea, index) => (
                                    <label
                                        key={index}
                                        className={`${styles.mantenimientoDetailTareaItem} ${tarea.completada
                                            ? styles.mantenimientoDetailTareaItemCompleted
                                            : styles.mantenimientoDetailTareaItemPending
                                            } ${isUpdating || !hasStarted ? styles.mantenimientoDetailTareaItemDisabled : ''} ${onUpdateTareas && !isUpdating && hasStarted ? '' : styles.mantenimientoDetailTareaItemDisabled
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={tarea.completada}
                                            onChange={() => handleToggleTarea(index)}
                                            disabled={!onUpdateTareas || isUpdating || !hasStarted}
                                            className={`${styles.mantenimientoDetailTareaCheckbox} ${!onUpdateTareas || isUpdating || !hasStarted ? styles.mantenimientoDetailTareaCheckboxDisabled : ''
                                                }`}
                                        />
                                        <span
                                            className={`${styles.mantenimientoDetailTareaText} ${tarea.completada
                                                ? styles.mantenimientoDetailTareaTextCompleted
                                                : styles.mantenimientoDetailTareaTextPending
                                                }`}
                                        >
                                            {tarea.descripcion}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                    {(!tareas || tareas.length === 0) && (
                        <p className={styles.mantenimientoDetailEmptyState}>
                            No hay tareas asignadas.
                        </p>
                    )}
                </>
            )}
        </div>
    )
}
