'use client';

import { globalSearchAction } from '@/app/app/search/actions';
import {
  getOfficialProfileAction,
  searchOfficialsAction,
} from '@/app/app/associados/webmcp-actions';
import {
  addDependentAction,
  addHealthAgreementAction,
  editDependentAction,
  editHealthAgreementAction,
  removeDependentAction,
  removeHealthAgreementAction,
} from '@/app/app/associados/[id]/actions';
import {
  cancelOfficialLetterAction,
  generateAiTextAction,
  getOfficialLetterAction,
  getOfficialLettersAction,
  sendForSignatureAction,
} from '@/app/app/secretaria/oficios/actions';
import { countMalaDiretaAudienceAction } from '@/app/app/secretaria/mala-direta/actions';
import { generateEmailAction } from '@/app/app/secretaria/emails/gerar/actions';
import {
  serializeOfficialLetterDetail,
  serializeOfficialLetterListItem,
} from './serialize-letters';
import { downloadAuthenticatedCsv } from './download-csv';
import { objectToFormData } from './form-data';
import { optionalPositiveInt, optionalString, requiredPositiveInt, requiredString } from './args';
import { navigateResult, runTool, toolJsonResult, toolTextResult } from './result';
import type { WebMcpTool } from './types';

type RouterLike = {
  push: (href: string) => void;
  refresh: () => void;
};

type ToolContext = {
  officialId?: number | null;
};

const DESTRUCTIVE = { destructiveHint: true } as const;

function resolveFichaAssociateId(
  inputAssociateId: unknown,
  officialId: number | null | undefined,
): number {
  if (officialId == null) {
    throw new Error('Abra a ficha do oficial para usar esta ferramenta.');
  }
  const provided = optionalPositiveInt(inputAssociateId, 'ID do oficial');
  if (provided != null && provided !== officialId) {
    throw new Error(
      `Esta ficha é do oficial ${officialId}. associateId precisa coincidir com a rota aberta.`,
    );
  }
  return officialId;
}

function buildMalaDiretaQuery(input: Record<string, unknown>): string {
  const params = new URLSearchParams();
  const associationStatus = optionalString(input.associationStatus) ?? 'associado';
  const functionalStatus = optionalString(input.functionalStatus) ?? 'todos';
  const location = optionalString(input.location) ?? 'todos';
  params.set('associationStatus', associationStatus);
  params.set('functionalStatus', functionalStatus);
  params.set('location', location);
  return params.toString();
}

