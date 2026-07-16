import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const auditPath = path.resolve('scripts/audit-jules.mjs');
const tempDirectories: string[] = [];

function createFakeCliDirectory(options: { ghOutput: unknown; julesOutput: string }): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'asof-jules-audit-'));
  tempDirectories.push(directory);

  const ghScript = `#!/bin/sh
[ "$1" = "api" ] || { echo "missing api command" >&2; exit 2; }
case " $* " in *" --paginate "*) ;; *) echo "missing --paginate" >&2; exit 2 ;; esac
case " $* " in *" --slurp "*) ;; *) echo "missing --slurp" >&2; exit 2 ;; esac
printf '%s\\n' '${JSON.stringify(options.ghOutput)}'
`;
  const julesScript = `#!/bin/sh
printf '%s\\n' '${options.julesOutput.replaceAll("'", "'\\''")}'
`;

  const ghPath = path.join(directory, 'gh');
  const julesPath = path.join(directory, 'jules');
  writeFileSync(ghPath, ghScript);
  writeFileSync(julesPath, julesScript);
  chmodSync(ghPath, 0o755);
  chmodSync(julesPath, 0o755);

  return directory;
}

function runAudit(cliDirectory: string) {
  return spawnSync(process.execPath, [auditPath, '--json'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: cliDirectory,
      JULES_REPO: 'prof-ramos/intranet',
    },
  });
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('audit-jules', () => {
  it('finds Jules pull requests across every paginated API page', () => {
    const cliDirectory = createFakeCliDirectory({
      ghOutput: [
        [
          {
            number: 1,
            title: 'Unrelated pull request',
            head: { ref: 'feature/example' },
            draft: false,
            html_url: 'https://github.com/prof-ramos/intranet/pull/1',
            created_at: '2026-07-16T00:00:00Z',
            labels: [],
          },
        ],
        [
          {
            number: 2,
            title: 'Jules pull request on a later page',
            head: { ref: 'jules-late-page' },
            draft: false,
            html_url: 'https://github.com/prof-ramos/intranet/pull/2',
            created_at: '2026-07-16T00:01:00Z',
            labels: [{ name: 'agent:jules' }],
          },
        ],
      ],
      julesOutput: 'prof-ramos/intranet  Completed',
    });

    const result = runAudit(cliDirectory);
    const report = JSON.parse(result.stdout);

    expect(result.status).toBe(1);
    expect(report.openPullRequests).toHaveLength(1);
    expect(report.openPullRequests[0]).toMatchObject({
      number: 2,
      headRefName: 'jules-late-page',
      isDraft: false,
    });
  });

  it.each([
    'Queued',
    'Planning',
    'Awaiting Plan Approval',
    'Awaiting User Feedback',
    'In Progress',
    'Paused',
  ])('treats the non-terminal %s state as active', (state) => {
    const cliDirectory = createFakeCliDirectory({
      ghOutput: [[]],
      julesOutput: `prof-ramos/intranet  ${state}`,
    });

    const result = runAudit(cliDirectory);
    const report = JSON.parse(result.stdout);

    expect(result.status).toBe(1);
    expect(report.activeSessions).toEqual([`prof-ramos/intranet  ${state}`]);
    expect(report.healthy).toBe(false);
  });

  it.each(['Failed', 'Completed'])('does not treat the terminal %s state as active', (state) => {
    const cliDirectory = createFakeCliDirectory({
      ghOutput: [[]],
      julesOutput: `prof-ramos/intranet  ${state}`,
    });

    const result = runAudit(cliDirectory);
    const report = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(report.activeSessions).toEqual([]);
    expect(report.healthy).toBe(true);
  });
});
