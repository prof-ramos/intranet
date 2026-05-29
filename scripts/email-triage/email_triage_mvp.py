#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#   "google-api-python-client>=2.187.0",
#   "google-auth>=2.45.0",
#   "google-auth-oauthlib>=1.2.3",
#   "google-genai>=1.53.0",
#   "psycopg[binary]>=3.3.2",
#   "pydantic>=2.12.0",
# ]
# ///

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import os
import re
import stat
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

from schema import EmailTriageSchema


SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
SYSTEM_PROMPT_PATH = REPO_ROOT / "docs/email-controller/system-prompt-v1.md"
DEFAULT_GMAIL_QUERY = "to:controller@asof.org.br -label:asof-triaged"
TRIAGED_LABEL_NAME = "asof-triaged"
PROCESSING_VERSION = "email-controller-mvp-v1"
DEFAULT_MODEL = "gemini-2.5-flash"
ANALYSIS_EXCERPT_LIMIT = 4000
PERSISTED_EXCERPT_LIMIT = 500
EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
CPF_RE = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
LONG_NUMBER_RE = re.compile(r"\b\d{6,}\b")


@dataclass(frozen=True)
class AttachmentSummary:
    filename: str
    mime_type: str | None
    sha256: str | None
    size: int | None
    text_excerpt: str | None = None


@dataclass(frozen=True)
class EmailPayload:
    message_id: str
    thread_id: str
    history_id: str | None
    received_at: datetime
    sender: str
    original_recipient: str | None
    subject: str
    body_hash: str
    body_excerpt: str
    analysis_excerpt: str
    attachments: list[AttachmentSummary]


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Variavel de ambiente obrigatoria ausente: {name}")
    return value


def decode_base64url(data: str | None) -> bytes:
    if not data:
        return b""
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def header_value(message: dict[str, Any], name: str) -> str | None:
    headers = message.get("payload", {}).get("headers", [])
    for header in headers:
        if header.get("name", "").lower() == name.lower():
            return header.get("value")
    return None


def parse_received_at(message: dict[str, Any]) -> datetime:
    date_header = header_value(message, "Date")
    if date_header:
        try:
            parsed = parsedate_to_datetime(date_header)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            pass
    internal_ms = message.get("internalDate")
    if internal_ms:
        return datetime.fromtimestamp(int(internal_ms) / 1000, tz=timezone.utc)
    return datetime.now(tz=timezone.utc)


def fetch_attachment_bytes(
    gmail_service: Any,
    user_id: str,
    message_id: str,
    attachment_id: str,
) -> bytes:
    attachment = (
        gmail_service.users()
        .messages()
        .attachments()
        .get(userId=user_id, messageId=message_id, id=attachment_id)
        .execute()
    )
    return decode_base64url(attachment.get("data"))


def html_to_text(value: str) -> str:
    without_scripts = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", value, flags=re.I | re.S)
    without_tags = re.sub(r"<[^>]+>", " ", without_scripts)
    normalized = re.sub(r"\s+", " ", html.unescape(without_tags)).strip()
    return re.sub(r"\s+([.,;:!?])", r"\1", normalized)


