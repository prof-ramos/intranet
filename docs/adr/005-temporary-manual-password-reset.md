# Exposição Temporária de Credenciais de Reset de Senha no Painel do Administrador

Status: accepted (Technical Debt)

Para evitar o travamento permanente de usuários ativos cujas senhas são redefinidas por administradores antes que a integração com o provedor de e-mail (Mailjet) esteja pronta para produção, as credenciais geradas (`tempPassword` e `resetLink`) serão exibidas temporariamente no painel do administrador (`UserActionsPanel`) imediatamente após o sucesso da ação de redefinição de senha. O administrador é responsável por copiar essas informações e enviá-las ao usuário final por meio de um canal de comunicação seguro de sua preferência.

## Considered Options

- **Manter o comportamento original (descartar credenciais no servidor)**: Rejeitado, pois os usuários cujas senhas fossem redefinidas seriam permanentemente bloqueados fora do sistema por não possuírem meios de receber ou descobrir as novas credenciais.
- **Implementar Mailjet imediatamente**: Rejeitado para o Go-Live devido ao tempo adicional de desenvolvimento, necessidade de configuração de servidores SMTP/DNS institucionais e validação de entregabilidade, o que atrasaria o cronograma de produção.
- **Exibir as credenciais em modal de visualização única (Opção A)**: Aceito. Resolve o bloqueio operacional de forma imediata e segura, pois as credenciais não são persistidas em texto plano no banco de dados e são enviadas apenas de forma volátil como resposta direta da Action que o administrador acabou de disparar.

## Technical Debt & Mitigation Plan

A exposição de credenciais temporárias no painel administrativo representa um risco residual de segurança (embora restrito a administradores autenticados) e está classificada como **Débito Técnico**.

- **Prazo Limite para Resolução**: 30 de Setembro de 2026.
- **Plano de Migração**: Substituir o fluxo de modal visual pela entrega automatizada via API de email de transação da ASOF.

### Critérios de Aceitação para Resolução

1. **Sem plaintext no Admin**: Remover qualquer visualização de senhas temporárias em texto plano no frontend de gerenciamento de usuários.
2. **Envio Direto e Seguro**: O link de redefinição ou token de uso único deve ser despachado diretamente para o e-mail cadastrado do usuário via provedor homologado (Mailjet/Resend).
3. **Visibilidade Limitada**: Restringir a visibilidade do administrador a apenas um status de "reset solicitado" ou um link gerado de uso único de validade curta.
4. **Política de Log e Auditoria**: Manter a exclusão estrita de quaisquer senhas temporárias, hashes brutos, links de recuperação e tokens de logs do servidor, banco de dados ou tabelas de auditoria.

## Consequences

- O administrador deve estar ciente da responsabilidade e do risco de segurança associado ao manusear as senhas temporárias de outros usuários. Uma mensagem de alerta destacada foi adicionada ao modal.
- As credenciais geradas (`tempPassword` e `resetLink`) são transmitidas na resposta da Action e exibidas no navegador do administrador apenas uma vez (com botões interativos de cópia). Se o administrador fechar a tela ou recarregar a página sem copiá-las, o acesso precisará ser redefinido novamente.
- Assim que a entrega por e-mail for implementada, o modal de visualização de credenciais será completamente desativado.
