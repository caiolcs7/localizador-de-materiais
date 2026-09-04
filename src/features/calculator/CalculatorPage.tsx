import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Calculator,
  Clipboard,
  Eye,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import {
  CALCULATOR_APP_VERSION,
  CALCULATOR_FORMULA_VERSION,
  calculateProduction,
  createCalculatorId,
  createSlug,
  formatDateTime,
  formatPercentage,
  formatQuantity,
  formatWeight,
  parseDecimal,
  sanitizeDecimalInput,
} from './calculatorLogic'
import {
  CalculatorStorageError,
  addCalculatorHistory,
  clearCalculatorHistory,
  createDefaultCalculatorState,
  loadCalculatorState,
  removeCalculatorHistoryRecord,
  replaceCalculatorHistoryRecord,
  restoreCalculatorDefaults,
  restoreCalculatorHistoryRecord,
  saveCalculatorAdministration,
  saveCalculatorPreferences,
} from './calculatorStorage'
import type {
  CalculatorContainer,
  CalculatorHistoryRecord,
  CalculatorState,
  RoundingPolicy,
} from './calculatorTypes'
import './calculator.css'

type ModalState =
  | { type: 'save' }
  | { type: 'edit'; record: CalculatorHistoryRecord }
  | { type: 'details'; record: CalculatorHistoryRecord }
  | { type: 'clear-history' }
  | null

interface NotificationState {
  message: string
  actionLabel?: string
  action?: () => void
}

interface CalculatorPageProps {
  onBackHome: () => void
  isAdmin?: boolean
}

function uppercase(value: string): string {
  return value.toLocaleUpperCase('pt-BR')
}

