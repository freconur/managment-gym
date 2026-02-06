import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import { useChecklist } from "@/features/hooks/useChecklist";
import { useManagment } from "@/features/hooks/useManagment";
// Reuse the dashboard component implicitly or copy logic?
// Given existing structure, copying and adapting index.tsx logic is safest for now 
// to avoid breaking the main dashboard while implementing this specific view.
//Ideally we should have a <ChecklistDashboard /> component.
// For expediency and safety, adapting logic here.

import { MonthlyChecklistGrid } from "@/components/MonthlyChecklistGrid";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AssignUserModal } from "@/components/AssignUserModal";

import { ChecklistPinModal } from "@/components/ChecklistPinModal";
import { SelectGymModal } from "@/components/SelectGymModal";
import { ChecklistAssignment, Usuario, Incidencia } from "@/features/types/types";
import { FaUserCog, FaHome, FaPlus, FaClipboardList, FaSpinner, FaChevronLeft, FaChevronRight, FaMapMarkerAlt } from "react-icons/fa";
import styles from "@/styles/EquipmentRedesign.module.css";
import { IncidenciaDetailModal } from "@/components/IncidenciaDetailModal";
import { ComplementaryEquipmentModal } from "@/components/ComplementaryEquipmentModal";
import { useComplementaryEquipment } from "@/features/hooks/useComplementaryEquipment";
import dynamic from 'next/dynamic';
import { ChecklistReportDocument } from "@/components/pdf/ChecklistReportPDF";
import { FaFilePdf } from "react-icons/fa";

// Dynamically import PDFDownloadLink
const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <button className={styles.actionButton} disabled><FaSpinner className="spinner" /> PDF</button>,
    }
);

