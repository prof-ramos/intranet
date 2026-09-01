import { db } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { AssignmentForm } from './AssignmentForm';
import { AssignmentActionsPanel } from './AssignmentActionsPanel';
import { AssignmentEditRow } from './AssignmentEditRow';
import { PageHeader } from '@/components/PageHeader';

export default async function LotacoesPage() {
  const items = await db
    .select({
      id: assignments.id,
      name: assignments.name,
      type: assignments.type,
      isActive: assignments.isActive,
      createdAt: assignments.createdAt,
    })
    .from(assignments)
    .orderBy(asc(assignments.name));

  const typeLabel: Record<string, string> = {
    nacional: 'Secretaria de Estado',
    exterior: 'Exterior',
  };

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Configurações · Lotações"
        title="Lotações"
        backHref="/app/config"
        backLabel="Voltar para configurações"
      />

      <div className="mt-8 rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#040920]">Nova lotação</h2>
        <AssignmentForm mode="create" />
      </div>

      <div className="mt-6 overflow-hidden rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(4,9,32,0.06)] bg-[rgba(13,31,60,0.02)]">
              <th className="px-6 py-3 text-left font-semibold text-[#040920]">Nome</th>
              <th className="px-6 py-3 text-left font-semibold text-[#040920]">Tipo</th>
              <th className="px-6 py-3 text-left font-semibold text-[#040920]">Status</th>
              <th className="px-6 py-3 text-right font-semibold text-[#040920]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[rgba(4,9,32,0.05)] transition-colors last:border-0 hover:bg-[rgba(13,31,60,0.015)]"
              >
                <td className="px-6 py-4 font-medium text-[#040920]">{item.name}</td>
                <td className="px-6 py-4 text-[rgba(13,31,60,0.65)]">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.type === 'nacional'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    {typeLabel[item.type] ?? item.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {item.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <AssignmentEditRow id={item.id} name={item.name} type={item.type} />
                    <AssignmentActionsPanel
                      id={item.id}
                      name={item.name}
                      isActive={item.isActive}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