def extract_text_and_attachments(
    message: dict[str, Any],
    *,
    gmail_service: Any | None = None,
    user_id: str = "me",
) -> tuple[str, list[AttachmentSummary]]:
    text_parts: list[str] = []
    attachments: list[AttachmentSummary] = []
    message_id = message["id"]

    def walk(part: dict[str, Any]) -> None:
        body = part.get("body", {})
        mime_type = part.get("mimeType")
        filename = part.get("filename") or ""
        attachment_id = body.get("attachmentId")
        data = decode_base64url(body.get("data"))

        if filename:
            attachment_bytes = data
            if attachment_id and gmail_service is not None:
                attachment_bytes = fetch_attachment_bytes(
                    gmail_service,
                    user_id,
                    message_id,
                    attachment_id,
                )
            sha256 = hashlib.sha256(attachment_bytes).hexdigest() if attachment_bytes else None
            text_excerpt = None
            if attachment_bytes and mime_type and mime_type.startswith("text/"):
                text_excerpt = redact_excerpt(
                    attachment_bytes.decode("utf-8", errors="replace"),
                )[:ANALYSIS_EXCERPT_LIMIT]
            attachments.append(
                AttachmentSummary(
                    filename=filename,
                    mime_type=mime_type,
                    sha256=sha256,
                    size=body.get("size"),
                    text_excerpt=text_excerpt,
                ),
            )
            return

        if mime_type == "text/plain" and data:
            text_parts.append(data.decode("utf-8", errors="replace"))
        elif mime_type == "text/html" and data:
            text_parts.append(html_to_text(data.decode("utf-8", errors="replace")))

        for child in part.get("parts", []) or []:
            walk(child)

    walk(message.get("payload", {}))
    return "\n\n".join(text_parts).strip(), attachments


def build_email_payload(
    message: dict[str, Any],
    *,
    gmail_service: Any | None = None,
    user_id: str = "me",
) -> EmailPayload:
    body_text, attachments = extract_text_and_attachments(
        message,
        gmail_service=gmail_service,
        user_id=user_id,
    )
    body_hash = hashlib.sha256(body_text.encode("utf-8")).hexdigest()
    redacted_body = redact_excerpt(body_text)
    return EmailPayload(
        message_id=message["id"],
        thread_id=message.get("threadId") or "",
        history_id=message.get("historyId"),
        received_at=parse_received_at(message),
        sender=header_value(message, "From") or "",
        original_recipient=header_value(message, "To"),
        subject=header_value(message, "Subject") or "(sem assunto)",
        body_hash=body_hash,
        body_excerpt=build_persisted_excerpt(redacted_body),
        analysis_excerpt=redacted_body[:ANALYSIS_EXCERPT_LIMIT],
        attachments=attachments,
    )


def build_persisted_excerpt(value: str) -> str:
    if not value:
        return ""
    if len(value) <= PERSISTED_EXCERPT_LIMIT:
        return "[short-body-redacted; sha256 stored]"
    return f"{value[:PERSISTED_EXCERPT_LIMIT]}...[truncated; sha256 stored]"


def redact_excerpt(value: str) -> str:
    redacted = EMAIL_RE.sub("[email-redacted]", value)
    redacted = CPF_RE.sub("[cpf-redacted]", redacted)
    return LONG_NUMBER_RE.sub("[number-redacted]", redacted)


def build_model_input(payload: EmailPayload) -> dict[str, Any]:
    return {
        "message_id": payload.message_id,
        "thread_id": payload.thread_id,
        "received_at": payload.received_at.isoformat(),
        "sender": payload.sender,
        "original_recipient": payload.original_recipient,
        "subject": payload.subject,
        "body_excerpt": payload.analysis_excerpt,
        "attachments": [
            {
                "filename": attachment.filename,
                "mime_type": attachment.mime_type,
                "sha256": attachment.sha256,
                "size": attachment.size,
                "content_analyzed": attachment.text_excerpt is not None,
                "text_excerpt": attachment.text_excerpt,
            }
            for attachment in payload.attachments
        ],
        "lgpd_constraints": {
            "full_body_is_not_persisted_by_default": True,
            "legal_basis_is_ai_suggestion_only": True,
            "human_validation_required_for_deadlines_and_legal_content": True,
        },
    }


def analyze_with_gemini(
    payload: EmailPayload,
    *,
    api_key: str,
    model_name: str = DEFAULT_MODEL,
) -> tuple[EmailTriageSchema, str | None]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    response = client.models.generate_content(
        model=model_name,
        contents=[
            prompt,
            json.dumps(build_model_input(payload), ensure_ascii=False),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EmailTriageSchema,
        ),
    )
    triage = EmailTriageSchema.model_validate_json(response.text or "{}")
    return triage, getattr(response, "response_id", None)


