import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import NextImage from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  setDoc,
  addDoc,
  Timestamp,
  writeBatch,
  limit,
  startAfter,
  getCountFromServer,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/firebase/firebase.config'
import { FaEdit, FaTrash, FaUserPlus, FaSpinner, FaChartBar, FaArrowLeft, FaUserClock, FaUsers } from 'react-icons/fa'
import CompanyModal from '@/components/CompanyModal'
import AreaModal from '@/components/AreaModal'
import CargoModal from '@/components/CargoModal'
import styles from './Members.module.css'
import { MembersTable } from '@/components/MembersTable'
import { MembersForm } from '@/components/MembersForm'
import { Member, Company, Area, Cargo, Ubicacion } from '@/features/types/types'
import { ThemeToggle } from '@/components/ThemeToggle'
import UbicacionModal from '@/components/UbicacionModal'



const getMembersCollectionPath = (locationId: string | string[] | undefined) => {
  if (!locationId || locationId === 'all') {
    return collection(db, 'members')
  }
  return collection(db, 'ubicaciones', locationId as string, 'members')
}

const DynamicMembersPage: NextPage = () => {
  const router = useRouter()
  const { id } = router.query
  const [members, setMembers] = useState<Member[]>([])
  const [formData, setFormData] = useState<Member>({
    nombre: '',
    dni: '',
    tipoDocumento: 'DNI',
    apellidos: '',
    empresa: '',
    area: '',
    cargo: '',
    sexo: '',
    fotoUrl: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Location specific state
  const [locationName, setLocationName] = useState<string>('')

  // Smart Search State
  const [smartSearchQuery, setSmartSearchQuery] = useState('')
  const [smartSearchResults, setSmartSearchResults] = useState<Member[]>([])
  const [isSmartSearching, setIsSmartSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Company/Area/Cargo Management State
  const [empresas, setEmpresas] = useState<Company[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false)
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false)
  const [isUbicacionModalOpen, setIsUbicacionModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // PIN Protection State


  // Fetch Location Name
  useEffect(() => {
    if (!id) return
    const fetchLocation = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'ubicaciones', id as string));
        if (docSnap.exists()) {
          setLocationName(docSnap.data().name);
        }
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    }
    fetchLocation();
  }, [id])

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [lastVisibleDocs, setLastVisibleDocs] = useState<QueryDocumentSnapshot[]>([]) // Stack of last docs for pagination boundaries
  const [loadingMembers, setLoadingMembers] = useState(false)

  const ITEMS_PER_PAGE = 20


  /* SERVER-SIDE PAGINATION LOGIC (PRESERVED FOR FUTURE USE) */
  const fetchDataServerSide = async () => {
    setIsLoading(true)
    setLoadingMembers(true)
    try {
      const membersCol = getMembersCollectionPath(id)
      const countSnapshot = await getCountFromServer(query(membersCol))
      const total = countSnapshot.data().count
      setTotalCount(total)
      fetchPageServerSide(1, null)
    } catch (error) {
      console.error("Error fetching data:", error)
      setLoadingMembers(false)
    }
  }

  const fetchPageServerSide = async (page: number, startAfterDoc: QueryDocumentSnapshot | null) => {
    setLoadingMembers(true)
    try {
      const membersCol = getMembersCollectionPath(id)
      let q = query(membersCol, orderBy('createdAt', 'desc'), limit(ITEMS_PER_PAGE))

      if (startAfterDoc) {
        q = query(membersCol, orderBy('createdAt', 'desc'), startAfter(startAfterDoc), limit(ITEMS_PER_PAGE))
      }

      const snapshot = await getDocs(q)
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[]

      setMembers(membersData)
      setCurrentPage(page)

      const lastDoc = snapshot.docs[snapshot.docs.length - 1]
      if (lastDoc) {
        setLastVisibleDocs(prev => {
          const newCursors = [...prev]
          newCursors[page] = lastDoc
          return newCursors
        })
      }
    } catch (error) {
      console.error("Error fetching page:", error)
    } finally {
      setIsLoading(false)
      setLoadingMembers(false)
    }
  }
  /* END SERVER-SIDE PAGINATION LOGIC */

  /* CLIENT-SIDE PAGINATION LOGIC (ACTIVE) */
  const fetchAllMembers = useCallback(async () => {
    if (!id) return
    setLoadingMembers(true)
    try {
      const membersCol = getMembersCollectionPath(id)
      const q = query(membersCol, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[]
      setMembers(membersData)
      setTotalCount(membersData.length)
    } catch (error) {
      console.error("Error fetching members:", error)
    } finally {
      setLoadingMembers(false)
    }
  }, [id])

  const performSmartSearch = useCallback(async (term: string) => {
    if (!id || !term.trim()) return
    setIsSmartSearching(true)
    setShowSearchResults(true)

    try {
      const termLower = term.trim().toLowerCase()
      const membersCol = collection(db, 'ubicaciones', id as string, 'members')

      const isNumeric = /^\d+$/.test(termLower)
      let results: Member[] = []

      if (isNumeric) {
        // Search by DNI prefix
        const qDni = query(
          membersCol,
          where('dni', '>=', termLower),
          where('dni', '<=', termLower + '\uf8ff'),
          limit(10)
        )
        const snap = await getDocs(qDni)
        results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Member))
      } else {
        // Search by Nombre and Apellidos in parallel
        const qNombre = query(
          membersCol,
          where('nombre', '>=', termLower),
          where('nombre', '<=', termLower + '\uf8ff'),
          limit(10)
        )
        const qApellidos = query(
          membersCol,
          where('apellidos', '>=', termLower),
          where('apellidos', '<=', termLower + '\uf8ff'),
          limit(10)
        )

        const [snapNombre, snapApellidos] = await Promise.all([
          getDocs(qNombre),
          getDocs(qApellidos)
        ])

        const resultsNombre = snapNombre.docs.map(d => ({ id: d.id, ...d.data() } as Member))
        const resultsApellidos = snapApellidos.docs.map(d => ({ id: d.id, ...d.data() } as Member))

        // Merge and deduplicate
        const map = new Map<string, Member>()
        resultsNombre.forEach(m => map.set(m.id!, m))
        resultsApellidos.forEach(m => map.set(m.id!, m))
        results = Array.from(map.values()).slice(0, 10)
      }

      setSmartSearchResults(results)
    } catch (error) {
      console.error("Error in smart search:", error)
    } finally {
      setIsSmartSearching(false)
    }
  }, [id])

  // Smart Search Effect (Debounced)
  useEffect(() => {
    if (!smartSearchQuery.trim()) {
      setSmartSearchResults([])
      setShowSearchResults(false)
      return
    }

    const timer = setTimeout(() => {
      performSmartSearch(smartSearchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [smartSearchQuery, performSmartSearch])

  useEffect(() => {
    if (id) {
      // Reset everything on location change
      setCurrentPage(1)
      setLastVisibleDocs([])
      fetchAllMembers()
    }
  }, [id, fetchAllMembers])

  const handleNextPage = () => {
    // Client-side handled within MembersTable or ignored here
  }

  const handlePrevPage = () => {
    // Client-side handled within MembersTable or ignored here
  }

  // Refresh list when a member is added/edited/deleted
  const refreshCurrentPage = () => {
    fetchAllMembers()
  }

  // Global Collections for selects
  useEffect(() => {
    const q = query(collection(db, 'empresas'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const companiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Company[]
      setEmpresas(companiesData)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'areas'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const areasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Area[]
      setAreas(areasData)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'cargos'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cargosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cargo[]
      setCargos(cargosData)
    })
    return () => unsubscribe()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'dni') {
      const isCE = formData.tipoDocumento === 'CE';
      if (isCE) {
        // CE: Alphanumeric, up to 9 chars
        const alphanumericValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (alphanumericValue.length <= 9) {
          setFormData(prev => ({ ...prev, [name]: alphanumericValue }))
        }
      } else {
        // DNI: Numeric, up to 8 digits
        const numericValue = value.replace(/[^0-9]/g, '')
        if (numericValue.length <= 8) {
          setFormData(prev => ({ ...prev, [name]: numericValue }))
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0]
      if (file.size > 100 * 1024) {
        try {
          file = await compressImage(file)
        } catch (error) {
          console.error("Error compressing image:", error)
          alert("No se pudo comprimir la imagen.")
          return
        }
      }
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const MAX_DIM = 1000
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width)
            width = MAX_DIM
          } else {
            width = Math.round((width * MAX_DIM) / height)
            height = MAX_DIM
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas context not available'))
        ctx.drawImage(img, 0, 0, width, height)
        let quality = 0.7
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Compression failed'))
            if (blob.size <= 100 * 1024 || quality <= 0.1) {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
            } else {
              quality -= 0.1
              tryCompress()
            }
          }, 'image/jpeg', quality)
        }
        tryCompress()
      }
      img.onerror = (err) => reject(err)
    })
  }

  const syncTodaysAsistencias = async (memberId: string, updatedData: Partial<Member>, fotoUrl?: string) => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const asistenciasCol = id
        ? collection(db, 'ubicaciones', id as string, 'asistencias')
        : collection(db, 'asistencias');

      const q = query(
        asistenciasCol,
        where('memberId', '==', memberId),
        where('timestamp', '>=', Timestamp.fromDate(startOfToday))
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.update(d.ref, {
          memberName: `${updatedData.nombre} ${updatedData.apellidos}`,
          memberDni: updatedData.dni,
          company: updatedData.empresa,
          area: updatedData.area || null,
          cargo: updatedData.cargo || null,
          sexo: updatedData.sexo,
          fotoUrl: fotoUrl || null,
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error syncing today's asistencias:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      let fotoUrl = formData.fotoUrl
      if (selectedImage) {
        const storageRef = ref(storage, `members/${formData.dni}`)
        await uploadBytes(storageRef, selectedImage)
        fotoUrl = await getDownloadURL(storageRef)
      }

      const membersCol = getMembersCollectionPath(id)

      const normalizedFormData = {
        ...formData,
        nombre: formData.nombre.trim().toLowerCase(),
        apellidos: formData.apellidos.trim().toLowerCase(),
        empresa: formData.empresa.trim().toLowerCase(),
      }

      if (isEditing && editingId) {
        const docRef = doc(membersCol, editingId)
        await updateDoc(docRef, {
          ...normalizedFormData,
          fotoUrl,
          updatedAt: serverTimestamp()
        })
        // Sync today's attendance records with the new data
        await syncTodaysAsistencias(editingId, normalizedFormData, fotoUrl)
      } else {
        await setDoc(doc(membersCol, formData.dni), {
          ...normalizedFormData,
          fotoUrl,
          createdAt: serverTimestamp()
        })
        alert("Usuario agregado correctamente")
        setFormData({
          nombre: '', dni: '', apellidos: '', empresa: '', area: '', cargo: '', sexo: '', fotoUrl: ''
        })
        setSelectedImage(null)
        setPreviewUrl(null)
      }

      if (isEditing) {
        handleCancel()
      }
    } catch (error) {
      console.error("Error saving member:", error)
      alert("Error al guardar el usuario")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (member: Member) => {
    if (!member.id) return
    setFormData({
      nombre: member.nombre,
      dni: member.dni,
      tipoDocumento: member.tipoDocumento || 'DNI',
      apellidos: member.apellidos,
      empresa: member.empresa,
      area: member.area || '',
      cargo: member.cargo || '',
      sexo: member.sexo || '',
      fotoUrl: member.fotoUrl
    })
    setPreviewUrl(member.fotoUrl || null)
    setIsEditing(true)
    setEditingId(member.id)
    setIsModalOpen(true)
  }

  const handleDelete = async (memberId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        const membersCol = getMembersCollectionPath(id)
        await deleteDoc(doc(membersCol, memberId))

        // Update local state immediately for better UX
        setSmartSearchResults(prev => prev.filter(m => m.id !== memberId))
        setMembers(prev => prev.filter(m => m.id !== memberId))

        alert("Usuario eliminado correctamente")
        refreshCurrentPage()
      } catch (error) {
        console.error("Error deleting member:", error)
        alert("Error al eliminar el usuario")
      }
    }
  }

  const handleBatchUpdateCompany = async (memberIds: string[], targetCompany: string) => {
    if (!targetCompany) return;
    if (memberIds.length === 0) return;

    // Safety check mostly for user confirm
    if (!window.confirm(`¿Estás seguro de mover ${memberIds.length} miembros a la empresa "${targetCompany}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const membersCol = getMembersCollectionPath(id);
      const batch = writeBatch(db);

      // Firestore batch limit is 500. If more, we need multiple batches or simple promises.
      // For simplicity and speed with <500 usually, we try batch. 
      // If >500, we loop.

      // Let's use Promise.all for flexibility with large numbers (though batch is atomic)
      // With writeBatch we would need to chunk. 
      // Given the use case, let's chunk it properly to be safe.

      const chunkSize = 450;
      for (let i = 0; i < memberIds.length; i += chunkSize) {
        const chunk = memberIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(mid => {
          const docRef = doc(membersCol, mid);
          batch.update(docRef, {
            empresa: targetCompany,
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
      }

      alert("Empresas actualizadas correctamente.");
      fetchAllMembers(); // Refresh list

    } catch (error) {
      console.error("Error batch updating companies:", error);
      alert("Error al actualizar empresas.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormData({
      nombre: '', dni: '', tipoDocumento: 'DNI', apellidos: '', empresa: '', area: '', cargo: '', sexo: '', fotoUrl: ''
    })
    setSelectedImage(null)
    setPreviewUrl(null)
    setIsModalOpen(false)
  }

  const openNewMemberModal = () => {
    handleCancel();
    setIsModalOpen(true);
  }

  return (
    <>
      <Head>
        <title>Usuarios {locationName ? `- ${locationName}` : ''} - Management Gym</title>
      </Head>
      <main className={styles.container}>
        <div className={styles.headerLinkContainer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className={styles.backLink}>
            <FaArrowLeft /> Volver al Inicio
          </Link>
          <ThemeToggle />
        </div>

        <h1 className={styles.pageTitle}>Gestión de Usuarios</h1>

        {/* Smart Search Section */}
        <div className={styles.searchSection}>
          <div className={styles.searchInputWrapper}>
            <input
              type="text"
              placeholder="Buscar miembro por nombre, apellido o DNI..."
              value={smartSearchQuery}
              onChange={(e) => setSmartSearchQuery(e.target.value)}
              onFocus={() => smartSearchQuery && setShowSearchResults(true)}
              className={styles.searchInput}
            />
            <div className={styles.searchIcon}>
              <FaUsers />
            </div>
            {isSmartSearching && (
              <div style={{ position: 'absolute', right: '15px' }}>
                <FaSpinner className={styles.spinAnimation} />
              </div>
            )}
          </div>

          {showSearchResults && (smartSearchResults.length > 0 || !isSmartSearching) && smartSearchQuery && (
            <div className={styles.searchResultsDropdown}>
              {smartSearchResults.length > 0 ? (
                smartSearchResults.map(member => (
                  <div
                    key={member.id}
                    onClick={() => {
                      handleEdit(member)
                      setShowSearchResults(false)
                      setSmartSearchQuery('')
                    }}
                    className={styles.searchResultItem}
                  >
                    <div className={styles.resultAvatar}>
                      {member.fotoUrl ? (
                        <NextImage
                          src={member.fotoUrl}
                          alt={`${member.nombre} ${member.apellidos}`}
                          width={40}
                          height={40}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                          <FaUsers />
                        </div>
                      )}
                    </div>
                    <div className={styles.resultInfo}>
                      <p className={styles.resultName}>
                        {member.nombre} {member.apellidos}
                      </p>
                      <p className={styles.resultMeta}>
                        DNI: {member.dni} • <span style={{ textTransform: 'uppercase' }}>{member.empresa}</span>
                      </p>
                    </div>
                    <button
                      className={styles.searchDeleteBtn}
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering edit
                        if (member.id) handleDelete(member.id);
                      }}
                      title="Eliminar usuario"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <div className={styles.noResults}>
                  No se encontraron resultados para &quot;{smartSearchQuery}&quot;
                </div>
              )}
            </div>
          )}
        </div>
        <div className={styles.responsiveHeader}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', margin: 0 }}>
              {locationName || 'Cargando ubicación...'}
            </h2>
            <p className={styles.headerSubtitle}>Personal asignado a este ambiente</p>
          </div>
          <div className={styles.responsiveHeaderActions}>
            <button onClick={openNewMemberModal} className={`${styles.actionButton} ${styles.btnPremium}`}>
              <FaUserPlus /> Nuevo Miembro
            </button>
            <Link href={`/members/${id}/all`} className={`${styles.actionButton} ${styles.btnPremiumSecondary}`} style={{ textDecoration: 'none' }}>
              <FaUsers /> Miembros
            </Link>
            <Link href={`/members/${id}/access`} className={`${styles.actionButton} ${styles.btnPremiumSecondary}`} style={{ textDecoration: 'none', backgroundColor: '#6366f1' }}>
              <FaUserClock /> Registrar Ingreso
            </Link>
            <Link href={`/members/${id}/reports`} className={`${styles.actionButton} ${styles.btnPremiumGreen}`} style={{ textDecoration: 'none' }}>
              <FaChartBar /> Reportes
            </Link>
          </div>
        </div>

        <div className={styles.dashboardSummary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total Miembros</span>
            <p className={styles.summaryValue}>{totalCount}</p>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Empresas Activas</span>
            <p className={`${styles.summaryValue} ${styles.success}`}>{empresas.length}</p>
          </div>
        </div>
      </main>

      <MembersForm
        isOpen={isModalOpen}
        onClose={handleCancel}
        formData={formData}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        previewUrl={previewUrl}
        empresas={empresas}
        areas={areas}
        cargos={cargos}
        onInputChange={handleInputChange}
        onImageChange={handleImageChange}
        onSubmit={(e) => {
          handleSubmit(e).then(() => {
            refreshCurrentPage(); // Refresh table after add/edit
          });
        }}
        onCancel={handleCancel}
        onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
        onOpenAreaModal={() => setIsAreaModalOpen(true)}
        onOpenCargoModal={() => setIsCargoModalOpen(true)}
        locationId={id as string}
      />

      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        db={db}
      />
      <AreaModal
        isOpen={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
        db={db}
      />
      <CargoModal
        isOpen={isCargoModalOpen}
        onClose={() => setIsCargoModalOpen(false)}
        db={db}
      />

    </>
  )
}

export default DynamicMembersPage
