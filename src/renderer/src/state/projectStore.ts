import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type {
  AnimatablePropKey,
  BackgroundLayer,
  ClipSegment,
  EasingType,
  Layer,
  Project,
  Scene,
  SceneAudio,
  TextLayer
} from '@shared/types/project'
import { createBackgroundLayer, createMediaLayer, createProject, createScene, createShapeLayer, createTextLayer } from '../lib/factories'

const MIN_CLIP_DURATION = 0.2

interface ProjectState {
  project: Project
  filePath: string | null
  dirty: boolean
  currentSceneId: string
  selectedLayerId: string | null
  playhead: number
  isPlaying: boolean
  /** Quantas ações dá pra desfazer/refazer (pra habilitar o menu Editar). */
  undoCount: number
  redoCount: number
  /** Quando o projeto foi salvo pela última vez (pra mostrar o aviso "Salvo"). */
  savedAt: number

  currentScene: () => Scene
  selectedLayer: () => Layer | null

  newProject: () => void
  addScene: () => void
  selectScene: (sceneId: string) => void
  renameScene: (sceneId: string, name: string) => void
  deleteScene: (sceneId: string) => void
  setSceneDuration: (sceneId: string, duration: number) => void
  setSceneAudio: (sceneId: string, audio: SceneAudio | null) => void

  addTextLayer: (text?: string) => void
  addTextLayersFromSegments: (items: { text: string; start: number; end: number }[]) => void
  addBackgroundLayer: () => void
  addShapeLayer: (kind: import('@shared/types/project').ShapeKind) => void
  addMediaLayer: (file: { filePath: string; fileName: string }) => void
  addLayers: (layers: import('@shared/types/project').Layer[]) => void
  updateLayer: (layerId: string, patch: Record<string, unknown>) => void
  selectLayer: (layerId: string | null) => void
  updateTextLayer: (layerId: string, patch: Partial<TextLayer>) => void
  updateBackgroundFill: (layerId: string, fill: BackgroundLayer['fill']) => void
  reorderLayer: (layerId: string, direction: 'up' | 'down') => void
  resizeSegment: (layerId: string, segmentId: string, duration: number) => void
  splitLayerClip: (layerId: string, atTime: number) => void
  eraseSegment: (layerId: string, segmentId: string) => void
  toggleVisible: (layerId: string) => void
  toggleLocked: (layerId: string) => void
  duplicateLayer: (layerId: string) => void
  deleteLayer: (layerId: string) => void

  setTransformBase: <K extends AnimatablePropKey>(
    layerId: string,
    key: K,
    value: import('@shared/types/project').AnimatableProps[K]
  ) => void
  setKeyframe: <K extends AnimatablePropKey>(
    layerId: string,
    key: K,
    time: number,
    value: import('@shared/types/project').AnimatableProps[K],
    easing?: EasingType
  ) => void
  removeKeyframesForProp: (layerId: string, key: AnimatablePropKey) => void
  removeKeyframe: (layerId: string, key: AnimatablePropKey, keyframeId: string) => void

  setPlayhead: (time: number) => void
  play: () => void
  pause: () => void

  loadProject: (project: Project, filePath: string | null) => void
  markSaved: (filePath: string) => void
}

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() }
}

function mapScenes(project: Project, sceneId: string, fn: (scene: Scene) => Scene): Project {
  return touch({
    ...project,
    scenes: project.scenes.map((scene) => (scene.id === sceneId ? fn(scene) : scene))
  })
}

function mapLayer(scene: Scene, layerId: string, fn: (layer: Layer) => Layer): Scene {
  return { ...scene, layers: scene.layers.map((l) => (l.id === layerId ? fn(l) : l)) }
}

function findSceneWithLayer(project: Project, layerId: string): Scene | undefined {
  return project.scenes.find((s) => s.layers.some((l) => l.id === layerId))
}

/** Recorta os segmentos de cada layer para caberem numa nova duração de cena. */
function clampLayersToDuration(layers: Layer[], duration: number): Layer[] {
  return layers.map((l) => ({
    ...l,
    segments: l.segments
      .filter((seg) => seg.start < duration)
      .map((seg) => ({ ...seg, duration: Math.min(seg.duration, duration - seg.start) }))
  }))
}

