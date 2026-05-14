'use client';

import { useActionState, useState } from 'react';
import { KeyRound, Power, PowerOff, RotateCcw } from 'lucide-react';
import type { DomainEventType } from '@/lib/integrations/outbox';
import {
  rotateWebhookSubscriptionSecret,
  toggleWebhookSubscription,
} from './actions';
import { WebhookSubscriptionForm } from './WebhookSubscriptionForm';

interface WebhookSubscriptionActionsProps {
  id: number;
  name: string;
  targetUrl: string;
  subscribedEvents: string[];
  isActive: boolean;
  eventTypes: DomainEventType[];
}

export function WebhookSubscriptionActions({
  id,
  name,
  targetUrl,
  subscribedEvents,
  isActive,
  eventTypes,
}: WebhookSubscriptionActionsProps) {
  const [editing, setEditing] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [toggleState, toggleAction, isTogglePending] = useActionState(toggleWebhookSubscription, null);
  const [rotateState, rotateAction, isRotatePending] = useActionState(rotateWebhookSubscriptionSecret, null);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-3 py-1.5 text-xs font-medium text-[#040920] transition-colors hover:bg-gray-50"
        >
          {editing ? 'Fechar edição' : 'Editar'}
        </button>

        <button
          type="button"
          onClick={() => setRotating((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-3 py-1.5 text-xs font-medium text-[#040920] transition-colors hover:bg-gray-50"
        >
          <KeyRound size={13} />
          Rotacionar segredo
        </button>

        <form action={toggleAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="isActive" value={isActive ? 'false' : 'true'} />
          <button
            type="submit"
            disabled={isTogglePending}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              isActive
                ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {isActive ? <PowerOff size={13} /> : <Power size={13} />}
            {isActive ? 'Desativar' : 'Ativar'}
          </button>
        </form>
      </div>

      {toggleState?.success === false && <p className="text-right text-xs text-red-600">{toggleState.message}</p>}

      {editing && (
        <div className="rounded-lg border border-[rgba(4,9,32,0.08)] bg-[rgba(13,31,60,0.02)] p-4">
          <WebhookSubscriptionForm
            mode="edit"
            id={id}
            eventTypes={eventTypes}
            defaultName={name}
            defaultTargetUrl={targetUrl}
            defaultSubscribedEvents={subscribedEvents}
            defaultIsActive={isActive}
            onSuccess={() => setEditing(false)}
          />
        </div>
      )}

      {rotating && (
        <form
          action={rotateAction}
          className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="id" value={id} />
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend text-xs font-semibold text-amber-900">Novo segredo HMAC</legend>
            <input
              name="secret"
              type="password"
              required
              minLength={32}
              className="input w-full"
              placeholder="mínimo 32 caracteres"
            />
          </fieldset>
          <button
            type="submit"
            disabled={isRotatePending}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-amber-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            {isRotatePending ? 'Rotacionando...' : 'Rotacionar'}
          </button>
          {rotateState?.success === false && <p className="text-sm text-red-600">{rotateState.message}</p>}
          {rotateState?.success === true && <p className="text-sm text-green-700">{rotateState.message}</p>}
        </form>
      )}
    </div>
  );
}
