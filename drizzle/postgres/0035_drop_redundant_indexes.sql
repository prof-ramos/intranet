-- W4.4: Remove redundant indexes covered by GIN trigram
DROP INDEX CONCURRENTLY IF EXISTS idx_associates_name;