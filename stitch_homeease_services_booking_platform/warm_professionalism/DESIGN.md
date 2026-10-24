---
name: Warm Professionalism
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00164e'
  on-tertiary-container: '#6780d3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b6c4ff'
  on-tertiary-fixed: '#00164e'
  on-tertiary-fixed-variant: '#264191'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is tailored for an intuitive, dependable, and approachable residential services marketplace. It reconciles technical clarity with household warmth, enabling users of any technical skill level to book repairs, cleaning, and maintenance with zero friction.

### Aesthetic Paradigm
The visual direction blends **Modern Corporate Utility** with **Tactile Soft Minimalism**:
- **Generous negative space** prevents booking decision fatigue and keeps interfaces uncluttered.
- **Deep architectural navies** impart reliability, institutional trust, and structure.
- **Vibrant teal accents** introduce dynamic momentum for key actions, positive affordances, and confirmation states.
- **Soft radii and gentle ambient shadows** create an inviting, humanized layer over standard administrative workflows.

## Colors

The palette is engineered for high legibility, WCAG AA compliance, and immediate status recognition across residential service tasks.

### Core Roles
- **Primary (`#0F172A` / Slate 900):** Anchors high-priority headers, structural navigation bars, active typography, and primary containment boundaries. Evokes stability and professional rigor.
- **Secondary (`#0D9488` / Teal 600):** Drives primary calls-to-action, active selection states, price highlights, and key operational confirmations.
- **Tertiary (`#1E3A8A` / Blue 900):** Serves as an institutional depth accent—used for informational hero cards, verified service professional tags, and interactive links.
- **Neutral (`#64748B` / Slate 500):** Governs structural body copy, muted microcopy, and icons. Supported by `#334155` for high-emphasis content and `#E2E8F0` for hairline dividers.

### Background & Canvas
- **App Canvas:** `#F8FAFC` (Slate 50) establishes a soft, glare-free baseline.
- **Card / Surface Surfaces:** `#FFFFFF` (Pure White) separates actionable interactive panels from the background.

### Semantic Status Colors
- **Pending / Action Required:** Amber (`#D97706` text over `#FEF3C7` container).
- **Accepted / In Progress:** Teal (`#0D9488` text over `#CCFBF1` container) or Blue (`#2563EB` over `#DBEAFE`).
- **Completed / Verified:** Emerald (`#059669` text over `#D1FAE5` container).
- **Cancelled / Critical:** Crimson (`#DC2626` text over `#FEE2E2` container).

## Typography

The typography uses **Plus Jakarta Sans** uniformly across headlines, body, and labels. Its clean geometry and humanistic terminal stroke endings deliver optimal legibility for service details, pricing tables, and step-by-step booking forms without feeling austere.

### Hierarchy & Usage
- **Display & Large Headlines:** Reserved for marketing headers, primary service category introductions, and booking completion screens. Always rendered in Slate 900 (`#0F172A`).
- **Body Text:** Standardized on `body-md` (14px) for desktop data grids, booking summaries, and technician bios, utilizing Slate 700 (`#334155`). Use `body-lg` (16px) for instructional text and form prompts.
- **Labels & Microcopy:** Employs uppercase or tight tracking on `label-sm` and `label-md` for badges, status chips, pricing qualifiers, and helper captions.

## Layout & Spacing

This design system uses an 8pt layout rhythm combined with a 12-column responsive fluid grid capped at a maximum width of `1200px` for optimal desktop reading ergonomics.

### Responsive Breakpoints & Margins
- **Mobile (< 640px):** 4-column layout, `1rem` outer canvas margins, `1rem` gutters. Stacks service provider tiles, filters, and checkout summaries into a single vertical stream.
- **Tablet (640px – 1024px):** 8-column layout, `1.5rem` margins, `1.25rem` gutters. Supports side-by-side search filters and service listing displays.
- **Desktop (> 1024px):** 12-column layout, `2rem` margins, `1.5rem` gutters. Facilitates sticky sidebars for active carts, cost breakdowns, and scheduling calendars alongside main feeds.

### Spacing Guidelines
- Use `space-xs` (4px) and `space-sm` (8px) for internal pill padding, icon-to-label gaps, and inline metadata items.
- Use `space-md` (16px) for compact card interiors, stacked form inputs, and regular grid separations.
- Use `space-lg` (24px) for major card padding, table cell vertical rhythm, and modal borders.
- Use `space-xl` (40px) to divide unrelated service blocks, step-by-step flow panels, and section headings.

