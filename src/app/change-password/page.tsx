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
      <div className="w-full max-w-md rounded-[16px] bg-white shadow-xl">
        <div className="flex flex-col gap-6 p-6">
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
              <label htmlFor="currentPassword" className="sr-only">
                Senha atual
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="input w-full"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Nova senha</legend>
              <label htmlFor="newPassword" className="sr-only">
                Nova senha
              </label>
              <input
                id="newPassword"
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
              <label htmlFor="confirmPassword" className="sr-only">
                Confirmar nova senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className="input w-full"
              />
            </fieldset>

            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-5 h-11 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 w-full">
              Salvar nova senha
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
