'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Upload, 
  Download, 
  Trash2, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  FileCode,
  FileArchive,
  Loader2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import { deleteDocumentAction, downloadDocumentAction } from '@/app/app/secretaria/documentos/actions';
import { UploadDocumentModal } from '@/app/app/secretaria/documentos/_components/UploadDocumentModal';
import {
  hairline,
  textMuted,
  focusRingClass,
  navy,
  primaryContainerHover,
  dangerText,
  cardShadow,
  fileIconPdf,
  fileIconSpreadsheet,
  fileIconImage,
  fileIconArchive,
  fileIconCode,
  fileIconDefault,
  categoryColors as CATEGORY_COLORS,
} from '@/lib/ui/tokens';
import { CSSProperties } from 'react';
import type { DocumentWithUploader } from '@/lib/documents/queries';

const logger = createLogger('documentos:DocumentList');

const CATEGORY_LABELS: Record<string, string> = {
  modelo_contrato: 'Modelo de Contrato',
  contrato: 'Contrato',
  minuta: 'Minuta',
  estatuto: 'Estatuto',
  ata: 'Ata',
  oficio: 'Ofício',
  rh: 'Recursos Humanos',
  evento: 'Evento',
  nota_fiscal: 'Nota Fiscal',
  comprovante: 'Comprovante',
  outro: 'Outro',
};

interface DocumentListProps {
  initialDocuments: DocumentWithUploader[];
  userRole: string;
}

