import type { CallToolResult } from '@modelcontextprotocol/server';

export function mcpRespond<T extends Record<string, unknown>>(data: T): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

export function mcpError(message: string, code = 'INVALID_REQUEST', status = 400): CallToolResult {
  const data = { error: { code, status, message } };
  return {
    ...mcpRespond(data),
    isError: true,
  };
}
