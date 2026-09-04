/**
 * Splits a full name the same way the Gmail Contacts sample does:
 * Name = full string; First Name = first token; Last Name = last token;
 * middle names are dropped.
 */
export function splitContactName(fullName: string | null | undefined): {
  name: string;
  firstName: string;
  lastName: string;
} {
  const name = (fullName ?? '').trim().replace(/\s+/g, ' ');
  if (!name) {
    return { name: '', firstName: '', lastName: '' };
  }

  const tokens = name.split(' ');
  if (tokens.length === 1) {
    return { name, firstName: tokens[0], lastName: '' };
  }

  return {
    name,
    firstName: tokens[0],
    lastName: tokens[tokens.length - 1],
  };
}
