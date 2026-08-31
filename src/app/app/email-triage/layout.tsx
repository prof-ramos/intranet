import { redirect } from 'next/navigation';

/**
 * Operator UI deferred to V2 (issue #429). Domain code stays; the screens
 * do not appear in navigation and deep links send the operator to the dashboard.
 */
export default function EmailTriageLayout(_props: { children: React.ReactNode }) {
  redirect('/app');
}
