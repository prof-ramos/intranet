import Link from 'next/link';
import { validateResetToken } from '@/lib/auth/password-reset';
import { resetPassword } from '@/app/reset-password/actions';
import { AuthAlert, AuthHint } from '@/components/auth/AuthAlert';
import { AuthField } from '@/components/auth/AuthField';
import { AuthShell, authLinkClass } from '@/components/auth/AuthShell';
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton';
import { focusRingClass, textMuted } from '@/lib/ui/tokens';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const tokenValid = token ? await validateResetToken(token) : { valid: false };

  return (
    <AuthShell title="Redefinir senha">
      {!token || !tokenValid.valid ? (
        <div className="flex flex-col gap-4">
          <AuthAlert variant="error">
            Este link de redefinição é inválido ou expirado. Solicite um novo link.
          </AuthAlert>
          <Link
            href="/forgot-password"
            className={`inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
          >
            Solicitar novo link
          </Link>
          <Link href="/login" className={authLinkClass} style={{ color: textMuted }}>
            Voltar ao login
          </Link>
        </div>
      ) : (
        <>
          {error && <AuthAlert variant="error">{error}</AuthAlert>}

          <AuthHint>
            Defina uma nova senha para sua conta. A senha deve ter pelo menos 8 caracteres, com pelo
            menos um número e um caractere especial.
          </AuthHint>

          <form action={resetPassword} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />

            <AuthField
              id="newPassword"
              name="newPassword"
              type="password"
              label="Nova senha"
              required
              minLength={8}
              autoComplete="new-password"
            />

            <AuthField
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirmar nova senha"
              required
              minLength={8}
              autoComplete="new-password"
            />

            <AuthSubmitButton label="Redefinir senha" pendingLabel="Redefinindo..." />
          </form>

          <Link href="/login" className={authLinkClass} style={{ color: textMuted }}>
            Voltar ao login
          </Link>
        </>
      )}
    </AuthShell>
  );
}
