import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent Vercel edge cache of the 307 redirect.
// If this page were statically pre-rendered, every request would receive the
// same cached redirect regardless of the user's actual session.
export const dynamic = 'force-dynamic';

export default function Home() {
  redirect('/app');
}