function loadInitialState(): { state: CalculatorState; error: string } {
  try {
    return { state: loadCalculatorState(), error: '' }
  } catch (error) {
    return {
      state: createDefaultCalculatorState(),
      error: error instanceof Error ? error.message : 'O armazenamento da calculadora não está disponível.',
    }
  }
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const input = document.createElement('textarea')
  input.value = value
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.append(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (!copied) throw new Error('Clipboard unavailable')
}

function validateAdministration(
  containers: CalculatorContainer[],
  yieldPercentage: number,
  roundingPolicy: RoundingPolicy,
): string | null {
  if (!containers.length) return 'Cadastre ao menos um recipiente.'
  if (!containers.some(container => container.ativo)) return 'Mantenha ao menos um recipiente ativo.'
  if (containers.some(container => !container.nome.trim())) return 'Todos os recipientes precisam de nome.'
  if (containers.some(container => !Number.isFinite(container.taraKg) || container.taraKg < 0)) {
    return 'Informe taras válidas e não negativas.'
  }
  if (new Set(containers.map(container => container.id)).size !== containers.length) {
    return 'Existem identificadores de recipiente duplicados.'
  }
  if (!Number.isFinite(yieldPercentage) || yieldPercentage < 1 || yieldPercentage > 100) {
    return 'O rendimento deve ficar entre 1% e 100%.'
  }
  if (roundingPolicy !== 'truncar' && roundingPolicy !== 'arredondar') {
    return 'Política de arredondamento inválida.'
  }
  return null
}

export function CalculatorPage({ onBackHome, isAdmin=false }: CalculatorPageProps) {
  const initial = useMemo(loadInitialState, [])
  const [state, setState] = useState(initial.state)
  const [storageError] = useState(initial.error)
  const [selectedContainerId, setSelectedContainerId] = useState(state.configuracoes.recipientePadraoId)
  const [grossWeightText, setGrossWeightText] = useState('')
  const [grammageText, setGrammageText] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)
  const [notification, setNotification] = useState<NotificationState | null>(
    storageError ? { message: storageError } : null,
  )
  const [saveProductId, setSaveProductId] = useState('')
  const [saveAddress, setSaveAddress] = useState('')
  const [saveError, setSaveError] = useState('')
  const [editProductId, setEditProductId] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editError, setEditError] = useState('')
  const [adminContainers, setAdminContainers] = useState<CalculatorContainer[]>(state.recipientes)
  const [adminYieldPercentage, setAdminYieldPercentage] = useState(state.configuracoes.taxaRendimento * 100)
  const [adminRounding, setAdminRounding] = useState<RoundingPolicy>(state.configuracoes.politicaArredondamento)
  const [adminError, setAdminError] = useState('')
  const lastSaveRef = useRef({ signature: '', moment: 0 })
  const logoSrc = `${import.meta.env.BASE_URL}calculator-logo.png`

  const activeContainers = useMemo(
    () => state.recipientes.filter(container => container.ativo),
    [state.recipientes],
  )
  const selectedContainer = useMemo(
    () => activeContainers.find(container => container.id === selectedContainerId) ?? activeContainers[0] ?? null,
    [activeContainers, selectedContainerId],
  )
  const calculation = useMemo(() => calculateProduction({
    pesoBrutoKg: parseDecimal(grossWeightText),
    gramaturaG: parseDecimal(grammageText),
    recipiente: selectedContainer,
    taxaRendimento: state.configuracoes.taxaRendimento,
    politicaArredondamento: state.configuracoes.politicaArredondamento,
  }), [grossWeightText, grammageText, selectedContainer, state.configuracoes])

  const normalizedHistorySearch = uppercase(historySearch.trim())
  const filteredHistory = useMemo(() => normalizedHistorySearch
    ? state.historico.filter(record => record.identificacao.produtoId.includes(normalizedHistorySearch))
    : state.historico, [normalizedHistorySearch, state.historico])

  useEffect(() => {
    if (!selectedContainer && activeContainers[0]) setSelectedContainerId(activeContainers[0].id)
  }, [activeContainers, selectedContainer])

  useEffect(() => {
    if (!notification) return
    const timeout = window.setTimeout(() => setNotification(null), notification.action ? 6000 : 3200)
    return () => window.clearTimeout(timeout)
  }, [notification])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modal) setModal(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modal])

  const notify = (message: string, action?: Pick<NotificationState, 'actionLabel' | 'action'>) => {
    setNotification({ message, ...action })
  }

  const runStorageOperation = (operation: () => CalculatorState): CalculatorState | null => {
    try {
      const next = operation()
      setState(next)
      return next
    } catch (error) {
      notify(error instanceof CalculatorStorageError ? error.message : 'Não foi possível concluir a operação.')
      return null
    }
  }

  const openSaveModal = () => {
    if (!calculation.sucesso || !selectedContainer) return
    setSaveProductId('')
    setSaveAddress('')
    setSaveError('')
    setModal({ type: 'save' })
  }

  const saveCurrentCalculation = () => {
    if (!calculation.sucesso || !selectedContainer) {
      setSaveError('O cálculo deixou de ser válido. Feche esta janela e calcule novamente.')
      return
    }
    const productId = uppercase(saveProductId.trim())
    const address = uppercase(saveAddress.trim())
    if (!productId) { setSaveError('Informe o ID do produto.'); return }
    if (!address) { setSaveError('Informe o endereço.'); return }

    const signature = [
      selectedContainer.id,
      calculation.detalhes.pesoBrutoKg,
      calculation.detalhes.gramaturaG,
      calculation.resultado,
      productId,
      address,
    ].join('|')
    const now = Date.now()
    if (signature === lastSaveRef.current.signature && now - lastSaveRef.current.moment < 1200) return

    const record: CalculatorHistoryRecord = {
      id: createCalculatorId(),
      criadoEm: new Date().toISOString(),
      identificacao: { produtoId: productId, endereco: address },
      recipiente: { ...selectedContainer },
      entrada: {
        pesoBrutoKg: calculation.detalhes.pesoBrutoKg,
        gramaturaG: calculation.detalhes.gramaturaG,
      },
      calculo: {
        pesoLiquidoKg: calculation.detalhes.pesoLiquidoKg,
        quantidadeEstimada: calculation.detalhes.quantidadeEstimada,
        quantidadeComRendimento: calculation.detalhes.quantidadeComRendimento,
        taxaRendimento: calculation.detalhes.taxaRendimento,
        politicaArredondamento: calculation.detalhes.politicaArredondamento,
        quantidadeCalculadaOriginal: calculation.detalhes.quantidadeFinal,
        quantidadeFinal: calculation.detalhes.quantidadeFinal,
        versaoFormula: CALCULATOR_FORMULA_VERSION,
      },
      auditoria: { atualizadoEm: null, revisao: 0, alteracoes: [] },
      versaoAplicativo: CALCULATOR_APP_VERSION,
    }

    if (runStorageOperation(() => addCalculatorHistory(record))) {
      lastSaveRef.current = { signature, moment: now }
      setModal(null)
      notify(`Produto ${productId} salvo no histórico.`)
    }
  }

  const useHistoryRecord = (record: CalculatorHistoryRecord) => {
    const container = activeContainers.find(item => item.id === record.recipiente.id)
    if (!container) {
      setModal({ type: 'details', record })
      notify('O recipiente deste registro não está ativo.')
      return
    }
    setSelectedContainerId(container.id)
    setGrossWeightText(String(record.entrada.pesoBrutoKg).replace('.', ','))
    setGrammageText(String(record.entrada.gramaturaG).replace('.', ','))
    setSettingsOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    notify('Valores carregados. O registro não foi salvo novamente.')
  }

  const openEditModal = (record: CalculatorHistoryRecord) => {
    setEditProductId(record.identificacao.produtoId)
    setEditAddress(record.identificacao.endereco)
    setEditQuantity(String(record.calculo.quantidadeFinal))
    setEditError('')
    setModal({ type: 'edit', record })
  }

  const saveEditedRecord = () => {
    if (modal?.type !== 'edit') return
    const productId = uppercase(editProductId.trim())
    const address = uppercase(editAddress.trim())
    const quantity = parseDecimal(editQuantity)
    if (!productId) { setEditError('Informe o ID do produto.'); return }
    if (!address) { setEditError('Informe o endereço.'); return }
    if (quantity === null || !Number.isFinite(quantity) || quantity < 0) {
      setEditError('Informe uma quantidade válida e não negativa.')
      return
    }
    if (!Number.isInteger(quantity)) {
      setEditError('A quantidade deve ser informada em unidades inteiras.')
      return
    }

    const previous = {
      produtoId: modal.record.identificacao.produtoId,
      endereco: modal.record.identificacao.endereco,
      quantidadeFinal: modal.record.calculo.quantidadeFinal,
    }
    const current = { produtoId: productId, endereco: address, quantidadeFinal: quantity }
    if (
      previous.produtoId === current.produtoId
      && previous.endereco === current.endereco
      && previous.quantidadeFinal === current.quantidadeFinal
    ) {
      setModal(null)
      notify('Nenhuma alteração foi realizada.')
      return
    }

    try {
      const moment = new Date().toISOString()
      const result = replaceCalculatorHistoryRecord(modal.record.id, record => {
        record.identificacao = { produtoId: productId, endereco: address }
        record.calculo.quantidadeFinal = quantity
        record.auditoria.atualizadoEm = moment
        record.auditoria.revisao += 1
        record.auditoria.alteracoes = [
          ...record.auditoria.alteracoes,
          { em: moment, anterior: previous, atual: current },
        ].slice(-20)
      })
      if (!result.record) { setEditError('Este registro não foi encontrado.'); return }
      setState(result.state)
      setModal(null)
      notify('Registro atualizado e revisão salva.')
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Não foi possível salvar a alteração.')
    }
  }

  const deleteHistoryRecord = (record: CalculatorHistoryRecord) => {
    try {
      const result = removeCalculatorHistoryRecord(record.id)
      if (!result.record) return
      setState(result.state)
      notify('Registro excluído.', {
        actionLabel: 'Desfazer',
        action: () => {
          const restored = runStorageOperation(() => restoreCalculatorHistoryRecord(result.record!))
          if (restored) notify('Registro restaurado.')
        },
      })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível excluir o registro.')
    }
  }

  const clearFields = () => {
    setGrossWeightText('')
    setGrammageText('')
  }

  const openSettings = () => {
    setSettingsOpen(true)
    if (isAdmin) {
      setAdminContainers(state.recipientes.map(container => ({ ...container })))
      setAdminYieldPercentage(state.configuracoes.taxaRendimento * 100)
      setAdminRounding(state.configuracoes.politicaArredondamento)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const ensureAdminSession = (): boolean => {
    if (isAdmin) return true
    notify('Esta alteração está disponível somente na área administrativa.')
    return false
  }

  const addAdminContainer = () => {
    if (!ensureAdminSession()) return
    const baseId = createSlug(`recipiente-${adminContainers.length + 1}`)
    let id = baseId
    let suffix = 2
    while (adminContainers.some(container => container.id === id)) id = `${baseId}-${suffix++}`
    setAdminContainers(current => [
      ...current,
      { id, nome: 'Novo recipiente', taraKg: 0, cor: '#526873', ativo: true },
    ])
  }

  const updateAdminContainer = (id: string, patch: Partial<CalculatorContainer>) => {
    setAdminContainers(current => current.map(container => container.id === id ? { ...container, ...patch } : container))
  }

  const removeAdminContainer = (id: string) => {
    if (!ensureAdminSession()) return
    if (adminContainers.length === 1) { setAdminError('Mantenha ao menos um recipiente.'); return }
    setAdminContainers(current => current.filter(container => container.id !== id))
  }

  const saveAdministration = () => {
    if (!ensureAdminSession()) return
    const error = validateAdministration(adminContainers, adminYieldPercentage, adminRounding)
    if (error) { setAdminError(error); return }
    const next = runStorageOperation(() => saveCalculatorAdministration(adminContainers, {
      taxaRendimento: adminYieldPercentage / 100,
      politicaArredondamento: adminRounding,
    }))
    if (!next) return
    setAdminError('')
    const nextActive = next.recipientes.filter(container => container.ativo)
    if (!nextActive.some(container => container.id === selectedContainerId)) {
      setSelectedContainerId(nextActive[0]?.id ?? '')
    }
    notify('Configurações administrativas salvas.')
  }

  const restoreDefaults = () => {
    if (!ensureAdminSession()) return
    const next = runStorageOperation(restoreCalculatorDefaults)
    if (!next) return
    setAdminContainers(next.recipientes.map(container => ({ ...container })))
    setAdminYieldPercentage(next.configuracoes.taxaRendimento * 100)
    setAdminRounding(next.configuracoes.politicaArredondamento)
    setSelectedContainerId(next.configuracoes.recipientePadraoId)
    notify('Taras e fórmula restauradas para os padrões.')
  }

  const setDefaultContainer = (id: string) => {
    const next = runStorageOperation(() => saveCalculatorPreferences({ recipientePadraoId: id }))
    if (next) notify('Recipiente inicial atualizado.')
  }

  const confirmClearHistory = () => {
    if (!ensureAdminSession()) return
    const next = runStorageOperation(clearCalculatorHistory)
    if (!next) return
    setModal(null)
    notify('Histórico apagado.')
  }

  if (settingsOpen) {
    return <section className="calculator-page calculator-settings-page">
      <div className="calculator-page-heading">
        <div className="calculator-heading-copy">
          <button className="calculator-back-link" type="button" onClick={() => setSettingsOpen(false)}><ArrowLeft size={17}/>Voltar à calculadora</button>
          <h2>Configurações da calculadora</h2>
          <p>Preferências e parâmetros salvos somente neste dispositivo.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onBackHome}>Voltar ao início</button>
      </div>

      <div className="calculator-settings-grid">
        <section className="calculator-card">
          <div className="calculator-section-title"><div><h3>Uso</h3><p>Defina qual recipiente será selecionado ao abrir.</p></div></div>
          <label className="calculator-setting-row">
            <span>Recipiente inicial</span>
            <select value={state.configuracoes.recipientePadraoId} onChange={event => setDefaultContainer(event.target.value)}>
              {activeContainers.map(container => <option key={container.id} value={container.id}>{container.nome} ({formatWeight(container.taraKg)} kg)</option>)}
            </select>
          </label>
        </section>

        {isAdmin&&<section className="calculator-card">
          <div className="calculator-section-title">
            <div><h3>Administração</h3><p>Taras, fórmula e histórico disponíveis nesta área autenticada.</p></div>
            <span className="calculator-admin-status unlocked">Liberado</span>
          </div>
          <div className="calculator-admin-content">
            <div className="calculator-admin-subhead"><div><h4>Recipientes</h4><p>Ao menos um recipiente deve permanecer ativo.</p></div><button className="secondary-button" type="button" onClick={addAdminContainer}><Plus size={16}/>Adicionar</button></div>
            <div className="calculator-container-editor">
              {adminContainers.map(container => <div className="calculator-container-editor-row" key={container.id}>
                <label className="calculator-color-field"><span>Cor</span><input type="color" value={container.cor} aria-label={`Cor de ${container.nome}`} onChange={event => updateAdminContainer(container.id, { cor: event.target.value })}/></label>
                <label><span>Nome</span><input value={container.nome} maxLength={50} onChange={event => updateAdminContainer(container.id, { nome: event.target.value })}/></label>
                <label><span>Tara (kg)</span><input type="number" min="0" step="0.001" value={container.taraKg} onChange={event => updateAdminContainer(container.id, { taraKg: Number(event.target.value) })}/></label>
                <label className="calculator-active-field"><input type="checkbox" checked={container.ativo} onChange={event => updateAdminContainer(container.id, { ativo: event.target.checked })}/>Ativo</label>
                <button className="calculator-remove-container" type="button" onClick={() => removeAdminContainer(container.id)}><Trash2 size={16}/><span>Remover</span></button>
              </div>)}
            </div>
            <div className="calculator-admin-fields">
              <label><span>Rendimento</span><div className="calculator-input-unit"><input type="number" min="1" max="100" step="0.1" value={adminYieldPercentage} onChange={event => setAdminYieldPercentage(Number(event.target.value))}/><em>%</em></div></label>
              <label><span>Quantidade final</span><select value={adminRounding} onChange={event => setAdminRounding(event.target.value as RoundingPolicy)}><option value="truncar">Somente unidades completas</option><option value="arredondar">Arredondamento convencional</option></select></label>
            </div>
            {adminError && <div className="calculator-form-error">{adminError}</div>}
            <div className="calculator-admin-actions">
              <button className="primary-button" type="button" onClick={saveAdministration}><Save size={16}/>Salvar alterações</button>
              <button className="secondary-button" type="button" onClick={restoreDefaults}><RotateCcw size={16}/>Restaurar padrões</button>
            </div>
            <div className="calculator-danger-zone"><div><strong>Histórico local</strong><p>Apaga todos os registros salvos neste dispositivo.</p></div><button type="button" onClick={() => { if (ensureAdminSession()) setModal({ type: 'clear-history' }) }}><Trash2 size={16}/>Apagar histórico</button></div>
          </div>
        </section>}

        <section className="calculator-card calculator-system-info">
          <div className="calculator-section-title"><div><h3>Sistema</h3></div></div>
          <dl><div><dt>Calculadora</dt><dd>{CALCULATOR_APP_VERSION}</dd></div><div><dt>Fórmula</dt><dd>v{CALCULATOR_FORMULA_VERSION}</dd></div><div><dt>Armazenamento</dt><dd>Local</dd></div><div><dt>Funcionamento</dt><dd>Offline</dd></div></dl>
        </section>
      </div>
      {modal && renderModal()}
      {notification && <CalculatorNotification notification={notification} onClose={() => setNotification(null)}/>} 
    </section>
  }

  function renderModal() {
    if (!modal) return null
    const close = () => setModal(null)

    if (modal.type === 'save') return <CalculatorModal title="Identificar cálculo" eyebrow="Novo registro" onClose={close}>
      <p>Informe o produto e o endereço antes de salvar no histórico.</p>
      <div className="calculator-modal-summary"><div><span>Recipiente</span><strong>{selectedContainer?.nome ?? '—'}</strong></div><div><span>Quantidade</span><strong>{formatQuantity(calculation.resultado)}</strong></div></div>
      <div className="calculator-modal-fields"><label><span>ID do produto</span><input autoFocus value={saveProductId} maxLength={80} placeholder="Ex.: PROD-001" onChange={event => setSaveProductId(uppercase(event.target.value))}/></label><label><span>Endereço</span><input value={saveAddress} maxLength={120} placeholder="Ex.: Rua A / Posição 12" onChange={event => setSaveAddress(uppercase(event.target.value))}/></label></div>
      {saveError && <div className="calculator-form-error">{saveError}</div>}
      <div className="calculator-modal-actions"><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="primary-button" type="button" onClick={saveCurrentCalculation}>Confirmar salvamento</button></div>
    </CalculatorModal>

    if (modal.type === 'edit') return <CalculatorModal title="Editar cálculo salvo" eyebrow="Revisão de registro" onClose={close}>
      <p>As alterações ficam registradas no histórico de auditoria do cálculo.</p>
      <div className="calculator-modal-fields"><label><span>ID do produto</span><input autoFocus value={editProductId} maxLength={80} onChange={event => setEditProductId(uppercase(event.target.value))}/></label><label><span>Endereço</span><input value={editAddress} maxLength={120} onChange={event => setEditAddress(uppercase(event.target.value))}/></label><label><span>Quantidade</span><input inputMode="numeric" value={editQuantity} onChange={event => setEditQuantity(sanitizeDecimalInput(event.target.value))}/><small>O valor calculado original será preservado para auditoria.</small></label></div>
      {editError && <div className="calculator-form-error">{editError}</div>}
      <div className="calculator-modal-actions"><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="primary-button" type="button" onClick={saveEditedRecord}>Salvar alterações</button></div>
    </CalculatorModal>

    if (modal.type === 'details') return <CalculatorModal title="Detalhes do cálculo" wide onClose={close}>
      <CalculatorRecordDetails record={modal.record}/>
    </CalculatorModal>

    return <CalculatorModal title="Apagar histórico" onClose={close}>
      <p>Todos os cálculos salvos neste dispositivo serão apagados. Esta ação não pode ser desfeita.</p>
      <div className="calculator-modal-actions"><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="calculator-danger-button" type="button" onClick={confirmClearHistory}>Apagar tudo</button></div>
    </CalculatorModal>
  }

  return <section className="calculator-page">
    <div className="calculator-page-heading">
      <div className="calculator-brand"><img src={logoSrc} alt="Símbolo do BombonaCalc"/><div><span>FERRAMENTA INDUSTRIAL</span><h2>Calculadora</h2><p>Cálculo de produção por peso, tara e gramatura.</p></div></div>
      <div className="calculator-heading-actions"><button className="secondary-button" type="button" onClick={onBackHome}><ArrowLeft size={16}/>Início</button><button className="secondary-button" type="button" onClick={openSettings}><Settings size={17}/>Configurações</button></div>
    </div>

    <div className="calculator-layout">
      <div className="calculator-main-column">
        <section className={`calculator-result ${calculation.sucesso || calculation.codigoErro === 'DADOS_INCOMPLETOS' ? '' : 'error'}`} aria-live="polite">
          <div><span>Quantidade produzida</span><span className="calculator-container-badge">{selectedContainer?.nome ?? 'Sem recipiente'}</span></div>
          <strong>{calculation.sucesso ? formatQuantity(calculation.resultado) : '0'}</strong>
          <p>{calculation.sucesso ? 'Cálculo concluído. Identifique o produto para salvar.' : calculation.mensagem}</p>
        </section>

        <section className="calculator-card">
          <div className="calculator-section-title"><div><h3>Recipiente</h3><p>A tara selecionada será usada no cálculo.</p></div></div>
          <div className="calculator-containers" role="group" aria-label="Seleção de recipiente">
            {activeContainers.map(container => <button key={container.id} type="button" aria-pressed={container.id === selectedContainer?.id} className={container.id === selectedContainer?.id ? 'active' : ''} onClick={() => setSelectedContainerId(container.id)}><i style={{ background: container.cor }}/><span><strong>{container.nome}</strong><small>Tara {formatWeight(container.taraKg)} kg</small></span><b>✓</b></button>)}
          </div>
        </section>

        <section className="calculator-card">
          <div className="calculator-section-title"><div><h3>Valores do cálculo</h3><p>Use vírgula ou ponto como separador decimal.</p></div></div>
          <div className="calculator-input-grid">
            <label className={calculation.campoErro === 'pesoBruto' ? 'invalid' : ''}><span>Peso bruto</span><div className="calculator-input-unit"><input value={grossWeightText} inputMode="decimal" autoComplete="off" placeholder="0,000" aria-invalid={calculation.campoErro === 'pesoBruto' || undefined} onChange={event => setGrossWeightText(sanitizeDecimalInput(event.target.value))}/><em>kg</em></div><small>{calculation.campoErro === 'pesoBruto' ? calculation.mensagem : ''}</small></label>
            <label className={calculation.campoErro === 'gramatura' ? 'invalid' : ''}><span>Gramatura</span><div className="calculator-input-unit"><input value={grammageText} inputMode="decimal" autoComplete="off" placeholder="0" aria-invalid={calculation.campoErro === 'gramatura' || undefined} onChange={event => setGrammageText(sanitizeDecimalInput(event.target.value))}/><em>g</em></div><small>{calculation.campoErro === 'gramatura' ? calculation.mensagem : ''}</small></label>
          </div>
        </section>

        {calculation.sucesso && <section className="calculator-card calculator-summary"><div className="calculator-section-title compact"><div><h3>Resumo</h3></div><span>{formatPercentage(calculation.detalhes.taxaRendimento)} · {calculation.detalhes.politicaArredondamento === 'truncar' ? 'unidades completas' : 'arredondamento convencional'}</span></div><dl><div><dt>Peso bruto</dt><dd>{formatWeight(calculation.detalhes.pesoBrutoKg)} kg</dd></div><div><dt>Tara utilizada</dt><dd>{formatWeight(calculation.detalhes.taraKg)} kg</dd></div><div><dt>Peso líquido</dt><dd>{formatWeight(calculation.detalhes.pesoLiquidoKg)} kg</dd></div><div><dt>Gramatura</dt><dd>{formatWeight(calculation.detalhes.gramaturaG)} g</dd></div></dl></section>}

        <div className="calculator-actions"><button className="primary-button" type="button" disabled={!calculation.sucesso} onClick={openSaveModal}><Save size={17}/>Salvar no histórico</button><button className="secondary-button" type="button" disabled={!calculation.sucesso} onClick={async () => { if (!calculation.sucesso) return; try { await copyToClipboard(String(calculation.resultado)); notify('Resultado copiado.') } catch { notify('Não foi possível copiar o resultado.') } }}><Clipboard size={17}/>Copiar resultado</button><button className="calculator-text-button" type="button" onClick={clearFields}><RotateCcw size={16}/>Limpar campos</button></div>
      </div>

      <aside className="calculator-history-column">
        <section className="calculator-card calculator-history-card">
          <div className="calculator-section-title"><div><h3>Histórico</h3><p>Somente cálculos salvos manualmente.</p></div><span className="calculator-history-count">{filteredHistory.length}</span></div>
          <label className="calculator-history-search"><span>Buscar pelo ID do produto</span><div><Search size={17}/><input value={historySearch} type="search" maxLength={80} placeholder="EX.: PROD-001" onChange={event => setHistorySearch(uppercase(event.target.value))}/>{historySearch && <button type="button" aria-label="Limpar busca" onClick={() => setHistorySearch('')}><X size={15}/></button>}</div><small>{normalizedHistorySearch ? `${filteredHistory.length} registro(s) encontrado(s).` : ''}</small></label>
          <div className="calculator-history-list">
            {!filteredHistory.length ? <div className="calculator-history-empty">{normalizedHistorySearch ? 'Nenhum registro corresponde à busca.' : 'Nenhum cálculo salvo.'}</div> : filteredHistory.map(record => <article key={record.id} className="calculator-history-item"><button className="calculator-history-main" type="button" onClick={() => setModal({ type: 'details', record })}><span><strong>{record.identificacao.produtoId || 'Produto não informado'}</strong><em>{record.identificacao.endereco || 'Endereço não informado'}</em></span><small>{record.recipiente.nome} · {formatDateTime(record.criadoEm)}</small><small>PB {formatWeight(record.entrada.pesoBrutoKg)} kg · {formatWeight(record.entrada.gramaturaG)} g</small><b>{formatQuantity(record.calculo.quantidadeFinal)}{record.auditoria.revisao > 0 && <i>Editado · rev. {record.auditoria.revisao}</i>}</b></button><div className="calculator-history-actions"><button type="button" onClick={() => useHistoryRecord(record)}><Play size={14}/>Usar</button><button type="button" onClick={() => openEditModal(record)}><Pencil size={14}/>Editar</button><button type="button" onClick={() => setModal({ type: 'details', record })}><Eye size={14}/>Detalhes</button><button className="delete" type="button" onClick={() => deleteHistoryRecord(record)}><Trash2 size={14}/>Excluir</button></div></article>)}
          </div>
        </section>
      </aside>
    </div>
    {modal && renderModal()}
    {notification && <CalculatorNotification notification={notification} onClose={() => setNotification(null)}/>} 
  </section>
}

