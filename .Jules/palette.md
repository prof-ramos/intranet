## 2026-05-31 - Adding loading spinner to login button
**Learning:** Added a loading spinner to the login button to improve user feedback. React's `useFormStatus` hook handles the `pending` state beautifully. The button uses the existing `aria-busy` attribute correctly, and adding `aria-hidden='true'` to the decorative icon ensures a better screen reader experience.
**Action:** When adding icons to buttons, always check if they are decorative. If so, add `aria-hidden='true'`.

## 2026-06-05 - Adding loading state to logout button
**Learning:** Implemented a UX improvement on the Logout button by introducing a loading spinner (`Loader2`) when the logout request is pending. It leverages `useFormStatus` from `react-dom` to automatically detect the pending state of the surrounding `action={logout}` form without managing explicit React state. The form must be extracted to a separate submit button component (`SubmitLogoutButton`) to correctly receive the `pending` context. Setting appropriate disabled styling (`opacity-70`, `cursor-not-allowed`) ensures good visual feedback to the user and prevents double submissions.
**Action:** Always wrap submit buttons in a dedicated component when using `useFormStatus` to access the pending form context, and ensure loading states include visual disabled treatments.
