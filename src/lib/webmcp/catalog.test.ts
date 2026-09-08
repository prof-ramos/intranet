import { describe, expect, it } from 'vitest';
import {
  isOfficialProfilePath,
  listToolNamesFor,
  officialIdFromProfilePath,
  WEBMCP_CATALOG,
} from './catalog';

const ACTIVITY_TOOLS = [
  'open-activities',
  'open-activity',
  'start-create-activity',
  'complete-activity',
  'assign-activity',
] as const;

describe('isOfficialProfilePath', () => {
  it('matches the official profile route', () => {
    expect(isOfficialProfilePath('/app/associados/42')).toBe(true);
  });

  it('rejects nested official routes', () => {
    expect(isOfficialProfilePath('/app/associados/42/editar')).toBe(false);
    expect(isOfficialProfilePath('/app/associados/novo')).toBe(false);
    expect(isOfficialProfilePath('/app/associados')).toBe(false);
  });
});

describe('officialIdFromProfilePath', () => {
  it('returns the numeric id of the open ficha', () => {
    expect(officialIdFromProfilePath('/app/associados/15')).toBe(15);
    expect(officialIdFromProfilePath('/app/associados/15/editar')).toBeNull();
    expect(officialIdFromProfilePath('/app/associados')).toBeNull();
  });
});

describe('listToolNamesFor', () => {
  it('exposes email generation to secretaria but not diretoria', () => {
    const secretaria = listToolNamesFor('secretaria', '/app');
    const diretoria = listToolNamesFor('diretoria', '/app');

    expect(secretaria).toContain('generate-institutional-email');
    expect(secretaria).toContain('open-email-generator');
    expect(secretaria).toContain('start-create-official');
    expect(diretoria).not.toContain('generate-institutional-email');
    expect(diretoria).not.toContain('open-email-generator');
    expect(diretoria).not.toContain('start-create-official');
  });

  it('keeps dependent tools on the profile page only', () => {
    const onList = listToolNamesFor('secretaria', '/app/associados');
    const onProfile = listToolNamesFor('secretaria', '/app/associados/15');

    expect(onList).not.toContain('add-dependent');
    expect(onProfile).toContain('add-dependent');
    expect(onProfile).toContain('remove-health-agreement');
  });

  it('always includes cadastro search tools for authenticated staff', () => {
    const names = listToolNamesFor('secretaria', '/app');
    expect(names).toEqual(
      expect.arrayContaining([
        'global-search',
        'search-officials',
        'get-official-profile',
        'list-official-letters',
        'count-mailing-audience',
      ]),
    );
  });

  it('exposes activity tools to all staff roles app-wide and omits list-activities', () => {
    expect(WEBMCP_CATALOG.filter((entry) => entry.name.includes('activit'))).toHaveLength(5);

    for (const role of ['admin', 'diretoria', 'secretaria'] as const) {
      const names = listToolNamesFor(role, '/app/atividades');
      expect(names).toEqual(expect.arrayContaining([...ACTIVITY_TOOLS]));
      expect(names).not.toContain('list-activities');
    }
  });

  it('keeps activity writes aligned with updateActivityAction roles, not a narrower subset', () => {
    const diretoria = listToolNamesFor('diretoria', '/app');
    expect(diretoria).toContain('complete-activity');
    expect(diretoria).toContain('assign-activity');
    expect(diretoria).toContain('start-create-activity');
    expect(diretoria).not.toContain('generate-institutional-email');
  });
});
