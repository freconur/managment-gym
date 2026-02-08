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
    Firestore,
    getDoc
} from 'firebase/firestore'
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSave } from 'react-icons/fa'
import { SubEnvironment } from '@/features/types/types'

interface SubEnvironmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    db: Firestore;
    locationId?: string;
}

const SubEnvironmentModal = ({ isOpen, onClose, db, locationId }: SubEnvironmentModalProps) => {
    const [environments, setEnvironments] = useState<SubEnvironment[]>([])
    const [newEnvironment, setNewEnvironment] = useState('')
    const [newRequireTable, setNewRequireTable] = useState(false)
    const [newRequireTime, setNewRequireTime] = useState(false)
    const [newMaxTime, setNewMaxTime] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editRequireTable, setEditRequireTable] = useState(false)
    const [editRequireTime, setEditRequireTime] = useState(false)
    const [editMaxTime, setEditMaxTime] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!isOpen) return;

        if (locationId) {
            // Location specific sub-environments
            const unsub = onSnapshot(doc(db, 'ubicaciones', locationId), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setEnvironments(data.subEnvironments || []);
                } else {
                    setEnvironments([]);
                }
                setIsLoading(false);
            });
            return () => unsub();
        } else {
            // Fallback to global collection (Maintenance or legacy?)
            const q = query(collection(db, 'sub_environments'), orderBy('createdAt', 'desc'))
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as SubEnvironment[]
                setEnvironments(data)
                setIsLoading(false)
            })
            return () => unsubscribe()
        }
    }, [isOpen, db, locationId])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEnvironment.trim()) return

        try {
            if (locationId) {
                const newSubEnv: SubEnvironment = {
                    id: crypto.randomUUID(),
                    nombre: newEnvironment.trim(),
                    requireTableAssignment: newRequireTable,
                    requireTime: newRequireTime,
                    maxTime: newRequireTime && newMaxTime ? parseInt(newMaxTime) : undefined,
                    createdAt: new Date().toISOString()
                };
                const updatedEnvs = [...environments, newSubEnv];
                await updateDoc(doc(db, 'ubicaciones', locationId), {
                    subEnvironments: updatedEnvs
                });
            } else {
                await addDoc(collection(db, 'sub_environments'), {
                    nombre: newEnvironment.trim(),
                    requireTableAssignment: newRequireTable,
                    requireTime: newRequireTime,
                    maxTime: newRequireTime && newMaxTime ? parseInt(newMaxTime) : undefined,
                    createdAt: serverTimestamp()
                })
            }
            setNewEnvironment('')
            setNewRequireTable(false)
            setNewRequireTime(false)
            setNewMaxTime('')
        } catch (error) {
            console.error("Error adding sub-environment:", error)
            alert("Error al agregar sub-ambiente")
        }
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return

        try {
            if (locationId) {
                const updatedEnvs = environments.map(env =>
                    env.id === id ? {
                        ...env,
                        nombre: editName.trim(),
                        requireTableAssignment: editRequireTable,
                        requireTime: editRequireTime,
                        maxTime: editRequireTime && editMaxTime ? parseInt(editMaxTime) : undefined
                    } : env
                );
                await updateDoc(doc(db, 'ubicaciones', locationId), {
                    subEnvironments: updatedEnvs
                });
            } else {
                await updateDoc(doc(db, 'sub_environments', id), {
                    nombre: editName.trim(),
                    requireTableAssignment: editRequireTable,
                    requireTime: editRequireTime,
                    maxTime: editRequireTime && editMaxTime ? parseInt(editMaxTime) : undefined
                })
            }
            setEditingId(null)
            setEditName('')
            setEditRequireTable(false)
            setEditRequireTime(false)
            setEditMaxTime('')
        } catch (error) {
            console.error("Error updating sub-environment:", error)
            alert("Error al actualizar sub-ambiente")
        }
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Seguro que deseas eliminar este sub-ambiente?')) {
            try {
                if (locationId) {
                    const updatedEnvs = environments.filter(env => env.id !== id);
                    await updateDoc(doc(db, 'ubicaciones', locationId), {
                        subEnvironments: updatedEnvs
                    });
                } else {
                    await deleteDoc(doc(db, 'sub_environments', id))
                }
            } catch (error) {
                console.error("Error deleting sub-environment:", error)
                alert("Error al eliminar sub-ambiente")
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
            zIndex: 60
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                textTransform: 'uppercase'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                        Gestionar Sub-ambientes {locationId ? '(Local)' : '(Global)'}
                    </h2>
                    <button onClick={onClose} style={{ color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={newEnvironment}
                            onChange={(e) => setNewEnvironment(e.target.value.toLowerCase())}
                            placeholder="Nuevo sub-ambiente..."
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                outline: 'none',
                                textTransform: 'uppercase'
                            }}
                        />
                        {newRequireTime && (
                            <input
                                type="number"
                                value={newMaxTime}
                                onChange={(e) => setNewMaxTime(e.target.value)}
                                placeholder="Max min..."
                                style={{
                                    width: '80px',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    outline: 'none'
                                }}
                                title="Tiempo máximo en minutos (opcional)"
                            />
                        )}
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
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={newRequireTable}
                                onChange={(e) => setNewRequireTable(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            ¿Requiere Mesa?
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={newRequireTime}
                                onChange={(e) => setNewRequireTime(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            ¿Requiere Tiempo?
                        </label>
                    </div>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {isLoading ? (
                        <p style={{ textAlign: 'center', color: '#6b7280' }}>Cargando...</p>
                    ) : environments.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#6b7280' }}>No hay sub-ambientes registrados.</p>
                    ) : (
                        environments.map((env) => (
                            <div key={env.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem',
                                backgroundColor: '#f9fafb',
                                borderRadius: '0.375rem',
                                border: '1px solid #e5e7eb'
                            }}>
                                {editingId === env.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value.toLowerCase())}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.25rem 0.5rem',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '0.25rem',
                                                    textTransform: 'uppercase'
                                                }}
                                                autoFocus
                                            />
                                            {editRequireTime && (
                                                <input
                                                    type="number"
                                                    value={editMaxTime}
                                                    onChange={(e) => setEditMaxTime(e.target.value)}
                                                    placeholder="Min"
                                                    style={{
                                                        width: '60px',
                                                        padding: '0.25rem 0.5rem',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '0.25rem'
                                                    }}
                                                />
                                            )}
                                            <button
                                                onClick={() => handleUpdate(env.id)}
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
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editRequireTable}
                                                    onChange={(e) => setEditRequireTable(e.target.checked)}
                                                />
                                                Mesa
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editRequireTime}
                                                    onChange={(e) => setEditRequireTime(e.target.checked)}
                                                />
                                                Tiempo
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: '#374151' }}>{env.nombre}</span>
                                            {env.requireTableAssignment && (
                                                <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 'bold' }}>• Requiere Mesa</span>
                                            )}
                                            {env.maxTime && (
                                                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 'bold' }}>• {env.maxTime} min</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => {
                                                    setEditingId(env.id)
                                                    setEditName(env.nombre)
                                                    setEditRequireTable(!!env.requireTableAssignment)
                                                    setEditRequireTime(!!env.requireTime)
                                                    setEditMaxTime(env.maxTime ? env.maxTime.toString() : '')
                                                }}
                                                style={{ color: '#d97706', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(env.id)}
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

export default SubEnvironmentModal
