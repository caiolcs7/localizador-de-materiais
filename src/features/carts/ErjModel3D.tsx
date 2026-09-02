import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const initialCameraPosition = new THREE.Vector3(5.3, 3.2, 6.4)
const modelTarget = new THREE.Vector3(0, 0, -0.25)

function cylinder(
  radius: number,
  depth: number,
  material: THREE.Material,
  z: number,
  segments = 64,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material)
  mesh.rotation.x = Math.PI / 2
  mesh.position.z = z
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function buildErjModel() {
  const group = new THREE.Group()
  group.name = 'ERJ — referência visual 3D'

  const body = new THREE.MeshStandardMaterial({ color: 0x52565b, metalness: 0.58, roughness: 0.46 })
  const darkBody = new THREE.MeshStandardMaterial({ color: 0x34383d, metalness: 0.62, roughness: 0.42 })
  const bezel = new THREE.MeshStandardMaterial({ color: 0xaeb3b8, metalness: 0.48, roughness: 0.4 })
  const diffuser = new THREE.MeshPhysicalMaterial({
    color: 0xfffbef,
    emissive: 0xffe5a6,
    emissiveIntensity: 0.22,
    roughness: 0.2,
    transmission: 0.08,
  })
  const led = new THREE.MeshStandardMaterial({
    color: 0xfff8dc,
    emissive: 0xffd890,
    emissiveIntensity: 4.2,
    roughness: 0.12,
  })
  const metal = new THREE.MeshStandardMaterial({ color: 0xd9dde1, metalness: 0.92, roughness: 0.18 })
  const brass = new THREE.MeshStandardMaterial({ color: 0xb88a24, metalness: 0.82, roughness: 0.28 })

  // Corpo circular e aros externos, observados nas vistas frontal e lateral.
  group.add(cylinder(2.08, 0.54, body, 0))
  group.add(cylinder(1.78, 0.7, darkBody, -0.42))

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.12, 16, 96), bezel)
  outerRing.position.z = 0.34
  outerRing.castShadow = true
  group.add(outerRing)

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.12, 16, 96), bezel)
  innerRing.position.z = 0.43
  innerRing.castShadow = true
  group.add(innerRing)
  group.add(cylinder(1.46, 0.08, diffuser, 0.49))

  // Aberturas radiais da borda frontal.
  const ventGeometry = new THREE.BoxGeometry(0.31, 0.075, 0.18)
  for (let index = 0; index < 32; index += 1) {
    const angle = (index / 32) * Math.PI * 2
    const vent = new THREE.Mesh(ventGeometry, bezel)
    vent.position.set(Math.cos(angle) * 1.85, Math.sin(angle) * 1.85, 0.39)
    vent.rotation.z = angle
    vent.castShadow = true
    group.add(vent)
  }

  // Distribuição visual dos pontos luminosos — sem pretensão de mapa elétrico.
  const ledGeometry = new THREE.SphereGeometry(0.055, 14, 10)
  const ledRings = [
    { radius: 0, count: 1, offset: 0 },
    { radius: 0.43, count: 6, offset: 0 },
    { radius: 0.79, count: 12, offset: Math.PI / 12 },
    { radius: 1.14, count: 18, offset: 0 },
  ]
  ledRings.forEach(({ radius, count, offset }) => {
    for (let index = 0; index < count; index += 1) {
      const angle = count === 1 ? 0 : (index / count) * Math.PI * 2 + offset
      const point = new THREE.Mesh(ledGeometry, led)
      point.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.56)
      group.add(point)
    }
  })

  const screwGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.035, 16)
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8
    const screw = new THREE.Mesh(screwGeometry, metal)
    screw.rotation.x = Math.PI / 2
    screw.position.set(Math.cos(angle) * 1.6, Math.sin(angle) * 1.6, 0.52)
    group.add(screw)
  }

  // Dissipadores traseiros radiais reproduzidos a partir das vistas traseiras.
  const longFinGeometry = new THREE.BoxGeometry(1.4, 0.065, 0.62)
  for (let index = 0; index < 32; index += 1) {
    const angle = (index / 32) * Math.PI * 2
    const fin = new THREE.Mesh(longFinGeometry, body)
    fin.position.set(Math.cos(angle) * 1.26, Math.sin(angle) * 1.26, -0.55)
    fin.rotation.z = angle
    fin.castShadow = true
    group.add(fin)
  }

  group.add(cylinder(1.05, 0.76, darkBody, -0.74))
  const shortFinGeometry = new THREE.BoxGeometry(0.76, 0.055, 0.72)
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2
    const fin = new THREE.Mesh(shortFinGeometry, body)
    fin.position.set(Math.cos(angle) * 0.66, Math.sin(angle) * 0.66, -0.88)
    fin.rotation.z = angle
    fin.castShadow = true
    group.add(fin)
  }

  group.add(cylinder(0.48, 0.92, body, -1.18, 48))
  group.add(cylinder(0.31, 0.38, darkBody, -1.81, 40))

  // Suporte em U e parafusos de articulação.
  const bracketGeometry = new THREE.BoxGeometry(0.16, 2.45, 0.19)
  ;[-1.52, 1.52].forEach(x => {
    const arm = new THREE.Mesh(bracketGeometry, darkBody)
    arm.position.set(x, 0.87, -1.03)
    arm.castShadow = true
    group.add(arm)
  })
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 0.19), darkBody)
  bridge.position.set(0, 2.08, -1.03)
  bridge.castShadow = true
  group.add(bridge)

  ;[-1.52, 1.52].forEach(x => {
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 24), metal)
    pivot.rotation.z = Math.PI / 2
    pivot.position.set(x, -0.08, -0.92)
    pivot.castShadow = true
    group.add(pivot)
  })

  const gland = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 18), brass)
  gland.rotation.z = Math.PI / 2
  gland.position.set(-0.42, -0.42, -1.58)
  group.add(gland)

  group.rotation.x = -0.08
  group.rotation.y = -0.18
  return group
}

