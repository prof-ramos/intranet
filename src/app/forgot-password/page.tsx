import Link from 'next/link';
import { requestReset } from '@/app/forgot-password/actions';
import {
  dangerText,
  errorBg,
  focusRingClass,
  hairline,
  mobileTouchTargetClass,
  navy,
  primaryContainerHover,
  successBg,
  successText,
  textMuted,
  dangerBorder,
} from '@/lib/ui/tokens';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: navy }}>
      <div className="w-full max-w-sm rounded-[10px] bg-white shadow-xl">
        <div className="flex flex-col gap-6 p-6">
          <div>
            <h1 className="font-serif text-3xl font-bold">ASOF</h1>
            <p className="text-sm" style={{ color: textMuted }}>Recuperar senha</p>
          </div>

          {sent ? (
            <div className="flex flex-col gap-4">
              <div
                role="alert"
                className="rounded-[8px] border px-4 py-3 text-sm"
                style={{ borderColor: successText, backgroundColor: successBg, color: successText }}
              >
                Se o email estiver cadastrado, enviaremos um link para redefinir sua senha.
                Verifique sua caixa de entrada e spam.
              </div>
              <Link
                href="/login"
                className={`inline-flex ${mobileTouchTargetClass} w-full items-center justify-center rounded-[8px] border bg-white px-5 text-sm font-semibold transition-colors hover:bg-gray-50`}
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
                  className="rounded-[8px] border px-4 py-3 text-sm"
                  style={{ borderColor: dangerBorder, backgroundColor: errorBg, color: dangerText }}
                >
                  {error}
                </div>
              )}

              <p className="text-sm" style={{ color: textMuted }}>
                Informe o email associado à sua conta. Enviaremos um link para redefinir sua senha.
              </p>

              <form action={requestReset} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-[11px] font-semibold tracking-[0.06em] uppercase"
                    style={{ color: textMuted }}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={`${mobileTouchTargetClass} w-full rounded-[8px] border px-3 text-sm ${focusRingClass}`}
                    style={{ borderColor: hairline }}
                    placeholder="seu@email.com"
                  />
                </div>

                <button
                  type="submit"
                  className={`inline-flex ${mobileTouchTargetClass} w-full items-center justify-center rounded-[8px] px-5 text-sm font-semibold text-white transition-colors`}
                  style={{ backgroundColor: navy }}
                >
                  Enviar link de redefinição
                </button>
              </form>

              <Link
                href="/login"
                className="text-center text-sm underline"
                style={{ color: textMuted }}
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