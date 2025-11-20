import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEquipmentForm } from '@/features/hooks/useEquipmentForm'
import styles from '@/styles/equipment.module.css'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useManagment } from '@/features/hooks/useManagment'
import { EquipmentForm } from '@/components/EquipmentForm'
import { MachineDetailsModal } from '@/components/MachineDetailsModal'
import { NuevoUsuarioModal } from '@/components/NuevoUsuarioModal'
import { UsuariosTable } from '@/components/UsuariosTable'
import { CalendarView } from '@/components/CalendarView'
import { IncidenciaDetailModal } from '@/components/IncidenciaDetailModal'
import { MantenimientoDetailModal } from '@/components/MantenimientoDetailModal'
import { QRReader } from '@/components/QRReader'
import { FaCog, FaUserPlus, FaTools, FaTimes, FaQrcode } from 'react-icons/fa'
import { Machine, Usuario, Incidencia } from '@/features/types/types'




const Equipment: NextPage = () => {
  const router = useRouter()
  const { getUbicaciones, ubicaciones, agregarMaquina, getMaquinas, maquinas, getMarcas, marcas, updateMaquinas, deleteMaquinas, createUsuario, getUsuarios, usuarios, updateUsuario, deleteUsuario, getAllEventos, eventos, updateIncidencia, deleteIncidencia, validateSiEsAdmin } = useManagment();
  const { formData, handleChange, resetForm } = useEquipmentForm(agregarMaquina)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUsuarioModalOpen, setIsUsuarioModalOpen] = useState(false)
  const [showEventoDetailModal, setShowEventoDetailModal] = useState(false)
  const [selectedIncidencia, setSelectedIncidencia] = useState<Incidencia | null>(null)
  const [isEquipmentFormModalOpen, setIsEquipmentFormModalOpen] = useState(false)
  const [isQRReaderOpen, setIsQRReaderOpen] = useState(false)
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')

  const hasFetched = useRef(false);
  const selectedIncidenciaIdRef = useRef<string | null>(null);

  const handleOpenModal = (machine: Machine) => {
    setSelectedMachine(machine)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMachine(null)
  }

  const handleUpdateMachine = async (id: string, machine: Partial<Machine>) => {
    try {
      await updateMaquinas(id, machine)
      await getMaquinas()
      // Actualizar la máquina seleccionada con los nuevos datos
      if (selectedMachine && selectedMachine.id === id) {
        setSelectedMachine({ ...selectedMachine, ...machine })
      }
    } catch (error) {
      console.error('Error al actualizar máquina:', error)
      throw error
    }
  }

  const handleDeleteMachine = async (id: string) => {
    try {
      await deleteMaquinas(id)
      await getMaquinas()
      // Cerrar el modal si la máquina eliminada era la seleccionada
      if (selectedMachine && selectedMachine.id === id) {
        handleCloseModal()
      }
    } catch (error) {
      console.error('Error al eliminar máquina:', error)
      throw error
    }
  }

  const handleOpenUsuarioModal = () => {
    setIsUsuarioModalOpen(true)
  }

  const handleCloseUsuarioModal = () => {
    setIsUsuarioModalOpen(false)
  }

  const handleOpenEquipmentFormModal = () => {
    setIsEquipmentFormModalOpen(true)
  }

  const handleCloseEquipmentFormModal = () => {
    setIsEquipmentFormModalOpen(false)
    resetForm()
  }

  const handleSubmitUsuario = async (usuario: {
    dni: string
    nombres: string
    apellidos: string
    rol: string
    pin: number
  }) => {
    try {
      createUsuario(usuario)
      // Aquí puedes agregar la lógica para guardar el usuario
      // Por ejemplo: await agregarUsuario(usuario)
    } catch (error) {
      console.error('Error al agregar usuario:', error)
    }
  }

  const handleEditUsuario = async (usuario: Usuario) => {
    try {
      if (usuario.id || usuario.dni) {
        const id = usuario.id || usuario.dni || '';
        await updateUsuario(id, usuario);
        await getUsuarios();
      }
    } catch (error) {
      console.error('Error al editar usuario:', error);
    }
  }

  const handleDeleteUsuario = async (usuario: Usuario) => {
    try {
      if (usuario.id || usuario.dni) {
        const id = usuario.id || usuario.dni || '';
        await deleteUsuario(id);
        await getUsuarios();
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    }
  }
  
  useEffect(() => {
    if (!hasFetched.current) {
      getMaquinas();
      hasFetched.current = true;
    }
    
    const unsubscribeUbicaciones = getUbicaciones();
    const unsubscribeMarcas = getMarcas();
    
    return () => {
      unsubscribeUbicaciones();
      unsubscribeMarcas();
    };
  }, [getUbicaciones, getMaquinas, getMarcas])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('formData', formData)
      await agregarMaquina(formData);
      await getMaquinas();
      resetForm();
      setIsEquipmentFormModalOpen(false);
    } catch (error) {
      console.error('Error al agregar máquina:', error);
    }
  }
  useEffect(() => {
    getUsuarios();
    getAllEventos();
  },[getUsuarios, getAllEventos])

  // Sincronizar selectedIncidencia cuando cambien los eventos
  useEffect(() => {
    if (selectedIncidenciaIdRef.current && eventos.length > 0) {
      const updatedIncidencia = eventos.find(inc => inc.id === selectedIncidenciaIdRef.current)
      if (updatedIncidencia) {
        setSelectedIncidencia(updatedIncidencia)
      }
    }
  }, [eventos])

  const handleSelectEvent = (incidencia: Incidencia) => {
    setSelectedIncidencia(incidencia)
    selectedIncidenciaIdRef.current = incidencia.id || null
    setShowEventoDetailModal(true)
  }

  const handleCloseEventoDetailModal = () => {
    setShowEventoDetailModal(false)
    setSelectedIncidencia(null)
    selectedIncidenciaIdRef.current = null
  }

  // Filtrar máquinas según los filtros
  const maquinasFiltradas = useMemo(() => {
    return maquinas.filter(maquina => {
      // Filtro por ubicación
      if (filtroUbicacion && maquina.location !== filtroUbicacion) {
        return false
      }
      
      // Filtro por estado
      if (filtroEstado && maquina.status !== filtroEstado) {
        return false
      }
      
      return true
    })
  }, [maquinas, filtroUbicacion, filtroEstado])
  return (
    <>
      <Head>
        <title>Equipos - Management Gym</title>
        <meta name="description" content="Gestión de equipos del gimnasio" />
      </Head>
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.titleWithButtons}>
            <h1 className={styles.title}>Gestión de Equipos</h1>
            <div className={styles.headerButtons}>
              <button
                onClick={() => setIsQRReaderOpen(true)}
                className={`${styles.button} ${styles.buttonIcon}`}
                style={{ backgroundColor: '#8b5cf6', color: 'white' }}
                title="Lector de Código QR"
                aria-label="Lector de Código QR"
              >
                <FaQrcode size={16} />
              </button>
              <button
                onClick={handleOpenUsuarioModal}
                className={`${styles.button} ${styles.buttonIcon} ${styles.buttonUser}`}
                title="Nuevo Usuario"
                aria-label="Nuevo Usuario"
              >
                <FaUserPlus size={16} />
              </button>
              <button
                onClick={handleOpenEquipmentFormModal}
                className={`${styles.button} ${styles.buttonIcon} ${styles.buttonEquipment}`}
                title="Agregar Nuevo Equipo"
                aria-label="Agregar Nuevo Equipo"
              >
                <FaTools size={16} />
              </button>
            </div>
          </div>
        </div>

        <QRReader
          isOpen={isQRReaderOpen}
          onClose={() => setIsQRReaderOpen(false)}
          onScanSuccess={(decodedText) => {
            try {
              console.log('Código QR escaneado:', decodedText)
              
              // Extraer el ID de la máquina del código QR
              // Puede ser: un ID directo, una URL completa, o una ruta relativa
              let machineId = decodedText.trim()
              
              // Si es una URL completa, extraer el ID
              try {
                const url = new URL(decodedText)
                const pathParts = url.pathname.split('/').filter(part => part)
                const idIndex = pathParts.findIndex(part => part === 'maquina')
                if (idIndex !== -1 && pathParts[idIndex + 1]) {
                  machineId = pathParts[idIndex + 1]
                }
              } catch {
                // Si no es una URL válida, verificar si es una ruta relativa
                if (decodedText.includes('/maquina/')) {
                  const parts = decodedText.split('/maquina/')
                  if (parts[1]) {
                    machineId = parts[1].split('/')[0].split('?')[0].split('#')[0]
                  }
                }
                // Si no, asumimos que decodedText es directamente el ID
              }
              
              // Limpiar el ID de caracteres inválidos
              machineId = machineId.replace(/[^a-zA-Z0-9_-]/g, '')
              
              // Validar que el ID no esté vacío
              if (!machineId || machineId.length === 0) {
                alert('No se pudo extraer un ID válido de la máquina del código QR')
                return
              }
              
              // Redirigir a la página de la máquina de forma segura
              // El QRReader ya cerró el modal y detuvo la cámara, esperamos un momento adicional antes de navegar
              setTimeout(() => {
                try {
                  // Intentar navegar con router.push
                  const navigationPromise = router.push(`/maquina/${machineId}`)
                  
                  // Si router.push devuelve una promesa, manejarla
                  if (navigationPromise && typeof navigationPromise.catch === 'function') {
                    navigationPromise.catch((error) => {
                      console.error('Error al navegar con router.push:', error)
                      // Fallback a window.location si router.push falla
                      window.location.href = `/maquina/${machineId}`
                    })
                  }
                } catch (error) {
                  console.error('Error al navegar:', error)
                  // Fallback a window.location si router.push falla
                  window.location.href = `/maquina/${machineId}`
                }
              }, 300)
            } catch (error) {
              console.error('Error al procesar código QR:', error)
              alert(`Error al procesar el código QR: ${error instanceof Error ? error.message : 'Error desconocido'}`)
            }
          }}
          onScanError={(errorMessage) => {
            console.error('Error al escanear QR:', errorMessage)
          }}
        />

        <UsuariosTable 
          onEdit={handleEditUsuario}
          onDelete={handleDeleteUsuario}
        />

        <CalendarView 
          incidencias={eventos}
          onSelectEvent={handleSelectEvent}
        />

        <div>
          <h2 className={styles.sectionTitle}>
            Equipos Registrados ({maquinas.length})
          </h2>
          {maquinas.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>
                No hay equipos registrados. Haz clic en &quot;Agregar Nuevo Equipo&quot; para comenzar.
              </p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.equipmentTable}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <span>Ubicación</span>
                        <select
                          value={filtroUbicacion}
                          onChange={(e) => setFiltroUbicacion(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: '0.375rem 0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            backgroundColor: '#fff',
                            color: '#374151',
                            cursor: 'pointer',
                            minWidth: '150px'
                          }}
                        >
                          <option value="">Todas</option>
                          {ubicaciones.map((ubicacion) => (
                            <option key={ubicacion.id} value={ubicacion.name}>
                              {ubicacion.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <span>Estado</span>
                        <select
                          value={filtroEstado}
                          onChange={(e) => setFiltroEstado(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: '0.375rem 0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            backgroundColor: '#fff',
                            color: '#374151',
                            cursor: 'pointer',
                            minWidth: '120px'
                          }}
                        >
                          <option value="">Todos</option>
                          <option value="active">Activo</option>
                          <option value="maintenance">Mantenimiento</option>
                          <option value="inactive">Inactivo</option>
                        </select>
                      </div>
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {maquinasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                        No se encontraron máquinas con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    maquinasFiltradas.map((machine) => (
                    <tr key={machine.id}>
                      <td className={styles.tableCellName}>
                        <Link href={`/maquina/${machine.id}`} className={styles.tableCellLink}>
                          {machine.name || 'N/A'}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/maquina/${machine.id}`} className={styles.tableCellLink}>
                          {machine.location || 'N/A'}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/maquina/${machine.id}`} className={styles.tableCellLink}>
                          <span className={`${styles.statusBadge} ${
                            machine.status === 'active' ? styles.statusActive :
                            machine.status === 'maintenance' ? styles.statusMaintenance :
                            machine.status === 'inactive' ? styles.statusInactive : ''
                          }`}>
                            {machine.status === 'active' ? 'Activo' : 
                             machine.status === 'maintenance' ? 'Mantenimiento' : 
                             machine.status === 'inactive' ? 'Inactivo' : 'N/A'}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenModal(machine)
                          }}
                          className={styles.tableActionButton}
                          aria-label="Ver detalles del equipo"
                          title="Ver detalles"
                        >
                          <FaCog size={16} />
                        </button>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <MachineDetailsModal
        isOpen={isModalOpen}
        machine={selectedMachine}
        onClose={handleCloseModal}
        onUpdate={handleUpdateMachine}
        onDelete={handleDeleteMachine}
        marcas={marcas}
        ubicaciones={ubicaciones}
        validateSiEsAdmin={validateSiEsAdmin}
      />
      <NuevoUsuarioModal
        isOpen={isUsuarioModalOpen}
        onClose={handleCloseUsuarioModal}
        onSubmit={handleSubmitUsuario}
      />

      {/* Modal de Formulario de Equipo */}
      {isEquipmentFormModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseEquipmentFormModal}>
          <div className={`${styles.modalContent} ${styles.modalContentLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Nuevo Equipo</h2>
              <button
                type="button"
                onClick={handleCloseEquipmentFormModal}
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <EquipmentForm
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                marcas={marcas}
                ubicaciones={ubicaciones}
                validateSiEsAdmin={validateSiEsAdmin}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Mantenimiento */}
      {selectedIncidencia?.tipo === 'mantenimiento' && (
        <MantenimientoDetailModal
          isOpen={showEventoDetailModal}
          onClose={handleCloseEventoDetailModal}
          mantenimiento={selectedIncidencia}
          usuarios={usuarios}
          onUpdateTareas={async (tareas, estado) => {
            if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
              const updateData: any = { tareas }
              if (estado) {
                updateData.estado = estado
              }
              await updateIncidencia(selectedIncidencia.machineId, selectedIncidencia.id, updateData)
              await getAllEventos()
            }
          }}
          onUpdateNotas={async (notas) => {
            if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
              await updateIncidencia(selectedIncidencia.machineId, selectedIncidencia.id, { notas })
              await getAllEventos()
            }
          }}
          onUpdate={async (data) => {
            if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
              const updateData: any = {}
              if (data.tecnicoAsignado !== undefined) {
                updateData.tecnicoAsignado = Object.keys(data.tecnicoAsignado).length > 0 
                  ? data.tecnicoAsignado 
                  : null
              }
              if (data.descripcion !== undefined) {
                updateData.descripcion = data.descripcion
              }
              if (data.tareas !== undefined) {
                updateData.tareas = data.tareas
              }
              await updateIncidencia(selectedIncidencia.machineId, selectedIncidencia.id, updateData)
              await getAllEventos()
            }
          }}
          validateSiEsAdmin={validateSiEsAdmin}
          onDelete={async (id) => {
            if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
              await deleteIncidencia(selectedIncidencia.machineId, id)
              await getAllEventos()
              handleCloseEventoDetailModal()
            }
          }}
        />
      )}

      {/* Modal de Detalles de la Incidencia */}
      {selectedIncidencia?.tipo === 'incidencia' && (
        <IncidenciaDetailModal
          isOpen={showEventoDetailModal}
          onClose={handleCloseEventoDetailModal}
          incidencia={selectedIncidencia}
          onDelete={async (id) => {
            if (selectedIncidencia?.id && selectedIncidencia?.machineId) {
              await deleteIncidencia(selectedIncidencia.machineId, id)
              await getAllEventos()
              handleCloseEventoDetailModal()
            }
          }}
        />
      )}
    </>
  )
}

export default Equipment

