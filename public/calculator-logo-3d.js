(() => {
  const brandSelector = '.calculator-brand'
  const reboundTimers = new WeakMap()

  const getCalculatorBrand = (target) => {
    if (!(target instanceof Element)) return null
    const brand = target.closest(brandSelector)
    if (!brand) return null

    const logo = brand.querySelector('img[src*="calculator-logo.png"]')
    return logo ? brand : null
  }

  const clearReboundTimer = (brand) => {
    const timer = reboundTimers.get(brand)
    if (timer) window.clearTimeout(timer)
    reboundTimers.delete(brand)
  }

  document.addEventListener('pointerdown', (event) => {
    const brand = getCalculatorBrand(event.target)
    if (!brand) return

    clearReboundTimer(brand)
    brand.classList.remove('is-logo-rebound')
    brand.classList.add('is-logo-pressed')

    try {
      brand.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture is only an enhancement; the interaction still works without it.
    }
  }, { passive: true })

  document.addEventListener('pointerup', (event) => {
    const brand = getCalculatorBrand(event.target)
    if (!brand) return

    brand.classList.remove('is-logo-pressed')
    brand.classList.add('is-logo-rebound')

    clearReboundTimer(brand)
    const timer = window.setTimeout(() => {
      brand.classList.remove('is-logo-rebound')
      reboundTimers.delete(brand)
    }, 180)
    reboundTimers.set(brand, timer)
  }, { passive: true })

  document.addEventListener('pointercancel', (event) => {
    const brand = getCalculatorBrand(event.target)
    if (!brand) return
    brand.classList.remove('is-logo-pressed')
  }, { passive: true })

  document.addEventListener('lostpointercapture', (event) => {
    const brand = getCalculatorBrand(event.target)
    if (!brand) return
    brand.classList.remove('is-logo-pressed')
  }, { passive: true })
})()
