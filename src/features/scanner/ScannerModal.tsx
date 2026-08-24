import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Camera, Image, X } from 'lucide-react'

export function ScannerModal({ onDetected, onClose }: { onDetected: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [error, setError] = useState('')
  const hints = new Map(); hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX])
  const reader = useRef(new BrowserMultiFormatReader(hints, 300)).current

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        const rear = devices.find(d => /back|rear|environment|traseira/i.test(d.label)) ?? devices.at(-1)
        if (!rear || !videoRef.current) throw new Error('Nenhuma câmera disponível.')
        controlsRef.current = await reader.decodeFromVideoDevice(rear.deviceId, videoRef.current, (result) => {
          if (active && result) { active = false; controlsRef.current?.stop(); onDetected(result.getText()) }
        })
      } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir a câmera.') }
    })()
    return () => { active = false; controlsRef.current?.stop() }
  }, [onDetected, reader])

  async function fromImage(file?: File) {
    if (!file) return
    try {
      const url = URL.createObjectURL(file)
      const result = await reader.decodeFromImageUrl(url)
      URL.revokeObjectURL(url)
      onDetected(result.getText())
    } catch { setError('QR Code ou Data Matrix não reconhecido na imagem.') }
  }

  return <div className="modal-backdrop"><div className="scanner-modal">
    <div className="modal-head"><div><b>Escanear código</b><span>QR Code e Data Matrix</span></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div>
    <div className="camera-frame"><video ref={videoRef} muted playsInline/><div className="scan-box"/></div>
    {error && <div className="error-box">{error}</div>}
    <label className="secondary-button file-button"><Image size={18}/> Ler código de uma imagem<input type="file" accept="image/*" onChange={e => fromImage(e.target.files?.[0])}/></label>
    <div className="scanner-note"><Camera size={16}/> A câmera é encerrada ao fechar esta janela.</div>
  </div></div>
}
