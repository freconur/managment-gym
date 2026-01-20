import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEquipmentForm } from "@/features/hooks/useEquipmentForm";
import styles from "@/styles/EquipmentRedesign.module.css";
import { useEffect, useRef, useState } from "react";
import { useManagment } from "@/features/hooks/useManagment";
import { EquipmentForm } from "@/components/EquipmentForm";
import { MachineDetailsModal } from "@/components/MachineDetailsModal";
import { NuevoUsuarioModal } from "@/components/NuevoUsuarioModal";
import { UsuariosTable } from "@/components/UsuariosTable";
import { UsuarioActionsModal } from "@/components/UsuarioActionsModal";
import { CalendarView } from "@/components/CalendarView";
import { IncidenciaDetailModal } from "@/components/IncidenciaDetailModal";
import { MantenimientoModal } from "@/components/MantenimientoModal";
import { MantenimientoDetailModal } from "@/components/MantenimientoDetailModal";
import { QRReader } from "@/components/QRReader";
import { EquiposTable } from "@/components/EquiposTable";
import { AuthModal } from "@/components/AuthModal";
import { FaUserPlus, FaTools, FaTimes, FaQrcode, FaDumbbell, FaPlus, FaHome, FaChartBar, FaUsers, FaChartLine } from "react-icons/fa";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Machine, Usuario, Incidencia, Tarea } from "@/features/types/types";

import { useEscapeKey } from "@/features/hooks/useEscapeKey"

