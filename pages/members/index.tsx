import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import NextImage from 'next/image'
import { useState, useEffect } from 'react'
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    setDoc
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { app, storage } from '@/firebase/firebase.config'
import { FaEdit, FaTrash, FaUserPlus, FaSave, FaTimes, FaCamera, FaSpinner, FaUserClock, FaChartBar } from 'react-icons/fa'
import CompanyModal from '@/components/CompanyModal'
import AreaModal from '@/components/AreaModal'
import CargoModal from '@/components/CargoModal'
import styles from './Members.module.css'
import { MembersTable } from '@/components/MembersTable'
import { MembersForm } from '@/components/MembersForm'
import { Member, Company, Area, Cargo } from '@/features/types/types'
import { ThemeToggle } from '@/components/ThemeToggle'


const db = getFirestore(app)







const MembersPage: NextPage = () => {
    const [members, setMembers] = useState<Member[]>([])
    const [formData, setFormData] = useState<Member>({
        nombre: '',
        dni: '',
        apellidos: '',
        empresa: '',
        area: '',
        cargo: '',
        sexo: ''
    })
    const [isEditing, setIsEditing] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // Company/Area/Cargo Management State
    const [empresas, setEmpresas] = useState<Company[]>([])
    const [areas, setAreas] = useState<Area[]>([])
    const [cargos, setCargos] = useState<Cargo[]>([])

    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
    const [isAreaModalOpen, setIsAreaModalOpen] = useState(false)
    const [isCargoModalOpen, setIsCargoModalOpen] = useState(false)

    const [isModalOpen, setIsModalOpen] = useState(false)


    useEffect(() => {
        const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const membersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Member[]
            setMembers(membersData)
            setIsLoading(false)
        })
        return () => unsubscribe()
    }, [])

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
                setFormData(prev => ({
                    ...prev,
                    [name]: numericValue
                }))
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }))
        }
    }

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            let file = e.target.files[0]

            if (file.size > 100 * 1024) { // > 100kb
                try {
                    file = await compressImage(file)
                } catch (error) {
                    console.error("Error compressing image:", error)
                    alert("No se pudo comprimir la imagen por debajo de 100kb. Intenta con otra.")
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

                // Resize if too big (max 1000px)
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
                if (!ctx) {
                    reject(new Error('Canvas context not available'))
                    return
                }
                ctx.drawImage(img, 0, 0, width, height)

                // Compress
                let quality = 0.7
                const tryCompress = () => {
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Compression failed'))
                            return
                        }
                        if (blob.size <= 100 * 1024 || quality <= 0.1) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            })
                            resolve(compressedFile)
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

            if (isEditing && editingId) {
                const docRef = doc(db, 'members', editingId)
                await updateDoc(docRef, {
                    ...formData,
                    fotoUrl,
                    updatedAt: serverTimestamp()
                })
                setIsEditing(false)
                setEditingId(null)
            } else {
                await setDoc(doc(db, 'members', formData.dni), {
                    ...formData,
                    fotoUrl,
                    createdAt: serverTimestamp()
                })
            }
            setFormData({
                nombre: '',
                dni: '',
                apellidos: '',
                empresa: '',
                area: '',
                cargo: '',
                sexo: '',
                fotoUrl: ''
            })
            setSelectedImage(null)
            setPreviewUrl(null)
            setIsModalOpen(false) // Close modal on success
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
        setIsModalOpen(true) // Open modal for editing
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
            try {
                await deleteDoc(doc(db, 'members', id))
            } catch (error) {
                console.error("Error deleting member:", error)
                alert("Error al eliminar el usuario")
            }
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
        setEditingId(null)
        setFormData({
            nombre: '',
            dni: '',
            apellidos: '',
            empresa: '',
            area: '',
            cargo: '',
            sexo: '',
            fotoUrl: ''
        })
        setSelectedImage(null)
        setPreviewUrl(null)
        setIsModalOpen(false) // Close modal on cancel
    }

    const openNewMemberModal = () => {
        handleCancel(); // Ensure form is reset
        setIsModalOpen(true);
    }

    return (
        <>
            <Head>
                <title>Registro de Usuarios - Management Gym</title>
                <meta name="description" content="Registro de usuarios del gimnasio" />
            </Head>
            <main className={styles.container}>
                <div className={styles.headerLinkContainer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/" className={styles.backLink}>
                        &larr; Volver al inicio
                    </Link>
                    <ThemeToggle />
                </div>

                <h1 className={styles.pageTitle}>Registro de Usuarios</h1>
                <div className={styles.responsiveHeader}>
                    <p className={styles.headerSubtitle}>Gestión de miembros del gimnasio</p>
                    <div className={styles.responsiveHeaderActions}>
                        <button onClick={openNewMemberModal} className={`${styles.actionButton} ${styles.btnPremium} ${styles.mobileHidden}`}>
                            <FaUserPlus /> Nuevo Miembro
                        </button>
                        <Link href="/members/access" className={`${styles.actionButton} ${styles.btnPremiumGreen}`}>
                            <FaUserClock /> Registrar Ingreso
                        </Link>
                        <Link href="/members/reports" className={`${styles.actionButton} ${styles.btnPremiumIndigo}`}>
                            <FaChartBar /> Ver Reportes
                        </Link>
                    </div>
                </div>

                {/* Floating Action Button for Mobile */}
                {/* <button
                    onClick={openNewMemberModal}
                    className={styles.fab}
                    title="Nuevo Miembro"
                >
                    <FaUserPlus size={24} />
                </button> */}

                {/* Lista de Usuarios */}
                <MembersTable
                    members={members}
                    empresas={empresas}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
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
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
                onOpenAreaModal={() => setIsAreaModalOpen(true)}
                onOpenCargoModal={() => setIsCargoModalOpen(true)}
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


export default MembersPage
