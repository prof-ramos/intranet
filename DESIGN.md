---
version: alpha
name: ASOF Intranet
description: Institutional operations interface for ASOF, combining diplomatic formality with dense administrative workflows.
colors:
  primary: "#040920"
  on-primary: "#ffffff"
  primary-container: "#06284f"
  primary-container-hover: "#0d3260"
  primary-container-active: "#123d73"
  secondary: "#76aeea"
  on-secondary: "#040920"
  tertiary: "#e7c16b"
  on-tertiary: "#4f3308"
  background: "#f8fafc"
  on-background: "#0d1f3c"
  surface: "#ffffff"
  surface-container-low: "#f8fafc"
  surface-container: "#eef1f6"
  surface-container-high: "#e7edf4"
  surface-container-highest: "#dde3ec"
  on-surface: "#0d1f3c"
  on-surface-variant: "#59677a"
  outline: "#c9d2df"
  outline-variant: "#dde3ec"
  inverse-surface: "#0d1f3c"
  inverse-on-surface: "#ffffff"
  success: "#15803d"
  on-success: "#ffffff"
  success-container: "#dcfce7"
  success-accent: "#86efac"
  warning: "#a16207"
  on-warning: "#ffffff"
  warning-container: "#f4ddb1"
  warning-accent: "#e7c16b"
  error: "#b91c1c"
  on-error: "#ffffff"
  error-container: "#fee2e2"
  information: "#76aeea"
  status-todo: "#94a3b8"
  status-progress: "#76aeea"
  status-waiting: "#e7c16b"
  status-done: "#86efac"
  priority-low: "rgba(13,31,60,0.50)"
  priority-normal: "rgba(13,31,60,0.70)"
  priority-high: "#a16207"
  priority-urgent: "#b91c1c"
typography:
  display:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: 0em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: 0em
  title-lg:
    fontFamily: Playfair Display
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0em
  title-md:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: 0em
  metric-lg:
    fontFamily: Google Sans
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0em
  body-lg:
    fontFamily: Google Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0em
  body-md:
    fontFamily: Google Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  body-sm:
    fontFamily: Google Sans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0em
  label-md:
    fontFamily: Google Sans
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0em
  label-sm:
    fontFamily: Google Sans
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.1em
  eyebrow:
    fontFamily: Google Sans
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.18em
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 10px
  xl: 12px
  box: 16px
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 28px
  4xl: 32px
  5xl: 40px
  page-x-mobile: 20px
  page-x-tablet: 32px
  page-x-desktop: 40px
  section-gap: 28px
  card-padding: 20px
  form-card-padding: 28px
  sidebar-width: 288px
  nav-item-height: 58px
elevation:
  flat: "0 0 0 #00000000"
  hairline: "0 1px 0 #0409200d"
  popover: "0 8px 20px #04092014"
  card: "0 12px 30px #04092014"
  button: "0 4px 0 #0409201f"
  drawer: "-12px 0 30px #0409201f"
  modal: "0 24px 60px #04092040"
motion:
  duration-fast: 120ms
  duration-base: 150ms
  duration-slow: 220ms
  easing-standard: ease
  easing-emphasized: cubic-bezier(0.2, 0, 0, 1)