export const useProjectStore = create<ProjectState>((set, get) => {
  const initialProject = createProject()

  return {
    project: initialProject,
    filePath: null,
    dirty: false,
    currentSceneId: initialProject.scenes[0].id,
    selectedLayerId: null,
    playhead: 0,
    isPlaying: false,
    undoCount: 0,
    redoCount: 0,
    savedAt: 0,

    currentScene: () => {
      const { project, currentSceneId } = get()
      return project.scenes.find((s) => s.id === currentSceneId) ?? project.scenes[0]
    },

    selectedLayer: () => {
      const { selectedLayerId } = get()
      if (!selectedLayerId) return null
      return get().currentScene().layers.find((l) => l.id === selectedLayerId) ?? null
    },

    newProject: () => {
      const project = createProject()
      set({
        project,
        filePath: null,
        dirty: false,
        currentSceneId: project.scenes[0].id,
        selectedLayerId: null,
        playhead: 0,
        isPlaying: false
      })
      resetHistory()
    },

    addScene: () => {
      const { project } = get()
      const scene = createScene(`Cena ${project.scenes.length + 1}`)
      set({
        project: touch({ ...project, scenes: [...project.scenes, scene] }),
        currentSceneId: scene.id,
        selectedLayerId: null,
        playhead: 0,
        dirty: true
      })
    },

    selectScene: (sceneId) => set({ currentSceneId: sceneId, selectedLayerId: null, playhead: 0 }),

    renameScene: (sceneId, name) => {
      const { project } = get()
      set({ project: mapScenes(project, sceneId, (s) => ({ ...s, name })), dirty: true })
    },

    deleteScene: (sceneId) => {
      const { project, currentSceneId } = get()
      if (project.scenes.length <= 1) return
      const scenes = project.scenes.filter((s) => s.id !== sceneId)
      const nextCurrent = sceneId === currentSceneId ? scenes[0].id : currentSceneId
      set({ project: touch({ ...project, scenes }), currentSceneId: nextCurrent, dirty: true })
    },

    setSceneDuration: (sceneId, duration) => {
      const { project } = get()
      const clamped = Math.max(1, duration)
      set({
        project: mapScenes(project, sceneId, (s) => ({
          ...s,
          duration: clamped,
          layers: clampLayersToDuration(s.layers, clamped)
        })),
        dirty: true
      })
    },

    /** Associa (ou remove) o áudio da cena. A duração da cena passa a acompanhar a música. */
    setSceneAudio: (sceneId, audio) => {
      const { project } = get()
      set({
        project: mapScenes(project, sceneId, (s) => {
          const duration = audio ? Math.max(1, audio.duration) : s.duration
          return {
            ...s,
            audio: audio ?? undefined,
            duration,
            layers: clampLayersToDuration(s.layers, duration)
          }
        }),
        dirty: true
      })
    },

    addTextLayer: (text = 'Novo texto') => {
      const { project, currentSceneId } = get()
      const scene = project.scenes.find((s) => s.id === currentSceneId)!
      const order = scene.layers.length
      const layer = createTextLayer(text, order, scene.duration)
      set({
        project: mapScenes(project, currentSceneId, (s) => ({ ...s, layers: [...s.layers, layer] })),
        selectedLayerId: layer.id,
        dirty: true
      })
    },

    addTextLayersFromSegments: (items) => {
      const { project, currentSceneId } = get()
      const scene = project.scenes.find((s) => s.id === currentSceneId)!
      const created = items.map((item, i) => {
        const layer = createTextLayer(item.text, scene.layers.length + i, scene.duration)
        const start = Math.min(Math.max(0, item.start), scene.duration)
        const duration = Math.max(0.5, Math.min(item.end, scene.duration) - start)
        return { ...layer, segments: [{ id: nanoid(), start, duration }] }
      })
      if (created.length === 0) return
      set({
        project: mapScenes(project, currentSceneId, (s) => ({ ...s, layers: [...s.layers, ...created] })),
        selectedLayerId: created[0].id,
        dirty: true
      })
    },

    addShapeLayer: (kind) => {
      const { project, currentSceneId } = get()
      const scene = project.scenes.find((s) => s.id === currentSceneId)!
      const layer = createShapeLayer(kind, scene.layers.length, scene.duration)
      set({
        project: mapScenes(project, currentSceneId, (s) => ({ ...s, layers: [...s.layers, layer] })),
        selectedLayerId: layer.id,
        dirty: true
      })
    },

    addMediaLayer: (file) => {
      const { project, currentSceneId } = get()
      const scene = project.scenes.find((s) => s.id === currentSceneId)!
      const layer = createMediaLayer(file, scene.layers.length, scene.duration)
      set({
        project: mapScenes(project, currentSceneId, (s) => ({ ...s, layers: [...s.layers, layer] })),
        selectedLayerId: layer.id,
        dirty: true
      })
    },

    /** Adiciona várias camadas prontas (ex.: compositor de frase); `order` é reatribuído. */
    addLayers: (layers) => {
      const { project, currentSceneId } = get()
      if (layers.length === 0) return
      const scene = project.scenes.find((s) => s.id === currentSceneId)!
      const withOrder = layers.map((l, i) => ({ ...l, order: scene.layers.length + i }))
      set({
        project: mapScenes(project, currentSceneId, (s) => ({ ...s, layers: [...s.layers, ...withOrder] })),
        selectedLayerId: withOrder[0].id,
        dirty: true
      })
    },

    updateLayer: (layerId, patch) => {
      const { project, currentSceneId } = get()
      set({
        project: mapScenes(project, currentSceneId, (s) =>
          mapLayer(s, layerId, (l) => ({ ...l, ...patch }) as typeof l)
        ),
        dirty: true
      })
    },

    addBackgroundLayer: () => {
      const { project, currentSceneId } = get()
      const scene = project.scenes.find((s) => s.id === currentSceneId)!
      const layer = createBackgroundLayer(scene.layers.length, scene.duration)
      set({
        project: mapScenes(project, currentSceneId, (s) => ({ ...s, layers: [...s.layers, layer] })),
        selectedLayerId: layer.id,
        dirty: true
      })
    },

    selectLayer: (layerId) => set({ selectedLayerId: layerId }),

    updateTextLayer: (layerId, patch) => {
      const { project, currentSceneId } = get()
      set({
        project: mapScenes(project, currentSceneId, (s) =>
          mapLayer(s, layerId, (l) => (l.type === 'text' ? { ...l, ...patch } : l))
        ),
        dirty: true
      })
    },

    updateBackgroundFill: (layerId, fill) => {
      const { project, currentSceneId } = get()
      set({
        project: mapScenes(project, currentSceneId, (s) =>
          mapLayer(s, layerId, (l) => (l.type === 'background' ? { ...l, fill } : l))
        ),
        dirty: true
      })
    },

    reorderLayer: (layerId, direction) => {
      const { project, currentSceneId } = get()
      set({
        project: mapScenes(project, currentSceneId, (s) => {
          const layers = [...s.layers].sort((a, b) => a.order - b.order)
          const idx = layers.findIndex((l) => l.id === layerId)
          const swapWith = direction === 'up' ? idx + 1 : idx - 1
          if (swapWith < 0 || swapWith >= layers.length) return s
          const a = layers[idx]
          const b = layers[swapWith]
          const orderTmp = a.order
          a.order = b.order
          b.order = orderTmp
          return { ...s, layers }
        }),
        dirty: true
      })
    },

    resizeSegment: (layerId, segmentId, duration) => {
      const { project, currentSceneId } = get()
      const scene = project.scenes.find((s) => s.id === currentSceneId)
      const layer = scene?.layers.find((l) => l.id === layerId)
      const segment = layer?.segments.find((seg) => seg.id === segmentId)
      if (!scene || !layer || !segment) return

      // não deixa crescer por cima do próximo segmento do mesmo layer
      const nextStart = layer.segments
        .filter((seg) => seg.start > segment.start)
        .reduce((min, seg) => Math.min(min, seg.start), scene.duration)
      const clamped = Math.min(Math.max(MIN_CLIP_DURATION, duration), nextStart - segment.start)

      set({
        project: mapScenes(project, currentSceneId, (s) =>
          mapLayer(s, layerId, (l) => ({
            ...l,
            segments: l.segments.map((seg) =>
              seg.id === segmentId ? { ...seg, duration: clamped } : seg
            )
          }))
        ),
        dirty: true
      })
    },

    /** Divide, no MESMO layer, o segmento que contém `atTime` em dois. Nunca cria um layer novo. */
    splitLayerClip: (layerId, atTime) => {
      const { project, currentSceneId } = get()
      const scene = project.scenes.find((s) => s.id === currentSceneId)
      const layer = scene?.layers.find((l) => l.id === layerId)
      if (!scene || !layer) return
      const segment = layer.segments.find(
        (seg) => atTime > seg.start + MIN_CLIP_DURATION && atTime < seg.start + seg.duration - MIN_CLIP_DURATION
      )
      if (!segment) return

      const newSegment: ClipSegment = {
        id: nanoid(),
        start: atTime,
        duration: segment.start + segment.duration - atTime
      }

      set({
        project: mapScenes(project, currentSceneId, (s) =>
          mapLayer(s, layerId, (l) => ({
            ...l,
            segments: [
              ...l.segments.map((seg) =>
                seg.id === segment.id ? { ...seg, duration: atTime - seg.start } : seg
              ),
              newSegment
            ].sort((a, b) => a.start - b.start)
          }))
        ),
        dirty: true
      })
    },

    /** Remove só esse trecho. Se era o último segmento do layer, remove o layer inteiro. */
    eraseSegment: (layerId, segmentId) => {
      const { project, currentSceneId, selectedLayerId } = get()
      const scene = project.scenes.find((s) => s.id === currentSceneId)
      const layer = scene?.layers.find((l) => l.id === layerId)
      if (!scene || !layer) return

      if (layer.segments.length <= 1) {
        set({
          project: mapScenes(project, currentSceneId, (s) => ({
            ...s,
            layers: s.layers.filter((l) => l.id !== layerId)
          })),
          selectedLayerId: selectedLayerId === layerId ? null : selectedLayerId,
          dirty: true
        })
        return
      }

      set({
        project: mapScenes(project, currentSceneId, (s) =>
          mapLayer(s, layerId, (l) => ({
            ...l,
            segments: l.segments.filter((seg) => seg.id !== segmentId)
          }))
        ),
        dirty: true
      })
    },

    toggleVisible: (layerId) => {
      const { project, currentSceneId } = get()
      set({
        project: mapScenes(project, currentSceneId, (s) =>
          mapLayer(s, layerId, (l) => ({ ...l, visible: !l.visible }))
        ),
        dirty: true
      })
    },

    toggleLocked: (layerId) => {
      const { project, currentSceneId } = get()
      set({
        project: mapScenes(project, currentSceneId, (s) =>
          mapLayer(s, layerId, (l) => ({ ...l, locked: !l.locked }))
        ),
        dirty: true
      })
    },

    duplicateLayer: (layerId) => {
      const { project, currentSceneId } = get()
      const scene = project.scenes.find((s) => s.id === currentSceneId)!
      const source = scene.layers.find((l) => l.id === layerId)
      if (!source) return
      const clone: Layer = {
        ...source,
        id: nanoid(),
        name: `${source.name} cópia`,
        order: scene.layers.length,
        segments: source.segments.map((seg) => ({ ...seg, id: nanoid() }))
      }
      set({
        project: mapScenes(project, currentSceneId, (s) => ({ ...s, layers: [...s.layers, clone] })),
        selectedLayerId: clone.id,
        dirty: true
      })
    },

    deleteLayer: (layerId) => {
      const { project, currentSceneId, selectedLayerId } = get()
      set({
        project: mapScenes(project, currentSceneId, (s) => ({
          ...s,
          layers: s.layers.filter((l) => l.id !== layerId)
        })),
        selectedLayerId: selectedLayerId === layerId ? null : selectedLayerId,
        dirty: true
      })
    },

    setTransformBase: (layerId, key, value) => {
      const scene = findSceneWithLayer(get().project, layerId)
      if (!scene) return
      const { project } = get()
      set({
        project: mapScenes(project, scene.id, (s) =>
          mapLayer(s, layerId, (l) => ({
            ...l,
            transform: { ...l.transform, [key]: value }
          }))
        ),
        dirty: true
      })
    },

    setKeyframe: (layerId, key, time, value, easing = 'easeInOut') => {
      const scene = findSceneWithLayer(get().project, layerId)
      if (!scene) return
      const { project } = get()
      set({
        project: mapScenes(project, scene.id, (s) =>
          mapLayer(s, layerId, (l) => {
            const existing = l.keyframes[key] ?? []
            const withoutSameTime = existing.filter((k) => Math.abs(k.time - time) > 0.001)
            const nextTrack = [...withoutSameTime, { id: nanoid(), time, value, easing }].sort(
              (a, b) => a.time - b.time
            )
            return { ...l, keyframes: { ...l.keyframes, [key]: nextTrack } }
          })
        ),
        dirty: true
      })
    },

    removeKeyframesForProp: (layerId, key) => {
      const scene = findSceneWithLayer(get().project, layerId)
      if (!scene) return
      const { project } = get()
      set({
        project: mapScenes(project, scene.id, (s) =>
          mapLayer(s, layerId, (l) => {
            const { [key]: _removed, ...rest } = l.keyframes
            return { ...l, keyframes: rest }
          })
        ),
        dirty: true
      })
    },

    removeKeyframe: (layerId, key, keyframeId) => {
      const scene = findSceneWithLayer(get().project, layerId)
      if (!scene) return
      const { project } = get()
      set({
        project: mapScenes(project, scene.id, (s) =>
          mapLayer(s, layerId, (l) => {
            const track = (l.keyframes[key] ?? []).filter((k) => k.id !== keyframeId)
            return { ...l, keyframes: { ...l.keyframes, [key]: track } }
          })
        ),
        dirty: true
      })
    },

    setPlayhead: (time) => {
      const duration = get().currentScene().duration
      set({ playhead: Math.min(Math.max(0, time), duration) })
    },

    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),

    loadProject: (project, filePath) => {
      set({
        project,
        filePath,
        dirty: false,
        currentSceneId: project.scenes[0]?.id ?? '',
        selectedLayerId: null,
        playhead: 0,
        isPlaying: false
      })
      resetHistory()
    },

    markSaved: (filePath) => set({ filePath, dirty: false, savedAt: Date.now() })
  }
})

