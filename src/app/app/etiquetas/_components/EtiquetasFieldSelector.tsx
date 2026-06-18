'use client';

import type { EtiquetaFieldKey } from '@/lib/etiquetas';

const FIELD_LABELS: Record<EtiquetaFieldKey, string> = {
  nome: 'Nome',
  matricula: 'Matrícula',
  categoria: 'Categoria',
  situacao_associativa: 'Vínculo ASOF',
  lotacao: 'Lotação',
  posto: 'Posto',
  endereco_completo: 'Endereço completo',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cidade_uf: 'Cidade/UF',
  cep: 'CEP',
  email: 'E-mail',
  telefone: 'Telefone',
  observacao: 'Observação curta',
};

export function EtiquetasFieldSelector({
  fields,
  selected,
  onChange,
}: {
  fields: EtiquetaFieldKey[];
  selected: EtiquetaFieldKey[];
  onChange: (fields: EtiquetaFieldKey[]) => void;
}) {
  function toggle(field: EtiquetaFieldKey) {
    onChange(selected.includes(field) ? selected.filter((item) => item !== field) : [...selected, field]);
  }

  return (
    <fieldset>
      <legend className="text-sm font-semibold">Campos da etiqueta</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <label key={field} className="flex min-h-10 items-center gap-2 rounded-[8px] border border-base-300 px-3 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={selected.includes(field)}
              onChange={() => toggle(field)}
            />
            <span>{FIELD_LABELS[field]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
