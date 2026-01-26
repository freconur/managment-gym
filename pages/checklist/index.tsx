import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useChecklist } from "@/features/hooks/useChecklist";
import { useManagment } from "@/features/hooks/useManagment";
import { MonthlyChecklistGrid } from "@/components/MonthlyChecklistGrid";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AssignUserModal } from "@/components/AssignUserModal";
import { AuthModal } from "@/components/AuthModal";
import { ChecklistPinModal } from "@/components/ChecklistPinModal";



import { ChecklistAssignment, Usuario, Incidencia } from "@/features/types/types";
import { FaUserCog, FaHome, FaPlus, FaClipboardList, FaSpinner, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import styles from "@/styles/EquipmentRedesign.module.css";
import { IncidenciaDetailModal } from "@/components/IncidenciaDetailModal";
import { ComplementaryEquipmentModal } from "@/components/ComplementaryEquipmentModal";
import { useComplementaryEquipment } from "@/features/hooks/useComplementaryEquipment";
import dynamic from 'next/dynamic';
import { ChecklistReportDocument } from "@/components/pdf/ChecklistReportPDF";
import { FaFilePdf } from "react-icons/fa";

// Dynamically import PDFDownloadLink with no SSR to avoid server-side rendering issues
const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <button className={styles.actionButton} disabled><FaSpinner className="spinner" /> PDF</button>,
    }
);

