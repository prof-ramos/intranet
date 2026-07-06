-- Composite index for paginated list queries:
-- Covers (association_status, contribution_status, functional_status, full_name, id)
-- This speeds up both the filtered count() and the paginated ORDER BY.
CREATE INDEX IF NOT EXISTS idx_associates_paginated_list
  ON associates ("association_status", "contribution_status", "functional_status", "full_name", "id");
