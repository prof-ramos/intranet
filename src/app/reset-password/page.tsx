import Link from 'next/link';
import { validateResetToken } from '@/lib/auth/password-reset';
import { resetPassword } from '@/app/reset-password/actions';
import {
  dangerText,
  errorBg,
  focusRingClass,
  hairline,
} from '@/lib/ui/tokens';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  // Valida token ao carregar a página
  const tokenValid = token ? await validateResetToken(token) : { valid: false };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#040920] px-4">
      <div className="w-full max-w-sm rounded-[10px] bg-white shadow-xl">
        <div className="flex flex-col gap-6 p-6">
          <div>
            <h1 className="font-serif text-3xl font-bold">ASOF</h1>
            <p className="text-sm text-[rgba(13,31,60,0.65)]">Redefinir senha</p>
          </div>

          {!token || !tokenValid.valid ? (
            <div className="flex flex-col gap-4">
              <div
                role="alert"
                className="rounded-[8px] border border-[#fca5a5] px-4 py-3 text-sm"
                style={{ backgroundColor: errorBg, color: dangerText }}
              >
                Este link de redefinição é inválido ou expirado. Solicite um novo link.
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260]"
              >
                Solicitar novo link
              </Link>
              <Link
                href="/login"
                className="text-center text-sm text-[rgba(13,31,60,0.65)] underline hover:text-[#040920]"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="rounded-[8px] border border-[#fca5a5] px-4 py-3 text-sm"
                  style={{ backgroundColor: errorBg, color: dangerText }}
                >
                  {error}
                </div>
              )}

              <p className="text-sm text-[rgba(13,31,60,0.65)]">
                Defina uma nova senha para sua conta. A senha deve ter pelo menos 8 caracteres,
                com pelo menos um número e um caractere especial.
              </p>

              <form action={resetPassword} className="flex flex-col gap-4">
                <input type="hidden" name="token" value={token} />

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="newPassword"
                    className="text-[11px] font-semibold tracking-[0.06em] text-[rgba(13,31,60,0.65)] uppercase"
                  >
                    Nova senha
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={`h-11 w-full rounded-[8px] border px-3 text-sm ${focusRingClass}`}
                    style={{ borderColor: hairline }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="text-[11px] font-semibold tracking-[0.06em] text-[rgba(13,31,60,0.65)] uppercase"
                  >
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={`h-11 w-full rounded-[8px] border px-3 text-sm ${focusRingClass}`}
                    style={{ borderColor: hairline }}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260]"
                >
                  Redefinir senha
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
