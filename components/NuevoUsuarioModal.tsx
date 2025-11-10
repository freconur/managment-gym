import React, { useState } from 'react'
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { roles } from '@/utils/data'
interface NuevoUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (usuario: {
    dni: string
    nombres: string
    apellidos: string
    rol: string
    pin: number
  }) => void
}

export const NuevoUsuarioModal: React.FC<NuevoUsuarioModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    rol: ''
  })
  const [errors, setErrors] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    rol: ''
  })
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [pinData, setPinData] = useState({
    pin: '',
    confirmPin: ''
  })
  const [pinErrors, setPinErrors] = useState({
    pin: '',
    confirmPin: ''
  })

  if (!isOpen) return null

  const validateDNI = (dni: string): string => {
    if (!dni) {
      return 'El DNI es requerido'
    }
    if (!/^\d+$/.test(dni)) {
      return 'El DNI debe contener solo números'
    }
    if (dni.length !== 8) {
      return 'El DNI debe tener exactamente 8 dígitos'
    }
    return ''
  }

  const validateNombre = (nombre: string, fieldName: string): string => {
    const trimmed = nombre.trim()
    if (!trimmed) {
      return `${fieldName} es requerido`
    }
    return ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'dni') {
      // Solo permitir números y máximo 8 dígitos
      const numericValue = value.replace(/\D/g, '').slice(0, 8)
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }))
      // Validar DNI en tiempo real
      setErrors(prev => ({
        ...prev,
        dni: validateDNI(numericValue)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      // Limpiar error del campo cuando el usuario empieza a escribir
      if (errors[name as keyof typeof errors]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }))
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar todos los campos
    const dniError = validateDNI(formData.dni)
    const nombresError = validateNombre(formData.nombres, 'Nombres')
    const apellidosError = validateNombre(formData.apellidos, 'Apellidos')
    const rolError = !formData.rol ? 'El rol es requerido' : ''

    setErrors({
      dni: dniError,
      nombres: nombresError,
      apellidos: apellidosError,
      rol: rolError
    })

    // Si hay errores, no enviar el formulario
    if (dniError || nombresError || apellidosError || rolError) {
      return
    }

    // Si el formulario es válido, abrir el modal de PIN
    setIsPinModalOpen(true)
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // Solo permitir números y máximo 4 dígitos
    // Si el valor está vacío, permitirlo (para poder borrar)
    let numericValue = value.replace(/\D/g, '').slice(0, 4)
    
    // Si el valor es una cadena vacía, mantenerla como cadena vacía
    if (value === '') {
      numericValue = ''
    }
    
    const updatedPinData = {
      ...pinData,
      [name]: numericValue
    }
    
    setPinData(updatedPinData)

    // Validar en tiempo real si los PINs coinciden cuando ambos tienen 4 dígitos
    if (updatedPinData.pin.length === 4 && updatedPinData.confirmPin.length === 4) {
      if (updatedPinData.pin !== updatedPinData.confirmPin) {
        setPinErrors({
          pin: '',
          confirmPin: 'Los PINs no coinciden'
        })
      } else {
        setPinErrors({
          pin: '',
          confirmPin: ''
        })
      }
    } else {
      // Limpiar errores cuando el usuario escribe
      setPinErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handlePinSubmit = () => {
    // Validar PIN
    const pinError = !pinData.pin 
      ? 'El PIN es requerido' 
      : pinData.pin.length !== 4 
      ? 'El PIN debe tener exactamente 4 dígitos' 
      : ''
    
    // Validar confirmación de PIN
    const confirmPinError = !pinData.confirmPin
      ? 'La confirmación de PIN es requerida'
      : pinData.confirmPin.length !== 4
      ? 'La confirmación de PIN debe tener exactamente 4 dígitos'
      : pinData.pin !== pinData.confirmPin
      ? 'Los PINs no coinciden'
      : ''

    setPinErrors({
      pin: pinError,
      confirmPin: confirmPinError
    })

    // Si hay errores, no proceder
    if (pinError || confirmPinError) {
      return
    }

    // Aplicar trim a nombres y apellidos antes de enviar
    const usuarioData = {
      dni: formData.dni,
      nombres: formData.nombres.trim(),
      apellidos: formData.apellidos.trim(),
      rol: formData.rol,
      pin: Number(pinData.pin)
    }

    onSubmit(usuarioData)
    
    // Limpiar formularios
    setFormData({
      dni: '',
      nombres: '',
      apellidos: '',
      rol: ''
    })
    setErrors({
      dni: '',
      nombres: '',
      apellidos: '',
      rol: ''
    })
    setPinData({
      pin: '',
      confirmPin: ''
    })
    setPinErrors({
      pin: '',
      confirmPin: ''
    })
    setIsPinModalOpen(false)
    onClose()
  }

  const handleClosePinModal = () => {
    setPinData({
      pin: '',
      confirmPin: ''
    })
    setPinErrors({
      pin: '',
      confirmPin: ''
    })
    setIsPinModalOpen(false)
  }

  const isPinFormValid = () => {
    return (
      pinData.pin.length === 4 &&
      pinData.confirmPin.length === 4 &&
      pinData.pin === pinData.confirmPin &&
      /^\d+$/.test(pinData.pin) &&
      /^\d+$/.test(pinData.confirmPin)
    )
  }

  const handleClose = () => {
    setFormData({
      dni: '',
      nombres: '',
      apellidos: '',
      rol: ''
    })
    setErrors({
      dni: '',
      nombres: '',
      apellidos: '',
      rol: ''
    })
    // Cerrar también el modal de PIN si está abierto
    if (isPinModalOpen) {
      handleClosePinModal()
    }
    onClose()
  }

  const isFormValid = () => {
    return (
      formData.dni.length === 8 &&
      /^\d+$/.test(formData.dni) &&
      formData.nombres.trim() !== '' &&
      formData.apellidos.trim() !== '' &&
      formData.rol !== ''
    )
  }

  return (
    <>
      <div className={styles.modalOverlay} onClick={handleClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Nuevo Usuario</h3>
            <button
              type="button"
              onClick={handleClose}
              className={styles.modalCloseButton}
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <form onSubmit={handleSubmit}>
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
                  />
                  {errors.dni && (
                    <span style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                      {errors.dni}
                    </span>
                  )}
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
                  onClick={handleClose}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={!isFormValid()}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de PIN */}
      {isPinModalOpen && (
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
                      // Prevenir caracteres no numéricos excepto backspace, delete, tab, escape, enter
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                        e.preventDefault()
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
                      // Prevenir caracteres no numéricos excepto backspace, delete, tab, escape, enter
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                        e.preventDefault()
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
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

