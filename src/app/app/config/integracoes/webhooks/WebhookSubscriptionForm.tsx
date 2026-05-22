'use client';

import { useActionState, useEffect } from 'react';
import type { DomainEventType } from '@/lib/integrations/outbox';
import { createWebhookSubscription, updateWebhookSubscription } from './actions';

type ActionState = { success: boolean; message: string } | null;

interface WebhookSubscriptionFormProps {
  mode: 'create' | 'edit';
  eventTypes: DomainEventType[];
  id?: number;
  defaultName?: string;
  defaultTargetUrl?: string;
  defaultSubscribedEvents?: string[];
  defaultIsActive?: boolean;
  onSuccess?: () => void;
}

const eventLabels: Record<DomainEventType, string> = {
  'associate.updated': 'Associado atualizado',
  'legal_consultation.created': 'Consulta jurídica criada',
  'legal_consultation.status_changed': 'Status de consulta jurídica alterado',
  'official_letter.created': 'Ofício criado',
  'monthly_payment.updated': 'Mensalidade atualizada',
  'official_letter.published': 'Ofício publicado',
};

export function WebhookSubscriptionForm({
  mode,
  eventTypes,
  id,
  defaultName = '',
  defaultTargetUrl = '',
  defaultSubscribedEvents = [],
  defaultIsActive = true,
  onSuccess,
}: WebhookSubscriptionFormProps) {
  const action = mode === 'create' ? createWebhookSubscription : updateWebhookSubscription;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null);

  useEffect(() => {
    if (state?.success) {
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-4">
      {mode === 'edit' && <input type="hidden" name="id" value={id} />}
      {mode === 'edit' && (
        <input type="hidden" name="isActive" value={defaultIsActive ? 'true' : 'false'} />
      )}

      <fieldset className="fieldset">
        <legend className="fieldset-legend text-sm font-medium text-[#040920]">Nome</legend>
        <input
          name="name"
          type="text"
          defaultValue={defaultName}
          minLength={2}
          maxLength={120}
          required
          placeholder="Ex: Automação financeira"
          className="input w-full"
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend text-sm font-medium text-[#040920]">
          URL de destino
        </legend>
        <input
          name="targetUrl"
          type="url"
          defaultValue={defaultTargetUrl}
          required
          placeholder="https://automacao.exemplo/webhook/asof"
          className="input w-full"
        />
      </fieldset>

      {mode === 'create' && (
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-sm font-medium text-[#040920]">
            Segredo HMAC
          </legend>
          <input
            name="secret"
            type="password"
            minLength={32}
            required
            placeholder="mínimo 32 caracteres"
            className="input w-full"
          />
          <p className="text-xs text-[rgba(13,31,60,0.55)]">
            O segredo será criptografado e não poderá ser visualizado depois.
          </p>
        </fieldset>
      )}

      <fieldset className="fieldset">
        <legend className="fieldset-legend text-sm font-medium text-[#040920]">
          Eventos assinados
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {eventTypes.map((eventType) => (
            <label
              key={eventType}
              className="flex items-center gap-2 rounded-md border border-[rgba(4,9,32,0.08)] bg-white px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="subscribedEvents"
                value={eventType}
                defaultChecked={defaultSubscribedEvents.includes(eventType)}
                className="checkbox checkbox-sm"
              />
              <span>
                <span className="block font-medium text-[#040920]">{eventLabels[eventType]}</span>
                <span className="block text-xs text-[rgba(13,31,60,0.55)]">{eventType}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state?.success === false && <p className="text-sm text-red-600">{state.message}</p>}
      {state?.success === true && <p className="text-sm text-green-700">{state.message}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          {isPending
            ? 'Salvando...'
            : mode === 'create'
              ? 'Criar subscription'
              : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
