(() => {
  const selector = '[data-calculator-logo]'
  const states = new WeakMap()

  const findStage = target => target instanceof Element ? target.closest(selector) : null
  const getState = stage => {
    let state = states.get(stage)
    if (!state) {
      state = { pointerId: null, startX: 0, startY: 0, lastEvent: null, frame: 0, timers: [] }
      states.set(stage, state)
    }
    return state
  }

  const clearTimers = state => {
    state.timers.forEach(window.clearTimeout)
    state.timers.length = 0
  }

  const setTimer = (state, callback, delay) => {
    const timer = window.setTimeout(callback, delay)
    state.timers.push(timer)
    return timer
  }

  const applyPointerPose = (stage, event) => {
    const rect = stage.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    stage.style.setProperty('--logo-tilt-x', `${((.5 - y) * 18).toFixed(2)}deg`)
    stage.style.setProperty('--logo-tilt-y', `${((x - .5) * 22).toFixed(2)}deg`)
    stage.style.setProperty('--logo-tilt-z', `${((x - .5) * 2.4).toFixed(2)}deg`)
    stage.style.setProperty('--logo-light-x', `${(18 + x * 64).toFixed(1)}%`)
    stage.style.setProperty('--logo-light-y', `${(14 + y * 50).toFixed(1)}%`)
  }

  const schedulePointerPose = (stage, event) => {
    const state = getState(stage)
    state.lastEvent = event
    if (state.frame) return
    state.frame = window.requestAnimationFrame(() => {
      state.frame = 0
      if (state.lastEvent) applyPointerPose(stage, state.lastEvent)
    })
  }

  const resetPose = stage => {
    stage.style.setProperty('--logo-tilt-x', '0deg')
    stage.style.setProperty('--logo-tilt-y', '0deg')
    stage.style.setProperty('--logo-tilt-z', '0deg')
    stage.style.setProperty('--logo-light-x', '32%')
    stage.style.setProperty('--logo-light-y', '24%')
  }

  const release = (stage, event, cancelled = false) => {
    const state = getState(stage)
    if (state.pointerId !== null && event.pointerId !== state.pointerId) return

    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY)
    state.pointerId = null
    stage.classList.remove('is-logo-pressed')
    stage.classList.add('is-logo-rebound')

    if (!cancelled && distance < 10) {
      stage.classList.remove('is-logo-impact')
      void stage.offsetWidth
      stage.classList.add('is-logo-impact', 'is-logo-boosted')
    }

    resetPose(stage)
    clearTimers(state)
    setTimer(state, () => stage.classList.remove('is-logo-rebound'), 220)
    setTimer(state, () => stage.classList.remove('is-logo-impact'), 760)
    setTimer(state, () => stage.classList.remove('is-logo-boosted'), 1150)
  }

  document.addEventListener('pointerdown', event => {
    const stage = findStage(event.target)
    if (!stage || event.button > 0) return

    const state = getState(stage)
    clearTimers(state)
    state.pointerId = event.pointerId
    state.startX = event.clientX
    state.startY = event.clientY
    stage.classList.remove('is-logo-rebound', 'is-logo-impact')
    stage.classList.add('is-logo-pressed')
    schedulePointerPose(stage, event)

    try { stage.setPointerCapture(event.pointerId) } catch { /* Progressive enhancement. */ }
  }, { passive: true })

  document.addEventListener('pointermove', event => {
    const stage = findStage(event.target)
    if (!stage) return
    const state = getState(stage)
    if (state.pointerId !== null && state.pointerId !== event.pointerId) return
    schedulePointerPose(stage, event)
  }, { passive: true })

  document.addEventListener('pointerup', event => {
    const stage = findStage(event.target)
    if (stage) release(stage, event)
  }, { passive: true })

  document.addEventListener('pointercancel', event => {
    const stage = findStage(event.target)
    if (stage) release(stage, event, true)
  }, { passive: true })

  document.addEventListener('pointerout', event => {
    const stage = findStage(event.target)
    if (!stage || stage.contains(event.relatedTarget)) return
    const state = getState(stage)
    if (state.pointerId === null) resetPose(stage)
  }, { passive: true })
})()
