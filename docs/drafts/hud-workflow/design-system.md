---
name: "Mercenary Corps Siege — Cozy Parchment HUD"
description: "Warm, tactile parchment-and-sage mobile tower-defense HUD design system with strict battlefield clearance and thumb-first bottom controls."
---

## Overview

Mercenary Corps Siege uses a **Cozy Tactile Parchment** visual system built for one-handed portrait play (`544x960`) with a companion landscape layout (`1280x720`). Warm cream cards (`#fbf7ec`), recessed sand slots (`#f3ead2`), and sage-green primary actions (`#7a9a5c`) keep the interface legible and inviting without competing with the active battlefield.

The central design rule is **strict battlefield preservation**: the middle arena (`y: 272–688` in portrait) is reserved exclusively for the 5x5 castle wall and monster lanes. Persistent HUD, temporary wave banners, and toasts must stay strictly above `y: 272` or below `y: 688`, while high-frequency P1 actions (shop, estate level-up, reroll, speed toggle) sit in the bottom thumb zone.

## Colors

The palette pairs warm parchment neutrals with earthy sage (`primary`), burnished gold (`gold`) for economy and estate progression, and clear semantic signals (`red` for boss/debuffs/danger, `green` for healthy wall HP). All interactive text and `on-*` foregrounds are paired for WCAG AA (4.5:1+) legibility.

- **Surfaces & Borders:** `card` (`#fbf7ec`) serves as the primary floating card and bottom-sheet background; `soft` (`#f3ead2`) defines recessed slots, wells, and meter tracks; `line` (`#e3d6b6`) provides crisp 1px–1.5px structural borders.
- **Ink Hierarchy:** `ink` (`#4a3a28`) carries primary numerals, titles, and body copy; `sub` (`#8c7b60`) carries secondary wave summaries and helper text.
- **Actions & Status:** `primary` (`#7a9a5c`) and `primary-deep` (`#56743f`) drive main actions and tactile button lips; `gold` (`#e0a32a`) highlights the Estate level-up action and gold currency; `red` (`#c2453a`) signals boss waves, debuffs, and critical warnings; `green` (`#3f9a52`) indicates healthy wall HP.

```yaml
colors:
  card: "#fbf7ec"
  soft: "#f3ead2"
  line: "#e3d6b6"
  primary: "#7a9a5c"
  on-primary: "#0d2000"
  primary-deep: "#56743f"
  on-primary-deep: "#ffffff"
  ink: "#4a3a28"
  sub: "#8c7b60"
  gold: "#e0a32a"
  on-gold: "#271900"
  red: "#c2453a"
  on-red: "#ffffff"
  green: "#3f9a52"
  on-green: "#002108"
  surface: "#fbf7ec"
  on-surface: "#4a3a28"
  surface-container: "#f3ead2"
  on-surface-variant: "#8c7b60"
  outline: "#e3d6b6"
  outline-variant: "#8c7b60"
  error: "#c2453a"
  on-error: "#ffffff"
  primary-10: "#0d2000"
  primary-20: "#1d3704"
  primary-40: "#49672f"
  primary-80: "#afd18d"
  primary-95: "#d8fcb4"
  secondary-10: "#271900"
  secondary-90: "#ffdeab"
  secondary-95: "#ffeed9"
  neutral-90: "#e6e2d8"
  neutral-95: "#f4f1e6"
  error-90: "#ffdad5"
  error-95: "#ffedea"
```

## Typography

Typography uses **Sunflower** (Google Fonts, weights 300/500/700) for all HUD numerals, card titles, and buttons, with **Gowun Dodum** (고운돋움) as the companion fallback for symbols or glyphs outside Sunflower's set. Type sizes are tuned for dense mobile HUD scannability: `22px` for wave and gold P1 counters, `16.5px` for wall HP readouts, `15px` for mercenary names, `12px` for info lines and primary buttons, and `10px–11px` for compact badges and tool counts.

```yaml
typography:
  headline-lg:
    fontFamily: "Sunflower"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 26px
    letterSpacing: -0.2px
  headline-md:
    fontFamily: "Sunflower"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 22px
    letterSpacing: 0px
  title-lg:
    fontFamily: "Sunflower"
    fontSize: 16.5px
    fontWeight: 700
    lineHeight: 20px
    letterSpacing: 0px
  title-md:
    fontFamily: "Sunflower"
    fontSize: 15px
    fontWeight: 700
    lineHeight: 19px
    letterSpacing: 0px
  body-lg:
    fontFamily: "Gowun Dodum"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  body-md:
    fontFamily: "Gowun Dodum"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Gowun Dodum"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Sunflower"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 16px
    letterSpacing: 0.1px
  label-md:
    fontFamily: "Sunflower"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 14px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: "Sunflower"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 12px
    letterSpacing: 0.2px
```

