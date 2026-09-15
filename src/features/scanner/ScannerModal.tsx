import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Camera, Image, LoaderCircle, X } from 'lucide-react'

type ScannerModalProps = {
  onDetected: (value: string) => void | Promise<void>
  onClose: () => void
  title?: string
  subtitle?: string
}

function cameraErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Não foi possível abrir a câmera.'
  if (error.name === 'NotAllowedError') return 'Permissão da câmera negada. Libere o acesso nas configurações do navegador.'
  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') return 'Nenhuma câmera compatível foi encontrada.'
  if (error.name === 'NotReadableError' || error.name === 'TrackStartError') return 'A câmera está em uso por outro aplicativo.'
  return error.message || 'Não foi possível abrir a câmera.'
}

export function ScannerModal({
  onDetected,
  onClose,
  title = 'Escanear código',
  subtitle = 'QR Code e Data Matrix',
}: ScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const detectedRef = useRef(false)
  const onDetectedRef = useRef(onDetected)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  if (!readerRef.current) {
    const hints = new Map<DecodeHintType, BarcodeFormat[]>()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX])
    readerRef.current = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 160,
      delayBetweenScanSuccess: 500,
    })
  }

  useEffect(() => { onDetectedRef.current = onDetected }, [onDetected])

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    const video = videoRef.current
    const stream = video?.srcObject
    if (stream && 'getTracks' in stream) stream.getTracks().forEach(track => track.stop())
    if (video) {
      video.pause()
      video.srcObject = null
    }
  }, [])

  const finishDetection = useCallback((value: string) => {
    if (detectedRef.current) return
    detectedRef.current = true
    stopScanner()
    void onDetectedRef.current(value)
  }, [stopScanner])

  useEffect(() => {
    let mounted = true
    const reader = readerRef.current
    if (!reader || !videoRef.current) return undefined

    void reader.decodeFromConstraints({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }, videoRef.current, result => {
      if (mounted && result) finishDetection(result.getText())
    }).then(controls => {
      if (!mounted || detectedRef.current) {
        controls.stop()
        stopScanner()
        return
      }
      controlsRef.current = controls
      setStarting(false)
    }).catch(cause => {
      if (!mounted) return
      setStarting(false)
      setError(cameraErrorMessage(cause))
      stopScanner()
    })

    return () => {
      mounted = false
      stopScanner()
    }
  }, [finishDetection, stopScanner])

  async function fromImage(file?: File) {
    if (!file || detectedRef.current || !readerRef.current) return
    let url = ''
    try {
      setError('')
      url = URL.createObjectURL(file)
      const result = await readerRef.current.decodeFromImageUrl(url)
      finishDetection(result.getText())
    } catch {
      setError('QR Code ou Data Matrix não reconhecido na imagem.')
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }

  const close = () => {
    stopScanner()
    onClose()
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) close() }}><section className="scanner-modal" role="dialog" aria-modal="true" aria-label={title}>
    <div className="modal-head"><div><b>{title}</b><span>{subtitle}</span></div><button className="icon-button" type="button" aria-label="Fechar leitor" onClick={close}><X size={20}/></button></div>
    <div className="camera-frame"><video ref={videoRef} muted playsInline/>{starting && <div className="scanner-starting" role="status"><LoaderCircle size={24}/>Preparando câmera…</div>}<div className="scan-box"/></div>
    {error && <div className="error-box" role="alert">{error}</div>}
    <label className="secondary-button file-button"><Image size={18}/> Ler código de uma imagem<input type="file" accept="image/*" capture="environment" onChange={event => void fromImage(event.target.files?.[0])}/></label>
    <div className="scanner-note"><Camera size={16}/> A câmera é encerrada automaticamente após a leitura.</div>
  </section></div>
}
