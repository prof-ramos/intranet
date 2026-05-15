-- W4.4: Remove redundant indexes covered by GIN trigram
DROP INDEX IF EXISTS idx_associates_name;
