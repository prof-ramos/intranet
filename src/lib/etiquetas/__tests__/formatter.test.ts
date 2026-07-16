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
  describe('formatPostalLabel', () => {
    it('formata postal completo com CEP e flags', () => {
      const label = formatPostalLabel(recipient, { peo: true, ectOpenable: true });
      expect(label.lines).toEqual([
        'Maria Silva',
        'Rua das Flores, 100',
        'Centro',
        'Brasília/DF',
        'CEP 70170-900',
        'P.E.O.',
        'PODE SER ABERTO PELA ECT',
      ]);
    });

    it('omite campos opcionais ausentes', () => {
      const label = formatPostalLabel({ id: '2', nome: 'João Souza', enderecoCompleto: 'Rua A' });
      expect(label.lines).toEqual(['João Souza', 'Rua A']);
    });

    it('formata corretamente apenas com cidade ou apenas com uf', () => {
      const labelCidade = formatPostalLabel({ id: '3', nome: 'Ana', cidade: 'Goiânia' });
      expect(labelCidade.lines).toEqual(['Ana', 'Goiânia']);

      const labelUf = formatPostalLabel({ id: '4', nome: 'Beto', uf: 'GO' });
      expect(labelUf.lines).toEqual(['Beto', 'GO']);
    });

    it('mantém CEP sem formatação se não tiver 8 dígitos', () => {
      const label = formatPostalLabel({ id: '5', nome: 'Carlos', cep: '12345' });
      expect(label.lines).toContain('CEP 12345');
    });

    it('remove linhas duplicadas (case insensitive)', () => {
      const label = formatPostalLabel({
        id: '6',
        nome: 'Diana',
        enderecoCompleto: 'Rua A',
        complemento: 'Rua a', // Duplicado com enderecoCompleto, ignora case
      });
      expect(label.lines).toEqual(['Diana', 'Rua A']);
    });

    it('aplica flags individuais', () => {
      const labelPeo = formatPostalLabel(recipient, { peo: true });
      expect(labelPeo.lines).toContain('P.E.O.');
      expect(labelPeo.lines).not.toContain('PODE SER ABERTO PELA ECT');

      const labelEct = formatPostalLabel(recipient, { ectOpenable: true });
      expect(labelEct.lines).not.toContain('P.E.O.');
      expect(labelEct.lines).toContain('PODE SER ABERTO PELA ECT');

      const labelNone = formatPostalLabel(recipient);
      expect(labelNone.lines).not.toContain('P.E.O.');
      expect(labelNone.lines).not.toContain('PODE SER ABERTO PELA ECT');
    });
  });

  it('formata mala diplomática sem exigir endereço', () => {
    const label = formatMalaDiplomaticaLabel({ id: '2', nome: 'João Souza', lotacao: 'SERE' }, { peo: true });
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
