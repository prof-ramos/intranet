#!/usr/bin/env node
import { stdin, stdout } from 'node:process';

const chunks = [];
for await (const chunk of stdin) {
  chunks.push(chunk);
}

const rawInput = Buffer.concat(chunks).toString('utf8').trim();
if (!rawInput) {
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(rawInput);
} catch {
  process.exit(0);
}

const toolInput = payload.tool_input ?? {};
const command = String(toolInput.command ?? toolInput.cmd ?? '').trim();
if (!command) {
  process.exit(0);
}

const blockedPatterns = [
  {
    pattern: /\bgit\s+add\s+(?:\.|-A|--all)(?:\s|$)/,
    reason: 'Use path-specific git add so local tool state and unrelated dirty files are not staged.',
  },
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    reason: 'Destructive reset can discard user or parallel-agent work.',
  },
  {
    pattern: /\bgit\s+checkout\s+--\b/,
    reason: 'Destructive checkout can discard user or parallel-agent work.',
  },
  {
    pattern: /\bgit\s+clean\s+-(?:[a-zA-Z]*f[a-zA-Z]*d|[a-zA-Z]*d[a-zA-Z]*f)\b/,
    reason: 'Destructive clean can remove local tool state or untracked user work.',
  },
  {
    pattern: /\bgit\s+worktree\s+remove\b.*\s--force\b/,
    reason: 'Forced worktree removal can discard unfinished parallel-agent work.',
  },
  {
    pattern: /\brm\s+-[^\n;|&]*r[^\n;|&]*f[^\n;|&]*(?:\s|$)(?:\.git|\.worktrees|\.claude\/worktrees)\b/,
    reason: 'Recursive force removal of repo/worktree metadata is blocked by project policy.',
  },
];

const blocked = blockedPatterns.find(({ pattern }) => pattern.test(command));
if (!blocked) {
  process.exit(0);
}

stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: blocked.reason,
    },
  }),
);
