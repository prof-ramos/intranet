-- W2.7: Set idle_in_transaction_session_timeout at the database level
-- This prevents orphaned transactions from holding locks
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET idle_in_transaction_session_timeout = %L',
    current_database(),
    '30s'
  );
END $$;