components:
  app-background:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-background}"
  divider:
    backgroundColor: "{colors.outline-variant}"
    size: 1px
  border-strong:
    backgroundColor: "{colors.outline}"
    size: 1px
  focus-ring:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    size: 2px
  tooltip:
    backgroundColor: "{colors.inverse-surface}"
    textColor: "{colors.inverse-on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  sidebar:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary}"
    width: "{spacing.sidebar-width}"
  sidebar-item:
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    height: "{spacing.nav-item-height}"
    padding: "0 36px"
    rounded: "{rounded.none}"
  sidebar-item-hover:
    backgroundColor: "{colors.primary-container-hover}"
    textColor: "{colors.on-primary}"
  sidebar-item-active:
    backgroundColor: "{colors.primary-container-active}"
    textColor: "{colors.on-primary}"
    size: 6px
  page-eyebrow:
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.eyebrow}"
  page-title:
    textColor: "{colors.primary}"
    typography: "{typography.headline-lg}"
  empty-state:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.box}"
    padding: "{spacing.card-padding}"
  card-hover:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
  card-emphasis:
    backgroundColor: "{colors.surface-container-highest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.box}"
    padding: "{spacing.card-padding}"
  form-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.box}"
    padding: "{spacing.form-card-padding}"
  kanban-column:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.box}"
    padding: "{spacing.md}"
  kanban-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    height: 40px
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    height: 40px
    padding: "0 16px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: "0 12px"
  textarea:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  badge:
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-success:
    backgroundColor: "{colors.success-container}"
    textColor: "{colors.success}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-warning:
    backgroundColor: "{colors.warning-container}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-error:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.error}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  alert-success:
    backgroundColor: "{colors.success-container}"
    textColor: "{colors.success}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  alert-warning:
    backgroundColor: "{colors.warning-container}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  alert-error:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.error}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  action-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 14px"
  action-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-warning}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 14px"
  action-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 14px"
  status-dot:
    rounded: "{rounded.xs}"
    size: 8px
  status-dot-todo:
    backgroundColor: "{colors.status-todo}"
    rounded: "{rounded.xs}"
    size: 8px
  status-dot-progress:
    backgroundColor: "{colors.status-progress}"
    rounded: "{rounded.xs}"
    size: 8px
  status-dot-waiting:
    backgroundColor: "{colors.status-waiting}"
    rounded: "{rounded.xs}"
    size: 8px
  status-dot-done:
    backgroundColor: "{colors.status-done}"
    rounded: "{rounded.xs}"
    size: 8px
  success-dot:
    backgroundColor: "{colors.success-accent}"
    rounded: "{rounded.xs}"
    size: 8px
  warning-dot:
    backgroundColor: "{colors.warning-accent}"
    rounded: "{rounded.xs}"
    size: 8px
  priority-low:
    textColor: "{colors.priority-low}"
    typography: "{typography.label-sm}"
  priority-normal:
    textColor: "{colors.priority-normal}"
    typography: "{typography.label-sm}"
  priority-high:
    textColor: "{colors.priority-high}"
    typography: "{typography.label-sm}"
  priority-urgent:
    textColor: "{colors.priority-urgent}"
    typography: "{typography.label-sm}"
  legal-tag:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  info-tag:
    backgroundColor: "{colors.information}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  tag-neutral:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface-variant}"
    borderColor: "{colors.outline-variant}"
    typography: "10px semibold"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# ASOF Intranet Design System

## Overview

The interface is an institutional operations room for a professional association. It should feel formal, composed, and trustworthy, but not ceremonial to the point of slowing work down. The visual identity blends diplomatic restraint with a quiet editorial quality: large serif headings, compact administrative controls, navy actions, and light blue-gray work surfaces.

The product is primarily a dense back-office tool. Screens should prioritize scanning, comparison, and repeated administrative action. Use restrained visual hierarchy instead of decorative effects. A page should feel like a well-organized briefing: clear title, short context line, decisive primary action, then structured operational panels.

## Colors

The palette is light and cool. The main canvas is a very pale blue-gray, content surfaces are white, and the primary interaction color is an almost-black navy. This creates high contrast without making the app feel consumer-like or loud.

