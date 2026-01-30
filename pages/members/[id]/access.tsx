import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { FaUserClock, FaArrowLeft, FaSpinner } from 'react-icons/fa'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firebase.config'
import styles from '../Access.module.css'
import { AccessModal } from '@/components/AccessModal'
import { RecentAccessFeed } from '@/components/RecentAccessFeed'
import { AmenitiesReturnList } from '@/components/AmenitiesReturnList'
import { ThemeToggle } from '@/components/ThemeToggle'


const DynamicAccessPage: NextPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [locationName, setLocationName] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const router = useRouter()
    const { id } = router.query

    useEffect(() => {
        if (!id) return

        const fetchLocation = async () => {
            try {
                setIsLoading(true)
                const locDoc = await getDoc(doc(db, 'ubicaciones', id as string))
                if (locDoc.exists()) {
                    setLocationName(locDoc.data().name)
                }
            } catch (error) {
                console.error("Error fetching location for access page:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchLocation()
    }, [id])

    if (isLoading && id) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a' }}>
                <FaSpinner className="spin" style={{ fontSize: '3rem', color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    return (
        <>
            <Head>
                <title>Control de Acceso {locationName ? `- ${locationName}` : ''} - Management Gym</title>
            </Head>
            <div className={styles.container}>
                <main className={styles.mainWrapper}>

                    <div className={styles.backLinkWrapper} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Link href={`/members/${id}`} className={styles.backLink}>
                            <FaArrowLeft /> Volver a Gestión
                        </Link>
                        <ThemeToggle />
                    </div>

                    {locationName && (
                        <div className={styles.environmentTitleContainer} style={{ textAlign: 'center', margin: '2rem 0' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#e5e7eb' }}>
                                Acceso en <span style={{ color: '#3b82f6', textTransform: 'uppercase' }}>{locationName}</span>
                            </h2>
                        </div>
                    )}

                    <div className={styles.contentGrid}>

                        {/* Search & Action Section */}
                        <div className={styles.actionSection}>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className={styles.mainActionButton}
                                title="Abrir formulario de ingreso"
                            >
                                <FaUserClock className={styles.mainActionButtonIcon} />
                                <span className={styles.mainActionButtonText}>REGISTRAR MI INGRESO</span>
                            </button>
                        </div>

                        {/* Amenities pending return */}
                        <div className={styles.amenitiesSection}>
                            <AmenitiesReturnList />
                        </div>

                        {/* Recent Access Feed */}
                        <div className={styles.feedSection}>
                            <RecentAccessFeed
                                environment={locationName || undefined}
                                locationId={id as string}
                            />
                        </div>

                    </div>
                </main>
            </div>

            <AccessModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                environment={locationName || undefined}
                locationId={id as string}
            />
        </>
    )
}

export default DynamicAccessPage
