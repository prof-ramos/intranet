'use server';

import { db } from '@/lib/db';
import { activities } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function requestDataDownload() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  // Creating an activity for the secretariat to manually generate and send the data
  await db.insert(activities).values({
    title: 'Requisição LGPD: Baixar Dados',
    description: 'Solicitação de cópia de dados (Direito de Acesso/Portabilidade). Compile os relatórios disponíveis e envie de forma segura.',
    status: 'a_fazer',
    priority: 'alta',
    createdBy: session.userId,
    tags: ['LGPD', 'Acesso'],
  });

  revalidatePath('/app/privacidade');
}

export async function requestAccountDeletion() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  // Creating an activity for the secretariat to review the deletion
  await db.insert(activities).values({
    title: 'Solicitação de Exclusão - Direito ao Esquecimento',
    description: 'Solicitação de EXCLUSÃO / ANONIMIZAÇÃO de conta (Direito ao Esquecimento). Revise pendências financeiras e jurídicas de acordo com o Art. 14 do Estatuto da ASOF antes de aprovar ou recusar o pedido.',
    status: 'a_fazer',
    priority: 'urgente',
    createdBy: session.userId,
    tags: ['LGPD', 'Exclusão'],
  });

  revalidatePath('/app/privacidade');
}
