import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/env';

const geminiApiKey = 'GEMINI_API_KEY' in env ? env.GEMINI_API_KEY : undefined;
const ai = new GoogleGenAI({ apiKey: geminiApiKey || '' });

export async function generateOfficialLetterContent(params: {
  recipient: string;
  recipientRole: string;
  subject: string;
  itamaratySector: string;
  instruction: string;
}) {
  const prompt = `
Você é um assistente institucional da ASOF (Associação Nacional dos Oficiais de Chancelaria).
Sua tarefa é redigir o corpo de um ofício formal seguindo o Padrão Ofício do Manual de Redação da Presidência da República.

DADOS DO DOCUMENTO:
Destinatário: ${params.recipient}
Cargo do Destinatário: ${params.recipientRole}
Assunto: ${params.subject}
Setor Itamaraty: ${params.itamaratySector}
Instrução do usuário: "${params.instruction}"

REGRAS OBRIGATÓRIAS:
1. Use linguagem formal, polida e técnica (PT-BR).
2. Estrutura Tripartite:
   - Introdução: Apresente o objetivo de forma direta (evite "Tenho a honra de").
   - Desenvolvimento: Detalhe o assunto conforme as instruções do usuário.
   - Conclusão: Afirme a posição ou solicite a ação necessária.
3. Não inclua cabeçalho, local, data, vocativo ou fecho. Foque APENAS no corpo do texto.
4. Retorne apenas o texto puro dos parágrafos, sem comentários adicionais ou formatação markdown (como bold/italic).
5. Se a instrução for curta, expanda com termos institucionais apropriados.

Retorne apenas o corpo do ofício.
`;

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return result.text ?? '';
}
