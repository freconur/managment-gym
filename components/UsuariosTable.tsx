import React, { useEffect, useState } from 'react';
import { useManagment } from '@/features/hooks/useManagment';
import { Usuario } from '@/features/types/types';
import styles from '@/styles/usuarios.module.css';
import { FaCog, FaUser } from 'react-icons/fa';
import { UsuarioActionsModal } from './UsuarioActionsModal';

interface UsuariosTableProps {
  onEdit?: (usuario: Usuario) => void;
  onDelete?: (usuario: Usuario) => void;
}

export const UsuariosTable: React.FC<UsuariosTableProps> = ({ onEdit, onDelete }) => {
  const { getUsuarios, usuarios } = useManagment();
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = getUsuarios();
    return () => {
      unsubscribe();
    };
  }, [getUsuarios]);

  const getRolBadgeClass = (rol?: string) => {
    switch (rol?.toLowerCase()) {
      case 'admin':
      case 'administrador':
        return styles.rolAdmin;
      case 'empleado':
      case 'employee':
        return styles.rolEmpleado;
      case 'cliente':
      case 'client':
        return styles.rolCliente;
      default:
        return styles.rolDefault;
    }
  };

  const getRolLabel = (rol?: string) => {
    if (!rol) return 'Sin rol';
    const roles: { [key: string]: string } = {
      'admin': 'Administrador',
      'administrador': 'Administrador',
      'empleado': 'Empleado',
      'employee': 'Empleado',
      'cliente': 'Cliente',
      'client': 'Cliente',
    };
    return roles[rol.toLowerCase()] || rol;
  };

  const handleOpenModal = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUsuario(null);
  };

  const handleEdit = (usuario: Usuario) => {
    if (onEdit) {
      onEdit(usuario);
    }
  };

  const handleDelete = (usuario: Usuario) => {
    if (onDelete) {
      onDelete(usuario);
    }
  };

  return (
    <div className={styles.usuariosContainer}>
      <div className={styles.usuariosHeader}>
        <h2 className={styles.usuariosTitle}>
          Usuarios Registrados
          <span className={styles.usuariosCount}>({usuarios.length})</span>
        </h2>
      </div>

      {usuarios.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <FaUser size={48} />
          </div>
          <p className={styles.emptyStateText}>
            No hay usuarios registrados.
          </p>
          <p className={styles.emptyStateSubtext}>
            Agrega un nuevo usuario para comenzar.
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.usuariosTable}>
            <thead>
              <tr>
                <th>DNI</th>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>Rol</th>
                <th>PIN</th>
                <th className={styles.actionsColumn}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id || usuario.dni}>
                  <td className={styles.tableCellDni}>
                    {usuario.dni || 'N/A'}
                  </td>
                  <td className={styles.tableCellName}>
                    {usuario.nombres || 'N/A'}
                  </td>
                  <td className={styles.tableCellName}>
                    {usuario.apellidos || 'N/A'}
                  </td>
                  <td>
                    <span className={`${styles.rolBadge} ${getRolBadgeClass(usuario.rol)}`}>
                      {getRolLabel(usuario.rol)}
                    </span>
                  </td>
                  <td className={styles.tableCellPin}>
                    {usuario.pin ? `****${usuario.pin.toString().slice(-1)}` : 'N/A'}
                  </td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actionsGroup}>
                      <button
                        onClick={() => handleOpenModal(usuario)}
                        className={`${styles.actionButton} ${styles.settingsButton}`}
                        aria-label="Acciones de usuario"
                        title="Acciones de usuario"
                      >
                        <FaCog size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <UsuarioActionsModal
        isOpen={isModalOpen}
        usuario={selectedUsuario}
        onClose={handleCloseModal}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

