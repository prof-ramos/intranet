import Link from 'next/link';
import { login } from '@/app/login/actions';
import { SubmitButton } from '@/app/login/SubmitButton';
import {
  dangerText,
  errorBg,
  dangerBorder,
  focusRingClass,
  hairline,
  navy,
  successBg,
  successText,
  textMuted,
} from '@/lib/ui/tokens';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: navy }}>
      <div className="w-full max-w-sm rounded-[10px] bg-white shadow-xl">
        <div className="flex flex-col gap-6 p-6">
          <div>
            <h1 className="font-serif text-3xl font-bold">ASOF</h1>
            <p className="text-sm" style={{ color: textMuted }}>Intranet — Acesso restrito</p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-[8px] border px-4 py-3 text-sm"
              style={{ borderColor: dangerBorder, backgroundColor: errorBg, color: dangerText }}
            >
              Email ou senha inválidos.
            </div>
          )}

          {reset === 'success' && (
            <div
              role="alert"
              className="rounded-[8px] border px-4 py-3 text-sm"
              style={{ borderColor: successText, backgroundColor: successBg, color: successText }}
            >
              Senha redefinida com sucesso. Faça login com sua nova senha.
            </div>
          )}

          <form action={login} className="flex flex-col gap-4">
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
                className={`h-11 w-full rounded-[8px] border px-3 text-sm ${focusRingClass}`}
                style={{ borderColor: hairline }}
                placeholder="seu@email.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-[11px] font-semibold tracking-[0.06em] uppercase"
                  style={{ color: textMuted }}
                >
                  Senha
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] underline"
                  style={{ color: textMuted }}
                >
                  Esqueci minha senha
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={`h-11 w-full rounded-[8px] border px-3 text-sm ${focusRingClass}`}
                style={{ borderColor: hairline }}
              />
            </div>

            <SubmitButton />
          </form>
        </div>
      </div>
    </main>
  );
}