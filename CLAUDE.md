# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pebble Dashboard** is a custom Home Assistant dashboard and card collection. It provides:
- Custom dashboard layout (Pebble Sections) with two-column responsive design and dynamic background images
- Custom cards: Clock, Calendar, Weather, Countdown
- Full UI configurability for all components
- Support for various background image sources (local media, Picsum, entity-based, remote URLs)

This is a **Home Assistant custom component** distributed via HACS (Home Assistant Community Store). The code is bundled into a single JavaScript file (`pebble-dashboard.js`) and loaded as a custom element in Home Assistant's frontend.

## Technology Stack

- **Framework**: Lit 3 (Web Components library)
- **Language**: TypeScript 5.4+
- **Build**: Rollup 4 with TypeScript plugin, Lit compiler for template precompilation
- **Testing**: Jest 30 with ts-jest
- **Code Quality**: ESLint 9 with TypeScript, Lit, Web Components, and accessibility plugins; Prettier 3 for formatting
- **Runtime**: Node 20.19.0 or higher

## Common Commands

### Development
- `npm start` — Start dev server with file watching on port 4000. Server auto-reloads on file changes.
- `npm run build` — Build production bundle to `dist/pebble-dashboard.js` with minification

### Testing & Linting
- `npm test` — Run Jest tests (looks for `**/__tests__/**/*.test.ts`)
- `npm run test:watch` — Run Jest in watch mode
- `npm run format` — Format all files with Prettier (100 character line width)

### Home Assistant Development
- `npm run start:hass` — Spin up a Docker-based Home Assistant dev instance on port 8123
- Development config is in `.hass_dev/` (includes demo automation, climate/light/climate packages for testing)

## Architecture & Code Organization

### Directory Structure

```
src/
├── index.ts                 # Entry point: registers all custom elements globally
├── types.ts                 # Shared TypeScript types (HomeAssistant, LovelaceElement, etc.)
├── cards/                   # Custom card implementations
│   ├── pebble-clock-card.ts           (+ editor)
│   ├── pebble-weather-card.ts         (+ editor)
│   ├── pebble-calendar-card.ts        (+ editor)
│   ├── pebble-countdown-card.ts       (+ editor)
│   ├── calendar-types.ts              # Calendar-specific config/types
│   ├── weather-types.ts               # Weather-specific config/types
│   └── card-options.ts                # Shared card option types
├── sections/                # Custom section/layout components
│   ├── pebble-grid-section.ts         # Main layout with 2-column responsive design
│   ├── pebble-grid-section-dialog.ts  # Configuration UI for sections
│   ├── pebble-browse-media-dialog.ts  # Media browser for background image selection
│   └── section-types.ts               # Section config types
├── layouts/                 # Custom dashboard layout
│   └── pebble-sections-layout.ts      # Dashboard layout that uses grid sections
├── components/              # Shared Web Components
│   ├── color-picker.ts      # Color picker component
│   └── (other UI components)
├── utils/                   # Utility functions
│   ├── calendar-utils.ts    # Calendar event fetching, date calculations
│   ├── calendar-config-helpers.ts
│   ├── weather-utils.ts     # Weather formatting, units conversion
│   ├── icons.ts             # MDI icon utilities
│   └── (other utils)
├── media/                   # Media source adapters
│   ├── index.ts             # Registry of media sources
│   └── picsum-media.ts      # Picsum.photos integration
└── localization/            # i18n strings (per-language YAML)
```

### Component Pattern

**Cards** follow a consistent pattern with separate runtime and editor components:

```typescript
// pebble-clock-card.ts
@customElement("pebble-clock-card")
class PebbleClockCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config: ClockCardConfig;
  // ...
}

// pebble-clock-card-editor.ts
@customElement("pebble-clock-card-editor")
class PebbleClockCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config: ClockCardConfig;
  // ...
}
```

**Each card must:**
1. Extend `LitElement` and use `@customElement()` decorator
2. Accept `hass` (HomeAssistant instance) as a property
3. Store config in `@state()`
4. Have a corresponding editor with `-editor` suffix
5. Be imported in `src/index.ts` and registered with metadata

