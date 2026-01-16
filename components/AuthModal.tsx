import React, { useState, useEffect } from 'react'
import { FaTimes, FaIdCard, FaLock, FaSpinner } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'
import { useEscapeKey } from '@/features/hooks/useEscapeKey'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: (dni: string, pin: string) => Promise<void> | void
  error?: string
}


export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  error
}) => {
  useEscapeKey(onClose, isOpen); // Add this line
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [localError, setLocalError] = useState('')

  const dniRef = useState<HTMLInputElement | null>(null)
  // Fix: use useRef properly for focusing
  const dniInputRef = React.useRef<HTMLInputElement>(null)
  const [isValidating, setIsValidating] = useState(false)


  const pinInputRef = React.useRef<HTMLInputElement>(null)

  // Focus DNI input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        dniInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Limpiar campos y error cuando el modal se cierra
  useEffect(() => {
    if (!isOpen) {
      setDni('')
      setPin('')
      setLocalError('')
      setIsValidating(false)
    }
  }, [isOpen])

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8)
    setDni(value)
    if (localError) setLocalError('')

    // Auto-focus PIN if DNI is complete
    if (value.length === 8) {
      pinInputRef.current?.focus()
    }
  }

  const handlePinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(value)
    if (localError) setLocalError('')

    // Auto-submit if PIN is complete
    if (value.length === 4) {
      // Validate DNI before submitting (though relying on previous flow)
      if (dni.length === 8) {
        setIsValidating(true)
        setLocalError('')
        try {
          await onAccept(dni, value)
        } catch (err) {
          console.error(err)
        } finally {
          setIsValidating(false)
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

    // Si todo está bien, llamar a onAccept
    setIsValidating(true)
    setLocalError('')
    try {
      await onAccept(dni, pin)
    } catch (err) {
      console.error(err)
    } finally {
      setIsValidating(false)
    }
  }

  const handleClose = () => {
    setDni('')
    setPin('')
    setLocalError('')
    setIsValidating(false)
    onClose()
  }

  if (!isOpen) return null

  const displayError = error || localError

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.authModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.authHeader}>
          <div className={styles.authIconWrapper}>
            <FaLock />
          </div>
          <h3 className={styles.authTitle}>
            Autenticación
          </h3>
          <p className={styles.authSubtitle}>
            Ingrese sus credenciales de administrador para continuar
          </p>
        </div>

        <div className={styles.authBody}>
          <form onSubmit={handleSubmit}>
            <div className={styles.authInputGroup}>
              <label className={styles.authLabel}>
                DNI
              </label>
              <div className={styles.authInputWrapper}>
                <input
                  ref={dniInputRef}
                  type="number"
                  value={dni}
                  onChange={handleDniChange}
                  className={styles.authInput}
                  required
                  placeholder="Ingrese el DNI"
                  min="0"
                  max="99999999"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={isValidating}
                />
                <FaIdCard className={styles.authInputIcon} />
              </div>
            </div>

            <div className={styles.authInputGroup}>
              <label className={styles.authLabel}>
                PIN de Seguridad
              </label>
              <div className={styles.authInputWrapper}>
                <input
                  ref={pinInputRef}
                  type="password"
                  value={pin}
                  onChange={handlePinChange}
                  className={styles.authInput}
                  required
                  placeholder="Ingrese el PIN"
                  min="0"
                  max="9999"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={isValidating}
                />
                <FaLock className={styles.authInputIcon} />
              </div>
            </div>

            {isValidating && (
              <div className={styles.authLoading}>
                <div className={styles.loadingSpinner}>
                  <FaSpinner className={styles.spinAnimation} size={24} />
                </div>
                <span>Verificando credenciales...</span>
              </div>
            )}

            {displayError && !isValidating && (
              <div className={styles.authError}>
                <FaTimes style={{ flexShrink: 0 }} />
                <span>{displayError === 'Error de autenticación' ? 'DNI o PIN incorrecto' : displayError}</span>
              </div>
            )}

            <div className={styles.authFooter}>
              <button
                type="button"
                onClick={handleClose}
                className={styles.authCancelButton}
                disabled={isValidating}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

