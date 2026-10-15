import { useState } from 'react'

export default function SongSuggestions() {
  const [expanded, setExpanded] = useState(false)
  const [song, setSong] = useState('')
  const [artist, setArtist] = useState('')
  const [name, setName] = useState('')
  const message = `¡Hola, Dayana y Nicolás! Me gustaría sugerir una canción para la playlist de su boda:\n\nCanción: ${song.trim()}\nArtista: ${artist.trim()}${name.trim() ? `\nDe parte de: ${name.trim()}` : ''}`

  return <section className="editorial-playlist" id="playlist" aria-labelledby="playlist-heading">
    <svg className="playlist-note" viewBox="0 0 48 48" aria-hidden="true"><path d="M18 33V12l23-5v21M18 19l23-5"/><ellipse cx="11" cy="35" rx="7" ry="5" transform="rotate(-22 11 35)"/><ellipse cx="34" cy="30" rx="7" ry="5" transform="rotate(-22 34 30)"/></svg>
    <p className="eyebrow">La música también la elegimos juntos</p>
    <h2 id="playlist-heading">Nuestra playlist</h2>
    <span className="playlist-rule" aria-hidden="true" />
    <p className="playlist-copy">¿Qué canción te hará salir a bailar?<br/>Ayúdanos a llenar la pista toda la noche.</p>
    <button className="playlist-add" type="button" aria-expanded={expanded} aria-controls="playlist-form" onClick={() => setExpanded(!expanded)}>{expanded ? 'Cerrar formulario' : 'Añadir canción'}<span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
    <form id="playlist-form" className="playlist-form" hidden={!expanded} action="https://wa.me/56984357593" method="get" target="_blank" rel="noopener noreferrer">
      <input type="hidden" name="text" value={message} />
      <label htmlFor="suggested-song">Canción<input id="suggested-song" value={song} onChange={event => setSong(event.target.value)} placeholder="Nombre de la canción" maxLength={150} required pattern=".*\S.*" /></label>
      <label htmlFor="suggested-artist">Artista<input id="suggested-artist" value={artist} onChange={event => setArtist(event.target.value)} placeholder="¿Quién la canta?" maxLength={150} required pattern=".*\S.*" /></label>
      <label htmlFor="suggested-by">Tu nombre <span>(opcional)</span><input id="suggested-by" value={name} onChange={event => setName(event.target.value)} placeholder="Para saber quién puso el ritmo" autoComplete="name" maxLength={100} /></label>
      <p className="playlist-help">Se abrirá WhatsApp con tu sugerencia lista para enviárnosla.</p>
      <button className="playlist-send" type="submit">Enviar por WhatsApp <span aria-hidden="true">→</span></button>
    </form>
  </section>
}
