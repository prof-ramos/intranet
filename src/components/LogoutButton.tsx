'use client';

import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <button
      type="button"
      className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity"
    >
      <LogOut size={16} />
      Sair
    </button>
  );
}
