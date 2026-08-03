import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/issue-triage-shadow.yml', 'utf8');

describe('issue triage shadow workflow', () => {
  it('requires an explicit maintainer label for automatic triage', () => {
    expect(workflow).toMatch(/issues:\s+types: \[labeled\]/);
    expect(workflow).toContain("github.event.label.name == 'ready-for-agent'");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).not.toMatch(/^\s*issue_comment:/m);
  });
});
