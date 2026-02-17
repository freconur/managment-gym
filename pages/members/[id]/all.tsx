import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    writeBatch,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore'
import { db } from '@/firebase/firebase.config'
import { FaArrowLeft, FaUsers, FaSpinner } from 'react-icons/fa'
import { MembersTable } from '@/components/MembersTable'
import { Member, Company, Area, Cargo } from '@/features/types/types'
import { ThemeToggle } from '@/components/ThemeToggle'
import styles from '../Members.module.css'
import { MembersForm } from '@/components/MembersForm'

const AllMembersPage: NextPage = () => {
    const router = useRouter()
    const { id } = router.query
    const [members, setMembers] = useState<Member[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [locationName, setLocationName] = useState<string>('')
    const [empresas, setEmpresas] = useState<Company[]>([])
    const [areas, setAreas] = useState<Area[]>([])
    const [cargos, setCargos] = useState<Cargo[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    // Modal states for editing
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<Member>({
        nombre: '', dni: '', apellidos: '', empresa: '', area: '', cargo: '', sexo: '', fotoUrl: ''
    })
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

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

    // Fetch Members
    const fetchAllMembers = useCallback(async () => {
        if (!id) return
        setLoadingMembers(true)
        try {
            const membersCol = collection(db, 'ubicaciones', id as string, 'members')
            const q = query(membersCol, orderBy('createdAt', 'desc'))
            const snapshot = await getDocs(q)
            const membersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Member[]
            setMembers(membersData)
        } catch (error) {
            console.error("Error fetching members:", error)
        } finally {
            setLoadingMembers(false)
        }
    }, [id])

    useEffect(() => {
        if (id) {
            fetchAllMembers()
        }
    }, [id, fetchAllMembers])

    // Subscriptions for filters
    useEffect(() => {
        const qComp = query(collection(db, 'empresas'), orderBy('createdAt', 'desc'))
        const unsubComp = onSnapshot(qComp, (snap) => {
            setEmpresas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)))
        })
        const qArea = query(collection(db, 'areas'), orderBy('createdAt', 'desc'))
        const unsubArea = onSnapshot(qArea, (snap) => {
            setAreas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Area)))
        })
        const qCargo = query(collection(db, 'cargos'), orderBy('createdAt', 'desc'))
        const unsubCargo = onSnapshot(qCargo, (snap) => {
            setCargos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cargo)))
        })
        return () => { unsubComp(); unsubArea(); unsubCargo(); }
    }, [])

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
                const docRef = doc(db, 'ubicaciones', id as string, 'members', memberId)
                await deleteDoc(docRef)
                fetchAllMembers()
            } catch (error) {
                console.error("Error deleting member:", error)
                alert("Error al eliminar el usuario")
            }
        }
    }

    const handleBatchUpdateCompany = async (memberIds: string[], targetCompany: string) => {
        if (!targetCompany || memberIds.length === 0) return
        if (!window.confirm(`¿Estás seguro de mover ${memberIds.length} miembros a la empresa "${targetCompany}"?`)) return

        setIsLoading(true)
        try {
            const membersCol = collection(db, 'ubicaciones', id as string, 'members')
            const chunkSize = 450
            for (let i = 0; i < memberIds.length; i += chunkSize) {
                const chunk = memberIds.slice(i, i + chunkSize)
                const batch = writeBatch(db)
                chunk.forEach(mid => {
                    const docRef = doc(membersCol, mid)
                    batch.update(docRef, { empresa: targetCompany, updatedAt: serverTimestamp() })
                })
                await batch.commit()
            }
            alert("Empresas actualizadas correctamente.")
            fetchAllMembers()
        } catch (error) {
            console.error("Error batch updating companies:", error)
            alert("Error al actualizar empresas.")
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading && !locationName) {
        return (
            <div className={styles.loadingContainer}>
                <FaSpinner className={styles.spinAnimation} />
                <p>Cargando miembros...</p>
            </div>
        )
    }

    return (
        <>
            <Head>
                <title>Lista de Miembros - {locationName} - Management Gym</title>
            </Head>
            <main className={styles.container}>
                <div className={styles.headerLinkContainer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href={`/members/${id}`} className={styles.backLink}>
                        <FaArrowLeft /> Volver a Gestión
                    </Link>
                    <ThemeToggle />
                </div>

                <div className={styles.responsiveHeader}>
                    <div>
                        <h1 className={styles.pageTitle} style={{ margin: 0 }}>
                            <FaUsers style={{ marginRight: '10px', color: '#3b82f6' }} /> Todos los Miembros
                        </h1>
                        <p className={styles.headerSubtitle}>{locationName}</p>
                    </div>
                </div>

                <MembersTable
                    members={members}
                    empresas={empresas}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    currentPage={1}
                    totalPages={1}
                    totalMembers={members.length}
                    onNextPage={() => { }}
                    onPrevPage={() => { }}
                    isPaginating={loadingMembers}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onBatchUpdateCompany={handleBatchUpdateCompany}
                />
            </main>

            {/* Note: MembersForm is only for editing here. Adding is kept in the main page as per typical dashboard flow, 
          but if you want to edit here, we need the form. */}
            {isModalOpen && (
                <MembersForm
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    formData={formData}
                    isEditing={isEditing}
                    isSubmitting={isSubmitting}
                    previewUrl={previewUrl}
                    empresas={empresas}
                    areas={areas}
                    cargos={cargos}
                    onInputChange={(e) => {
                        const { name, value } = e.target
                        setFormData(prev => ({ ...prev, [name]: value }))
                    }}
                    onImageChange={() => { }} // Simplified for view-only or separate logic if needed
                    onSubmit={async (e) => {
                        e.preventDefault()
                        // Implementation for simple edit if needed, or redirect
                        alert("Para editar, regresa a la página principal por ahora.")
                        setIsModalOpen(false)
                    }}
                    onCancel={() => setIsModalOpen(false)}
                    onOpenCompanyModal={() => { }}
                    onOpenAreaModal={() => { }}
                    onOpenCargoModal={() => { }}
                    locationId={id as string}
                />
            )}
        </>
    )
}

export default AllMembersPage
