# Invitación de boda Dayana y Nicolás

Proyecto de invitación web para la boda de Dayana y Nicolás, desarrollado con React + Vite.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Desarrollo local

```bash
npm run dev
```

## Build de producción

```bash
npm run build
```

## Variables de entorno

Crea un archivo `.env` con esta variable opcional:

```env
VITE_RSVP_ENDPOINT=https://tu-endpoint.com/api/rsvp
```

Si no se define esta variable, la aplicación seguirá funcionando visualmente, pero el envío de confirmación no se guardará en un backend real.

## Estructura principal

- `src/App.jsx`: lógica principal de la invitación y formulario RSVP.
- `src/invitationData.json`: contenido del evento, horario, ubicaciones y regalos.
- `src/App.css`: estilos visuales y responsividad.
- `public/`: activos estáticos.

## Flujo recomendado

1. Configurar el endpoint real del RSVP.
2. Verificar que el backend acepte los campos `nombre`, `attendance`, `guests`, `note` y `event`.
3. Probar la búsqueda de invitado y la confirmación final.
4. Desplegar la app en un hosting estático y mantener la lógica del formulario conectada al endpoint real.