export default function ErjModel3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const [autoRotate, setAutoRotate] = useState(() => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [error, setError] = useState('')

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let frame = 0
    let resizeObserver: ResizeObserver | null = null
    let renderer: THREE.WebGLRenderer | null = null

    try {
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf3f5f7)

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
      camera.position.copy(initialCameraPosition)
      cameraRef.current = camera

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.05
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.domElement.setAttribute('role', 'img')
      renderer.domElement.setAttribute('aria-label', 'Modelo 3D interativo da luminária ERJ')
      mount.appendChild(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.copy(modelTarget)
      controls.enableDamping = true
      controls.dampingFactor = 0.065
      controls.enablePan = false
      controls.minDistance = 5.2
      controls.maxDistance = 11
      controls.minPolarAngle = 0.28
      controls.maxPolarAngle = Math.PI - 0.28
      controls.autoRotate = autoRotate
      controls.autoRotateSpeed = 0.72
      controls.addEventListener('start', () => setAutoRotate(false))
      controls.update()
      controlsRef.current = controls

      scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6470, 2.3))
      const key = new THREE.DirectionalLight(0xffffff, 4.4)
      key.position.set(5, 7, 7)
      key.castShadow = true
      key.shadow.mapSize.set(1024, 1024)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xb7d5ff, 2.2)
      fill.position.set(-5, 1.5, 4)
      scene.add(fill)
      const rim = new THREE.DirectionalLight(0xffe6bf, 1.6)
      rim.position.set(1, 4, -6)
      scene.add(rim)

      const product = buildErjModel()
      scene.add(product)

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(5.5, 64),
        new THREE.ShadowMaterial({ color: 0x1b2430, opacity: 0.14 }),
      )
      floor.rotation.x = -Math.PI / 2
      floor.position.y = -2.38
      floor.position.z = -0.3
      floor.receiveShadow = true
      scene.add(floor)

      const resize = () => {
        const width = Math.max(mount.clientWidth, 1)
        const height = Math.max(mount.clientHeight, 1)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer?.setSize(width, height, false)
      }
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(mount)
      resize()

      const animate = () => {
        controls.update()
        renderer?.render(scene, camera)
        frame = window.requestAnimationFrame(animate)
      }
      animate()

      return () => {
        window.cancelAnimationFrame(frame)
        resizeObserver?.disconnect()
        controls.dispose()
        scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach(material => material.dispose())
        })
        renderer?.dispose()
        renderer?.domElement.remove()
        controlsRef.current = null
        cameraRef.current = null
      }
    } catch {
      renderer?.dispose()
      renderer?.domElement.remove()
      setError('O modelo 3D não pôde ser iniciado neste dispositivo. As fotos da ERJ continuam disponíveis abaixo.')
    }
  }, [])

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate
  }, [autoRotate])

  const rotate = (direction: -1 | 1) => {
    const controls = controlsRef.current
    const camera = cameraRef.current
    if (!controls || !camera) return
    setAutoRotate(false)
    const offset = camera.position.clone().sub(controls.target)
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * Math.PI / 8)
    camera.position.copy(controls.target).add(offset)
    controls.update()
  }

  const reset = () => {
    const controls = controlsRef.current
    const camera = cameraRef.current
    if (!controls || !camera) return
    camera.position.copy(initialCameraPosition)
    controls.target.copy(modelTarget)
    controls.update()
    setAutoRotate(true)
  }

  return <div className="erj-model-shell">
    <div className="erj-model-stage" ref={mountRef}>
      {error && <div className="erj-model-error" role="status"><img src={`${import.meta.env.BASE_URL}luminarias/lum-erj-rear.webp`} alt="Vista traseira da luminária ERJ"/><span>{error}</span></div>}
      {!error && <div className="erj-model-hint">Arraste para girar · pinça ou roda para aproximar</div>}
    </div>
    {!error && <div className="erj-model-controls" aria-label="Controles do modelo 3D">
      <button type="button" onClick={() => rotate(-1)} aria-label="Girar modelo para a esquerda">← Girar</button>
      <button type="button" onClick={() => setAutoRotate(value => !value)}>{autoRotate ? 'Pausar rotação' : 'Rotação automática'}</button>
      <button type="button" onClick={reset}>Restaurar vista</button>
      <button type="button" onClick={() => rotate(1)} aria-label="Girar modelo para a direita">Girar →</button>
    </div>}
  </div>
}