## Elevation & Depth

Visual hierarchy uses a hybrid of **tonal layering** and **soft ambient drop shadows** to ensure interface surfaces feel tactile yet light and clean. Harsh black drop shadows are strictly prohibited.

### Elevation Tiers
- **Tier 0 (Flat Canvas):** `#F8FAFC`. Used for global page background and unselected tab panels.
- **Tier 1 (Resting Cards & Surfaces):** `#FFFFFF` paired with an ultra-soft ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`, enclosed with a crisp hairline border (`1px solid #E2E8F0`).
- **Tier 2 (Interactive Hover / Selected Cards):** Lifted state for hoverable service items, pricing tiers, and active technician profiles: `0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.03)` with border shifting to `#CBD5E1`.
- **Tier 3 (Modals, Sticky Bottom Sheets, Dropdowns):** Floating overlays: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)` over a semi-transparent slate backdrop blur (`backdrop-filter: blur(4px); background-color: rgba(15, 23, 42, 0.4)`).

## Shapes

The shape architecture relies on friendly, noticeable curvature to signal approachable utility while preserving structural alignment.

### Radius Tokens
- **Base Elements (`rounded-md`, 8px):** Form fields, action buttons, table cell selections, and compact dropdowns.
- **Cards & Paneling (`rounded-xl`, 16px):** Standard service tiles, booking summary receipts, pricing breakdown cards, and sub-containers.
- **Hero Blocks & Modals (`rounded-2xl`, 24px):** Primary landing banners, booking wizard sheets, and promotional service highlight containers.
- **Status & Badges (`rounded-full`, 9999px):** Category pill tags, status indicators, avatar wrappers, and counter bubbles.

## Components

### Buttons
- **Primary CTA:** Background `#0D9488` (Teal 600), label `#FFFFFF`, semi-bold `label-lg`. Height `44px` (desktop) / `48px` (mobile). Hover state deepens to `#0F766E`. Focus state presents a `2px` ring in `#14B8A6` with a `2px` white offset.
- **Secondary Action:** Background `#FFFFFF`, border `1.5px solid #E2E8F0`, text `#0F172A`. Hover transitions background to `#F8FAFC` and border to `#CBD5E1`.
- **Destructive Action:** Background `#FEE2E2`, text `#DC2626`, hover state shifts to `#FCA5A5` text `#B91C1C`.

### Form Inputs & Selectors
- **Text & Date Fields:** White background, `1.5px solid #E2E8F0` border, `16px` horizontal padding, `12px` vertical padding, `8px` corner radius. Placeholder text in `#94A3B8`.
- **Focus State:** Border shifts cleanly to `#0D9488` accompanied by an ambient teal glow (`box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15)`).
- **Error State:** Border shifts to `#DC2626` with error text rendered in `body-sm` `#DC2626` directly below the field.

### Service & Provider Cards
- **Structure:** `#FFFFFF` background, `rounded-xl` (16px), `1px solid #E2E8F0` border, `space-lg` (24px) internal padding.
- **Layout:** Includes provider avatar or service category illustration, title in `headline-sm`, pricing in `headline-md` highlighted in `#0D9488`, verification badges, and a direct full-width or inline CTA button.

### Status Badges & Chips
- **Geometry:** `rounded-full` with `space-xs` (4px) vertical and `space-md` (12px) horizontal padding. Text set in `label-sm`.
- **Pending:** `#FEF3C7` background with `#B45309` text.
- **Accepted / Scheduled:** `#CCFBF1` background with `#0F766E` text.
- **Completed:** `#D1FAE5` background with `#047857` text.

### Checkboxes & Radio Controls
- **Geometry:** 20px box (`rounded` for checkboxes, `rounded-full` for radios).
- **Unchecked:** Border `1.5px solid #CBD5E1`, background `#FFFFFF`.
- **Checked:** Background `#0D9488`, border `#0D9488`, displaying a sharp white checkmark or center pip. Focus rings match the standard teal glow token.

### Service Category Filter Bar
- Horizontal scrollable or flex-wrap pill group.
- **Inactive:** `#FFFFFF` surface, `#64748B` label, `1px solid #E2E8F0`.
- **Active:** `#0F172A` surface, `#FFFFFF` label, border `#0F172A`.