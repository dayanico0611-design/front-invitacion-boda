import { test, expect } from '@playwright/test'

const APP_SCRIPT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxG1mIPsGD7bdPl1BoUpvQrGUUQZSWcb8-K1E1fPzR_BcouOj3I3W6lZfq4f3jczgPj-w/exec'
const SHEET_EXPORT_URL = 'https://docs.google.com/spreadsheets/d/1M5ATWnwBN_PjErZvZFKTCYv6wC1Kv7LipsBuOYNxSaI/export?format=csv'

async function getValidToken() {
  const response = await fetch(SHEET_EXPORT_URL)
  const csv = await response.text()
  const rows = csv.split(/\r?\n/).filter(Boolean).map((line) => line.split(','))

  for (const row of rows.slice(1)) {
    const token = (row[10] || '').trim()
    const activo = (row[11] || '').trim().toLowerCase()
    if (token && activo !== 'false' && activo !== '0' && activo !== 'no') {
      return token
    }
  }

  throw new Error('No se encontró ningún token activo en la hoja pública exportada.')
}

test.describe('Flujo real de invitación con Apps Script', () => {
  test('debe rechazar un token inválido', async ({ page }) => {
    const token = 'INVALIDTOKEN'
    const pageUrl = `/?token=${encodeURIComponent(token)}`

    await page.goto(pageUrl)

    await expect(page.locator('text=Acceso restringido').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h2')).toContainText('Este enlace no corresponde a un invitado activo.')

    const response = await page.request.get(`${APP_SCRIPT_ENDPOINT}?token=${encodeURIComponent(token)}`)
    expect(response.status()).toBe(200)

    const payload = await response.json()
    expect(payload.found).toBe(false)
    expect(payload.message).toMatch(/Token no encontrado|acceso activo|Falta token/i)
  })

  test('debe permitir el acceso con un token activo del CSV público', async ({ page }) => {
    const token = await getValidToken()
    await page.goto(`/?token=${encodeURIComponent(token)}`)

    await expect(page.locator('text=Invitación').first()).not.toBeVisible({ timeout: 5000 }).catch(() => undefined)
    await expect(page.locator('input[name="nombre"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('label')).toContainText('Tu nombre')
  })

  test('debe responder al backend de Apps Script para buscar un invitado por nombre', async ({ request }) => {
    const response = await request.post(APP_SCRIPT_ENDPOINT, {
      data: {
        action: 'buscar-invitado',
        nombre: 'Dayana'
      }
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload).toHaveProperty('found')
  })
})
