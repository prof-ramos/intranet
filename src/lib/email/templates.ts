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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
