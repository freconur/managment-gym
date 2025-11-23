import React, { useState, useEffect } from 'react'
import { FaTimes, FaIdCard, FaLock } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: (dni: string, pin: string) => void
  error?: string
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  error
}) => {
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [localError, setLocalError] = useState('')

  // Limpiar campos cuando el modal se cierra
  useEffect(() => {
    if (!isOpen) {
      setDni('')
      setPin('')
      setLocalError('')
    }
  }, [isOpen])

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8)
    setDni(value)
    if (localError) {
      setLocalError('')
    }
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(value)
    if (localError) {
      setLocalError('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar DNI
    if (!dni || dni.length !== 8) {
      setLocalError('El DNI debe tener exactamente 8 dígitos')
      return
    }

    // Validar PIN
    if (!pin || pin.length !== 4) {
      setLocalError('El PIN debe tener exactamente 4 dígitos')
      return
    }

    // Si todo está bien, llamar a onAccept y limpiar campos
    onAccept(dni, pin)
    setDni('')
    setPin('')
    setLocalError('')
  }

  const handleClose = () => {
    setDni('')
    setPin('')
    setLocalError('')
    onClose()
  }

  if (!isOpen) return null

  const displayError = error || localError

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            Autenticación
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
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formField}>
              <label className={styles.label}>
                <FaIdCard size={14} style={{ marginRight: '0.5rem' }} />
                DNI *
              </label>
              <input
                type="number"
                value={dni}
                onChange={handleDniChange}
                className={styles.input}
                required
                placeholder="Ingrese su DNI (8 dígitos)"
                min="0"
                max="99999999"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>
                <FaLock size={14} style={{ marginRight: '0.5rem' }} />
                PIN *
              </label>
              <input
                type="number"
                value={pin}
                onChange={handlePinChange}
                className={styles.input}
                required
                placeholder="Ingrese su PIN (4 dígitos)"
                min="0"
                max="9999"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>

            {displayError && (
              <div className={styles.errorMessage} style={{ color: '#dc2626', marginBottom: '1rem' }}>
                {displayError}
              </div>
            )}

            <div className={styles.modalButtonGroup}>
              <button
                type="button"
                onClick={handleClose}
                className={`${styles.button} ${styles.buttonSecondary} ${styles.modalButton}`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonSubmit} ${styles.modalButton}`}
              >
                Aceptar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

