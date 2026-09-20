import { nanoid } from 'nanoid'
import type {
  AnimatableProps,
  BackgroundLayer,
  MediaLayer,
  ShapeKind,
  ShapeLayer,
  Project,
  Scene,
  TextLayer
} from '@shared/types/project'

const DEFAULT_TRANSFORM: AnimatableProps = {
  position: { x: 0, y: 0 },
  scale: 1,
  rotation: 0,
  opacity: 1,
  blur: 0
}

export function createBackgroundLayer(order = 0, sceneDuration = 8): BackgroundLayer {
  return {
    id: nanoid(),
    type: 'background',
    name: 'Fundo',
    visible: true,
    locked: false,
    order,
    transform: { ...DEFAULT_TRANSFORM },
    keyframes: {},
    segments: [{ id: nanoid(), start: 0, duration: sceneDuration }],
    fill: { kind: 'color', color: '#0a0a0d' }
  }
}

export function createTextLayer(text = 'Novo texto', order = 1, sceneDuration = 8): TextLayer {
  return {
    id: nanoid(),
    type: 'text',
    name: text.slice(0, 24) || 'Texto',
    visible: true,
    locked: false,
    order,
    transform: { ...DEFAULT_TRANSFORM },
    keyframes: {},
    segments: [{ id: nanoid(), start: 0, duration: sceneDuration }],
    text,
    fontFamily: 'Inter',
    fontSize: 64,
    fontWeight: 700,
    italic: false,
    align: 'center',
    color: '#ffffff',
    letterSpacing: 0,
    lineHeight: 1.2
  }
}

export function createShapeLayer(kind: ShapeKind, order = 1, sceneDuration = 8): ShapeLayer {
  return {
    id: nanoid(),
    type: 'shape',
    name: kind === 'torn' ? 'Tira rasgada' : 'Retângulo',
    visible: true,
    locked: false,
    order,
    transform: { ...DEFAULT_TRANSFORM },
    keyframes: {},
    segments: [{ id: nanoid(), start: 0, duration: sceneDuration }],
    kind,
    color: kind === 'torn' ? '#e10600' : '#ffffff',
    width: 900,
    height: 200
  }
}

export function createMediaLayer(
  file: { filePath: string; fileName: string },
  order = 1,
  sceneDuration = 8
): MediaLayer {
  const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(file.fileName)
  return {
    id: nanoid(),
    type: 'media',
    name: file.fileName.slice(0, 24),
    visible: true,
    locked: false,
    order,
    transform: { ...DEFAULT_TRANSFORM },
    keyframes: {},
    segments: [{ id: nanoid(), start: 0, duration: sceneDuration }],
    mediaKind: isVideo ? 'video' : 'image',
    filePath: file.filePath,
    fileName: file.fileName,
    fit: 'cover',
    blendMode: 'normal'
  }
}

export function createScene(name: string): Scene {
  const duration = 8
  return {
    id: nanoid(),
    name,
    duration,
    layers: [createBackgroundLayer(0, duration)]
  }
}

export function createProject(name = 'Novo Culto'): Project {
  const now = new Date().toISOString()
  return {
    id: nanoid(),
    name,
    createdAt: now,
    updatedAt: now,
    scenes: [createScene('Cena 1')]
  }
}
