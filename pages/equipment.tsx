import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEquipmentForm } from "@/features/hooks/useEquipmentForm";
import styles from "@/styles/equipment.module.css";
import { useEffect, useRef, useState } from "react";
import { useManagment } from "@/features/hooks/useManagment";
import { EquipmentForm } from "@/components/EquipmentForm";
import { MachineDetailsModal } from "@/components/MachineDetailsModal";
import { NuevoUsuarioModal } from "@/components/NuevoUsuarioModal";
import { UsuariosTable } from "@/components/UsuariosTable";
import { CalendarView } from "@/components/CalendarView";
import { IncidenciaDetailModal } from "@/components/IncidenciaDetailModal";
import { MantenimientoModal } from "@/components/MantenimientoModal";
import { MantenimientoDetailModal } from "@/components/MantenimientoDetailModal";
import { QRReader } from "@/components/QRReader";
import { EquiposTable } from "@/components/EquiposTable";
import { AuthModal } from "@/components/AuthModal";
import { FaUserPlus, FaTools, FaTimes, FaQrcode, FaDumbbell, FaPlus, FaHome } from "react-icons/fa";
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
    setIsUsuarioModalOpen(true);
  };

  const handleCloseUsuarioModal = () => {
    setIsUsuarioModalOpen(false);
  };

  const handleOpenEquipmentFormModal = () => {
    setIsEquipmentFormModalOpen(true);
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

  const handleDeleteUsuario = async (usuario: Usuario) => {
    try {
      if (usuario.id || usuario.dni) {
        const id = usuario.id || usuario.dni || "";
        await deleteUsuario(id);
        await getUsuarios();
      }
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
    }
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
        setShowMantenimientoModal(true);
      } else {
        setAuthError('Acceso denegado. Solo administradores y desarrolladores pueden registrar mantenimientos.');
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
    <>
      <Head>
        <title>Equipos - Management Gym</title>
        <meta name="description" content="Gestión de equipos del gimnasio" />
      </Head>
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.titleWithButtons}>
            <h1 className={styles.title}>Gestión de Equipos</h1>
            <div className={styles.headerButtons}>
              <button
                onClick={() => router.push('/')}
                className={`${styles.button} ${styles.buttonIcon}`}
                style={{ backgroundColor: "#3b82f6", color: "white" }}
                title="Volver al Inicio"
                aria-label="Volver al Inicio"
              >
                <FaHome size={16} />
              </button>
              <button
                onClick={() => setIsQRReaderOpen(true)}
                className={`${styles.button} ${styles.buttonIcon}`}
                style={{ backgroundColor: "#8b5cf6", color: "white" }}
                title="Lector de Código QR"
                aria-label="Lector de Código QR"
              >
                <FaQrcode size={16} />
              </button>
              <button
                onClick={handleOpenUsuarioModal}
                className={`${styles.button} ${styles.buttonIcon} ${styles.buttonUser}`}
                title="Nuevo Usuario"
                aria-label="Nuevo Usuario"
              >
                <FaUserPlus size={16} />
              </button>
              <button
                onClick={handleOpenEquipmentFormModal}
                className={`${styles.button} ${styles.buttonIcon} ${styles.buttonEquipment}`}
                title="Agregar Nuevo Equipo"
                aria-label="Agregar Nuevo Equipo"
              >
                <div style={{ position: 'relative', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaDumbbell size={18} style={{ transform: 'rotate(-45deg)' }} />
                  <FaPlus size={9} style={{ position: 'absolute', top: 0, right: 0 }} />
                </div>
              </button>
            </div>
          </div>
        </div>

        <QRReader
          isOpen={isQRReaderOpen}
          onClose={() => setIsQRReaderOpen(false)}
          onScanSuccess={(decodedText) => {
            try {
              console.log("Código QR escaneado:", decodedText);

              // Extraer el ID de la máquina del código QR
              // Puede ser: un ID directo, una URL completa, o una ruta relativa
              let machineId = decodedText.trim();

              // Si es una URL completa, extraer el ID
              try {
                const url = new URL(decodedText);
                const pathParts = url.pathname
                  .split("/")
                  .filter((part) => part);
                const idIndex = pathParts.findIndex(
                  (part) => part === "maquina"
                );
                if (idIndex !== -1 && pathParts[idIndex + 1]) {
                  machineId = pathParts[idIndex + 1];
                }
              } catch {
                // Si no es una URL válida, verificar si es una ruta relativa
                if (decodedText.includes("/maquina/")) {
                  const parts = decodedText.split("/maquina/");
                  if (parts[1]) {
                    machineId = parts[1]
                      .split("/")[0]
                      .split("?")[0]
                      .split("#")[0];
                  }
                }
                // Si no, asumimos que decodedText es directamente el ID
              }

              // Limpiar el ID de caracteres inválidos
              machineId = machineId.replace(/[^a-zA-Z0-9_-]/g, "");

              // Validar que el ID no esté vacío
              if (!machineId || machineId.length === 0) {
                alert(
                  "No se pudo extraer un ID válido de la máquina del código QR"
                );
                return;
              }

              // Redirigir a la página de la máquina de forma segura
              // El QRReader ya cerró el modal y detuvo la cámara, esperamos un momento adicional antes de navegar
              setTimeout(() => {
                try {
                  // Intentar navegar con router.push
                  const navigationPromise = router.push(
                    `/maquina/${machineId}?from=equipment`
                  );

                  // Si router.push devuelve una promesa, manejarla
                  if (
                    navigationPromise &&
                    typeof navigationPromise.catch === "function"
                  ) {
                    navigationPromise.catch((error) => {
                      console.error("Error al navegar con router.push:", error);
                      // Fallback a window.location si router.push falla
                      window.location.href = `/maquina/${machineId}?from=equipment`;
                    });
                  }
                } catch (error) {
                  console.error("Error al navegar:", error);
                  // Fallback a window.location si router.push falla
                  window.location.href = `/maquina/${machineId}?from=equipment`;
                }
              }, 300);
            } catch (error) {
              console.error("Error al procesar código QR:", error);
              alert(
                `Error al procesar el código QR: ${error instanceof Error ? error.message : "Error desconocido"
                }`
              );
            }
          }}
          onScanError={(errorMessage) => {
            console.error("Error al escanear QR:", errorMessage);
          }}
        />

        <UsuariosTable
          onEdit={handleEditUsuario}
          onDelete={handleDeleteUsuario}
        />

        <CalendarView incidencias={eventos} onSelectEvent={handleSelectEvent} />

        <EquiposTable
          maquinas={maquinas}
          ubicaciones={ubicaciones}
          onOpenModal={handleOpenModal}
          from="equipment"
        />
      </main >
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
    </>
  );
};

export default Equipment;
