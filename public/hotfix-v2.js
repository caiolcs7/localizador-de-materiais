(() => {
  const DB_NAME = 'LocalizadorMateriaisDB'

  function cleanScannedCode(value) {
    let cleaned = String(value ?? '')
      .toUpperCase()
      .replace(/[\u0000-\u001F\u007F-\u009F\uFFFD\u25A0-\u25FF]/g, '')
      .replace(/[^A-Z0-9]/g, '')

    if (cleaned.startsWith('251')) cleaned = cleaned.slice(3)
    if (cleaned.endsWith('371')) cleaned = cleaned.slice(0, -3)
    return cleaned
  }

  function formatBombona(value) {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/B(\d{1,3})(?!\d)/g, (_match, digits) => `B${digits.padStart(3, '0')}`)
  }

  function setReactInputValue(input, value) {
    if (!input || input.value === value) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (setter) setter.call(input, value)
    else input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  function cleanSearchAfterScanner() {
    const inputs = [...document.querySelectorAll('input')].filter(input =>
      /Buscar código|Filtrar código/i.test(input.placeholder || '')
    )
    for (const input of inputs) {
      const cleaned = cleanScannedCode(input.value)
      if (cleaned && cleaned !== input.value) setReactInputValue(input, cleaned)
    }
  }

  let scannerWasOpen = false
  const observer = new MutationObserver(() => {
    const scannerIsOpen = Boolean(document.querySelector('.scanner-modal'))
    if (scannerWasOpen && !scannerIsOpen) {
      ;[0, 50, 150, 300].forEach(delay => setTimeout(cleanSearchAfterScanner, delay))
    }
    scannerWasOpen = scannerIsOpen
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })

  document.addEventListener('focusout', event => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return
    const label = input.closest('label')
    if (!label || !/^Bombona/i.test((label.textContent || '').trim())) return
    const formatted = formatBombona(input.value)
    if (formatted && formatted !== input.value) setReactInputValue(input, formatted)
  }, true)

  let migrating = false
  async function migrateBombonas() {
    if (migrating || !('indexedDB' in window)) return
    migrating = true
    try {
      if (typeof indexedDB.databases === 'function') {
        const databases = await indexedDB.databases()
        if (!databases.some(db => db.name === DB_NAME)) return
      }

      await new Promise(resolve => {
        const request = indexedDB.open(DB_NAME)
        request.onerror = () => resolve()
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('locations')) {
            db.close()
            resolve()
            return
          }

          const tx = db.transaction('locations', 'readwrite')
          const store = tx.objectStore('locations')
          let changed = 0
          const cursorRequest = store.openCursor()

          cursorRequest.onsuccess = event => {
            const cursor = event.target.result
            if (!cursor) return
            const record = cursor.value
            const formatted = formatBombona(record.bombona)
            if (formatted && formatted !== record.bombona) {
              record.bombona = formatted
              cursor.update(record)
              changed += 1
            }
            cursor.continue()
          }

          tx.oncomplete = () => {
            db.close()
            resolve()
            if (changed > 0) location.reload()
          }
          tx.onerror = () => {
            db.close()
            resolve()
          }
        }
      })
    } catch {
      // O aplicativo continua funcionando mesmo se o navegador bloquear a migração direta.
    } finally {
      migrating = false
    }
  }

  setTimeout(migrateBombonas, 1800)
  setInterval(migrateBombonas, 5000)
})()
