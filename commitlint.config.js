// Configuração do commitlint para validação de mensagens de commit
// Segue o padrão Conventional Commits

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos permitidos
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Alteração na documentação
        'style',    // Formatação, sem mudança de código
        'refactor', // Refatoração de código
        'perf',     // Melhoria de performance
        'test',     // Adiciona ou modifica testes
        'chore',    // Alterações em build/config
        'ci',       // Alterações em CI/CD
        'revert',   // Reverte commit anterior
      ],
    ],
    // Título deve ter no mínimo 3 caracteres
    'subject-min-length': [2, 'always', 3],
    // Título deve ter no máximo 72 caracteres
    'subject-max-length': [2, 'always', 72],
    // Título não deve terminar com ponto
    'subject-full-stop': [2, 'never', '.'],
    // Título deve estar em minúsculas
    'subject-case': [0], // Desativado - permitimos maiúsculas
    // Tipo é obrigatório
    'type-empty': [2, 'never'],
    // Escopo é opcional
    'scope-empty': [0, 'always'],
  },
};
