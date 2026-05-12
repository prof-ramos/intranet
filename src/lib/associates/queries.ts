// Re-export from the repository layer.
// Consumers should migrate to @/lib/associates/repository directly.
export {
  findAssociatesPaginated as getAssociatesPaginated,
  type AssociateListItem,
} from './repository';
