'use client';

import type { PimacoTemplate, PimacoTemplateCode } from '@/lib/etiquetas';

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
    <label className="block">
      <span className="text-sm font-semibold">Modelo Pimaco</span>
      <select
        className="select select-bordered mt-2 w-full"
        value={value}
        onChange={(event) => onChange(event.target.value as PimacoTemplateCode)}
      >
        {templates.map((template) => (
          <option key={template.code} value={template.code}>
            {template.name} · {template.columns * template.rows} etiquetas
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs opacity-70">
        Use debug e offsets para calibrar o alinhamento físico da impressora.
      </span>
    </label>
  );
}
