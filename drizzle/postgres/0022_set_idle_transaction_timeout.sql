-- W2.7: Set idle_in_transaction_session_timeout at the database level
-- This prevents orphaned transactions from holding locks
ALTER DATABASE current_database() SET idle_in_transaction_session_timeout = '30s';