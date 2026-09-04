import type { WebMcpToolResult } from './types';

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function toolTextResult(text: string): WebMcpToolResult {
  return { content: [{ type: 'text', text }] };
}

export function toolJsonResult(data: unknown): WebMcpToolResult {
  return toolTextResult(JSON.stringify(data, jsonReplacer, 2));
}

export function toolErrorResult(error: unknown): WebMcpToolResult {
  const message = error instanceof Error ? error.message : 'Falha ao executar a ferramenta.';
  return toolTextResult(`Erro: ${message}`);
}

export async function runTool(fn: () => Promise<unknown>): Promise<WebMcpToolResult> {
  try {
    const data = await fn();
    if (data === undefined) {
      return toolJsonResult({ success: true });
    }
    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      (data as { success: unknown }).success === false &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
    ) {
      return toolTextResult(`Erro: ${(data as { error: string }).error}`);
    }
    return toolJsonResult(data);
  } catch (error) {
    return toolErrorResult(error);
  }
}

export function navigateResult(href: string, message: string): WebMcpToolResult {
  return toolJsonResult({ opened: href, message });
}
