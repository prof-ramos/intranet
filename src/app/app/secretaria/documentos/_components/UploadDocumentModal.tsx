'use client';

import { useState, useRef } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { uploadDocumentAction } from '../actions';
import { X, Upload, Loader2, AlertCircle } from 'lucide-react';
import { navy, primaryContainerHover, hairline, focusRingClass, info, infoBg } from '@/lib/ui/tokens';
import { CSSProperties } from 'react';

const CATEGORIES = [
  { value: 'modelo_contrato', label: 'Modelo de Contrato' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'minuta', label: 'Minuta' },
  { value: 'estatuto', label: 'Estatuto' },
  { value: 'ata', label: 'Ata' },
  { value: 'oficio', label: 'Ofício' },
  { value: 'rh', label: 'Recursos Humanos' },
  { value: 'evento', label: 'Evento' },
  { value: 'nota_fiscal', label: 'Nota Fiscal' },
  { value: 'comprovante', label: 'Comprovante' },
  { value: 'outro', label: 'Outro' },
] as const;

const uploadFormSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.').max(255, 'Nome muito longo.'),
  description: z.string().max(1000, 'Descrição muito longa.').optional(),
  category: z.enum([
    'modelo_contrato',
    'contrato',
    'minuta',
    'estatuto',
    'ata',
    'oficio',
    'rh',
    'evento',
    'nota_fiscal',
    'comprovante',
    'outro',
  ] as const, {
    error: 'Selecione uma categoria válida.',
  }),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadDocumentModal({ isOpen, onClose, onSuccess }: UploadDocumentModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEscapeKey(onClose, isOpen);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'outro',
    },
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg('O arquivo não pode exceder 15MB.');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setErrorMsg(null);
        setSelectedFile(file);
      }
    }
  };

  const onSubmit = async (values: UploadFormValues) => {
    if (!selectedFile) {
      setErrorMsg('Selecione um arquivo para upload.');
      return;
    }

    setIsPending(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('name', values.name);
      if (values.description) {
        formData.append('description', values.description);
      }
      formData.append('category', values.category);
      formData.append('file', selectedFile);

      const res = await uploadDocumentAction(formData);

      if (res.success) {
        reset();
        setSelectedFile(null);
        onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao realizar upload.');
    } finally {
      setIsPending(false);
    }
  };

  const inputClass = `w-full rounded-lg border px-4 py-2.5 text-sm bg-white text-[#040920] border-slate-200 transition-colors focus:border-[#76AEEA] ${focusRingClass}`;
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040920]/45 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        style={{ overscrollBehavior: 'contain', borderColor: hairline }}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in w-full max-w-lg rounded-2xl border bg-white p-8 shadow-2xl motion-safe:duration-200"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: infoBg, color: info }}>
              <Upload size={22} />
            </div>
            <div>
              <h3 id="upload-modal-title" className="font-serif text-xl font-bold text-[#040920]">
                Adicionar Documento
              </h3>
              <p className="mt-0.5 text-[10px] tracking-wider text-slate-500 uppercase font-semibold">
                Secretaria ASOF
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className={`text-slate-400 hover:text-[#040920] transition-colors ${focusRingClass}`}
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-xs text-red-800 border border-red-100">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <span className="font-bold">Erro: </span>
              {errorMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="doc-name" className={labelClass}>
              Nome do Documento
            </label>
            <input
              id="doc-name"
              {...register('name')}
              className={inputClass}
              placeholder="Ex: Ata da Assembleia Geral Extraordinária"
              disabled={isPending}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'doc-name-error' : undefined}
            />
            {errors.name && (
              <p id="doc-name-error" className="mt-1 text-xs text-red-600" role="alert">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="doc-category" className={labelClass}>
                Categoria
              </label>
              <select
                id="doc-category"
                {...register('category')}
                className={inputClass}
                disabled={isPending}
                aria-invalid={!!errors.category}
                aria-describedby={errors.category ? 'doc-category-error' : undefined}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p id="doc-category-error" className="mt-1 text-xs text-red-600" role="alert">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="doc-file" className={labelClass}>
                Arquivo (Máx 15MB)
              </label>
              <input
                id="doc-file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isPending}
                className="w-full text-xs text-slate-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#040920] hover:file:bg-slate-200 transition-colors"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
              {selectedFile && (
                <p className="mt-1.5 text-[11px] text-slate-500 truncate">
                  Selecionado: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="doc-description" className={labelClass}>
              Descrição (Opcional)
            </label>
            <textarea
              id="doc-description"
              {...register('description')}
              className={`${inputClass} min-h-[90px]`}
              placeholder="Descreva brevemente o conteúdo ou objetivo deste documento..."
              disabled={isPending}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'doc-description-error' : undefined}
            />
            {errors.description && (
              <p id="doc-description-error" className="mt-1 text-xs text-red-600" role="alert">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`h-10 rounded-xl px-5 text-sm font-semibold border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 ${focusRingClass}`}
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`flex h-10 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition-all hover:bg-[var(--primary-hover)] disabled:opacity-50 ${focusRingClass}`}
              style={
                { backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties
              }
            >
              {isPending ? (
                <Loader2 className="motion-safe:animate-spin" size={16} />
              ) : (
                <Upload size={16} />
              )}
              <span>Fazer Upload</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
