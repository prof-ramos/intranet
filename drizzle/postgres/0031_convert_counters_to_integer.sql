ALTER TABLE login_attempts ALTER COLUMN attempts TYPE integer USING attempts::integer;
ALTER TABLE rate_limits ALTER COLUMN attempts TYPE integer USING attempts::integer;