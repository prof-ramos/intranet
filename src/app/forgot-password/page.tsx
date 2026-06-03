import Link from 'next/link';
import { requestReset } from '@/app/forgot-password/actions';
import { focusRingClass, hairline } from '@/lib/ui/tokens';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#040920] px-4">
      <div className="w-full max-w-sm rounded-[10px] bg-white shadow-xl">
        <div className="flex flex-col gap-6 p-6">
          <div>
            <h1 className="font-serif text-3xl font-bold">ASOF</h1>
            <p className="text-sm text-[rgba(13,31,60,0.65)]">Recuperar senha</p>
          </div>

          {sent ? (
            <div className="flex flex-col gap-4">
              <div
                role="alert"
                className="rounded-[8px] border border-[#86efac] bg-[#dcfce7] px-4 py-3 text-sm text-[#166534]"
              >
                Se o email estiver cadastrado, enviaremos um link para redefinir sua senha.
                Verifique sua caixa de entrada e spam.
              </div>
              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-[8px] border bg-white px-5 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ borderColor: hairline }}
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="rounded-[8px] border border-[#fca5a5] bg-[#fee2e2] px-4 py-3 text-sm text-[#7f1d1d]"
                >
                  {error}
                </div>
              )}

              <p className="text-sm text-[rgba(13,31,60,0.65)]">
                Informe o email associado à sua conta. Enviaremos um link para redefinir sua senha.
              </p>

              <form action={requestReset} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-[11px] font-semibold tracking-[0.06em] text-[rgba(13,31,60,0.65)] uppercase"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={`h-11 w-full rounded-[8px] border px-3 text-sm ${focusRingClass}`}
                    style={{ borderColor: hairline }}
                    placeholder="seu@email.com"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260]"
                >
                  Enviar link de redefinição
                </button>
              </form>

              <Link
                href="/login"
                className="text-center text-sm text-[rgba(13,31,60,0.65)] underline hover:text-[#040920]"
              >
                Voltar ao login
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
