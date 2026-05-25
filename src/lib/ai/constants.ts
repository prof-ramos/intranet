export const ALLOWED_EMAIL_TYPES = ['newsletter', 'convite', 'comunicado', 'aviso'] as const;
export type EmailType = (typeof ALLOWED_EMAIL_TYPES)[number];
