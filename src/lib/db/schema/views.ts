import { bigint, pgView, text, timestamp } from 'drizzle-orm/pg-core';
import { associationStatus, contributionStatus, functionalStatus } from './associates';

export const associatesListView = pgView('associates_list_view', {
  id: bigint('id', { mode: 'number' }),
  fullName: text('full_name'),
  assignment: text('assignment'),
  classPattern: text('class_pattern'),
  associationStatus: associationStatus('association_status'),
  functionalStatus: functionalStatus('functional_status'),
  contributionStatus: contributionStatus('contribution_status'),
  locationCountry: text('location_country'),
  locationCity: text('location_city'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});