## Layout & Spacing

The HUD uses a **Zone-Anchored Mobile Grid** (`544x960` portrait baseline) with a **Sacred Center Battlefield** (`y: 272–688`).

- **Top Zone (`y: 16–182`):** Status Card (`y: 16–136`, horizontal padding `20px`, 3 rows centered at `y: 44, 76, 112`), Synergy & Relic Strip (`y: 142–182`, horizontal padding `16px`, `9px` chip gap, `27x27px` relic slots), and temporary Wave/Boss Banners below the strip (never entering `y: 272`).
- **Bottom Zone (`y: 732–952`):** Temporary Toast strip above `y: 732`, Item Strip (`y: 732–772`, `26px` slots), and Bottom Sheet (`y: 776–952`, `8px` vertical padding, 6 equal shop cards with `6px` gap, and action row with `52x56px` utility buttons, `188x56px` Estate button, and `140x56px` Reroll button).
- **Touch Targets:** Interactive controls maintain a minimum `44px` hit area.
- **Landscape Adaptation (`1280x720`):** Status Card collapses into a top-center pill bar, Synergy chips stack vertically on the left with a `5x2` Item grid below them, and the Bottom Sheet becomes a compact bottom-center dock.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 6px
  gutter-md: 8px
  gutter-lg: 16px
  gutter-xl: 20px
  card-pad: 20px
  strip-pad: 16px
  sheet-pad: 8px
  touch-min: 44px
```

## Elevation & Depth

Visual hierarchy relies on **warm tonal layering and crisp 1px–1.5px borders** (`line: #e3d6b6`) rather than heavy blurred drop shadows, keeping the HUD clean over the active game canvas.

- **Cards & Sheets (`card`):** Framed with a `1px` `line` border and a subtle `0 2px 0 #e3d6b6` bottom lip so panels read as physical parchment tiles.
- **Recessed Wells (`soft`):** Item slots, relic slots, synergy tracks, and HP bar tracks sit inset using `#f3ead2` with a `1px` `line` inner border.
- **Tactile Buttons:** Primary and economy buttons (`primary`, `gold`) use a solid `3px` bottom lip (`primary-deep: #56743f` or darkened gold `#b57f17`) that compresses by `2px` on active press.

## Shapes

The system uses a **Cozy Rounded** (`cozyKey`) shape language. Outer cards and the bottom sheet use `16px` corners, shop cards and action buttons use `12px`, compact slots (relics, items) use `6px–8px`, and timer/synergy pills use `full` (`9999px`).

```yaml
rounded:
  xs: 6px
  sm: 8px
  DEFAULT: 12px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
```

## Motion & Micro-interaction

Motion is crisp, tactile, and strictly bounded so it never distracts from combat on the battlefield:

- **Button & Toggle Feedback (`state-change`):** `100ms` ease-out press compression and lock/speed state transitions.
- **Banner & Toast Entry (`surface-enter`):** `220ms` decelerating slide/fade strictly within the top or bottom notification strips.
- **Banner & Toast Exit (`surface-exit`):** `150ms` accelerating fade-out.
- **Sheet Mode Swap (`sheet-swap`):** `200ms` ease-out cross-fade when switching the bottom sheet between the 6-card Shop and a selected Mercenary detail card.

```yaml
motion:
  state-change:
    duration: 100ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 220ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
  sheet-swap:
    duration: 200ms
    delay: 0ms
    timingFunction: ease-out
```

## Voice & Content Strategy

- **Tone:** Concise, immediate, and scannable — built for mid-wave glances during combat.
- **Terminology:** Consistent Korean game terms matching the HUD spec (`WAVE n`, `다음 n초`, `바로 시작`, `영지 Lv.n`, `레벨 업`, `리롤`, `제작`, `해제 도구`, `판매`).
- **Button Grammar:** Action + cost inline where applicable (`제작 30G`, `리롤 20G`, `레벨 업 20G`, `판매 +8G`).
- **Truncation & Units:** Single-line summaries truncate with an ellipsis (`…`). Always pair numbers with compact units (`1,250 G`, `62 / 80`, `x1`, `0/3명`, `W30`).

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Button** → `@components/button.html`: `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html`: `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Chip** → `@components/chip.html`: `chip-action`, `chip-input`, `chip-with-icon`
- **Toast** → `@components/toast.html`: `toast-success`
- **Typography** → `@components/typography.html`: `typography-display`, `typography-body`, `typography-label`