**Custom elements registered in `index.ts` must declare:**
- `type`: HTML element name (e.g., `"pebble-calendar-card"`)
- `name`: Human-readable name
- `description`: Brief description
- `preview`: Whether card shows in editor preview

### Key Types

- `HomeAssistant` — The Home Assistant API object (from `home-assistant-js-websocket`)
- `LovelaceElement` — Base interface for custom dashboard elements
- `HassEntity` — A single Home Assistant entity state/attributes
- Card config types are defined per card (e.g., `ClockCardConfig`, `WeatherCardConfig`) in their type files

### External Integrations

- **Home Assistant**: Communicates via WebSocket API (`home-assistant-js-websocket` library)
- **Calendar Events**: Fetched from Home Assistant entities via WebSocket
- **Weather Data**: Pulled from Home Assistant weather entities
- **Background Images**: Can come from local media (Home Assistant Media source), Picsum, entity values, or remote URLs
- **Icons**: MDI icons from `@mdi/js`

## Building & Bundling

**Rollup configuration** (`rollup.config.mjs`):
- Input: `src/index.ts`
- Output: `dist/pebble-dashboard.js` (ES module, tree-shaken, dynamic imports inlined)
- Plugins:
  - ESLint (lints during build)
  - TypeScript (compiles TS + runs Lit template precompilation via `@lit-labs/compiler`)
  - Node resolve + CommonJS (for npm dependencies)
  - Terser (minify, prod only)
  - Serve (dev server, dev only)
  - Summary (shows bundle size)

**Template Precompilation**: The Lit compiler precompiles `html\`...\`` template literals at build time to speed up initial render. This is experimental but safe to disable if issues arise.

## Testing

**Jest setup** (`jest.config.js`):
- Preset: `ts-jest` (handles TypeScript → JavaScript transformation)
- Environment: Node (not browser)
- Test discovery: `src/**/__tests__/**/*.test.ts`
- Coverage: Collects from `src/**/*.ts` (excluding type definitions and test files)

Tests typically import and test utilities, type transformations, and event handlers. To test components in a browser-like environment, use a DOM library or migrate to Vitest with jsdom/happy-dom.

## Code Quality

**ESLint** (`eslint.config.mts`):
- Plugins: `typescript-eslint`, `eslint-plugin-lit`, `eslint-plugin-lit-a11y`, `eslint-plugin-wc` (Web Components)
- Config: Recommended rules from all plugins + Prettier integration (no style conflicts)
- Notable rules:
  - `lit/no-template-map`: Off (template maps allowed)
  - Unused variables: Warn (allowed if prefixed with `_`)

**Prettier**: All code must be formatted to 100 character line width. Run `npm run format` before committing.

## Deployment & Releases

**GitHub Workflows:**
- `.github/workflows/build.yaml` — Runs on every PR and push (excluding version tags). Checks out, installs, and runs `npm run build`.
- `.github/workflows/validate.yaml` — Likely runs linting/tests (check workflow file for details).

**HACS Distribution**: Built JavaScript is released as a GitHub release. Users download `pebble-dashboard.js` and either:
- Add manually via Home Assistant UI as a JavaScript module resource at `/local/pebble-dashboard.js`, OR
- Install via HACS (which handles file management)

## Important Notes

- **Home Assistant Dependency**: This code runs in the Home Assistant frontend, so it has access to `window.customCards`, `window.loadCardHelpers`, etc. These are not Node.js APIs.
- **Custom Elements**: All Lit components must be registered with `customElements.define()` (via `@customElement` decorator) to be discoverable by Home Assistant.
- **Localization**: Translations are in YAML under `src/localization/`. The `localize()` function maps keys to translated strings.
- **Editor Pattern**: Card editors must follow Home Assistant's editor interface (emit `config-changed` events, etc.). See existing card editors for the pattern.
- **Media Source Integration**: Background images can be fetched from Home Assistant's Media source or external sources. Picsum and remote URL logic is in `src/media/`.
- **Responsive Design**: The Pebble grid section is designed for full-screen dashboard use with a resize bar between left/right columns. Sections inherit background images and styling.

