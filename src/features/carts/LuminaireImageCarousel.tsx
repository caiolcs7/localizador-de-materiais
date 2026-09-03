import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import './luminaire-carousel.css'

type Props = {
  images: string[]
  luminaireName: string
  onOpen: (src: string, label: string) => void
}

type MouseDragState = {
  pointerId: number
  startX: number
  startScrollLeft: number
}

const DESKTOP_MAX_IMAGE_HEIGHT = 500
const MAX_CAROUSEL_WIDTH = 1080
const DEFAULT_CAROUSEL_RATIO = 16 / 10

export function resolveCarouselFrameRatio(imageCount: number, ratios: Record<number, number>) {
  const validRatios = Array.from({ length: imageCount }, (_, index) => ratios[index])
    .filter(ratio => Number.isFinite(ratio) && ratio > 0)

  // A largura do trilho precisa permanecer invariável durante a navegação.
  // Esperamos todas as fotos e adotamos a mais larga como quadro do conjunto,
  // mantendo as demais inteiras com object-fit: contain.
  if (validRatios.length !== imageCount) return DEFAULT_CAROUSEL_RATIO
  return Math.max(...validRatios)
}

export function LuminaireImageCarousel({ images, luminaireName, onOpen }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<MouseDragState | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [imageRatios, setImageRatios] = useState<Record<number, number>>({})

  useEffect(() => {
    setActiveIndex(0)
    setImageRatios({})
    trackRef.current?.scrollTo({ left: 0, behavior: 'auto' })
  }, [images])

  const frameRatio = resolveCarouselFrameRatio(images.length, imageRatios)
  const trackAspectRatio = String(frameRatio)
  const idealWidth = Math.min(MAX_CAROUSEL_WIDTH, frameRatio * DESKTOP_MAX_IMAGE_HEIGHT)

  const registerImageRatio = (index: number, width: number, height: number) => {
    if (!width || !height) return
    const ratio = width / height
    setImageRatios(current => {
      if (Math.abs((current[index] ?? 0) - ratio) < 0.0001) return current
      return { ...current, [index]: ratio }
    })
  }

  const goTo = (index: number) => {
    const track = trackRef.current
    if (!track || images.length === 0) return
    const next = Math.max(0, Math.min(images.length - 1, index))
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' })
    setActiveIndex(next)
  }

  const syncActiveSlide = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const next = Math.max(0, Math.min(images.length - 1, Math.round(track.scrollLeft / track.clientWidth)))
    setActiveIndex(next)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if ((event.target as HTMLElement).closest('button')) return
    const track = trackRef.current
    if (!track) return
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: track.scrollLeft }
    track.setPointerCapture(event.pointerId)
    track.classList.add('is-dragging')
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    const drag = dragRef.current
    if (!track || !drag || drag.pointerId !== event.pointerId) return
    track.scrollLeft = drag.startScrollLeft - (event.clientX - drag.startX)
  }

  const finishMouseDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    const drag = dragRef.current
    if (!track || !drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    track.classList.remove('is-dragging')
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
    const next = Math.max(0, Math.min(images.length - 1, Math.round(track.scrollLeft / track.clientWidth)))
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' })
    setActiveIndex(next)
  }

  if (images.length === 0) return null

  return (
    <section
      className="luminaire-carousel"
      style={{ maxWidth: `${idealWidth}px` }}
      aria-label={`Fotos da ${luminaireName}`}
      aria-roledescription="carrossel"
    >
      <div
        ref={trackRef}
        className="luminaire-carousel__track"
        style={{ aspectRatio: trackAspectRatio }}
        onScroll={syncActiveSlide}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishMouseDrag}
        onPointerCancel={finishMouseDrag}
      >
        {images.map((src, index) => {
          const label = `Vista ${index + 1} da ${luminaireName}`
          return (
            <div className="luminaire-carousel__slide" key={src} aria-label={`${index + 1} de ${images.length}`}>
              <img
                className="luminaire-carousel__image"
                src={src}
                alt={label}
                decoding="async"
                draggable={false}
                onLoad={event => registerImageRatio(index, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
              />
              <button className="luminaire-carousel__expand" type="button" onClick={()=>onOpen(src,label)} aria-label={`Ampliar ${label.toLowerCase()}`}>
                <Maximize2 size={15}/><span>Ampliar foto</span>
              </button>
            </div>
          )
        })}
      </div>

      {images.length > 1 && <>
        <button className="luminaire-carousel__arrow luminaire-carousel__arrow--left" type="button" onClick={()=>goTo(activeIndex-1)} disabled={activeIndex===0} aria-label="Foto anterior"><ChevronLeft size={20}/></button>
        <button className="luminaire-carousel__arrow luminaire-carousel__arrow--right" type="button" onClick={()=>goTo(activeIndex+1)} disabled={activeIndex===images.length-1} aria-label="Próxima foto"><ChevronRight size={20}/></button>
        <div className="luminaire-carousel__progress" aria-label={`Foto ${activeIndex+1} de ${images.length}`}>
          {images.map((_,index)=><button key={index} type="button" className={index===activeIndex?'active':''} onClick={()=>goTo(index)} aria-label={`Ir para foto ${index+1}`}/>) }
        </div>
        <span className="luminaire-carousel__counter">{activeIndex+1} / {images.length}</span>
      </>}
    </section>
  )
}