const LocationChecklistPage: NextPage = () => {
    const router = useRouter();
    const { id: locationId } = router.query; // This is the location ID

    const { monthData, getMonthChecklistData, startDailyChecklist, assignUserChecklist, getChecklistAssignment, getMonthlyAssignments, assignments, checklists, deleteChecklist } = useChecklist();
    const { maquinas, getMaquinas, getUsuarios, usuarios, getUserByDni, getIncidencia, getUbicaciones, ubicaciones, saveMachineOrder } = useManagment();
    const { getComplementaryEquipment, equipment: complementaryEquipment } = useComplementaryEquipment();

    const [isCreating, setIsCreating] = useState(false);
    const [locationName, setLocationName] = useState('');

    // Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedIncidencia, setSelectedIncidencia] = useState<Incidencia | null>(null);
    const [authContext, setAuthContext] = useState<'assignment' | 'date_options' | 'complementary' | null>(null);

    // Date Action Modal
    const [isDateActionModalOpen, setIsDateActionModalOpen] = useState(false);
    const [selectedDateAction, setSelectedDateAction] = useState<{ day: number, checklistId: string | null } | null>(null);

    // Assignment & PIN Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [assignedUserForPin, setAssignedUserForPin] = useState<Usuario | null>(null);

    // Complementary Equipment Modal State
    const [isComplementaryModalOpen, setIsComplementaryModalOpen] = useState(false);

    // Select Gym Modal State (Navigating to another one?)
    const [isSelectGymModalOpen, setIsSelectGymModalOpen] = useState(false);
    const [selectedGymForChecklist, setSelectedGymForChecklist] = useState<string | null>(null);

    // Month Selector State
    const [viewDate, setViewDate] = useState(new Date());
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

    const monthNames = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ];

    // Resolve Location Name from ID
    useEffect(() => {
        if (locationId && ubicaciones.length > 0) {
            const found = ubicaciones.find(u => u.id === locationId);
            if (found) {
                setLocationName(found.name || '');
            }
        }
    }, [locationId, ubicaciones]);


    useEffect(() => {
        const unsubscribeMaquinas = getMaquinas();
        const unsubscribeComp = getComplementaryEquipment();
        const unsubscribeMonth = getMonthChecklistData(currentMonth, currentYear);
        const unsubscribeUsers = getUsuarios();
        const unsubscribeUbicaciones = getUbicaciones();
        const unsubscribeAssignments = getMonthlyAssignments(currentMonth, currentYear);

        return () => {
            unsubscribeMaquinas();
            unsubscribeComp();
            unsubscribeMonth();
            unsubscribeUsers();
            unsubscribeUbicaciones();
            unsubscribeAssignments();
        };
    }, [currentMonth, currentYear, getMaquinas, getMonthChecklistData, getUsuarios, getComplementaryEquipment, getUbicaciones, getMonthlyAssignments]);

    const allItems = useMemo(() => {
        const machineItems = maquinas.map(m => ({ ...m, type: 'machine' }));
        const compItems = complementaryEquipment
            .filter(c => c.status === 'active')
            .map(c => ({
                id: c.id,
                name: c.name,
                location: c.location || 'Complementarios',
                type: 'complementary',
                order: c.order
            }));

        const combined = [...machineItems, ...compItems];

        combined.sort((a, b) => {
            const orderA = a.order ?? 999999;
            const orderB = b.order ?? 999999;
            return orderA - orderB;
        });

        // FORCE FILTER by the resolved location name
        if (locationName) {
            return combined.filter(item => item.location === locationName);
        }

        // While loading name or if not found, maybe show empty or all? 
        // Showing all might be confusing if ID is valid but name distinct.
        // Let's return empty if ID exists but name not yet resolved to avoid flash
        if (locationId && !locationName) return [];

        return combined;
    }, [maquinas, complementaryEquipment, locationName, locationId]);

    const handlePrevMonth = () => {
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
    };

    // Handler when user clicks "Start Today's Checklist"
    // In this specific view, we already know the location.
    const handleStartDailyClick = async () => {
        if (allItems.length === 0) {
            alert("No hay ítems registrados para esta sucursal.");
            return;
        }

        // We know the gym name to use
        const gymName = locationName;
        setSelectedGymForChecklist(gymName);

        try {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const assignment = await getChecklistAssignment(todayStr, gymName);
            if (assignment && assignment.userId) {
                const assignedUser = assignment.user || usuarios.find(u => u.dni === assignment.userId || u.id === assignment.userId);

                if (assignedUser) {
                    setAssignedUserForPin(assignedUser);
                    setIsPinModalOpen(true);
                } else {
                    alert(`El usuario asignado para ${gymName} hoy no se encuentra en el sistema.`);
                    return;
                }
            } else {
                setAssignedUserForPin(null);
                setIsPinModalOpen(true);
            }
        } catch (error) {
            console.error("Error checking assignment:", error);
            setAssignedUserForPin(null);
            setIsPinModalOpen(true);
        }
    };

    const handleConfigClick = () => {
        setIsAssignModalOpen(true);
    };



    const onPinSuccess = async (user: Usuario) => {
        try {
            setIsCreating(true);
            // locationName should be set
            const checklistId = await startDailyChecklist(allItems.length, user, undefined, locationName);
            router.push(`/checklist/${checklistId}`);
        } catch (error) {
            console.error("Error starting checklist:", error);
            alert("Error al iniciar el checklist diario.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleCellClick = (machineId: string, day: number) => {
        // Logic for cell click if needed
    };

    const handleViewIncidencia = async (machineId: string, incId: string) => {
        try {
            const cleanId = incId.replace('#', '');
            const data = await getIncidencia(machineId, cleanId);
            if (data) {
                setSelectedIncidencia(data);
                setIsDetailModalOpen(true);
            } else {
                alert("Incidencia no encontrada.");
            }
        } catch (error) {
            console.error("Error fetching incidence:", error);
            alert("Error al cargar detalles.");
        }
    };

    const handleDateClick = (day: number) => {
        const dateStr = `${currentYear} -${String(currentMonth + 1).padStart(2, '0')} -${String(day).padStart(2, '0')} `;
        const found = checklists.find(c => c.date === dateStr);

        setSelectedDateAction({
            day,
            checklistId: found && found.id ? found.id : null
        });
        setIsDateActionModalOpen(true);
    };

    const handleDeleteDate = async () => {
        if (!selectedDateAction || !selectedDateAction.checklistId) return;
        if (confirm(`¿Estás seguro de eliminar el checklist?`)) {
            try {
                await deleteChecklist(selectedDateAction.checklistId);
                setIsDateActionModalOpen(false);
            } catch (e) {
                alert("Error al eliminar");
            }
        }
    };

    // We can also allow changing location? Maybe navigate back or select another
    // But this page is specific to ID.
    const handleNavigationBack = () => {
        router.push('/equipment');
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Checklist - {locationName || 'Cargando...'} - {monthNames[currentMonth]} {currentYear}</title>
            </Head>

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.titleGroup}>
                        <h1 className={styles.title} style={{ textTransform: 'uppercase' }}>
                            {locationName ? `Checklist: ${locationName}` : 'Cargando Ubicación...'}
                        </h1>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {monthNames[currentMonth]} {currentYear}
                        </div>
                    </div>

                    <div className={styles.headerButtons}>
                        <PDFDownloadLink
                            document={
                                <ChecklistReportDocument
                                    monthName={monthNames[currentMonth]}
                                    year={currentYear}
                                    machines={allItems}
                                    assignments={assignments.filter(a => !locationName || a.gym === locationName)}
                                    monthData={monthData}
                                    daysInMonth={new Date(currentYear, currentMonth + 1, 0).getDate()}
                                    currentMonth={currentMonth}
                                />
                            }
                            fileName={`reporte_${locationName.replace(/\s+/g, '_')}_${monthNames[currentMonth]}_${currentYear}.pdf`}
                            style={{ textDecoration: 'none' }}
                        >
                            {/* @ts-ignore */}
                            {({ loading }) => (
                                <button
                                    className={styles.actionButton}
                                    title="Exportar a PDF"
                                    disabled={loading || !locationName}
                                >
                                    {loading ? <FaSpinner className="spinner" /> : <FaFilePdf size={18} />}
                                    <span style={{ marginLeft: '0.5rem' }}>PDF</span>
                                </button>
                            )}
                        </PDFDownloadLink>
                        <ThemeToggle />
                        <button
                            onClick={handleNavigationBack}
                            className={styles.actionButton}
                            title="Volver a Equipos"
                        >
                            <FaHome size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.sectionCard}>
                    <div className={styles.sectionHeader} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FaMapMarkerAlt className={styles.sectionIcon} />
                            <h2 className={styles.sectionTitle}>
                                {locationName || 'Seleccionando...'}
                            </h2>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => {
                                    setIsComplementaryModalOpen(true);
                                }}
                                className={styles.actionButton}
                                title="Equipos Complementarios"
                                style={{ backgroundColor: '#8b5cf6', color: 'white' }}
                            >
                                <FaPlus size={14} /> <span>Equipos Comp.</span>
                            </button>

                            <button
                                onClick={handleConfigClick}
                                className={styles.actionButton}
                                title="Configurar Encargado"
                            >
                                <FaUserCog size={18} />
                            </button>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className={styles.actionButton} onClick={handlePrevMonth}><FaChevronLeft /></button>
                                <button className={styles.actionButton} onClick={handleNextMonth}><FaChevronRight /></button>
                            </div>

                            <button
                                onClick={handleStartDailyClick}
                                className={`${styles.actionButton} ${styles.buttonEquipment} `}
                                disabled={isCreating || !locationName}
                                title="Iniciar Checklist de Hoy"
                                style={{ width: 'auto', padding: '0 1rem', gap: '0.5rem' }}
                            >
                                {isCreating ? <FaSpinner className="spinner" /> : <FaPlus size={14} />}
                                <span>Checklist Diario</span>
                            </button>
                        </div>
                    </div>

                    {/* Assigned Users Section */}
                    {assignments.filter(a => a.gym === locationName).length > 0 && (
                        <div className={styles.assignedUsersContainer}>
                            <h3 className={styles.assignedUsersTitle}>
                                <FaUserCog size={14} /> Encargados del Mes
                            </h3>
                            <div className={styles.assignedUsersList}>
                                {assignments
                                    .filter(a => a.gym === locationName)
                                    .map(assignment => (
                                        <div key={assignment.id} className={styles.assignedUserCard}>
                                            <div className={styles.assignedUserAvatar}>
                                                {assignment.user?.nombres?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <div className={styles.assignedUserName} style={{ textTransform: 'uppercase' }}>
                                                    {assignment.user?.nombres} {assignment.user?.apellidos}
                                                </div>
                                                <div className={styles.assignedUserDetails}>
                                                    {assignment.startDate.split('-').slice(1).join('/')} al {assignment.endDate.split('-').slice(1).join('/')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    <MonthlyChecklistGrid
                        machines={allItems}
                        monthData={monthData}
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                        onCellClick={handleCellClick}
                        onIncidenceClick={handleViewIncidencia}
                        onDateClick={handleDateClick}
                        onReorder={async (items) => {
                            try {
                                await saveMachineOrder(items);
                            } catch (error) {
                                console.error("Error saving order:", error);
                            }
                        }}
                        uppercaseItems={true}
                    />

                </section>
            </main>

            {/* Modals are reused */}
            <IncidenciaDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedIncidencia(null);
                }}
                incidencia={selectedIncidencia}
            />

            <AssignUserModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                usuarios={usuarios}
                onAssign={async (userId, start, end, gym, assignmentId) => {
                    await assignUserChecklist(userId, start, end, gym, assignmentId);
                }}
                defaultGym={locationName} // Pass current location
            />

            <ChecklistPinModal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
                assignedUser={assignedUserForPin}
                validateUser={getUserByDni}
                onSuccess={onPinSuccess}
            />

            <ComplementaryEquipmentModal
                isOpen={isComplementaryModalOpen}
                onClose={() => setIsComplementaryModalOpen(false)}
            />



            {/* Date Action Modal Logic Copied/Reused */}
            {isDateActionModalOpen && selectedDateAction && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }} onClick={() => setIsDateActionModalOpen(false)}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '400px', width: '90%',
                        border: '1px solid var(--border-glass)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
                            Opciones para el día {selectedDateAction.day}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                onClick={() => {
                                    if (selectedDateAction.checklistId) {
                                        router.push(`/checklist/${selectedDateAction.checklistId}`);
                                    } else {
                                        // Create logic similar to main page
                                        // But we need to use startDailyChecklist logic with today? 
                                        // Or just allow user to "Start Today" button instead.
                                        // For brevity, similar logic to main page...
                                        // Just close for now or allow view.
                                        alert("Utilice el botón 'Check Hoy' para iniciar.");
                                    }
                                    setIsDateActionModalOpen(false);
                                }}
                                style={{
                                    padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
                                    backgroundColor: 'var(--accent-primary)', color: 'white', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                {selectedDateAction.checklistId ? 'Ver / Editar Checklist' : 'Hacer Checklist (Utilizar botón principal)'}
                            </button>

                            {selectedDateAction.checklistId && (
                                <button
                                    onClick={handleDeleteDate}
                                    style={{
                                        padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ef4444',
                                        backgroundColor: 'transparent', color: '#ef4444', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Eliminar Checklist
                                </button>
                            )}
                            <button
                                onClick={() => setIsDateActionModalOpen(false)}
                                style={{
                                    padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
                                    backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`
                .spinner { image-rendering: pixelated; animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

        </div>
    );
};

export default LocationChecklistPage;
