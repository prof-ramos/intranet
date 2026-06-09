/**
 * Erro de IA com mensagem segura para exibição ao usuário.
 *
 * Lançado deliberadamente pela camada `@/lib/ai/*` quando há uma condição
 * conhecida e apresentável (chave ausente, conteúdo bloqueado, geração vazia,
 * timeout, modelo não suportado). As mensagens NUNCA devem conter PII nem
 * detalhes crus do provedor — apenas texto pronto para o usuário final.
 *
 * Está em módulo próprio (e não em `gemini.ts`) para que os consumidores
 * possam importá-lo sem depender do módulo mockado nos testes.
 */
export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiError';
  }
}
