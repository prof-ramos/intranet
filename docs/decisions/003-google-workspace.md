# ADR 003 — Estratégia de Integração Google Workspace

## Status

Aceito | 2025-03-18

---

## Contexto

A ASOF usa Google Workspace para:
- Armazenamento de documentos (Google Drive)
- Planilhas operacionais (Google Sheets)
- Documentação colaborativa (Google Docs)
- Comunicação (Gmail — fora do escopo inicial)

**Decisão necessária**: Qual nível de integração implementar na V1?

---

## Decisão

**Integração em 3 camadas progressivas**, começando com links manuais na V1.

---

## Camadas de Integração

### Camada 1 (V1) — Links Organizados

**Implementar**: Botões/links que abrem pastas/arquivos específicos do Google Workspace

```php
// Exemplo: QuickLink model
class QuickLink extends Model
{
    protected $fillable = ['title', 'url', 'category', 'icon'];

    // URL: https://drive.google.com/drive/folders/xyz
    // Nenhuma autenticação necessária (pasta pública ou compartilhada)
}
```

**Características**:
- ✅ Zero OAuth necessário
- ✅ Categorização manual (Drive, Docs, Sheets)
- ✅ Ordem manual definida
- ✅ Ícones visuais

**Esforço**: 1-2 dias

---

### Camada 2 (V2) — Leitura de Metadados

**Implementar**: Listar arquivos de pastas específicas via Google Drive API

```php
// GoogleDriveService
class GoogleDriveService
{
    public function listFilesInFolder(string $folderId): array
    {
        $results = $this->service->files->listFiles([
            'q' => "'{$folderId}' in parents",
            'fields' => 'files(id,name,webViewLink,createdTime,mimeType)',
        ]);

        return $results->getFiles();
    }
}
```

**Características**:
- ⚠️ Requer OAuth 2.0 (service account ou user consent)
- ✅ Lista automática de arquivos
- ✅ Metadados (data de criação, tipo)
- ✅ Links diretos para visualização

**Esforço**: 3-5 dias (OAuth + configuração)

---

### Camada 3 (V3) — Automação Pontual

**Implementar**: Criar pastas/documentos, sincronização bidirecional

**Características**:
- ⚠️ OAuth com escritos de escrita
- ✅ Criar pasta de reunião automaticamente
- ✅ Gerar documento de ATA
- ✅ Webhooks para mudanças

**Esforço**: 5-7 dias

---

## Por que Começar com Camada 1?

### Riscos Mitigados

| Risco | Camada 1 | Camada 2/3 |
|-------|----------|------------|
| **Complexidade OAuth** | Nenhum | Alto |
| **Manutenção tokens** | Nenhum | Requer refresh logic |
| **API quota limits** | Nenhum | 10.000 requisições/dia |
| **Permissões Google** | Nenhum | Console setup complexo |
| **Time to value** | Imediato | Dias |

### Valor Imediato

- Links organizados já são 10x melhor que arquivos espalhados
- Curadoria manual garante relevância
- Zero dependência de APIs externas

---

## Quando Evoluir para Camada 2?

**Sinais de que é hora**:

1. Links manuais estão ficando desatualizados
2. Muitas pastas/arquivos sendo adicionados manualmente
3. Usuários pedindo "fazer automático"
4. Disponibilidade de 1 semana de dev focado

---

## Alternativas Consideradas

### Integração Completa (Camada 3) na V1

- **Pros**: "Wow factor", totalmente automatizado
- **Cons**: Alto risco de atraso no MVP, OAuth complexo
- **Veredito**: Muito arriscado para cronograma apertado

### Sem Integração Nenhuma

- **Pros**: Máxima simplicidade
- **Cons**: Usuários continuam acessando diretamente, nada ganho
- **Veredito**: Perde valor da intranet como hub central

### Migração para SharePoint/M365

- **Pros**: Ecossistema empresarial completo
- **Cons**: Lock-in Microsoft, custo de licença, migração de dados
- **Veredito**: Fora de escopo (ASOF usa Google)

---

## Configuração Futura (Camada 2+)

```bash
# Instalar client
composer require google/apiclient:^2.15

# .env
GOOGLE_CLIENT_ID=apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://intranet.asof.org/google/callback
GOOGLE_SCOPES=DRIVE_METADATA_READONLY,DRIVE_READONLY,SPREADSHEETS_READONLY
```

---

## Referências

- [Google Drive API](https://developers.google.com/drive/api/v3/reference)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Service Account Auth](https://developers.google.com/identity/protocols/oauth2/service-account)

---

**Decidido por**: Equipe Técnica ASOF
**Revisão**: V1 — Começar com Camada 1, evoluir conforme necessidade
