export function objectToFormData(values: Record<string, unknown>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    formData.set(key, String(value));
  }
  return formData;
}
