# ADR 013: Integração Assinafy e Webhooks de Assinatura

## Status

Aceito

## Contexto

A ASOF precisa assinar ofícios gerados eletronicamente e acompanhar o status das assinaturas em tempo real. Escolhemos a Assinafy como nossa plataforma de e-signature. Foi necessário definir a arquitetura de comunicação entre o nosso painel Next.js e os eventos assíncronos que acontecem lá (quando um signatário abre o e-mail, rejeita ou assina).

## Decisão

Adotamos uma arquitetura de integração push via **Webhooks** acompanhada de validação defensiva e idempotência rígida.

### 1. Extração Defensiva de Payload
Durante a integração com a REST API da Assinafy (`uploadDocument` e `createAssignment`), identificamos que alguns endpoints retornam respostas em formato flat `{ id: ... }` enquanto outros envelopam em `{ data: { id: ... } }`.
- **Decisão:** O `AssinafyClient` foi reforçado para processar adequadamente a propriedade `data` nos endpoints de criação, evitando `undefined IDs` que geram o erro `Documento não encontrado` nos fluxos de envio.

### 2. Recuperação Ativa de Signatários
Se enviarmos um documento para alguém que já assinou algo no passado via Assinafy (o e-mail já existe na base deles), o endpoint de criação de signatário (POST) retorna status HTTP 400 (`Um signatário com este e-mail já existe`).
- **Decisão:** O sistema captura esse erro, faz um fallback silencioso (`GET /signers`), busca o ID do signatário existente associado ao e-mail, e prossegue com o fluxo sem incomodar o usuário.

### 3. Idempotência e Tratamento do Webhook
Para garantir que múltiplas chamadas do webhook da Assinafy (por retentativas deles) não sujem a nossa base de dados ou emitam notificações duplicadas:
- **Decisão:** A rota `/api/webhooks/assinafy` mapeia o status recebido e compara com o status atual no banco (`oficio.assinafyStatus`). Se for o mesmo, ele realiza um *early return* pacífico (noop).

### 4. Transação All-or-Nothing e Notificações Ativas
O processamento real do status ocorre inteiramente dentro de um contexto transacional do Drizzle (`db.transaction`).
- Se a assinatura for efetuada (`signer_signed_document` ou `document_ready`), o sistema, no mesmo commit:
  1. Atualiza a tabela `oficios`.
  2. Escreve no `audit_logs` que o status mudou devido à ação da Assinafy (compliance).
  3. Insere um Domain Event na tabela outbox para processos futuros.
  4. Gera `notifications` internas in-app para que os Administradores ASOF sejam alertados da assinatura imediatamente na interface.

## Consequências

- **Positivas**: Altíssima confiabilidade e consistência transacional. Nenhuma ação fica órfã ou pela metade. O usuário interno é alertado proativamente e falhas de e-mails duplicados na Assinafy são tratadas silenciosamente sob o capô.
- **Negativas**: O processamento do webhook agora centraliza múltiplas lógicas de negócio (logs, notificação, ofício), o que demanda mais recursos de DB, mas isso já foi mitigado envolvendo as chamadas não essenciais (auditoria) em blocos `try/catch` para não comprometer a transação de negócio principal.