// ---- Desfazer / refazer ----
// Guarda o projeto anterior a cada alteração. Mudanças em sequência rápida (arrastar,
// digitar) viram uma única etapa: só abre uma nova quando passa GROUP_MS sem mexer.
const HISTORY_LIMIT = 100
const GROUP_MS = 600
let past: Project[] = []
let future: Project[] = []
let groupTimer: ReturnType<typeof setTimeout> | null = null
let applyingHistory = false

function syncHistoryCounts(): void {
  useProjectStore.setState({ undoCount: past.length, redoCount: future.length })
}

export function resetHistory(): void {
  past = []
  future = []
  if (groupTimer) clearTimeout(groupTimer)
  groupTimer = null
  syncHistoryCounts()
}

useProjectStore.subscribe((state, prev) => {
  if (applyingHistory || state.project === prev.project) return
  if (groupTimer === null) {
    past.push(prev.project)
    if (past.length > HISTORY_LIMIT) past.shift()
    future = []
    syncHistoryCounts()
  } else {
    clearTimeout(groupTimer)
  }
  groupTimer = setTimeout(() => {
    groupTimer = null
  }, GROUP_MS)
})

function applyProject(project: Project): void {
  applyingHistory = true
  const s = useProjectStore.getState()
  const scene = project.scenes.find((sc) => sc.id === s.currentSceneId) ?? project.scenes[0]
  useProjectStore.setState({
    project,
    currentSceneId: scene?.id ?? '',
    selectedLayerId: scene?.layers.some((l) => l.id === s.selectedLayerId) ? s.selectedLayerId : null,
    playhead: Math.min(s.playhead, scene?.duration ?? 0),
    dirty: true
  })
  applyingHistory = false
  syncHistoryCounts()
}

function closeGroup(): void {
  if (groupTimer) clearTimeout(groupTimer)
  groupTimer = null
}

export function undo(): void {
  closeGroup()
  const previous = past.pop()
  if (!previous) return
  future.push(useProjectStore.getState().project)
  applyProject(previous)
}

export function redo(): void {
  closeGroup()
  const next = future.pop()
  if (!next) return
  past.push(useProjectStore.getState().project)
  applyProject(next)
}
