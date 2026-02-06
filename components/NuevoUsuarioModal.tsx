import React, { useState } from 'react'
import { FaTimes, FaExclamationTriangle, FaUserPlus } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { roles } from '@/utils/data'
import { useEscapeKey } from '@/features/hooks/useEscapeKey'

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

  useEscapeKey(() => {
    onClose()
  }, isOpen)

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
        [name]: value.toLowerCase()
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

    // Si el formulario es válido, enviar directamente
    const usuarioData = {
      dni: formData.dni,
      nombres: formData.nombres.trim(),
      apellidos: formData.apellidos.trim(),
      rol: formData.rol,
      pin: 0 // Default PIN since we are removing legacy auth
    }
    onSubmit(usuarioData)
    handleClose()
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
        <div className={styles.userModalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.userModalHeader}>
            <h3 className={styles.userModalTitle}>
              <FaUserPlus size={24} style={{ color: '#3b82f6' }} />
              Nuevo Usuario
            </h3>
            <button
              type="button"
              onClick={handleClose}
              className={styles.modalCloseButton}
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
          </div>
          <div className={styles.userModalBody}>
            <form onSubmit={handleSubmit}>
              <div className={styles.userFormGrid}>
                <div className={styles.userInputGroup}>
                  <label className={styles.userInputLabel} htmlFor="dni">
                    DNI
                  </label>
                  <input
                    type="text"
                    id="dni"
                    name="dni"
                    value={formData.dni}
                    onChange={handleChange}
                    placeholder="8 dígitos"
                    className={`${styles.userInput} ${errors.dni ? styles.userInputError : ''}`}
                    required
                    maxLength={8}
                    autoComplete="off"
                  />
                  {errors.dni && (
                    <span className={styles.userErrorText}>
                      {errors.dni}
                    </span>
                  )}
                </div>
                <div className={styles.userInputGroup}>
                  <label className={styles.userInputLabel} htmlFor="rol">
                    Rol
                  </label>
                  <select
                    id="rol"
                    name="rol"
                    value={formData.rol}
                    onChange={handleChange}
                    className={`${styles.userInput} ${errors.rol ? styles.userInputError : ''}`}
                    required
                    style={{ appearance: 'none' }}
                  >
                    <option value="">Seleccione un rol</option>
                    {roles.map((rol) => (
                      <option key={rol.id} value={rol.name}>
                        {rol.name}
                      </option>
                    ))}
                  </select>
                  {errors.rol && (
                    <span className={styles.userErrorText}>
                      {errors.rol}
                    </span>
                  )}
                </div>
                <div className={styles.userInputGroup}>
                  <label className={styles.userInputLabel} htmlFor="nombres">
                    Nombres
                  </label>
                  <input
                    type="text"
                    id="nombres"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    placeholder="Ingrese los nombres"
                    className={`${styles.userInput} ${errors.nombres ? styles.userInputError : ''}`}
                    required
                    autoComplete="off"
                  />
                  {errors.nombres && (
                    <span className={styles.userErrorText}>
                      {errors.nombres}
                    </span>
                  )}
                </div>
                <div className={styles.userInputGroup}>
                  <label className={styles.userInputLabel} htmlFor="apellidos">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    id="apellidos"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    placeholder="Ingrese los apellidos"
                    className={`${styles.userInput} ${errors.apellidos ? styles.userInputError : ''}`}
                    required
                    autoComplete="off"
                  />
                  {errors.apellidos && (
                    <span className={styles.userErrorText}>
                      {errors.apellidos}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  style={{ minWidth: '100px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={!isFormValid()}
                  style={{ minWidth: '120px' }}
                >
                  Continuar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
