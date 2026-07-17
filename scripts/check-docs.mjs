import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHELL_FENCE_LANGUAGES = new Set(['bash', 'console', 'sh', 'shell', 'zsh']);

function parseLinkTarget(rawTarget) {
  const trimmed = rawTarget.trim();
  if (trimmed.startsWith('<')) {
    const closing = trimmed.indexOf('>');
    return closing === -1 ? trimmed : trimmed.slice(1, closing);
  }
  return trimmed.split(/\s+/u, 1)[0] ?? '';
}

function isLocalRelativeTarget(target) {
  return (
    target.length > 0 &&
    !target.startsWith('#') &&
    !target.startsWith('/') &&
    !target.startsWith('//') &&
    !/^[a-z][a-z\d+.-]*:/iu.test(target)
  );
}

function validateLink(file, lineNumber, rawTarget, rootDir, issues) {
  const target = parseLinkTarget(rawTarget);
  if (!isLocalRelativeTarget(target)) return;

  const pathOnly = target.split('#', 1)[0].split('?', 1)[0];
  if (!pathOnly) return;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathOnly);
  } catch {
    issues.push({ file, line: lineNumber, message: `invalid link encoding: ${target}` });
    return;
  }

  const absolutePath = resolve(rootDir, dirname(file), decodedPath);
  if (!existsSync(absolutePath)) {
    issues.push({ file, line: lineNumber, message: `broken relative link: ${target}` });
  }
}

export function checkMarkdownFiles({ rootDir, markdownFiles, scripts }) {
  const issues = [];

  for (const file of [...markdownFiles].sort()) {
    const content = readFileSync(resolve(rootDir, file), 'utf8');
    const lines = content.split(/\r?\n/u);
    let fence = null;

    for (const [index, line] of lines.entries()) {
      const lineNumber = index + 1;
      const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*([^\s]*)/u);
      if (fenceMatch) {
        if (fence && line.trimStart().startsWith(fence.marker[0].repeat(fence.length))) {
          fence = null;
        } else if (!fence) {
          fence = {
            marker: fenceMatch[1][0],
            length: fenceMatch[1].length,
            language: fenceMatch[2].toLowerCase(),
          };
        }
        continue;
      }

      const validateCommands = !fence || SHELL_FENCE_LANGUAGES.has(fence.language);
      if (validateCommands) {
        for (const match of line.matchAll(/\bnpm\s+run\s+([a-z\d:_-]+)/giu)) {
          const command = match[1];
          if (!Object.hasOwn(scripts, command)) {
            issues.push({ file, line: lineNumber, message: `unknown npm script: ${command}` });
          }
        }
      }

      if (fence) continue;

      for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)) {
        validateLink(file, lineNumber, match[1], rootDir, issues);
      }

      const referenceMatch = line.match(/^\s*\[[^\]]+\]:\s*(\S+)/u);
      if (referenceMatch) {
        validateLink(file, lineNumber, referenceMatch[1], rootDir, issues);
      }
    }
  }

  return issues;
}

export function runDocsCheck({ rootDir, markdownFiles, scripts, write = console.error }) {
  const issues = checkMarkdownFiles({ rootDir, markdownFiles, scripts });
  for (const issue of issues) {
    write(`${issue.file}:${issue.line}: ${issue.message}`);
  }
  return issues.length === 0 ? 0 : 1;
}

function getVersionedMarkdownFiles(rootDir) {
  const output = execFileSync('git', ['ls-files', '-z', '--', '*.md'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  return output.split('\0').filter(Boolean);
}

function main() {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
  const exitCode = runDocsCheck({
    rootDir,
    markdownFiles: getVersionedMarkdownFiles(rootDir),
    scripts: packageJson.scripts ?? {},
  });
  if (exitCode === 0) console.log('Documentation commands and relative links are valid.');
  process.exitCode = exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
