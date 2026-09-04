function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const unquoted = header.match(/filename=([^;]+)/i);
  return unquoted?.[1]?.trim() ?? null;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadAuthenticatedCsv(
  href: string,
): Promise<{ ok: true; filename: string } | { ok: false; status: number; message: string }> {
  const response = await fetch(href, { credentials: 'same-origin' });

  if (response.status === 429) {
    return {
      ok: false,
      status: 429,
      message: 'Muitas exportações. Aguarde um minuto e tente de novo.',
    };
  }
  if (response.status === 403) {
    return { ok: false, status: 403, message: 'Sem permissão para exportar a mala direta.' };
  }
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: `Falha ao gerar o CSV (${response.status}).`,
    };
  }

  const blob = await response.blob();
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition')) ?? 'mala-direta-gmail.csv';
  triggerBlobDownload(blob, filename);
  return { ok: true, filename };
}
