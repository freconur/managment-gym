import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FaUserClock, FaArrowLeft } from 'react-icons/fa'
import styles from './Access.module.css'
import { AccessModal } from '@/components/AccessModal'
import { RecentAccessFeed } from '@/components/RecentAccessFeed'
import { AmenitiesReturnList } from '@/components/AmenitiesReturnList'
import { ThemeToggle } from '@/components/ThemeToggle'

const AccessPage: NextPage = () => {
	const [isModalOpen, setIsModalOpen] = useState(false)

	const router = useRouter()
	const { environment } = router.query

	return (
		<>
			<Head>
				<title>Control de Acceso - Management Gym</title>
			</Head>
			<div className={styles.container}>
				<main className={styles.mainWrapper}>

					<div className={styles.backLinkWrapper} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<Link href="/members" className={styles.backLink}>
							<FaArrowLeft /> Volver a Miembros
						</Link>
						<ThemeToggle />
					</div>

					{environment && (
						<div className={styles.environmentTitleContainer} style={{ textAlign: 'center', margin: '2rem 0' }}>
							<h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#e5e7eb' }}>
								Te encuentras en <span style={{ color: '#3b82f6', textTransform: 'uppercase' }}>{environment}</span>
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
							<RecentAccessFeed environment={typeof environment === 'string' ? environment : undefined} />
						</div>

					</div>
				</main>
			</div>

			<AccessModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				environment={typeof environment === 'string' ? environment : undefined}
			/>
		</>
	)
}

export default AccessPage
