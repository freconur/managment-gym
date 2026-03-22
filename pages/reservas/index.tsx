import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect, useMemo, useRef } from 'react'
import { FaArrowLeft, FaCog, FaMapMarkerAlt, FaCheck, FaPlus, FaTrash, FaCalendarAlt, FaWhatsapp, FaSignOutAlt, FaBuilding, FaClock, FaTimes, FaIdCard, FaUser, FaChartBar, FaEnvelope, FaPhone } from 'react-icons/fa'
import { HiOutlineMapPin, HiOutlineCalendarDays, HiOutlineClock, HiOutlineSquare3Stack3D } from 'react-icons/hi2'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/features/context/AuthContext'
import { useManagment } from '@/features/hooks/useManagment'
import { db } from '@/firebase/firebase.config'
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore'
import styles from './Reservas.module.css'

const getPeruDate = (offsetDays = 0) => {
	const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }))
	d.setHours(0, 0, 0, 0)
	if (offsetDays !== 0) {
		d.setDate(d.getDate() + offsetDays)
	}
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Lima',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(d);
}

const getNextDays = (count: number) => {
	const days = []
	// Basado en el requerimiento: los clientes solo ven desde MAÑANA (+1 offset)
	const startDateStr = getPeruDate(1)
	const start = new Date(startDateStr + 'T00:00:00')

	for (let i = 0; i < count; i++) {
		const d = new Date(start)
		d.setDate(start.getDate() + i)
		days.push(new Intl.DateTimeFormat('en-CA', {
			timeZone: 'America/Lima',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(d))
	}
	return days
}

const Reservas: NextPage = () => {
	const router = useRouter()
	const { userProfile, loading, logout } = useAuth()
	const { getUbicaciones, ubicaciones, loadingUbicaciones } = useManagment()
	const URL_API_WHATSAPP = 'https://whatsapp-builderbot-production.up.railway.app/v1/messages'
	const [selectedUbicacionId, setSelectedUbicacionId] = useState<string | null>(null)
	const [selectedSubEnvironmentId, setSelectedSubEnvironmentId] = useState<string | null>(null)
	const [selectedSubEnvironmentName, setSelectedSubEnvironmentName] = useState<string | null>(null)
	const [selectedDate, setSelectedDate] = useState<string | null>(null)
	const [localDateOverrides, setLocalDateOverrides] = useState<Record<string, any>>({})

	const [selectedSlotData, setSelectedSlotData] = useState<{ time: string, endTime: string, subId: string | null, subName: string | null } | null>(null)
	const [occupiedSlots, setOccupiedSlots] = useState<Record<string, string[]>>({}) // { "YYYY-MM-DD": ["10:00", ...]}
	const [globalActiveOverrides, setGlobalActiveOverrides] = useState<any[]>([])

	const mainContentRef = useRef<HTMLElement>(null)
	const timeContainerRef = useRef<HTMLDivElement>(null)
	const summaryPanelRef = useRef<HTMLDivElement>(null)

	// Estado para el modal de solicitud
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isSearchingDNI, setIsSearchingDNI] = useState(false)
	const [customerData, setCustomerData] = useState({
		dni: '',
		name: '',
		email: '',
		phone: '',
		company: '',
		companyId: ''
	})
	const [dniExists, setDniExists] = useState(false)
	const [companySuggestions, setCompanySuggestions] = useState<any[]>([])
	const [showCompanySuggestions, setShowCompanySuggestions] = useState(false)
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	useEffect(() => {
		const searchDNI = async () => {
			if (customerData.dni.length === 8 && selectedUbicacionId) {
				setIsSearchingDNI(true)
				try {
					const docRef = doc(db, 'ubicaciones', selectedUbicacionId, 'members', customerData.dni)
					const docSnap = await getDoc(docRef)
					if (docSnap.exists()) {
						const data = docSnap.data()
						setDniExists(true)

						let initialCompanyId = ''
						if (data.empresa) {
							try {
								const q = query(collection(db, 'empresas'), where('nombre', '==', data.empresa.toUpperCase()))
								const snap = await getDocs(q)
								if (!snap.empty) {
									initialCompanyId = snap.docs[0].id
								}
							} catch (e) {
								console.error("Error auto-validating company:", e)
							}
						}

						setCustomerData(prev => ({
							...prev,
							name: `${data.nombre || ''} ${data.apellidos || ''}`.trim(),
							phone: data.celular || data.telefono || prev.phone,
							company: data.empresa || '',
							companyId: initialCompanyId
						}))
					} else {
						setDniExists(false)
					}
				} catch (error) {
					console.error("Error al buscar miembro por DNI:", error)
					setDniExists(false)
				} finally {
					setIsSearchingDNI(false)
				}
			} else {
				setDniExists(false)
			}
		}

		searchDNI()
	}, [customerData.dni, selectedUbicacionId])

	// Effect for Company Autocomplete with Debouncing
	useEffect(() => {
		// Solo buscamos empresas si el DNI NO fue encontrado (dniExists === false)
		if (customerData.companyId || !customerData.company.trim() || customerData.company.length < 2) {
			setCompanySuggestions([])
			setShowCompanySuggestions(false)
			return
		}

		const delayDebounceFn = setTimeout(async () => {
			try {
				const term = customerData.company.toLowerCase()
				const q = query(
					collection(db, 'empresas'),
					where('nombre', '>=', term),
					where('nombre', '<=', term + '\uf8ff')
				)
				const querySnapshot = await getDocs(q)
				const suggestions = querySnapshot.docs.map((doc: any) => ({
					id: doc.id,
					...doc.data()
				}))
				setCompanySuggestions(suggestions)
				setShowCompanySuggestions(suggestions.length > 0)
			} catch (error) {
				console.error("Error searching companies:", error)
			}
		}, 500)

		return () => clearTimeout(delayDebounceFn)
	}, [customerData.company, dniExists])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitSuccess, setSubmitSuccess] = useState(false)

	useEffect(() => {
		const unsubscribe = getUbicaciones()
		return () => unsubscribe()
	}, [getUbicaciones])

	// Fetch occupied slots from tomorrow onwards for the selected location (All areas)
	useEffect(() => {
		if (!selectedUbicacionId) {
			setOccupiedSlots({})
			return
		}

		const tomorrowStr = getPeruDate(1)
		const q = query(
			collection(db, 'solicitudes_reserva'),
			where('locationId', '==', selectedUbicacionId),
			where('date', '>=', tomorrowStr),
			where('status', '==', 'confirmada')
		)

		const unsubscribeOccupied = onSnapshot(q, (snapshot) => {
			const occupied: Record<string, string[]> = {}
			snapshot.docs.forEach(doc => {
				const data = doc.data()
				const key = `${data.date}_${data.subEnvironmentId || 'all'}`
				if (!occupied[key]) occupied[key] = []
				occupied[key].push(data.slot)
			})
			setOccupiedSlots(occupied)
		})

		return () => {
			unsubscribeOccupied()
		}
	}, [selectedUbicacionId])

	// Listener para los Date Overrides de la fecha actual
	useEffect(() => {
		if (!selectedUbicacionId) {
			setLocalDateOverrides({})
			return
		}

		const q = query(
			collection(db, 'reservation_date_overrides'),
			where('locationId', '==', selectedUbicacionId)
		)

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const overridesObj: Record<string, any> = {}
			snapshot.docs.forEach(docSnap => {
				const data = docSnap.data()
				if (data.status === 'closed') return // Omitir configuraciones finalizadas

				const key = data.subId === 'all' ? data.date : `${data.date}_${data.subId}`
				overridesObj[key] = {
					enabled: data.enabled,
					maxCapacity: data.maxCapacity,
					intervals: data.intervals
				}
			})
			setLocalDateOverrides(overridesObj)
		}, (error) => {
			console.error("Error fetching date overrides:", error)
		})

		return () => unsubscribe()
	}, [selectedUbicacionId])

	// Global listener for ALL active overrides (to decide which locations show in the entry modal)
	useEffect(() => {
		const q = query(
			collection(db, 'reservation_date_overrides'),
			where('status', '==', 'active'),
			where('enabled', '==', true)
		)

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const today = getPeruDate()
			const activeList = snapshot.docs
				.map(d => ({ id: d.id, ...d.data() }))
				.filter((over: any) => over.date >= today)
			setGlobalActiveOverrides(activeList)
		})

		return () => unsubscribe()
	}, [])

	// New active locations derivation based on overrides
	const activeUbicaciones = useMemo(() => {
		const locationIdsWithOverrides = new Set(globalActiveOverrides.map(o => o.locationId))
		return (ubicaciones as any[]).filter(u => locationIdsWithOverrides.has(u.id))
	}, [ubicaciones, globalActiveOverrides])

	const selectedUbicacion = activeUbicaciones.find(u => u.id === selectedUbicacionId)

	useEffect(() => {
		if (selectedUbicacion) {
			const config = (selectedUbicacion as any).reservationConfig

			// Si ya hay un sub-ambiente seleccionado, verificamos que siga teniendo cupos para la fecha (si no, deseleccionar)
			if (selectedUbicacion.haveSubEnvironments && selectedSubEnvironmentId && selectedDate) {
				const slots = generateSlots(config, selectedDate, selectedSubEnvironmentId)
				if (slots.length === 0) {
					setSelectedSubEnvironmentId(null)
					setSelectedSubEnvironmentName(null)
				}
			}
		}
	}, [selectedUbicacionId, selectedUbicacion, selectedSubEnvironmentId, selectedDate, localDateOverrides])

	// Generar slots base (sin filtrar de ocupados)
	const generateSlots = (config: any, dateStr: string | null, subId?: string | null) => {
		if (!config || !dateStr) return []
		let dateOverride = subId ? localDateOverrides[`${dateStr}_${subId}`] : null
		if (!dateOverride) {
			dateOverride = localDateOverrides[dateStr]
		}

		if (dateOverride) {
			if (!dateOverride.enabled) return []
		} else {
			// Discarding old logic: If no override exists, no slots are shown for this date/area.
			return []
		}

		const effectiveIntervals = dateOverride ? dateOverride.intervals : config.intervals
		const duration = config.slotDuration

		const slots: { time: string, endTime: string }[] = []
		effectiveIntervals.forEach((interval: { start: string, end: string }) => {
			const [startH, startM] = interval.start.split(':').map(Number)
			const [endH, endM] = interval.end.split(':').map(Number)
			let currentMinutes = startH * 60 + startM
			const endMinutes = endH * 60 + endM

			while (currentMinutes + duration <= endMinutes) {
				const h = Math.floor(currentMinutes / 60)
				const m = currentMinutes % 60
				const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
				const slotEndMinutes = currentMinutes + duration
				const slotEndH = Math.floor(slotEndMinutes / 60)
				const slotEndM = slotEndMinutes % 60
				const endTime = `${slotEndH.toString().padStart(2, '0')}:${slotEndM.toString().padStart(2, '0')}`
				slots.push({ time: timeStr, endTime })
				currentMinutes += duration
			}
		})
		return slots
	}

	// Slots disponibles (filtrados y agregados)
	const availableSlots = useMemo(() => {
		if (!selectedUbicacion || !selectedDate) return []
		const config = (selectedUbicacion as any).reservationConfig

		const getSlotsForArea = (subId: string | null, subName: string | null) => {
			const baseSlots = generateSlots(config, selectedDate, subId)
			const occupiedKey = `${selectedDate}_${subId || 'all'}`
			const occupied = occupiedSlots[occupiedKey] || []

			return baseSlots
				.map(slot => {
					return {
						time: slot.time,
						endTime: slot.endTime,
						subId,
						subName
					}
				})
		}

		if (!selectedUbicacion.haveSubEnvironments) {
			return getSlotsForArea(null, null)
		}

		if (selectedSubEnvironmentId) {
			return getSlotsForArea(selectedSubEnvironmentId, selectedSubEnvironmentName)
		}

		// Vista agregada (Todos)
		let all: any[] = []
			; (selectedUbicacion as any).subEnvironments?.forEach((se: any) => {
				all = [...all, ...getSlotsForArea(se.id, se.nombre)]
			})
		return all.sort((a, b) => a.time.localeCompare(b.time))
	}, [selectedUbicacion, selectedDate, selectedSubEnvironmentId, occupiedSlots, selectedSubEnvironmentName, localDateOverrides])


	const handleSubmitRequest = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!selectedUbicacion || !selectedSlotData) return

		setIsSubmitting(true)
		try {
			const reservationData = {
				userDni: customerData.dni,
				userName: customerData.name.toLowerCase(),
				userEmail: customerData.email.toLowerCase(),
				userPhone: customerData.phone,
				companyName: customerData.company.toLowerCase(),
				companyId: customerData.companyId,
				locationId: selectedUbicacionId,
				locationName: (selectedUbicacion as any).name.toLowerCase(),
				subEnvironmentId: selectedSlotData.subId,
				subEnvironmentName: selectedSlotData.subName ? selectedSlotData.subName.toLowerCase() : null,
				date: selectedDate,
				slot: selectedSlotData.time,
				endTime: selectedSlotData.endTime,
				status: 'pendiente',
				createdAt: serverTimestamp()
			}

			await addDoc(collection(db, 'solicitudes_reserva'), reservationData)

			// WhatsApp Notification
			if (customerData.phone) {
				try {
					const dateObj = new Date(selectedDate + 'T00:00:00')
					const dayName = new Intl.DateTimeFormat('es-PE', { weekday: 'long' }).format(dateObj)
					const dayNum = dateObj.getDate()
					const monthName = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(dateObj)

					// Format Time (e.g. 18:00 to 6PM)
					const [h, m] = selectedSlotData.time.split(':').map(Number)
					const ampm = h >= 12 ? 'PM' : 'AM'
					const h12 = h % 12 || 12
					const timeFormatted = `${h12}${m !== 0 ? ':' + m.toString().padStart(2, '0') : ''}${ampm}`

					const message = `${customerData.dni} - ${customerData.name} ha solicitado una reserva para ${(selectedUbicacion as any).name}${selectedSlotData.subName ? ' ' + selectedSlotData.subName : ''} para el dia ${dayName} ${dayNum} de ${monthName} a las ${timeFormatted}.`

					await fetch(URL_API_WHATSAPP, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							number: `51${customerData.phone}`,
							message: message
						})
					})
				} catch (wsError) {
					console.error("Error sending WhatsApp message:", wsError)
				}
			}

			setSubmitSuccess(true)
			setTimeout(() => {
				setIsModalOpen(false)
				setSubmitSuccess(false)
				setSelectedSlotData(null)
			}, 3000)
		} catch (error) {
			console.error("Error al enviar solicitud:", error)
			alert("Hubo un error al enviar tu solicitud. Por favor intenta de nuevo.")
		} finally {
			setIsSubmitting(false)
		}
	}

	const getAreaColor = (name: string | null) => {
		if (!name) return 'var(--color-generic)';
		const n = name.toLowerCase();
		if (n.includes('gym')) return 'var(--color-gym)';
		if (n.includes('tennis')) return 'var(--color-tennis)';
		if (n.includes('poli')) return 'var(--color-polideportivo)';
		if (n.includes('campo')) return 'var(--color-campo)';
		if (n.includes('pisci')) return 'var(--color-piscina)';
		return 'var(--color-generic)';
	}

	return (
		<div className={styles.container}>
			<Head>
				<title>Reservas | Management Gym</title>
				<meta name="description" content="Gestiona tus reservas en el gimnasio" />
			</Head>

			<header className={styles.header}>
				<div className={styles.headerInner}>
					<div className={styles.headerTopRow}>
						<div className={styles.titleGroup}>
							{userProfile && (
								<button
									onClick={() => router.push('/')}
									className={styles.backButton}
									title="Volver al Inicio"
								>
									<FaArrowLeft />
								</button>
							)}
							<div className={styles.titleContainer}>
								<h1 className={styles.title}>Reservas</h1>
								<p className={styles.subtitle}>Solicita tus reservas para las areas recreativas</p>
							</div>
						</div>
						<ThemeToggle />
					</div>

					<div className={styles.headerActions}>
						{!loading && userProfile?.role === 'admin' && (
							<>
								{/* Desktop Actions */}
								<div className={styles.desktopActions}>
									<button
										onClick={() => router.push('/reservas/admin')}
										className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
										title="Ver Solicitudes de Clientes"
									>
										<FaCalendarAlt size={16} /> Solicitudes
									</button>
									<button
										onClick={() => router.push('/reservas/config')}
										className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
										title="Configuración de Reservas"
									>
										<FaCog size={16} /> Configurar
									</button>
									<button
										onClick={() => router.push('/reservas/reportes')}
										className={`${styles.actionButton} ${styles.actionButtonInfo}`}
										title="Ver Reportes de Reservas"
									>
										<FaChartBar size={16} /> Reportes
									</button>
									<button
										onClick={logout}
										className={`${styles.actionButton} ${styles.actionButtonDanger}`}
										title="Cerrar Sesión"
									>
										<FaSignOutAlt size={16} /> Salir
									</button>
								</div>

								{/* Mobile Actions Dropdown */}
								<div className={styles.mobileActions}>
									<button
										onClick={() => setIsMenuOpen(!isMenuOpen)}
										className={`${styles.actionButton} ${styles.mobileMenuBtn} ${isMenuOpen ? styles.mobileMenuBtnActive : ''}`}
									>
										<HiOutlineSquare3Stack3D size={20} />
										<span>Opciones</span>
									</button>

									{isMenuOpen && (
										<>
											<div className={styles.menuOverlay} onClick={() => setIsMenuOpen(false)} />
											<div className={styles.menuDropdown}>
												<button
													onClick={() => { router.push('/reservas/admin'); setIsMenuOpen(false); }}
													className={styles.menuItem}
												>
													<FaCalendarAlt className={styles.menuIconPrimary} />
													<span>Solicitudes</span>
												</button>
												<button
													onClick={() => { router.push('/reservas/config'); setIsMenuOpen(false); }}
													className={styles.menuItem}
												>
													<FaCog className={styles.menuIconSecondary} />
													<span>Configurar</span>
												</button>
												<button
													onClick={() => { router.push('/reservas/reportes'); setIsMenuOpen(false); }}
													className={styles.menuItem}
												>
													<FaChartBar className={styles.menuIconInfo} />
													<span>Reportes</span>
												</button>
												<div className={styles.menuDivider} />
												<button
													onClick={() => { logout(); setIsMenuOpen(false); }}
													className={`${styles.menuItem} ${styles.menuItemDanger}`}
												>
													<FaSignOutAlt />
													<span>Cerrar Sesión</span>
												</button>
											</div>
										</>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			</header>

			<main className={styles.mainContent}>
				<div className={styles.layoutGrid}>
					{/* Sección Principal (Full Width ahora) */}
					<section className={styles.mainSection} ref={mainContentRef}>
						{!selectedUbicacionId ? null : (
							<div style={{ animation: 'fadeIn 0.5s ease-out' }}>
								<div className={styles.mainContentHeader}>
									<div>
										<div className={styles.locationTitleGroup}>
											<h2 className={styles.locationName}>{selectedUbicacion?.name}</h2>
											<button
												onClick={() => {
													setSelectedUbicacionId(null)
													setSelectedSlotData(null)
													setSelectedSubEnvironmentId(null)
												}}
												className={styles.changeLocationBtn}
											>
												<HiOutlineMapPin size={14} /> Cambiar ambiente
											</button>
										</div>
										<p className={styles.sectionSubtitle}>Selecciona una fecha para tu reserva.</p>
									</div>
								</div>

								{selectedUbicacion?.haveSubEnvironments && (selectedUbicacion as any).subEnvironments?.length > 0 && (
									<div className={styles.filterSection}>
										<h3 className={styles.filterTitle}>
											<HiOutlineSquare3Stack3D size={18} /> Ambiente
										</h3>
										<div className={styles.filterOptions}>
											<button
												onClick={() => {
													setSelectedSubEnvironmentId(null)
													setSelectedSubEnvironmentName(null)
													setSelectedSlotData(null)
												}}
												className={`${styles.filterBtn} ${selectedSubEnvironmentId === null ? styles.filterBtnActive : ''}`}
											>
												Todos
											</button>
											{(selectedUbicacion as any).subEnvironments
												.filter((se: any) => generateSlots((selectedUbicacion as any).reservationConfig, selectedDate, se.id).length > 0)
												.map((se: any) => (
													<button
														key={se.id}
														onClick={() => {
															setSelectedSubEnvironmentId(se.id)
															setSelectedSubEnvironmentName(se.nombre)
															setSelectedSlotData(null)
														}}
														className={`${styles.filterBtn} ${selectedSubEnvironmentId === se.id ? styles.filterBtnActive : ''}`}
													>
														{se.nombre}
													</button>
												))}
										</div>
									</div>
								)}

								{!selectedDate && (
									<div className={styles.coachMark}>
										<div className={styles.coachMarkIcon}>1</div>
										<p className={styles.coachMarkText}>
											Paso 1: <span className={styles.coachMarkSubtext}>Selecciona la fecha para tu reserva</span>
										</p>
									</div>
								)}

								<div className={styles.filterSectionNoBorder}>
									<div className={styles.dateSectionHeader}>
										<h3 className={styles.dateSectionTitle}>
											<HiOutlineCalendarDays size={20} /> Fecha
										</h3>
										<p className={styles.dateSectionInfo}>Próximos 30 días</p>
									</div>

									<div className={styles.dateGrid}>
										{getNextDays(30).map(dateStr => {
											const config = (selectedUbicacion as any).reservationConfig

											const hasSlots = selectedUbicacion?.haveSubEnvironments && (selectedUbicacion as any).subEnvironments?.length > 0
												? (selectedUbicacion as any).subEnvironments.some((se: any) => generateSlots(config, dateStr, se.id).length > 0)
												: generateSlots(config, dateStr, null).length > 0

											if (!hasSlots) return null

											const d = new Date(dateStr + 'T00:00:00')
											const dayName = new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(d)
											const dayNum = d.getDate()
											const monthName = new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(d)
											const isSelected = selectedDate === dateStr

											return (
												<button
													key={dateStr}
													onClick={() => {
														setSelectedDate(dateStr)
														setSelectedSlotData(null)
														if (window.innerWidth <= 768) {
															setTimeout(() => {
																timeContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
															}, 150)
														}
													}}
													className={`${styles.dateCard} ${isSelected ? styles.dateCardSelected : ''}`}
												>
													<span className={styles.dateDayName}>
														{dayName}
													</span>
													<span className={styles.dateDayNum}>
														{dayNum}
													</span>
													<span className={styles.dateMonthName}>
														{monthName}
													</span>
												</button>
											)
										})}
									</div>
								</div>


								{selectedDate && (
									<div className={`${styles.filterSectionNoBorder} ${styles.revealSection}`} ref={timeContainerRef}>
										{!selectedSlotData && (
											<div className={styles.coachMark}>
												<div className={styles.coachMarkIcon}>2</div>
												<p className={styles.coachMarkText}>
													Paso 2: <span className={styles.coachMarkSubtext}>Escoge un horario de los disponibles</span>
												</p>
											</div>
										)}
										<h3 className={styles.timeSectionTitle}>
											<HiOutlineClock size={20} /> Horarios disponibles • {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
										</h3>

										{availableSlots.length === 0 ? (
											<div className={styles.emptyState}>
												<HiOutlineClock size={32} className={styles.emptyStateIcon} />
												<p>No hay turnos programados para hoy.</p>
											</div>
										) : (
											<div className={styles.slotsGrid}>
												{availableSlots.map((slot: any, idx: number) => {
													const isOccupied = occupiedSlots[`${selectedDate}_${slot.subId || 'all'}`]?.includes(slot.time);
													const isSelected = selectedSlotData?.time === slot.time && selectedSlotData?.subId === slot.subId;
													const areaColor = getAreaColor(slot.subName);

													return (
														<button
															key={`${slot.time}_${slot.subId || idx}`}
															disabled={isOccupied}
															onClick={() => {
																setSelectedSlotData(slot)
																if (window.innerWidth <= 768) {
																	setTimeout(() => {
																		summaryPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
																	}, 150)
																}
															}}
															className={`${styles.slotModern} ${isSelected ? styles.slotModernSelected : ''} ${isOccupied ? styles.slotOccupied : ''}`}
															style={{ '--dynamic-color': areaColor } as React.CSSProperties}
														>
															<span className={styles.slotModernTime}>
																<HiOutlineClock size={16} style={{ opacity: isSelected ? 1 : 0.5 }} />
																{slot.time} - {slot.endTime}
															</span>

															<div className={styles.slotModernRight}>
																{isOccupied ? (
																	<span className={styles.slotModernOccupied}>OCUPADO</span>
																) : slot.subName ? (
																	<span className={styles.slotModernBadge}>
																		{slot.subName}
																	</span>
																) : (
																	<span className={`${styles.slotModernBadge} ${styles.slotBadgeAvailable}`}>
																		LIBRE
																	</span>
																)}
															</div>
														</button>
													)
												})}
											</div>
										)}
									</div>
								)}

								{selectedSlotData && (
									<div className={styles.summaryPanel} ref={summaryPanelRef}>
										<div className={styles.coachMark} style={{ marginBottom: '1rem', width: '100%', border: 'none', background: 'rgba(255,255,255,0.05)', boxShadow: 'none' }}>
											<div className={styles.coachMarkIcon}>3</div>
											<p className={styles.coachMarkText}>
												Paso 3: <span className={styles.coachMarkSubtext}>Confirma tu reserva y completa tus datos en el formulario</span>
											</p>
										</div>
										<div className={styles.summaryInfo}>
											<h4 className={styles.summaryTitle}>Selección</h4>
											<div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
												<p className={styles.summaryDetails}>
													<HiOutlineMapPin className={styles.summaryDetailIcon} />
													<span>{selectedUbicacion?.name} {selectedSlotData.subName ? `• ${selectedSlotData.subName}` : ''}</span>
												</p>
												<p className={styles.summaryDetails}>
													<HiOutlineCalendarDays className={styles.summaryDetailIcon} />
													<span>
														{new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} • {selectedSlotData.time}
													</span>
												</p>
											</div>
										</div>
										<button
											onClick={() => setIsModalOpen(true)}
											className={styles.submitButton}
										>
											<FaCheck /> Confirmar
										</button>
									</div>
								)}
							</div>
						)}
					</section>
				</div>
			</main>

			{/* Loader de Ubicaciones */}
			{loadingUbicaciones && (
				<div className={styles.loaderOverlay}>
					<div className={styles.spinner}></div>
					<p className={styles.loaderText}>Cargando locales...</p>
				</div>
			)}

			{/* Modal de Selección de Local Inicial */}
			{!loadingUbicaciones && !selectedUbicacionId && activeUbicaciones.length > 0 && (
				<div className={styles.welcomeModalBackdrop}>
					<div className={styles.welcomeModalContent}>
						<div className={styles.welcomeModalHeader}>
							<div className={styles.welcomeModalIcon}>
								<FaMapMarkerAlt size={28} />
							</div>
							<h2 className={styles.welcomeModalTitle}>¡Bienvenido a Reservas!</h2>
							<p className={styles.welcomeModalText}>¿En qué ambiente te gustaría reservar hoy?</p>
						</div>

						<div className={styles.welcomeModalList}>
							{activeUbicaciones.map((u) => (
								<button
									key={u.id}
									onClick={() => {
										setSelectedUbicacionId(u.id || null)
										setSelectedSlotData(null)
										setSelectedSubEnvironmentId(null)
										setSelectedSubEnvironmentName(null)
									}}
									className={styles.modalLocalBtn}
								>
									<div className={styles.modalLocalBtnContent}>
										<div className={styles.modalLocalIcon}>
											<FaBuilding size={18} />
										</div>
										<span className={styles.modalLocalBtnName}>
											{u.name}
										</span>
									</div>
									<FaArrowLeft />
								</button>
							))}
						</div>
					</div>
				</div>
			)}


			{/* Modal de Solicitud de Reserva */}
			{isModalOpen && (
				<div className={styles.reservationModalBackdrop}>
					<div className={styles.reservationModalContent}>
						{/* Header del Modal */}
						<div className={styles.reservationModalHeader}>
							<h3 className={styles.reservationModalTitle}>Solicitar Reserva</h3>
							<button onClick={() => setIsModalOpen(false)} className={styles.reservationModalClose}>
								<FaTimes size={20} />
							</button>
						</div>

						{submitSuccess ? (
							<div className={styles.reservationModalSuccess}>
								<div className={styles.reservationModalSuccessIcon}>
									<FaCheck size={32} />
								</div>
								<h3 className={styles.successTitle}>¡Solicitud Enviada!</h3>
								<p className={styles.loaderText}>
									Tu solicitud ha sido registrada correctamente. El administrador se pondrá en contacto contigo pronto.
								</p>
							</div>
						) : (
							<form onSubmit={handleSubmitRequest} className={styles.reservationModalForm}>
								{/* Resumen Visual */}
								<div className={styles.reservationModalSummary}>
									<p className={styles.reservationModalSummaryLabel}>Resumen de Reserva:</p>
									<p className={styles.reservationModalSummaryValue}>
										{selectedUbicacion?.name} {selectedSlotData?.subName ? `• ${selectedSlotData.subName}` : ''} • {selectedDate} • {selectedSlotData?.time}
									</p>
								</div>


								<div className={`${styles.reservationModalForm} ${styles.reservationModalFormNoPadding}`}>
									<div>
										<label className={styles.formLabel}>DNI</label>
										<div className={styles.inputWrapper}>
											<FaIdCard className={styles.inputIcon} />
											<input
												required
												type="text"
												maxLength={8}
												value={customerData.dni}
												onChange={(e) => {
													const val = e.target.value.replace(/\D/g, '')
													setCustomerData({ ...customerData, dni: val })
												}}
												placeholder="Ej. 12345678"
												className={styles.inputField}
											/>
											{isSearchingDNI && <span className={styles.inputSearching}>Buscando...</span>}
										</div>
									</div>

									<div>
										<label className={styles.formLabel}>Nombres y Apellidos</label>
										<div className={styles.inputWrapper}>
											<FaUser className={styles.inputIcon} />
											<input
												required
												type="text"
												value={customerData.name}
												onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
												placeholder="Ej. Juan Pérez"
												className={styles.inputField}
											/>
										</div>
									</div>

									<div>
										<label className={styles.formLabel}>Nombre de Empresa</label>
										<div className={styles.inputWrapper}>
											<FaBuilding className={styles.inputIcon} />
											<input
												required
												type="text"
												value={customerData.company}
												onChange={(e) => setCustomerData({ ...customerData, company: e.target.value, companyId: '' })}
												onFocus={() => dniExists && customerData.company.trim().length >= 2 && setShowCompanySuggestions(true)}
												onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 200)}
												placeholder="Empresa SAC"
												autoComplete="off"
												className={`${styles.inputField} ${customerData.companyId ? styles.inputFieldValid : ''}`}
											/>
											{customerData.companyId && (
												<FaCheck className={styles.validCheck} />
											)}
											{showCompanySuggestions && companySuggestions.length > 0 && (
												<div className={styles.suggestionsList}>
													{companySuggestions.map((suggestion) => (
														<div
															key={suggestion.id}
															onClick={() => {
																setCustomerData({
																	...customerData,
																	company: suggestion.nombre.toUpperCase(),
																	companyId: suggestion.id
																})
																setShowCompanySuggestions(false)
															}}
															className={styles.suggestionItem}
														>
															{suggestion.nombre}
														</div>
													))}
												</div>
											)}
										</div>
									</div>

									<div>
										<label className={styles.formLabel}>Correo Electrónico</label>
										<div className={styles.inputWrapper}>
											<FaEnvelope className={styles.inputIcon} />
											<input
												required
												type="email"
												value={customerData.email}
												onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
												placeholder="juan@empresa.com"
												className={styles.inputField}
											/>
										</div>
									</div>

									<div>
										<label className={styles.formLabel}>Teléfono o Celular</label>
										<div className={styles.inputWrapper}>
											<FaPhone className={styles.inputIcon} />
											<input
												required
												type="tel"
												value={customerData.phone}
												onChange={(e) => {
													const val = e.target.value.replace(/\D/g, '')
													setCustomerData({ ...customerData, phone: val })
												}}
												placeholder="Ej. 987654321"
												className={styles.inputField}
											/>
										</div>
									</div>
								</div>

								<button
									type="submit"
									disabled={isSubmitting}
									className={styles.formSubmitBtn}
								>
									{isSubmitting ? 'Enviando...' : !customerData.companyId ? 'Selecciona una empresa' : 'Enviar Solicitud'}
								</button>
								<p className={styles.formNote}>
									* Tu reserva está sujeta a aprobación del administrador.
								</p>
							</form>
						)}
					</div>
				</div>
			)}

			{/* Sin Reservas Disponibles */}
			{!loadingUbicaciones && !selectedUbicacionId && activeUbicaciones.length === 0 && (
				<div className={styles.noReservationsState}>
					<div className={styles.noReservationsIcon}>
						<FaCalendarAlt size={32} />
					</div>
					<h2 className={styles.noReservationsTitle}>Lo sentimos 😅</h2>
					<p className={styles.noReservationsText}>
						No hay reservas activas o habilitadas en este momento. Por favor, vuelve a consultar más tarde o contacta con el administrador.
					</p>
					{userProfile?.role === 'admin' && (
						<button
							onClick={() => router.push('/reservas/config')}
							className={styles.noReservationsBtn}
						>
							Ir a Configuración
						</button>
					)}
				</div>
			)}

		</div>
	)
}

export default Reservas
