export {
  cancelMailingCampaign,
  createMailingCampaign,
  generateCampaignEtiquetasPdf,
  buildCampaignEtiquetasCsv,
  previewMailingAudience,
  processMailingBatch,
  startMailingCampaign,
  type CreateCampaignResult,
  type MailingPreviewResult,
  type ProcessMailingBatchResult,
} from './service';
export {
  countAudience,
  fetchAudience,
  getCampaignAssociateIds,
  getCampaignDetail,
  getMailingRecipientContexts,
  listCampaignRecipients,
  listCampaigns,
} from './queries';
export { campaignEtiquetasDownloadPath } from './paths';
export {
  MAILING_TEMPLATE_VARIABLES,
  findUnknownTemplateVariables,
  renderTemplate,
  renderTemplateHtml,
  renderTemplateText,
  type MailingTemplateContext,
  type MailingTemplateVariable,
} from './templates';
export {
  MAILING_CAMPAIGN_STATUSES,
  MAILING_CHANNELS,
  MAILING_MAX_ATTEMPTS,
  MAILING_MAX_RECIPIENTS,
  MAILING_PREVIEW_SAMPLE,
  MAILING_RECIPIENT_STATUSES,
  type MailingAudienceFilters,
  type MailingAudienceMember,
  type MailingCampaignDetail,
  type MailingCampaignHistoryRow,
  type MailingCampaignStatus,
  type MailingChannel,
  type MailingRecipientContext,
  type MailingRecipientRow,
  type MailingRecipientStatus,
} from './types';
export {
  MAX_RECIPIENTS_MESSAGE,
  createMailingCampaignSchema,
  mailingAudienceFiltersSchema,
  previewMailingAudienceSchema,
  type CreateMailingCampaignInput,
  type CreateMailingCampaignOutput,
  type MailingAudienceFiltersInput,
  type MailingAudienceFiltersOutput,
} from './validations';
