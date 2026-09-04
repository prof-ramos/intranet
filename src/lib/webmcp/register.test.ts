import { afterEach, describe, expect, it, vi } from 'vitest';
import { getModelContext } from './detect';
import { registerTools } from './register';
import type { WebMcpTool } from './types';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('getModelContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when document is unavailable', () => {
    expect(getModelContext()).toBeNull();
  });

  it('returns the document modelContext when present', () => {
    const modelContext = { registerTool: vi.fn() };
    vi.stubGlobal('document', { modelContext });
    expect(getModelContext()).toBe(modelContext);
  });
});

describe('registerTools', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a no-op without WebMCP', async () => {
    const registered = await registerTools(
      [{ name: 'global-search', description: 'x', execute: async () => ({}) }],
      { signal: new AbortController().signal },
    );
    expect(registered).toBe(0);
  });

  it('registers tools against document.modelContext', async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('document', { modelContext: { registerTool } });

    const tool: WebMcpTool = {
      name: 'global-search',
      description: 'Busca global',
      execute: async () => ({ ok: true }),
    };
    const controller = new AbortController();
    const registered = await registerTools([tool], { signal: controller.signal });

    expect(registered).toBe(1);
    expect(registerTool).toHaveBeenCalledWith(tool, { signal: controller.signal });
  });

  it('stops registering after abort', async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('document', { modelContext: { registerTool } });
    const controller = new AbortController();
    controller.abort();

    const registered = await registerTools(
      [
        { name: 'a', description: 'a', execute: async () => ({}) },
        { name: 'b', description: 'b', execute: async () => ({}) },
      ],
      { signal: controller.signal },
    );

    expect(registered).toBe(0);
    expect(registerTool).not.toHaveBeenCalled();
  });
});
