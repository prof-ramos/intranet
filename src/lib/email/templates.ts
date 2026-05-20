export function passwordResetEmailHtml(name: string, resetLink: string): string {
  const escapedResetLink = escapeHtmlAttribute(resetLink)

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: sans-serif; color: #040920; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #06284f;">Redefinição de senha — ASOF Intranet</h2>
  <p>Olá, <strong>${escapeHtml(name)}</strong>.</p>
  <p>Um administrador solicitou a redefinição da sua senha no sistema interno da ASOF.</p>
  <p>Clique no botão abaixo para definir uma nova senha:</p>
  <p style="margin: 32px 0;">
    <a href="${escapedResetLink}"
       style="background-color: #06284f; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
      Redefinir minha senha
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">Se você não esperava este email, ignore-o. O link expira em 1 hora.</p>
  <p style="color: #666; font-size: 14px;">Ou copie e cole este link no navegador:<br/><code>${escapeHtml(resetLink)}</code></p>
</body>
</html>
  `.trim()
}

export function passwordResetEmailText(name: string, resetLink: string): string {
  return [
    `Redefinição de senha — ASOF Intranet`,
    ``,
    `Olá, ${name}.`,
    ``,
    `Um administrador solicitou a redefinição da sua senha no sistema interno da ASOF.`,
    ``,
    `Acesse o link abaixo para definir uma nova senha (expira em 1 hora):`,
    resetLink,
    ``,
    `Se você não esperava este email, ignore-o.`,
  ].join('\n')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeHtmlAttribute(str: string): string {
  return escapeHtml(str).replace(/'/g, '&#39;')
}
