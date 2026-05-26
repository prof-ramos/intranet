# ADR 008: Modulo Documentos Fora Do Dia 1

Status: accepted
Data: 2026-05-26

## Contexto

O `CONTEXT.md` distingue **Oficio** (documento gerado dinamicamente pelo sistema, coberto pelo ADR 003) de **Documento** (upload de arquivo legado armazenado em storage de objetos: modelos de contrato, atas, estatutos, comprovantes, etc.). O ADR 007 ja deixa Documentos/Storage fora do caminho critico do primeiro go-live em PostgreSQL gerenciado, mas o `TODO-PROD.md` mantinha um item ambiguo ("Definir provider de storage se modulo Documentos for necessario no dia 1") que deixava a decisao em aberto e cascateava sobre o roteiro de smoke, o plano de rollback e os owners de incidente.

## Decisao

O modulo Documentos (upload/download de arquivos legados via storage de objetos) **nao** faz parte do escopo do primeiro go-live da intranet ASOF. Sera tratado como frente separada apos a estreia.

Escopo do dia 1 fica restrito a:

- Login e troca obrigatoria de senha do admin inicial.
- Cadastro e consulta de Associados.
- Atividades (kanban) e Juridico/Consultas.
- Financeiro/Mensalidades.
- Oficios (gerados dinamicamente, conforme ADR 003).
- Auditoria e Notificacoes persistidas (sem entrega em tempo real, conforme ADR 007).

## Opcoes Rejeitadas

- **Incluir Documentos no dia 1 com storage minimo**: rejeitado. Exigiria escolher provider (S3-compatible, R2, Vercel Blob), provisionar bucket privado, implementar URLs assinadas e definir politicas de retencao LGPD especificas para arquivos. Nenhum desses itens esta provisionado e abri-los agora compromete a janela de estreia.
- **Modo read-only/template-only**: rejeitado. Ainda exige provider e credenciais; o ganho operacional nao justifica o custo de seguranca e smoke adicional.

## Consequencias

- O roteiro de smoke do go-live nao precisa cobrir upload/download de Documentos.
- O plano de rollback do dia 1 cobre apenas o snapshot do PostgreSQL gerenciado novo; nao ha storage de objetos a restaurar.
- Nao e necessario owner de incidente para storage de objetos no dia 1.
- A escolha de provider de storage, modelagem de retencao LGPD para arquivos e fluxo de upload na UI ficam como frente posterior, com seu proprio ADR.
- O `TODO-PROD.md` deve refletir a decisao explicita em vez do item condicional anterior.
