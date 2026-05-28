# ADR 012: Papra Como Candidato A DMS Externo Para Documentos

Status: proposed
Data: 2026-05-26

## Contexto

O ADR 008 manteve o modulo Documentos fora do dia 1 para nao atrasar o go-live com escolha de storage, URLs assinadas, retencao LGPD e smoke adicional. A necessidade permanece: a ASOF precisa arquivar Documentos institucionais, digitalizacoes, comprovantes, atas, estatutos, modelos e PDFs finais/assinados de Oficios, sem transformar o banco transacional da intranet em storage de arquivos.

## Decisao Proposta

Avaliar Papra como DMS externo para Documentos da ASOF, desde que a solucao permaneca open source e self-hosted. A intranet continua sendo o sistema de registro para dominio, metadados, autorizacao e auditoria; Papra fica como candidato para armazenamento, OCR, indexacao, busca contextual e arquivamento dos arquivos.

Oficios continuam sendo criados, numerados e controlados pela intranet. Apenas o PDF final ou assinado pode ser arquivado como Documento. Usuarios acessam Documentos pelo contexto de negocio na intranet; Papra nao deve ser a interface operacional principal nem conceder acesso que a intranet negaria.

## Escopo Da POC

- Upload manual pela intranet como canal operacional inicial.
- Papra self-hosted em VPS isolada, com banco, storage e auth/admin separados da intranet.
- Papra nao deve ser exposto como interface publica; API/endpoint para a intranet e administracao via VPN ou allowlist de IP, sempre com TLS.
- Ingestao por email/webhook apenas como entrada tecnica para triagem.
- Chamadas da intranet para o Papra apenas no backend, com token de servico ou API key de escopo minimo guardado em ambiente server-side.
- Auditoria de negocio separada de logs tecnicos: a intranet registra quem acessou qual Documento e em qual contexto; chamadas tecnicas ao Papra ficam em logs com `requestId`, acao e resultado, sem conteudo sensivel.
- Ownership de metadados dividido: a intranet e canonica para metadados de dominio e autorizacao; o Papra e canonico para metadados tecnicos do arquivo.
- Documentos Vinculados e Documentos de Acervo, sem vinculos artificiais.
- Falha parcial de integracao nao cria Documento valido pela metade: se a intranet salvar metadados locais e o upload no Papra falhar, o registro fica em estado explicito de falha pendente, visivel apenas para `admin`/`secretaria`, com retry manual.
- Busca contextual por modulo/entidade, deixando busca global fora do primeiro desenho.
- Arquivamento/desativacao como fluxo normal; expurgo fisico apenas como excecao LGPD/erro grave restrita a `admin`, com motivo e auditoria.
- Validacao de storage privado open source e self-hosted, preferencialmente S3 compativel (ex: MinIO ou Garage), alem de API/auth/webhooks e implicacoes das licencas open source.
- Baseline operacional da POC com backup diario do banco por 14 dias, snapshot/versionamento do storage por 30 dias e restore simples testado ao menos uma vez em ambiente separado.
- A POC aceita a criptografia em repouso oferecida pelo stack/storage escolhido, desde que sua cobertura e seus limites fiquem documentados. Nao sera adicionada camada extra propria de criptografia nesta fase.

## Opcoes Rejeitadas Por Agora

- Implementar storage/document management proprio dentro da intranet antes do go-live.
- Fazer Papra substituir Neon/PostgreSQL como banco transacional da intranet.
- Permitir upload operacional direto no Papra como fluxo normal.
- Criar busca global de Documentos antes de permissao e auditoria maduras.
- Usar servico proprietario gerenciado como backend da POC de storage.

## Consequencias

- A POC do Papra e frente pos-estreia e nao bloqueia o go-live.
- A issue de acompanhamento e https://github.com/prof-ramos/intranet/issues/93.
- Esta ADR deve permanecer `proposed` ate a POC confirmar API/auth, storage open source self-hosted, backup, LGPD e licencas.
