## 2026-05-31 - Adding loading spinner to login button
**Learning:** Added a loading spinner to the login button to improve user feedback. React's `useFormStatus` hook handles the `pending` state beautifully. The button uses the existing `aria-busy` attribute correctly, and adding `aria-hidden='true'` to the decorative icon ensures a better screen reader experience.
**Action:** When adding icons to buttons, always check if they are decorative. If so, add `aria-hidden='true'`.

## 2024-05-24 - Async Button States & Modal Backdrop Accessibility
**Learning:** Destructive and auth actions in modals (like logout) need clear async feedback to prevent multiple clicks and user confusion. Additionally, invisible `modal-backdrop` buttons used in DaisyUI modals create keyboard accessibility issues if they remain focusable.
**Action:** Always wrap `useFormStatus` into a sub-component for form submission buttons to show pending states (`Loader2` spinner, text changes, disabled/aria-busy states). Ensure `modal-backdrop` buttons have `tabIndex={-1}` and an `aria-label` to keep them accessible to screen readers but skipped during keyboard navigation.

## 2026-06-11 - Adding loading spinner to forgot password button
**Learning:** Added a loading spinner to the forgot password submit button to improve user feedback during async operations. Similar to the login button, extracting the button to a client component using `useFormStatus` handles the `pending` state cleanly. Adding `aria-busy` and `aria-hidden` to the spinner icon improves accessibility.
**Action:** When working with Next.js Server Actions in forms, ensure submit buttons with loading states are extracted into separate Client Components to correctly hook into `useFormStatus`. Always add `aria-busy` when pending and `aria-hidden='true'` to decorative loading icons.

## 2024-05-24 - Missing Focus Rings on Standalone Buttons
**Learning:** While `focusRingClass` from `tokens.ts` is widely used on form inputs and list items, standalone interactive components (like the sidebar's logout trigger and the login submit button) frequently omit focus-visible styles, breaking keyboard navigation visibility.
**Action:** Always verify keyboard focus states specifically on root-level or abstracted interactive components to ensure `focusRingClass` or equivalent `focus-visible` utilities are applied.
## 2026-06-13 - Missing Focus Rings on Reset Password Button
**Learning:** While the login and forgot password submit buttons were updated to support async loading states and accessibility attributes, the reset password button lacked the `focusRingClass` to ensure consistent keyboard navigation visibility.
**Action:** When creating or extracting interactive components like submit buttons, always verify that `focusRingClass` or equivalent focus-visible utilities are applied to maintain keyboard accessibility.
## 2026-06-16 - Adding async loading state and focus ring to Change Password submit button
**Learning:** Similar to the login, logout, and forgot-password buttons, the "Change Password" form's submit button lacked both an async loading state and consistent keyboard focus styles (`focusRingClass`). It was a static button wrapped in a `<form>`. By extracting it into a separate `"use client"` component, we could use `useFormStatus` to show a proper pending state with a spinner (`aria-busy`), preventing multiple submissions and improving user feedback.
**Action:** Whenever reviewing or creating forms with Next.js Server Actions, always check if the submit button uses `useFormStatus` for async feedback. If not, extract it into a client component. Additionally, ensure all standalone interactive elements have the `focusRingClass` applied to maintain keyboard navigation accessibility.

## 2026-06-17 - Combobox Keyboard Navigation and Hover Precedence
**Learning:** When implementing the `aria-activedescendant` combobox pattern, dropdown items must have `tabIndex={-1}` so they don't break the natural tab sequence out of the input. Additionally, Tailwind `hover:bg-...` classes fail if overridden by inline `style={{ background: 'transparent' }}`; using `undefined` allows the class to work correctly.
**Action:** Always test hover states when inline styles are used conditionally, and ensure `role="option"` elements are removed from the tab order when focus is managed via the parent input.
## 2026-06-20 - Missing Focus Rings on Forgot Password Button
**Learning:** Similar to the login and reset password buttons, the forgot password submit button was missing the `focusRingClass`. This breaks keyboard navigation visibility and creates an inconsistent experience across the authentication flow.
**Action:** When extracting interactive standalone components like form submission buttons, always double-check that keyboard accessibility classes like `focusRingClass` are applied alongside standard visual styling.

## 2026-06-20 - Title Fallback for Buttons
**Learning:** `title` attributes on buttons serve as an accessibility fallback in some cases, but relying on them can cause issues with screen readers.
**Action:** Always prefer an explicit `aria-label` for icon-only buttons, even if a `title` tooltip is already present, to guarantee uniform screen-reader support without hiding or duplicating text unnecessarily.