function CalculatorModal({
  title,
  eyebrow,
  wide = false,
  onClose,
  children,
}: {
  title: string
  eyebrow?: string
  wide?: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  return <div className="calculator-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}><section className={`calculator-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="calculator-modal-head"><div>{eyebrow && <span>{eyebrow}</span>}<h3>{title}</h3></div><button type="button" aria-label="Fechar" onClick={onClose}><X size={20}/></button></div>{children}</section></div>
}

function CalculatorNotification({ notification, onClose }: { notification: NotificationState; onClose: () => void }) {
  return <div className="calculator-notification" role="status"><span>{notification.message}</span>{notification.action && <button type="button" onClick={() => { onClose(); notification.action?.() }}><Undo2 size={15}/>{notification.actionLabel}</button>}</div>
}

function CalculatorRecordDetails({ record }: { record: CalculatorHistoryRecord }) {
  const details: Array<[string, string]> = [
    ['ID do produto', record.identificacao.produtoId || 'Não informado'],
    ['Endereço', record.identificacao.endereco || 'Não informado'],
    ['Salvo em', formatDateTime(record.criadoEm)],
    ['Recipiente', record.recipiente.nome],
    ['Peso bruto', `${formatWeight(record.entrada.pesoBrutoKg)} kg`],
    ['Tara usada', `${formatWeight(record.recipiente.taraKg)} kg`],
    ['Peso líquido', `${formatWeight(record.calculo.pesoLiquidoKg)} kg`],
    ['Gramatura', `${formatWeight(record.entrada.gramaturaG)} g`],
    ['Rendimento', formatPercentage(record.calculo.taxaRendimento)],
    ['Arredondamento', record.calculo.politicaArredondamento === 'truncar' ? 'Unidades completas' : 'Convencional'],
    ['Quantidade atual', formatQuantity(record.calculo.quantidadeFinal)],
    ['Quantidade calculada', formatQuantity(record.calculo.quantidadeCalculadaOriginal)],
    ['Fórmula', `v${record.calculo.versaoFormula}`],
    ['Aplicativo', record.versaoAplicativo],
  ]
  if (record.auditoria.atualizadoEm) {
    details.push(['Última edição', formatDateTime(record.auditoria.atualizadoEm)])
    details.push(['Revisão', String(record.auditoria.revisao)])
  }
  return <><dl className="calculator-details-grid">{details.map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value}</dd></div>)}</dl>{record.auditoria.alteracoes.length > 0 && <section className="calculator-revisions"><h4>Histórico de alterações</h4><ol>{[...record.auditoria.alteracoes].reverse().map(change => <li key={`${change.em}-${change.atual.quantidadeFinal}`}><strong>{formatDateTime(change.em)}</strong><span>ID {change.anterior.produtoId || 'não informado'} → {change.atual.produtoId || 'não informado'} · Endereço {change.anterior.endereco || 'não informado'} → {change.atual.endereco || 'não informado'} · Quantidade {formatQuantity(change.anterior.quantidadeFinal)} → {formatQuantity(change.atual.quantidadeFinal)}</span></li>)}</ol></section>}</>
}
