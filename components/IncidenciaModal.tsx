import React, { useState, useRef } from 'react'
import { FaTimes, FaCamera, FaImage, FaExclamationCircle, FaUser, FaIdCard, FaCalendarAlt, FaTools } from 'react-icons/fa'
import Image from 'next/image'
import styles from './IncidenciaModal.module.css'
import { Usuario, Machine } from '@/features/types/types'
import { storage } from '@/firebase/firebase.config'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { compressImage } from '@/utils/imageCompression'

interface IncidenciaModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    tipo: 'incidencia'
    maquinaDejoFuncionar: boolean
    piezaRota: boolean
    nombrePiezaRota: string
    fechaProgramada: Date
    fechaReporte: Date
    descripcion: string
    prioridad: 'baja' | 'media' | 'alta' | 'urgente'
    usuario?: Usuario
    fotoUrl: string
    maquina: Machine
  }) => Promise<void>
  usuariosValidate?: Usuario,
  usuarioChecklist?: Usuario
  maquina?: Machine
}

export const IncidenciaModal: React.FC<IncidenciaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  usuariosValidate,
  usuarioChecklist,
  maquina
}) => {
  const [incidenciaForm, setIncidenciaForm] = useState({
    tipo: 'incidencia' as const,
    maquinaDejoFuncionar: false,
    piezaRota: false,
    nombrePiezaRota: '',
    fechaReporte: new Date(),
    fechaProgramada: new Date(),
    descripcion: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'urgente',
    usuario: (usuarioChecklist as any)?.user || usuariosValidate || usuarioChecklist
  })
  console.log('usuarioChecklist', usuarioChecklist)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Función helper para convertir Date a string YYYY-MM-DD sin problemas de zona horaria
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      try {
        setIsUploading(true)

        // Create preview immediately for better UX
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev)
          return objectUrl
        })

        const compressed = await compressImage(file)
        setFotoFile(compressed)

      } catch (error) {
        console.error('Error compressing image:', error)
        alert('Error al procesar la imagen. Intenta con otra.')
      } finally {
        setIsUploading(false)
      }
    }
  }

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fotoFile) {
      alert('La foto de la incidencia es obligatoria')
      return
    }

    try {
      setIsUploading(true)
      let fotoUrl = ''

      // Upload image to Firebase Storage
      const timestamp = new Date().getTime()
      const filename = `${timestamp}_${fotoFile.name}`
      const storageRef = ref(storage, `incidencias-maquinas/${filename}`)

      await uploadBytes(storageRef, fotoFile)
      fotoUrl = await getDownloadURL(storageRef)

      // Formatear la descripción para incluir los campos estructurados
      // Esto es necesario porque IncidenciaDetailModal parsea el texto buscando signos de interrogación
      let descripcionFinal = `¿La máquina dejó de funcionar? ${incidenciaForm.maquinaDejoFuncionar ? 'Sí' : 'No'}\n`
      descripcionFinal += `¿Se rompió alguna pieza? ${incidenciaForm.piezaRota ? 'Sí' : 'No'}\n`

      if (incidenciaForm.piezaRota && incidenciaForm.nombrePiezaRota) {
        descripcionFinal += `Nombre de la pieza rota: ${incidenciaForm.nombrePiezaRota}\n`
      }

      if (incidenciaForm.descripcion) {
        descripcionFinal += `Descripción adicional: ${incidenciaForm.descripcion}`
      }

      await onSubmit({
        ...incidenciaForm,
        descripcion: descripcionFinal, // Enviar descripción formateada
        usuario: (usuarioChecklist as any)?.user || usuariosValidate,
        fotoUrl,
        maquina: maquina!
      })

      // Resetear formulario después de enviar
      setIncidenciaForm({
        tipo: 'incidencia',
        maquinaDejoFuncionar: false,
        piezaRota: false,
        nombrePiezaRota: '',
        fechaReporte: new Date(),
        fechaProgramada: new Date(),
        descripcion: '',
        prioridad: 'media',
        usuario: {}
      })
      setFotoFile(null)
      setPreviewUrl(null)
    } catch (error) {
      console.error('Error al guardar incidencia:', error)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            <FaExclamationCircle size={20} style={{ marginRight: '0.5rem' }} />
            Reportar Incidencia
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Cerrar modal"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className={styles.body}>
          {/* Información del usuario validado */}
          {usuarioChecklist && (
            <div className={styles.userInfoCard}>
              <div className={styles.userInfoHeader}>
                <FaUser size={16} style={{ marginRight: '0.5rem' }} />
                Información del Usuario
              </div>
              <div className={styles.userInfoGrid}>
                <div>
                  <span className={styles.userInfoLabel}>Nombres</span>
                  <span className={styles.userInfoValue}>
                    {usuarioChecklist.nombres || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className={styles.userInfoLabel}>Apellidos</span>
                  <span className={styles.userInfoValue}>
                    {usuarioChecklist.apellidos || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className={styles.userInfoLabel}>
                    <FaIdCard size={12} style={{ marginRight: '0.25rem', display: 'inline' }} />
                    DNI
                  </span>
                  <span className={styles.userInfoValue}>
                    {usuarioChecklist.dni || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <form id="incidencia-form" onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaExclamationCircle size={14} style={{ marginRight: '0.5rem' }} />
                  ¿La máquina dejó de funcionar? *
                </label>
                <select
                  value={incidenciaForm.maquinaDejoFuncionar ? 'true' : 'false'}
                  onChange={(e) => setIncidenciaForm(prev => ({ ...prev, maquinaDejoFuncionar: e.target.value === 'true' }))}
                  className={styles.select}
                  required
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaTools size={14} style={{ marginRight: '0.5rem' }} />
                  ¿Se rompió alguna pieza? *
                </label>
                <select
                  value={incidenciaForm.piezaRota ? 'true' : 'false'}
                  onChange={(e) => setIncidenciaForm(prev => ({ ...prev, piezaRota: e.target.value === 'true' }))}
                  className={styles.select}
                  required
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>

              {incidenciaForm.piezaRota && (
                <div className={styles.formField}>
                  <label className={styles.label}>Nombre de la pieza rota *</label>
                  <input
                    type="text"
                    value={incidenciaForm.nombrePiezaRota}
                    onChange={(e) => setIncidenciaForm(prev => ({ ...prev, nombrePiezaRota: e.target.value.toLowerCase() }))}
                    className={styles.input}
                    required={incidenciaForm.piezaRota}
                    placeholder="Ej: Correa, Motor, Batería, etc."
                  />
                </div>
              )}

              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaCalendarAlt size={14} style={{ marginRight: '0.5rem' }} />
                  Fecha del reporte *
                </label>
                <input
                  type="date"
                  value={formatDateToString(incidenciaForm.fechaProgramada)}
                  onChange={(e) => {
                    const fecha = new Date(e.target.value)
                    setIncidenciaForm(prev => ({ ...prev, fechaProgramada: fecha }))
                  }}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>
                  <FaCamera size={14} style={{ marginRight: '0.5rem' }} />
                  Foto de la incidencia *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={galleryInputRef}
                  style={{ display: 'none' }}
                />

                <div className={styles.uploadButtons}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={styles.uploadBtn}
                  >
                    <FaCamera size={16} />
                    Tomar Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className={styles.uploadBtn}
                  >
                    <FaImage size={16} />
                    Galería
                  </button>
                </div>

                {previewUrl && (
                  <div className={styles.imagePreview}>
                    <Image
                      src={previewUrl}
                      alt="Vista previa"
                      width={400}
                      height={200}
                      className={styles.previewImg}
                    />
                  </div>
                )}

                {fotoFile && (
                  <div className={styles.fileInfo}>
                    <div className={styles.fileInfoDot}></div>
                    Foto seleccionada: {fotoFile.name} ({(fotoFile.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Prioridad *</label>
                <select
                  value={incidenciaForm.prioridad}
                  onChange={(e) => setIncidenciaForm(prev => ({ ...prev, prioridad: e.target.value as any }))}
                  className={styles.select}
                  required
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Descripción adicional del problema</label>
              <textarea
                value={incidenciaForm.descripcion}
                onChange={(e) => setIncidenciaForm(prev => ({ ...prev, descripcion: e.target.value.toLowerCase() }))}
                className={styles.textarea}
                rows={4}
                placeholder="Describe detalladamente el problema, qué estaba haciendo cuando ocurrió, síntomas observados, etc..."
              />
            </div>
          </form>
        </div>

        {/* Sticky Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={`${styles.btnFooter} ${styles.btnCancel}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="incidencia-form"
            className={`${styles.btnFooter} ${styles.btnSubmit}`}
            disabled={isUploading}
          >
            {isUploading ? 'Subiendo...' : 'Reportar Incidencia'}
          </button>
        </div>

      </div>
    </div>
  )
}

