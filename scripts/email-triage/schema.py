from __future__ import annotations

from datetime import date, time
from typing import Literal

from pydantic import BaseModel, Field, model_validator


Categoria = Literal[
    "juridico",
    "administrativo",
    "financeiro",
    "institucional",
    "comunicacao",
    "irrelevante",
]

Confianca = Literal["baixa", "media", "alta"]
NivelRisco = Literal["baixo", "medio", "alto", "critico"]
TipoPrazo = Literal[
    "processual",
    "administrativo",
    "contratual",
    "financeiro",
    "reuniao",
    "resposta",
    "outro",
]
Responsavel = Literal["juridico", "administrativo", "financeiro", "diretoria"]
LegalBasis = Literal[
    "interesse_legitimo",
    "cumprimento_obrigacao_legal",
    "execucao_contrato",
    "avaliacao_humana_necessaria",
]
SourceTipo = Literal["corpo_email", "anexo", "cabecalho", "thread"]


class AnexoResumo(BaseModel):
    filename: str = Field(description="Nome do arquivo anexo.")
    mime_type: str | None = Field(default=None, description="Tipo MIME informado ou inferido.")
    sha256: str | None = Field(default=None, description="Hash SHA256 do anexo, se fornecido.")
    resumo: str = Field(description="Resumo factual do conteudo relevante do anexo.")
    ha_prazo_no_anexo: bool = Field(description="Indica se o anexo contem possivel prazo.")
    trechos_relevantes: list[str] = Field(
        default_factory=list,
        description="Trechos usados como evidencia.",
    )


class SourceEvidence(BaseModel):
    tipo: SourceTipo = Field(description="Origem da evidencia.")
    referencia: str = Field(description="Identificador da origem: corpo, header, anexo ou thread.")
    trecho: str = Field(description="Trecho literal ou evidencia textual minima.")


class EmailTriageSchema(BaseModel):
    categoria: Categoria = Field(description="Classificacao principal do e-mail.")
    resumo: str = Field(description="Resumo factual do e-mail. Maximo 3 frases.")
    thread_context_summary: str | None = Field(
        default=None,
        description="Resumo do contexto anterior da thread, se relevante.",
    )

    ha_prazo: bool = Field(
        description="True se houver prazo, data-limite, vencimento, reuniao ou resposta marcada.",
    )
    prazo_data: date | None = Field(default=None, description="Data do prazo em ISO YYYY-MM-DD.")
    prazo_hora: time | None = Field(default=None, description="Hora do prazo em HH:mm.")
    prazo_confianca_data: Confianca | None = Field(
        default=None,
        description="Confianca especifica na data extraida.",
    )
    tipo_prazo: TipoPrazo | None = Field(default=None, description="Natureza do prazo.")
    trecho_fonte_do_prazo: str | None = Field(
        default=None,
        description="Trecho literal que justifica o prazo.",
    )

    resumo_anexos: list[AnexoResumo] = Field(
        default_factory=list,
        description="Resumo estruturado dos anexos analisados.",
    )
    source_evidence: list[SourceEvidence] = Field(
        default_factory=list,
        description="Evidencias usadas para classificacao, prazo e risco.",
    )

    nivel_risco: NivelRisco = Field(description="Risco operacional ou juridico.")
    confianca: Confianca = Field(description="Confianca geral na interpretacao do e-mail.")
    acao_recomendada: str = Field(description="Proxima acao operacional para humano.")
    responsavel_sugerido: Responsavel | None = Field(default=None, description="Setor sugerido.")
    exige_validacao_humana: bool = Field(description="Indica necessidade de validacao humana.")

    legal_basis: LegalBasis = Field(
        description="Sugestao operacional de base legal LGPD, sujeita a validacao.",
    )
    processed_purpose: str = Field(description="Finalidade explicita do processamento.")

    @model_validator(mode="after")
    def enforce_safety_rules(self) -> "EmailTriageSchema":
        if not self.ha_prazo:
            has_deadline_fields = (
                self.prazo_data is not None
                or self.prazo_hora is not None
                or self.prazo_confianca_data is not None
                or self.tipo_prazo is not None
                or self.trecho_fonte_do_prazo is not None
            )
            if has_deadline_fields:
                raise ValueError("Campos de prazo nao devem ser preenchidos sem ha_prazo.")

        if self.prazo_data is not None and self.prazo_confianca_data is None:
            raise ValueError("prazo_data preenchido exige prazo_confianca_data.")

        if self.ha_prazo and not self.source_evidence:
            raise ValueError("ha_prazo=true exige ao menos uma evidencia em source_evidence.")

        if self.categoria == "juridico" and not self.exige_validacao_humana:
            raise ValueError("categoria juridico exige validacao humana.")

        if self.ha_prazo and not self.exige_validacao_humana:
            raise ValueError("qualquer prazo identificado exige validacao humana.")

        if self.nivel_risco in {"alto", "critico"} and not self.exige_validacao_humana:
            raise ValueError("risco alto/critico exige validacao humana.")

        if self.confianca in {"baixa", "media"} and not self.exige_validacao_humana:
            raise ValueError("confianca baixa/media exige validacao humana.")

        if self.prazo_confianca_data in {"baixa", "media"} and not self.exige_validacao_humana:
            raise ValueError("prazo_confianca_data baixa/media exige validacao humana.")

        has_attachment_deadline = any(anexo.ha_prazo_no_anexo for anexo in self.resumo_anexos)
        if has_attachment_deadline and not self.exige_validacao_humana:
            raise ValueError("prazo em anexo exige validacao humana.")

        return self
