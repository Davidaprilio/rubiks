import { vi } from 'vitest'
import '@/utils/number'

// --- Mock Three.js ---
vi.mock('three', () => {
  const Vector3 = class {
    x = 0; y = 0; z = 0
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this }
    multiplyScalar(s: number) { this.x *= s; this.y *= s; this.z *= s; return this }
    map(fn: (v: number) => number) { return [fn(this.x), fn(this.y), fn(this.z)] }
  }
  const Euler = class {
    x = 0; y = 0; z = 0
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z }
  }
  const Matrix4 = class {
    elements = new Array(16).fill(0)
  }
  const Object3D = class {
    name = ''
    position = new Vector3()
    rotation = new Euler()
    up = new Vector3(0, 1, 0)
    scale = { setScalar: vi.fn() }
    matrix = new Matrix4()
    userData: Record<string, unknown> = {}
    children: unknown[] = []
    add(child: unknown) { this.children.push(child) }
    remove(child: unknown) {
      const idx = this.children.indexOf(child)
      if (idx >= 0) this.children.splice(idx, 1)
    }
    lookAt() {}
    applyMatrix4() {}
  }
  const Mesh = class extends Object3D {
    material: unknown
    constructor(_geometry?: unknown, material?: unknown) {
      super()
      this.material = material
    }
  }
  const BoxGeometry = class {}
  const PlaneGeometry = class {}
  const Color = class {
    constructor(public hex?: string | number) {}
  }
  const MeshPhongMaterial = class {
    color: unknown
    side: unknown
    opacity = 1
    transparent = false
    needsUpdate = false
    emissive: unknown
    emissiveIntensity = 0
    constructor(opts?: Record<string, unknown>) {
      if (opts) {
        this.color = opts.color
        this.side = opts.side
      }
    }
  }

  return {
    Object3D,
    Mesh,
    BoxGeometry,
    PlaneGeometry,
    Color,
    MeshPhongMaterial,
    FrontSide: 0,
    Vector3,
  }
})

// --- Mock troika-three-text ---
vi.mock('troika-three-text', () => {
  return {
    Text: class {
      text = ''
      visible = true
      fontSize = 0.1
      color = 'white'
      anchorX = 'center'
      anchorY = 'middle'
      fillOpacity = 1
      opacity = 1
      textAlign = 'left'
      name = ''
      position = { x: 0, y: 0, z: 0, set: vi.fn().mockReturnThis(), multiplyScalar: vi.fn().mockReturnThis() }
      rotation = { x: 0, y: 0, z: 0 }
      sync() {}
    }
  }
})

// --- Mock gsap ---
// Execute onComplete callbacks immediately so twist() resolves synchronously in tests.
vi.mock('gsap', () => {
  const gsap = {
    to: (_target: unknown, vars: Record<string, unknown>) => {
      // Apply numeric properties to the target
      if (typeof _target === 'object' && _target !== null) {
        for (const [key, value] of Object.entries(vars)) {
          if (typeof value === 'number' && key !== 'duration') {
            (_target as Record<string, unknown>)[key] = value
          }
        }
      }
      if (typeof vars.onUpdate === 'function') vars.onUpdate()
      if (typeof vars.onStart === 'function') vars.onStart()
      if (typeof vars.onComplete === 'function') vars.onComplete()
    },
  }
  return { default: gsap, gsap }
})
