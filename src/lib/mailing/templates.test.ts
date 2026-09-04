import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  findUnknownTemplateVariables,
  renderTemplate,
  renderTemplateHtml,
  renderTemplateText,
} from './templates';

const context = {
  nome: 'João da Silva',
  lotacao: 'Embaixada em Paris',
  email: 'joao@asof.org.br',
};

describe('renderTemplate', () => {
  it('substitui variáveis conhecidas', () => {
    expect(renderTemplate('Olá, {{nome}} ({{ lotacao }})', context)).toBe(
      'Olá, João da Silva (Embaixada em Paris)',
    );
  });

  it('aceita espaços dentro das chaves', () => {
    expect(renderTemplate('{{  nome  }}', context)).toBe('João da Silva');
  });

  it('mantém variáveis desconhecidas como estão', () => {
    expect(renderTemplate('Olá {{desconhecida}}', context)).toBe('Olá {{desconhecida}}');
  });

  it('substitui múltiplas ocorrências', () => {
    expect(renderTemplate('{{nome}} / {{nome}}', context)).toBe('João da Silva / João da Silva');
  });

  it('substitui valores nulos por string vazia', () => {
    expect(renderTemplate('X{{telefone}}Y', { telefone: null })).toBe('XY');
  });
});

describe('findUnknownTemplateVariables', () => {
  it('retorna variáveis não suportadas', () => {
    expect(findUnknownTemplateVariables('{{nome}} e {{cpf}}')).toEqual(['cpf']);
  });

  it('não retorna duplicadas', () => {
    expect(findUnknownTemplateVariables('{{cpf}} {{cpf}}')).toEqual(['cpf']);
  });

  it('retorna lista vazia para template sem variáveis desconhecidas', () => {
    expect(findUnknownTemplateVariables('Olá {{nome}}!')).toEqual([]);
  });
});

describe('escapeHtml', () => {
  it('escapa caracteres HTML', () => {
    expect(escapeHtml('<b>"x" & y</b>')).toBe('&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
  });
});

describe('renderTemplateHtml', () => {
  it('escapa conteúdo e quebra parágrafos', () => {
    const html = renderTemplateHtml('Olá, {{nome}}.\n\n<b>Segundo</b>', context);
    expect(html).toContain('&lt;b&gt;Segundo&lt;/b&gt;');
    expect(html).toContain('<p>Olá, João da Silva.</p>');
    expect(html).toContain('<p>&lt;b&gt;Segundo&lt;/b&gt;</p>');
  });

  it('converte quebra simples em <br />', () => {
    const html = renderTemplateHtml('linha1\nlinha2', context);
    expect(html).toContain('linha1<br />linha2');
  });
});

describe('renderTemplateText', () => {
  it('retorna texto puro com variáveis substituídas', () => {
    expect(renderTemplateText('Olá, {{nome}}!', context)).toBe('Olá, João da Silva!');
  });
});
