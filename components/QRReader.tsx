import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { FaTimes, FaCamera, FaStop } from 'react-icons/fa'
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
    } catch (err: any) {
      setError(err.message || 'Error al iniciar la cámara')
      setIsScanning(false)
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
          <h2 className={styles.modalTitle}>Lector de Código QR</h2>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div
              id={scannerId}
              style={{
                width: '100%',
                maxWidth: '500px',
                minHeight: '300px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            />
            
            {error && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#fee', 
                color: '#c33', 
                borderRadius: '4px',
                width: '100%',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  className={`${styles.button} ${styles.buttonIcon}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FaCamera size={16} />
                  Iniciar Escaneo
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className={`${styles.button} ${styles.buttonIcon}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#dc3545' }}
                >
                  <FaStop size={16} />
                  Detener Escaneo
                </button>
              )}
            </div>

            <p style={{ 
              fontSize: '14px', 
              color: '#666', 
              textAlign: 'center',
              marginTop: '10px'
            }}>
              Apunta la cámara hacia el código QR para escanearlo
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

