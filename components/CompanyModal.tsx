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
    writeBatch,
    getDocs,
    where
} from 'firebase/firestore'
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSave, FaSyncAlt, FaArrowRight, FaSpinner } from 'react-icons/fa'

interface Company {
    id: string;
    nombre: string;
    createdAt?: any;
}

interface CompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    db: Firestore;
}

const CompanyModal = ({ isOpen, onClose, db }: CompanyModalProps) => {
    const [companies, setCompanies] = useState<Company[]>([])
    const [newCompany, setNewCompany] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!isOpen) return;

        const q = query(collection(db, 'empresas'), orderBy('createdAt', 'desc'))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const companiesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Company[]
            setCompanies(companiesData)
            setIsLoading(false)
        })
        return () => unsubscribe()
    }, [isOpen, db])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCompany.trim()) return

        try {
            await addDoc(collection(db, 'empresas'), {
                nombre: newCompany.trim(),
                createdAt: serverTimestamp()
            })
            setNewCompany('')
        } catch (error) {
            console.error("Error adding company:", error)
            alert("Error al agregar empresa")
        }
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return

        try {
            await updateDoc(doc(db, 'empresas', id), {
                nombre: editName.trim()
            })
            setEditingId(null)
            setEditName('')
        } catch (error) {
            console.error("Error updating company:", error)
            alert("Error al actualizar empresa")
        }
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Seguro que deseas eliminar esta empresa?')) {
            try {
                await deleteDoc(doc(db, 'empresas', id))
            } catch (error) {
                console.error("Error deleting company:", error)
                alert("Error al eliminar empresa")
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
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                textTransform: 'uppercase'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>Gestionar Empresas</h2>
                    <button onClick={onClose} style={{ color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value.toLowerCase())}
                        placeholder="Nueva empresa..."
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            outline: 'none',
                            textTransform: 'uppercase'
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
                    ) : companies.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#6b7280' }}>No hay empresas registradas.</p>
                    ) : (
                        companies.map((company) => (
                            <div key={company.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem',
                                backgroundColor: '#f9fafb',
                                borderRadius: '0.375rem',
                                border: '1px solid #e5e7eb'
                            }}>
                                {editingId === company.id ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1, marginRight: '0.5rem' }}>
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
                                        <button
                                            onClick={() => handleUpdate(company.id)}
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
                                ) : (
                                    <>
                                        <span style={{ color: '#374151' }}>{company.nombre}</span>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => {
                                                    setEditingId(company.id)
                                                    setEditName(company.nombre)
                                                }}
                                                style={{ color: '#d97706', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(company.id)}
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

export default CompanyModal
