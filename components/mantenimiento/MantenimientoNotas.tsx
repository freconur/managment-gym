import React, { useState, useEffect } from 'react'
import { FaStickyNote, FaSave, FaTimes, FaEdit, FaSpinner } from 'react-icons/fa'
import styles from '@/styles/MantenimientoDetailModal.module.css'

interface MantenimientoNotasProps {
    initialNotas?: string
    onUpdateNotas?: (notas: string) => Promise<void>
    hasStarted: boolean
}

export default function MantenimientoNotas({ initialNotas = '', onUpdateNotas, hasStarted }: MantenimientoNotasProps) {
    const [notas, setNotas] = useState(initialNotas || '')
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        setNotas(initialNotas || '')
    }, [initialNotas])

    const handleSave = async () => {
        if (!onUpdateNotas) return
        setIsSaving(true)
        try {
            await onUpdateNotas(notas)
            setIsEditing(false)
        } catch (error) {
            console.error('Error al guardar notas:', error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className={styles.mantenimientoDetailNotasContainer}>
            <div className={styles.mantenimientoDetailNotasHeader}>
                <h4 className={styles.mantenimientoDetailSectionTitleWithIcon}>
                    <FaStickyNote size={14} />
                    Notas
                </h4>
                {hasStarted && onUpdateNotas && (
                    <div className={styles.mantenimientoDetailNotasActions}>
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNotas(initialNotas || '')
                                        setIsEditing(false)
                                    }}
                                    className={`${styles.button} ${styles.buttonSecondary} ${styles.mantenimientoDetailButtonSmall}`}
                                    disabled={isSaving}
                                >
                                    <FaTimes size={12} />
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className={`${styles.button} ${styles.buttonSubmit} ${styles.mantenimientoDetailButtonSmall}`}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <FaSpinner className={styles.spinAnimation} size={12} /> : <FaSave size={12} />}
                                    Guardar
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className={styles.mantenimientoDetailEditButton}
                                title="Editar notas"
                            >
                                <FaEdit size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isEditing ? (
                <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className={`${styles.textarea} ${styles.mantenimientoDetailNotasTextarea}`}
                    placeholder="Escribe notas sobre el mantenimiento..."
                    rows={4}
                    autoFocus
                />
            ) : (
                <div
                    onClick={() => {
                        if (hasStarted && onUpdateNotas && !isEditing) {
                            setIsEditing(true)
                        }
                    }}
                    className={`${styles.mantenimientoDetailNotasContent} ${notas
                        ? styles.mantenimientoDetailNotasParagraphFilled
                        : styles.mantenimientoDetailNotasParagraphEmpty
                        } ${onUpdateNotas && hasStarted
                            ? styles.mantenimientoDetailNotasParagraphEditable
                            : styles.mantenimientoDetailNotasParagraphNotEditable
                        }`}
                >
                    <p>
                        {notas || (onUpdateNotas && hasStarted ? 'Haz clic para agregar notas...' : 'Sin notas')}
                    </p>
                </div>
            )}
        </div>
    )
}