def connect_gmail(
    *,
    credentials_path: Path,
    token_path: Path,
) -> Any:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    token_path.parent.mkdir(parents=True, exist_ok=True)
    creds: Credentials | None = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), SCOPES)
            creds = flow.run_local_server(port=0)
        token_path.write_text(creds.to_json(), encoding="utf-8")
        token_path.chmod(stat.S_IRUSR | stat.S_IWUSR)
    return build("gmail", "v1", credentials=creds)


def ensure_label(gmail_service: Any, *, user_id: str, label_name: str) -> str:
    labels_response = gmail_service.users().labels().list(userId=user_id).execute()
    for label in labels_response.get("labels", []):
        if label.get("name") == label_name:
            return label["id"]
    created = (
        gmail_service.users()
        .labels()
        .create(
            userId=user_id,
            body={
                "name": label_name,
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
            },
        )
        .execute()
    )
    return created["id"]


def persist_triage(
    connection: Any,
    payload: EmailPayload,
    triage: EmailTriageSchema,
    *,
    model_name: str,
    model_response_id: str | None,
) -> None:
    from psycopg.types.json import Jsonb

    triage_data = triage.model_dump(mode="json")
    attachment_hashes = [attachment.sha256 for attachment in payload.attachments if attachment.sha256]
    connection.execute(
        """
        insert into email_triagens (
          message_id, thread_id, history_id, received_at, sender, original_recipient, subject,
          body_hash, body_excerpt, raw_body_stored, redaction_applied,
          categoria, resumo, thread_context_summary, ha_prazo, prazo_data, prazo_hora,
          prazo_confianca_data, tipo_prazo, trecho_fonte_do_prazo, resumo_anexos,
          source_evidence, attachments_hashes, nivel_risco, confianca, acao_recomendada,
          responsavel_sugerido, exige_validacao_humana, legal_basis, processed_purpose,
          processing_version, model_name, model_response_id, status
        )
        values (
          %(message_id)s, %(thread_id)s, %(history_id)s, %(received_at)s, %(sender)s,
          %(original_recipient)s, %(subject)s, %(body_hash)s, %(body_excerpt)s, false, true,
          %(categoria)s, %(resumo)s, %(thread_context_summary)s, %(ha_prazo)s, %(prazo_data)s,
          %(prazo_hora)s, %(prazo_confianca_data)s, %(tipo_prazo)s, %(trecho_fonte_do_prazo)s,
          %(resumo_anexos)s, %(source_evidence)s, %(attachments_hashes)s, %(nivel_risco)s,
          %(confianca)s, %(acao_recomendada)s, %(responsavel_sugerido)s,
          %(exige_validacao_humana)s, %(legal_basis)s, %(processed_purpose)s,
          %(processing_version)s, %(model_name)s, %(model_response_id)s, %(status)s
        )
        on conflict (message_id) do update set
          updated_at = current_timestamp,
          categoria = excluded.categoria,
          resumo = excluded.resumo,
          thread_context_summary = excluded.thread_context_summary,
          ha_prazo = excluded.ha_prazo,
          prazo_data = excluded.prazo_data,
          prazo_hora = excluded.prazo_hora,
          prazo_confianca_data = excluded.prazo_confianca_data,
          tipo_prazo = excluded.tipo_prazo,
          trecho_fonte_do_prazo = excluded.trecho_fonte_do_prazo,
          source_evidence = excluded.source_evidence,
          resumo_anexos = excluded.resumo_anexos,
          attachments_hashes = excluded.attachments_hashes,
          nivel_risco = excluded.nivel_risco,
          confianca = excluded.confianca,
          acao_recomendada = excluded.acao_recomendada,
          responsavel_sugerido = excluded.responsavel_sugerido,
          exige_validacao_humana = excluded.exige_validacao_humana,
          legal_basis = excluded.legal_basis,
          processed_purpose = excluded.processed_purpose,
          processing_version = excluded.processing_version,
          model_name = excluded.model_name,
          model_response_id = excluded.model_response_id,
          status = excluded.status,
          observacoes_validacao = null,
          validated_at = null,
          usuario_validador_id = null
        """,
        {
            "message_id": payload.message_id,
            "thread_id": payload.thread_id,
            "history_id": payload.history_id,
            "received_at": payload.received_at,
            "sender": payload.sender,
            "original_recipient": payload.original_recipient,
            "subject": payload.subject,
            "body_hash": payload.body_hash,
            "body_excerpt": payload.body_excerpt,
            "categoria": triage.categoria,
            "resumo": triage.resumo,
            "thread_context_summary": triage.thread_context_summary,
            "ha_prazo": triage.ha_prazo,
            "prazo_data": triage.prazo_data,
            "prazo_hora": triage.prazo_hora,
            "prazo_confianca_data": triage.prazo_confianca_data,
            "tipo_prazo": triage.tipo_prazo,
            "trecho_fonte_do_prazo": triage.trecho_fonte_do_prazo,
            "resumo_anexos": Jsonb(triage_data["resumo_anexos"]),
            "source_evidence": Jsonb(triage_data["source_evidence"]),
            "attachments_hashes": Jsonb(attachment_hashes),
            "nivel_risco": triage.nivel_risco,
            "confianca": triage.confianca,
            "acao_recomendada": triage.acao_recomendada,
            "responsavel_sugerido": triage.responsavel_sugerido,
            "exige_validacao_humana": triage.exige_validacao_humana,
            "legal_basis": triage.legal_basis,
            "processed_purpose": triage.processed_purpose,
            "processing_version": PROCESSING_VERSION,
            "model_name": model_name,
            "model_response_id": model_response_id,
            "status": "aguardando_validacao" if triage.exige_validacao_humana else "analisado",
        },
    )


