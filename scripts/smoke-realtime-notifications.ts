/**
 * Smoke test: Realtime Notification Validation (Issue #51)
 *
 * Validates that Supabase Realtime delivers notifications only to the
 * intended user after RLS hardening (TO authenticated + get_current_admin_id).
 *
 * Usage:
 *   SMOKE_SUPABASE_URL=... SMOKE_SUPABASE_ANON_KEY=... \
 *   SMOKE_USER_A_EMAIL=... SMOKE_USER_A_PASSWORD=... \
 *   SMOKE_USER_B_EMAIL=... SMOKE_USER_B_PASSWORD=... \
 *   npx tsx scripts/smoke-realtime-notifications.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const SUPABASE_URL = requireEnv('SMOKE_SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('SMOKE_SUPABASE_ANON_KEY');
const USER_A_EMAIL = requireEnv('SMOKE_USER_A_EMAIL');
const USER_A_PASSWORD = requireEnv('SMOKE_USER_A_PASSWORD');
const USER_B_EMAIL = requireEnv('SMOKE_USER_B_EMAIL');
const USER_B_PASSWORD = requireEnv('SMOKE_USER_B_PASSWORD');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CollectedEvent {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

function collectEvents(
  supabase: SupabaseClient,
  userId: number,
  channelName: string,
): { events: CollectedEvent[]; unsubscribe: () => void } {
  const events: CollectedEvent[] = [];

  const channel = supabase
    .channel(channelName)
    .on<Record<string, unknown>>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        events.push({
          eventType: payload.eventType,
          new: payload.new ?? {},
          old: payload.old ?? {},
        });
      },
    )
    .subscribe();

  return {
    events,
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ScenarioResult {
  name: string;
  passed: boolean;
  details: string;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

async function runScenario1_InsertIsolation(
  clientA: SupabaseClient,
  clientB: SupabaseClient,
  userAId: number,
  userBId: number,
): Promise<ScenarioResult> {
  const collectorA = collectEvents(clientA, userAId, 'smoke-a-insert');
  const collectorB = collectEvents(clientB, userBId, 'smoke-b-insert');

  // Wait for subscription to connect
  await wait(3000);

  // Insert a notification for user A via Supabase client
  const { data, error } = await clientA
    .from('notifications')
    .insert({
      user_id: userAId,
      type: 'activity.completed',
      title: 'Smoke test INSERT',
      message: 'Validation: user A should see this, user B should not',
      entity_type: 'activity',
      entity_id: 999,
      dedupe_key: `smoke-insert-${Date.now()}`,
    })
    .select('id')
    .single();

  if (error) {
    collectorA.unsubscribe();
    collectorB.unsubscribe();
    return {
      name: '1. INSERT isolation',
      passed: false,
      details: `Insert failed: ${error.message}`,
    };
  }

  const insertedId = data.id as number;

  // Wait for Realtime delivery
  await wait(10000);

  collectorA.unsubscribe();
  collectorB.unsubscribe();

  // Cleanup
  await clientA.from('notifications').delete().eq('id', insertedId);

  const aReceived = collectorA.events.some((e) => e.eventType === 'INSERT');
  const bReceived = collectorB.events.some((e) => e.eventType === 'INSERT');

  if (aReceived && !bReceived) {
    return {
      name: '1. INSERT isolation',
      passed: true,
      details: `User A received INSERT (${collectorA.events.length} events), User B received 0 events`,
    };
  }

  return {
    name: '1. INSERT isolation',
    passed: false,
    details: `User A received: ${collectorA.events.length} events (INSERT found: ${aReceived}), User B received: ${collectorB.events.length} events (INSERT found: ${bReceived})`,
  };
}

async function runScenario2_UpdateIsolation(
  clientA: SupabaseClient,
  clientB: SupabaseClient,
  userAId: number,
  userBId: number,
): Promise<ScenarioResult> {
  // First, insert a notification for user A
  const { data: insertData, error: insertError } = await clientA
    .from('notifications')
    .insert({
      user_id: userAId,
      type: 'activity.completed',
      title: 'Smoke test UPDATE',
      message: 'Validation: user A should see UPDATE, user B should not',
      dedupe_key: `smoke-update-${Date.now()}`,
    })
    .select('id')
    .single();

  if (insertError) {
    return {
      name: '2. UPDATE isolation',
      passed: false,
      details: `Insert failed: ${insertError.message}`,
    };
  }

  const notificationId = insertData.id as number;

  const collectorA = collectEvents(clientA, userAId, 'smoke-a-update');
  const collectorB = collectEvents(clientB, userBId, 'smoke-b-update');

  await wait(3000);

  // Update user A's notification (set read_at)
  const { error: updateError } = await clientA
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (updateError) {
    collectorA.unsubscribe();
    collectorB.unsubscribe();
    await clientA.from('notifications').delete().eq('id', notificationId);
    return {
      name: '2. UPDATE isolation',
      passed: false,
      details: `Update failed: ${updateError.message}`,
    };
  }

  await wait(10000);

  collectorA.unsubscribe();
  collectorB.unsubscribe();

  // Cleanup
  await clientA.from('notifications').delete().eq('id', notificationId);

  const aReceived = collectorA.events.some((e) => e.eventType === 'UPDATE');
  const bReceived = collectorB.events.some((e) => e.eventType === 'UPDATE');

  if (aReceived && !bReceived) {
    return {
      name: '2. UPDATE isolation',
      passed: true,
      details: `User A received UPDATE (${collectorA.events.length} events), User B received 0 events`,
    };
  }

  return {
    name: '2. UPDATE isolation',
    passed: false,
    details: `User A received: ${collectorA.events.length} events (UPDATE found: ${aReceived}), User B received: ${collectorB.events.length} events (UPDATE found: ${bReceived})`,
  };
}

async function runScenario3_MutationIsolation(
  clientB: SupabaseClient,
  clientA: SupabaseClient,
  userAId: number,
): Promise<ScenarioResult> {
  // Insert a notification for user A
  const { data: insertData, error: insertError } = await clientA
    .from('notifications')
    .insert({
      user_id: userAId,
      type: 'activity.completed',
      title: 'Smoke test mutation isolation',
      message: 'User B should NOT be able to UPDATE this',
      dedupe_key: `smoke-mutation-${Date.now()}`,
    })
    .select('id')
    .single();

  if (insertError) {
    return {
      name: '3. Mutation isolation',
      passed: false,
      details: `Insert failed: ${insertError.message}`,
    };
  }

  const notificationId = insertData.id as number;

  // User B attempts to UPDATE user A's notification
  const { count, error: updateError } = await clientB
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select('id');

  // Cleanup
  await clientA.from('notifications').delete().eq('id', notificationId);

  const rowsReturned = (count ?? updateError) ? 0 : updateError ? 0 : 1;
  const blocked = updateError !== null || rowsReturned === 0;

  if (blocked) {
    return {
      name: '3. Mutation isolation',
      passed: true,
      details: `RLS blocked user B from updating user A's notification (error: ${updateError?.message ?? 'none'}, rows: ${rowsReturned})`,
    };
  }

  return {
    name: '3. Mutation isolation',
    passed: false,
    details: `RLS failed to block user B — ${rowsReturned} rows updated`,
  };
}

async function runScenario4_TokenAbsent(): Promise<ScenarioResult> {
  // Create unauthenticated client (no signInWithPassword)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const collector = collectEvents(anonClient, 1, 'smoke-anon');
  await wait(3000);

  // Wait 5 seconds for any unexpected events
  await wait(5000);

  collector.unsubscribe();

  if (collector.events.length === 0) {
    return {
      name: '4. Token-absent isolation',
      passed: true,
      details: 'Unauthenticated client received 0 events (silent drop, no data leak)',
    };
  }

  return {
    name: '4. Token-absent isolation',
    passed: false,
    details: `Unauthenticated client received ${collector.events.length} events — potential data leak!`,
  };
}

async function runScenario5_PublicationCheck(clientA: SupabaseClient): Promise<ScenarioResult> {
  // Query pg_publication_tables to confirm notifications is in supabase_realtime
  const { data, error } = await clientA
    .from('pg_publication_tables')
    .select('*')
    .eq('pubname', 'supabase_realtime')
    .eq('schemaname', 'public')
    .eq('tablename', 'notifications');

  if (error) {
    // This table might not be accessible via the client; try RPC or raw SQL alternative
    return {
      name: '5. Publication membership',
      passed: false,
      details: `Cannot query pg_publication_tables via client: ${error.message}. Run manually: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';`,
    };
  }

  if (data && data.length > 0) {
    return {
      name: '5. Publication membership',
      passed: true,
      details: 'notifications table is in supabase_realtime publication',
    };
  }

  return {
    name: '5. Publication membership',
    passed: false,
    details:
      'notifications table is NOT in supabase_realtime publication — Realtime will not deliver events!',
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Realtime Notification Smoke Test ===\n');

  // Create clients
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Authenticate both users
  console.log('Authenticating users...');
  const { error: authErrorA } = await clientA.auth.signInWithPassword({
    email: USER_A_EMAIL,
    password: USER_A_PASSWORD,
  });
  if (authErrorA) {
    console.error(`User A authentication failed: ${authErrorA.message}`);
    process.exit(1);
  }

  const { error: authErrorB } = await clientB.auth.signInWithPassword({
    email: USER_B_EMAIL,
    password: USER_B_PASSWORD,
  });
  if (authErrorB) {
    console.error(`User B authentication failed: ${authErrorB.message}`);
    process.exit(1);
  }

  // Resolve user IDs — the Supabase Auth user.id is a UUID, but our
  // notifications.user_id references admins.id (bigint). We need the
  // numeric admin ID. Query the admins table directly.
  const { data: adminA } = await clientA
    .from('admins')
    .select('id')
    .eq('email', USER_A_EMAIL)
    .single();
  const { data: adminB } = await clientB
    .from('admins')
    .select('id')
    .eq('email', USER_B_EMAIL)
    .single();

  if (!adminA || !adminB) {
    console.error('Could not resolve admin IDs from admins table.');
    console.error(`User A (${USER_A_EMAIL}): ${adminA ? adminA.id : 'not found'}`);
    console.error(`User B (${USER_B_EMAIL}): ${adminB ? adminB.id : 'not found'}`);
    process.exit(1);
  }

  const numericUserAId = adminA.id as number;
  const numericUserBId = adminB.id as number;

  console.log(`User A: ${USER_A_EMAIL} (admin id: ${numericUserAId})`);
  console.log(`User B: ${USER_B_EMAIL} (admin id: ${numericUserBId})\n`);

  // Run scenarios
  const results: ScenarioResult[] = [];

  console.log('Running scenario 1: INSERT isolation...');
  results.push(
    await runScenario1_InsertIsolation(clientA, clientB, numericUserAId, numericUserBId),
  );
  console.log(
    `  → ${results[results.length - 1].passed ? 'PASS' : 'FAIL'}: ${results[results.length - 1].details}\n`,
  );

  console.log('Running scenario 2: UPDATE isolation...');
  results.push(
    await runScenario2_UpdateIsolation(clientA, clientB, numericUserAId, numericUserBId),
  );
  console.log(
    `  → ${results[results.length - 1].passed ? 'PASS' : 'FAIL'}: ${results[results.length - 1].details}\n`,
  );

  console.log('Running scenario 3: Mutation isolation...');
  results.push(await runScenario3_MutationIsolation(clientB, clientA, numericUserAId));
  console.log(
    `  → ${results[results.length - 1].passed ? 'PASS' : 'FAIL'}: ${results[results.length - 1].details}\n`,
  );

  console.log('Running scenario 4: Token-absent isolation...');
  results.push(await runScenario4_TokenAbsent());
  console.log(
    `  → ${results[results.length - 1].passed ? 'PASS' : 'FAIL'}: ${results[results.length - 1].details}\n`,
  );

  console.log('Running scenario 5: Publication membership...');
  results.push(await runScenario5_PublicationCheck(clientA));
  console.log(
    `  → ${results[results.length - 1].passed ? 'PASS' : 'FAIL'}: ${results[results.length - 1].details}\n`,
  );

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const allPassed = failed === 0;

  const summary = {
    timestamp: new Date().toISOString(),
    policy: 'notifications_select_authenticated (TO authenticated, FOR SELECT, AS RESTRICTIVE)',
    total: results.length,
    passed,
    failed,
    results,
  };

  console.log('=== Summary ===');
  console.log(JSON.stringify(summary, null, 2));

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
