import { Webhook } from 'lucide-react';
import { requireRole } from '@/lib/auth/authorization';
import {
  getAllowedWebhookEventTypes,
  listManagedWebhookSubscriptions,
} from '@/lib/integrations/webhooks/subscriptions';
import { WebhookSubscriptionActions } from './WebhookSubscriptionActions';
import { WebhookSubscriptionForm } from './WebhookSubscriptionForm';

const eventLabels: Record<string, string> = {
  'associate.updated': 'Associado atualizado',
  'legal_consultation.created': 'Consulta jurídica criada',
  'legal_consultation.status_changed': 'Status de consulta jurídica alterado',
  'official_letter.created': 'Ofício criado',
  'monthly_payment.updated': 'Mensalidade atualizada',
  'official_letter.published': 'Ofício publicado',
};

export default async function WebhookSubscriptionsPage() {
  await requireRole(['admin']);
  const [subscriptions, eventTypes] = await Promise.all([
    listManagedWebhookSubscriptions(),
    Promise.resolve(getAllowedWebhookEventTypes()),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[rgba(13,31,60,0.55)] text-[11px] tracking-[0.18em] uppercase">
        Configurações · Integrações · Webhooks
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
        Webhook subscriptions
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgba(13,31,60,0.65)]">
        Configure destinos HTTP para automações externas. Cada entrega usa assinatura HMAC
        e payload mínimo para evitar exposição de dados pessoais.
      </p>

      <section className="mt-8 rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#040920]">Nova subscription</h2>
        <WebhookSubscriptionForm
          mode="create"
          eventTypes={eventTypes}
          defaultSubscribedEvents={['associate.updated']}
        />
      </section>

      <section className="mt-6 grid gap-4">
        {subscriptions.length === 0 ? (
          <div className="rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-8 text-center">
            <Webhook size={40} className="mx-auto mb-4 text-[rgba(13,31,60,0.25)]" aria-hidden="true" />
            <h2 className="font-serif text-xl font-bold text-[#040920]">Nenhuma subscription criada</h2>
            <p className="mt-2 text-sm text-[rgba(13,31,60,0.55)]">
              Crie uma subscription para começar a enviar eventos da intranet para automações externas.
            </p>
          </div>
        ) : (
          subscriptions.map((subscription) => (
            <article
              key={subscription.id}
              className="rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-6"
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-2xl font-bold text-[#040920]">{subscription.name}</h2>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        subscription.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {subscription.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className="mt-2 break-all text-sm text-[rgba(13,31,60,0.65)]">
                    {subscription.targetUrl}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {subscription.subscribedEvents.map((eventType) => (
                      <span
                        key={eventType}
                        className="rounded-full bg-[rgba(13,31,60,0.06)] px-2.5 py-1 text-xs font-medium text-[#0d1f3c]"
                      >
                        {eventLabels[eventType] ?? eventType}
                      </span>
                    ))}
                  </div>
                </div>
                <WebhookSubscriptionActions
                  id={subscription.id}
                  name={subscription.name}
                  targetUrl={subscription.targetUrl}
                  subscribedEvents={subscription.subscribedEvents}
                  isActive={subscription.isActive}
                  eventTypes={eventTypes}
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
