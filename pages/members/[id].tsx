import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
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
import { FaEdit, FaTrash, FaUserPlus, FaSpinner, FaChartBar, FaArrowLeft, FaUserClock } from 'react-icons/fa'
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
  const fetchAllMembers = async () => {
    setIsLoading(true)
    setLoadingMembers(true)
    try {
      const membersCol = getMembersCollectionPath(id)
      // Fetch ALL, ordered by createdAt
      const q = query(membersCol, orderBy('createdAt', 'desc'))

      const snapshot = await getDocs(q)
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[]

      setMembers(membersData)
      setTotalCount(membersData.length)
      // Client-side pagination doesn't use page/cursor state here

    } catch (error) {
      console.error("Error fetching all members:", error)
    } finally {
      setIsLoading(false)
      setLoadingMembers(false)
    }
  }

  // SEARCH LOGIC
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Search Effect
  // DISABLED FOR CLIENT-SIDE PAGINATION: MembersTable handles filtering locally on the full list.
  /*
  useEffect(() => {
    if (debouncedSearchTerm) {
      performSearch(debouncedSearchTerm)
    } else if (id && !debouncedSearchTerm && searchTerm === '') {
      // Only reset if search was cleared
      setCurrentPage(1)
      setLastVisibleDocs([])
      fetchAllMembers()
    }
  }, [debouncedSearchTerm, id]) 
  */

  const performSearch = async (term: string) => {
    setLoadingMembers(true)
    try {
      const membersCol = getMembersCollectionPath(id)
      const isNumeric = /^\d+$/.test(term)

      // Prepare queries
      // Note: Firestore "OR" queries are limited. We'll do a best-effort approach.
      let q;

      if (isNumeric) {
        // DNI Search Only
        q = query(membersCol, where('dni', '>=', term), where('dni', '<=', term + '\uf8ff'), limit(20))

        const snapshot = await getDocs(q)
        const membersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Member[]
        setMembers(membersData)
        setTotalCount(membersData.length)

      } else {
        // Name search removed as requested. reset to empty or do nothing if not numeric.
        // If user somehow types text, return empty or show all (safest is show nothing or treat as invalid)
        // But UI will restrict input so this branch might be unreachable or just empty.
        setMembers([])
        setTotalCount(0)
      }

      // Common updates
      setCurrentPage(1)
      setLastVisibleDocs([]) // Reset cursor stack

    } catch (error) {
      console.error("Error searching:", error)
    } finally {
      setLoadingMembers(false)
    }
  }

  useEffect(() => {
    if (id) {
      // Reset everything on location change
      setCurrentPage(1)
      setLastVisibleDocs([])
      fetchAllMembers()
    }
  }, [id])

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
      const numericValue = value.replace(/[^0-9]/g, '')
      if (numericValue.length <= 8) {
        setFormData(prev => ({ ...prev, [name]: numericValue }))
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

      if (isEditing && editingId) {
        const docRef = doc(membersCol, editingId)
        await updateDoc(docRef, {
          ...formData,
          fotoUrl,
          updatedAt: serverTimestamp()
        })
        // Sync today's attendance records with the new data
        await syncTodaysAsistencias(editingId, formData, fotoUrl)
      } else {
        await setDoc(doc(membersCol, formData.dni), {
          ...formData,
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
      nombre: '', dni: '', apellidos: '', empresa: '', area: '', cargo: '', sexo: '', fotoUrl: ''
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
            <Link href={`/members/${id}/access`} className={`${styles.actionButton} ${styles.btnPremiumSecondary}`} style={{ textDecoration: 'none' }}>
              <FaUserClock /> Registrar Ingreso
            </Link>
            <Link href={`/members/${id}/reports`} className={`${styles.actionButton} ${styles.btnPremiumGreen}`} style={{ textDecoration: 'none' }}>
              <FaChartBar /> Reportes
            </Link>
          </div>
        </div>

        <MembersTable
          members={members}
          empresas={empresas}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          /* Pass empty/dummy props if required by interface until updated, or remove if optional */
          currentPage={1} // Ignored by client-side table logic? Or used as initial?
          totalPages={1} // Ignored
          totalMembers={members.length}
          onNextPage={() => { }}
          onPrevPage={() => { }}
          isPaginating={loadingMembers}
          // Search Props
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          // Batch Action
          onBatchUpdateCompany={handleBatchUpdateCompany}
        />
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
