import { useState, useEffect } from 'react'
import {
    collection,
    getDocs,
    query,
    orderBy,
    Firestore
} from 'firebase/firestore'
import { useRouter } from 'next/router'
import { FaTimes, FaMapMarkerAlt, FaUsers, FaArrowRight, FaSpinner, FaChevronRight } from 'react-icons/fa'
import { Ubicacion } from '@/features/types/types'

interface SelectEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    db: Firestore;
}

const SelectEntryModal = ({ isOpen, onClose, db }: SelectEntryModalProps) => {
    const [locations, setLocations] = useState<Ubicacion[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        if (!isOpen) return

        const fetchLocations = async () => {
            try {
                setIsLoading(true)
                const q = query(collection(db, 'ubicaciones'), orderBy('name'))
                const snapshot = await getDocs(q)
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Ubicacion[]
                setLocations(data)
            } catch (error) {
                console.error("Error fetching locations:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchLocations()
    }, [isOpen, db])

    if (!isOpen) return null

    const handleSelect = (locationId: string) => {
        router.push(`/members/${locationId}`)
        onClose()
    }

    const handleGoToAdmin = () => {
        router.push('/members')
        onClose()
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1500,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                borderRadius: '1.5rem',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                animation: 'modalIn 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent)'
                }}>
                    <div>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '800',
                            color: 'var(--text-primary, #1f2937)',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem'
                        }}>
                            <FaMapMarkerAlt style={{ color: '#3b82f6' }} />
                            Seleccionar Ambiente
                        </h2>
                        <p style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary, #6b7280)',
                            margin: '0.25rem 0 0 0'
                        }}>
                            Elige el lugar para registrar ingresos
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            color: 'var(--text-secondary, #6b7280)',
                            border: 'none',
                            background: 'rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    {isLoading ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3rem 0',
                            gap: '1rem',
                            color: 'var(--text-secondary, #6b7280)'
                        }}>
                            <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: '2rem', color: '#3b82f6' }} />
                            <span>Cargando ambientes...</span>
                        </div>
                    ) : locations.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: 'var(--text-secondary, #6b7280)'
                        }}>
                            <p>No hay ambientes registrados.</p>
                        </div>
                    ) : (
                        locations.map((u) => (
                            <button
                                key={u.id}
                                onClick={() => handleSelect(u.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1rem 1.25rem',
                                    backgroundColor: 'rgba(59, 130, 246, 0.03)',
                                    border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.05))',
                                    borderRadius: '1rem',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    outline: 'none',
                                    color: 'var(--text-primary, #1f2937)',
                                    textTransform: 'uppercase'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.03)';
                                    e.currentTarget.style.borderColor = 'var(--border-glass, rgba(255, 255, 255, 0.05))';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#3b82f6'
                                    }}>
                                        <FaMapMarkerAlt size={20} />
                                    </div>
                                    <span style={{ fontWeight: '600', fontSize: '1rem' }}>{u.name}</span>
                                </div>
                                <FaChevronRight style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.25rem',
                    borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                    backgroundColor: 'rgba(0,0,0,0.02)'
                }}>
                    {/* <button
                        onClick={handleGoToAdmin}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.6rem',
                            padding: '0.875rem',
                            backgroundColor: 'transparent',
                            border: '1px dashed #3b82f6',
                            borderRadius: '1rem',
                            color: '#3b82f6',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                            e.currentTarget.style.borderStyle = 'solid';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderStyle = 'dashed';
                        }}
                    >
                        <FaUsers />
                        Gestionar Usuarios (General)
                        <FaArrowRight size={12} />
                    </button> */}
                </div>
            </div>

            <style jsx>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}

export default SelectEntryModal
