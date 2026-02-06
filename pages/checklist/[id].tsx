import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useChecklist } from "@/features/hooks/useChecklist";
import { useManagment } from "@/features/hooks/useManagment";
import { useComplementaryEquipment } from "@/features/hooks/useComplementaryEquipment";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IncidenciaModal } from "@/components/IncidenciaModal";
import { FaHome, FaCheck, FaExclamationTriangle, FaSave, FaSpinner, FaArrowLeft } from "react-icons/fa";
import styles from "@/styles/EquipmentRedesign.module.css";
import detailStyles from "./ChecklistDetail.module.css";
import { ChecklistItemStatus, Usuario } from "@/features/types/types";

import { IncidenciaDetailModal } from "@/components/IncidenciaDetailModal";
import { Incidencia } from "@/features/types/types";
import { useGlobalContext } from "@/features/context/useGlobalContext";

// Local state type
type LocalStatus = {
    status: ChecklistItemStatus;
    incidenciaIds?: string[];
    notes?: string;
};

const ChecklistDetailPage: NextPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const {
        currentChecklist,
        checklistItems,
        getChecklistById,
        getChecklistItems,
        saveChecklistBatch,
        getChecklistAssignment,
        getUsuarioCheckList,
        usuarioChecklist,
        clearUsuarioChecklist
    } = useChecklist();

    const { maquinas, getMaquinas, createIncidencia, getIncidencia, getUserByDni, getUbicaciones, ubicaciones } = useManagment();
    const { equipment: complementaryEquipment, getComplementaryEquipment } = useComplementaryEquipment();

    const assignedGym = useMemo(() => currentChecklist?.gym || null, [currentChecklist]);

    // Combined Items
    const allItems = useMemo(() => {
        const machineItems = maquinas.map(m => ({ ...m, type: 'machine' }));
        // Filter only active complementary equipment
        const compItems = complementaryEquipment
            .filter(c => c.status === 'active')
            .map(c => ({
                id: c.id,
                name: c.name,
                image: undefined,
                location: c.location || 'Complementarios',
                type: 'complementary',
                order: c.order
            }));

        const combined = [...machineItems, ...compItems];

        // Sort by order
        combined.sort((a, b) => {
            const orderA = a.order ?? 999999;
            const orderB = b.order ?? 999999;
            return orderA - orderB;
        });

        if (assignedGym) {
            return combined.filter(item => item.location === assignedGym);
        }

        return combined;
    }, [maquinas, complementaryEquipment, assignedGym]);

    // Resolve location ID for navigation
    const locationId = useMemo(() => {
        if (!assignedGym || ubicaciones.length === 0) return null;
        const found = ubicaciones.find(u => u.name === assignedGym);
        return found ? found.id : null;
    }, [assignedGym, ubicaciones]);

    // ... (rest of allItems logic)

    useEffect(() => {
        if (!id) return;
        const sub1 = getChecklistById(id as string);
        const sub2 = getMaquinas();
        const sub3 = getChecklistItems(id as string);
        const sub4 = getComplementaryEquipment();
        const sub5 = getUbicaciones(); // Fetch locations
        return () => {
            sub1();
            sub2();
            sub3();
            sub4();
            sub5();
        };
    }, [id, getChecklistById, getMaquinas, getChecklistItems, getComplementaryEquipment, getUbicaciones]);

    // UI State
    const [localState, setLocalState] = useState<Record<string, LocalStatus>>({});
    const [isIncidenciaModalOpen, setIsIncidenciaModal] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedIncidencia, setSelectedIncidencia] = useState<Incidencia | null>(null);
    const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Smart Hydration
    useEffect(() => {
        // Only update if we have items and haven't dirtied the state
        if (allItems.length > 0 && !isDirty) {
            const currentMap: Record<string, LocalStatus> = {};

            // 1. Default all to OK
            allItems.forEach(m => {
                if (m.id) currentMap[m.id] = { status: 'ok' };
            });

            // 2. Override with saved items
            checklistItems.forEach(item => {
                const ids = item.incidenciaIds || (item.incidenciaId ? [item.incidenciaId] : []);

                // Force 'pending' to 'ok' to ensure default checked state
                const status = item.status === 'pending' ? 'ok' : item.status;

                currentMap[item.id] = {
                    status: status,
                    incidenciaIds: ids,
                    notes: item.notas
                };
            });

            setLocalState(currentMap);
        }
    }, [allItems, checklistItems, isDirty]);

    const handleCheckboxChange = (machineId: string) => {
        setIsDirty(true); // Mark as dirty on first interaction
        setLocalState(prev => {
            const current = prev[machineId];
            const newStatus = current?.status === 'ok' ? 'pending' : 'ok';
            return {
                ...prev,
                [machineId]: { ...current, status: newStatus }
            };
        });
    };

    // Local Pending Incidences
    // Store incidence data keyed by temp ID
    const [pendingIncidences, setPendingIncidences] = useState<Record<string, any>>({});

    const handleReportIncidencia = (machineId: string) => {
        setSelectedMachineId(machineId);
        setIsIncidenciaModal(true);
    };

    const handleIncidenciaSubmit = async (data: any) => {
        if (!selectedMachineId) return;

        try {
            // Generate temporary ID
            const tempId = `temp_${Date.now()}`;

            // Store locally
            setPendingIncidences(prev => ({
                ...prev,
                [tempId]: {
                    ...data,
                    machineId: selectedMachineId
                }
            }));

            // Update LOCAL state to reflect incidence
            setIsDirty(true);
            setLocalState(prev => {
                const current = prev[selectedMachineId] || { status: 'incidencia' };
                const currentIds = current.incidenciaIds || [];

                return {
                    ...prev,
                    [selectedMachineId]: {
                        status: 'incidencia',
                        incidenciaIds: [...currentIds, tempId],
                        notes: data.descripcion
                    }
                };
            });

            setIsIncidenciaModal(false);
            setSelectedMachineId(null);
        } catch (error) {
            console.error("Error reporting incidence:", error);
            alert("Error al reportar la incidencia.");
        }
    };

    const handleSaveBatch = async () => {
        if (!id) return;
        if (!confirm("¿Guardar la revisión completa? Esto finalizará el checklist de hoy.")) return;

        setIsSaving(true);
        try {
            // Get the user who started/is performing this checklist
            let performer = currentChecklist?.performedBy;

            // STRICT: Try to override with assigned user for this date if exists
            if (currentChecklist?.date) {
                const assignment = await getChecklistAssignment(currentChecklist.date);
                if (assignment) {
                    // Use embedded user if available
                    if (assignment.user) {
                        performer = assignment.user;
                    } else if (assignment.userId) {
                        // Fallback to fetch if not embedded
                        const assignedUser = await getUserByDni(assignment.userId);
                        if (assignedUser) {
                            performer = assignedUser;
                        }
                    }
                }
            }

            await saveChecklistBatch(
                id as string,
                localState,
                pendingIncidences,
                performer // Ensure incidences are attributed
            );
            router.push('/checklist');
        } catch (error) {
            console.error("Error batch saving:", error);
            alert("Error al guardar la revisión. Intente nuevamente.");
        } finally {
            setIsSaving(false);
        }
    };

    // Placeholder for View Detail (Future Task)
    const handleViewIncidencia = async (machineId: string, incId: string) => {
        try {
            // Remove # if present (though we store clean IDs usually, the chip display adds # visually? No, just slice)
            // clean ID
            const cleanId = incId.replace('#', '');
            const data = await getIncidencia(machineId, cleanId);
            if (data) {
                setSelectedIncidencia(data);
                setIsDetailModalOpen(true);
            } else {
                alert("Incidencia no encontrada o eliminada.");
            }
        } catch (error) {
            console.error("Error fetching incidence:", error);
            alert("Error al cargar detalles.");
        }
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Revisión Diaria - {currentChecklist?.date}</title>
            </Head>

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.titleGroup}>
                        <h1 className={styles.title}>Revisión Diaria: {currentChecklist?.date}</h1>
                    </div>
                    <div className={styles.headerButtons}>
                        <ThemeToggle />
                        <button
                            onClick={() => {
                                if (locationId) {
                                    router.push(`/checklist/location/${locationId}`);
                                } else {
                                    router.push('/checklist');
                                }
                            }}
                            className={styles.actionButton}
                            title={locationId ? "Volver al Tablero" : "Volver"}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <FaArrowLeft size={16} />
                            <span>Volver</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <div className={detailStyles.tableContainer}>
                    <table className={detailStyles.table}>
                        <thead>
                            <tr>
                                <th className={`${detailStyles.th} ${detailStyles.thIndex}`}>#</th>
                                <th className={detailStyles.th} style={{ width: '50px' }}>Estado</th>
                                <th className={detailStyles.th}>Máquina / Equipo</th>
                                <th className={detailStyles.th}>Ubicación</th>
                                <th className={detailStyles.th}>Observaciones</th>
                                <th className={detailStyles.th} style={{ width: '120px' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allItems.map((machine, index) => {
                                const state = localState[machine.id!] || { status: 'ok' };
                                const isOk = state.status === 'ok';
                                const hasIncidences = state.incidenciaIds && state.incidenciaIds.length > 0;

                                return (
                                    <tr key={machine.id} className={detailStyles.tr}>
                                        <td className={`${detailStyles.td} ${detailStyles.tdIndex}`}>{index + 1}</td>
                                        <td className={detailStyles.td}>
                                            <div
                                                className={detailStyles.checkboxWrapper}
                                                onClick={() => !hasIncidences && handleCheckboxChange(machine.id!)}
                                            >
                                                <div className={`${detailStyles.customCheckbox} ${isOk ? detailStyles.checked : ''}`}>
                                                    {isOk && <FaCheck size={14} />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={detailStyles.td}>
                                            <span className={detailStyles.machineName} style={{ textTransform: 'uppercase' }}>{machine.name}</span>
                                        </td>
                                        <td className={detailStyles.td}>
                                            <span className={detailStyles.machineLocation} style={{ textTransform: 'uppercase' }}>{machine.location || '-'}</span>
                                        </td>
                                        <td className={detailStyles.td}>
                                            {/* Restored Incident Chips Column */}
                                            {hasIncidences && (
                                                <div className={detailStyles.incidencesList}>
                                                    {state.incidenciaIds?.map((incId, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={detailStyles.incidenceChip}
                                                            onClick={() => handleViewIncidencia(machine.id!, incId)}
                                                            title="Ver detalle de incidencia"
                                                        >
                                                            <FaExclamationTriangle size={10} />
                                                            {incId.slice(0, 6)}...
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className={detailStyles.td}>
                                            <button
                                                className={detailStyles.btnReport}
                                                onClick={() => handleReportIncidencia(machine.id!)}
                                            >
                                                <FaExclamationTriangle /> + Reportar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className={detailStyles.mobileContainer}>
                    {allItems.map((machine, index) => {
                        const state = localState[machine.id!] || { status: 'ok' };
                        const isOk = state.status === 'ok';
                        const hasIncidences = state.incidenciaIds && state.incidenciaIds.length > 0;

                        return (
                            <div key={machine.id} className={detailStyles.card}>
                                <div className={detailStyles.cardHeader}>
                                    {machine.image && (
                                        <div className={detailStyles.machineImageWrapper}>
                                            <Image
                                                src={machine.image}
                                                alt={machine.name || 'Machine'}
                                                fill
                                                className={detailStyles.machineImage}
                                                sizes="(max-width: 768px) 100vw, 60px"
                                            />
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>#{index + 1}</span>
                                            <span className={detailStyles.machineName} style={{ textTransform: 'uppercase' }}>{machine.name}</span>
                                        </div>
                                        <span className={detailStyles.machineLocation} style={{ textTransform: 'uppercase' }}>{machine.location || '-'}</span>
                                        {/* Incidences Chips Mobile */}
                                        {hasIncidences && (
                                            <div className={detailStyles.incidencesList} style={{ marginTop: '0.5rem' }}>
                                                {state.incidenciaIds?.map((incId, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={detailStyles.incidenceChip}
                                                        onClick={() => handleViewIncidencia(machine.id!, incId)}
                                                    >
                                                        <FaExclamationTriangle size={10} />
                                                        {incId.slice(0, 6)}...
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={detailStyles.cardBody}>
                                    <div
                                        className={detailStyles.checkboxWrapper}
                                        onClick={() => !hasIncidences && handleCheckboxChange(machine.id!)}
                                    >
                                        <div className={`${detailStyles.customCheckbox} ${isOk ? detailStyles.checked : ''}`}>
                                            {isOk && <FaCheck size={14} />}
                                        </div>
                                        <span style={{ fontSize: '0.9rem', color: isOk ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                            {isOk ? 'Operativo' : 'Pendiente/Falla'}
                                        </span>
                                    </div>

                                    <div className={detailStyles.cardActions}>
                                        <button
                                            className={detailStyles.btnReport}
                                            onClick={() => handleReportIncidencia(machine.id!)}
                                            title="Reportar Incidencia"
                                            style={{ padding: '0.5rem' }}
                                        >
                                            <FaExclamationTriangle />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className={detailStyles.finishSection}>
                    <button
                        className={detailStyles.saveButton}
                        onClick={handleSaveBatch}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <FaSpinner className="spinner" /> Guardando...
                            </>
                        ) : (
                            <>
                                <FaSave /> Guardar Revisión
                            </>
                        )}
                    </button>
                </div>
            </main>

            <IncidenciaModal
                isOpen={isIncidenciaModalOpen}
                onClose={() => {
                    setIsIncidenciaModal(false);
                    setSelectedMachineId(null);
                }}
                onSubmit={handleIncidenciaSubmit}

                usuarioChecklist={usuarioChecklist as Usuario}
                maquina={allItems.find(m => m.id === selectedMachineId) as any}
            />

            <IncidenciaDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedIncidencia(null);
                }}
                incidencia={selectedIncidencia}
            />

            <style jsx>{`
                .spinner { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ChecklistDetailPage;
