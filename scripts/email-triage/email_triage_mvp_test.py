#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#   "pydantic>=2.12.0",
# ]
# ///

from __future__ import annotations

import unittest

from email_triage_mvp import (
    build_email_payload,
    build_model_input,
    build_persisted_excerpt,
    html_to_text,
    redact_excerpt,
)
from schema import EmailTriageSchema


VALID_TRIAGE = {
    "categoria": "juridico",
    "resumo": "Associado solicita resposta sobre notificacao recebida.",
    "thread_context_summary": None,
    "ha_prazo": True,
    "prazo_data": "2026-06-10",
    "prazo_hora": None,
    "prazo_confianca_data": "alta",
    "tipo_prazo": "resposta",
    "trecho_fonte_do_prazo": "Responder ate 10/06/2026.",
    "resumo_anexos": [],
    "source_evidence": [
        {
            "tipo": "corpo_email",
            "referencia": "body_excerpt",
            "trecho": "Responder ate 10/06/2026.",
        },
    ],
    "nivel_risco": "alto",
    "confianca": "alta",
    "acao_recomendada": "Encaminhar para avaliacao juridica.",
    "responsavel_sugerido": "juridico",
    "exige_validacao_humana": True,
    "legal_basis": "avaliacao_humana_necessaria",
    "processed_purpose": "triagem interna de obrigacoes institucionais",
}


class EmailTriageSchemaTest(unittest.TestCase):
    def test_accepts_valid_legal_deadline(self) -> None:
        triage = EmailTriageSchema.model_validate(VALID_TRIAGE)

        self.assertEqual(triage.categoria, "juridico")
        self.assertTrue(triage.exige_validacao_humana)

    def test_rejects_deadline_without_evidence(self) -> None:
        payload = {**VALID_TRIAGE, "source_evidence": []}

        with self.assertRaises(ValueError):
            EmailTriageSchema.model_validate(payload)

    def test_rejects_legal_without_human_validation(self) -> None:
        payload = {**VALID_TRIAGE, "exige_validacao_humana": False}

        with self.assertRaises(ValueError):
            EmailTriageSchema.model_validate(payload)

    def test_rejects_invalid_json_before_persistence_boundary(self) -> None:
        with self.assertRaises(ValueError):
            EmailTriageSchema.model_validate_json("{invalid")


class EmailPayloadTest(unittest.TestCase):
    def test_builds_hashes_and_model_input_without_full_body_key(self) -> None:
        message = {
            "id": "msg-1",
            "threadId": "thread-1",
            "historyId": "99",
            "internalDate": "1780272000000",
            "payload": {
                "headers": [
                    {"name": "From", "value": "Controller <controller@example.test>"},
                    {"name": "To", "value": "controller@asof.org.br"},
                    {"name": "Subject", "value": "Prazo de resposta"},
                ],
                "parts": [
                    {
                        "mimeType": "text/plain",
                        "body": {"data": "UmVzcG9uZGVyIGF0ZSAxMC8wNi8yMDI2Lg=="},
                    },
                    {
                        "filename": "aviso.txt",
                        "mimeType": "text/plain",
                        "body": {"data": "YW5leG8=", "size": 5},
                    },
                ],
            },
        }

        payload = build_email_payload(message)
        model_input = build_model_input(payload)

        self.assertEqual(payload.body_excerpt, "[short-body-redacted; sha256 stored]")
        self.assertEqual(payload.analysis_excerpt, "Responder ate 10/06/2026.")
        self.assertRegex(payload.body_hash, r"^[a-f0-9]{64}$")
        self.assertRegex(payload.attachments[0].sha256 or "", r"^[a-f0-9]{64}$")
        self.assertEqual(payload.attachments[0].text_excerpt, "anexo")
        self.assertNotIn("body_text", model_input)
        self.assertEqual(model_input["body_excerpt"], "Responder ate 10/06/2026.")
        self.assertTrue(model_input["attachments"][0]["content_analyzed"])

    def test_redacts_common_pii_from_excerpt(self) -> None:
        redacted = redact_excerpt("CPF 123.456.789-00 email pessoa@example.test SIAPE 1234567")

        self.assertNotIn("123.456.789-00", redacted)
        self.assertNotIn("pessoa@example.test", redacted)
        self.assertNotIn("1234567", redacted)

    def test_persisted_excerpt_is_not_full_short_body(self) -> None:
        self.assertEqual(
            build_persisted_excerpt("Mensagem curta"),
            "[short-body-redacted; sha256 stored]",
        )

    def test_extracts_html_only_body_as_plain_text(self) -> None:
        self.assertEqual(html_to_text("<p>Responder <strong>hoje</strong>.</p>"), "Responder hoje.")


if __name__ == "__main__":
    unittest.main()
