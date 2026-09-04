import { describe, expect, it } from 'vitest';
import { isOfficialProfilePath, listToolNamesFor, officialIdFromProfilePath } from './catalog';

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
});
