import Link from 'next/link';
import { requestReset } from '@/app/forgot-password/actions';
import { AuthAlert, AuthHint } from '@/components/auth/AuthAlert';
import { AuthField } from '@/components/auth/AuthField';
import { AuthOutlineButton } from '@/components/auth/AuthOutlineButton';
import { AuthShell, authLinkClass } from '@/components/auth/AuthShell';
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton';
import { textMuted } from '@/lib/ui/tokens';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <AuthShell title="Recuperar senha">
      {sent ? (
        <div className="flex flex-col gap-4">
          <AuthAlert variant="success">
            Se o email estiver cadastrado, enviaremos um link para redefinir sua senha. Verifique
            sua caixa de entrada e spam.
          </AuthAlert>
          <AuthOutlineButton href="/login">Voltar ao login</AuthOutlineButton>
        </div>
      ) : (
        <>
          {error && <AuthAlert variant="error">{error}</AuthAlert>}

          <AuthHint>
            Informe o email associado à sua conta. Enviaremos um link para redefinir sua senha.
          </AuthHint>

          <form action={requestReset} className="flex flex-col gap-4">
            <AuthField
              id="email"
              name="email"
              type="email"
              label="Email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
            />

            <AuthSubmitButton label="Enviar link de redefinição" pendingLabel="Enviando..." />
          </form>

          <Link href="/login" className={authLinkClass} style={{ color: textMuted }}>
            Voltar ao login
          </Link>
        </>
      )}
    </AuthShell>
  );
}
