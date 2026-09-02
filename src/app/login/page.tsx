import Link from 'next/link';
import { login } from '@/app/login/actions';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { AuthField } from '@/components/auth/AuthField';
import { AuthShell, authLinkClass } from '@/components/auth/AuthShell';
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton';
import { textMuted } from '@/lib/ui/tokens';

function loginErrorMessage(error?: string) {
  if (error === 'rate-limit') {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  return 'Email ou senha inválidos.';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; changed?: string }>;
}) {
  const { error, reset, changed } = await searchParams;

  return (
    <AuthShell title="Acesso restrito">
      {error && <AuthAlert variant="error">{loginErrorMessage(error)}</AuthAlert>}

      {reset === 'success' && (
        <AuthAlert variant="success">
          Senha redefinida com sucesso. Faça login com sua nova senha.
        </AuthAlert>
      )}

      {changed === 'success' && (
        <AuthAlert variant="success">
          Senha alterada com sucesso. Faça login com sua nova senha.
        </AuthAlert>
      )}

      <form action={login} className="flex flex-col gap-4">
        <AuthField
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
        />

        <AuthField
          id="password"
          name="password"
          type="password"
          label="Senha"
          required
          autoComplete="current-password"
          labelAction={
            <Link href="/forgot-password" className={authLinkClass} style={{ color: textMuted }}>
              Esqueci minha senha
            </Link>
          }
        />

        <AuthSubmitButton label="Entrar" pendingLabel="Entrando..." />
      </form>
    </AuthShell>
  );
}
