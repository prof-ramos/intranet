import { Bell } from 'lucide-react';

export function NotificationInboxSkeleton() {
  return (
    <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full bg-slate-100">
      <Bell size={20} className="text-slate-400" />
    </div>
  );
}
