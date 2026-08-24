import { describe, expect, it } from 'vitest'
import { equivalentAI, normalizeSearch } from './normalize'
describe('normalização',()=>{it('ignora caixa e separadores seguros',()=>expect(normalizeSearch(' itpfphm-406 esai4 ')).toBe('ITPFPHM406ESAI4'));it('AI4 e AI6 equivalem somente no mesmo radical',()=>{expect(equivalentAI('ITPFPHM410PAAI4','ITPFPHM410PAAI6')).toBe(true);expect(equivalentAI('ITARLSM003BC','ITARLSM003AI4')).toBe(false)})})
