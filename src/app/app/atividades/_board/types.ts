import type { priorityStyles } from '@/lib/ui/tokens';
import type { columns } from './constants';

export type Status = (typeof columns)[number]['key'];
export type Priority = keyof typeof priorityStyles;

// Client DTOs for the authenticated internal board. Do not log raw person/member names.
export interface BoardPerson {
  id: number;
  name: string;
  role: string;
}

export interface BoardAssociate {
  id: number;
  name: string;
}

export interface BoardActivity {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  associateId: number | null;
  associateName: string | null;
  tags: string[];
  /** Whole calendar-day offset from browser-local today; negative values mean overdue. */
  dueOffset: number | null;
}

export interface PendingReassignment {
  id: string;
  activityId: number;
  fromUserId: number;
  toUserId: number;
  /** @sensitive Free-text local-only reassignment note. */
  message: string;
}

export interface Filters {
  scope: 'todas' | 'minhas';
  query: string;
  assignee: string;
  priority: '' | Priority;
  associate: string;
  dueWeek: boolean;
  dueLate: boolean;
}
