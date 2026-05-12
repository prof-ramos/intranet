'use client';

import { CSSProperties } from 'react';

/**
 * A premium, institutional-style linear loader inspired by the user's design.
 * Adapts to the project's styling system (Tailwind CSS 4) without styled-components.
 */
export function PremiumLoader() {
  return (
    <div className="flex items-center justify-center py-4">
      <div 
        className="relative h-1 w-[130px] overflow-hidden rounded-full bg-black/10"
        style={{ '--loader-color': '#0071e2' } as CSSProperties}
      >
        <div className="absolute top-0 left-0 h-full w-full rounded-full bg-[var(--loader-color)] animate-premium-moving" />
      </div>

      <style jsx global>{`
        @keyframes premium-moving {
          0% {
            width: 0%;
            left: 0;
            right: auto;
          }
          50% {
            width: 100%;
            left: 0;
            right: auto;
          }
          100% {
            width: 0%;
            left: auto;
            right: 0;
          }
        }
        .animate-premium-moving {
          animation: premium-moving 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
