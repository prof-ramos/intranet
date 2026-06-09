## 2026-05-31 - Adding loading spinner to login button
**Learning:** Added a loading spinner to the login button to improve user feedback. React's `useFormStatus` hook handles the `pending` state beautifully. The button uses the existing `aria-busy` attribute correctly, and adding `aria-hidden='true'` to the decorative icon ensures a better screen reader experience.
**Action:** When adding icons to buttons, always check if they are decorative. If so, add `aria-hidden='true'`.
## 2024-05-24 - Async Button States & Modal Backdrop Accessibility
**Learning:** Destructive and auth actions in modals (like logout) need clear async feedback to prevent multiple clicks and user confusion. Additionally, invisible `modal-backdrop` buttons used in DaisyUI modals create keyboard accessibility issues if they remain focusable.
**Action:** Always wrap `useFormStatus` into a sub-component for form submission buttons to show pending states (`Loader2` spinner, text changes, disabled/aria-busy states). Ensure `modal-backdrop` buttons have `tabIndex={-1}` and an `aria-label` to keep them accessible to screen readers but skipped during keyboard navigation.
## 2024-05-24 - Missing Focus Rings on Standalone Buttons
**Learning:** While `focusRingClass` from `tokens.ts` is widely used on form inputs and list items, standalone interactive components (like the sidebar's logout trigger and the login submit button) frequently omit focus-visible styles, breaking keyboard navigation visibility.
**Action:** Always verify keyboard focus states specifically on root-level or abstracted interactive components to ensure `focusRingClass` or equivalent `focus-visible` utilities are applied.
