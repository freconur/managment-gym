import Link from "next/link";
import { FaQrcode, FaCog, FaHome } from "react-icons/fa";
import { Machine } from "@/features/types/types";
import styles from "@/styles/equipment.module.css";
import { useMemo, useState } from "react";

interface Ubicacion {
  id?: string;
  name?: string;
}

interface EquiposTableProps {
  maquinas: Machine[];
  ubicaciones: Ubicacion[];
  onOpenModal: (machine: Machine) => void;
  from?: string; // Página de origen para el enlace de retorno
}

export const EquiposTable = ({
  maquinas,
  ubicaciones,
  onOpenModal,
  from,
}: EquiposTableProps) => {
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");

  // Filtrar máquinas según los filtros
  const maquinasFiltradas = useMemo(() => {
    return maquinas.filter((maquina) => {
      // Filtro por ubicación
      if (filtroUbicacion && maquina.location !== filtroUbicacion) {
        return false;
      }

      // Filtro por estado
      if (filtroEstado && maquina.status !== filtroEstado) {
        return false;
      }

      return true;
    });
  }, [maquinas, filtroUbicacion, filtroEstado]);

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          Equipos Registrados ({maquinas.length})
        </h2>
        <div className={styles.sectionHeaderLinks}>
          {from !== 'equipment' && (
            <Link href="/equipment" className={styles.viewLink}>
              <FaHome size={16} />
              <span>Inicio</span>
            </Link>
          )}
          <Link href="/qr" className={styles.qrLink}>
            <FaQrcode size={16} />
            <span>QR</span>
          </Link>
          {from !== 'mis-equipos' && (
            <Link href="mis-equipos" className={styles.viewLink}>vista completa</Link>
          )}
        </div>
      </div>
      {maquinas.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            No hay equipos registrados. Haz clic en &quot;Agregar Nuevo
            Equipo&quot; para comenzar.
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.equipmentTable}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <span>Ubicación</span>
                    <select
                      value={filtroUbicacion}
                      onChange={(e) => setFiltroUbicacion(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: "0.375rem 0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                        backgroundColor: "#fff",
                        color: "#374151",
                        cursor: "pointer",
                        minWidth: "150px",
                      }}
                    >
                      <option value="">Todas</option>
                      {ubicaciones.map((ubicacion) => (
                        <option key={ubicacion.id} value={ubicacion.name}>
                          {ubicacion.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
                <th>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <span>Estado</span>
                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: "0.375rem 0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                        backgroundColor: "#fff",
                        color: "#374151",
                        cursor: "pointer",
                        minWidth: "120px",
                      }}
                    >
                      <option value="">Todos</option>
                      <option value="active">Activo</option>
                      <option value="maintenance">Mantenimiento</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {maquinasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "#6b7280",
                    }}
                  >
                    No se encontraron máquinas con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                maquinasFiltradas.map((machine) => (
                  <tr key={machine.id}>
                    <td className={styles.tableCellName}>
                      <Link
                        href={`/maquina/${machine.id}${from ? `?from=${from}` : ''}`}
                        className={styles.tableCellLink}
                      >
                        {machine.name || "N/A"}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/maquina/${machine.id}${from ? `?from=${from}` : ''}`}
                        className={styles.tableCellLink}
                      >
                        {machine.location || "N/A"}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/maquina/${machine.id}${from ? `?from=${from}` : ''}`}
                        className={styles.tableCellLink}
                      >
                        <span
                          className={`${styles.statusBadge} ${
                            machine.status === "active"
                              ? styles.statusActive
                              : machine.status === "maintenance"
                              ? styles.statusMaintenance
                              : machine.status === "inactive"
                              ? styles.statusInactive
                              : ""
                          }`}
                        >
                          {machine.status === "active"
                            ? "Activo"
                            : machine.status === "maintenance"
                            ? "Mantenimiento"
                            : machine.status === "inactive"
                            ? "Inactivo"
                            : "N/A"}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenModal(machine);
                        }}
                        className={styles.tableActionButton}
                        aria-label="Ver detalles del equipo"
                        title="Ver detalles"
                      >
                        <FaCog size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

