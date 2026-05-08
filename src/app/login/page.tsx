import { login } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body gap-6">
          <div>
            <h1 className="font-serif text-3xl font-bold">ASOF</h1>
            <p className="text-sm text-base-content/60">Intranet — Acesso restrito</p>
          </div>

          {error && (
            <div role="alert" className="alert alert-error text-sm">
              Email ou senha inválidos.
            </div>
          )}

          <form action={login} className="flex flex-col gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                <label htmlFor="email">Email</label>
              </legend>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input w-full"
                placeholder="seu@email.com"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                <label htmlFor="password">Senha</label>
              </legend>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input w-full"
              />
            </fieldset>

            <button type="submit" className="btn btn-primary w-full">
              Entrar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
