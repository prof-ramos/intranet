'use client';

import type { PimacoTemplate, PimacoTemplateCode } from '@/lib/etiquetas';
import { FormSelect } from '@/components/ui/FormSelect';

export function EtiquetasTemplateSelector({
  templates,
  value,
  onChange,
}: {
  templates: PimacoTemplate[];
  value: PimacoTemplateCode;
  onChange: (value: PimacoTemplateCode) => void;
}) {
  return (
    <FormSelect
      id="etiquetas-template"
      label="Modelo Pimaco"
      hint="Use debug e offsets para calibrar o alinhamento físico da impressora."
      value={value}
      onChange={(event) => onChange(event.target.value as PimacoTemplateCode)}
    >
      {templates.map((template) => (
        <option key={template.code} value={template.code}>
          {template.name} · {template.columns * template.rows} etiquetas
        </option>
      ))}
    </FormSelect>
  );
}
