import React, { useState, useEffect } from 'react';
import { FaTimes, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { Usuario } from '@/features/types/types';
import styles from '@/styles/equipment.module.css';
import { roles } from '@/utils/data';

import { useEscapeKey } from '@/features/hooks/useEscapeKey'

interface UsuarioActionsModalProps {
  isOpen: boolean;
  usuario: Usuario | null;
  onClose: () => void;
  onEdit?: (usuario: Usuario) => void;
  onDelete?: (usuario: Usuario) => void;
}

export const UsuarioActionsModal: React.FC<UsuarioActionsModalProps> = ({
  isOpen,
  usuario,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    rol: ''
  });
  const [errors, setErrors] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    rol: ''
  });


  useEscapeKey(() => {

    if (isEditing) {
      handleCancelEdit();
      return;
    }
    onClose();
  }, isOpen);

  useEffect(() => {
    if (usuario && isEditing) {
      setFormData({
        dni: usuario.dni || '',
        nombres: usuario.nombres || '',
        apellidos: usuario.apellidos || '',
        rol: usuario.rol || ''
      });
    }
  }, [usuario, isEditing]);

  if (!isOpen || !usuario) return null;

  const validateDNI = (dni: string): string => {
    if (!dni) {
      return 'El DNI es requerido';
    }
    if (!/^\d+$/.test(dni)) {
      return 'El DNI debe contener solo números';
    }
    if (dni.length !== 8) {
      return 'El DNI debe tener exactamente 8 dígitos';
    }
    return '';
  };

  const validateNombre = (nombre: string, fieldName: string): string => {
    const trimmed = nombre.trim();
    if (!trimmed) {
      return `${fieldName} es requerido`;
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'dni') {
      const numericValue = value.replace(/\D/g, '').slice(0, 8);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      setErrors(prev => ({
        ...prev,
        dni: validateDNI(numericValue)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      if (errors[name as keyof typeof errors]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      dni: '',
      nombres: '',
      apellidos: '',
      rol: ''
    });
    setErrors({
      dni: '',
      nombres: '',
      apellidos: '',
      rol: ''
    });

  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // No validar DNI en edición ya que está deshabilitado
    const nombresError = validateNombre(formData.nombres, 'Nombres');
    const apellidosError = validateNombre(formData.apellidos, 'Apellidos');
    const rolError = !formData.rol ? 'El rol es requerido' : '';

    setErrors({
      dni: '',
      nombres: nombresError,
      apellidos: apellidosError,
      rol: rolError
    });

    if (nombresError || apellidosError || rolError) {
      return;
    }

    // Al editar, no pedimos PIN, solo actualizamos los datos
    const updatedUsuario: Usuario = {
      ...usuario,
      dni: formData.dni, // Mantener el DNI original
      nombres: formData.nombres.trim(),
      apellidos: formData.apellidos.trim(),
      rol: formData.rol
      // No actualizamos el PIN
    };

    if (onEdit) {
      onEdit(updatedUsuario);
    }

    handleCancelEdit();
    onClose();
  };



  const isFormValid = () => {
    return (
      formData.dni.length === 8 &&
      /^\d+$/.test(formData.dni) &&
      formData.nombres.trim() !== '' &&
      formData.apellidos.trim() !== '' &&
      formData.rol !== ''
    );
  };



  const handleDeleteClick = () => {
    if (usuario && onDelete && window.confirm(`¿Está seguro de que desea eliminar al usuario ${usuario.nombres} ${usuario.apellidos}? Esta acción no se puede deshacer.`)) {
      onDelete(usuario);
    }
  };




  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>
              {isEditing ? 'Editar Usuario' : 'Acciones de Usuario'}
            </h3>
            <button
              type="button"
              onClick={isEditing ? handleCancelEdit : onClose}
              className={styles.modalCloseButton}
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
          </div>
          <div className={styles.modalBody}>
            {isEditing ? (
              <form onSubmit={handleFormSubmit}>
                <div className={styles.modalSection}>
                  <div className={styles.formField}>
                    <label className={styles.label} htmlFor="dni">
                      DNI
                    </label>
                    <input
                      type="text"
                      id="dni"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      placeholder="Ingrese el DNI (8 dígitos)"
                      className={styles.input}
                      required
                      maxLength={8}
                      disabled
                      style={{
                        backgroundColor: '#f3f4f6',
                        cursor: 'not-allowed',
                        opacity: 0.7
                      }}
                    />
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.25rem',
                      display: 'block'
                    }}>
                      El DNI no se puede modificar
                    </span>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.label} htmlFor="nombres">
                      Nombres
                    </label>
                    <input
                      type="text"
                      id="nombres"
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleChange}
                      placeholder="Ingrese los nombres"
                      className={styles.input}
                      required
                    />
                    {errors.nombres && (
                      <span style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                        {errors.nombres}
                      </span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.label} htmlFor="apellidos">
                      Apellidos
                    </label>
                    <input
                      type="text"
                      id="apellidos"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleChange}
                      placeholder="Ingrese los apellidos"
                      className={styles.input}
                      required
                    />
                    {errors.apellidos && (
                      <span style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                        {errors.apellidos}
                      </span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.label} htmlFor="rol">
                      Rol
                    </label>
                    <select
                      id="rol"
                      name="rol"
                      value={formData.rol}
                      onChange={handleChange}
                      className={styles.select}
                      required
                    >
                      <option value="">Seleccione un rol</option>
                      {roles.map((rol) => (
                        <option key={rol.id} value={rol.name}>
                          {rol.name}
                        </option>
                      ))}
                    </select>
                    {errors.rol && (
                      <span style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                        {errors.rol}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.modalButtonGroup} style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    disabled={!isFormValid()}
                  >
                    Continuar
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ padding: '1rem 0' }}>
                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <h4 style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '1.25rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Información del Usuario
                  </h4>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1.25rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <label style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        DNI
                      </label>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: '#111827',
                        fontFamily: 'Courier New, monospace',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'white',
                        borderRadius: '0.375rem',
                        border: '1px solid #e5e7eb',
                        textTransform: 'uppercase'
                      }}>
                        {usuario.dni || 'N/A'}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <label style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Rol
                      </label>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        display: 'inline-block',
                        width: 'fit-content',
                        backgroundColor: usuario.rol?.toLowerCase() === 'administrador' || usuario.rol?.toLowerCase() === 'admin'
                          ? '#fee2e2'
                          : usuario.rol?.toLowerCase() === 'tecnico' || usuario.rol?.toLowerCase() === 'empleado'
                            ? '#dbeafe'
                            : usuario.rol?.toLowerCase() === 'desarrollador'
                              ? '#d1fae5'
                              : '#f3f4f6',
                        color: usuario.rol?.toLowerCase() === 'administrador' || usuario.rol?.toLowerCase() === 'admin'
                          ? '#991b1b'
                          : usuario.rol?.toLowerCase() === 'tecnico' || usuario.rol?.toLowerCase() === 'empleado'
                            ? '#1e40af'
                            : usuario.rol?.toLowerCase() === 'desarrollador'
                              ? '#065f46'
                              : '#374151'
                      }}>
                        {usuario.rol || 'Sin rol'}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <label style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Nombres
                      </label>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: '#111827',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'white',
                        borderRadius: '0.375rem',
                        border: '1px solid #e5e7eb',
                        textTransform: 'uppercase'
                      }}>
                        {usuario.nombres || 'N/A'}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <label style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Apellidos
                      </label>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: '#111827',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'white',
                        borderRadius: '0.375rem',
                        border: '1px solid #e5e7eb',
                        textTransform: 'uppercase'
                      }}>
                        {usuario.apellidos || 'N/A'}
                      </div>
                    </div>


                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'center',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={handleEditClick}
                      className={`${styles.button} ${styles.buttonPrimary}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                    >
                      <FaEdit size={16} />
                      Editar Usuario
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      className={`${styles.button} ${styles.buttonDanger}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                    >
                      <FaTrash size={16} />
                      Eliminar Usuario
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