def persist_failure(
    connection: Any,
    payload: EmailPayload,
    *,
    status: str,
    model_name: str,
    failure_reason: str,
) -> None:
    from psycopg.types.json import Jsonb

    connection.execute(
        """
        insert into email_triagens (
          message_id, thread_id, history_id, received_at, sender, original_recipient, subject,
          body_hash, body_excerpt, raw_body_stored, redaction_applied,
          categoria, resumo, ha_prazo, resumo_anexos, source_evidence, attachments_hashes,
          nivel_risco, confianca, acao_recomendada, exige_validacao_humana, legal_basis,
          processed_purpose, processing_version, model_name, status, observacoes_validacao
        )
        values (
          %(message_id)s, %(thread_id)s, %(history_id)s, %(received_at)s, %(sender)s,
          %(original_recipient)s, %(subject)s, %(body_hash)s, %(body_excerpt)s, false, true,
          'irrelevante', %(resumo)s, false, '[]'::jsonb, '[]'::jsonb, %(attachments_hashes)s,
          'medio', 'baixa', %(acao_recomendada)s, true, 'avaliacao_humana_necessaria',
          %(processed_purpose)s, %(processing_version)s, %(model_name)s, %(status)s,
          %(observacoes_validacao)s
        )
        on conflict (message_id) do update set
          updated_at = current_timestamp,
          status = excluded.status,
          observacoes_validacao = excluded.observacoes_validacao
        """,
        {
            "message_id": payload.message_id,
            "thread_id": payload.thread_id,
            "history_id": payload.history_id,
            "received_at": payload.received_at,
            "sender": payload.sender,
            "original_recipient": payload.original_recipient,
            "subject": payload.subject,
            "body_hash": payload.body_hash,
            "body_excerpt": payload.body_excerpt,
            "attachments_hashes": Jsonb(
                [attachment.sha256 for attachment in payload.attachments if attachment.sha256],
            ),
            "resumo": "Falha na validacao da resposta da IA; analise valida nao foi salva.",
            "acao_recomendada": "Reprocessar e encaminhar para validacao humana se persistir.",
            "processed_purpose": "registro de falha tecnica da triagem interna",
            "processing_version": PROCESSING_VERSION,
            "model_name": model_name,
            "status": status,
            "observacoes_validacao": failure_reason[:1000],
        },
    )