- **Primary navy (#040920):** Use for page titles, main actions, avatars, progress fills, and the strongest text emphasis.
- **Sidebar navy (#06284f):** Use for persistent navigation and any deep institutional panels.
- **Sky blue (#76aeea):** Use sparingly for active navigation accents, progress status, focus indication, and operational highlights.
- **Amber (#e7c16b / #a16207):** Use for waiting states, legal or cautionary context, and medium-risk priority.
- **Green (#15803d / #86efac):** Use for completion, contribution health, and successful confirmations.
- **Red (#b91c1c):** Use only for overdue, urgent, destructive, or blocked states.

Avoid large saturated color blocks in the main work area. Most screens should be white panels and pale blue-gray containers with small color markers carrying status.

## Typography

Typography carries most of the brand personality. Page titles and section titles use **Playfair Display** to create an editorial, official tone. Body text, labels, tables, buttons, and controls use **Google Sans** for clarity and administrative efficiency.

Headlines should be large, dark navy, and tight. They should not be all caps. Eyebrows and field labels may be uppercase with generous letter spacing, giving screens the rhythm of a formal dossier. Metrics and numeric values use **Google Sans** for tabular clarity; the serif is reserved for text headings only.

Body copy should stay compact. The interface works best at 12px to 16px for operational text, with only page titles and major metrics breaking that density.

## Layout

The layout is a fixed institutional shell with a 288px navy navigation rail on wide screens and a compact top bar on smaller screens. Page content sits on a pale blue-gray canvas with 20px to 40px outer padding depending on viewport size.

Use a 4px base rhythm. Most operational clusters should use 12px, 16px, 20px, or 28px gaps. Cards should not float dramatically; they should align cleanly in grids, rows, and kanban columns. Dense dashboards can use stripe-like KPI bands where each metric occupies a quiet cell separated by hairline borders.

Forms should keep labels close to fields, group related choices into bordered panels, and reserve the strongest button for the final submit action. Side panels and modals should appear as task surfaces, not marketing cards.

## Elevation & Depth

Depth is restrained. Hierarchy comes primarily from tonal layers, borders, and spacing. Shadows are soft and navy-tinted when used, but most cards should rely on a 1px blue-gray border rather than obvious elevation.

Use stronger shadows only for temporary layers such as popovers, drawers, and modals. Buttons may use a small hard bottom shadow to make the navy primary action feel tactile, but this should remain subtle.

## Shapes

The shape language is moderately soft and administrative. Standard cards use 16px corners, while controls, inputs, kanban cards, and buttons generally use 8px to 10px. Status dots are small squared marks with slight rounding, reinforcing the operational dashboard feel.

Use pills only for badges, compact tags, avatars, and segmented controls. Avoid overly rounded cards or playful shapes; the product should stay crisp and official.

## Components

Primary buttons are navy with white text and a compact 40px height. Secondary buttons are white or outline treatments with navy text and a thin blue-gray border. Button text should be short, action-oriented, and semibold.

Inputs are white with blue-gray borders, 8px corners, and compact labels above them. Placeholder text should be muted and practical. Error and helper text should stay close to the field and use semantic color only when needed.

Cards are white, bordered, and lightly padded. Dashboard cards may use pale blue-gray inner containers to group kanban columns or empty states. Kanban cards should be compact, with status indicated by dots, priority indicated by small uppercase labels, and metadata kept visually secondary.

Navigation is dark navy, full-height, and utilitarian. Active items use a sky-blue left indicator and a slightly brighter navy fill. Inactive items stay low-contrast white until hover or focus.

## Responsive Sizing

Touch targets and control density adapt between mobile and desktop. Three utility patterns govern this:

- **Mobile touch target** (`mobileTouchTargetClass`): minimum 44×44px on all viewports — required for any interactive control.
- **Desktop dense control** (`desktopDenseControlClass`): full 44px height on mobile, 32px on `lg+` — use for secondary controls that benefit from compactness on wide screens.
- **Compact action** (`compactActionClass`): 40×40px on mobile, 32×32px on `lg+` — use for icon-only buttons in toolbars and card headers.

These are implemented as Tailwind class strings in `src/lib/ui/tokens.ts` and should be imported from there rather than repeated inline.

## Do's and Don'ts

- Do keep the main canvas pale, quiet, and spacious enough for scanning.
- Do use Playfair Display for titles and section headings; use Google Sans for numeric metrics and dense body text.
- Do communicate status with small dots, badges, and text color rather than large colored blocks.
- Do keep administrative controls compact and predictable.
- Don't introduce gradients, decorative blobs, glass effects, or marketing-style hero sections.
- Don't make cards overly rounded or heavily shadowed.
- Don't use bright accent colors unless they represent a meaningful operational state.
- Don't reference implementation variables, framework classes, or source-file names when extending this design language.
