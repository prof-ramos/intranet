import type { AuthRole } from '@/lib/auth/config';

export const ACTIVITY_STATUSES = [
  'a_fazer',
  'em_andamento',
  'aguardando_terceiros',
  'concluido',
] as const;

export const ACTIVITY_PRIORITIES = ['baixa', 'normal', 'alta', 'urgente'] as const;

export type Status = (typeof ACTIVITY_STATUSES)[number];
export type Priority = (typeof ACTIVITY_PRIORITIES)[number];

// Client DTOs for the authenticated internal board. Do not log raw person/member names.
export interface BoardPerson {
  id: number;
  name: string;
  role: AuthRole;
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
  dueOffset: number | null;
}

export interface PendingReassignment {
  id: string;
  activityId: number;
  fromUserId: number;
  toUserId: number;
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
