import React, { useState } from 'react'
import { FaCog, FaCloudUploadAlt, FaSpinner, FaCamera } from 'react-icons/fa'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebase/firebase.config'
import styles from '@/styles/equipment.module.css'
import { estadoDeMaquina } from '@/utils/data'
import { compressImage } from '@/utils/imageUtils'
import { Machine } from '@/features/types/types'
import { Marca } from '@/features/types/types'
import { Ubicacion, useManagment } from '@/features/hooks/useManagment'
import { MarcaModal } from './MarcaModal'
import { DeleteMarcaModal } from './DeleteMarcaModal'
import { UbicacionModal } from './UbicacionModal'
import { DeleteUbicacionModal } from './DeleteUbicacionModal'
import { AuthModal } from './AuthModal'

interface EquipmentFormProps {
  formData: Omit<Machine, 'id'>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  marcas: Marca[];
  ubicaciones: Ubicacion[];
  validateSiEsAdmin?: (dni: string, pin: string) => Promise<boolean>;
}

export const EquipmentForm: React.FC<EquipmentFormProps> = ({
  formData,
  handleChange,
  handleSubmit,
  marcas,
  ubicaciones,
  validateSiEsAdmin
}) => {
  // Estados para Marcas
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedMarcaId, setSelectedMarcaId] = useState<string>('')
  const [marcaName, setMarcaName] = useState<string>('')
  const [marcaToDelete, setMarcaToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState<string>('')
  const [authType, setAuthType] = useState<'marca' | 'ubicacion' | 'editMarca' | 'editUbicacion'>('marca')
  const [pendingMarcaData, setPendingMarcaData] = useState<{ id: string; name: string } | null>(null)
  const [pendingUbicacionData, setPendingUbicacionData] = useState<{ id: string; name: string } | null>(null)

  // Estados para Ubicaciones
  const [isUbicacionModalOpen, setIsUbicacionModalOpen] = useState(false)
  const [isDeleteUbicacionModalOpen, setIsDeleteUbicacionModalOpen] = useState(false)
  const [selectedUbicacionId, setSelectedUbicacionId] = useState<string>('')
  const [ubicacionName, setUbicacionName] = useState<string>('')
  const [ubicacionToDelete, setUbicacionToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isEditingUbicacion, setIsEditingUbicacion] = useState<boolean>(false)

  // Estados para Imagen
  const [uploadingImage, setUploadingImage] = useState(false)

  const { createMarcas, updateMarcas, deleteMarcas, createUbicaciones, updateUbicaciones, deleteUbicaciones } = useManagment()

  const handleSelectMarca = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const marcaId = e.target.value
    setSelectedMarcaId(marcaId)
    if (marcaId) {
      const marca = marcas.find(m => m.id === marcaId)
      setMarcaName(marca?.name || '')
      setIsEditing(true)
    } else {
      setMarcaName('')
      setIsEditing(false)
    }
  }

  const handleNewMarca = () => {
    setSelectedMarcaId('')
    setMarcaName('')
    setIsEditing(false)
  }

  const handleSaveMarca = async () => {
    if (!marcaName.trim()) return

    if (isEditing && selectedMarcaId) {
      // Si está editando, validar si es administrador
      if (validateSiEsAdmin) {
        setPendingMarcaData({ id: selectedMarcaId, name: marcaName.trim() })
        setAuthType('editMarca')
        setShowAuthModal(true)
        setAuthError('')
        return
      }
      // Si no hay validación, actualizar directamente
      await updateMarcas(selectedMarcaId, { name: marcaName.trim() })
    } else {
      // Si está creando, no necesita validación
      await createMarcas({ name: marcaName.trim() })
    }
    setMarcaName('')
    setSelectedMarcaId('')
    setIsEditing(false)
  }

  const performSaveMarca = async () => {
    if (!pendingMarcaData) return
    await updateMarcas(pendingMarcaData.id, { name: pendingMarcaData.name })
    setMarcaName('')
    setSelectedMarcaId('')
    setIsEditing(false)
    setPendingMarcaData(null)
  }

  const handleDeleteMarca = () => {
    if (!selectedMarcaId) return
    const marca = marcas.find(m => m.id === selectedMarcaId)
    if (marca) {
      // Si hay función de validación, mostrar modal de autenticación primero
      if (validateSiEsAdmin) {
        setMarcaToDelete({ id: selectedMarcaId, name: marca.name || '' })
        setAuthType('marca')
        setShowAuthModal(true)
        setAuthError('')
        return
      }

      // Si no hay validación, abrir modal de eliminación directamente
      setMarcaToDelete({ id: selectedMarcaId, name: marca.name || '' })
      setIsDeleteModalOpen(true)
    }
  }

  const handleAuthAccept = async (dni: string, pin: string) => {
    if (!validateSiEsAdmin) {
      setAuthError('Error de validación')
      return
    }

    try {
      const esAdmin = await validateSiEsAdmin(dni, pin)

      if (esAdmin) {
        // Si es admin, proceder con la acción correspondiente
        setShowAuthModal(false)
        setAuthError('')

        if (authType === 'marca') {
          setIsDeleteModalOpen(true)
        } else if (authType === 'ubicacion') {
          setIsDeleteUbicacionModalOpen(true)
        } else if (authType === 'editMarca') {
          await performSaveMarca()
        } else if (authType === 'editUbicacion') {
          await performSaveUbicacion()
        }
      } else {
        let errorMessage = ''
        if (authType === 'marca' || authType === 'editMarca') {
          errorMessage = 'Acceso denegado. Solo administradores y desarrolladores pueden modificar marcas.'
        } else if (authType === 'ubicacion' || authType === 'editUbicacion') {
          errorMessage = 'Acceso denegado. Solo administradores y desarrolladores pueden modificar ubicaciones.'
        }
        setAuthError(errorMessage)
      }
    } catch (error) {
      console.error('Error al validar administrador:', error)
      setAuthError('Error al validar credenciales. Intente nuevamente.')
    }
  }

  const handleCloseAuthModal = () => {
    setShowAuthModal(false)
    setAuthError('')
    if (authType === 'marca') {
      setMarcaToDelete(null)
    } else if (authType === 'ubicacion') {
      setUbicacionToDelete(null)
    } else if (authType === 'editMarca') {
      setPendingMarcaData(null)
    } else if (authType === 'editUbicacion') {
      setPendingUbicacionData(null)
    }
  }

  const confirmDeleteMarca = async () => {
    if (!marcaToDelete) return
    await deleteMarcas(marcaToDelete.id)
    setSelectedMarcaId('')
    setMarcaName('')
    setIsEditing(false)
    setIsDeleteModalOpen(false)
    setMarcaToDelete(null)
  }

  const cancelDeleteMarca = () => {
    setIsDeleteModalOpen(false)
    setMarcaToDelete(null)
  }

  // Funciones para Ubicaciones
  const handleSelectUbicacion = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ubicacionId = e.target.value
    setSelectedUbicacionId(ubicacionId)
    if (ubicacionId) {
      const ubicacion = ubicaciones.find(u => u.id === ubicacionId)
      setUbicacionName(ubicacion?.name || '')
      setIsEditingUbicacion(true)
    } else {
      setUbicacionName('')
      setIsEditingUbicacion(false)
    }
  }

  const handleNewUbicacion = () => {
    setSelectedUbicacionId('')
    setUbicacionName('')
    setIsEditingUbicacion(false)
  }

  const handleSaveUbicacion = async () => {
    if (!ubicacionName.trim()) return

    if (isEditingUbicacion && selectedUbicacionId) {
      // Si está editando, validar si es administrador
      if (validateSiEsAdmin) {
        setPendingUbicacionData({ id: selectedUbicacionId, name: ubicacionName.trim() })
        setAuthType('editUbicacion')
        setShowAuthModal(true)
        setAuthError('')
        return
      }
      // Si no hay validación, actualizar directamente
      await updateUbicaciones(selectedUbicacionId, { name: ubicacionName.trim() })
    } else {
      // Si está creando, no necesita validación
      await createUbicaciones({ name: ubicacionName.trim() })
    }
    setUbicacionName('')
    setSelectedUbicacionId('')
    setIsEditingUbicacion(false)
  }

  const performSaveUbicacion = async () => {
    if (!pendingUbicacionData) return
    await updateUbicaciones(pendingUbicacionData.id, { name: pendingUbicacionData.name })
    setUbicacionName('')
    setSelectedUbicacionId('')
    setIsEditingUbicacion(false)
    setPendingUbicacionData(null)
  }

  const handleDeleteUbicacion = () => {
    if (!selectedUbicacionId) return
    const ubicacion = ubicaciones.find(u => u.id === selectedUbicacionId)
    if (ubicacion) {
      // Si hay función de validación, mostrar modal de autenticación primero
      if (validateSiEsAdmin) {
        setUbicacionToDelete({ id: selectedUbicacionId, name: ubicacion.name || '' })
        setAuthType('ubicacion')
        setShowAuthModal(true)
        setAuthError('')
        return
      }

      // Si no hay validación, abrir modal de eliminación directamente
      setUbicacionToDelete({ id: selectedUbicacionId, name: ubicacion.name || '' })
      setIsDeleteUbicacionModalOpen(true)
    }
  }

  const confirmDeleteUbicacion = async () => {
    if (!ubicacionToDelete) return
    await deleteUbicaciones(ubicacionToDelete.id)
    setSelectedUbicacionId('')
    setUbicacionName('')
    setIsEditingUbicacion(false)
    setIsDeleteUbicacionModalOpen(false)
    setUbicacionToDelete(null)
  }

  const cancelDeleteUbicacion = () => {
    setIsDeleteUbicacionModalOpen(false)
    setUbicacionToDelete(null)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)

      const compressedFile = await compressImage(file, 0.1) // 0.1 MB = ~100KB
      console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(4)} MB`)

      const storageRef = ref(storage, `imagen-equipos/${file.name}-${Date.now()}`)
      await uploadBytes(storageRef, compressedFile)
      const url = await getDownloadURL(storageRef)

      // Actualizar el formData con la URL de la imagen (simulando el evento)
      const event = {
        target: {
          name: 'image',
          value: url
        }
      } as React.ChangeEvent<HTMLInputElement>
      handleChange(event)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir la imagen. Por favor intente de nuevo.')
    } finally {
      setUploadingImage(false)
    }
  }

  // Limpiar búsqueda cuando se cierra el modal
  const handleCloseMarcaModal = () => {
    setIsModalOpen(false)
  }

  const handleCloseUbicacionModal = () => {
    setIsUbicacionModalOpen(false)
  }

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.label}>
              Nombre del Equipo *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>
              Imagen del Equipo *
            </label>
            <div className={styles.imageUploadContainer}>
              {/* Input para seleccionar archivo (escritorio/móvil) */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className={styles.fileInput}
                id="image-upload"
                disabled={uploadingImage}
              />

              {/* Input específico para cámara (móvil) */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className={styles.fileInput}
                id="camera-upload"
                disabled={uploadingImage}
              />

              <div className={styles.uploadButtonsContainer}>
                <label htmlFor="image-upload" className={`${styles.button} ${styles.uploadButton}`}>
                  {uploadingImage ? <FaSpinner className={styles.spinner} /> : <FaCloudUploadAlt />}
                  {uploadingImage ? ' Subiendo...' : ' Subir Imagen'}
                </label>

                <label htmlFor="camera-upload" className={`${styles.button} ${styles.cameraButton}`}>
                  {uploadingImage ? <FaSpinner className={styles.spinner} /> : <FaCamera />}
                  {uploadingImage ? ' Tomando...' : ' Tomar Foto'}
                </label>
              </div>
              <input
                type="hidden"
                name="image"
                value={formData.image || ''}
                required
              />
              {formData.image && (
                <div className={styles.imagePreview}>
                  <img src={formData.image} alt="Vista previa" className={styles.previewImg} />
                  <span className={styles.imageSuccess}>✓ Imagen cargada correctamente</span>
                </div>
              )}
            </div>
          </div>
          <div className={styles.formField}>
            <div className={styles.labelContainer}>
              <label className={styles.label}>
                Marca *
              </label>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={styles.optionsButton}
                aria-label="Opciones de marca"
              >
                <FaCog size={20} />
              </button>
            </div>
            <select
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              required
              className={styles.select}
            >
              <option value="">Seleccione una marca</option>
              {marcas.map((marca) => (
                <option key={marca.id} value={marca.name}>
                  {marca.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formField}>
            <label className={styles.label}>
              Modelo
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label}>
              Fecha de Registro *
            </label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label}>
              Estado *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className={styles.select}
            >
              <option value="">Seleccione un estado</option>
              {estadoDeMaquina.map((estado) => (
                <option key={estado.id} value={estado.name}>
                  {estado.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formField}>
            <div className={styles.labelContainer}>
              <label className={styles.label}>
                Ubicación *
              </label>
              <button
                type="button"
                onClick={() => setIsUbicacionModalOpen(true)}
                className={styles.optionsButton}
                aria-label="Opciones de ubicación"
              >
                <FaCog size={20} />
              </button>
            </div>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className={styles.select}
            >
              <option value="">Seleccione una ubicación</option>
              {ubicaciones.map((ubicacion) => (
                <option key={ubicacion.id} value={ubicacion.name}>
                  {ubicacion.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.formField}>
          <label className={styles.label}>
            Notas
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className={styles.textarea}
          />
        </div>
        <button
          type="submit"
          className={`${styles.button} ${styles.buttonSubmit}`}
        >
          Guardar Equipo
        </button>
      </form>

      <MarcaModal
        isOpen={isModalOpen}
        onClose={handleCloseMarcaModal}
        marcas={marcas}
        selectedMarcaId={selectedMarcaId}
        marcaName={marcaName}
        isEditing={isEditing}
        onSelectMarca={handleSelectMarca}
        onNewMarca={handleNewMarca}
        onSaveMarca={handleSaveMarca}
        onDeleteMarca={handleDeleteMarca}
        onMarcaNameChange={setMarcaName}
      />

      <DeleteMarcaModal
        isOpen={isDeleteModalOpen}
        marcaName={marcaToDelete?.name || ''}
        onConfirm={confirmDeleteMarca}
        onCancel={cancelDeleteMarca}
      />

      <UbicacionModal
        isOpen={isUbicacionModalOpen}
        onClose={handleCloseUbicacionModal}
        ubicaciones={ubicaciones}
        selectedUbicacionId={selectedUbicacionId}
        ubicacionName={ubicacionName}
        isEditing={isEditingUbicacion}
        onSelectUbicacion={handleSelectUbicacion}
        onNewUbicacion={handleNewUbicacion}
        onSaveUbicacion={handleSaveUbicacion}
        onDeleteUbicacion={handleDeleteUbicacion}
        onUbicacionNameChange={setUbicacionName}
      />

      <DeleteUbicacionModal
        isOpen={isDeleteUbicacionModalOpen}
        ubicacionName={ubicacionToDelete?.name || ''}
        onConfirm={confirmDeleteUbicacion}
        onCancel={cancelDeleteUbicacion}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
        onAccept={handleAuthAccept}
        error={authError}
      />
    </div>
  )
}