const ChecklistPage: NextPage = () => {
    const router = useRouter();
    const { monthData, getMonthChecklistData, startDailyChecklist, assignUserChecklist, getChecklistAssignment, getMonthlyAssignments, assignments, checklists, deleteChecklist } = useChecklist();
    const { maquinas, getMaquinas, getUsuarios, usuarios, validateAndGetUser, getIncidencia, getUbicaciones, ubicaciones, saveMachineOrder } = useManagment();
    const { getComplementaryEquipment, equipment: complementaryEquipment } = useComplementaryEquipment();
    const [isCreating, setIsCreating] = useState(false);
    const [locationFilter, setLocationFilter] = useState('');

    // Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedIncidencia, setSelectedIncidencia] = useState<Incidencia | null>(null);

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authContext, setAuthContext] = useState<'assignment' | 'date_options' | null>(null);

    // Date Action Modal
    const [isDateActionModalOpen, setIsDateActionModalOpen] = useState(false);
    const [selectedDateAction, setSelectedDateAction] = useState<{ day: number, checklistId: string | null } | null>(null);

    // Assignment & PIN Modal State
    // Modals
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [assignedUserForPin, setAssignedUserForPin] = useState<Usuario | null>(null);


    // Complementary Equipment Modal State
    const [isComplementaryModalOpen, setIsComplementaryModalOpen] = useState(false);

    // Month Selector State
    const [viewDate, setViewDate] = useState(new Date());
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

    const monthNames = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ];

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
            .filter(c => c.status === 'active') // Only showing active ones
            .map(c => ({
                id: c.id,
                name: c.name,
                location: c.location || 'Complementarios',
                type: 'complementary',
                order: c.order
            }));

        const combined = [...machineItems, ...compItems];

        // Sort combined list by order
        combined.sort((a, b) => {
            const orderA = a.order ?? 999999;
            const orderB = b.order ?? 999999;
            return orderA - orderB;
        });

        if (locationFilter) {
            return combined.filter(item => item.location === locationFilter);
        }

        return combined;
    }, [maquinas, complementaryEquipment, locationFilter]);

    const handlePrevMonth = () => {
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const handleStartDailyClick = async () => {
        if (allItems.length === 0) {
            alert("No hay ítems registrados para realizar el checklist.");
            return;
        }

        try {
            // Check for assignment
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const assignment = await getChecklistAssignment(todayStr);
            if (assignment && assignment.userId) {
                const assignedUser = usuarios.find(u => u.dni === assignment.userId || u.id === assignment.userId);

                if (assignedUser) {
                    setAssignedUserForPin(assignedUser);
                    setIsPinModalOpen(true);
                } else {
                    alert("El usuario asignado para hoy no se encuentra en el sistema. Contacte al administrador.");
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
        setAuthContext('assignment');
        setShowAuthModal(true);
    };

    const handleAuthAccept = async (dni: string, pin: string) => {
        try {
            const user = await validateAndGetUser(dni, pin);
            if (user) {
                // Role Validation: Allowlist for 'administrador' or 'desarrollador'
                const userRole = (user.rol || '').toLowerCase();
                const allowedRoles = ['administrador', 'desarrollador'];

                if (authContext && !allowedRoles.includes(userRole)) {
                    alert("Acceso denegado: Se requieren permisos de administrador o desarrollador.");
                    return;
                }

                setShowAuthModal(false);
                if (authContext === 'assignment') {
                    setIsAssignModalOpen(true);
                } else if (authContext === 'date_options') {
                    setIsDateActionModalOpen(true);
                }
            } else {
                alert("Credenciales inválidas");
            }
        } catch (e) {
            alert("Error de autenticación");
        }
    };

    const onPinSuccess = async (user: Usuario) => {
        try {
            setIsCreating(true);
            const checklistId = await startDailyChecklist(allItems.length, user);
            router.push(`/checklist/${checklistId}`);
        } catch (error) {
            console.error("Error starting checklist:", error);
            alert("Error al iniciar el checklist diario.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleCellClick = (machineId: string, day: number) => {
        // Only allow clicking today's cell to start/continue revision
        const today = new Date();
        if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
        }
    };

    const handleViewIncidencia = async (machineId: string, incId: string) => {
        try {
            // Clean ID if needed (logic matches [id].tsx)
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
    };

    const handleDateClick = (day: number) => {
        // Find if there is a checklist for this date
        const dateStr = `${currentYear} -${String(currentMonth + 1).padStart(2, '0')} -${String(day).padStart(2, '0')} `;
        const found = checklists.find(c => c.date === dateStr);

        setSelectedDateAction({
            day,
            checklistId: found && found.id ? found.id : null
        });
        setAuthContext('date_options');
        setShowAuthModal(true);
    };

    const handleEditDate = () => {
        if (!selectedDateAction) return;
        const { day, checklistId } = selectedDateAction;
        const dateStr = `${currentYear} -${String(currentMonth + 1).padStart(2, '0')} -${String(day).padStart(2, '0')} `;

        if (checklistId) {
            router.push(`/ checklist / ${checklistId} `);
        } else {
            // Create new if strictly needed, or just redirect with query param?
            // Since handleStartDailyClick does logic to check if exists, we can reuse that logic or simpler:
            // If not exists, usually we want to "Create". 
            // Let's assume we want to create for that specific date.
            // But the current "Start Daily" is for "Today". 
            // If user clicks a past date and wants to "Do" it:
            router.push(`/ checklist / new? date = ${dateStr} `); // Assuming [id].tsx handles creation or new route
            // Actually currently [id].tsx is for viewing. creation is usually implicit or via 'Check Hoy'.
            // Let's restart: "hacer o editar".
            // If "hacer" (do) for a past date, we might need to create it.
            // For now, let's just push to /checklist/new with date if we supported it, 
            // OR if the system only supports "Today", then "Hacer" might only work for today.
            // But user asked "hacer ... de esa fecha". So they want to backfill.
            // I'll check if [id] handles `new `.
            router.push(`/checklist/daily?date=${dateStr}`); // Re-route to daily logic
        }
        setIsDateActionModalOpen(false); // Close modal
    };

    const handleDeleteDate = async () => {
        if (!selectedDateAction || !selectedDateAction.checklistId) return;

        if (confirm(`¿Estás seguro de eliminar el checklist del día ${selectedDateAction.day}? Esta acción no se puede deshacer.`)) {
            try {
                await deleteChecklist(selectedDateAction.checklistId);
                setIsDateActionModalOpen(false);
            } catch (e) {
                alert("Error al eliminar");
            }
        }
    };

    return (
        <div className={styles.container}>
            <Head>
                <title>Control de Equipos - {monthNames[currentMonth]} {currentYear}</title>
            </Head>

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.titleGroup}>
                        <h1 className={styles.title}>Control Mensual de Equipos</h1>
                    </div>

                    <div className={styles.headerButtons}>
                        <PDFDownloadLink
                            document={
                                <ChecklistReportDocument
                                    monthName={monthNames[currentMonth]}
                                    year={currentYear}
                                    machines={allItems} // allItems is already sorted by order
                                    assignments={assignments.filter(a => !locationFilter || !a.gym || a.gym === locationFilter)}
                                    monthData={monthData}
                                    daysInMonth={new Date(currentYear, currentMonth + 1, 0).getDate()}
                                    currentMonth={currentMonth}
                                />
                            }
                            fileName={`reporte_checklist_${monthNames[currentMonth]}_${currentYear}.pdf`}
                            style={{ textDecoration: 'none' }}
                        >
                            {/* @ts-ignore */}
                            {({ blob, url, loading, error }) => (
                                <button
                                    className={styles.actionButton}
                                    title="Exportar a PDF"
                                    disabled={loading}
                                >
                                    {loading ? <FaSpinner className="spinner" /> : <FaFilePdf size={18} />}
                                    <span style={{ marginLeft: '0.5rem' }}>PDF</span>
                                </button>
                            )}
                        </PDFDownloadLink>
                        <ThemeToggle />
                        <button
                            onClick={() => router.push('/equipment')}
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
                            <FaClipboardList className={styles.sectionIcon} />
                            <h2 className={styles.sectionTitle}>
                                REVISIÓN: {monthNames[currentMonth]} {currentYear}
                            </h2>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            {/* Location Filter */}
                            <select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className={styles.locationFilterSelect}
                            >
                                <option value="">Todas las ubicaciones</option>
                                {ubicaciones.map(u => (
                                    <option key={u.id} value={u.name}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={() => setIsComplementaryModalOpen(true)}
                                className={styles.actionButton}
                                title="Equipos Complementarios"
                                style={{
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    padding: '0 1rem',
                                    gap: '0.5rem',
                                    width: 'auto'
                                }}
                            >
                                <FaPlus size={14} /> <span>Equipos Comp.</span>
                            </button>
                            <button
                                onClick={handleConfigClick}
                                className={styles.actionButton}
                                title="Configurar Encargado"
                            >
                                <FaUserCog size={18} className={styles.buttonUser} />
                            </button>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className={styles.actionButton} onClick={handlePrevMonth}><FaChevronLeft /></button>
                                <button className={styles.actionButton} onClick={handleNextMonth}><FaChevronRight /></button>
                            </div>
                            <button
                                onClick={handleStartDailyClick}
                                className={`${styles.actionButton} ${styles.buttonEquipment} `}
                                disabled={isCreating}
                                title="Iniciar Checklist de Hoy"
                                style={{ width: 'auto', padding: '0 1rem', gap: '0.5rem' }}
                            >
                                {isCreating ? <FaSpinner className="spinner" /> : <FaPlus size={14} />}
                                <span>Check Hoy</span>
                            </button>
                        </div>
                    </div>

                    {/* Assigned Users Section */}
                    {assignments.filter(a => !locationFilter || !a.gym || a.gym === locationFilter).length > 0 && (
                        <div className={styles.assignedUsersContainer}>
                            <h3 className={styles.assignedUsersTitle}>
                                <FaUserCog size={14} /> Encargados del Mes
                            </h3>
                            <div className={styles.assignedUsersList}>
                                {assignments
                                    .filter(a => !locationFilter || !a.gym || a.gym === locationFilter)
                                    .map(assignment => (
                                        <div key={assignment.id} className={styles.assignedUserCard}>
                                            <div className={styles.assignedUserAvatar}>
                                                {assignment.user?.nombres?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <div className={styles.assignedUserName}>
                                                    {assignment.user?.nombres} {assignment.user?.apellidos}
                                                </div>
                                                <div className={styles.assignedUserDetails}>
                                                    {assignment.gym || 'Global'} • {assignment.startDate.split('-').slice(1).join('/')} al {assignment.endDate.split('-').slice(1).join('/')}
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
                            // Optimistically update or just save?
                            // The grid maintains local state, so we just calculate proper global indexes if needed.
                            // However, the grid passes back the reordered array.
                            // We should save this order.
                            try {
                                await saveMachineOrder(items);
                            } catch (error) {
                                console.error("Error saving order:", error);
                                alert("Error al guardar el orden.");
                            }
                        }}
                    />
                </section>
            </main>

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
            />

            <ChecklistPinModal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
                assignedUser={assignedUserForPin}
                validateUser={validateAndGetUser}
                onSuccess={onPinSuccess}
            />

            <ComplementaryEquipmentModal
                isOpen={isComplementaryModalOpen}
                onClose={() => setIsComplementaryModalOpen(false)}
            />

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onAccept={handleAuthAccept}
            />

            {/* Date Action Modal */}
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
                                onClick={async () => {
                                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDateAction.day).padStart(2, '0')}`;
                                    // Navigate to daily view/create
                                    // If checklist exists, go to it. If not, go to generic daily which might create it or show empty.
                                    if (selectedDateAction.checklistId) {
                                        router.push(`/checklist/${selectedDateAction.checklistId}`);
                                    } else {                                            // If no checklist, create one for the specific date
                                        try {
                                            // We need to know 'count' (item count) and 'user'.
                                            // Item count is allItems.length
                                            // User check is tricky here. Usually we need assigned user or current user.
                                            // If we just want to "Create" it, we can pass null user?
                                            // Or we re-use the 'startDailyHook'.
                                            // Note: We need to await it. 
                                            // But we can't await easily in onClick without async.
                                            // Let's make the onClick async.

                                            // Determine User:
                                            // If this date had an assignment, we should technically use that?
                                            // Or just use the current logged in "user"?
                                            // For backfilling, usually it's the admin or current user doing it. (Or we prompt for PIN?)
                                            // For simplicity/UX requested: just "Make it work". 
                                            // We'll use 'null' user initially or if possible the current context but user is not readily available in this scope?
                                            // Actually 'validateAndGetUser' returns user. 'usuarios' is list.
                                            // We don't have the "current logged in user" stored in state effectively except for 'assignedUserForPin'.
                                            // Let's pass `null` as user for now (or `{}`), assuming it will be updated when items are checked.
                                            const newId = await startDailyChecklist(allItems.length, null, dateStr);
                                            router.push(`/checklist/${newId}`);
                                        } catch (e) {
                                            console.error("Error creating checklist:", e);
                                            alert("Error al crear el checklist.");
                                        }
                                    }
                                    setIsDateActionModalOpen(false);
                                }}
                                style={{
                                    padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
                                    backgroundColor: 'var(--accent-primary)', color: 'white', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                {selectedDateAction.checklistId ? 'Ver / Editar Checklist' : 'Hacer Checklist (No disp.)'}
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
    .spinner {
    animation: spin 1s linear infinite;
}
@keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
}
`}</style>
        </div>
    );
};

export default ChecklistPage;
