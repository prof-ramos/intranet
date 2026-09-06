/// <reference types="webmcp-types" />
import type { AuthRole } from '@/lib/auth/config';

export type WebMcpTextContent = { type: 'text'; text: string };

export interface WebMcpToolResult {
  content: WebMcpTextContent[];
}

export type WebMcpToolScope = 'app' | 'official-profile';

export interface WebMcpCatalogEntry {
  name: string;
  roles: readonly AuthRole[] | 'any';
  scope: WebMcpToolScope;
}

export type WebMcpToolAnnotations = WebMCP.ToolAnnotations & {
  /** MCP-compatible hint; webmcp-types 0.1.6 only documents readOnly/untrusted. */
  destructiveHint?: boolean;
};

export type WebMcpTool = Omit<WebMCP.ModelContextTool, 'annotations'> & {
  annotations?: WebMcpToolAnnotations;
};
