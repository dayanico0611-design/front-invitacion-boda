import { useEffect, useRef, useState } from 'react'
import './App.css'
import data from './invitationData.json'
import SongSuggestions from './SongSuggestions'

function App() {
  const { couple, date, hero, gallery, program, locations, gifts, rsvp, footer } = data
  const weddingDate = new Date(`${date.year}-${date.month}-${date.day}T12:00:00`)
  const dateWeekday = new Intl.DateTimeFormat('es-CL', { weekday: 'long' }).format(weddingDate)
  const dateMonth = new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(weddingDate)
  const [remaining, setRemaining] = useState(getRemainingTime(date.iso))
  const [form, setForm] = useState({ nombre: '', attendance: '', guests: '', companionName: '', dietary: '' })
  const [found, setFound] = useState(null)
  const [attendanceError, setAttendanceError] = useState(false)
  const [guestLoading, setGuestLoading] = useState(() => Boolean(import.meta.env.VITE_RSVP_ENDPOINT && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('token')))
  const [status, setStatus] = useState(() => ({
    type: import.meta.env.VITE_RSVP_ENDPOINT && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('token') ? 'loading' : 'idle',
    message: import.meta.env.VITE_RSVP_ENDPOINT && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('token') ? 'Validando tu invitación...' : '',
  }))
  const [sent, setSent] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [envelopeVisible, setEnvelopeVisible] = useState(true)
  const [envelopeOpening, setEnvelopeOpening] = useState(false)
  const envelopeTimer = useRef(null)
  const endpoint = import.meta.env.VITE_RSVP_ENDPOINT

  const openInvitation = () => {
    if (envelopeOpening) return
    setEnvelopeOpening(true)
    window.scrollTo(0, 0)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    envelopeTimer.current = window.setTimeout(() => setEnvelopeVisible(false), reducedMotion ? 50 : 1600)
  }

  useEffect(() => () => window.clearTimeout(envelopeTimer.current), [])

  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemainingTime(date.iso)), 1000)
    return () => clearInterval(timer)
  }, [date.iso])

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!endpoint || !token) return

    const controller = new AbortController()
    let cancelled = false
    fetch(`${endpoint}?token=${encodeURIComponent(token)}`, { method: 'GET', mode: 'cors', signal: controller.signal })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok || !result.found) throw new Error(result.message || 'No pudimos validar esta invitación.')
        if (cancelled) return
        setFound(result)
        setForm((current) => ({ ...current, nombre: toTitleCase(result.nombre || ''), guests: 1 }))
        setStatus({ type: 'success', message: 'Invitación verificada. Confírmanos si nos acompañas.' })
      })
      .catch((error) => {
        if (cancelled || error.name === 'AbortError') return
        setFound(null)
        setStatus({ type: 'error', message: error.message || 'No pudimos validar esta invitación.' })
      })
      .finally(() => {
        if (!cancelled) setGuestLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [endpoint])

  useEffect(() => {
    const sections = [...document.querySelectorAll('.paper-shell section')]
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealSections = sections.filter((section) => !section.classList.contains('hero'))

    revealSections.forEach((section, index) => {
      section.classList.add('reveal-section', 'js-reveal')
      if (reduceMotion || index === 0) section.classList.add('is-revealed')
    })

    const sectionObserver = reduceMotion ? null : new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          sectionObserver?.unobserve(entry.target)
        }
      })
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' })

    revealSections.forEach((section) => {
      if (!section.classList.contains('is-revealed')) sectionObserver?.observe(section)
    })

    const timelineItems = [...document.querySelectorAll('.timeline article')]
    let timelineObserver = null
    if (reduceMotion || !('IntersectionObserver' in window)) {
      timelineItems.forEach((item) => item.classList.add('is-visible'))
    } else {
      timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            timelineObserver.unobserve(entry.target)
          }
        })
      }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' })
      timelineItems.forEach((item) => timelineObserver.observe(item))
    }

    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? (window.scrollY / max) * 100 : 0
      document.documentElement.style.setProperty('--scroll-progress', progress + '%')
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)

    return () => {
      sectionObserver?.disconnect()
      timelineObserver?.disconnect()
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
      document.documentElement.style.removeProperty('--scroll-progress')
    }
  }, [])

  const change = (event) => {
    const { name, value } = event.target
    if (name === 'attendance') {
      setAttendanceError(false)
      setForm((current) => ({ ...current, attendance: value, companionName: '' }))
    } else {
      setForm((current) => ({ ...current, [name]: value }))
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!found) return setStatus({ type: 'error', message: 'No pudimos validar tu invitación. Revisa que hayas abierto el enlace que recibiste por WhatsApp.' })
    if (!form.nombre.trim() || !form.attendance) return setStatus({ type: 'error', message: 'Completa tu nombre y asistencia.' })
    setStatus({ type: 'loading', message: 'Guardando tu confirmación...' })
    const token = new URLSearchParams(window.location.search).get('token')
    const hasCompanion = Number(found.adicional) === 1 && form.attendance === rsvp.attendanceOptions[0] && Boolean(form.companionName.trim())
    const note = [form.dietary.trim() && `Restricciones alimentarias: ${form.dietary.trim()}`, form.companionName.trim() && `Acompañante: ${form.companionName.trim()}`].filter(Boolean).join(' | ')
    const payload = { token, name: found?.nombre || form.nombre.trim(), nombre: found?.nombre || form.nombre.trim(), asistencia: form.attendance, attendance: form.attendance, guests: hasCompanion ? 2 : 1, invitados: hasCompanion ? 2 : 1, companionName: hasCompanion ? form.companionName.trim() : '', nombreAcompanante: hasCompanion ? form.companionName.trim() : '', note, nota: note, dietaryRestrictions: form.dietary.trim(), restriccionesAlimentarias: form.dietary.trim(), event: 'boda-dayana-nicolas' }
    try {
      if (endpoint) {
        const response = await fetch(endpoint, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!response.ok) throw new Error('No pudimos guardar la confirmación.')
      }
      saveStoredGuests([{ id: Date.now(), name: payload.name, attendance: payload.attendance, guests: payload.guests, note: payload.note, createdAt: new Date().toISOString() }, ...getStoredGuests()].slice(0, 200))
      setGuestName(payload.name)
      setSent(true)
      setStatus({ type: 'success', message: 'Tu confirmación quedó registrada.' })
    } catch (error) { setStatus({ type: 'error', message: error.message }) }
  }

  if (endpoint) {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) return <Access message="Este enlace requiere un acceso de invitado." />
  }

  return <main className="site is-open">
      {envelopeVisible && <div className={`opening-cover${envelopeOpening ? ' is-opening' : ''}`}>
        <button className="opening-cover-action" type="button" onClick={openInvitation} disabled={envelopeOpening} aria-label={`Abrir invitación de ${couple.bride} y ${couple.groom}`}>
          <span className="opening-envelope envelope-original" aria-hidden="true">
            <img className="envelope-original-pocket" src="./illustrations/envelope-original.png" alt="" fetchPriority="high" decoding="sync" />
            <span className="envelope-original-flap"><img src="./illustrations/envelope-original.png" alt="" fetchPriority="high" decoding="sync" /></span>
          </span>
          <span className="envelope-hint">Toca para abrir <span>♡</span></span>
        </button>
      </div>}
      <header className="floating-nav" inert={envelopeVisible} aria-hidden={envelopeVisible}>
        <a href="#inicio" className="nav-mark">{couple.shortMark}</a>
        <nav aria-label="Secciones de la invitación">
          <a href="#inicio">Inicio</a><a href="#nosotros">Nosotros</a><a href="#detalles">Detalles</a><a href="#confirmacion">Confirmación</a>
        </nav>
        <span className="nav-signature">Dayana &amp; Nicolás <b>♡</b></span>
      </header>
      <div className="scroll-progress" aria-hidden="true" inert={envelopeVisible}><span /></div>
      <div className="paper-shell" inert={envelopeVisible} aria-hidden={envelopeVisible}>
        <div className="editorial-grid">
          <div className="editorial-column editorial-left">
            <section className="editorial-intro" id="inicio">
              <img className="intro-floral floral-corner floral-top-left" src="./illustrations/intro-floral-watercolor-hd.png" alt="" aria-hidden="true" />
              <p className="eyebrow">Nuestra boda</p>
              <div className="editorial-divider intro-divider"><HandDrawnHeart /></div>
              <h1><span>{couple.bride} <em>&amp;</em></span><span>{couple.groom}</span></h1>
              <div className="editorial-date" id="fecha" aria-label={`${dateWeekday} ${date.day} de ${dateMonth} de ${date.year}`}>
                <span className="date-month">{dateMonth}</span>
                <div className="date-details"><span className="date-weekday">{dateWeekday}</span><strong>{date.day}</strong><span className="date-year">{date.year}</span></div>
              </div>
              <p className="editorial-story" id="nosotros">Después de muchos años juntos, queremos compartir este gran momento con las personas que más queremos.</p>
              <div className="editorial-divider intro-divider"><HandDrawnHeart /></div>
              <img className="floral-bouquet intro-bouquet" src="./illustrations/intro-bouquet-watercolor.png" alt="" aria-hidden="true" />
            </section>
            <section className="editorial-song" aria-labelledby="song-heading">
              <h2 id="song-heading">Dale play a nuestra canción</h2>
              <WeddingSongPlayer />
            </section>
          </div>

          <div className="editorial-column editorial-middle" id="detalles">
            <section className="editorial-day" id="dia">
              <p className="eyebrow">El gran día</p>
              <h2>El gran día</h2>
              <div className="editorial-divider"><HandDrawnHeart /></div>
              <div className="event-list">{program.map((item, index) => {
                const place = index === 0 ? locations.church : locations.venue
                return <article className="event-item event-item-with-image" key={item.title}>
                  <span className="event-icon"><TimelineIcon name={index === 0 ? 'ring' : 'toast'}/></span>
                  <div className="event-copy"><h3>{index === 0 ? 'Ceremonia religiosa' : 'Celebración'}</h3><small>{item.time}</small><p className="event-place">{place.name}</p><p>{index === 0 ? 'Maroto 950, Concón' : place.address}</p><div className="event-actions"><a className="panel-button" href={place.maps} target="_blank" rel="noreferrer">Google Maps <span>→</span></a><a className="panel-button panel-button-secondary" href={place.waze} target="_blank" rel="noreferrer">Waze <span>→</span></a></div></div>
                  <img className="event-watercolor" src={index === 0 ? './illustrations/church-watercolor-v2.png' : './illustrations/chapanay-watercolor.png'} alt={index === 0 ? 'La misma ilustración en acuarela de la parroquia' : 'La misma ilustración en acuarela del Centro de Eventos Chapanay'} />
                </article>
              })}</div>
              <img className="day-bouquet" src="./illustrations/intro-bouquet-watercolor.png" alt="" aria-hidden="true" />
            </section>

            <section className="editorial-dress" id="dress">
              <p className="eyebrow">Código de vestimenta</p>
              <h2>Formal / Cóctel</h2>
              <img className="dress-couple" src="./illustrations/dress-code-couple-pink.png" alt="Ilustración de una pareja con traje negro y vestido rosa formal" />
              <p className="dress-note">Tu mejor versión,<br/>siempre es suficiente</p>
              <div className="editorial-divider dress-divider"><HandDrawnHeart /></div>
              <p className="dress-color-note">Para que la novia brille, les pedimos evitar el blanco, el plateado y el beige. ¡Gracias por ayudarnos a cuidar ese detalle! 🤍</p>
            </section>

          </div>

          <div className="editorial-column editorial-right">
            <div className="editorial-gift-rsvp">
            <section className="editorial-gifts" id="regalos">
              <GiftIcon />
              <p className="eyebrow">Lista de novios</p>
              <h2>Un detalle para<br/><em>nuestro nuevo capítulo</em></h2>
              <p>{gifts.description}</p>
              <a className="outline-button" href="https://club.noviosparis.cl/home/couple-catalog/21046698" target="_blank" rel="noreferrer">Ver lista <span>→</span></a>
              <div className="rings-divider" aria-hidden="true">♡</div>
            </section>
            <SongSuggestions />
            <section className="editorial-rsvp" id="confirmacion">
              <img className="rsvp-watercolor" src="./illustrations/intro-floral-watercolor-hd.png" alt="" aria-hidden="true" />
              <h2>Confirmación</h2>
              <div className="editorial-divider"><HandDrawnHeart /></div>
              <p className="rsvp-copy">Por favor confirma tu asistencia<br/>antes del 10 de enero de 2027.</p>
              {sent ? <div className="success-card"><span>♥</span><h3>Gracias, {guestName}.</h3><p>{rsvp.successText}</p></div> : <form onSubmit={submit}>
                <label>Nombre<input name="nombre" value={toTitleCase(form.nombre)} placeholder={guestLoading ? 'Validando tu invitación…' : 'Nombre asociado a tu invitación'} readOnly required/></label>
                <label>¿Nos acompañas?<select name="attendance" value={form.attendance} onChange={change} onInvalid={(event) => { event.preventDefault(); setAttendanceError(true) }} aria-invalid={attendanceError} aria-describedby={attendanceError ? 'attendance-error' : undefined} required><option value="" disabled>Selecciona una opción</option>{rsvp.attendanceOptions.map((option) => <option key={option}>{option}</option>)}</select>{attendanceError && <span id="attendance-error" className="rsvp-field-error" role="alert">Selecciona si nos acompañas para poder confirmar.</span>}</label>
                {found && Number(found.adicional) === 1 && form.attendance === rsvp.attendanceOptions[0] && <label>Acompañante (nombre)<input name="companionName" value={form.companionName} onChange={change} placeholder="Si aplica" /></label>}
                <label>Comentarios adicionales<textarea name="dietary" value={form.dietary} onChange={change} placeholder="Cuéntanos cualquier duda u observación que tengas para nuestro gran día ..."/></label>
                {status.type !== 'idle' && <p className={`form-status ${status.type}`}>{status.message}</p>}
                <button type="submit" className="submit-button">Confirmar asistencia <span>→</span></button>
              </form>}
            </section>
            </div>

            <section className="editorial-countdown">
              <div className="countdown-clock"><ClockIcon /></div>
              <p className="eyebrow">Falta poco</p>
              <div className="count-grid">{Object.entries(remaining).map(([key, value]) => <div key={key}><strong>{String(value).padStart(2, '0')}</strong><span>{key}</span></div>)}</div>
            </section>

            <figure className="editorial-photo">
              <img className="couple-photo" src="./fotos/IMG_2387.JPEG" alt="Dayana y Nicolás abrazados frente al mar" loading="lazy" />
              <figcaption>Nos encantaría<br/><em>celebrar contigo</em><span>♡</span></figcaption>
              <img className="floral-photo-corner" src="./illustrations/intro-floral-watercolor-hd.png" alt="" aria-hidden="true" />
            </figure>
            <section className="editorial-faq" id="contacto">
              <div className="contact-divider"><HandDrawnHeart /></div>
              <MailIcon />
              <p className="eyebrow">Contacto / detalles</p>
              <p className="faq-invitation">¿Dudas o consultas?</p>
              <div className="contact-actions">
                <a className="outline-button" href="https://wa.me/56984357593" target="_blank" rel="noreferrer"><WhatsAppIcon /> Dayana <span>→</span></a>
                <a className="outline-button" href="https://wa.me/56994411003" target="_blank" rel="noreferrer"><WhatsAppIcon /> Nicolás <span>→</span></a>
              </div>
              <img className="contact-watercolor" src="./illustrations/intro-bouquet-watercolor.png" alt="" aria-hidden="true" />
            </section>
            <footer className="editorial-footer"><span className="footer-mark">{couple.shortMark}</span><p>{footer}</p><small>{date.display}</small></footer>
          </div>
        </div>
      </div>
  </main>
}

