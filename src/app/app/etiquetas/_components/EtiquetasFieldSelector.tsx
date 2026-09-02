'use client';

import type { EtiquetaFieldKey } from '@/lib/etiquetas';
import { FormCheckbox } from '@/components/ui/FormCheckbox';
import { hairline, textMuted } from '@/lib/ui/tokens';

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
    onChange(
      selected.includes(field) ? selected.filter((item) => item !== field) : [...selected, field],
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-semibold" style={{ color: textMuted }}>
        Campos da etiqueta
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div
            key={field}
            className="rounded-[8px] border px-3 py-2"
            style={{ borderColor: hairline }}
          >
            <FormCheckbox
              id={`field-${field}`}
              label={FIELD_LABELS[field]}
              checked={selected.includes(field)}
              onChange={() => toggle(field)}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
