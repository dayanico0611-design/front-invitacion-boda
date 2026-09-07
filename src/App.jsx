import { useEffect, useRef, useState } from 'react'
import './App.css'
import data from './invitationData.json'

function App() {
  const { couple, date, hero, envelope, intro, gallery, program, locations, details, gifts, rsvp, footer } = data
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [remaining, setRemaining] = useState(getRemainingTime(date.iso))
  const [activeEvent, setActiveEvent] = useState(0)
  const [form, setForm] = useState({ nombre: '', attendance: '', guests: 1, note: '' })
  const [found, setFound] = useState(null)
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [sent, setSent] = useState(false)
  const [guestName, setGuestName] = useState('')
  const audio = useRef(null)
  const timelineRef = useRef(null)
  const endpoint = import.meta.env.VITE_RSVP_ENDPOINT
  const dressCode = details?.find((item) => item.icon === 'dress')?.text || 'Elegante'

  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemainingTime(date.iso)), 1000)
    return () => clearInterval(timer)
  }, [date.iso])

  useEffect(() => {
    audio.current = createRomanticMusic()
    return () => audio.current?.stop?.()
  }, [])

  useEffect(() => {
    const section = timelineRef.current
    if (!section) return
    const items = [...section.querySelectorAll('.timeline article')]
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActiveEvent(Number(visible.target.dataset.index))
    }, { rootMargin: '-35% 0px -45% 0px', threshold: [0, .25, .5, .75, 1] })
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [open, program.length])

  const toggleMusic = () => {
    if (!audio.current) return
    if (playing) {
      audio.current.stop()
      setPlaying(false)
    } else {
      audio.current.start()
      setPlaying(true)
    }
  }

  const openInvitation = () => {
    setOpen(true)
    if (!playing) {
      audio.current?.start()
      setPlaying(true)
    }
    setTimeout(() => document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' }), 350)
  }

  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: name === 'guests' ? Math.max(1, Math.min(Number(value) || 1, found?.adicionales || 10)) : value }))
  }

  const searchGuest = async () => {
    const name = form.nombre.trim()
    if (!name) return setStatus({ type: 'error', message: 'Escribe tu nombre para buscar.' })
    setStatus({ type: 'loading', message: 'Buscando tu nombre...' })
    try {
      if (!endpoint) {
        const local = getStoredGuests().find((guest) => normalizeGuestName(guest.name) === normalizeGuestName(name))
        if (!local) throw new Error('No encontramos tu nombre en la lista.')
        setFound({ nombre: local.name, adicionales: Math.max(1, Number(local.guests) || 1) })
        setStatus({ type: 'success', message: '¡Te encontramos! Completa tu confirmación.' })
        return
      }
      const response = await fetch(endpoint, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'buscar-invitado', nombre: name }) })
      const result = await response.json()
      if (!result.found) throw new Error(result.message || 'No encontramos tu nombre.')
      setFound(result)
      setStatus({ type: 'success', message: '¡Te encontramos! Completa tu confirmación.' })
    } catch (error) {
      setFound(null)
      setStatus({ type: 'error', message: error.message })
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.nombre.trim() || !form.attendance) return setStatus({ type: 'error', message: 'Completa tu nombre y asistencia.' })
    setStatus({ type: 'loading', message: 'Guardando tu confirmación...' })
    const token = new URLSearchParams(window.location.search).get('token')
    const payload = { token, name: found?.nombre || form.nombre.trim(), nombre: found?.nombre || form.nombre.trim(), asistencia: form.attendance, attendance: form.attendance, guests: Number(form.guests) || 1, invitados: Number(form.guests) || 1, note: form.note.trim(), nota: form.note.trim(), event: 'boda-dayana-nicolas' }
    try {
      if (endpoint) {
        const response = await fetch(endpoint, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!response.ok) throw new Error('No pudimos guardar la confirmación.')
      }
      saveStoredGuests([{ id: Date.now(), name: payload.name, attendance: payload.attendance, guests: payload.guests, note: payload.note, createdAt: new Date().toISOString() }, ...getStoredGuests()].slice(0, 200))
      setGuestName(payload.name)
      setSent(true)
      setStatus({ type: 'success', message: 'Tu confirmación quedó registrada.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  if (endpoint) {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) return <Access message="Este enlace requiere un acceso de invitado." />
  }

  return <main className={open ? 'site is-open' : 'site'}>
    {!open ? <section className="cover-screen"><div className="cover-botanical botanical-left">❦</div><div className="cover-botanical botanical-right">❧</div><div className="cover-card"><p className="eyebrow">{envelope.overline}</p><span className="monogram">{couple.shortMark}</span><p className="cover-small">NOS CASAMOS</p><h1>{couple.bride}<i>&amp;</i>{couple.groom}</h1><div className="fine-line"/><p className="cover-date">{date.display}</p><p className="cover-message">{envelope.message}</p><button className="text-button" onClick={openInvitation}>Entrar a la invitación <span>↓</span></button></div></section> : <>
      <header className="floating-nav"><a href="#inicio" className="nav-mark">D&amp;N</a><nav><a href="#historia">Historia</a><a href="#fecha">Fecha</a><a href="#dia">El día</a><a href="#fotos">Fotos</a><a href="#rsvp">Confirmar</a></nav><button className="music-button" onClick={toggleMusic} aria-label="Activar o pausar música"><span className={playing ? 'music-bars playing' : 'music-bars'}><i/><i/><i/></span>{playing ? 'Pausa' : 'Música'}</button></header>
      <section className="hero" id="inicio"><div className="hero-image" style={{ backgroundImage: `url("${hero.image}")` }}/><div className="hero-wash"/><div className="hero-frame"/><div className="hero-content"><p className="eyebrow">{hero.overline}</p><span className="monogram light">{couple.shortMark}</span><h2>{couple.bride}<i>&amp;</i>{couple.groom}</h2><div className="hero-rule"/><p>{hero.location}</p></div><div className="scroll-note">desliza <span>↓</span></div></section>
      <section className="welcome" id="historia"><div className="welcome-copy"><p className="eyebrow">{intro.overline}</p><h2>{intro.headline}<em>{intro.headlineEmphasis}</em></h2><p>{intro.text}</p><span className="signature">D &amp; N</span></div><div className="welcome-photo"><img src={gallery[1]?.image || hero.image} alt="Dayana y Nicolás"/><span className="photo-caption">un día para recordar</span></div></section>
      <section className="date-section" id="fecha"><div className="date-side"><span>20</span><small>02 · 2027</small></div><div className="date-main"><p className="eyebrow">Guarda esta fecha</p><h2>{date.day}<br/><em>{date.month}</em><br/>{date.year}</h2><p className="date-description">Queremos celebrar este comienzo junto a las personas que más queremos.</p><a className="line-link" href={data.calendar?.maps} target="_blank" rel="noreferrer">Ver ubicación ↗</a></div><div className="date-detail"><p><span>La ceremonia</span>{locations.church.time}<br/>{locations.church.name}</p><p><span>La celebración</span>{locations.venue.time}<br/>{locations.venue.name}</p></div></section>
      <section className="countdown"><p className="eyebrow">La cuenta regresiva</p><h2>Cada día falta un poquito menos.</h2><div className="count-grid">{Object.entries(remaining).map(([key, value]) => <div key={key}><strong>{String(value).padStart(2, '0')}</strong><span>{key}</span></div>)}</div></section>
      <section className="day-section" id="dia"><div className="section-intro"><p className="eyebrow">20 · 02 · 2027</p><h2>Así imaginamos<br/><em>nuestro día.</em></h2></div><div className="day-layout" ref={timelineRef}><div className="day-stage"><div className="day-photo"><img src={gallery[activeEvent % gallery.length]?.image || hero.image} alt={gallery[activeEvent % gallery.length]?.alt || 'Nuestra historia'}/><div className="day-photo-meta"><span>Momento {String(activeEvent + 1).padStart(2, '0')}</span><strong>{program[activeEvent]?.title}</strong></div></div><div className="day-progress" aria-hidden="true"><span style={{ height: `${((activeEvent + 1) / Math.max(program.length, 1)) * 100}%` }}/></div></div><div className="timeline">{program.map((item, index) => <article key={item.title} data-index={index} className={index === activeEvent ? 'is-active' : ''}><span className="timeline-number">0{index + 1}</span><div><small>{item.time}</small><h3>{item.title}</h3><p>{item.description}</p></div><span className="timeline-dot"/></article>)}</div></div></section>
      <section className="places-section"><div className="places-heading"><p className="eyebrow">Dónde nos encontramos</p><h2>Dos lugares,<br/><em>una celebración.</em></h2></div><div className="place place-one"><span className="place-number">01</span><p className="eyebrow">{locations.church.label}</p><h3>{locations.church.name}</h3><strong>{locations.church.time}</strong><p>{locations.church.description}</p><a className="line-link" href={locations.church.maps} target="_blank" rel="noreferrer">Abrir mapa ↗</a></div><div className="place place-two"><span className="place-number">02</span><p className="eyebrow">{locations.venue.label}</p><h3>{locations.venue.name}</h3><strong>{locations.venue.time}</strong><p>{locations.venue.description}</p><a className="line-link" href={locations.venue.maps} target="_blank" rel="noreferrer">Abrir mapa ↗</a></div></section>
      <section className="dress-section"><div className="dress-art">✽</div><p className="eyebrow">Dress code</p><h2>{dressCode}</h2><p>Queremos que todo se sienta tan especial como este día. Evitemos blanco, negro y azul para que los novios sean los protagonistas.</p></section>
      <section className="gallery-section" id="fotos"><div className="gallery-title"><p className="eyebrow">Algunos de nuestros momentos</p><h2>Un poquito<br/><em>de nosotros.</em></h2></div><div className="editorial-gallery">{gallery.map((item, index) => <figure key={item.image} className={`gallery-item gallery-${index + 1}`}><img src={item.image} alt={item.alt}/><figcaption><span>0{index + 1}</span>{item.caption}</figcaption></figure>)}</div></section>
      <section className="gift-section" id="regalos"><div className="gift-copy"><p className="eyebrow">Mesa de regalos</p><h2>Lo más importante es que estén con nosotros.</h2><p>{gifts.description}</p></div><div className="gift-card"><span className="gift-symbol">♧</span><p>{gifts.store}</p><strong>{gifts.code || 'Lista de novios'}</strong><a href="https://club.noviosparis.cl/home/couple-catalog/21046698" target="_blank" rel="noreferrer">Ver lista de regalos ↗</a></div></section>
      <section className="rsvp-section" id="rsvp"><div className="rsvp-intro"><span className="monogram">D&amp;N</span><p className="eyebrow">{rsvp.overline}</p><h2>{rsvp.title}</h2><p>{rsvp.description}</p></div>{sent ? <div className="success-card"><span>♥</span><h3>Gracias, {guestName}.</h3><p>{rsvp.successText}</p></div> : <form onSubmit={submit}><label>Tu nombre<input name="nombre" value={form.nombre} onChange={change} placeholder="Escribe tu nombre" required/></label><button type="button" className="secondary-button" onClick={searchGuest} disabled={!form.nombre.trim()}>Buscar mi nombre</button><label>¿Nos acompañas?<select name="attendance" value={form.attendance} onChange={change} required><option value="" disabled>Selecciona una opción</option>{rsvp.attendanceOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label>Personas<input name="guests" type="number" min="1" max={found?.adicionales || 10} value={form.guests} onChange={change}/></label><label>Un mensaje para los novios<textarea name="note" value={form.note} onChange={change} placeholder="Algo que quieras contarnos..."/></label>{status.type !== 'idle' && <p className={`form-status ${status.type}`}>{status.message}</p>}<button type="submit" className="submit-button">Confirmar asistencia <span>↗</span></button></form>}</section>
      <footer className="footer"><span className="monogram light">{couple.shortMark}</span><p>{footer}</p><small>{date.display}</small></footer>
    </>}
  </main>
}

function createRomanticMusic() {
  let ctx = null
  let timer = null
  let active = false
  const notes = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 349.23, 440, 523.25, 440, 349.23]
  let index = 0
  const playNote = () => {
    if (!ctx || !active) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = notes[index % notes.length]
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 2.25)
    index += 1
  }
  return {
    start() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); active = true; ctx.resume(); playNote(); timer = setInterval(playNote, 900) },
    stop() { active = false; clearInterval(timer); if (ctx) ctx.suspend() },
  }
}

function Access({ message }) { return <main className="access-screen"><div className="access-card"><span className="monogram">D&amp;N</span><p className="eyebrow">Invitación</p><h2>{message}</h2><p>Si crees que es un error, contacta a Dayana o Nicolás.</p></div></main> }
function getRemainingTime(target) { const diff = Math.max(0, new Date(target).getTime() - Date.now()); const total = Math.floor(diff / 1000); return { Días: Math.floor(total / 86400), Horas: Math.floor((total % 86400) / 3600), Min: Math.floor((total % 3600) / 60), Seg: total % 60 } }
function normalizeGuestName(value = '') { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ') }
function getStoredGuests() { try { return JSON.parse(localStorage.getItem('boda-dayana-nicolas-guests') || '[]') } catch { return [] } }
function saveStoredGuests(guests) { try { localStorage.setItem('boda-dayana-nicolas-guests', JSON.stringify(guests)) } catch {} }

export default App
