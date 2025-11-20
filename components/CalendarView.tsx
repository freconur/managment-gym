import React, { useMemo, useState, useEffect } from 'react'
import { Calendar, momentLocalizer, View, Event } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { Incidencia } from '@/features/types/types'
import { useManagment } from '@/features/hooks/useManagment'
import styles from '@/styles/equipment.module.css'

// Configurar moment.js en español
moment.locale('es')

// Crear el localizador usando moment.js (nativo de react-big-calendar)
const localizer = momentLocalizer(moment)

interface CalendarViewProps {
  incidencias: Incidencia[]
  onSelectEvent?: (incidencia: Incidencia) => void
}

interface CalendarEvent extends Event {
  incidencia: Incidencia
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  incidencias,
  onSelectEvent
}) => {
  const [currentView, setCurrentView] = useState<View>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>('')
  const { getUbicaciones, ubicaciones } = useManagment()

  useEffect(() => {
    const unsubscribeUbicaciones = getUbicaciones()
    return () => {
      unsubscribeUbicaciones()
    }
  }, [getUbicaciones])

  // Función para obtener el título del evento
  const getEventTitle = (incidencia: Incidencia): string => {
    // Si es mantenimiento, usar el subTipo
    if (incidencia.tipo === 'mantenimiento' && incidencia.subTipo) {
      const tipoLabels: Record<string, string> = {
        preventivo: 'Mantenimiento Preventivo',
        correctivo: 'Mantenimiento Correctivo',
        cambio_piezas: 'Cambio de Piezas',
        revision: 'Revisión',
        otro: 'Otro'
      }
      return tipoLabels[incidencia.subTipo] || `Mantenimiento ${incidencia.subTipo}`
    }
    
    // Para otros tipos, usar el tipo directamente
    const tipoLabels: Record<string, string> = {
      incidencia: 'Incidencia',
      mantenimiento: 'Mantenimiento'
    }
    return tipoLabels[incidencia.tipo] || incidencia.tipo
  }

  // Función helper para convertir diferentes tipos de fechas a Date
  const convertToDate = (fecha: any): Date | null => {
    if (!fecha) return null
    
    // Si es un Timestamp de Firebase (tiene método toDate)
    if (fecha && typeof fecha === 'object' && 'toDate' in fecha && typeof fecha.toDate === 'function') {
      return fecha.toDate()
    }
    
    // Si ya es un Date
    if (fecha instanceof Date) {
      return new Date(fecha)
    }
    
    // Si es un objeto Timestamp con seconds (formato antiguo de Firebase)
    if (typeof fecha === 'object' && fecha.seconds) {
      return new Date(fecha.seconds * 1000)
    }
    
    // Si es un string
    if (typeof fecha === 'string') {
      // Si tiene formato ISO con hora
      if (fecha.includes('T')) {
        return new Date(fecha)
      }
      // Si es formato YYYY-MM-DD
      const [year, month, day] = fecha.split('-').map(Number)
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month - 1, day, 0, 0, 0, 0)
      }
      // Intentar parsear como fecha normal
      return new Date(fecha)
    }
    
    // Intentar convertir directamente
    try {
      return new Date(fecha)
    } catch {
      return null
    }
  }

  // Convertir incidencias a eventos del calendario
  const events: CalendarEvent[] = useMemo(() => {
    return incidencias
      .filter(incidencia => {
        // Filtrar por ubicación si hay un filtro activo
        if (filtroUbicacion && incidencia.maquina?.location !== filtroUbicacion) {
          return false
        }
        
        // Mostrar eventos que tengan fecha de reporte, fecha programada o createdAt (para incidencias)
        return incidencia.fechaReporte || incidencia.fechaProgramada || (incidencia.tipo === 'incidencia' && incidencia.createdAt)
      })
      .map(incidencia => {
        let startDate: Date
        let endDate: Date
        
        // Priorizar fechaProgramada o fechaReporte sobre createdAt para que el evento aparezca en la fecha correcta
        // Usar fecha programada si existe, sino fecha de reporte
        const fechaValue = incidencia.fechaProgramada || incidencia.fechaReporte
        
        // Si no hay fechaProgramada ni fechaReporte, usar createdAt como fallback
        if (!fechaValue && incidencia.tipo === 'incidencia' && incidencia.createdAt) {
          const fechaConvertida = convertToDate(incidencia.createdAt)
          if (!fechaConvertida) {
            console.error('❌ No se pudo convertir createdAt a Date:', incidencia.createdAt)
            return null
          }
          startDate = fechaConvertida
          
          // Para el final, usar la misma hora más 1 hora para que tenga duración visible
          endDate = new Date(startDate)
          endDate.setHours(endDate.getHours() + 1)
        } else if (fechaValue) {
          // Convertir la fecha a Date
          const fecha = convertToDate(fechaValue)
          if (!fecha || isNaN(fecha.getTime())) {
            console.error('❌ Fecha inválida:', fechaValue)
            return null
          }
          
          // Configurar la hora al inicio del día para la fecha de inicio
          startDate = new Date(fecha)
          startDate.setHours(0, 0, 0, 0)
          
          // Si tiene fecha de resolución, crear un rango
          // Si no, usar el mismo día pero al final del día (para que solo ocupe un día)
          if (incidencia.fechaResolucion) {
            const fechaResolucion = convertToDate(incidencia.fechaResolucion)
            
            if (fechaResolucion && !isNaN(fechaResolucion.getTime())) {
              endDate = new Date(fechaResolucion)
              endDate.setHours(23, 59, 59, 999)
            } else {
              endDate = new Date(fecha)
              endDate.setHours(23, 59, 59, 999)
            }
          } else {
            // Para eventos de un solo día, usar el mismo día pero al final del día
            endDate = new Date(fecha)
            endDate.setHours(23, 59, 59, 999)
          }
        } else {
          // Si no hay fecha válida, saltar este evento
          console.error('❌ No hay fecha válida para la incidencia:', incidencia)
          return null
        }

        const title = getEventTitle(incidencia)
        
        // Para el resource, incluir tipo y estado
        const estado = incidencia.estado || 'pendiente'

        return {
          title,
          start: startDate,
          end: endDate,
          incidencia,
          resource: {
            tipo: incidencia.tipo,
            estado: estado,
            prioridad: incidencia.prioridad
          }
        } as CalendarEvent
      })
      .filter((event): event is CalendarEvent => event !== null) // Filtrar eventos nulos
  }, [incidencias, filtroUbicacion])

  // Función para obtener el estilo del evento según tipo, estado y prioridad
  const eventStyleGetter = (event: CalendarEvent) => {
    const { tipo, estado, prioridad } = event.resource
    
    let backgroundColor = '#9ca3af' // Gris por defecto
    let borderColor = '#9ca3af'
    let borderWidth = '1px'
    
    // Si es incidencia, usar color rojo medio anaranjado
    if (tipo === 'incidencia') {
      backgroundColor = '#f97316' // Rojo medio anaranjado para incidencias
      borderColor = '#f97316'
    } else if (tipo === 'mantenimiento') {
      // Para mantenimientos, usar color según el estado
      if (estado === 'pendiente') {
        backgroundColor = '#f59e0b' // Amarillo/Naranja
        borderColor = '#f59e0b'
      } else if (estado === 'en_proceso') {
        backgroundColor = '#3b82f6' // Azul
        borderColor = '#3b82f6'
      } else if (estado === 'completado') {
        backgroundColor = '#10b981' // Verde
        borderColor = '#10b981'
      } else if (estado === 'cancelado') {
        backgroundColor = '#6b7280' // Gris oscuro
        borderColor = '#6b7280'
      }
    }
    
    // Ajustar borde según prioridad
    if (prioridad === 'urgente') {
      borderColor = '#dc2626' // Rojo oscuro
      borderWidth = '3px'
    } else if (prioridad === 'alta') {
      borderWidth = '2px'
    }
    
    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth,
        color: '#fff',
        borderRadius: '4px',
        padding: '2px 4px',
        fontSize: '12px'
      }
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    if (onSelectEvent) {
      onSelectEvent(event.incidencia)
    }
  }

  // Componentes personalizados para los botones de navegación
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV')
    }

    const goToNext = () => {
      toolbar.onNavigate('NEXT')
    }

    const goToToday = () => {
      toolbar.onNavigate('TODAY')
    }

    return (
      <div className={styles.calendarToolbar}>
        <div className={styles.calendarToolbarGroup}>
          <button
            type="button"
            onClick={goToBack}
            className={styles.calendarNavButton}
            aria-label="Anterior"
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className={styles.calendarNavButton}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={goToNext}
            className={styles.calendarNavButton}
            aria-label="Siguiente"
          >
            <FaChevronRight />
          </button>
        </div>
        <div className={styles.calendarToolbarLabel}>
          {toolbar.label}
        </div>
        <div className={styles.calendarToolbarGroup}>
          <button
            type="button"
            onClick={() => toolbar.onView('month')}
            className={`${styles.calendarViewButton} ${toolbar.view === 'month' ? styles.calendarViewButtonActive : ''}`}
          >
            Mes
          </button>
          <button
            type="button"
            onClick={() => toolbar.onView('week')}
            className={`${styles.calendarViewButton} ${toolbar.view === 'week' ? styles.calendarViewButtonActive : ''}`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => toolbar.onView('day')}
            className={`${styles.calendarViewButton} ${toolbar.view === 'day' ? styles.calendarViewButtonActive : ''}`}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => toolbar.onView('agenda')}
            className={`${styles.calendarViewButton} ${toolbar.view === 'agenda' ? styles.calendarViewButtonActive : ''}`}
          >
            Agenda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <h3 className={styles.calendarTitle}>
          <span>📅</span>
          Calendario de Eventos
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', whiteSpace: 'nowrap' }}>
              Filtrar por ubicación:
            </label>
            <select
              value={filtroUbicacion}
              onChange={(e) => setFiltroUbicacion(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: '#fff',
                color: '#374151',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              <option value="">Todas las ubicaciones</option>
              {ubicaciones.map((ubicacion) => (
                <option key={ubicacion.id} value={ubicacion.name}>
                  {ubicacion.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.calendarLegend}>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: '#f97316' }}></span>
            <span>Incidencia</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: '#f59e0b' }}></span>
            <span>Pendiente</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: '#3b82f6' }}></span>
            <span>En Proceso</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: '#10b981' }}></span>
            <span>Completado</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: '#6b7280' }}></span>
            <span>Cancelado</span>
          </div>
        </div>
        </div>
      </div>
      <div className={styles.calendarWrapper}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          components={{
            toolbar: CustomToolbar
          }}
          messages={{
            next: 'Siguiente',
            previous: 'Anterior',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay eventos en este rango'
          }}
        />
      </div>
    </div>
  )
}

