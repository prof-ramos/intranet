'use client';

import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { focusRingClass } from '@/lib/ui/tokens';

interface WelcomeBannerProps {
  userName: string;
  isNewUser?: boolean;
}

export function WelcomeBanner({ userName, isNewUser = false }: WelcomeBannerProps) {
  if (!isNewUser) {
    return (
      <div className="mb-6 rounded-xl border border-[rgba(4,9,32,0.08)] bg-gradient-to-r from-[#f8f9fc] to-white p-5">
        <p className="text-sm text-[rgba(13,31,60,0.6)]">
          Bem-vindo de volta, <span className="font-semibold text-[#040920]">{userName}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-[rgba(59,130,246,0.2)] bg-gradient-to-r from-blue-50 to-white p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <Sparkles className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[#040920]">Bem-vindo, {userName}!</h2>
          <p className="mt-1 text-sm text-[rgba(13,31,60,0.6)]">
            Aqui você gerencia atividades, ofícios e acompanha o trabalho da equipe.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/app/atividades"
              className={`inline-flex items-center gap-2 rounded-lg bg-[#040920] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
            >
              Ver atividades
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/app/associados"
              className={`inline-flex items-center gap-2 rounded-lg border border-[rgba(4,9,32,0.15)] bg-white px-4 py-2 text-sm font-medium text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
            >
              Consultar associados
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
