import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { FaTimes, FaCamera, FaStop, FaQrcode } from 'react-icons/fa'
import styles from '@/styles/equipment.module.css'

interface QRReaderProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (decodedText: string) => void
  onScanError?: (errorMessage: string) => void
}

export const QRReader: React.FC<QRReaderProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  onScanError
}) => {
  const [isScanning, setIsScanning] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const qrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerId = 'qr-reader'

  useEffect(() => {
    if (isOpen && !qrCodeRef.current) {
      qrCodeRef.current = new Html5Qrcode(scannerId)
    }

    return () => {
      if (qrCodeRef.current && isScanning) {
        qrCodeRef.current.stop().catch(() => {
          // Ignorar errores al detener
        })
        qrCodeRef.current = null
      }
    }
  }, [isOpen, isScanning])

  const startScanning = async () => {
    if (!qrCodeRef.current) return

    try {
      setError(null)
      setIsStarting(true)
      
      await qrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText: string) => {
          // Detener la cámara completamente antes de llamar al callback
          const handleScanSuccess = async () => {
            try {
              const scanner = qrCodeRef.current
              if (scanner) {
                try {
                  await scanner.stop()
                  setIsScanning(false)
                  // Esperar un momento adicional para asegurar que la cámara se libere
                  await new Promise(resolve => setTimeout(resolve, 200))
                } catch (stopError) {
                  console.error('Error al detener la cámara:', stopError)
                  setIsScanning(false)
                }
              }
              
              // Limpiar la referencia del escáner
              qrCodeRef.current = null
              
              // Cerrar el modal
              onClose()
              
              // Llamar al callback de éxito después de detener la cámara
              onScanSuccess(decodedText)
            } catch (error) {
              console.error('Error al procesar el escaneo:', error)
              setIsScanning(false)
              qrCodeRef.current = null
              onClose()
              onScanSuccess(decodedText)
            }
          }
          
          // Ejecutar la función asíncrona
          handleScanSuccess()
        },
        (errorMessage: string) => {
          // No mostrar errores de "no se encontró código QR"
          if (!errorMessage.includes('No QR code found')) {
            if (onScanError) {
              onScanError(errorMessage)
            }
          }
        }
      )
      setIsScanning(true)
      setIsStarting(false)
    } catch (err: any) {
      setError(err.message || 'Error al iniciar la cámara')
      setIsScanning(false)
      setIsStarting(false)
    }
  }

  const stopScanning = async () => {
    if (qrCodeRef.current && isScanning) {
      try {
        await qrCodeRef.current.stop()
        setIsScanning(false)
        // Limpiar la referencia después de detener
        qrCodeRef.current = null
      } catch (err) {
        console.error('Error al detener el escáner:', err)
        qrCodeRef.current = null
      }
    }
  }

  const handleClose = async () => {
    await stopScanning()
    // Esperar un momento adicional para asegurar que la cámara se libere
    await new Promise(resolve => setTimeout(resolve, 100))
    onClose()
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '0.5rem',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <FaQrcode size={20} />
            </div>
            <h2 className={styles.modalTitle}>Lector de Código QR</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={styles.modalCloseButton}
            aria-label="Cerrar modal"
          >
            <FaTimes size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1.5rem',
            width: '100%'
          }}>
            {/* Scanner Container */}
            <div className={styles.qrScannerContainer}>
              <div
                id={scannerId}
                className={isScanning ? styles.qrScannerActive : styles.qrScannerInactive}
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  minHeight: isScanning ? '400px' : '300px',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  backgroundColor: '#000',
                  transition: 'all 0.3s ease',
                  margin: '0 auto'
                }}
              />
              
              {/* Overlay cuando no está escaneando */}
              {!isScanning && (
                <div className={styles.qrScannerOverlay}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <FaQrcode size={40} color="#fff" />
                  </div>
                  <p style={{
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textAlign: 'center',
                    padding: '0 1rem',
                    margin: 0
                  }}>
                    Presiona &quot;Iniciar Escaneo&quot; para comenzar
                  </p>
                </div>
              )}
            </div>
            
            {/* Error Message */}
            {error && (
              <div style={{ 
                padding: '0.875rem 1rem', 
                backgroundColor: '#fee2e2', 
                color: '#dc2626', 
                borderRadius: '0.5rem',
                width: '100%',
                maxWidth: '500px',
                textAlign: 'center',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <FaTimes size={14} />
                {error}
              </div>
            )}

            {/* Button Container */}
            <div style={{ 
              display: 'flex', 
              gap: '0.75rem',
              width: '100%',
              maxWidth: '500px',
              justifyContent: 'center'
            }}>
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  disabled={isStarting}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.875rem 2rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    minWidth: '200px',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isStarting ? (
                    <>
                      <div className={styles.qrLoadingSpinner} />
                      <span>Iniciando...</span>
                    </>
                  ) : (
                    <>
                      <FaCamera size={18} />
                      <span>Iniciar Escaneo</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className={`${styles.button} ${styles.buttonDanger} ${styles.qrPulseButton}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.875rem 2rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    minWidth: '200px',
                    justifyContent: 'center'
                  }}
                >
                  <FaStop size={18} />
                  <span>Detener Escaneo</span>
                </button>
              )}
            </div>

            {/* Instructions */}
            <div style={{ 
              width: '100%',
              maxWidth: '500px',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.125rem'
                }}>
                  <FaQrcode size={12} color="#3b82f6" />
                </div>
                <div>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#475569', 
                    margin: 0,
                    lineHeight: '1.5',
                    fontWeight: 500
                  }}>
                    {isScanning 
                      ? 'Apunta la cámara hacia el código QR. El escaneo se realizará automáticamente.'
                      : 'Apunta la cámara hacia el código QR para escanearlo. Asegúrate de tener buena iluminación.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

