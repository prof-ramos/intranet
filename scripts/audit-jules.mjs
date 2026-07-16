#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const repo = process.env.JULES_REPO ?? 'prof-ramos/intranet';
const jsonOutput = process.argv.includes('--json');

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const errorMessage = result.error instanceof Error ? result.error.message : '';

  return {
    ok: result.status === 0 && !result.error,
    status: result.status ?? 1,
    stdout: typeof result.stdout === 'string' ? result.stdout.trim() : '',
    stderr:
      typeof result.stderr === 'string' && result.stderr.trim()
        ? result.stderr.trim()
        : errorMessage,
  };
}

const ghResult = run('gh', [
  'pr',
  'list',
  '--repo',
  repo,
  '--state',
  'open',
  '--limit',
  '100',
  '--json',
  'number,title,headRefName,isDraft,url,createdAt,labels',
]);

const errors = [];
let openPullRequests = [];

if (ghResult.ok) {
  try {
    const parsedPullRequests = JSON.parse(ghResult.stdout || '[]');
    if (!Array.isArray(parsedPullRequests)) {
      throw new TypeError('expected a JSON array');
    }

    openPullRequests = parsedPullRequests.filter(
      (pr) =>
        (typeof pr?.headRefName === 'string' && pr.headRefName.startsWith('jules-')) ||
        (Array.isArray(pr?.labels) && pr.labels.some((label) => label?.name === 'agent:jules')),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`gh: invalid JSON output (${message})`);
  }
}

const julesResult = run('jules', ['remote', 'list', '--session', '--repo', repo]);
const activeSessionPattern = /\s(?:Planning|In Progress)\s*$/;
const activeSessions = julesResult.ok
  ? julesResult.stdout
      .split('\n')
      .filter((line) => line.includes(repo) && activeSessionPattern.test(line))
      .map((line) => line.trim())
  : [];

const nonDraftPullRequests = openPullRequests.filter((pr) => !pr.isDraft);

if (!ghResult.ok) errors.push(`gh: ${ghResult.stderr || `exit ${ghResult.status}`}`);
if (!julesResult.ok) errors.push(`jules: ${julesResult.stderr || `exit ${julesResult.status}`}`);

const report = {
  repo,
  checkedAt: new Date().toISOString(),
  openPullRequests,
  nonDraftPullRequests,
  activeSessions,
  errors,
  healthy: errors.length === 0 && nonDraftPullRequests.length === 0 && activeSessions.length === 0,
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Jules audit — ${repo}`);
  console.log(`Open Jules PRs: ${openPullRequests.length}`);
  console.log(`Open non-draft Jules PRs: ${nonDraftPullRequests.length}`);
  console.log(`Active Jules sessions: ${activeSessions.length}`);

  for (const pr of openPullRequests) {
    console.log(`- PR #${pr.number} ${pr.isDraft ? '[draft]' : '[OPEN]'} ${pr.title} — ${pr.url}`);
  }

  for (const session of activeSessions) console.log(`- ${session}`);
  for (const error of errors) console.error(`- ${error}`);
}

process.exitCode = report.healthy ? 0 : 1;
