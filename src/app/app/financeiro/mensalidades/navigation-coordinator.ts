'use client';

let pendingSearchTimer: number | undefined;

export function cancelPendingMonthlyPaymentsSearch() {
  window.clearTimeout(pendingSearchTimer);
  pendingSearchTimer = undefined;
}

export function scheduleMonthlyPaymentsSearch(callback: () => void, delayMs: number) {
  cancelPendingMonthlyPaymentsSearch();
  pendingSearchTimer = window.setTimeout(() => {
    pendingSearchTimer = undefined;
    callback();
  }, delayMs);
}
