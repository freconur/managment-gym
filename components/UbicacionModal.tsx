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
  getDocs
} from 'firebase/firestore'
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSave, FaClock, FaSpinner } from 'react-icons/fa'
import { Ubicacion, Company, AllowedCompany, Schedule } from '@/features/types/types'

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

  // New State for Allowed Companies
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([])
  const [editAllowedCompanies, setEditAllowedCompanies] = useState<AllowedCompany[]>([]) // Used for editing
  const [selectedCompanyIdToAdd, setSelectedCompanyIdToAdd] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<Record<string, string[]>>({})
  const [isFetchingRoles, setIsFetchingRoles] = useState(false)
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<Record<string, string>>({})

  // Fetch Companies
  useEffect(() => {
    if (!isOpen) return;
    const fetchCompanies = async () => {
      try {
        const q = query(collection(db, 'empresas'), orderBy('nombre'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Company[];
        setAvailableCompanies(data);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };
    fetchCompanies();
  }, [isOpen, db]);

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
      setIsUpdating(true)
      await updateDoc(doc(db, 'ubicaciones', id), {
        name: editName.trim(),
        haveAmenidades: editHaveAmenidades,
        haveSubEnvironments: editHaveSubEnvironments
      })
      setEditingId(null)
      setEditName('')
      setEditHaveAmenidades(false)
      setEditHaveSubEnvironments(false)
      setEditAllowedCompanies([])

      // Update logic for allowedCompanies is complex, handled below in UI section or unified here?
      // Since we are using Firestore directly, updateDoc above needs the allowedCompanies field.
      // Re-implementing handleUpdate to include allowedCompanies:
    } catch (error) {
      console.error("Error updating ubicacion:", error)
      alert("Error al actualizar ubicación")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddAllowedCompany = () => {
    if (!selectedCompanyIdToAdd) return;
    const company = availableCompanies.find(c => c.id === selectedCompanyIdToAdd);
    if (!company) return;

    if (editAllowedCompanies.some(ac => ac.companyId === company.id)) {
      setSelectedCompanyIdToAdd('');
      return;
    }

    setEditAllowedCompanies([...editAllowedCompanies, {
      companyId: company.id,
      companyName: company.nombre,
      haveSchedule: false,
      schedules: [],
      haveRoleRestriction: false,
      allowedRoles: []
    }]);
    setSelectedCompanyIdToAdd('');
  }

  const fetchRolesForCompany = async (companyName: string) => {
    if (availableRoles[companyName]) return availableRoles[companyName];

    try {
      setIsFetchingRoles(true);
      const membersRef = collection(db, 'members');
      const q = query(membersRef); // We might need to filter by company if possible, but let's get all and filter locally for simplicity if the collection isn't too large, or better filter by company.
      // Actually, filtering by company is better.
      const snapshot = await getDocs(membersRef);
      const roles = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.empresa === companyName && data.cargo) {
          roles.add(data.cargo);
        }
      });
      const uniqueRoles = Array.from(roles).sort();
      setAvailableRoles(prev => ({ ...prev, [companyName]: uniqueRoles }));
      return uniqueRoles;
    } catch (error) {
      console.error("Error fetching roles:", error);
      return [];
    } finally {
      setIsFetchingRoles(false);
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
        width: '95%',
        maxWidth: '800px',
        maxHeight: '95vh',
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
                      disabled
                      style={{
                        flex: 1,
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        minWidth: '150px',
                        backgroundColor: '#f3f4f6',
                        cursor: 'not-allowed'
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
                    {/* Company Access Configuration */}
                    {/* <div style={{ marginTop: '0.8rem', width: '100%', borderTop: '1px solid #e5e7eb', paddingTop: '0.8rem' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>Empresas con Acceso:</p>

                     
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                        <select
                          value={selectedCompanyIdToAdd}
                          onChange={(e) => setSelectedCompanyIdToAdd(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.4rem',
                            fontSize: '0.85rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            outline: 'none',
                            backgroundColor: 'white',
                            color: '#111827'
                          }}
                        >
                          <option value="">Seleccionar empresa...</option>
                          {availableCompanies
                            .filter(c => !editAllowedCompanies.some(ac => ac.companyId === c.id))
                            .map(company => (
                              <option key={company.id} value={company.id}>{company.nombre}</option>
                            ))
                          }
                        </select>
                        <button
                          onClick={handleAddAllowedCompany}
                          disabled={!selectedCompanyIdToAdd}
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: selectedCompanyIdToAdd ? 'pointer' : 'not-allowed',
                            fontSize: '0.85rem',
                            opacity: selectedCompanyIdToAdd ? 1 : 0.6
                          }}
                        >
                          Agregar
                        </button>
                      </div>

                      {editAllowedCompanies.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>No se han agregado empresas aún.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                          {editAllowedCompanies.map(allowed => {
                            return (
                              <div key={allowed.companyId} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', backgroundColor: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#111827' }}>{allowed.companyName}</span>
                                  <button
                                    onClick={() => setEditAllowedCompanies(editAllowedCompanies.filter(ac => ac.companyId !== allowed.companyId))}
                                    style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                                    title="Quitar empresa"
                                  >
                                    <FaTrash size={12} />
                                  </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#4b5563', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={allowed.haveSchedule}
                                      onChange={(e) => {
                                        const updated = editAllowedCompanies.map(ac =>
                                          ac.companyId === allowed.companyId ? { ...ac, haveSchedule: e.target.checked } : ac
                                        );
                                        setEditAllowedCompanies(updated);
                                      }}
                                    />
                                    Restringir Horario
                                  </label>

                                  {allowed.haveSchedule && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem' }}>
                                      {(allowed.schedules || []).map((schedule, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <input
                                            type="time"
                                            value={schedule.start}
                                            onChange={(e) => {
                                              const newSchedules = [...(allowed.schedules || [])];
                                              newSchedules[idx] = { ...newSchedules[idx], start: e.target.value };
                                              const updated = editAllowedCompanies.map(ac =>
                                                ac.companyId === allowed.companyId ? { ...ac, schedules: newSchedules } : ac
                                              );
                                              setEditAllowedCompanies(updated);
                                            }}
                                            style={{ fontSize: '0.8rem', padding: '0.1rem', border: '1px solid #d1d5db', borderRadius: '0.2rem' }}
                                          />
                                          <span style={{ fontSize: '0.8rem' }}>-</span>
                                          <input
                                            type="time"
                                            value={schedule.end}
                                            onChange={(e) => {
                                              const newSchedules = [...(allowed.schedules || [])];
                                              newSchedules[idx] = { ...newSchedules[idx], end: e.target.value };
                                              const updated = editAllowedCompanies.map(ac =>
                                                ac.companyId === allowed.companyId ? { ...ac, schedules: newSchedules } : ac
                                              );
                                              setEditAllowedCompanies(updated);
                                            }}
                                            style={{ fontSize: '0.8rem', padding: '0.1rem', border: '1px solid #d1d5db', borderRadius: '0.2rem' }}
                                          />
                                          <button
                                            onClick={() => {
                                              const newSchedules = (allowed.schedules || []).filter((_, i) => i !== idx);
                                              const updated = editAllowedCompanies.map(ac =>
                                                ac.companyId === allowed.companyId ? { ...ac, schedules: newSchedules } : ac
                                              );
                                              setEditAllowedCompanies(updated);
                                            }}
                                            style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                                            title="Eliminar horario"
                                          >
                                            <FaTimes size={12} />
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        onClick={() => {
                                          const newSchedules = [...(allowed.schedules || []), { start: '08:00', end: '12:00' }];
                                          const updated = editAllowedCompanies.map(ac =>
                                            ac.companyId === allowed.companyId ? { ...ac, schedules: newSchedules } : ac
                                          );
                                          setEditAllowedCompanies(updated);
                                        }}
                                        style={{
                                          fontSize: '0.75rem',
                                          color: '#3b82f6',
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                                          marginTop: '0.2rem'
                                        }}
                                      >
                                        <FaPlus size={10} /> Agregar Horario
                                      </button>
                                    </div>
                                  )}

                                 
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#1f2937', cursor: 'pointer', marginTop: '0.2rem' }}>
                                    <input
                                      type="checkbox"
                                      checked={allowed.haveRoleRestriction}
                                      onChange={async (e) => {
                                        const isChecked = e.target.checked;
                                        if (isChecked) {
                                          await fetchRolesForCompany(allowed.companyName);
                                        }
                                        const updated = editAllowedCompanies.map(ac =>
                                          ac.companyId === allowed.companyId ? { ...ac, haveRoleRestriction: isChecked } : ac
                                        );
                                        setEditAllowedCompanies(updated);
                                      }}
                                    />
                                    Restringir Cargos
                                  </label>

                                  {allowed.haveRoleRestriction && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem', marginTop: '0.2rem' }}>
                                      {isFetchingRoles && !availableRoles[allowed.companyName] ? (
                                        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Cargando cargos...</p>
                                      ) : (availableRoles[allowed.companyName] || []).length === 0 ? (
                                        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>No se encontraron cargos para esta empresa.</p>
                                      ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                          
                                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <select
                                              value={selectedRoleToAdd[allowed.companyId] || ''}
                                              onChange={(e) => setSelectedRoleToAdd(prev => ({ ...prev, [allowed.companyId]: e.target.value }))}
                                              style={{
                                                flex: 1,
                                                padding: '0.2rem 0.4rem',
                                                fontSize: '0.75rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '0.25rem',
                                                outline: 'none',
                                                backgroundColor: 'white',
                                                color: '#111827'
                                              }}
                                            >
                                              <option value="">Seleccionar cargo...</option>
                                              {(availableRoles[allowed.companyName] || [])
                                                .filter(role => !(allowed.allowedRoles || []).includes(role))
                                                .map(role => (
                                                  <option key={role} value={role}>{role}</option>
                                                ))
                                              }
                                            </select>
                                            <button
                                              onClick={() => {
                                                const roleToAdd = selectedRoleToAdd[allowed.companyId];
                                                if (!roleToAdd) return;
                                                const currentRoles = allowed.allowedRoles || [];
                                                if (currentRoles.includes(roleToAdd)) return;

                                                const updated = editAllowedCompanies.map(ac =>
                                                  ac.companyId === allowed.companyId ? { ...ac, allowedRoles: [...currentRoles, roleToAdd] } : ac
                                                );
                                                setEditAllowedCompanies(updated);
                                                setSelectedRoleToAdd(prev => ({ ...prev, [allowed.companyId]: '' }));
                                              }}
                                              disabled={!selectedRoleToAdd[allowed.companyId]}
                                              style={{
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                border: 'none',
                                                cursor: selectedRoleToAdd[allowed.companyId] ? 'pointer' : 'not-allowed',
                                                fontSize: '0.75rem',
                                                opacity: selectedRoleToAdd[allowed.companyId] ? 1 : 0.6
                                              }}
                                            >
                                              Agregar
                                            </button>
                                          </div>

                                          
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            {(allowed.allowedRoles || []).map(role => (
                                              <div key={role} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: '#dbeafe',
                                                color: '#1e40af',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '0.375rem',
                                                border: '1px solid #3b82f6',
                                                fontWeight: '600'
                                              }}>
                                                {role}
                                                <button
                                                  onClick={() => {
                                                    const updated = editAllowedCompanies.map(ac =>
                                                      ac.companyId === allowed.companyId
                                                        ? { ...ac, allowedRoles: (ac.allowedRoles || []).filter(r => r !== role) }
                                                        : ac
                                                    );
                                                    setEditAllowedCompanies(updated);
                                                  }}
                                                  style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                                  title="Quitar cargo"
                                                >
                                                  <FaTimes size={10} />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div> */}
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleUpdate(u.id)}
                        disabled={isUpdating}
                        style={{ color: '#059669', background: 'none', border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Guardar Cambios"
                      >
                        {isUpdating ? <FaSpinner className="spin" size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave size={18} />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditAllowedCompanies([])
                        }}
                        style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Cancelar"
                      >
                        <FaTimes size={18} />
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
                        onClick={async () => {
                          setEditingId(u.id)
                          setEditName(u.name)
                          setEditHaveAmenidades(!!u.haveAmenidades)
                          setEditHaveSubEnvironments(!!u.haveSubEnvironments)
                          const config = u.allowedCompanies || [];
                          setEditAllowedCompanies(config)

                          // Pre-fetch roles for companies that have role restriction active
                          for (const ac of config) {
                            if (ac.haveRoleRestriction) {
                              fetchRolesForCompany(ac.companyName);
                            }
                          }
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