def load_messages_from_fixture(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("messages"), list):
        return data["messages"]
    if isinstance(data, dict):
        return [data]
    raise ValueError("Fixture deve ser um objeto de mensagem, lista ou {messages: [...]}.")


def run(args: argparse.Namespace) -> None:
    model_name = args.model
    if args.fixture:
        messages = load_messages_from_fixture(args.fixture)
        for message in messages:
            payload = build_email_payload(message)
            if "analysis" in message:
                triage = EmailTriageSchema.model_validate(message["analysis"])
                print(
                    json.dumps(
                        {
                            "message_id": payload.message_id,
                            "categoria": triage.categoria,
                            "status": "validado-localmente",
                        },
                        ensure_ascii=False,
                    ),
                )
            else:
                print(json.dumps(build_model_input(payload), ensure_ascii=False))
        return

    if not args.apply:
        raise RuntimeError("Use --apply para executar Gmail/Gemini/DB; sem isso, use --fixture.")

    gmail = connect_gmail(credentials_path=args.credentials, token_path=args.token)
    label_id = ensure_label(gmail, user_id=args.user_id, label_name=TRIAGED_LABEL_NAME)
    response = (
        gmail.users()
        .messages()
        .list(userId=args.user_id, q=args.query, maxResults=args.limit)
        .execute()
    )
    messages = response.get("messages", [])
    if not messages:
        print("Nenhum e-mail pendente encontrado.")
        return

    api_key = require_env("GEMINI_API_KEY")
    database_url = require_env("DATABASE_URL")
    import psycopg

    with psycopg.connect(database_url) as connection:
        for item in messages:
            message = (
                gmail.users()
                .messages()
                .get(userId=args.user_id, id=item["id"], format="full")
                .execute()
            )
            payload = build_email_payload(message, gmail_service=gmail, user_id=args.user_id)
            with connection.transaction():
                try:
                    triage, response_id = analyze_with_gemini(
                        payload,
                        api_key=api_key,
                        model_name=model_name,
                    )
                except ValueError as error:
                    persist_failure(
                        connection,
                        payload,
                        status="erro_validacao_ia",
                        model_name=model_name,
                        failure_reason=str(error),
                    )
                    print(
                        json.dumps(
                            {
                                "message_id": payload.message_id,
                                "status": "erro_validacao_ia",
                            },
                            ensure_ascii=False,
                        ),
                    )
                    continue
                persist_triage(
                    connection,
                    payload,
                    triage,
                    model_name=model_name,
                    model_response_id=response_id,
                )
            # Gmail is marked only after the DB row is committed for this message.
            gmail.users().messages().modify(
                userId=args.user_id,
                id=payload.message_id,
                body={"addLabelIds": [label_id]},
            ).execute()
            print(
                json.dumps(
                    {
                        "message_id": payload.message_id,
                        "categoria": triage.categoria,
                        "status": "persistido",
                    },
                    ensure_ascii=False,
                ),
            )


def parse_args() -> argparse.Namespace:
    default_config_dir = Path.home() / ".config/asof-email-triage"
    parser = argparse.ArgumentParser(description="MVP de triagem de e-mails ASOF.")
    parser.add_argument("--fixture", type=Path, help="Arquivo JSON local para validacao sem Gmail.")
    parser.add_argument("--apply", action="store_true", help="Executa Gmail/Gemini/DB e marca e-mails.")
    parser.add_argument("--credentials", type=Path, default=default_config_dir / "credentials.json")
    parser.add_argument("--token", type=Path, default=default_config_dir / "token.json")
    parser.add_argument("--user-id", default="me")
    parser.add_argument("--query", default=DEFAULT_GMAIL_QUERY)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
