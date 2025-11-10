import React, { useState, useEffect } from 'react';
import { FaTimes, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { Usuario } from '@/features/types/types';
import styles from '@/styles/equipment.module.css';
import { roles } from '@/utils/data';

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
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isDeletePinModalOpen, setIsDeletePinModalOpen] = useState(false);
  const [pinData, setPinData] = useState({
    pin: '',
    confirmPin: ''
  });
  const [deletePinData, setDeletePinData] = useState({
    pin: ''
  });
  const [pinErrors, setPinErrors] = useState({
    pin: '',
    confirmPin: ''
  });
  const [deletePinError, setDeletePinError] = useState('');

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
    setIsPinModalOpen(false);
    setPinData({
      pin: '',
      confirmPin: ''
    });
    setPinErrors({
      pin: '',
      confirmPin: ''
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

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let numericValue = value.replace(/\D/g, '').slice(0, 4);
    
    if (value === '') {
      numericValue = '';
    }
    
    const updatedPinData = {
      ...pinData,
      [name]: numericValue
    };
    
    setPinData(updatedPinData);

    if (updatedPinData.pin.length === 4 && updatedPinData.confirmPin.length === 4) {
      if (updatedPinData.pin !== updatedPinData.confirmPin) {
        setPinErrors({
          pin: '',
          confirmPin: 'Los PINs no coinciden'
        });
      } else {
        setPinErrors({
          pin: '',
          confirmPin: ''
        });
      }
    } else {
      setPinErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePinSubmit = () => {
    const pinError = !pinData.pin 
      ? 'El PIN es requerido' 
      : pinData.pin.length !== 4 
      ? 'El PIN debe tener exactamente 4 dígitos' 
      : '';
    
    const confirmPinError = !pinData.confirmPin
      ? 'La confirmación de PIN es requerida'
      : pinData.confirmPin.length !== 4
      ? 'La confirmación de PIN debe tener exactamente 4 dígitos'
      : pinData.pin !== pinData.confirmPin
      ? 'Los PINs no coinciden'
      : '';

    setPinErrors({
      pin: pinError,
      confirmPin: confirmPinError
    });

    if (pinError || confirmPinError) {
      return;
    }

    const updatedUsuario: Usuario = {
      ...usuario,
      dni: formData.dni,
      nombres: formData.nombres.trim(),
      apellidos: formData.apellidos.trim(),
      rol: formData.rol,
      pin: Number(pinData.pin)
    };

    if (onEdit) {
      onEdit(updatedUsuario);
    }
    
    handleCancelEdit();
    onClose();
  };

  const handleClosePinModal = () => {
    setPinData({
      pin: '',
      confirmPin: ''
    });
    setPinErrors({
      pin: '',
      confirmPin: ''
    });
    setIsPinModalOpen(false);
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

  const isPinFormValid = () => {
    return (
      pinData.pin.length === 4 &&
      pinData.confirmPin.length === 4 &&
      pinData.pin === pinData.confirmPin &&
      /^\d+$/.test(pinData.pin) &&
      /^\d+$/.test(pinData.confirmPin)
    );
  };

  const handleDeleteClick = () => {
    setIsDeletePinModalOpen(true);
  };

  const handleDeletePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setDeletePinData({ pin: value });
    if (deletePinError) {
      setDeletePinError('');
    }
  };

  const handleDeletePinSubmit = () => {
    if (!deletePinData.pin) {
      setDeletePinError('El PIN es requerido');
      return;
    }

    if (deletePinData.pin.length !== 4) {
      setDeletePinError('El PIN debe tener exactamente 4 dígitos');
      return;
    }

    // Validar que el PIN coincida con el del usuario
    if (usuario.pin && Number(deletePinData.pin) !== usuario.pin) {
      setDeletePinError('El PIN ingresado no coincide');
      return;
    }

    // Si el PIN es correcto, proceder con la eliminación
    if (onDelete) {
      onDelete(usuario);
    }
    setIsDeletePinModalOpen(false);
    setDeletePinData({ pin: '' });
    setDeletePinError('');
    onClose();
  };

  const handleCloseDeletePinModal = () => {
    setIsDeletePinModalOpen(false);
    setDeletePinData({ pin: '' });
    setDeletePinError('');
  };

  if (isDeletePinModalOpen) {
    return (
      <div className={styles.modalOverlay} onClick={handleCloseDeletePinModal}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Confirmar Eliminación</h3>
            <button
              type="button"
              onClick={handleCloseDeletePinModal}
              className={styles.modalCloseButton}
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ 
                color: '#dc2626', 
                fontSize: '0.875rem', 
                marginBottom: '1rem',
                fontWeight: 500
              }}>
                ⚠️ Esta acción no se puede deshacer
              </p>
              <p style={{ 
                color: '#374151', 
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}>
                Para eliminar al usuario <strong>{usuario.nombres} {usuario.apellidos}</strong>, 
                ingrese el PIN del usuario:
              </p>
            </div>
            <div className={styles.modalSection}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="deletePin">
                  PIN del Usuario (4 dígitos)
                </label>
                <input
                  type="password"
                  id="deletePin"
                  name="deletePin"
                  value={deletePinData.pin}
                  onChange={handleDeletePinChange}
                  placeholder="Ingrese el PIN (4 dígitos)"
                  className={styles.input}
                  required
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleDeletePinSubmit();
                    }
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
                {deletePinError && (
                  <span style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    {deletePinError}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.modalButtonGroup} style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCloseDeletePinModal}
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePinSubmit}
                className={`${styles.button} ${styles.buttonDanger}`}
                disabled={deletePinData.pin.length !== 4}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <FaTrash size={16} />
                Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isPinModalOpen) {
    return (
      <div className={styles.modalOverlay} onClick={handleClosePinModal}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Ingresar PIN</h3>
            <button
              type="button"
              onClick={handleClosePinModal}
              className={styles.modalCloseButton}
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.modalSection}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="pin">
                  PIN (4 dígitos)
                </label>
                <input
                  type="password"
                  id="pin"
                  name="pin"
                  value={pinData.pin}
                  onChange={handlePinChange}
                  placeholder="Ingrese el PIN (4 dígitos)"
                  className={styles.input}
                  required
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
                {pinErrors.pin && (
                  <span style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    {pinErrors.pin}
                  </span>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="confirmPin">
                  Confirmar PIN
                </label>
                <input
                  type="password"
                  id="confirmPin"
                  name="confirmPin"
                  value={pinData.confirmPin}
                  onChange={handlePinChange}
                  placeholder="Confirme el PIN (4 dígitos)"
                  className={styles.input}
                  required
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
                {pinErrors.confirmPin && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '4px',
                    color: '#856404',
                    fontSize: '0.875rem'
                  }}>
                    <FaExclamationTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{pinErrors.confirmPin}</span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalButtonGroup} style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleClosePinModal}
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePinSubmit}
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={!isPinFormValid()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                        border: '1px solid #e5e7eb'
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
                        border: '1px solid #e5e7eb'
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
                        border: '1px solid #e5e7eb'
                      }}>
                        {usuario.apellidos || 'N/A'}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      gridColumn: 'span 2'
                    }}>
                      <label style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        PIN
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
                        letterSpacing: '0.1em'
                      }}>
                        {usuario.pin ? `****${usuario.pin.toString().slice(-1)}` : 'N/A'}
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

