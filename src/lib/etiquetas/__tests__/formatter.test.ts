import { describe, expect, it } from 'vitest';
import {
  formatCustomLabel,
  formatEtiquetaLines,
  formatMalaDiplomaticaLabel,
  formatPostalLabel,
  formatCep,
  type EtiquetaRecipient,
} from '@/lib/etiquetas';

const recipient: EtiquetaRecipient = {
  id: '1',
  nome: 'Maria Silva',
  matricula: '123',
  categoria: 'Titular',
  situacaoAssociativa: 'ativo',
  lotacao: 'Embaixada em Paris',
  posto: 'Embaixada em Paris',
  enderecoCompleto: 'Rua das Flores, 100',
  bairro: 'Centro',
  cidade: 'Brasília',
  uf: 'DF',
  cep: '70170900',
  email: 'maria@example.test',
  telefone: '(61) 99999-0000',
};

describe('formatCep', () => {
  it('formats an 8 digit CEP correctly', () => {
    expect(formatCep('12345678')).toBe('12345-678');
    expect(formatCep('12.345-678')).toBe('12345-678');
    expect(formatCep('  12345678  ')).toBe('12345-678');
  });

  it('returns normalized string when length is not 8 digits', () => {
    expect(formatCep('1234567')).toBe('1234567');
    expect(formatCep('123456789')).toBe('123456789');
    expect(formatCep('invalid')).toBe('invalid');
  });

  it('returns null for empty, null, or invalid input', () => {
    expect(formatCep(null)).toBeNull();
    expect(formatCep(undefined)).toBeNull();
    expect(formatCep('')).toBeNull();
    expect(formatCep('   ')).toBeNull();
    expect(formatCep('undefined')).toBeNull();
    expect(formatCep('null')).toBeNull();
  });
});

describe('formatter de etiquetas', () => {
  it('formata postal com CEP e flags', () => {
    const label = formatPostalLabel(recipient, { peo: true, ectOpenable: true });
    expect(label.lines).toContain('Maria Silva');
    expect(label.lines).toContain('Brasília/DF');
    expect(label.lines).toContain('CEP 70170-900');
    expect(label.lines).toContain('P.E.O.');
    expect(label.lines).toContain('PODE SER ABERTO PELA ECT');
  });

  it('formata mala diplomática sem exigir endereço', () => {
    const label = formatMalaDiplomaticaLabel(
      { id: '2', nome: 'João Souza', lotacao: 'SERE' },
      { peo: true },
    );
    expect(label.lines).toEqual(['João Souza', 'SERE', 'P.E.O.']);
  });

  it('formata campos customizados em ordem previsível', () => {
    const label = formatCustomLabel(recipient, ['cep', 'nome', 'telefone']);
    expect(label.lines).toEqual(['Maria Silva', 'CEP 70170-900', '(61) 99999-0000']);
  });

  it('ignora campos ausentes e literais inválidos', () => {
    const labels = formatEtiquetaLines({
      templateCode: '6182',
      mode: 'custom',
      recipients: [{ id: '3', nome: 'undefined', enderecoCompleto: null, cidade: 'Lisboa' }],
      selectedFields: ['nome', 'endereco_completo', 'cidade_uf'],
    });
    expect(labels[0].lines).toEqual(['Lisboa']);
  });

  it('respeita seleção manual de campos em modo postal', () => {
    const labels = formatEtiquetaLines({
      templateCode: '6182',
      mode: 'postal',
      recipients: [recipient],
      selectedFields: ['nome', 'cidade_uf'],
    });

    expect(labels[0].lines).toEqual(['Maria Silva', 'Brasília/DF']);
  });
});
