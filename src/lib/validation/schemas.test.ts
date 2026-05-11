import { describe, expect, test } from 'vitest';
import {
  loginSchema,
  changePasswordSchema,
  associateSearchParamsSchema,
  updateAssociateSchema,
  createConsultationSchema,
  updateConsultationStatusSchema,
  addNoteSchema,
} from './schemas';

describe('loginSchema', () => {
  test('aceita e-mail e senha válidos', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
    expect(result.data!.email).toBe('user@example.com');
  });

  test('rejeita e-mail vazio', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('E-mail é obrigatório.');
    }
  });

  test('rejeita e-mail inválido', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: 'secret' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('E-mail inválido.');
    }
  });

  test('rejeita senha vazia', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Senha é obrigatória.');
    }
  });
});

describe('changePasswordSchema', () => {
  test('aceita dados válidos', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    expect(result.success).toBe(true);
  });

  test('rejeita senha atual vazia', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Senha atual é obrigatória.');
    }
  });

  test('rejeita nova senha menor que 12 caracteres', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('A nova senha deve ter pelo menos 12 caracteres.');
    }
  });

  test('rejeita quando confirmação não confere', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newpassword123',
      confirmPassword: 'different123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(issue?.message).toBe('A confirmação não confere.');
    }
  });
});

describe('associateSearchParamsSchema', () => {
  test('aceita parâmetros vazios com defaults', () => {
    const result = associateSearchParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBeUndefined();
      expect(result.data.page).toBe(1);
    }
  });

  test('aceita busca e página', () => {
    const result = associateSearchParamsSchema.safeParse({ q: 'João', page: '2' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe('João');
      expect(result.data.page).toBe(2);
    }
  });

  test('rejeita página menor que 1', () => {
    const result = associateSearchParamsSchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });
});

describe('updateAssociateSchema', () => {
  test('aceita associado válido com CPF correto', () => {
    // CPF gerado válido: 529.982.247-25
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      cpf: '529.982.247-25',
      siape: '123456',
      primaryEmail: 'joao@example.com',
      secondaryEmail: null,
      phone: null,
      whatsapp: null,
      birthDate: '1990-01-15',
      address: null,
      locationCity: null,
      locationCountry: null,
      assignment: null,
      assignmentStartDate: null,
      classPattern: null,
      associationCategory: null,
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
    });
    expect(result.success).toBe(true);
  });

  test('rejeita CPF inválido (formato errado)', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      cpf: '111.111.111-11',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'cpf');
      expect(issue?.message).toBe('CPF em formato inválido.');
    }
  });

  test('rejeita CPF com dígitos repetidos', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      cpf: '000.000.000-00',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'cpf');
      expect(issue?.message).toBe('CPF em formato inválido.');
    }
  });

  test('rejeita CPF com primeiro dígito verificador incorreto', () => {
    // 529.982.247-25 é válido; alterando o primeiro DV para 3
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      cpf: '529.982.247-35',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'cpf');
      expect(issue?.message).toBe('CPF em formato inválido.');
    }
  });

  test('rejeita CPF com segundo dígito verificador incorreto', () => {
    // 529.982.247-25 é válido; alterando o segundo DV para 0
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      cpf: '529.982.247-20',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'cpf');
      expect(issue?.message).toBe('CPF em formato inválido.');
    }
  });

  test('aceita CPF nulo', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      cpf: null,
    });
    expect(result.success).toBe(true);
  });

  test('rejeita SIAPE inválido', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      siape: 'abc',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'siape');
      expect(issue?.message).toBe('SIAPE em formato inválido.');
    }
  });

  test('rejeita data de nascimento inválida', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      birthDate: '1990-02-30',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'birthDate');
      expect(issue?.message).toBe('Data de nascimento inválida.');
    }
  });

  test('rejeita data de nascimento em formato incorreto', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      birthDate: '15-01-1990',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'birthDate');
      expect(issue?.message).toBe('Data de nascimento inválida.');
    }
  });

  test('rejeita e-mail principal inválido', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      primaryEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'primaryEmail');
      expect(issue?.message).toBe('E-mail principal inválido.');
    }
  });

  test('aceita e-mail como string vazia', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      primaryEmail: '',
    });
    expect(result.success).toBe(true);
  });

  test('aceita e-mail como null', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      primaryEmail: null,
    });
    expect(result.success).toBe(true);
  });

  test('rejeita status funcional inválido', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: 'João Silva',
      functionalStatus: 'invalido',
    });
    expect(result.success).toBe(false);
  });

  test('rejeita nome vazio', () => {
    const result = updateAssociateSchema.safeParse({
      id: '1',
      fullName: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'fullName');
      expect(issue?.message).toBe('O nome completo é obrigatório.');
    }
  });
});

describe('createConsultationSchema', () => {
  test('aceita consulta válida', () => {
    const result = createConsultationSchema.safeParse({
      title: 'Dúvida sobre lotação',
      questionSummary: 'Resumo da pergunta',
      associateId: '1',
      slaDays: '7',
    });
    expect(result.success).toBe(true);
  });

  test('aceita sem associateId e questionFullText', () => {
    const result = createConsultationSchema.safeParse({
      title: 'Dúvida',
      questionSummary: 'Resumo',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.associateId).toBeUndefined();
      expect(result.data.slaDays).toBe(7);
    }
  });

  test('rejeita título vazio', () => {
    const result = createConsultationSchema.safeParse({
      title: '',
      questionSummary: 'Resumo',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Título é obrigatório.');
    }
  });

  test('rejeita resumo vazio', () => {
    const result = createConsultationSchema.safeParse({
      title: 'Título',
      questionSummary: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Resumo da pergunta é obrigatório.');
    }
  });
});

describe('updateConsultationStatusSchema', () => {
  test('aceita status válido', () => {
    const result = updateConsultationStatusSchema.safeParse({
      id: '1',
      status: 'em_analise',
    });
    expect(result.success).toBe(true);
  });

  test('rejeita status inválido', () => {
    const result = updateConsultationStatusSchema.safeParse({
      id: '1',
      status: 'invalido',
    });
    expect(result.success).toBe(false);
  });

  test('rejeita id inválido', () => {
    const result = updateConsultationStatusSchema.safeParse({
      id: '-1',
      status: 'aberta',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'id');
      expect(issue?.message).toBe('ID da consulta inválido.');
    }
  });
});

describe('addNoteSchema', () => {
  test('aceita nota válida', () => {
    const result = addNoteSchema.safeParse({
      entityType: 'consultation',
      entityId: '1',
      content: 'Nota importante',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isEscritorioResponse).toBe(false);
    }
  });

  test('rejeita tipo de entidade inválido', () => {
    const result = addNoteSchema.safeParse({
      entityType: 'invalido',
      entityId: '1',
      content: 'Nota',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'entityType');
      expect(issue?.message).toBe('Tipo de entidade inválido.');
    }
  });

  test('rejeita conteúdo vazio', () => {
    const result = addNoteSchema.safeParse({
      entityType: 'consultation',
      entityId: '1',
      content: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'content');
      expect(issue?.message).toBe('Conteúdo da nota é obrigatório.');
    }
  });
});
