/// <reference types="webmcp-types" />

export function getModelContext(): WebMCP.ModelContext | null {
  if (typeof document === 'undefined') return null;
  return document.modelContext ?? null;
}