export function buildSecretariaTools(router: RouterLike, context: ToolContext = {}): WebMcpTool[] {
  const officialId = context.officialId ?? null;
  const navigate = (href: string, message: string) => {
    router.push(href);
    return navigateResult(href, message);
  };

  return [
    {
      name: 'global-search',
      description:
        'Busca oficiais de chancelaria pelo nome e atividades pelo título na intranet ASOF. Use para localizar um registro rapidamente. Não busca por CPF ou SIAPE — use search-officials para isso.',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Termo de busca (mínimo 2 caracteres).' },
        },
        required: ['q'],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) =>
        runTool(() => globalSearchAction(requiredString(input.q, 'Termo de busca'))),
    },
    {
      name: 'search-officials',
      description:
        'Pesquisa o cadastro de oficiais por nome, CPF ou SIAPE, com filtros de vínculo ASOF, situação funcional, contribuição e localização (brasil/exterior).',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Termo de busca. Mínimo 2 caracteres para nome.' },
          searchBy: {
            type: 'string',
            enum: ['name', 'cpf', 'siape'],
            description: 'Campo de busca. Padrão: name.',
          },
          contributionStatus: { type: 'string', enum: ['em_dia', 'inadimplente'] },
          functionalStatus: {
            type: 'string',
            enum: ['ativo', 'aposentado', 'cedido', 'em_licenca'],
          },
          associationStatus: { type: 'string', enum: ['associado', 'nao_associado'] },
          location: { type: 'string', enum: ['brasil', 'exterior'] },
          page: { type: 'integer', description: 'Página da listagem, começando em 1.' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input) =>
        runTool(() =>
          searchOfficialsAction({
            q: optionalString(input.q) ?? '',
            searchBy: optionalString(input.searchBy) as 'name' | 'cpf' | 'siape' | undefined,
            contributionStatus: optionalString(input.contributionStatus) as
              | 'em_dia'
              | 'inadimplente'
              | undefined,
            functionalStatus: optionalString(input.functionalStatus) as
              | 'ativo'
              | 'aposentado'
              | 'cedido'
              | 'em_licenca'
              | undefined,
            associationStatus: optionalString(input.associationStatus) as
              | 'associado'
              | 'nao_associado'
              | undefined,
            location: optionalString(input.location) as 'brasil' | 'exterior' | undefined,
            page: optionalPositiveInt(input.page, 'Página') ?? 1,
          }),
        ),
    },
    {
      name: 'get-official-profile',
      description:
        'Retorna a ficha operacional de um oficial de chancelaria (identificação, lotação, vínculo ASOF, dependentes, convênios e atividades vinculadas).',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID numérico do oficial.' },
        },
        required: ['id'],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) =>
        runTool(() =>
          getOfficialProfileAction({ id: requiredPositiveInt(input.id, 'ID do oficial') }),
        ),
    },
    {
      name: 'open-officials-list',
      description:
        'Abre a listagem de oficiais na UI, opcionalmente com o termo de busca já preenchido.',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Termo de busca por nome a aplicar na URL.' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const q = optionalString(input.q);
        const href = q ? `/app/associados?q=${encodeURIComponent(q)}` : '/app/associados';
        return navigate(href, 'Abrindo o cadastro de oficiais.');
      },
    },
    {
      name: 'open-official-profile',
      description: 'Abre a ficha do oficial na UI para revisão humana.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID numérico do oficial.' },
        },
        required: ['id'],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const id = requiredPositiveInt(input.id, 'ID do oficial');
        return navigate(`/app/associados/${id}`, `Abrindo a ficha do oficial ${id}.`);
      },
    },
    {
      name: 'start-create-official',
      description:
        'Abre o formulário humano de cadastro de um novo oficial. Não grava dados — a secretaria revisa e envia o formulário.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () =>
        navigate('/app/associados/novo', 'Abrindo o formulário de novo oficial.'),
    },
    {
      name: 'start-edit-official',
      description:
        'Abre o formulário humano de edição da ficha do oficial. Não grava dados — a secretaria revisa e envia o formulário.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID numérico do oficial.' },
        },
        required: ['id'],
      },
      execute: async (input) => {
        const id = requiredPositiveInt(input.id, 'ID do oficial');
        return navigate(`/app/associados/${id}/editar`, `Abrindo a edição do oficial ${id}.`);
      },
    },
    {
      name: 'list-official-letters',
      description: 'Lista ofícios da Secretaria, opcionalmente filtrados por ano.',
      inputSchema: {
        type: 'object',
        properties: {
          year: { type: 'integer', description: 'Ano dos ofícios (ex.: 2026).' },
          limit: { type: 'integer', description: 'Limite de itens (máximo 1000).' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input) =>
        runTool(async () => {
          const letters = await getOfficialLettersAction(
            optionalPositiveInt(input.year, 'Ano'),
            optionalPositiveInt(input.limit, 'Limite'),
          );
          return letters.map(serializeOfficialLetterListItem);
        }),
    },
    {
      name: 'get-official-letter',
      description: 'Retorna um ofício pelo ID, incluindo o texto plano do corpo (sem HTML).',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID numérico do ofício.' },
        },
        required: ['id'],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) =>
        runTool(async () => {
          const id = requiredPositiveInt(input.id, 'ID do ofício');
          const letter = await getOfficialLetterAction(id);
          if (!letter) return { found: false, id };
          return { found: true, letter: serializeOfficialLetterDetail(letter) };
        }),
    },
    {
      name: 'start-create-official-letter',
      description:
        'Abre o formulário humano de novo ofício. Não grava o documento — a secretaria revisa o texto rico e salva na UI.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () =>
        navigate('/app/secretaria/oficios/novo', 'Abrindo o formulário de novo ofício.'),
    },
    {
      name: 'start-edit-official-letter',
      description: 'Abre o formulário humano de edição de um ofício existente.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID numérico do ofício.' },
        },
        required: ['id'],
      },
      execute: async (input) => {
        const id = requiredPositiveInt(input.id, 'ID do ofício');
        return navigate(
          `/app/secretaria/oficios/${id}/editar`,
          `Abrindo a edição do ofício ${id}.`,
        );
      },
    },
    {
      name: 'generate-official-letter-draft',
      description:
        'Gera uma sugestão de texto de ofício com IA. Não persiste o ofício — use start-create-official-letter para abrir o formulário.',
      inputSchema: {
        type: 'object',
        properties: {
          recipient: { type: 'string', description: 'Destinatário.' },
          recipientRole: { type: 'string', description: 'Cargo do destinatário.' },
          subject: { type: 'string', description: 'Assunto do ofício.' },
          itamaratySector: { type: 'string', description: 'Setor do Itamaraty.' },
          signatory: { type: 'string', description: 'Nome do signatário.' },
          signatoryRole: { type: 'string', description: 'Cargo do signatário.' },
          instruction: { type: 'string', description: 'Instrução para a geração do texto.' },
        },
        required: [
          'recipient',
          'recipientRole',
          'subject',
          'itamaratySector',
          'signatory',
          'signatoryRole',
          'instruction',
        ],
      },
      execute: async (input) =>
        runTool(() =>
          generateAiTextAction({
            recipient: requiredString(input.recipient, 'Destinatário'),
            recipientRole: requiredString(input.recipientRole, 'Cargo do destinatário'),
            subject: requiredString(input.subject, 'Assunto'),
            itamaratySector: requiredString(input.itamaratySector, 'Setor'),
            signatory: requiredString(input.signatory, 'Signatário'),
            signatoryRole: requiredString(input.signatoryRole, 'Cargo do signatário'),
            instruction: requiredString(input.instruction, 'Instrução'),
          }),
        ),
    },
    {
      name: 'send-official-letter-for-signature',
      description: 'Envia um ofício existente para assinatura digital no Assinafy.',
      inputSchema: {
        type: 'object',
        properties: {
          oficioId: { type: 'integer', description: 'ID do ofício.' },
          signerEmail: { type: 'string', description: 'E-mail do signatário no Assinafy.' },
        },
        required: ['oficioId', 'signerEmail'],
      },
      execute: async (input) => {
        const result = await runTool(() =>
          sendForSignatureAction({
            oficioId: requiredPositiveInt(input.oficioId, 'ID do ofício'),
            signerEmail: requiredString(input.signerEmail, 'E-mail do signatário'),
          }),
        );
        router.refresh();
        return result;
      },
    },
    {
      name: 'cancel-official-letter',
      description:
        'Cancela um ofício existente, sem o diálogo de confirmação da UI. Ação destrutiva e irreversível pelo próprio ofício.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID do ofício.' },
        },
        required: ['id'],
      },
      annotations: DESTRUCTIVE,
      execute: async (input) => {
        const result = await runTool(() =>
          cancelOfficialLetterAction(requiredPositiveInt(input.id, 'ID do ofício')),
        );
        router.refresh();
        return result;
      },
    },
    {
      name: 'count-mailing-audience',
      description:
        'Conta oficiais que entram na mala direta (nome + e-mail principal), com os mesmos filtros da tela de exportação.',
      inputSchema: {
        type: 'object',
        properties: {
          associationStatus: {
            type: 'string',
            enum: ['associado', 'nao_associado', 'todos'],
            description: 'Vínculo ASOF. Padrão: associado.',
          },
          functionalStatus: {
            type: 'string',
            enum: ['ativo', 'aposentado', 'cedido', 'em_licenca', 'todos'],
          },
          location: { type: 'string', enum: ['brasil', 'exterior', 'todos'] },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input) =>
        runTool(() =>
          countMalaDiretaAudienceAction({
            associationStatus: optionalString(input.associationStatus) as
              | 'associado'
              | 'nao_associado'
              | 'todos'
              | undefined,
            functionalStatus: optionalString(input.functionalStatus) as
              | 'ativo'
              | 'aposentado'
              | 'cedido'
              | 'em_licenca'
              | 'todos'
              | undefined,
            location: optionalString(input.location) as 'brasil' | 'exterior' | 'todos' | undefined,
          }),
        ),
    },
    {
      name: 'export-gmail-contacts-csv',
      description:
        'Dispara o download autenticado do CSV de contatos no formato Google Contacts. Não envia e-mail.',
      inputSchema: {
        type: 'object',
        properties: {
          associationStatus: {
            type: 'string',
            enum: ['associado', 'nao_associado', 'todos'],
          },
          functionalStatus: {
            type: 'string',
            enum: ['ativo', 'aposentado', 'cedido', 'em_licenca', 'todos'],
          },
          location: { type: 'string', enum: ['brasil', 'exterior', 'todos'] },
        },
      },
      execute: async (input) => {
        const href = `/app/secretaria/mala-direta/download?${buildMalaDiretaQuery(input)}`;
        const download = await downloadAuthenticatedCsv(href);
        if (!download.ok) {
          return toolTextResult(`Erro: ${download.message}`);
        }
        return toolJsonResult({
          started: true,
          href,
          filename: download.filename,
          message: 'Download do CSV de contatos para o Gmail concluído.',
        });
      },
    },
    {
      name: 'generate-institutional-email',
      description:
        'Gera assunto e HTML de e-mail institucional (newsletter, convite, comunicado ou aviso) via IA. Não envia o e-mail.',
      inputSchema: {
        type: 'object',
        properties: {
          emailType: {
            type: 'string',
            enum: ['newsletter', 'convite', 'comunicado', 'aviso'],
          },
          prompt: { type: 'string', description: 'Descrição do conteúdo do e-mail.' },
        },
        required: ['emailType', 'prompt'],
      },
      execute: async (input) =>
        runTool(() =>
          generateEmailAction(
            requiredString(input.emailType, 'Tipo de e-mail'),
            requiredString(input.prompt, 'Descrição do e-mail'),
          ),
        ),
    },
    {
      name: 'open-mala-direta',
      description: 'Abre as campanhas de mala direta (e-mail em lote e etiquetas).',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => navigate('/app/mala-direta', 'Abrindo as campanhas de mala direta.'),
    },
    {
      name: 'open-email-generator',
      description: 'Abre o gerador de e-mails institucionais com IA.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () =>
        navigate('/app/secretaria/emails/gerar', 'Abrindo o gerador de e-mails.'),
    },
    {
      name: 'add-dependent',
      description:
        'Adiciona um dependente à ficha do oficial aberta. associateId, se enviado, precisa coincidir com a rota.',
      inputSchema: {
        type: 'object',
        properties: {
          associateId: {
            type: 'integer',
            description: 'ID do oficial da ficha aberta. Se omitido, usa a rota.',
          },
          name: { type: 'string', description: 'Nome do dependente.' },
          relationship: { type: 'string', description: 'Parentesco.' },
        },
        required: ['name', 'relationship'],
      },
      execute: async (input) => {
        const result = await runTool(() =>
          addDependentAction(
            objectToFormData({
              associateId: resolveFichaAssociateId(input.associateId, officialId),
              name: requiredString(input.name, 'Nome do dependente'),
              relationship: requiredString(input.relationship, 'Parentesco'),
            }),
          ),
        );
        router.refresh();
        return result;
      },
    },
    {
      name: 'edit-dependent',
      description: 'Atualiza nome ou parentesco de um dependente da ficha aberta.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID do dependente.' },
          associateId: { type: 'integer', description: 'ID do oficial.' },
          name: { type: 'string' },
          relationship: { type: 'string' },
        },
        required: ['id'],
      },
      execute: async (input) => {
        const result = await runTool(() =>
          editDependentAction(
            objectToFormData({
              id: requiredPositiveInt(input.id, 'ID do dependente'),
              associateId: resolveFichaAssociateId(input.associateId, officialId),
              name: optionalString(input.name),
              relationship: optionalString(input.relationship),
            }),
          ),
        );
        router.refresh();
        return result;
      },
    },
    {
      name: 'remove-dependent',
      description:
        'Remove um dependente da ficha do oficial aberta, sem diálogo de confirmação da UI. Ação destrutiva.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID do dependente.' },
          associateId: {
            type: 'integer',
            description: 'ID do oficial da ficha aberta. Se omitido, usa a rota.',
          },
        },
        required: ['id'],
      },
      annotations: DESTRUCTIVE,
      execute: async (input) => {
        const result = await runTool(() =>
          removeDependentAction(
            objectToFormData({
              id: requiredPositiveInt(input.id, 'ID do dependente'),
              associateId: resolveFichaAssociateId(input.associateId, officialId),
            }),
          ),
        );
        router.refresh();
        return result;
      },
    },
    {
      name: 'add-health-agreement',
      description: 'Adiciona um convênio de saúde à ficha do oficial aberta.',
      inputSchema: {
        type: 'object',
        properties: {
          associateId: { type: 'integer', description: 'ID do oficial.' },
          provider: { type: 'string', description: 'Nome do convênio.' },
          startDate: { type: 'string', description: 'Início no formato AAAA-MM-DD.' },
          endDate: { type: 'string', description: 'Término no formato AAAA-MM-DD.' },
        },
        required: ['provider'],
      },
      execute: async (input) => {
        const result = await runTool(() =>
          addHealthAgreementAction(
            objectToFormData({
              associateId: resolveFichaAssociateId(input.associateId, officialId),
              provider: requiredString(input.provider, 'Convênio'),
              startDate: optionalString(input.startDate),
              endDate: optionalString(input.endDate),
            }),
          ),
        );
        router.refresh();
        return result;
      },
    },
    {
      name: 'edit-health-agreement',
      description: 'Atualiza um convênio de saúde da ficha aberta.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID do convênio.' },
          associateId: { type: 'integer', description: 'ID do oficial.' },
          provider: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: ['id'],
      },
      execute: async (input) => {
        const result = await runTool(() =>
          editHealthAgreementAction(
            objectToFormData({
              id: requiredPositiveInt(input.id, 'ID do convênio'),
              associateId: resolveFichaAssociateId(input.associateId, officialId),
              provider: optionalString(input.provider),
              startDate: optionalString(input.startDate),
              endDate: optionalString(input.endDate),
            }),
          ),
        );
        router.refresh();
        return result;
      },
    },
    {
      name: 'remove-health-agreement',
      description:
        'Remove um convênio de saúde da ficha do oficial aberta, sem diálogo de confirmação da UI. Ação destrutiva.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID do convênio.' },
          associateId: {
            type: 'integer',
            description: 'ID do oficial da ficha aberta. Se omitido, usa a rota.',
          },
        },
        required: ['id'],
      },
      annotations: DESTRUCTIVE,
      execute: async (input) => {
        const result = await runTool(() =>
          removeHealthAgreementAction(
            objectToFormData({
              id: requiredPositiveInt(input.id, 'ID do convênio'),
              associateId: resolveFichaAssociateId(input.associateId, officialId),
            }),
          ),
        );
        router.refresh();
        return result;
      },
    },
  ];
}