export function DocumentList({ initialDocuments, userRole }: DocumentListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Estados para deleção
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Estados para download
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [isClearHovered, setIsClearHovered] = useState(false);

  const canWrite = userRole === 'admin' || userRole === 'secretaria';

  // Filtros em memória para busca imediata
  const filteredDocuments = useMemo(() => {
    return initialDocuments.filter((doc) => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        doc.name.toLowerCase().includes(q) || 
        (doc.description && doc.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [initialDocuments, selectedCategory, searchQuery]);

  const handleDownload = async (id: number) => {
    setDownloadingId(id);
    try {
      const res = await downloadDocumentAction(id);
      if (res.signedUrl) {
        // Abre o arquivo em nova aba para visualização/download seguro
        window.open(res.signedUrl, '_blank');
      }
    } catch (err) {
      logger.error('Erro ao gerar link de download', { error: toSafeErrorLog(err) }, err instanceof Error ? err : undefined);
      alert('Erro ao gerar link de download.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingId === null) return;
    setIsDeletePending(true);
    setDeleteError(null);
    try {
      const res = await deleteDocumentAction(deletingId);
      if (res.success) {
        setDeletingId(null);
        router.refresh();
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir o documento.');
    } finally {
      setIsDeletePending(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) {
      return <FileText style={{ color: fileIconPdf }} size={20} />;
    }
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv') || type.includes('xls')) {
      return <FileSpreadsheet style={{ color: fileIconSpreadsheet }} size={20} />;
    }
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
      return <ImageIcon style={{ color: fileIconImage }} size={20} />;
    }
    if (type.includes('zip') || type.includes('tar') || type.includes('rar') || type.includes('compressed')) {
      return <FileArchive style={{ color: fileIconArchive }} size={20} />;
    }
    if (type.includes('code') || type.includes('json') || type.includes('javascript') || type.includes('html')) {
      return <FileCode style={{ color: fileIconCode }} size={20} />;
    }
    return <FileText style={{ color: fileIconDefault }} size={20} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Controles do topo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          {/* Input de busca */}
          <div
            className="flex flex-1 items-center gap-2.5 rounded-[12px] border bg-white px-4 py-2"
            style={{ borderColor: hairline }}
          >
            <Search size={18} style={{ color: textMuted }} aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou descrição…"
              aria-label="Buscar documentos"
              className={`flex-1 text-sm outline-none bg-transparent ${focusRingClass}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                onMouseEnter={() => setIsClearHovered(true)}
                onMouseLeave={() => setIsClearHovered(false)}
                className="text-xs text-slate-400 transition-colors"
                style={{ color: isClearHovered ? navy : undefined }}
                aria-label="Limpar busca"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Select de Categoria */}
          <div className="w-full sm:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filtrar por categoria"
              className={`w-full rounded-[12px] border bg-white px-4 py-2.5 text-sm border-slate-200 text-[#040920] outline-none transition-colors focus:border-[#76AEEA] ${focusRingClass}`}
              style={{ borderColor: hairline }}
            >
              <option value="all">Todas as categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botão de Upload */}
        {canWrite && (
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className={`flex h-10 items-center gap-2 rounded-[12px] px-5 text-sm font-semibold text-white transition-all hover:bg-[var(--primary-hover)] ${focusRingClass}`}
            style={
              { backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties
            }
          >
            <Upload size={16} />
            <span>Adicionar</span>
          </button>
        )}
      </div>

      {/* Lista / Tabela */}
      <div 
        className="overflow-hidden rounded-2xl border bg-white shadow-sm"
        style={{ borderColor: hairline, boxShadow: cardShadow }}
      >
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-4 border border-slate-100">
              <FolderOpen size={28} />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#040920]">Nenhum documento encontrado</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              {searchQuery || selectedCategory !== 'all'
                ? 'Nenhum arquivo corresponde aos filtros aplicados. Tente ajustar sua busca.'
                : 'Esta pasta está vazia. Adicione novos documentos para começar.'}
            </p>
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm" aria-label="Tabela de documentos">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Nome / Descrição</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 hidden md:table-cell">Tamanho</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Data</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Enviado por</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const badgeColor = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.outro;
                  return (
                    <tr 
                      key={doc.id}
                      className="group transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0 rounded-lg bg-slate-50 p-2 border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-colors">
                            {getFileIcon(doc.fileType)}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-semibold text-[#040920] truncate max-w-[280px] sm:max-w-md">
                              {doc.name}
                            </span>
                            {doc.description && (
                              <span className="block mt-0.5 text-xs text-slate-400 line-clamp-1 max-w-[280px] sm:max-w-md">
                                {doc.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{
                            backgroundColor: badgeColor.bg,
                            color: badgeColor.text,
                          }}
                        >
                          {CATEGORY_LABELS[doc.category] || doc.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap hidden md:table-cell">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap hidden sm:table-cell">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap hidden lg:table-cell">
                        {doc.uploadedBy.name}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownload(doc.id)}
                            disabled={downloadingId === doc.id}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#040920] transition-colors ${focusRingClass}`}
                            title="Baixar documento"
                            aria-label={`Baixar ${doc.name}`}
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 className="motion-safe:animate-spin" size={16} />
                            ) : (
                              <Download size={16} />
                            )}
                          </button>
                          
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => setDeletingId(doc.id)}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors ${focusRingClass}`}
                              title="Excluir documento"
                              aria-label={`Excluir ${doc.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Upload */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Dialog de Confirmação de Deleção */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040920]/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            style={{ overscrollBehavior: 'contain', borderColor: hairline }}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl motion-safe:duration-200"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="font-serif text-lg font-bold text-[#040920]">
                  Excluir Documento
                </h3>
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mt-0.5">
                  Esta ação é irreversível
                </p>
              </div>
            </div>

            {deleteError && (
              <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-100">
                <span className="font-bold">Erro: </span>
                {deleteError}
              </div>
            )}

            <p className="text-sm text-slate-600 mb-6">
              Você tem certeza que deseja excluir permanentemente este documento? O arquivo físico também será removido do servidor de armazenamento.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingId(null);
                  setDeleteError(null);
                }}
                disabled={isDeletePending}
                className="h-10 rounded-xl px-5 text-sm font-semibold border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeletePending}
                className="flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                style={{ backgroundColor: dangerText }}
              >
                {isDeletePending ? (
                  <Loader2 className="motion-safe:animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
