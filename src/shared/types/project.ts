/**
 * Modelo de domínio compartilhado entre main e renderer.
 * Espelha o schema descrito para o banco (Projects/Scenes/Layers/Keyframes),
 * para que a troca do backend de persistência (JSON -> SQLite) não exija
 * remodelar estes tipos.
 */

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'

export interface Keyframe<T> {
  id: string
  time: number // segundos, relativo ao início da cena
  value: T
  easing: EasingType
}

export interface Vec2 {
  x: number
  y: number
}

/** Propriedades de um layer que podem receber keyframes. */
export interface AnimatableProps {
  position: Vec2
  scale: number
  rotation: number
  opacity: number
  blur: number
}

export type AnimatablePropKey = keyof AnimatableProps

export const ANIMATABLE_PROP_KEYS: AnimatablePropKey[] = [
  'position',
  'scale',
  'rotation',
  'opacity',
  'blur'
]

export type KeyframeTracks = {
  [K in AnimatablePropKey]?: Keyframe<AnimatableProps[K]>[]
}

export type LayerType = 'text' | 'background' | 'shape' | 'media'

/** Um trecho de tempo em que o layer aparece na cena. Cortar um clipe divide um
 * segmento em dois dentro do MESMO layer — nunca cria um layer novo. */
export interface ClipSegment {
  id: string
  /** Início do segmento na cena, em segundos. */
  start: number
  /** Duração do segmento, em segundos. */
  duration: number
}

export interface BaseLayer {
  id: string
  type: LayerType
  name: string
  visible: boolean
  locked: boolean
  /** Índice de empilhamento: maior fica na frente. */
  order: number
  transform: AnimatableProps
  keyframes: KeyframeTracks
  /** Trechos de tempo em que o layer aparece na cena (ver cortar/apagar na timeline). */
  segments: ClipSegment[]
}

/** Presets de animação de entrada/saída (ver aba Efeitos). Cada um já anima
 * sozinho perto do início/fim do segmento — não precisa de keyframe manual. */
export type EffectId =
  | 'fade'
  | 'fade-fast'
  | 'scale-up'
  | 'slide-x'
  | 'slide-x-overshoot'
  | 'slide-y'
  | 'slide-y-overshoot'
  | 'mask-x'
  | 'mask-y'
  | 'mask-y-overshoot'
  | 'fade-scale-tracking'
  | 'chars-fade'
  | 'chars-slide-x'
  | 'chars-slide-x-blur'
  | 'chars-decode'
  | 'chars-arc'
  | 'chars-arc-overshoot'
  | 'chars-tumble'
  | 'chars-tumble-scale'
  | 'write'

export interface TextLayer extends BaseLayer {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  italic: boolean
  align: 'left' | 'center' | 'right'
  color: string
  letterSpacing: number
  lineHeight: number
  /** Preset de animação de entrada/saída aplicado ao redor das bordas do segmento. */
  effect?: EffectId
}

export type BackgroundFill =
  | { kind: 'color'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number }

export interface BackgroundLayer extends BaseLayer {
  type: 'background'
  fill: BackgroundFill
}

export type ShapeKind = 'rect' | 'torn'

/** Forma sólida (retângulo ou tira "rasgada" tipo papel) pra colocar atrás do texto. */
export interface ShapeLayer extends BaseLayer {
  type: 'shape'
  kind: ShapeKind
  color: string
  /** Tamanho em px do canvas lógico (1280×720). */
  width: number
  height: number
  effect?: EffectId
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'lighten'
  | 'darken'
  | 'color-dodge'

/** Imagem ou vídeo importado — serve de fundo (cover) ou de textura por cima (com blend). */
export interface MediaLayer extends BaseLayer {
  type: 'media'
  mediaKind: 'image' | 'video'
  filePath: string
  fileName: string
  fit: 'cover' | 'contain'
  blendMode: BlendMode
  effect?: EffectId
}

export type Layer = TextLayer | BackgroundLayer | ShapeLayer | MediaLayer

/** Áudio importado (MP3/WAV) associado a uma cena, para sincronizar a letra com a música. */
export interface SceneAudio {
  /** Caminho absoluto do arquivo, já copiado para a pasta de mídia do app. */
  filePath: string
  fileName: string
  /** Duração do áudio em segundos. */
  duration: number
}

export interface Scene {
  id: string
  name: string
  /** Duração da cena em segundos, usada pela timeline. */
  duration: number
  layers: Layer[]
  audio?: SceneAudio
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  scenes: Scene[]
}
