import React from 'react'
import { FaClock, FaCheckCircle, FaUser, FaDollarSign, FaMapMarkerAlt, FaTag, FaCalendarAlt, FaCog } from 'react-icons/fa'
import { Incidencia, Usuario, Machine } from '@/features/types/types'
import styles from '@/styles/MantenimientoDetailModal.module.css'

interface MantenimientoInfoProps {
    mantenimiento: Incidencia
    isEditing: boolean
    tecnicoEditado: Usuario | {}
    setTecnicoEditado: (u: Usuario | {}) => void
    usuarios: Usuario[]
    descripcionEditada: string
    setDescripcionEditada: (s: string) => void
    statusEditado: string
    setStatusEditado: (s: string) => void
    maquinaRealTime?: Machine
}

export default function MantenimientoInfo({
    mantenimiento,
    isEditing,
    tecnicoEditado,
    setTecnicoEditado,
    usuarios,
    descripcionEditada,
    setDescripcionEditada,
    statusEditado,
    setStatusEditado,
    maquinaRealTime
}: MantenimientoInfoProps) {

    // Removed unused helpers getTipoLabel, getEstadoLabel, etc as they are duplicates of main modal logic
    // or passed down. However, they were defined here. 
    // I will keep them if they are used inside the Info Grid?
    // No, Info Grid uses convertTimestampToDate.
    // getStatusLabel/Class are used in Machine Info Grid locally. Keeping them.

    // ... helpers ...

    const getEstadoClass = (estado?: string) => {
        // ... (Used by duplicate header, can probably remove if unused, but safety first)
        if (!estado) return ''
        const classes: Record<string, string> = {
            pendiente: styles.statusPending,
            en_proceso: styles.statusInProcess,
            completado: styles.statusCompleted,
            cancelado: styles.statusCancelled
        }
        return classes[estado] || ''
    }

    const getStatusLabel = (status?: string) => {
        switch (status) {
            case 'active':
                return 'Activo'
            case 'maintenance':
                return 'En Mantenimiento'
            case 'inactive':
                return 'Inactivo'
            default:
                return 'N/A'
        }
    }

    const getStatusClass = (status?: string) => {
        switch (status) {
            case 'active':
                return styles.statusActive
            case 'maintenance':
                return styles.statusMaintenance
            case 'inactive':
                return styles.statusInactive
            default:
                return ''
        }
    }

    const convertTimestampToDate = (timestamp: any): Date | null => {
        if (!timestamp) return null
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate()
        }
        if (timestamp instanceof Date) {
            return timestamp
        }
        if (typeof timestamp === 'object' && timestamp.seconds) {
            return new Date(timestamp.seconds * 1000)
        }
        try {
            return new Date(timestamp)
        } catch {
            return null
        }
    }

    const infoMaquina = maquinaRealTime || mantenimiento.maquina

    return (
        <>
            <div className={styles.mantenimientoDetailMachineInfoCard}>
                <div className={styles.mantenimientoDetailMachineInfoHeader}>
                    <FaCog size={14} className={styles.mantenimientoDetailIconBlue} />
                    Información de la Máquina
                </div>

                <div className={styles.mantenimientoDetailMachineGrid}>
                    {/* Nombre de la Máquina */}
                    {infoMaquina?.name && (
                        <div className={styles.mantenimientoDetailMachineInfoRow}>
                            <FaCog size={12} className={styles.mantenimientoDetailIconGray} />
                            <span className={styles.mantenimientoDetailMachineInfoLabel}>
                                Equipo:
                            </span>
                            <span className={styles.mantenimientoDetailMachineInfoValue} style={{ fontWeight: '600', color: '#111827' }}>
                                {infoMaquina.name}
                            </span>
                        </div>
                    )}

                    {/* Marca y Modelo */}
                    {(infoMaquina?.brand || infoMaquina?.model) && (
                        <div className={styles.mantenimientoDetailMachineInfoRow}>
                            <FaTag size={12} className={styles.mantenimientoDetailIconGray} />
                            {infoMaquina?.brand && (
                                <>
                                    <span className={styles.mantenimientoDetailMachineInfoLabel}>
                                        Marca:
                                    </span>
                                    <span className={styles.mantenimientoDetailMachineInfoValue}>
                                        {infoMaquina.brand}
                                    </span>
                                </>
                            )}
                            {infoMaquina?.brand && infoMaquina?.model && (
                                <span className={styles.mantenimientoDetailSeparator}>
                                    •
                                </span>
                            )}
                            {infoMaquina?.model && (
                                <>
                                    <span className={styles.mantenimientoDetailMachineInfoLabel}>
                                        Modelo:
                                    </span>
                                    <span className={styles.mantenimientoDetailMachineInfoValue}>
                                        {infoMaquina.model}
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Ubicación */}
                    {infoMaquina?.location && (
                        <div className={styles.mantenimientoDetailMachineInfoRow}>
                            <FaMapMarkerAlt size={12} className={styles.mantenimientoDetailIconGray} />
                            <span className={styles.mantenimientoDetailMachineInfoLabel}>
                                Ubicación:
                            </span>
                            <span className={styles.mantenimientoDetailMachineInfoValue}>
                                {infoMaquina.location}
                            </span>
                        </div>
                    )}

                    {/* Estado Maquina Display - Only if not editing (edited shown in header) */}
                    {infoMaquina?.status && !isEditing && (
                        <div className={styles.mantenimientoDetailMachineInfoRow}>
                            <FaTag size={12} className={styles.mantenimientoDetailIconGray} />
                            <span className={styles.mantenimientoDetailMachineInfoLabel}>
                                Estado de Máquina:
                            </span>
                            <span className={`${styles.statusBadge} ${getStatusClass(infoMaquina.status)}`}>
                                {getStatusLabel(infoMaquina.status)}
                            </span>
                        </div>
                    )}

                    {/* Fecha de Compra */}
                    {/* {infoMaquina?.purchaseDate && (
                        <div className={styles.mantenimientoDetailMachineInfoRow}>
                            <FaCalendarAlt size={12} className={styles.mantenimientoDetailIconGray} />
                            <span className={styles.mantenimientoDetailMachineInfoLabel}>
                                N°OT:
                            </span>
                            <span className={styles.mantenimientoDetailMachineInfoValue}>
                                {convertTimestampToDate(infoMaquina.purchaseDate)?.toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }) || 'N/A'}
                            </span>
                        </div>
                    )} */}

                    {/* ID de la máquina */}
                    {infoMaquina?.id && (
                        <div className={styles.mantenimientoDetailMachineInfoRow}>
                            <span className={styles.mantenimientoDetailMachineInfoLabel}>
                                ID:
                            </span>
                            <span className={styles.mantenimientoDetailMachineInfoIdBadge}>
                                {infoMaquina.id}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Grid compacto de información principal */}
            <div className={styles.mantenimientoDetailInfoGrid}>
                {mantenimiento.fechaProgramada && (
                    <div className={styles.mantenimientoDetailInfoCard}>
                        <div className={styles.mantenimientoDetailInfoLabel}>
                            <FaClock size={12} className={styles.mantenimientoDetailIconGray} />
                            <span className={styles.mantenimientoDetailInfoLabelText}>Programada</span>
                        </div>
                        <p className={styles.mantenimientoDetailInfoValue}>
                            {convertTimestampToDate(mantenimiento.fechaProgramada)?.toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            }) || 'N/A'}
                        </p>
                    </div>
                )}

                {mantenimiento.fechaResolucion && (
                    <div className={styles.mantenimientoDetailInfoCard}>
                        <div className={styles.mantenimientoDetailInfoLabel}>
                            <FaCheckCircle size={12} className={styles.mantenimientoDetailIconGray} />
                            <span className={styles.mantenimientoDetailInfoLabelText}>Resolución</span>
                        </div>
                        <p className={styles.mantenimientoDetailInfoValue}>
                            {convertTimestampToDate(mantenimiento.fechaResolucion)?.toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            }) || 'N/A'}
                        </p>
                    </div>
                )}

                {mantenimiento.tecnicoAsignado && !isEditing && (
                    <div className={styles.mantenimientoDetailInfoCard}>
                        <div className={styles.mantenimientoDetailInfoLabel}>
                            <FaUser size={12} className={styles.mantenimientoDetailIconGray} />
                            <span className={styles.mantenimientoDetailInfoLabelText}>Técnico</span>
                        </div>
                        <p className={styles.mantenimientoDetailInfoValue}>
                            {mantenimiento.tecnicoAsignado.nombres} {mantenimiento.tecnicoAsignado.apellidos}
                        </p>
                    </div>
                )}
                {isEditing && (
                    <div className={`${styles.mantenimientoDetailInfoCard} ${styles.mantenimientoDetailInfoCardFullWidth}`}>
                        <div className={styles.mantenimientoDetailInfoLabel}>
                            <FaUser size={12} className={styles.mantenimientoDetailIconGray} />
                            <span className={styles.mantenimientoDetailInfoLabelText}>Técnico</span>
                        </div>
                        <select
                            value={(tecnicoEditado as Usuario)?.dni || (tecnicoEditado as Usuario)?.id || ''}
                            onChange={(e) => {
                                const selectedDniOrId = e.target.value
                                if (!selectedDniOrId) {
                                    setTecnicoEditado({})
                                } else {
                                    const selectedUsuario = usuarios.find(
                                        u => u.dni === selectedDniOrId || u.id === selectedDniOrId
                                    )
                                    if (selectedUsuario) {
                                        setTecnicoEditado(selectedUsuario)
                                    }
                                }
                            }}
                            className={`${styles.select} ${styles.mantenimientoDetailSelectMargin}`}
                        >
                            <option value="">Seleccione un técnico</option>
                            {usuarios.map((usuario) => (
                                <option key={usuario.id || usuario.dni} value={usuario.dni || usuario.id || ''}>
                                    {usuario.nombres} {usuario.apellidos} {usuario.dni ? `(${usuario.dni})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {mantenimiento.costo !== undefined && mantenimiento.costo > 0 && (
                    <div className={styles.mantenimientoDetailInfoCardCost}>
                        <div className={styles.mantenimientoDetailInfoLabel}>
                            <FaDollarSign size={12} className={styles.mantenimientoDetailIconGreen} />
                            <span className={styles.mantenimientoDetailInfoLabelTextCost}>Costo</span>
                        </div>
                        <p className={styles.mantenimientoDetailInfoValueCost}>
                            ${mantenimiento.costo.toFixed(2)}
                        </p>
                    </div>
                )}
            </div>

            {/* Descripción compacta */}
            <div className={styles.mantenimientoDetailSection}>
                <h4 className={styles.mantenimientoDetailSectionTitle}>
                    Descripción
                </h4>
                {isEditing ? (
                    <textarea
                        value={descripcionEditada}
                        onChange={(e) => setDescripcionEditada(e.target.value)}
                        className={styles.textarea}
                        rows={4}
                        placeholder="Describe el mantenimiento..."
                    />
                ) : (
                    mantenimiento.descripcion && (
                        <p className={styles.mantenimientoDetailDescription}>
                            {mantenimiento.descripcion}
                        </p>
                    )
                )}
            </div>
        </>
    )
}
