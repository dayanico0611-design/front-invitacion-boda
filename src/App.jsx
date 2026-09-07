import { useEffect, useRef, useState } from 'react'
import './App.css'
import data from './invitationData.json'

const musicUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'

function App() {
  const { couple, date, hero, envelope, intro, gallery, program, locations, details, gifts, rsvp, footer } = data
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [remaining, setRemaining] = useState(getRemainingTime(date.iso))
  const [form, setForm] = useState({ nombre: '', attendance: '', guests: 1, note: '' })
  const [found, setFound] = useState(null)
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [sent, setSent] = useState(false)
  const [guestName, setGuestName] = useState('')
  const audio = useRef(null)
  const endpoint = import.meta.env.VITE_RSVP_ENDPOINT
  const dressCode = details?.find((item) => item.icon === 'dress')?.text || 'Elegante'

  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemainingTime(date.iso)), 1000)
    return () => clearInterval(timer)
  }, [date.iso])

  useEffect(() => {
    const player = new Audio(musicUrl)
    player.loop = true
    player.volume = 0.18
    audio.current = player
    return () => { player.pause(); player.src = '' }
  }, [])

  const toggleMusic = async () => {
    if (!audio.current) return
    if (audio.current.paused) {
      try { await audio.current.play(); setPlaying(true) } catch (error) { console.error(error) }
    } else { audio.current.pause(); setPlaying(false) }
  }

  const openInvitation = async () => {
    setOpen(true)
    await toggleMusic()
    setTimeout(() => document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' }), 500)
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
    } catch (error) { setFound(null); setStatus({ type: 'error', message: error.message }) }
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
      const record = { id: Date.now(), name: payload.name, attendance: payload.attendance, guests: payload.guests, note: payload.note, createdAt: new Date().toISOString() }
      saveStoredGuests([record, ...getStoredGuests()].slice(0, 200))
      setGuestName(payload.name)
      setSent(true)
      setStatus({ type: 'success', message: 'Tu confirmación quedó registrada.' })
    } catch (error) { setStatus({ type: 'error', message: error.message }) }
  }

  if (endpoint) {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) return <Access message="Este enlace requiere un acceso de invitado." />
  }

  return <main className={open ? 'site is-open' : 'site'}>
    {!open ? <section className="cover-screen"><div className="cover-card"><div className="floral floral-a">✿</div><div className="floral floral-b">❀</div><p className="eyebrow">{envelope.overline}</p><span className="monogram">{couple.shortMark}</span><p className="cover-kicker">NOS CASAMOS</p><h1>{couple.bride} <i>&amp;</i> {couple.groom}</h1><div className="gold-line"/><p className="cover-date">{date.display}</p><p className="cover-message">{envelope.message}</p><button onClick={openInvitation}>Abrir invitación <span>↓</span></button></div></section> : <>
      <nav className="nav-pill"><a href="#historia">Historia</a><a href="#programa">El día</a><a href="#regalos">Regalos</a><a href="#rsvp">Confirmar</a><button onClick={toggleMusic}>{playing ? 'Pausa' : 'Música'}</button></nav>
      <section className="hero-editorial" id="inicio" style={{ '--hero-image': `url("${hero.image}")` }}><div className="hero-photo"/><div className="hero-overlay"/><div className="hero-copy"><p className="eyebrow">{hero.overline}</p><span className="monogram">{couple.shortMark}</span><h2>{couple.bride} <i>&amp;</i> {couple.groom}</h2><p className="hero-date">{date.day} · {date.month} · {date.year}</p><p>{hero.location}</p></div></section>
      <section className="paper intro" id="historia"><p className="eyebrow">{intro.overline}</p><h2>{intro.headline}<em>{intro.headlineEmphasis}</em></h2><p>{intro.text}</p><span className="ornament">❦</span></section>
      <section className="story section"><div className="section-heading"><p className="eyebrow">Nuestra historia</p><h2>Momentos que nos trajeron hasta aquí.</h2></div><div className="story-grid">{gallery.map((item, index) => <figure className={`photo-card photo-${index % 3}`} key={item.image}><img src={item.image} alt={item.alt}/><figcaption><span>0{index + 1}</span>{item.caption}</figcaption></figure>)}</div></section>
      <section className="save-date paper section" id="fecha"><div><p className="eyebrow">Reserva la fecha</p><h2>{date.display}</h2><p className="large-copy">{data.calendar.title}</p><p>{data.calendar.time}<br/><strong>{data.calendar.place}</strong><br/>{data.calendar.address}</p><a href={data.calendar.maps} target="_blank" rel="noreferrer">Ver ubicación ↗</a></div><div className="calendar-mark"><span>2027</span><strong>FEB</strong><b>20</b><small>SÁBADO</small></div></section>
      <section className="countdown-section"><p className="eyebrow">Falta cada vez menos</p><h2>Hasta nuestro gran día</h2><div className="countdown">{Object.entries(remaining).map(([key, value]) => <div key={key}><strong>{String(value).padStart(2, '0')}</strong><span>{key}</span></div>)}</div></section>
      <section className="program-section section" id="programa"><div className="section-heading"><p className="eyebrow">Itinerario</p><h2>El gran día</h2></div><div className="timeline">{program.map((item, index) => <article key={item.title}><span className="time">{item.time}</span><span className="dot">{index + 1}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div></section>
      <section className="locations section" id="ubicaciones"><div className="location-card"><span>01</span><p className="eyebrow">{locations.church.label}</p><h2>{locations.church.name}</h2><strong>{locations.church.time}</strong><p>{locations.church.description}</p><a href={locations.church.maps} target="_blank" rel="noreferrer">Google Maps ↗</a></div><div className="route-symbol">✦</div><div className="location-card"><span>02</span><p className="eyebrow">{locations.venue.label}</p><h2>{locations.venue.name}</h2><strong>{locations.venue.time}</strong><p>{locations.venue.description}</p><a href={locations.venue.maps} target="_blank" rel="noreferrer">Google Maps ↗</a></div></section>
      <section className="dress paper section"><p className="eyebrow">Código de vestimenta</p><h2>{dressCode}</h2><div className="dress-illustrations"><div>♧<span>Damas<br/>Vestido largo</span></div><div>♢<span>Caballeros<br/>Traje formal</span></div></div><p>Queremos que todo se sienta tan especial como este día. Evitemos blanco, negro y azul para que los novios sean los protagonistas.</p></section>
      <section className="gifts section" id="regalos"><div className="gift-copy"><p className="eyebrow">Mesa de regalos</p><h2>Tu presencia es nuestro mejor regalo.</h2><p>{gifts.description}</p></div><div className="gift-card"><span className="gift-icon">♧</span><p>{gifts.store}</p><strong>{gifts.code || 'Lista de novios'}</strong><a href="https://club.noviosparis.cl/home/couple-catalog/21046698" target="_blank" rel="noreferrer">Visitar lista ↗</a></div></section>
      <section className="rsvp section" id="rsvp"><div className="rsvp-heading"><p className="eyebrow">{rsvp.overline}</p><h2>{rsvp.title}</h2><p>{rsvp.description}</p></div>{sent ? <div className="success-card"><span>♥</span><h3>Gracias, {guestName}.</h3><p>{rsvp.successText}</p></div> : <form onSubmit={submit}><label>Tu nombre<input name="nombre" value={form.nombre} onChange={change} placeholder="Escribe tu nombre" required/></label><button type="button" className="secondary" onClick={searchGuest} disabled={!form.nombre.trim()}>Buscar mi nombre</button><label>¿Nos acompañas?<select name="attendance" value={form.attendance} onChange={change} required><option value="" disabled>Selecciona una opción</option>{rsvp.attendanceOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label>Personas<input name="guests" type="number" min="1" max={found?.adicionales || 10} value={form.guests} onChange={change}/></label><label>Mensaje para los novios<textarea name="note" value={form.note} onChange={change} placeholder="Algo que quieras contarnos..."/></label>{status.type !== 'idle' && <p className={`form-status ${status.type}`}>{status.message}</p>}<button type="submit">Confirmar asistencia ↗</button></form>}</section>
      <footer><span>{couple.shortMark}</span><p>{footer}</p><small>{date.display}</small></footer>
    </>}
  </main>
}

function Access({ message }) { return <main className="access-screen"><div className="access-card"><span className="monogram">D&amp;N</span><p className="eyebrow">Invitación</p><h2>{message}</h2><p>Si crees que es un error, contacta a Dayana o Nicolás.</p></div></main> }

function getRemainingTime(target) { const diff = Math.max(0, new Date(target).getTime() - Date.now()); const total = Math.floor(diff / 1000); return { Días: Math.floor(total / 86400), Horas: Math.floor((total % 86400) / 3600), Min: Math.floor((total % 3600) / 60), Seg: total % 60 } }
function normalizeGuestName(value = '') { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ') }
function getStoredGuests() { try { return JSON.parse(localStorage.getItem('boda-dayana-nicolas-guests') || '[]') } catch { return [] } }
function saveStoredGuests(guests) { try { localStorage.setItem('boda-dayana-nicolas-guests', JSON.stringify(guests)) } catch {} }
function NavIcon() { return null }

export default App
