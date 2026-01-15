import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { FaUserClock, FaArrowLeft } from 'react-icons/fa'
import styles from './Access.module.css'
import { AccessModal } from '@/components/AccessModal'
import { RecentAccessFeed } from '@/components/RecentAccessFeed'
import { AmenitiesReturnList } from '@/components/AmenitiesReturnList'

const AccessPage: NextPage = () => {
	const [isModalOpen, setIsModalOpen] = useState(false)

	return (
		<>
			<Head>
				<title>Control de Acceso - Management Gym</title>
			</Head>
			<div className={styles.container}>
				<main className={styles.mainWrapper}>

					<div className={styles.backLinkWrapper}>
						<Link href="/members" className={styles.backLink}>
							<FaArrowLeft /> Volver a Miembros
						</Link>
					</div>

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
							<RecentAccessFeed />
						</div>

					</div>
				</main>
			</div>

			<AccessModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</>
	)
}

export default AccessPage
