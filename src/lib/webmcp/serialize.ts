import 'server-only';

import { decryptAssociatePii } from '@/lib/associates/pii-mapping';
import type { AssociateProfileViewModel } from '@/lib/associates/profile';
import type { Associate } from '@/lib/db/schema/associates';

function decryptProfilePii(associate: Associate) {
  try {
    return decryptAssociatePii(associate);
  } catch {
    return {
      cpf: associate.cpf,
      rg: associate.rg,
      siape: associate.siape,
      primaryEmail: associate.primaryEmail,
      phone: associate.phone,
      whatsapp: associate.whatsapp,
      address: associate.address,
    };
  }
}

export function serializeOfficialProfile(profile: AssociateProfileViewModel) {
  const associate = profile.associate;
  const pii = decryptProfilePii(associate);

  return {
    id: associate.id,
    fullName: associate.fullName,
    cpf: pii.cpf,
    rg: pii.rg,
    rgIssuer: associate.rgIssuer,
    rgState: associate.rgState,
    siape: pii.siape,
    sex: associate.sex,
    maritalStatus: associate.maritalStatus,
    birthDate: associate.birthDate,
    birthCity: associate.birthCity,
    birthState: associate.birthState,
    primaryEmail: pii.primaryEmail,
    secondaryEmail: associate.secondaryEmail,
    phone: pii.phone,
    whatsapp: pii.whatsapp,
    address: pii.address,
    neighborhood: associate.neighborhood,
    addressState: associate.addressState,
    zipCode: associate.zipCode,
    locationCity: associate.locationCity,
    locationCountry: associate.locationCountry,
    assignment: associate.assignment,
    assignmentStartDate: associate.assignmentStartDate,
    classPattern: associate.classPattern,
    functionalStatus: associate.functionalStatus,
    associationStatus: associate.associationStatus,
    contributionStatus: associate.contributionStatus,
    paymentMethod: associate.paymentMethod,
    missionType: associate.missionType,
    careerOrigin: associate.careerOrigin,
    internalNotes: associate.internalNotes,
    location: profile.location,
    isAssociationActive: profile.isAssociationActive,
    isFunctionalActive: profile.isFunctionalActive,
    joinedYears: profile.joinedYears,
    careerYears: profile.careerYears,
    dependents: profile.dependents,
    healthAgreements: profile.healthAgreements,
    linkedActivities: profile.linkedActivities,
    href: `/app/associados/${associate.id}`,
  };
}
