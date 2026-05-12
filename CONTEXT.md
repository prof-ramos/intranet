# ASOF Intranet — Contexto de Negócio

Este documento descreve os termos de domínio e regras de negócio da Intranet da ASOF (Associação Nacional dos Oficiais de Chancelaria).

## Glossário do Domínio

### Secretaria e Documentação

#### Ofício
Documento oficial de comunicação institucional seguindo o **Padrão Ofício** (Manual de Redação da Presidência da República). Utilizado para comunicações formais entre a ASOF e órgãos externos (MRE, Embaixadas, etc).
- **Identificação**: Composta por `NOME DO DOCUMENTO No [número]/[ano]/[setor]`.
- **Partes**: Cabeçalho, Identificação, Local/Data, Endereçamento (Destinatário, Cargo, Vocativo), Assunto, Texto (Introdução, Desenvolvimento, Conclusão), Fecho e Identificação do Signatário.

#### Signatário
A autoridade que assina e expede o documento.
- **Campos**: Nome (em maiúsculas) e Cargo (apenas iniciais maiúsculas).

#### Fecho (Closure)
Saudação final obrigatória.
- **Respeitosamente**: Para autoridades de hierarquia superior.
- **Atenciosamente**: Para autoridades de mesma hierarquia ou inferior.

---

## Regras de Negócio

### Módulo de Ofícios

1. **Numeração Sequencial**: O número do ofício é sequencial e reinicia a cada ano civil (ex: 001/2026, 002/2026).
2. **Imutabilidade de Identificação**: Uma vez gerado o número de um ofício, ele deve ser preservado. Se o ofício for cancelado, o número não deve ser reutilizado para evitar lacunas ou duplicidades na cronologia oficial.
3. **Roles de Acesso**: Operado por `admin`, `diretoria` e `secretaria`.
