import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { FaDumbbell, FaChartLine, FaUsers, FaArrowRight, FaPhone, FaEnvelope, FaCode } from 'react-icons/fa'
import styles from './Home.module.css'
import { ThemeToggle } from '@/components/ThemeToggle'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Management Gym | Dashboard</title>
        <meta name="description" content="Sistema de gestión profesional para gimnasios" />
      </Head>

      <div className={styles.hero}>
        <div className={styles.heroBackground} />
        <div className={styles.heroContent}>
          <div className={styles.heroTop}>
            <ThemeToggle />
          </div>
          <h1 className={styles.heroTitle}>Management Gym</h1>
          <p className={styles.heroSubtitle}>
            Potencia tu gimnasio con nuestra plataforma de gestión integral de equipos y usuarios.
          </p>
        </div>
      </div>

      <main className={styles.mainContent}>
        <div className={styles.dashboardGrid}>
          <Link href="/equipment" className={styles.card}>
            <div className={styles.cardIcon}>
              <FaDumbbell />
            </div>
            <div className={styles.cardInfo}>
              <h3 className={styles.cardLabel}>Gestión de Equipos</h3>
              <p className={styles.cardDescription}>
                Control total de inventario, mantenimiento y estado de tus máquinas de entrenamiento.
              </p>
            </div>
            <div className={styles.cardFooter}>
              Ir a Equipos <FaArrowRight />
            </div>
          </Link>

          <Link href="/reportes-maquinas" className={styles.card}>
            <div className={styles.cardIcon}>
              <FaChartLine />
            </div>
            <div className={styles.cardInfo}>
              <h3 className={styles.cardLabel}>Reportes y Análisis</h3>
              <p className={styles.cardDescription}>
                Visualiza el rendimiento de tu equipamiento con analíticas avanzadas y exportación de datos.
              </p>
            </div>
            <div className={styles.cardFooter}>
              Ver Reportes <FaArrowRight />
            </div>
          </Link>

          <Link href="/members" className={styles.card}>
            <div className={styles.cardIcon}>
              <FaUsers />
            </div>
            <div className={styles.cardInfo}>
              <h3 className={styles.cardLabel}>Comunidad y Usuarios</h3>
              <p className={styles.cardDescription}>
                Gestiona el acceso de tus miembros y mantén un registro actualizado de la actividad en tu sede.
              </p>
            </div>
            <div className={styles.cardFooter}>
              Gestionar Usuarios <FaArrowRight />
            </div>
          </Link>
        </div>
      </main>

      {/* <footer className={styles.footer}>
        <div className={styles.footerDivider} />
        <div className={styles.footerContent}>
          <div className={styles.developerInfo}>
            <div className={styles.devHeader}>
              <img src="/perfil-photo.png" alt="Franco Ernesto Condori Huaraya" className={styles.devPhoto} />
              <div>
                <div className={styles.devBadge}>
                  <FaCode className={styles.devIcon} />
                  <span>Developer Details</span>
                </div>
                <h4 className={styles.developerName}>Franco Ernesto Condori Huaraya</h4>
                <p className={styles.footerTagline}>Desarrollador de software </p>
              </div>
            </div>
          </div>

          <div className={styles.contactGrid}>
            <a href="tel:982752688" className={styles.contactItem}>
              <FaPhone className={styles.contactIcon} />
              <span>982752688</span>
            </a>
            <a href="mailto:frecodev.1992@gmail.com" className={styles.contactItem}>
              <FaEnvelope className={styles.contactIcon} />
              <span>frecodev.1992@gmail.com</span>
            </a>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} Management Gym. Desarrollado con ❤️.</p>
        </div>
      </footer> */}
    </div>
  )
}

export default Home
