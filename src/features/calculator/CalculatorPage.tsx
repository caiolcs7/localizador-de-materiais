import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Camera,
  Clipboard,
  LoaderCircle,
  MapPin,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import { findInventoryProductByCode } from '../../services/inventoryService'
import type { InventoryLocation } from '../../types/inventory'
import { cleanScannedCode } from '../../utils/normalize'
import {
  CALCULATOR_APP_VERSION,
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
  createDefaultCalculatorState,
  loadCalculatorState,
  restoreCalculatorDefaults,
  saveCalculatorAdministration,
  saveCalculatorPreferences,
} from './calculatorStorage'
import {
  CalculatorSurveyStorageError,
  clearCalculatorSurveys,
  createCalculatorSurvey,
  loadCalculatorSurveyState,
  removeCalculatorSurvey,
  removeCalculatorSurveyItem,
  selectCalculatorSurvey,
  updateCalculatorSurveyItem,
  upsertCalculatorSurveyItem,
  type CalculatorSurveyItem,
  type CalculatorSurveyState,
} from './calculatorSurveyStorage'
import type { CalculatorContainer, CalculatorState, RoundingPolicy } from './calculatorTypes'
import { exportSurveyToXlsx } from './surveyExport'
import { extractWeightFromDescription, formatGrams, formatGramsInput, type WeightExtraction } from './weightExtraction'
import './calculator.css'
import './survey.css'

const ScannerModal = lazy(() => import('../scanner/ScannerModal').then(module => ({ default: module.ScannerModal })))

type ModalState =
  | { type: 'save' }
  | { type: 'add-manual' }
  | { type: 'edit-item'; item: CalculatorSurveyItem }
  | { type: 'delete-survey' }
  | { type: 'clear-surveys' }
  | null

interface NotificationState {
  message: string
}

type ProductLookupState =
  | { status: 'idle' }
  | { status: 'searching'; code: string }
  | { status: 'not-found'; code: string }
  | { status: 'error'; code: string; message: string }
  | { status: 'found'; code: string; product: InventoryLocation; weight: WeightExtraction }

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

