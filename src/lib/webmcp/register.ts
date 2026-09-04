import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import { getModelContext } from './detect';
import type { WebMcpTool } from './types';

const logger = createLogger('webmcp');

export async function registerTools(
  tools: readonly WebMcpTool[],
  options: { signal: AbortSignal },
): Promise<number> {
  const modelContext = getModelContext();
  if (!modelContext) return 0;

  let registered = 0;
  for (const tool of tools) {
    if (options.signal.aborted) break;
    try {
      await modelContext.registerTool(tool, { signal: options.signal });
      registered += 1;
    } catch (error) {
      logger.warn('Failed to register WebMCP tool', {
        tool: tool.name,
        error: toSafeErrorLog(error),
      });
    }
  }
  return registered;
}
