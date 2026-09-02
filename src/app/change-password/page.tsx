import { changePassword } from '@/app/change-password/actions';
import { AuthAlert, AuthHint } from '@/components/auth/AuthAlert';
import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton';
import { requireAuth } from '@/lib/auth/require-auth';

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAuth();
  const { error } = await searchParams;

  return (
    <AuthShell title="Alterar senha" maxWidth="md">
      <AuthHint>
        Defina uma senha forte para continuar usando a intranet. A senha deve ter pelo menos 8
        caracteres, com pelo menos um número e um caractere especial.
      </AuthHint>

      {error && <AuthAlert variant="error">{error}</AuthAlert>}

      <form action={changePassword} className="flex flex-col gap-4">
        <AuthField
          id="currentPassword"
          name="currentPassword"
          type="password"
          label="Senha atual"
          required
          autoComplete="current-password"
        />

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

        <AuthSubmitButton label="Salvar nova senha" pendingLabel="Salvando..." />
      </form>
    </AuthShell>
  );
}
