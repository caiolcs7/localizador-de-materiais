import { describe, expect, it } from 'vitest';
import { defaultSettings } from './models';
import { parseScan } from './parser';

describe('regras de endereço do Leitor DM', () => {
  it.each([
    'R06A1C06DP01',
    'R07A1GHBEG01',
    'R07A1AVFEG01',
    'R13B29',
  ])('reconhece %s como endereço', (address) => {
    const result = parseScan(address, defaultSettings.rules);
    expect(result.valid).toBe(true);
    expect(result.type).toBe('address');
    expect(result.normalized).toBe(address);
  });

  it('continua classificando código de produto como produto', () => {
    const result = parseScan('ITPFPHM408PAAI4', defaultSettings.rules);
    expect(result.valid).toBe(true);
    expect(result.type).toBe('product');
  });
});
