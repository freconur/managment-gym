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
    updateDoc, // Added
    where, // Added
    Timestamp, // Added
    writeBatch,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage' // Added
import { db, storage } from '@/firebase/firebase.config' // Added storage
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
    const [selectedImage, setSelectedImage] = useState<File | null>(null)

    // Helper: Compress Image (Logic from dashboard)
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

    // Helper: Sync Today's Assistances
    const syncTodaysAsistencias = async (memberId: string, updatedData: Partial<Member>, fotoUrl?: string) => {
        try {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            const asistenciasCol = id
                ? collection(db, 'ubicaciones', id as string, 'asistencias')
                : collection(db, 'asistencias')

            const q = query(
                asistenciasCol,
                where('memberId', '==', memberId),
                where('timestamp', '>=', Timestamp.fromDate(startOfToday))
            )

            const snapshot = await getDocs(q)
            if (snapshot.empty) return

            const batch = writeBatch(db)
            snapshot.docs.forEach((d) => {
                batch.update(d.ref, {
                    memberName: `${updatedData.nombre} ${updatedData.apellidos}`,
                    memberDni: updatedData.dni,
                    company: updatedData.empresa,
                    area: updatedData.area || null,
                    cargo: updatedData.cargo || null,
                    sexo: updatedData.sexo,
                    fotoUrl: fotoUrl || null,
                })
            })

            await batch.commit()
        } catch (error) {
            console.error("Error syncing today's asistencias:", error)
        }
    }

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
            } finally {
                setIsLoading(false);
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
                ...doc.data(),
                id: doc.id
            })) as Member[]
            setMembers(membersData)
        } catch (error) {
            console.error("Error fetching members:", error)
        } finally {
            setLoadingMembers(false)
            setIsLoading(false)
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
        if (!id) {
            alert("Error: No se pudo identificar la ubicación.")
            return
        }
        if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
            try {
                const docRef = doc(db, 'ubicaciones', id as string, 'members', memberId)
                await deleteDoc(docRef)
                alert("Usuario eliminado correctamente.")
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
                    onImageChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                            try {
                                const compressed = await compressImage(file)
                                setSelectedImage(compressed)
                                setPreviewUrl(URL.createObjectURL(compressed))
                            } catch (error) {
                                console.error("Error compressing image:", error)
                                alert("Error al procesar la imagen.")
                            }
                        }
                    }}
                    onSubmit={async (e) => {
                        e.preventDefault()
                        setIsSubmitting(true)
                        try {
                            const memberId = editingId
                            if (!memberId || !id) return

                            let fotoUrl = formData.fotoUrl
                            if (selectedImage) {
                                const storageRef = ref(storage, `members/${formData.dni}`)
                                await uploadBytes(storageRef, selectedImage)
                                fotoUrl = await getDownloadURL(storageRef)
                            }

                            const normalizedData = {
                                ...formData,
                                nombre: formData.nombre.trim().toLowerCase(),
                                apellidos: formData.apellidos.trim().toLowerCase(),
                                empresa: formData.empresa.trim().toLowerCase(),
                                fotoUrl: fotoUrl || ''
                            }

                            const docRef = doc(db, 'ubicaciones', id as string, 'members', memberId)
                            await updateDoc(docRef, {
                                ...normalizedData,
                                updatedAt: serverTimestamp()
                            })

                            // Sync Assistances
                            await syncTodaysAsistencias(memberId, normalizedData, fotoUrl)

                            alert("Usuario actualizado correctamente.")
                            setIsModalOpen(false)
                            setSelectedImage(null)
                            fetchAllMembers()
                        } catch (error) {
                            console.error("Error updating member:", error)
                            alert("Error al actualizar el usuario.")
                        } finally {
                            setIsSubmitting(false)
                        }
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
