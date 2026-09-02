# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps-script-rsvp.spec.js >> Flujo real de invitación con Apps Script >> debe cargar la invitación publicada y mostrar el formulario principal
- Location: e2e\apps-script-rsvp.spec.js:36:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Dayana"
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 10000ms
  - waiting for locator('h1')

```

```yaml
- main:
  - paragraph: Acceso restringido
  - heading "Este enlace no corresponde a un invitado activo." [level=2]
  - paragraph: Si crees que es un error, contacta a Dayana o Nicolás.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | const APP_SCRIPT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxG1mIPsGD7bdPl1BoUpvQrGUUQZSWcb8-K1E1fPzR_BcouOj3I3W6lZfq4f3jczgPj-w/exec'
  4  | 
  5  | test.describe('Flujo real de invitación con Apps Script', () => {
  6  |   test('debe mostrar la invitación y validar acceso por token', async ({ page }) => {
  7  |     const token = 'INVALIDTOKEN'
  8  |     const pageUrl = `/?token=${encodeURIComponent(token)}`
  9  | 
  10 |     await page.goto(pageUrl)
  11 | 
  12 |     await expect(page.locator('text=Acceso restringido').first()).toBeVisible({ timeout: 15000 })
  13 |     await expect(page.locator('h2')).toContainText('Este enlace no corresponde a un invitado activo.')
  14 | 
  15 |     const response = await page.request.get(`${APP_SCRIPT_ENDPOINT}?token=${encodeURIComponent(token)}`)
  16 |     expect(response.status()).toBe(200)
  17 | 
  18 |     const payload = await response.json()
  19 |     expect(payload.found).toBe(false)
  20 |     expect(payload.message).toMatch(/Token no encontrado|acceso activo|Falta token/i)
  21 |   })
  22 | 
  23 |   test('debe responder al backend de Apps Script para buscar un invitado por nombre', async ({ request }) => {
  24 |     const response = await request.post(APP_SCRIPT_ENDPOINT, {
  25 |       data: {
  26 |         action: 'buscar-invitado',
  27 |         nombre: 'Dayana'
  28 |       }
  29 |     })
  30 | 
  31 |     expect(response.status()).toBe(200)
  32 |     const payload = await response.json()
  33 |     expect(payload).toHaveProperty('found')
  34 |   })
  35 | 
  36 |   test('debe cargar la invitación publicada y mostrar el formulario principal', async ({ page }) => {
  37 |     await page.goto('/')
  38 | 
> 39 |     await expect(page.locator('h1')).toContainText('Dayana')
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  40 |     await expect(page.locator('h1')).toContainText('Nicolás')
  41 |     await expect(page.locator('text=¿Nos acompañas?')).toBeVisible()
  42 |     await expect(page.locator('input[name="nombre"]')).toBeVisible()
  43 |   })
  44 | })
  45 | 
```