function WeddingSongPlayer() {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [repeat, setRepeat] = useState(false)

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      try { await audio.play() } catch { setPlaying(false) }
    } else audio.pause()
  }

  const seekBy = (seconds) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds))
  }

  const seekTo = (value) => {
    const nextTime = Number(value)
    setCurrentTime(nextTime)
    if (audioRef.current) audioRef.current.currentTime = nextTime
  }

  return <div className="song-player" aria-label="Reproductor de nuestra canción">
    <audio ref={audioRef} src="./audio/perfect.mp3" preload="metadata" loop={repeat} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onEnded={() => setPlaying(false)} />
    <input className="song-progress" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} onChange={(event) => seekTo(event.target.value)} style={{ '--song-progress': `${duration ? (currentTime / duration) * 100 : 0}%` }} aria-label="Avance de la canción" aria-valuetext={`${formatSongTime(currentTime)} de ${formatSongTime(duration)}`} />
    <div className="song-controls">
      <button type="button" className="song-control song-skip" onClick={() => seekBy(-10)} aria-label="Retroceder 10 segundos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 3 12l8 7V5Zm10 0-8 7 8 7V5Z"/></svg></button>
      <button type="button" className="song-control song-play" onClick={togglePlayback} aria-label={playing ? 'Pausar canción' : 'Reproducir canción'}>{playing ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4 13 8-13 8V4Z"/></svg>}</button>
      <button type="button" className="song-control song-skip" onClick={() => seekBy(10)} aria-label="Avanzar 10 segundos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 5 8 7-8 7V5ZM3 5l8 7-8 7V5Z"/></svg></button>
      <button type="button" className={`song-control song-repeat${repeat ? ' is-active' : ''}`} onClick={() => setRepeat((value) => !value)} aria-label={repeat ? 'Desactivar repetición' : 'Repetir canción'} aria-pressed={repeat}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/></svg></button>
    </div>
  </div>
}

