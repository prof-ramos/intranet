export interface MailingTemplateVariable {
  key: string;
  label: string;
}

/** Variáveis suportadas nos templates de mala direta ({{variavel}}). */
export const MAILING_TEMPLATE_VARIABLES: MailingTemplateVariable[] = [
  { key: 'nome', label: 'Nome completo' },
  { key: 'matricula', label: 'SIAPE' },
  { key: 'categoria', label: 'Categoria associativa' },
  { key: 'situacao_associativa', label: 'Situação associativa' },
  { key: 'lotacao', label: 'Lotação / posto' },
  { key: 'padrao', label: 'Classe e padrão' },
  { key: 'endereco_completo', label: 'Endereço completo' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  { key: 'cep', label: 'CEP' },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone' },
];

export interface MailingTemplateContext {
  nome?: string | null;
  matricula?: string | null;
  categoria?: string | null;
  situacao_associativa?: string | null;
  lotacao?: string | null;
  padrao?: string | null;
  endereco_completo?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  email?: string | null;
  telefone?: string | null;
}

const VARIABLE_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

function formatValue(value: string | null | undefined): string {
  return value ?? '';
}

/** Substitui {{variavel}} no template usando o contexto fornecido. */
export function renderTemplate(template: string, context: MailingTemplateContext): string {
  return template.replace(VARIABLE_PATTERN, (_match, key: string) => {
    if (!(key in context)) return _match;
    return formatValue(context[key as keyof MailingTemplateContext]);
  });
}

/** Lista as variáveis desconhecidas usadas no template ({{outra}}) para alertar o usuário. */
export function findUnknownTemplateVariables(template: string): string[] {
  const unknown: string[] = [];
  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    const key = match[1];
    if (
      !MAILING_TEMPLATE_VARIABLES.some((variable) => variable.key === key) &&
      !unknown.includes(key)
    ) {
      unknown.push(key);
    }
  }
  return unknown;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Converte o corpo (com variáveis) para HTML simples e seguro. */
export function renderTemplateHtml(template: string, context: MailingTemplateContext): string {
  const rendered = renderTemplate(template, context);
  const paragraphs = rendered
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`);
  return paragraphs.join('\n');
}

/** Converte o corpo (com variáveis) para texto puro para o TextPart. */
export function renderTemplateText(template: string, context: MailingTemplateContext): string {
  return renderTemplate(template, context).trim();
}