const Equipment: NextPage = () => {
  const router = useRouter();
  const {
    getUbicaciones,
    ubicaciones,
    agregarMaquina,
    getMaquinas,
    maquinas,
    getMarcas,
    marcas,
    updateMaquinas,
    deleteMaquinas,
    createUsuario,
    getUsuarios,
    usuarios,
    updateUsuario,
    deleteUsuario,
    getAllEventos,
    eventos,
    updateIncidencia,
    deleteIncidencia,
    validateSiEsAdmin,
    createMantenimiento,
  } = useManagment();
  const { formData, handleChange, resetForm } =
    useEquipmentForm(agregarMaquina);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsuarioModalOpen, setIsUsuarioModalOpen] = useState(false);
  const [showEventoDetailModal, setShowEventoDetailModal] = useState(false);
  const [selectedIncidencia, setSelectedIncidencia] =
    useState<Incidencia | null>(null);
  const [isEquipmentFormModalOpen, setIsEquipmentFormModalOpen] =
    useState(false);
  const [showMantenimientoModal, setShowMantenimientoModal] = useState(false);
  const [isQRReaderOpen, setIsQRReaderOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authAction, setAuthAction] = useState<'mantenimiento' | 'usuario' | 'equipo' | 'delete_usuario' | 'manage_usuario' | null>(null);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [isUsuarioActionsModalOpen, setIsUsuarioActionsModalOpen] = useState(false);
  const [selectedUserForActions, setSelectedUserForActions] = useState<Usuario | null>(null);

  // Handle escape for inline modal
  useEscapeKey(() => {
    setIsEquipmentFormModalOpen(false);
    resetForm();
  }, isEquipmentFormModalOpen);

  const hasFetched = useRef(false);
  const selectedIncidenciaIdRef = useRef<string | null>(null);

  const pendingIncidenciaToAttend = useRef<string | null>(null);

  const handleOpenModal = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMachine(null);
  };

  const handleUpdateMachine = async (id: string, machine: Partial<Machine>) => {
    try {
      await updateMaquinas(id, machine);
      // Actualizar la máquina seleccionada con los nuevos datos
      if (selectedMachine && selectedMachine.id === id) {
        setSelectedMachine({ ...selectedMachine, ...machine });
      }
    } catch (error) {
      console.error("Error al actualizar máquina:", error);
      throw error;
    }
  };

  const handleDeleteMachine = async (id: string) => {
    try {
      await deleteMaquinas(id);
      // Cerrar el modal si la máquina eliminada era la seleccionada
      if (selectedMachine && selectedMachine.id === id) {
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error al eliminar máquina:", error);
      throw error;
    }
  };

  const handleOpenUsuarioModal = () => {
    setAuthAction('usuario');
    setShowAuthModal(true);
    setAuthError('');
  };

  const handleCloseUsuarioModal = () => {
    setIsUsuarioModalOpen(false);
  };

  const handleOpenEquipmentFormModal = () => {
    setAuthAction('equipo');
    setShowAuthModal(true);
    setAuthError('');
  };

  const handleCloseEquipmentFormModal = () => {
    setIsEquipmentFormModalOpen(false);
    resetForm();
  };

  const handleSubmitUsuario = async (usuario: {
    dni: string;
    nombres: string;
    apellidos: string;
    rol: string;
    pin: number;
  }) => {
    try {
      createUsuario(usuario);
      // Aquí puedes agregar la lógica para guardar el usuario
      // Por ejemplo: await agregarUsuario(usuario)
    } catch (error) {
      console.error("Error al agregar usuario:", error);
    }
  };

  const handleEditUsuario = async (usuario: Usuario) => {
    try {
      if (usuario.id || usuario.dni) {
        const id = usuario.id || usuario.dni || "";
        await updateUsuario(id, usuario);
        await getUsuarios();
      }
    } catch (error) {
      console.error("Error al editar usuario:", error);
    }
  };

  const handleOpenUsuarioActions = (usuario: Usuario) => {
    setSelectedUserForActions(usuario);
    setAuthAction('manage_usuario');
    setShowAuthModal(true);
    setAuthError('');
  };

  const handleCloseUsuarioActionsModal = () => {
    setIsUsuarioActionsModalOpen(false);
    setSelectedUserForActions(null);
  };

  useEffect(() => {
    const unsubscribeMaquinas = getMaquinas();
    const unsubscribeUbicaciones = getUbicaciones();
    const unsubscribeMarcas = getMarcas();

    return () => {
      unsubscribeMaquinas();
      unsubscribeUbicaciones();
      unsubscribeMarcas();
    };
  }, [getUbicaciones, getMaquinas, getMarcas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("formData", formData);
      await agregarMaquina(formData);
      resetForm();
      setIsEquipmentFormModalOpen(false);
    } catch (error) {
      console.error("Error al agregar máquina:", error);
    }
  };
  useEffect(() => {
    getUsuarios();
    const unsubscribeEventos = getAllEventos();

    return () => {
      if (typeof unsubscribeEventos === 'function') {
        unsubscribeEventos();
      }
    };
  }, [getUsuarios, getAllEventos]);

  // Sincronizar selectedIncidencia cuando cambien los eventos
  useEffect(() => {
    if (selectedIncidenciaIdRef.current && eventos.length > 0) {
      const updatedIncidencia = eventos.find(
        (inc) => inc.id === selectedIncidenciaIdRef.current
      );
      if (updatedIncidencia) {
        setSelectedIncidencia(updatedIncidencia);
      }
    }
  }, [eventos]);

  const handleSelectEvent = (incidencia: Incidencia) => {
    setSelectedIncidencia(incidencia);
    selectedIncidenciaIdRef.current = incidencia.id || null;
    setShowEventoDetailModal(true);
  };

  const handleCloseEventoDetailModal = () => {
    setShowEventoDetailModal(false);
    setSelectedIncidencia(null);
    selectedIncidenciaIdRef.current = null;
  };

  const handleOpenMantenimientoModal = () => {
    // Verificar si hay una incidencia seleccionada para obtener la máquina
    if (selectedIncidencia?.machineId) {
      setAuthAction('mantenimiento');
      setShowAuthModal(true);
      setAuthError('');
    }
  };

  const handleAuthAccept = async (dni: string, pin: string) => {
    try {
      const esAdmin = await validateSiEsAdmin(dni, pin);
      if (esAdmin) {
        setShowAuthModal(false);
        setAuthError('');

        if (authAction === 'mantenimiento') {
          setShowMantenimientoModal(true);
        } else if (authAction === 'usuario') {
          setIsUsuarioModalOpen(true);
        } else if (authAction === 'equipo') {
          setIsEquipmentFormModalOpen(true);
        } else if (authAction === 'delete_usuario' && usuarioToDelete) {
          const id = usuarioToDelete.id || usuarioToDelete.dni || "";
          if (id) {
            await deleteUsuario(id);
            await getUsuarios();
          }
          setUsuarioToDelete(null);
        } else if (authAction === 'manage_usuario') {
          setIsUsuarioActionsModalOpen(true);
        }

        setAuthAction(null);
      } else {
        setAuthError('Acceso denegado. Solo administradores y desarrolladores pueden realizar esta acción.');
      }
    } catch (error) {
      console.error('Error al validar administrador:', error);
      setAuthError('Error al validar credenciales. Intente nuevamente.');
    }
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
    setAuthError('');
  };

  const handleCloseMantenimientoModal = () => {
    setShowMantenimientoModal(false);
    pendingIncidenciaToAttend.current = null;
  };

  const handleSubmitMantenimiento = async (data: {
    subTipo: string;
    fechaProgramada: Date;
    estado: string;
    descripcion: string;
    prioridad: string;
    tecnicoAsignado: Usuario | {};
    notas: string;
    tareas: Tarea[];
    mantenimientoRecurrente?: boolean;
    frecuenciaDias?: number;
  }) => {
    try {
      if (!selectedIncidencia?.machineId) return;

      const maquina = maquinas.find((m) => m.id === selectedIncidencia.machineId);
      if (!maquina || !maquina.id) return;

      const fechaReporte = new Date();

      // Obtener el objeto Usuario completo o undefined si es un objeto vacío
      const tecnicoAsignado =
        Object.keys(data.tecnicoAsignado).length > 0
          ? (data.tecnicoAsignado as Usuario)
          : undefined;

      // Si es mantenimiento recurrente
      if (
        data.mantenimientoRecurrente &&
        data.fechaProgramada &&
        data.frecuenciaDias
      ) {
        const frecuenciaDias = data.frecuenciaDias || 7;
        const numeroRepeticiones = 12; // Número fijo de repeticiones (un año)

        const fechaBaseOriginal = new Date(data.fechaProgramada);

        for (let i = 0; i < numeroRepeticiones; i++) {
          const fechaProgramada = new Date(fechaBaseOriginal);
          fechaProgramada.setDate(
            fechaProgramada.getDate() + i * frecuenciaDias
          );

          const mantenimientoData = {
            machineId: maquina.id,
            tipo: "mantenimiento",
            subTipo: data.subTipo,
            fechaReporte: fechaReporte,
            fechaProgramada: fechaProgramada,
            estado: data.estado,
            descripcion: data.descripcion,
            prioridad: data.prioridad,
            tecnicoAsignado: tecnicoAsignado,
            piezasReemplazadas: [],
            tareas: data.tareas || [],
            notas: data.notas || "",
          };

          await createMantenimiento(mantenimientoData, maquina);
        }
      } else {
        // Mantenimiento único
        const mantenimientoData = {
          machineId: maquina.id,
          tipo: "mantenimiento",
          subTipo: data.subTipo,
          fechaReporte: fechaReporte,
          fechaProgramada: data.fechaProgramada,
          estado: data.estado,
          descripcion: data.descripcion,
          prioridad: data.prioridad,
          tecnicoAsignado: tecnicoAsignado,
          piezasReemplazadas: [],
          tareas: data.tareas || [],
          notas: data.notas || "",
        };

        await createMantenimiento(mantenimientoData, maquina);
      }

      // Si hay una incidencia pendiente por atender, marcarla como atendida
      if (pendingIncidenciaToAttend.current) {
        await updateIncidencia(maquina.id, pendingIncidenciaToAttend.current, { atendida: true })
        pendingIncidenciaToAttend.current = null;
      }

      handleCloseMantenimientoModal();
    } catch (error) {
      console.error("Error al guardar mantenimiento:", error);
      throw error;
    }
  };


  return (
    <div className={styles.container}>
      <Head>
        <title>Equipos - Management Gym</title>
        <meta name="description" content="Gestión de equipos del gimnasio" />
      </Head>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Gestión de Equipos</h1>
          </div>

          <div className={styles.headerButtons}>
            <ThemeToggle />
            <button
              onClick={() => router.push('/')}
              className={styles.actionButton}
              title="Volver al Inicio"
            >
              <FaHome size={18} />
            </button>
            <button
              onClick={() => router.push('/reportes-maquinas')}
              className={styles.actionButton}
              title="Reportes de Equipos"
            >
              <FaChartBar size={18} />
            </button>
            <button
              onClick={() => setIsQRReaderOpen(true)}
              className={styles.actionButton}
              title="Lector de Código QR"
            >
              <FaQrcode size={18} />
            </button>
            <button
              onClick={handleOpenUsuarioModal}
              className={`${styles.actionButton} ${styles.buttonUser}`}
              title="Nuevo Usuario"
            >
              <FaUserPlus size={18} />
            </button>
            <button
              onClick={handleOpenEquipmentFormModal}
              className={`${styles.actionButton} ${styles.buttonEquipment}`}
              title="Agregar Nuevo Equipo"
            >
              <FaPlus size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <QRReader
          isOpen={isQRReaderOpen}
          onClose={() => setIsQRReaderOpen(false)}
          onScanSuccess={(decodedText) => {
            try {
              console.log("Código QR escaneado:", decodedText);
              let machineId = decodedText.trim();
              try {
                const url = new URL(decodedText);
                const pathParts = url.pathname.split("/").filter((part) => part);
                const idIndex = pathParts.findIndex((part) => part === "maquina");
                if (idIndex !== -1 && pathParts[idIndex + 1]) {
                  machineId = pathParts[idIndex + 1];
                }
              } catch {
                if (decodedText.includes("/maquina/")) {
                  const parts = decodedText.split("/maquina/");
                  if (parts[1]) {
                    machineId = parts[1].split("/")[0].split("?")[0].split("#")[0];
                  }
                }
              }
              machineId = machineId.replace(/[^a-zA-Z0-9_-]/g, "");
              if (!machineId) {
                alert("No se pudo extraer un ID válido de la máquina del código QR");
                return;
              }
              setTimeout(() => {
                router.push(`/maquina/${machineId}?from=equipment`);
              }, 300);
            } catch (error) {
              console.error("Error al procesar código QR:", error);
            }
          }}
          onScanError={(errorMessage) => console.error("Error al escanear QR:", errorMessage)}
        />

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <FaUsers className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Gestión de Usuarios</h2>
          </div>
          <UsuariosTable
            onEdit={handleEditUsuario}
            onOpenActions={handleOpenUsuarioActions}
          />
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <FaChartLine className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Calendario de Actividades</h2>
          </div>
          <CalendarView incidencias={eventos} onSelectEvent={handleSelectEvent} />
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <FaDumbbell className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Inventario de Equipos</h2>
          </div>
          <EquiposTable
            maquinas={maquinas}
            ubicaciones={ubicaciones}
            onOpenModal={handleOpenModal}
            from="equipment"
          />
        </section>
      </main>
      <MachineDetailsModal
        isOpen={isModalOpen}
        machine={selectedMachine}
        onClose={handleCloseModal}
        onUpdate={handleUpdateMachine}
        onDelete={handleDeleteMachine}
        marcas={marcas}
        ubicaciones={ubicaciones}
        validateSiEsAdmin={validateSiEsAdmin}
      />
      <NuevoUsuarioModal
        isOpen={isUsuarioModalOpen}
        onClose={handleCloseUsuarioModal}
        onSubmit={handleSubmitUsuario}
      />
      <UsuarioActionsModal
        isOpen={isUsuarioActionsModalOpen}
        usuario={selectedUserForActions}
        onClose={handleCloseUsuarioActionsModal}
        onEdit={handleEditUsuario}
        onDelete={async (usuario) => {
          if (usuario.id || usuario.dni) {
            const id = usuario.id || usuario.dni || "";
            await deleteUsuario(id);
            await getUsuarios();
            handleCloseUsuarioActionsModal();
          }
        }}
      />

      {/* Modal de Formulario de Equipo */}
      {
        isEquipmentFormModalOpen && (
          <div
            className={styles.modalOverlay}
            onClick={handleCloseEquipmentFormModal}
          >
            <div
              className={styles.equipmentModalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.equipmentModalHeader}>
                <h2 className={styles.equipmentModalTitle}>
                  <div style={{ position: 'relative', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaDumbbell size={24} style={{ transform: 'rotate(-45deg)', color: '#3b82f6' }} />
                    <FaPlus size={12} style={{ position: 'absolute', top: -2, right: -2, color: '#3b82f6', backgroundColor: '#fff', borderRadius: '50%' }} />
                  </div>
                  Nuevo Equipo
                </h2>
                <button
                  type="button"
                  onClick={handleCloseEquipmentFormModal}
                  className={styles.modalCloseButton}
                  aria-label="Cerrar modal"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className={styles.equipmentModalBody}>
                <EquipmentForm
                  formData={formData}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  marcas={marcas}
                  ubicaciones={ubicaciones}
                  validateSiEsAdmin={validateSiEsAdmin}
                />
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Mantenimiento */}
      <MantenimientoModal
        isOpen={showMantenimientoModal}
        onClose={handleCloseMantenimientoModal}
        usuarios={usuarios}
        onSubmit={handleSubmitMantenimiento}
      />

      {/* Modal de Detalles del Mantenimiento */}
      {
        selectedIncidencia?.tipo === "mantenimiento" && (
          <MantenimientoDetailModal
            isOpen={showEventoDetailModal}
            onClose={handleCloseEventoDetailModal}
            mantenimiento={selectedIncidencia}
            usuarios={usuarios}
            onUpdateTareas={async (tareas, estado) => {
              if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
                const updateData: any = { tareas };
                if (estado) {
                  updateData.estado = estado;
                }
                await updateIncidencia(
                  selectedIncidencia.machineId,
                  selectedIncidencia.id,
                  updateData
                );
              }
            }}
            onUpdateNotas={async (notas) => {
              if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
                await updateIncidencia(
                  selectedIncidencia.machineId,
                  selectedIncidencia.id,
                  { notas }
                );
              }
            }}
            onUpdate={async (data) => {
              if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
                const updateData: any = {};
                if (data.tecnicoAsignado !== undefined) {
                  updateData.tecnicoAsignado =
                    Object.keys(data.tecnicoAsignado).length > 0
                      ? data.tecnicoAsignado
                      : null;
                }
                if (data.descripcion !== undefined) {
                  updateData.descripcion = data.descripcion;
                }
                if (data.tareas !== undefined) {
                  updateData.tareas = data.tareas;
                }
                await updateIncidencia(
                  selectedIncidencia.machineId,
                  selectedIncidencia.id,
                  updateData
                );
              }
            }}
            validateSiEsAdmin={validateSiEsAdmin}
            onDelete={async (id) => {
              if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
                await deleteIncidencia(selectedIncidencia.machineId, id);
                handleCloseEventoDetailModal();
              }
            }}
            onUpdateMachineStatus={async (status) => {
              if (selectedIncidencia?.machineId) {
                await updateMaquinas(selectedIncidencia.machineId, { status: status as any });
              }
            }}
            onUpdateFoto={async (fotoUrl) => {
              if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
                await updateIncidencia(
                  selectedIncidencia.machineId,
                  selectedIncidencia.id,
                  { fotoUrl }
                );
              }
            }}
            maquinaRealTime={maquinas.find(m => m.id === selectedIncidencia?.machineId)}
          />
        )
      }

      {/* Modal de Detalles de la Incidencia */}
      {
        selectedIncidencia?.tipo === "incidencia" && (
          <IncidenciaDetailModal
            isOpen={showEventoDetailModal}
            onClose={handleCloseEventoDetailModal}
            incidencia={selectedIncidencia}
            onDelete={async (id) => {
              if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
                await deleteIncidencia(selectedIncidencia.machineId, id);
                handleCloseEventoDetailModal();
              }
            }}
            onCreateMaintenance={() => {
              if (selectedIncidencia?.id) {
                pendingIncidenciaToAttend.current = selectedIncidencia.id;
              }
              setShowEventoDetailModal(false);
              handleOpenMantenimientoModal();
            }}
          />
        )
      }

      {/* Modal de Autenticación */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
        onAccept={handleAuthAccept}
        error={authError}
      />
    </div>
  );
};

export default Equipment;
