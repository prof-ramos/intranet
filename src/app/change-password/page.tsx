import { changePassword } from '@/app/change-password/actions';
import { requireAuth } from '@/lib/auth/require-auth';

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAuth();
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body gap-6">
          <div>
            <h1 className="font-serif text-3xl font-bold">Alterar senha</h1>
            <p className="text-sm text-base-content/60">
              Defina uma senha forte para continuar usando a intranet.
            </p>
          </div>

          {error && (
            <div role="alert" className="alert alert-error text-sm">
              {error}
            </div>
          )}

          <form action={changePassword} className="flex flex-col gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Senha atual</legend>
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="input w-full"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Nova senha</legend>
              <input
                name="newPassword"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className="input w-full"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Confirmar nova senha</legend>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className="input w-full"
              />
            </fieldset>

            <button type="submit" className="btn btn-primary w-full">
              Salvar nova senha
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
