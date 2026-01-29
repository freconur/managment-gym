import { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Firestore
} from 'firebase/firestore'
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSave } from 'react-icons/fa'
import { Ubicacion } from '@/features/types/types'

interface UbicacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: Firestore;
}

const UbicacionModal = ({ isOpen, onClose, db }: UbicacionModalProps) => {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [newUbicacion, setNewUbicacion] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editHaveAmenidades, setEditHaveAmenidades] = useState(false)
  const [editHaveSubEnvironments, setEditHaveSubEnvironments] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'ubicaciones'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ubicacion[]
      setUbicaciones(data)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [isOpen, db])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUbicacion.trim()) return

    try {
      await addDoc(collection(db, 'ubicaciones'), {
        name: newUbicacion.trim(),
        haveAmenidades: false,
        haveSubEnvironments: false,
        createdAt: serverTimestamp()
      })
      setNewUbicacion('')
    } catch (error) {
      console.error("Error adding ubicacion:", error)
      alert("Error al agregar ubicación")
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return

    try {
      await updateDoc(doc(db, 'ubicaciones', id), {
        name: editName.trim(),
        haveAmenidades: editHaveAmenidades,
        haveSubEnvironments: editHaveSubEnvironments
      })
      setEditingId(null)
      setEditName('')
      setEditHaveAmenidades(false)
      setEditHaveSubEnvironments(false)
    } catch (error) {
      console.error("Error updating ubicacion:", error)
      alert("Error al actualizar ubicación")
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta ubicación?')) {
      try {
        await deleteDoc(doc(db, 'ubicaciones', id))
      } catch (error) {
        console.error("Error deleting ubicacion:", error)
        alert("Error al eliminar ubicación")
      }
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1100
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>Gestionar Ambientes</h2>
          <button onClick={onClose} style={{ color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            value={newUbicacion}
            onChange={(e) => setNewUbicacion(e.target.value)}
            placeholder="Nuevo ambiente..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FaPlus /> Agregar
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {isLoading ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Cargando...</p>
          ) : ubicaciones.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No hay ambientes registrados.</p>
          ) : (
            ubicaciones.map((u) => (
              <div key={u.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb'
              }}>
                {editingId === u.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flex: 1, marginRight: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        minWidth: '150px'
                      }}
                      autoFocus
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#374151', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editHaveAmenidades}
                        onChange={(e) => setEditHaveAmenidades(e.target.checked)}
                      />
                      Tiene Amenidades
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#374151', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editHaveSubEnvironments}
                        onChange={(e) => setEditHaveSubEnvironments(e.target.checked)}
                      />
                      Sub-ambientes
                    </label>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={() => handleUpdate(u.id)}
                        style={{ color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <FaSave />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#374151' }}>{u.name}</span>
                      {u.haveAmenidades && <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 'bold' }}>Con Amenidades</span>}
                      {u.haveSubEnvironments && <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 'bold' }}>Sub-ambientes</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setEditingId(u.id)
                          setEditName(u.name)
                          setEditHaveAmenidades(!!u.haveAmenidades)
                          setEditHaveSubEnvironments(!!u.haveSubEnvironments)
                        }}
                        style={{ color: '#d97706', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default UbicacionModal
