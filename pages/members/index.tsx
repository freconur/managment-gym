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
import styles from './Members.module.css'


const db = getFirestore(app)


interface Member {
    id?: string;
    nombre: string;
    dni: string;
    apellidos: string;
    empresa: string;
    sexo: string;
    fotoUrl?: string;
    createdAt?: any;
}

interface Company {
    id: string;
    nombre: string;
    createdAt?: any;
}


const MembersPage: NextPage = () => {
    const [members, setMembers] = useState<Member[]>([])
    const [formData, setFormData] = useState<Member>({
        nombre: '',
        dni: '',
        apellidos: '',
        empresa: '',
        sexo: ''
    })
    const [isEditing, setIsEditing] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // Company Management State
    const [empresas, setEmpresas] = useState<Company[]>([])
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)


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
                sexo: '',
                fotoUrl: ''
            })
            setSelectedImage(null)
            setPreviewUrl(null)
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
            sexo: member.sexo || '',
            fotoUrl: member.fotoUrl
        })
        setPreviewUrl(member.fotoUrl || null)
        setIsEditing(true)
        setEditingId(member.id)
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
            sexo: '',
            fotoUrl: ''
        })
        setSelectedImage(null)
        setPreviewUrl(null)
    }

    return (
        <>
            <Head>
                <title>Registro de Usuarios - Management Gym</title>
                <meta name="description" content="Registro de usuarios del gimnasio" />
            </Head>
            <main className={styles.container}>
                <div className={styles.headerLinkContainer}>
                    <Link href="/" className={styles.backLink}>
                        &larr; Volver al inicio
                    </Link>
                </div>

                <h1 className={styles.pageTitle}>Registro de Usuarios</h1>
                <div className={styles.responsiveHeader}>
                    <p className={styles.headerSubtitle}>Gestión de miembros del gimnasio</p>
                    <div className={styles.responsiveHeaderActions}>
                        <Link href="/members/access" className={`${styles.actionButton} ${styles.btnGreen}`}>
                            <FaUserClock /> Registrar Ingreso
                        </Link>
                        <Link href="/members/reports" className={`${styles.actionButton} ${styles.btnIndigo}`}>
                            <FaChartBar /> Ver Reportes
                        </Link>
                    </div>
                </div>

                <div className={styles.responsiveGrid}>
                    {/* Formulario */}
                    <div className={styles.formContainer}>
                        <h2 className={styles.formTitle}>
                            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                        </h2>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div>
                                <label htmlFor="dni" className={styles.label}>DNI</label>
                                <input
                                    type="text"
                                    id="dni"
                                    name="dni"
                                    value={formData.dni}
                                    onChange={handleInputChange}
                                    required
                                    className={styles.input}
                                />
                            </div>

                            <div>
                                <label className={styles.label}>Foto</label>
                                <div className={styles.photoUploadContainer}>
                                    {previewUrl && (
                                        <NextImage
                                            src={previewUrl}
                                            alt="Vista previa"
                                            width={48}
                                            height={48}
                                            className={styles.previewImage}
                                            loading="lazy"
                                        />
                                    )}
                                    <label className={styles.uploadLabel}>
                                        <FaCamera />
                                        <span>Seleccionar o tomar foto</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleImageChange}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>
                                <p className={styles.uploadHelpText}>Máximo 100kb</p>
                            </div>

                            <div>
                                <label htmlFor="nombre" className={styles.label}>Nombre</label>
                                <input
                                    type="text"
                                    id="nombre"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    required
                                    className={styles.input}
                                />
                            </div>
                            <div>
                                <label htmlFor="apellidos" className={styles.label}>Apellidos</label>
                                <input
                                    type="text"
                                    id="apellidos"
                                    name="apellidos"
                                    value={formData.apellidos}
                                    onChange={handleInputChange}
                                    required
                                    className={styles.input}
                                />
                            </div>
                            <div>
                                <label htmlFor="empresa" className={styles.label}>Empresa</label>
                                <div className={styles.companySelectGroup}>
                                    <select
                                        id="empresa"
                                        name="empresa"
                                        value={formData.empresa}
                                        onChange={handleInputChange}
                                        required
                                        className={`${styles.input} ${styles.companyInput}`}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {empresas.map((emp) => (
                                            <option key={emp.id} value={emp.nombre}>{emp.nombre}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsCompanyModalOpen(true)}
                                        className={styles.manageCompanyBtn}
                                        title="Gestionar Empresas"
                                    >
                                        <FaEdit />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="sexo" className={styles.label}>Sexo</label>
                                <select
                                    id="sexo"
                                    name="sexo"
                                    value={formData.sexo}
                                    onChange={handleInputChange}
                                    required
                                    className={styles.input}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Hombre">Hombre</option>
                                    <option value="Mujer">Mujer</option>
                                </select>
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="submit"
                                    className={`${styles.submitButton} ${isEditing ? styles.submitBtnAmber : styles.submitBtnBlue} ${isSubmitting ? styles.submitBtnDisabled : ''}`}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <FaSpinner className={styles.spinAnimation} />
                                            {isEditing ? 'Actualizando...' : 'Guardando...'}
                                        </>
                                    ) : (
                                        <>
                                            {isEditing ? <FaSave /> : <FaUserPlus />}
                                            {isEditing ? 'Actualizar' : 'Agregar'}
                                        </>
                                    )}
                                </button>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className={styles.cancelButton}
                                        title="Cancelar"
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Lista de Usuarios */}
                    <div className={styles.tableContainer}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead className={styles.thead}>
                                    <tr>
                                        <th className={styles.th}>Foto</th>
                                        <th className={styles.th}>DNI</th>
                                        <th className={styles.th}>Nombre Completo</th>
                                        <th className={styles.th}>Sexo</th>
                                        <th className={styles.th}>Empresa</th>
                                        <th className={`${styles.th} ${styles.tdActions}`}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className={styles.emptyState}>Cargando usuarios...</td>
                                        </tr>
                                    ) : members.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className={styles.emptyState}>No hay usuarios registrados.</td>
                                        </tr>
                                    ) : (
                                        members.map((member) => (
                                            <tr key={member.id} className={styles.tr}>
                                                <td className={styles.td}>
                                                    {member.fotoUrl ? (
                                                        <NextImage
                                                            src={member.fotoUrl}
                                                            alt={member.nombre}
                                                            width={40}
                                                            height={40}
                                                            className={styles.previewImage}
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className={styles.avatarPlaceholder}>
                                                            N/A
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`${styles.td} ${styles.tdDni}`}>{member.dni}</td>
                                                <td className={`${styles.td} ${styles.tdName}`}>{member.nombre} {member.apellidos}</td>
                                                <td className={`${styles.td} ${styles.tdSex}`}>{member.sexo}</td>
                                                <td className={`${styles.td} ${styles.tdCompany}`}>{member.empresa}</td>
                                                <td className={`${styles.td} ${styles.tdActions}`}>
                                                    <div className={styles.actionButtonsContainer}>
                                                        <button
                                                            onClick={() => handleEdit(member)}
                                                            className={styles.editButton}
                                                            title="Editar"
                                                        >
                                                            <FaEdit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => member.id && handleDelete(member.id)}
                                                            className={styles.deleteButton}
                                                            title="Eliminar"
                                                        >
                                                            <FaTrash size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <CompanyModal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                db={db}
            />
        </>
    )
}


export default MembersPage
