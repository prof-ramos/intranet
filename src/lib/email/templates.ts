export function temporaryPasswordEmailHtml(name: string, temporaryPassword: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: sans-serif; color: #040920; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #06284f;">Senha temporária — ASOF Intranet</h2>
  <p>Olá, <strong>${escapeHtml(name)}</strong>.</p>
  <p>Um administrador redefiniu sua senha no sistema interno da ASOF.</p>
  <p>Use a senha temporária abaixo para entrar. O sistema solicitará a troca no primeiro acesso.</p>
  <p style="margin: 24px 0; padding: 16px; background: #f4f6f8; border-radius: 4px;">
    <code style="font-size: 16px;">${escapeHtml(temporaryPassword)}</code>
  </p>
  <p style="color: #666; font-size: 14px;">Se você não esperava este email, avise a administração da ASOF.</p>
</body>
</html>
  `.trim();
}

export function temporaryPasswordEmailText(name: string, temporaryPassword: string): string {
  return [
    `Senha temporária — ASOF Intranet`,
    ``,
    `Olá, ${name}.`,
    ``,
    `Um administrador redefiniu sua senha no sistema interno da ASOF.`,
    ``,
    `Use a senha temporária abaixo para entrar. O sistema solicitará a troca no primeiro acesso:`,
    temporaryPassword,
    ``,
    `Se você não esperava este email, avise a administração da ASOF.`,
  ].join('\n');
}

export function passwordResetEmailHtml(name: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: sans-serif; color: #040920; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #06284f;">Redefinição de senha — ASOF Intranet</h2>
  <p>Olá, <strong>${escapeHtml(name)}</strong>.</p>
  <p>Recebemos uma solicitação para redefinir a senha da sua conta na intranet da ASOF.</p>
  <p>Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.</p>
  <p style="margin: 24px 0; text-align: center;">
    <a href="${escapeHtml(resetLink)}" style="display: inline-block; padding: 12px 24px; background: #040920; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
      Redefinir minha senha
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">Se o botão não funcionar, copie e cole este link no navegador:</p>
  <p style="color: #666; font-size: 14px; word-break: break-all;">${escapeHtml(resetLink)}</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
  <p style="color: #666; font-size: 14px;">Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.</p>
</body>
</html>
  `.trim();
}

export function passwordResetEmailText(name: string, resetLink: string): string {
  return [
    `Redefinição de senha — ASOF Intranet`,
    ``,
    `Olá, ${name}.`,
    ``,
    `Recebemos uma solicitação para redefinir a senha da sua conta na intranet da ASOF.`,
    ``,
    `Acesse o link abaixo para criar uma nova senha. Este link é válido por 1 hora:`,
    resetLink,
    ``,
    `Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.`,
  ].join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
