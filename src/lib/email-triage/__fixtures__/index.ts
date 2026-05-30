import sampleMessage from "./sample-message.json";
import validTriageResponse from "./valid-triage-response.json";
import redactionInputs from "./redaction-inputs.json";
import multipartEmail from "./multipart-email.json";
import htmlEmail from "./html-email.json";

/**
 * Gmail API message JSON matching the Python test fixture.
 * Decoded body: "Responder ate 10/06/2026."
 * Decoded attachment (aviso.txt): "anexo"
 */
export { sampleMessage };
export type SampleMessage = typeof sampleMessage;

/**
 * Valid Gemini triage response matching EmailTriageSchema (port of VALID_TRIAGE from schema.py).
 * Categoria: juridico, deadline present, requires human validation.
 */
export { validTriageResponse };
export type ValidTriageResponse = typeof validTriageResponse;

/**
 * Test cases for PII redaction patterns (EMAIL_RE, CPF_RE, LONG_NUMBER_RE).
 * Each case provides input text and the substrings expected to be redacted.
 */
export { redactionInputs };
export type RedactionInputs = typeof redactionInputs;

/**
 * Multipart/alternative email with text/plain and text/html parts.
 * Decoded plain body: "Prezado associado,\n\nConfirme sua presenca na assembleia geral dia do mes de junho.\nAtenciosamente.\n\nASOF - Diretoria"
 */
export { multipartEmail };
export type MultipartEmail = typeof multipartEmail;

/**
 * HTML-only email matching test_extracts_html_only_body_as_plain_text.
 * Decoded body: "<p>Responder <strong>hoje</strong>.</p>"
 * Rendered text: "Responder hoje."
 */
export { htmlEmail };
export type HtmlEmail = typeof htmlEmail;

const fixtures = {
  sampleMessage,
  validTriageResponse,
  redactionInputs,
  multipartEmail,
  htmlEmail,
} as const;

export default fixtures;