function loadInitialSurveys(history: CalculatorState['historico']): { state: CalculatorSurveyState; error: string } {
  try {
    return { state: loadCalculatorSurveyState(history), error: '' }
  } catch (error) {
    return {
      state: { schema: 2, levantamentoAtivoId: null, levantamentos: [] },
      error: error instanceof Error ? error.message : 'Os levantamentos locais não puderam ser carregados.',
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
  if (roundingPolicy !== 'truncar' && roundingPolicy !== 'arredondar') return 'Política de arredondamento inválida.'
  return null
}

export function CalculatorPage({ onBackHome, isAdmin = false }: CalculatorPageProps) {
  const initial = useMemo(loadInitialState, [])
  const initialSurveys = useMemo(() => loadInitialSurveys(initial.state.historico), [initial.state.historico])
  const [state, setState] = useState(initial.state)
  const [surveyState, setSurveyState] = useState(initialSurveys.state)
  const [selectedContainerId, setSelectedContainerId] = useState(state.configuracoes.recipientePadraoId)
  const [grossWeightText, setGrossWeightText] = useState('')
  const [grammageText, setGrammageText] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [productLookup, setProductLookup] = useState<ProductLookupState>({ status: 'idle' })
  const [surveyNameDraft, setSurveyNameDraft] = useState('')
  const [surveySearch, setSurveySearch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)
  const [notification, setNotification] = useState<NotificationState | null>(() => {
    const message = initial.error || initialSurveys.error
    return message ? { message } : null
  })
  const [saveCode, setSaveCode] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveAddress, setSaveAddress] = useState('')
  const [saveError, setSaveError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualQuantity, setManualQuantity] = useState('')
  const [manualError, setManualError] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editError, setEditError] = useState('')
  const [adminContainers, setAdminContainers] = useState<CalculatorContainer[]>(state.recipientes)
  const [adminYieldPercentage, setAdminYieldPercentage] = useState(state.configuracoes.taxaRendimento * 100)
  const [adminRounding, setAdminRounding] = useState<RoundingPolicy>(state.configuracoes.politicaArredondamento)
  const [adminError, setAdminError] = useState('')
  const lookupAbortRef = useRef<AbortController | null>(null)
  const logoSrc = `${import.meta.env.BASE_URL}calculator-logo-octane.webp`

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
  const activeSurvey = useMemo(
    () => surveyState.levantamentos.find(survey => survey.id === surveyState.levantamentoAtivoId) ?? null,
    [surveyState],
  )
  const activeSurveyAddressCount = useMemo(
    () => activeSurvey?.itens.filter(item => item.endereco.trim()).length ?? 0,
    [activeSurvey],
  )
  const normalizedSurveySearch = uppercase(surveySearch.trim())
  const filteredSurveyItems = useMemo(() => {
    const items = activeSurvey?.itens ?? []
    if (!normalizedSurveySearch) return items
    return items.filter(item => uppercase(`${item.codigo} ${item.descritivo} ${item.endereco}`).includes(normalizedSurveySearch))
  }, [activeSurvey, normalizedSurveySearch])

  useEffect(() => {
    if (!selectedContainer && activeContainers[0]) setSelectedContainerId(activeContainers[0].id)
  }, [activeContainers, selectedContainer])

  useEffect(() => {
    if (!notification) return
    const timeout = window.setTimeout(() => setNotification(null), 3400)
    return () => window.clearTimeout(timeout)
  }, [notification])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modal) setModal(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modal])

  useEffect(() => () => lookupAbortRef.current?.abort(), [])

  const notify = (message: string) => setNotification({ message })

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

  const runSurveyOperation = (operation: () => CalculatorSurveyState): CalculatorSurveyState | null => {
    try {
      const next = operation()
      setSurveyState(next)
      return next
    } catch (error) {
      notify(error instanceof CalculatorSurveyStorageError ? error.message : error instanceof Error ? error.message : 'Não foi possível atualizar o levantamento.')
      return null
    }
  }

  const clearFields = () => {
    lookupAbortRef.current?.abort()
    setGrossWeightText('')
    setGrammageText('')
    setProductLookup({ status: 'idle' })
  }

  const createSurvey = () => {
    const name = uppercase(surveyNameDraft.trim())
    if (!name) { notify('Informe o nome da rua ou do levantamento.'); return }
    if (runSurveyOperation(() => createCalculatorSurvey(name))) {
      setSurveyNameDraft('')
      setSurveySearch('')
      notify(`Levantamento ${name} criado.`)
    }
  }

  const selectSurvey = (id: string) => {
    if (runSurveyOperation(() => selectCalculatorSurvey(id))) setSurveySearch('')
  }

  const exportActiveSurvey = () => {
    if (!activeSurvey) { notify('Selecione um levantamento para exportar.'); return }
    try {
      exportSurveyToXlsx(activeSurvey)
      notify(`Excel de ${activeSurvey.nome} gerado.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível gerar o Excel.')
    }
  }

  const openSaveModal = () => {
    if (!calculation.sucesso || !selectedContainer) return
    if (!activeSurvey) { notify('Crie ou selecione um levantamento antes de salvar.'); return }
    const scannedCode = productLookup.status === 'found'
      ? productLookup.product.codigo
      : productLookup.status === 'not-found' || productLookup.status === 'error' ? productLookup.code : ''
    setSaveCode(uppercase(scannedCode))
    setSaveDescription(productLookup.status === 'found' ? uppercase(productLookup.product.descritivo?.trim() ?? '') : '')
    setSaveAddress(productLookup.status === 'found' ? uppercase(productLookup.product.endereco?.trim() ?? '') : '')
    setSaveError('')
    setModal({ type: 'save' })
  }

  const saveCurrentCalculation = () => {
    if (!calculation.sucesso || !selectedContainer || !activeSurvey) {
      setSaveError('O cálculo ou o levantamento selecionado deixou de ser válido.')
      return
    }
    const codigo = uppercase(saveCode.trim())
    const descritivo = uppercase(saveDescription.trim())
    const endereco = uppercase(saveAddress.trim())
    if (!codigo) { setSaveError('Informe o código do produto.'); return }
    if (!descritivo) { setSaveError('Informe o descritivo do produto.'); return }

    const existing = activeSurvey.itens.some(item => item.codigo === codigo)
    const now = new Date().toISOString()
    const item: CalculatorSurveyItem = {
      id: createCalculatorId('levantamento-item'),
      codigo,
      descritivo,
      endereco,
      quantidade: calculation.resultado,
      criadoEm: now,
      atualizadoEm: now,
      calculo: {
        recipienteNome: selectedContainer.nome,
        taraKg: selectedContainer.taraKg,
        pesoBrutoKg: calculation.detalhes.pesoBrutoKg,
        pesoLiquidoKg: calculation.detalhes.pesoLiquidoKg,
        gramaturaG: calculation.detalhes.gramaturaG,
        taxaRendimento: calculation.detalhes.taxaRendimento,
        politicaArredondamento: calculation.detalhes.politicaArredondamento,
      },
    }

    if (runSurveyOperation(() => upsertCalculatorSurveyItem(activeSurvey.id, item))) {
      setModal(null)
      clearFields()
      notify(existing ? `${codigo} atualizado no levantamento.` : `${codigo} salvo no levantamento.`)
    }
  }

  const openManualModal = () => {
    if (!activeSurvey) { notify('Crie ou selecione um levantamento antes de adicionar itens.'); return }
    setManualCode('')
    setManualDescription('')
    setManualAddress('')
    setManualQuantity('')
    setManualError('')
    setModal({ type: 'add-manual' })
  }

  const saveManualItem = () => {
    if (!activeSurvey) { setManualError('O levantamento selecionado não existe mais.'); return }
    const codigo = uppercase(manualCode.trim())
    const descritivo = uppercase(manualDescription.trim())
    const endereco = uppercase(manualAddress.trim())
    const quantidade = parseDecimal(manualQuantity)
    if (!codigo) { setManualError('Informe o código do produto.'); return }
    if (quantidade === null || !Number.isFinite(quantidade) || quantidade < 0 || !Number.isInteger(quantidade)) {
      setManualError('Informe uma quantidade inteira e não negativa.')
      return
    }
    if (activeSurvey.itens.some(item => item.codigo === codigo)) {
      setManualError('Esse código já existe neste levantamento. Use Editar para alterar o registro.')
      return
    }
    const now = new Date().toISOString()
    const item: CalculatorSurveyItem = {
      id: createCalculatorId('levantamento-item'),
      codigo,
      descritivo,
      endereco,
      quantidade,
      criadoEm: now,
      atualizadoEm: now,
      calculo: {
        recipienteNome: 'Cadastro manual',
        taraKg: 0,
        pesoBrutoKg: 0,
        pesoLiquidoKg: 0,
        gramaturaG: 0,
        taxaRendimento: state.configuracoes.taxaRendimento,
        politicaArredondamento: state.configuracoes.politicaArredondamento,
      },
    }
    if (runSurveyOperation(() => upsertCalculatorSurveyItem(activeSurvey.id, item))) {
      setModal(null)
      notify(`${codigo} adicionado ao levantamento.`)
    }
  }

  const openEditItem = (item: CalculatorSurveyItem) => {
    setEditCode(item.codigo)
    setEditDescription(item.descritivo)
    setEditAddress(item.endereco)
    setEditQuantity(String(item.quantidade))
    setEditError('')
    setModal({ type: 'edit-item', item })
  }

  const saveEditedItem = () => {
    if (modal?.type !== 'edit-item' || !activeSurvey) return
    const codigo = uppercase(editCode.trim())
    const descritivo = uppercase(editDescription.trim())
    const endereco = uppercase(editAddress.trim())
    const quantidade = parseDecimal(editQuantity)
    if (!codigo) { setEditError('Informe o código do produto.'); return }
    if (quantidade === null || !Number.isFinite(quantidade) || quantidade < 0 || !Number.isInteger(quantidade)) {
      setEditError('Informe uma quantidade inteira e não negativa.')
      return
    }
    if (runSurveyOperation(() => updateCalculatorSurveyItem(activeSurvey.id, modal.item.id, { codigo, descritivo, endereco, quantidade }))) {
      setModal(null)
      notify('Item atualizado no levantamento.')
    }
  }

  const deleteSurveyItem = (item: CalculatorSurveyItem) => {
    if (!activeSurvey) return
    if (runSurveyOperation(() => removeCalculatorSurveyItem(activeSurvey.id, item.id))) notify(`${item.codigo} removido do levantamento.`)
  }

  const confirmDeleteSurvey = () => {
    if (!activeSurvey) return
    const name = activeSurvey.nome
    if (runSurveyOperation(() => removeCalculatorSurvey(activeSurvey.id))) {
      setModal(null)
      setSurveySearch('')
      notify(`Levantamento ${name} excluído.`)
    }
  }

  const confirmClearSurveys = () => {
    if (!isAdmin) return
    if (runSurveyOperation(clearCalculatorSurveys)) {
      setModal(null)
      setSurveySearch('')
      notify('Todos os levantamentos locais foram apagados.')
    }
  }

  const readProductCode = async (rawValue: string) => {
    const code = cleanScannedCode(rawValue)
    setScannerOpen(false)
    if (!code) {
      setProductLookup({ status: 'error', code: '', message: 'O código lido é inválido.' })
      return
    }

    lookupAbortRef.current?.abort()
    const controller = new AbortController()
    lookupAbortRef.current = controller
    setProductLookup({ status: 'searching', code })
    try {
      const product = await findInventoryProductByCode(code, controller.signal)
      if (controller.signal.aborted) return
      if (!product) {
        setProductLookup({ status: 'not-found', code })
        return
      }
      const weight = extractWeightFromDescription(product.descritivo)
      setProductLookup({ status: 'found', code: product.codigo, product, weight })
      if (weight.valid) setGrammageText(formatGramsInput(weight.grams))
    } catch (error) {
      if (controller.signal.aborted) return
      setProductLookup({
        status: 'error',
        code,
        message: error instanceof Error && error.name === 'TimeoutError'
          ? 'A consulta excedeu o tempo limite. Tente novamente.'
          : 'Não foi possível consultar o banco de dados. Tente novamente.',
      })
    } finally {
      if (lookupAbortRef.current === controller) lookupAbortRef.current = null
    }
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
    setAdminContainers(current => [...current, { id, nome: 'Novo recipiente', taraKg: 0, cor: '#526873', ativo: true }])
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
    if (!nextActive.some(container => container.id === selectedContainerId)) setSelectedContainerId(nextActive[0]?.id ?? '')
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

  function renderModal() {
    if (!modal) return null
    const close = () => setModal(null)

    if (modal.type === 'save') return <CalculatorModal title="Salvar no levantamento" eyebrow={activeSurvey?.nome ?? 'Levantamento'} onClose={close}>
      <p>Confirme os dados do produto. O endereço pode ser preenchido agora ou editado depois.</p>
      <div className="calculator-survey-save-summary">
        <div><span>Levantamento</span><strong>{activeSurvey?.nome ?? '—'}</strong></div>
        <div><span>Nova quantidade</span><strong>{formatQuantity(calculation.resultado)}</strong></div>
      </div>
      <div className="calculator-modal-fields">
        <label><span>Código do produto</span><input autoFocus value={saveCode} maxLength={80} placeholder="EX.: ITPFPHM408PAAI4" onChange={event => setSaveCode(uppercase(event.target.value))}/></label>
        <label><span>Descritivo</span><textarea value={saveDescription} maxLength={500} placeholder="DESCRITIVO DO MATERIAL" onChange={event => setSaveDescription(uppercase(event.target.value))}/></label>
        <label><span>Endereço</span><input value={saveAddress} maxLength={120} placeholder="EX.: R14A2C05" onChange={event => setSaveAddress(uppercase(event.target.value))}/></label>
      </div>
      {saveError && <div className="calculator-form-error">{saveError}</div>}
      <div className="calculator-modal-actions"><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="primary-button" type="button" onClick={saveCurrentCalculation}><Save size={16}/>Salvar produto</button></div>
    </CalculatorModal>

    if (modal.type === 'add-manual') return <CalculatorModal title="Adicionar item manualmente" eyebrow={activeSurvey?.nome ?? 'Levantamento'} onClose={close}>
      <p>Cadastre um material sem usar a câmera. Código e quantidade são obrigatórios; descritivo e endereço podem ser preenchidos ou editados depois.</p>
      <div className="calculator-modal-fields">
        <label><span>Código do produto</span><input autoFocus value={manualCode} maxLength={80} placeholder="EX.: ITPFPHM408PAAI4" onChange={event => setManualCode(uppercase(event.target.value))}/></label>
        <label><span>Descritivo</span><textarea value={manualDescription} maxLength={500} placeholder="DESCRITIVO DO MATERIAL (OPCIONAL)" onChange={event => setManualDescription(uppercase(event.target.value))}/></label>
        <label><span>Quantidade</span><input inputMode="numeric" value={manualQuantity} placeholder="0" onChange={event => setManualQuantity(sanitizeDecimalInput(event.target.value))}/></label>
        <label><span>Endereço</span><input value={manualAddress} maxLength={120} placeholder="EX.: R14A2C05" onChange={event => setManualAddress(uppercase(event.target.value))}/></label>
      </div>
      {manualError && <div className="calculator-form-error">{manualError}</div>}
      <div className="calculator-modal-actions"><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="primary-button" type="button" onClick={saveManualItem}><PackagePlus size={16}/>Adicionar ao levantamento</button></div>
    </CalculatorModal>

    if (modal.type === 'edit-item') return <CalculatorModal title="Editar item" eyebrow={activeSurvey?.nome ?? 'Levantamento'} onClose={close}>
      <div className="calculator-modal-fields">
        <label><span>Código do produto</span><input autoFocus value={editCode} maxLength={80} onChange={event => setEditCode(uppercase(event.target.value))}/></label>
        <label><span>Descritivo</span><textarea value={editDescription} maxLength={500} onChange={event => setEditDescription(uppercase(event.target.value))}/></label>
        <label><span>Quantidade</span><input inputMode="numeric" value={editQuantity} onChange={event => setEditQuantity(sanitizeDecimalInput(event.target.value))}/></label>
        <label><span>Endereço</span><input value={editAddress} maxLength={120} placeholder="EX.: R14A2C05" onChange={event => setEditAddress(uppercase(event.target.value))}/></label>
      </div>
      {editError && <div className="calculator-form-error">{editError}</div>}
      <div className="calculator-modal-actions"><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="primary-button" type="button" onClick={saveEditedItem}><Save size={16}/>Salvar alterações</button></div>
    </CalculatorModal>

    if (modal.type === 'delete-survey') return <CalculatorModal title="Excluir levantamento" onClose={close}>
      <p>O levantamento <strong>{activeSurvey?.nome}</strong> e todos os itens registrados nele serão excluídos deste dispositivo.</p>
      <div className="calculator-modal-actions"><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="calculator-danger-button" type="button" onClick={confirmDeleteSurvey}><Trash2 size={16}/>Excluir levantamento</button></div>
    </CalculatorModal>

    return <CalculatorModal title="Apagar todos os levantamentos" onClose={close}>
      <p>Todos os levantamentos e respectivas quantidades salvas neste dispositivo serão apagados. Esta ação não pode ser desfeita.</p>
      <div className="calculator-modal-actions"><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="calculator-danger-button" type="button" onClick={confirmClearSurveys}><Trash2 size={16}/>Apagar tudo</button></div>
    </CalculatorModal>
  }

  if (settingsOpen) {
    return <section className="calculator-page calculator-settings-page">
      <div className="calculator-page-heading">
        <div className="calculator-heading-copy">
          <button className="calculator-back-link" type="button" onClick={() => setSettingsOpen(false)}><ArrowLeft size={17}/>Voltar à calculadora</button>
          <h2>Configurações da calculadora</h2>
          <p>Preferências, taras e armazenamento local dos levantamentos.</p>
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

        {isAdmin && <section className="calculator-card">
          <div className="calculator-section-title"><div><h3>Administração</h3><p>Taras e parâmetros da fórmula.</p></div><span className="calculator-admin-status unlocked">Liberado</span></div>
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
            <div className="calculator-admin-actions"><button className="primary-button" type="button" onClick={saveAdministration}><Save size={16}/>Salvar alterações</button><button className="secondary-button" type="button" onClick={restoreDefaults}><RotateCcw size={16}/>Restaurar padrões</button></div>
            <div className="calculator-danger-zone"><div><strong>Levantamentos locais</strong><p>Apaga todos os levantamentos e quantidades salvos neste dispositivo.</p></div><button type="button" onClick={() => setModal({ type: 'clear-surveys' })}><Trash2 size={16}/>Apagar levantamentos</button></div>
          </div>
        </section>}

        <section className="calculator-card calculator-system-info">
          <div className="calculator-section-title"><div><h3>Sistema</h3></div></div>
          <dl><div><dt>Calculadora</dt><dd>{CALCULATOR_APP_VERSION}</dd></div><div><dt>Levantamentos</dt><dd>Local / offline</dd></div><div><dt>Exportação</dt><dd>Excel .xlsx</dd></div><div><dt>Levantamentos criados</dt><dd>{surveyState.levantamentos.length}</dd></div></dl>
        </section>
      </div>
      {modal && renderModal()}
      {notification && <CalculatorNotification message={notification.message} onClose={() => setNotification(null)}/>} 
    </section>
  }

  return <section className="calculator-page">
    <div className="calculator-page-heading">
      <div className="calculator-brand">
        <div className="calculator-logo-stage" data-calculator-logo aria-hidden="true">
          <span className="calculator-logo-shadow"/>
          <span className="calculator-logo-aura"/>
          <span className="calculator-logo-model">
            <span className="calculator-logo-rotor">
              <img className="calculator-logo-face calculator-logo-front" src={logoSrc} alt="" draggable="false"/>
              <img className="calculator-logo-face calculator-logo-back" src={logoSrc} alt="" draggable="false"/>
              <span className="calculator-logo-edge"/>
            </span>
          </span>
          <span className="calculator-logo-glint"/>
          <span className="calculator-logo-ripple"/>
        </div>
        <div className="calculator-brand-copy"><span>FERRAMENTA INDUSTRIAL</span><h2>Calculadora</h2><p>Cálculo e levantamento de materiais por rua.</p></div>
      </div>
      <div className="calculator-heading-actions"><button className="secondary-button" type="button" onClick={onBackHome}><ArrowLeft size={16}/>Início</button><button className="secondary-button" type="button" onClick={openSettings}><Settings size={17}/>Configurações</button></div>
    </div>

    <div className="calculator-layout">
      <div className="calculator-main-column">
        <section className={`calculator-result ${calculation.sucesso || calculation.codigoErro === 'DADOS_INCOMPLETOS' ? '' : 'error'}`} aria-live="polite">
          <div><span>Quantidade produzida</span><span className="calculator-container-badge">{selectedContainer?.nome ?? 'Sem recipiente'}</span></div>
          <strong>{calculation.sucesso ? formatQuantity(calculation.resultado) : '0'}</strong>
          <p>{calculation.sucesso ? `Cálculo concluído${activeSurvey ? ` · levantamento ${activeSurvey.nome}` : ' · crie um levantamento para salvar'}.` : calculation.mensagem}</p>
        </section>

        <section className="calculator-card">
          <div className="calculator-section-title"><div><h3>Recipiente</h3><p>A tara selecionada será usada no cálculo.</p></div></div>
          <div className="calculator-containers" role="group" aria-label="Seleção de recipiente">
            {activeContainers.map(container => <button key={container.id} type="button" aria-pressed={container.id === selectedContainer?.id} className={container.id === selectedContainer?.id ? 'active' : ''} onClick={() => setSelectedContainerId(container.id)}><i style={{ background: container.cor }}/><span><strong>{container.nome}</strong><small>Tara {formatWeight(container.taraKg)} kg</small></span><b>✓</b></button>)}
          </div>
        </section>

        <section className="calculator-card">
          <div className="calculator-section-title calculator-values-title">
            <div><h3>Valores do cálculo</h3><p>Leia o Data Matrix para preencher código, descritivo e gramatura.</p></div>
            <button className="calculator-datamatrix-button" type="button" onClick={() => setScannerOpen(true)}>
              <span className="calculator-datamatrix-top">
                <span className="calculator-camera-3d" aria-hidden="true"><Camera size={22}/><i/><em/></span>
                <span className="calculator-datamatrix-copy"><b>Ler Data Matrix</b><small>Abrir câmera</small></span>
              </span>
              <span className="calculator-datamatrix-bottom" aria-hidden="true"/>
              <span className="calculator-datamatrix-base" aria-hidden="true"/>
            </button>
          </div>
          {productLookup.status !== 'idle' && <div className={`calculator-product-lookup ${productLookup.status}`} aria-live="polite">
            {productLookup.status === 'searching' && <div className="calculator-product-searching"><LoaderCircle size={19}/><span><b>Buscando produto…</b><small>{productLookup.code}</small></span></div>}
            {productLookup.status === 'not-found' && <div><b>Produto não encontrado no banco de dados.</b><small>Código lido: {productLookup.code}</small></div>}
            {productLookup.status === 'error' && <div><b>{productLookup.message}</b>{productLookup.code && <small>Código lido: {productLookup.code}</small>}</div>}
            {productLookup.status === 'found' && <>
              <dl><div><dt>Código</dt><dd>{productLookup.product.codigo}</dd></div><div><dt>Descritivo</dt><dd>{productLookup.product.descritivo?.trim() || 'Não informado no banco.'}</dd></div><div><dt>Gramatura</dt><dd>{productLookup.weight.valid ? formatGrams(productLookup.weight.grams) : 'Não identificada'}</dd></div></dl>
              {!productLookup.weight.valid && <p>{productLookup.weight.reason === 'ambiguous' ? 'Mais de uma gramatura possível foi encontrada. Informe manualmente.' : 'Gramatura não encontrada no descritivo. Informe manualmente.'}</p>}
            </>}
          </div>}
          <div className="calculator-input-grid">
            <label className={calculation.campoErro === 'pesoBruto' ? 'invalid' : ''}><span>Peso bruto</span><div className="calculator-input-unit"><input value={grossWeightText} inputMode="decimal" autoComplete="off" placeholder="0,000" aria-invalid={calculation.campoErro === 'pesoBruto' || undefined} onChange={event => setGrossWeightText(sanitizeDecimalInput(event.target.value))}/><em>kg</em></div><small>{calculation.campoErro === 'pesoBruto' ? calculation.mensagem : ''}</small></label>
            <label className={calculation.campoErro === 'gramatura' ? 'invalid' : ''}><span>Gramatura</span><div className="calculator-input-unit"><input value={grammageText} inputMode="decimal" autoComplete="off" placeholder="0" aria-invalid={calculation.campoErro === 'gramatura' || undefined} onChange={event => setGrammageText(sanitizeDecimalInput(event.target.value))}/><em>g</em></div><small>{calculation.campoErro === 'gramatura' ? calculation.mensagem : ''}</small></label>
          </div>
        </section>

        {calculation.sucesso && <section className="calculator-card calculator-summary"><div className="calculator-section-title compact"><div><h3>Resumo</h3></div><span>{formatPercentage(calculation.detalhes.taxaRendimento)} · {calculation.detalhes.politicaArredondamento === 'truncar' ? 'unidades completas' : 'arredondamento convencional'}</span></div><dl><div><dt>Peso bruto</dt><dd>{formatWeight(calculation.detalhes.pesoBrutoKg)} kg</dd></div><div><dt>Tara utilizada</dt><dd>{formatWeight(calculation.detalhes.taraKg)} kg</dd></div><div><dt>Peso líquido</dt><dd>{formatWeight(calculation.detalhes.pesoLiquidoKg)} kg</dd></div><div><dt>Gramatura</dt><dd>{formatWeight(calculation.detalhes.gramaturaG)} g</dd></div></dl></section>}

        <div className="calculator-actions"><button className="primary-button" type="button" disabled={!calculation.sucesso} onClick={openSaveModal}><Save size={17}/>Salvar no levantamento</button><button className="secondary-button" type="button" disabled={!calculation.sucesso} onClick={async () => { if (!calculation.sucesso) return; try { await copyToClipboard(String(calculation.resultado)); notify('Resultado copiado.') } catch { notify('Não foi possível copiar o resultado.') } }}><Clipboard size={17}/>Copiar resultado</button><button className="calculator-text-button" type="button" onClick={clearFields}><RotateCcw size={16}/>Limpar campos</button></div>
      </div>

      <aside className="calculator-history-column">
        <section className="calculator-card calculator-survey-card">
          <div className="calculator-survey-head">
            <div><span className="calculator-survey-eyebrow">CONTROLE DE LEVANTAMENTO</span><h3>Levantamentos</h3><p>Organize a contagem por rua e mantenha cada item rastreável.</p></div>
            <span className="calculator-survey-count"><b>{activeSurvey?.itens.length ?? 0}</b><small>itens</small></span>
          </div>
          <div className="calculator-survey-create"><input value={surveyNameDraft} maxLength={80} placeholder="NOME DA RUA OU LEVANTAMENTO" onKeyDown={event => { if (event.key === 'Enter') createSurvey() }} onChange={event => setSurveyNameDraft(uppercase(event.target.value))}/><button type="button" onClick={createSurvey}><Plus size={16}/>Criar</button></div>
          {surveyState.levantamentos.length > 0 ? <>
            <div className="calculator-survey-active-row">
              <label className="calculator-survey-select"><span>Levantamento ativo</span><select value={activeSurvey?.id ?? ''} onChange={event => selectSurvey(event.target.value)}>{surveyState.levantamentos.map(survey => <option key={survey.id} value={survey.id}>{survey.nome} · {survey.itens.length} item(ns)</option>)}</select></label>
              <button className="calculator-survey-delete" type="button" title="Excluir levantamento" aria-label="Excluir levantamento" onClick={() => setModal({ type: 'delete-survey' })}><Trash2 size={17}/></button>
            </div>
            {activeSurvey && <div className="calculator-survey-overview">
              <div><span>Itens registrados</span><strong>{activeSurvey.itens.length}</strong></div>
              <div><span>Com endereço</span><strong>{activeSurveyAddressCount}</strong></div>
              <div className="calculator-survey-overview-date"><span>Última atualização</span><strong>{formatDateTime(activeSurvey.atualizadoEm)}</strong></div>
            </div>}
            <button className="calculator-survey-manual" type="button" onClick={openManualModal}><PackagePlus size={17}/><span><b>Adicionar item manualmente</b><small>Código, quantidade, endereço e descritivo</small></span></button>
            <button className="calculator-excel-button" type="button" disabled={!activeSurvey?.itens.length} onClick={exportActiveSurvey}><ExcelIcon/><span>Exportar para Excel</span></button>
            <label className="calculator-survey-search"><span>Buscar no levantamento</span><div><Search size={16}/><input value={surveySearch} type="search" maxLength={100} placeholder="CÓDIGO, DESCRITIVO OU ENDEREÇO" onChange={event => setSurveySearch(uppercase(event.target.value))}/>{surveySearch && <button type="button" aria-label="Limpar busca" onClick={() => setSurveySearch('')}><X size={14}/></button>}</div></label>
            <div className="calculator-survey-list">
              {!filteredSurveyItems.length ? <div className="calculator-survey-empty"><PackagePlus size={22}/><strong>{normalizedSurveySearch ? 'Nenhum item encontrado' : 'Levantamento vazio'}</strong><span>{normalizedSurveySearch ? 'Revise o código, descritivo ou endereço pesquisado.' : 'Use a calculadora ou adicione um item manualmente para começar.'}</span></div> : filteredSurveyItems.map(item => <article className="calculator-survey-item" key={item.id}>
                <div className="calculator-survey-item-head"><strong>{item.codigo}</strong><b>{formatQuantity(item.quantidade)}</b></div>
                <p>{item.descritivo || 'Sem descritivo informado'}</p>
                <div className={`calculator-survey-item-address ${item.endereco ? '' : 'empty'}`}><MapPin size={13}/><span>{item.endereco || 'SEM ENDEREÇO'}</span></div>
                <div className="calculator-survey-item-footer"><small>Atualizado {formatDateTime(item.atualizadoEm)}</small><div><button type="button" onClick={() => openEditItem(item)}><Pencil size={13}/>Editar</button><button className="delete" type="button" onClick={() => deleteSurveyItem(item)}><Trash2 size={13}/>Excluir</button></div></div>
              </article>)}
            </div>
          </> : <div className="calculator-survey-empty"><PackagePlus size={22}/><strong>Crie o primeiro levantamento</strong><span>Informe o nome da rua para começar a registrar materiais.</span></div>}
        </section>
      </aside>
    </div>

    {scannerOpen && <Suspense fallback={<div className="calculator-modal-backdrop"><div className="calculator-scanner-loading" role="status"><LoaderCircle size={24}/>Carregando leitor…</div></div>}><ScannerModal title="Ler Data Matrix do produto" subtitle="Aponte a câmera para o código do material" onDetected={readProductCode} onClose={() => setScannerOpen(false)}/></Suspense>}
    {modal && renderModal()}
    {notification && <CalculatorNotification message={notification.message} onClose={() => setNotification(null)}/>} 
  </section>
}

function ExcelIcon() {
  return <svg className="calculator-excel-icon" fill="currentColor" width="20" height="20" viewBox="0 0 50 50" aria-hidden="true"><path d="M28.8125.03125.8125 5.34375C.339844 5.433594 0 5.863281 0 6.34375v37.3125c0 .480469.339844.910156.8125 1l28 5.3125c.0625.011719.125.03125.1875.03125.230469 0 .445313-.070312.625-.21875.230469-.191406.375-.484375.375-.78125V1c0-.296875-.144531-.589844-.375-.78125-.230469-.191406-.519531-.242188-.8125-.1875ZM32 6v7h2v2h-2v5h2v2h-2v5h2v2h-2v6h2v2h-2v7h15c1.101563 0 2-.898437 2-2V8c0-1.101562-.898437-2-2-2Zm4 7h8v2h-8ZM6.6875 15.6875h5.125l2.6875 5.59375c.210938.441406.398438.984375.5625 1.59375h.03125c.105469-.363281.308594-.933594.59375-1.65625l2.96875-5.53125h4.6875l-5.59375 9.25 5.75 9.4375h-4.96875l-3.25-6.09375c-.121094-.226562-.246094-.644531-.375-1.25h-.03125c-.0625.285156-.210937.730469-.4375 1.3125l-3.25 6.03125h-5l5.96875-9.34375ZM36 20h8v2h-8Zm0 7h8v2h-8Zm0 8h8v2h-8Z"/></svg>
}

function CalculatorModal({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="calculator-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}><section className="calculator-modal" role="dialog" aria-modal="true" aria-label={title}><div className="calculator-modal-head"><div>{eyebrow && <span>{eyebrow}</span>}<h3>{title}</h3></div><button type="button" aria-label="Fechar" onClick={onClose}><X size={20}/></button></div>{children}</section></div>
}

function CalculatorNotification({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="calculator-notification" role="status"><span>{message}</span><button type="button" aria-label="Fechar aviso" onClick={onClose}><X size={14}/></button></div>
}
