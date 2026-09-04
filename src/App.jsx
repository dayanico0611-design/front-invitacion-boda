import { useEffect, useRef, useState } from 'react'
import './App.css'
import data from './invitationData.json'

function App() {
  const [sent, setSent] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [submitStatus, setSubmitStatus] = useState({ type: 'idle', message: '' })
  const [invitadoEncontrado, setInvitadoEncontrado] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false)
  const [showGuestList, _setShowGuestList] = useState(false)
  const [registeredGuests, setRegisteredGuests] = useState(() => getStoredGuests())
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [guestAccess, setGuestAccess] = useState({ checking: false, allowed: true, guest: null })
  const musicRef = useRef(null)
  const [formData, setFormData] = useState({
    nombre: '',
    attendance: '',
    guests: 1,
    note: ''
  })
  const [remaining, setRemaining] = useState(getRemainingTime(data.date.iso))
  const { couple, date, hero, envelope, intro, gallery, program, locations, details, gifts, rsvp, footer } = data
  const splitAddress = (address) => address.split('\n').map((line, index) => <span key={`${line}-${index}`}>{line}<br /></span>)
  const calendarEvent = createCalendarEvent(data.calendar, date.iso)
  const sheetEndpoint = import.meta.env.VITE_RSVP_ENDPOINT

  useEffect(() => {
    if (!sheetEndpoint) {
      setGuestAccess({ checking: false, allowed: true, guest: null })
      return
    }

    const token = new URLSearchParams(window.location.search).get('token')

    if (!token) {
      setGuestAccess({ checking: false, allowed: false, guest: null })
      return
    }

    let isMounted = true
    setGuestAccess({ checking: true, allowed: false, guest: null })

    fetch(`${sheetEndpoint}?token=${encodeURIComponent(token)}`)
      .then((response) => response.json())
      .then((result) => {
        if (!isMounted) return

        if (result && result.found) {
          setGuestAccess({ checking: false, allowed: true, guest: result })
          setGuestName(result.nombre || '')
          setInvitadoEncontrado({
            found: true,
            nombre: result.nombre,
            adicionales: Math.max(1, Number(result.adicional) || 1),
            mensaje: 'Invitado autorizado por token'
          })
          setFormData((current) => ({
            ...current,
            nombre: result.nombre || current.nombre,
            guests: 1
          }))
          return
        }

        setGuestAccess({ checking: false, allowed: false, guest: null })
      })
      .catch(() => {
        if (isMounted) {
          setGuestAccess({ checking: false, allowed: false, guest: null })
        }
      })

    return () => {
      isMounted = false
    }
  }, [sheetEndpoint])

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemainingTime(date.iso)), 1000)
    return () => window.clearInterval(timer)
  }, [date.iso])

  useEffect(() => {
    const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3')
    audio.loop = true
    audio.volume = 0.18
    musicRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  const handleToggleMusic = async () => {
    const audio = musicRef.current
    if (!audio) return

    if (audio.paused) {
      try {
        await audio.play()
        setIsMusicPlaying(true)
      } catch (error) {
        console.error('No se pudo iniciar la música', error)
      }
      return
    }

    audio.pause()
    setIsMusicPlaying(false)
  }

  const handleOpenEnvelope = async () => {
    setIsEnvelopeOpen(true)
    await handleToggleMusic()
    window.setTimeout(() => {
      document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 850)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: name === 'guests'
        ? Math.min(Number(value) || 1, invitadoEncontrado?.adicionales || 10)
        : value
    }))
  }

  const handleBuscarInvitado = async () => {
    if (!formData.nombre.trim()) {
      setSubmitStatus({ type: 'error', message: 'Escribe tu nombre para buscar' })
      return
    }

    setBuscando(true)
    setSubmitStatus({ type: 'loading', message: 'Buscando tu nombre...' })

    try {
      if (!sheetEndpoint) {
        const localMatch = getStoredGuests().find((guest) => normalizeGuestName(guest.name) === normalizeGuestName(formData.nombre.trim()))
        if (localMatch) {
          setInvitadoEncontrado({
            found: true,
            nombre: localMatch.name,
            adicionales: Math.max(1, Number(localMatch.guests) || 1),
            mensaje: 'Invitado encontrado en la base local'
          })
          setFormData((current) => ({
            ...current,
            guests: 1
          }))
          setSubmitStatus({ type: 'success', message: '¡Te encontramos! Completa tu confirmación.' })
          return
        }

        setInvitadoEncontrado(null)
        setSubmitStatus({ type: 'error', message: 'No encontramos tu nombre en la lista. Verifica la ortografía.' })
        return
      }

      const response = await fetch(sheetEndpoint, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buscar-invitado',
          nombre: formData.nombre.trim()
        })
      })

      const result = await response.json()
      if (result.found) {
        setInvitadoEncontrado(result)
        setFormData((current) => ({
          ...current,
          guests: 1
        }))
        setSubmitStatus({ type: 'success', message: '¡Te encontramos! Completa tu confirmación.' })
      } else {
        setInvitadoEncontrado(null)
        setSubmitStatus({ type: 'error', message: result.message })
      }
    } catch (error) {
      console.error(error)
      setSubmitStatus({ type: 'error', message: 'Error al buscar. Intenta de nuevo.' })
    } finally {
      setBuscando(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.nombre.trim()) {
      setSubmitStatus({ type: 'error', message: 'Escribe tu nombre para confirmar' })
      return
    }

    setSubmitStatus({ type: 'loading', message: 'Guardando tu confirmación...' })

    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    const payload = {
      token,
      name: invitadoEncontrado?.nombre || formData.nombre.trim(),
      nombre: invitadoEncontrado?.nombre || formData.nombre.trim(),
      asistencia: formData.attendance,
      attendance: formData.attendance,
      guests: Number(formData.guests) || 1,
      invitados: Number(formData.guests) || 1,
      note: formData.note.trim(),
      nota: formData.note.trim(),
      event: 'boda-dayana-nicolas'
    }

    try {
      if (sheetEndpoint) {
        const response = await fetch(sheetEndpoint, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          throw new Error('No se pudo guardar la respuesta en la hoja')
        }
      }
    } catch (error) {
      console.error(error)
    }

    const guestRecord = {
      id: Date.now(),
      name: payload.name,
      attendance: payload.attendance,
      guests: payload.guests,
      note: payload.note,
      event: payload.event,
      createdAt: new Date().toISOString(),
      source: sheetEndpoint ? 'endpoint' : 'local'
    }

    const nextGuests = [guestRecord, ...getStoredGuests()].slice(0, 200)
    saveStoredGuests(nextGuests)
    setRegisteredGuests(nextGuests)
    setGuestName(payload.name || 'qué alegría')
    setSent(true)
    setSubmitStatus({ type: 'success', message: 'Tu confirmación quedó registrada.' })
  }

  if (sheetEndpoint && guestAccess.checking) {
    return (
      <main className="access-checking">
        <div className="access-state">
          <p className="overline">Invitación</p>
          <h2>Validando tu acceso...</h2>
        </div>
      </main>
    )
  }

  if (sheetEndpoint && !guestAccess.allowed) {
    return (
      <main className="access-denied">
        <div className="access-state">
          <p className="overline">Acceso restringido</p>
          <h2>Este enlace no corresponde a un invitado activo.</h2>
          <p>Si crees que es un error, contacta a Dayana o Nicolás.</p>
        </div>
      </main>
    )
  }

  return (
    <main className={isEnvelopeOpen ? 'page-open' : 'page-closed'}>
      <section className={`envelope-intro ${isEnvelopeOpen ? 'is-open' : ''}`}>
        <div className="envelope-stage">
          <button className="envelope" type="button" onClick={handleOpenEnvelope} aria-label={envelope.button}>
            <div className="envelope-flap" />
            <div className="envelope-body">
              <div className="envelope-letter">
                <p className="overline">{envelope.overline}</p>
                <h2>{couple.bride} <i>&</i> {couple.groom}</h2>
                <p className="envelope-date">{date.display}</p>
                <p className="envelope-message">{envelope.message}</p>
                <span className="envelope-prompt">{envelope.button}</span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {isEnvelopeOpen && (
        <nav className="bottom-nav" aria-label="Navegación por la invitación">
          <a href="#historia"><NavIcon type="story" />Historia</a>
          <a href="#programa"><NavIcon type="program" />Programa</a>
          <a href="#regalos"><NavIcon type="gift" />Regalos</a>
          <a href="#rsvp"><NavIcon type="rsvp" />Confirmar</a>
          <button type="button" className="music-toggle" onClick={handleToggleMusic} aria-label={isMusicPlaying ? 'Pausar música' : 'Reproducir música'}><NavIcon type="music" />{isMusicPlaying ? 'Pausar' : 'Música'}</button>
        </nav>
      )}
      <section className="hero" id="inicio" style={{ '--hero-image': `url("${hero.image}")` }}><div className="hero-wash" /><div className="hero-copy"><p className="overline">{hero.overline}</p><h1>{couple.bride} <i>&</i> {couple.groom}</h1><p className="hero-date">{date.day} <span>·</span> {date.month} <span>·</span> {date.year}</p><p className="hero-location">{hero.location}</p><a className="scroll-cue" href="#historia">Descubrir la invitación <span>↓</span></a></div><p className="hero-note">{hero.note}</p></section>
      <section className="intro section-narrow" id="historia"><p className="overline">{intro.overline}</p><h2>{intro.headline}<br /><em>{intro.headlineEmphasis}</em></h2><p className="intro-text">{intro.text}</p><div className="ornament" aria-hidden="true">✳</div></section>
      <section className="story-gallery section-narrow" aria-label="Galería de la pareja">
        <div className="story-gallery-copy">
          <p className="overline">Nuestra historia</p>
          <h2>Una historia que se hizo para ser celebrada.</h2>
        </div>
        <div className="gallery-story">
          {gallery.map((item, index) => <figure className={`gallery-photo ${index % 2 === 0 ? 'memory-left' : 'memory-right'}`} key={item.image}><img src={item.image} alt={item.alt} /><figcaption><span>{String(index + 1).padStart(2, '0')}</span>{item.caption}</figcaption></figure>)}
        </div>
      </section>
      <section className="date-card section-narrow" id="fecha"><div><p className="overline">Reserva la fecha</p><h2>{data.calendar.title}</h2><p className="date-lead">{date.display} · {data.calendar.time}</p><p className="date-place"><strong>{data.calendar.place}</strong><br />{data.calendar.address}</p><a className="location-link" href={data.calendar.maps} target="_blank" rel="noreferrer">Ver ubicación de la parroquia <span>↗</span></a><p className="reminder-note">Alerta incluida: {data.calendar.reminderDaysBefore} días antes</p></div><div className="date-actions"><a href={calendarEvent.googleUrl} target="_blank" rel="noreferrer">Agregar a Google Calendar <span>↗</span></a><button type="button" onClick={() => downloadCalendarFile(calendarEvent.ics)}>Calendario con alerta <span>↓</span></button></div></section>
      <section className="countdown" aria-label="Cuenta regresiva para el matrimonio"><p className="overline">Reserva la fecha</p><h2>{date.display}</h2><div className="countdown-grid">{Object.entries(remaining).map(([unit, value]) => <div key={unit}><strong>{String(value).padStart(2, '0')}</strong><span>{unit}</span></div>)}</div></section>
      <section className="day-plan" id="programa"><div className="program section-narrow"><p className="overline">El recorrido de la celebración</p><h2>El día</h2><div className="program-list">{program.map((item) => <div className="program-item" key={item.title}><span className="program-time">{item.time}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></div>)}</div></div>
      <section className="event-route" id="ubicaciones" aria-label="Lugares de la celebración"><div className="route-panel church-panel"><span className="route-number">{locations.church.number}</span><p className="overline">{locations.church.label}</p><h2>{locations.church.name}</h2><p className="route-time">{locations.church.time}</p><p className="route-copy">{locations.church.description}</p><a href={locations.church.maps} target="_blank" rel="noreferrer" className="text-link">Ver en Google Maps ↗</a><a href={locations.church.waze} target="_blank" rel="noreferrer" className="text-link secondary-link">Abrir en Waze ↗</a><p className="address">{splitAddress(locations.church.address)}</p></div><div className="route-spine"><span>✦</span></div><div className="route-panel party-panel"><span className="route-number">{locations.venue.number}</span><p className="overline">{locations.venue.label}</p><h2>{locations.venue.name}</h2><p className="route-time">{locations.venue.time}</p><p className="route-copy">{locations.venue.description}</p><a href={locations.venue.maps} target="_blank" rel="noreferrer" className="text-link">Ver en Google Maps ↗</a><a href={locations.venue.waze} target="_blank" rel="noreferrer" className="text-link secondary-link">Abrir en Waze ↗</a><p className="address">{splitAddress(locations.venue.address)}</p></div></section><div className="map-teaser section-narrow"><p className="overline">Para llegar sin vueltas</p><h3>Mapa de la celebración</h3><p>Más adelante incorporaremos aquí un mapa visual del recorrido y del centro de eventos.</p><a href={locations.venue.maps} target="_blank" rel="noreferrer" className="text-link">Abrir ubicación del evento ↗</a></div></section>
      <section className="details-band">{details.map((detail) => <div key={detail.title} className="detail-card"><span className="detail-icon"><DetailIcon type={detail.icon} /></span><strong>{detail.title}</strong><p>{detail.text}</p></div>)}</section>
      <section className="gifts section-narrow" id="regalos"><div className="gift-copy"><p className="overline">Un detalle para nuestro viaje</p><h2>{gifts.title}</h2><p>{gifts.description}</p><p className="gift-note">{gifts.note}</p></div><div className="gift-card"><span className="gift-mark">{gifts.mark}</span><p className="overline">Lista de novios</p><h3>{gifts.store}</h3>{gifts.code ? <p className="gift-code">{gifts.code}</p> : <p className="gift-code pending">Código disponible próximamente</p>}<a className="gift-link" href="https://club.noviosparis.cl/home/couple-catalog/21046698" target="_blank" rel="noreferrer">Visitar lista <span>↗</span></a></div></section>
      <section className="rsvp section-narrow" id="rsvp"><div className="rsvp-copy"><p className="overline">{rsvp.overline}</p><h2>{rsvp.title}</h2><p>{rsvp.description}</p></div>{sent ? <div className="rsvp-success"><span>✦</span><h3>Gracias, {guestName}.</h3><p>{rsvp.successText}</p><p className="rsvp-summary">{formData.attendance} · {formData.guests} {formData.guests === 1 ? 'persona' : 'personas'}{formData.note ? ` · “${formData.note}”` : ''}</p></div> : <form onSubmit={handleSubmit}><label>Tu nombre<input name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Escribe tu nombre" required /></label><div className="search-row"><button type="button" className="search-button" onClick={handleBuscarInvitado} disabled={buscando || !formData.nombre.trim()}>{buscando ? 'Buscando...' : 'Buscar mi nombre'}</button></div><label>¿Vienes a celebrar con nosotros?<select name="attendance" value={formData.attendance} onChange={handleChange} required><option value="" disabled>Selecciona una opción</option>{rsvp.attendanceOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label>Personas que asistirán<input name="guests" type="number" min="1" max="10" value={formData.guests} onChange={handleChange} /></label><label>Una nota para los novios<textarea name="note" value={formData.note} onChange={handleChange} placeholder="Restricciones alimentarias, transporte o un mensaje..." /></label>{submitStatus.type !== 'idle' && <p className={`rsvp-status ${submitStatus.type}`}>{submitStatus.message}</p>}<button type="submit" disabled={submitStatus.type === 'loading'}>{submitStatus.type === 'loading' ? 'Guardando...' : 'Confirmar asistencia'} <span>↗</span></button></form>}</section>
      {showGuestList && (
        <section className="admin-panel section-narrow" id="admin">
          <div className="admin-header">
            <div>
              <p className="overline">Panel de administración</p>
              <h2>Invitados registrados</h2>
            </div>
            <span className="admin-total">{registeredGuests.length} registros</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Asistencia</th>
                  <th>Invitados</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {registeredGuests.length ? registeredGuests.map((guest) => (
                  <tr key={guest.id ?? `${guest.name}-${guest.createdAt}`}>
                    <td>{guest.name}</td>
                    <td>{guest.attendance}</td>
                    <td>{guest.guests}</td>
                    <td>{guest.note || '—'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4">Todavía no hay registros guardados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <footer><p>{couple.shortMark}</p><span>{date.display}</span><small>{footer}</small></footer>
    </main>
  )
}

export default App

function NavIcon({ type }) {
  const commonProps = { viewBox: '0 0 24 24', 'aria-hidden': 'true' }

  if (type === 'program') {
    return <svg {...commonProps}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h5" /></svg>
  }

  if (type === 'gift') {
    return <svg {...commonProps}><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7H8.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h3.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z" /></svg>
  }

  if (type === 'rsvp') {
    return <svg {...commonProps}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3v-3h0A2.5 2.5 0 0 1 4 14.5z" /><path d="m8 10 3 2.2 5-4" /></svg>
  }

  if (type === 'music') {
    return <svg {...commonProps}><path d="M9 18V5l10-2v13" /><circle cx="6.5" cy="18" r="3" /><circle cx="16.5" cy="16" r="3" /></svg>
  }

  return <svg {...commonProps}><path d="M12 20.5 4.8 13.6a4.2 4.2 0 0 1 6-5.9L12 8l1.2-1.3a4.2 4.2 0 1 1 6 5.9L12 20.5Z" /></svg>
}

function DetailIcon({ type }) {
  const commonProps = { viewBox: '0 0 24 24', 'aria-hidden': 'true' }

  if (type === 'dress') {
    return (
      <svg {...commonProps}>
        <path d="M8 5.5 12 3l4 2.5M9 10.5h6M8 10.5l-1.8 8.5h11.6l-1.8-8.5M10.5 10.5V8.7c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6v1.8" />
      </svg>
    )
  }

  if (type === 'moon') {
    return (
      <svg {...commonProps}>
        <path d="M15.5 3.5A7.5 7.5 0 1 0 20.5 15a6 6 0 0 1-5-11.5Z" />
      </svg>
    )
  }

  if (type === 'heart') {
    return (
      <svg {...commonProps}>
        <path d="M12 19.5 4.8 12.6a4.2 4.2 0 0 1 6-5.9L12 7l1.2-1.3a4.2 4.2 0 1 1 6 5.9L12 19.5Z" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M12 2.8 14.4 8l5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8L12 2.8Z" />
    </svg>
  )
}

function normalizeGuestName(value = '') {
  return String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function getStoredGuests() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem('boda-dayana-nicolas-rsvps')
    return raw ? JSON.parse(raw) : []
  } catch (error) {
    console.error('No se pudieron leer los invitados guardados', error)
    return []
  }
}

function saveStoredGuests(guests) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem('boda-dayana-nicolas-rsvps', JSON.stringify(guests))
}

function getRemainingTime(targetDate) {
  const difference = Math.max(0, new Date(targetDate).getTime() - Date.now())
  const totalSeconds = Math.floor(difference / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { días: days, horas: hours, minutos: minutes, segundos: seconds }
}

function createCalendarEvent(calendar, startDate) {
  const start = new Date(startDate)
  const end = new Date(start.getTime() + calendar.durationHours * 60 * 60 * 1000)
  const formatGoogleDate = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const location = `${calendar.place}, ${calendar.address}`
  const googleParams = new URLSearchParams({ action: 'TEMPLATE', text: calendar.title, dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`, details: calendar.description, location })
  const icsDate = (date) => formatGoogleDate(date).replace('Z', '')
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dayana y Nicolas//Invitacion//ES', 'BEGIN:VEVENT', `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${calendar.title}`, `DESCRIPTION:${calendar.description}`, `LOCATION:${location}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:Recordatorio: ${calendar.title}`, `TRIGGER:-P${calendar.reminderDaysBefore}D`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  return { googleUrl: `https://calendar.google.com/calendar/render?${googleParams}`, ics }
}

function downloadCalendarFile(ics) {
  const file = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const fileUrl = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = fileUrl
  link.download = 'dayana-y-nicolas.ics'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000)
}
