import { login } from '@/app/login/actions';
import { SubmitButton } from '@/app/login/SubmitButton';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#040920] px-4">
      <div className="w-full max-w-sm rounded-[10px] bg-white shadow-xl">
        <div className="p-6 flex flex-col gap-6">
          <div>
            <h1 className="font-serif text-3xl font-bold">ASOF</h1>
            <p className="text-sm text-[rgba(13,31,60,0.65)]">Intranet — Acesso restrito</p>
          </div>

          {error && (
            <div role="alert" className="rounded-[8px] bg-[#fee2e2] border border-[#fca5a5] px-4 py-3 text-[#7f1d1d] text-sm">
              Email ou senha inválidos.
            </div>
          )}

          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[rgba(13,31,60,0.65)]"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-11 w-full rounded-[8px] border border-[#e2e8f0] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76aeea] focus-visible:ring-offset-1"
                placeholder="seu@email.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[rgba(13,31,60,0.65)]"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-11 w-full rounded-[8px] border border-[#e2e8f0] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76aeea] focus-visible:ring-offset-1"
              />
            </div>

            <SubmitButton />
          </form>
        </div>
      </div>
    </main>
  );
}
