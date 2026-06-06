## 2026-05-31 - Adding loading spinner to login button
**Learning:** Added a loading spinner to the login button to improve user feedback. React's `useFormStatus` hook handles the `pending` state beautifully. The button uses the existing `aria-busy` attribute correctly, and adding `aria-hidden='true'` to the decorative icon ensures a better screen reader experience.
**Action:** When adding icons to buttons, always check if they are decorative. If so, add `aria-hidden='true'`.
