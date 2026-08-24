import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { InventoryLocation, ItemDraft } from '../../types/inventory'
import { saveLocation } from '../../services/inventoryService'

export function ItemModal({ initial, onClose, onSaved }: { initial?: Partial<InventoryLocation>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ codigo:'', bombona:'', endereco:'', descritivo:'', quantidade:'', observacoes:'' })
  const [error, setError] = useState(''); const [duplicateId, setDuplicateId] = useState<string | null>(null)
  useEffect(() => { if (initial) setForm({ codigo:initial.codigo ?? '', bombona:initial.bombona ?? '', endereco:initial.endereco ?? '', descritivo:initial.descritivo ?? '', quantidade:initial.quantidade == null ? '' : String(initial.quantidade), observacoes:initial.observacoes ?? '' }) }, [initial])
  const field = (k: keyof typeof form, v: string) => setForm(f => ({...f,[k]:v}))
  async function submit(allowDuplicate=false) {
    setError('')
    const quantity = form.quantidade.trim() === '' ? null : Number(form.quantidade.replace(',','.'))
    if (quantity !== null && !Number.isFinite(quantity)) return setError('Quantidade inválida.')
    try {
      const result = await saveLocation({ id: initial?.id, codigo: form.codigo, bombona: form.bombona, endereco: form.endereco, descritivo: form.descritivo || null, quantidade: quantity, observacoes: form.observacoes || null } as ItemDraft, allowDuplicate)
      if (result.duplicate) { setDuplicateId(result.duplicate.id); setError('Este registro já existe.') ; return }
      onSaved(); onClose()
    } catch(e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.') }
  }
  return <div className="modal-backdrop"><div className="form-modal"><div className="modal-head"><div><b>{initial?.id ? 'Editar localização' : 'Novo item'}</b><span>Preencha apenas o necessário</span></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div>
    <div className="form-grid">
      <label>Código<input autoFocus value={form.codigo} onChange={e=>field('codigo',e.target.value)} placeholder="ITPFPHM406ESAI4"/></label>
      <label>Bombona<input value={form.bombona} onChange={e=>field('bombona',e.target.value)} placeholder="R13B29"/></label>
      <label>Endereço<input value={form.endereco} onChange={e=>field('endereco',e.target.value)} placeholder="R13A1C06DP01"/></label>
      <label>Quantidade <span>(opcional)</span><input inputMode="decimal" value={form.quantidade} onChange={e=>field('quantidade',e.target.value)} placeholder="—"/></label>
      <label className="full">Descritivo <span>(opcional)</span><input value={form.descritivo} onChange={e=>field('descritivo',e.target.value)}/></label>
      <label className="full">Observações <span>(opcional)</span><textarea value={form.observacoes} onChange={e=>field('observacoes',e.target.value)} rows={3}/></label>
    </div>
    {error && <div className="error-box">{error}{duplicateId && <span> Você pode editar o existente na lista ou cadastrar assim mesmo.</span>}</div>}
    <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button>{duplicateId && <button className="secondary-button" onClick={()=>submit(true)}>Cadastrar mesmo assim</button>}<button className="primary-button" onClick={()=>submit(false)}>{initial?.id ? 'Salvar alterações' : 'Salvar'}</button></div>
  </div></div>
}
