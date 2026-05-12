// Re-export view-model types and helpers from the service layer.
// The getAssociateProfileViewModel function has moved to @/lib/associates/service.
export {
  formatAssociateDate,
  getAssociateProfile,
  getAssociateProfile as getAssociateProfileViewModel,
  getAssociateStatusLabel,
  initialsFromName,
  yearsSinceDate,
  type AssociateLinkedActivity,
  type AssociateProfileViewModel,
  type AssociateTimelineItem,
} from './service';
