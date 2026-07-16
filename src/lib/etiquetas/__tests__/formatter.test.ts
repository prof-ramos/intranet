import { describe, expect, it } from 'vitest';
import {
  formatCustomLabel,
  formatEtiquetaLines,
  formatMalaDiplomaticaLabel,
  formatPostalLabel,
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

describe('formatter de etiquetas', () => {
  it('formata postal com CEP e flags', () => {
    const label = formatPostalLabel(recipient, { peo: true, ectOpenable: true });
    expect(label.lines).toContain('Maria Silva');
    expect(label.lines).toContain('Brasília/DF');
    expect(label.lines).toContain('CEP 70170-900');
    expect(label.lines).toContain('P.E.O.');
    expect(label.lines).toContain('PODE SER ABERTO PELA ECT');
  });

  describe('formatMalaDiplomaticaLabel', () => {
    it('formata mala diplomática sem exigir endereço e aplica flags', () => {
      const label = formatMalaDiplomaticaLabel({ id: '2', nome: 'João Souza', lotacao: 'SERE' }, { peo: true });
      expect(label.lines).toEqual(['João Souza', 'SERE', 'P.E.O.']);
    });

    it('usa posto quando disponível (prioridade sobre lotacao)', () => {
      const label = formatMalaDiplomaticaLabel({ id: '2', nome: 'João Souza', lotacao: 'SERE', posto: 'Embaixada' });
      expect(label.lines).toEqual(['João Souza', 'Embaixada']);
    });

    it('usa lotacao quando posto não está disponível', () => {
      const label = formatMalaDiplomaticaLabel({ id: '2', nome: 'João Souza', lotacao: 'SERE' });
      expect(label.lines).toEqual(['João Souza', 'SERE']);
    });

    it('omite a linha caso nem posto nem lotacao estejam disponíveis', () => {
      const label = formatMalaDiplomaticaLabel({ id: '2', nome: 'João Souza' });
      expect(label.lines).toEqual(['João Souza']);
    });
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
