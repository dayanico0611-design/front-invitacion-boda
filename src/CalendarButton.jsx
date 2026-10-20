import { useEffect, useRef } from 'react'
import data from './invitationData.json'

const start = new Date(data.date.iso)
const end = new Date(`${data.date.year}-${data.date.month}-${String(Number(data.date.day) + 1).padStart(2, '0')}T04:00:00-03:00`)
const compactUtc = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
const title = data.calendar.title
const location = `${data.calendar.place}, ${data.calendar.address}`
const description = `¡Nos casamos!\n\nCeremonia: 20 de febrero de 2027 a las 17:45 hrs.\n${location}\nGoogle Maps: ${data.locations.church.maps}\n\nCelebración: desde las 19:30 hrs en ${data.locations.venue.name}.\n${data.locations.venue.address}\nGoogle Maps: ${data.locations.venue.maps}\n\nLa fiesta termina a las 04:00 hrs del 21 de febrero.\nHorarios de Chile (America/Santiago).`
const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${compactUtc(start)}/${compactUtc(end)}`, details: description, location, ctz: 'America/Santiago' })}`
const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?${new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: title, startdt: start.toISOString(), enddt: end.toISOString(), body: description, location })}`

export default function CalendarButton() {
  const menu = useRef(null)
  useEffect(() => {
    const closeOutside = event => { if (menu.current && !menu.current.contains(event.target)) menu.current.open = false }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])
  const close = () => { if (menu.current) menu.current.open = false }
  return <details className="save-calendar" ref={menu} onKeyDown={event => { if (event.key === 'Escape') { close(); menu.current?.querySelector('summary')?.focus() } }}>
    <summary><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/></svg>Guardar en mi calendario<span aria-hidden="true">⌄</span></summary>
    <div className="calendar-options">
      <a href={`${import.meta.env.BASE_URL}calendar/boda-dayana-nicolas.ics`} onClick={close}>iPhone / Apple Calendar <span aria-hidden="true">↓</span></a>
      <a href={google} target="_blank" rel="noopener noreferrer" onClick={close}>Google Calendar <span aria-hidden="true">↗</span></a>
      <a href={outlook} target="_blank" rel="noopener noreferrer" onClick={close}>Outlook <span aria-hidden="true">↗</span></a>
    </div>
  </details>
}