function formatSongTime(seconds = 0) {
  const safeSeconds = Number.isFinite(seconds) ? Math.floor(seconds) : 0
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`
}

function FloralSprig({ className = '' }) {
  return <svg className={`floral-sprig ${className}`} viewBox="0 0 180 118" aria-hidden="true">
    <g fill="none" stroke="#8d9174" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 107C47 88 70 59 94 14M42 87C31 65 18 55 8 52m33 33c1-24-5-40-17-53m28 31C72 41 77 27 75 13m-10 34c21-12 37-13 51-8m-33 31c19-2 34 4 45 17m-58-28c-4 15-2 28 8 39" strokeWidth="2"/>
      <path d="M28 72c-10-17-15-22-23-23 4 15 11 23 24 29Zm2-19c-2-19-6-27-14-34-2 17 1 28 12 39Zm33-20c4-15 4-23 0-31-9 13-11 23-6 36Zm14-5c16-9 24-11 33-7-11 11-20 15-36 13Zm14 34c15-6 24-7 33-1-12 9-21 11-35 7Zm-6 19c12 9 16 16 16 25-14-6-20-13-22-27Z" fill="#a7a98d" fillOpacity=".63" stroke="#8d9174" strokeWidth="1"/>
      <path d="M14 103c34-16 59-45 83-88" stroke="#b79d72" strokeWidth="1.2"/>
    </g>
    <g stroke="#bd8f83" strokeWidth="1.2">
      <path d="M112 31c-8-8-3-17 5-16 2-11 14-10 17-1 10-4 16 6 9 14 7 8 0 16-9 13-5 10-16 7-17-2-10 0-12-10-5-14Z" fill="#e2bdb0" fillOpacity=".83"/>
      <path d="M133 67c-7-6-2-14 4-13 2-9 12-8 14-1 8-3 13 5 7 11 5 7-1 13-8 10-4 8-13 6-14-2-8 0-9-8-3-12Z" fill="#f0d3c5" fillOpacity=".8"/>
      <circle cx="132" cy="28" r="4" fill="#c79a68"/><circle cx="151" cy="69" r="3" fill="#c79a68"/>
    </g>
  </svg>
}

function HandDrawnHeart() {
  return <span className="hand-drawn-heart" aria-hidden="true"><svg viewBox="0 0 24 20" focusable="false"><path d="M12 17.1C9.7 14.9 4.1 11.2 3.7 7.2 3.4 4.6 5.2 2.7 7.4 2.9c1.8.1 3.2 1.9 4.6 3.6 1.1-2.4 2.9-4.1 5-3.7 2.3.4 3.7 2.7 2.8 5.1-1.1 3.3-5.1 6.9-7.8 9.2Z" /></svg></span>
}

function GiftIcon() {
  return <svg className="small-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 13h24v15H4zM3 9h26v5H3zm13 0v19M16 9c-8 0-10-2-9-5 2-4 8 0 9 5Zm0 0c0-6 5-9 8-6 2 3-2 6-8 6Z"/></svg>
}

function MailIcon() {
  return <svg className="small-icon" viewBox="0 0 32 32" aria-hidden="true"><rect x="3.5" y="7" width="25" height="18" rx="1"/><path d="m5 9 11 9 11-9"/></svg>
}

function WhatsAppIcon() {
  return <svg className="whatsapp-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3.5A12 12 0 0 0 5.7 21.6L4 28l6.6-1.7A12 12 0 1 0 16 3.5Z"/><path d="M12.1 10.4c.3-.7.6-.7 1-.7h.7c.2 0 .5.1.6.5l1 2.3c.1.3.1.5-.1.7l-.7.9c-.2.2-.3.4-.1.7.3.5 1 1.6 2.1 2.4 1.3 1 2.4 1.3 2.8 1.4.3.1.5 0 .7-.2l1-1.2c.2-.3.5-.3.8-.2l2.2 1c.3.1.5.3.5.5s-.2 1.3-.9 1.9c-.7.7-1.7 1-2.8.8-1.1-.2-2.6-.7-4.5-1.9-2.4-1.5-4-3.8-4.5-4.6-.5-.8-1.2-2.1-1.2-3.3 0-1.2.6-1.9.9-2.2Z"/></svg>
}

function toTitleCase(value = '') {
  return value.toLocaleLowerCase('es-CL').replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-CL'))
}

function ClockIcon() {
  return <svg className="small-icon clock-icon" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5"/><path d="M16 8v8l5 3"/></svg>
}

function TimelineIcon({ name }) {
  if (name === 'ring') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 9.5 16 4l4 5.5M16 4v5m-1.2-3h2.4M16 9.5a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z"/></svg>
  if (name === 'church') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 20v-9l6-4 6 4v9M10 20v-5a2 2 0 0 1 4 0v5M12 2v5m-2.5-2.5h5"/><circle cx="12" cy="11" r="1.5"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6l-1 6a3 3 0 0 1-6 0L2 4m5 9v7m-3 0h6M14 4h6l-1 6a3 3 0 0 1-6 0l-1-6m5 9v7m-3 0h6M7 7h3m7 0h3"/><path d="m11 7 1-2 1 2"/></svg>
}

function Access({ message }) { return <main className="access-screen"><div className="access-card"><span className="monogram">D&amp;N</span><p className="eyebrow">Invitación</p><h2>{message}</h2><p>Si crees que es un error, contacta a Dayana o Nicolás.</p></div></main> }
function getRemainingTime(target) { const diff = Math.max(0, new Date(target).getTime() - Date.now()); const total = Math.floor(diff / 1000); return { Días: Math.floor(total / 86400), Horas: Math.floor((total % 86400) / 3600), Min: Math.floor((total % 3600) / 60), Seg: total % 60 } }
function getStoredGuests() { try { return JSON.parse(localStorage.getItem('boda-dayana-nicolas-guests') || '[]') } catch { return [] } }
function saveStoredGuests(guests) { try { localStorage.setItem('boda-dayana-nicolas-guests', JSON.stringify(guests)) } catch {} }

export default App
