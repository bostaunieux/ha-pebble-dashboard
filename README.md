# Pebble Dashboard

Customizable dashboard for Home Assistant

![Dashboard Screenshot](./static/pebble-dashboard-screenshot.webp)

Included cards

- Clock Card
- Weather Card
- Calendar Card

Additional features

- Dynamic background images behind sections
- Resizable dual section layout
- All cards are configurable via the UI
- Designed for use on a full screen dashboard

## Installation

### HACS

This plugin is available in HACS (Home Assistant Community Store)

1. Open HACS within your Home Assistant instance
2. Select the More Options menu (top right icon) and open "Custom repositories"
3. Add this repository:
   - Repository: https://github.com/bostaunieux/ha-pebble-dashboard
   - Type: Dashboard
4. Close the dialog and search for "Pebble Dashboard"
5. Click the Download button

### Manual

1. Download the `pebble-dashboard.js` file from the [latest release](https://github.com/bostaunieux/ha-pebble-dashboard/releases)
2. Copy the `pebble-dashboard.js` file into your config/www folder
3. Add the script as a resource in your Home Assistant instance
   1. From the UI, navigate to Settings > Dashboards > More Options (top right icon) > Resources > Add Resource
   2. Add the resource:
      - Url: `/local/pebble-dashboard.js`
      - Resource type: JavaScript Module
   - Note: If the Resources menu is not available, verify you have enabled Advanced Mode in your User Profile

## Configuration

### Dashboard

When creating a new dashboard, select the `Pebble Sections (pebble-dashboard)` layout type. Once created, the setup will resemble that of the `Sections` layout type, with the following changes

- Only two sections can exist - these can not be deleted from the UI
- In edit mode, a resize bar allows selecting the relative width of the left section
- The two sections will extend the full height of the browser viewport
- The edit menu for each section allows setting an image source to use as a background behind all cards

Section background images can be configured to pull from the following sources

- None - Don't set a background image
- Local Media - Source images from a local media directory containing photos. This depends on the [Media source](https://www.home-assistant.io/integrations/media_source/) integration being enabled. This is enabled by default when using [Default Config](https://www.home-assistant.io/integrations/default_config/).
- Picsum - Sources images from https://picsum.photos/.
- Entity - Sources the image from a sensor or image entity within Home Assistant. This allows setting up automations to update the image on a schedule, sourcing it from public APIs or other integrations. More details to come...
- Photo URLs - Manually curate a list of image URLS accessible on the Internet

### Cards

Cards can be used on any type of dashboard, but are designed for use with Pebble Dashboard. Add them to existing dashboards using the standard add card flow.

All cards are configurable via the UI

#### Clock Card

![Clock Card Config](./static/pebble-clock-card-editor.webp)

#### Weather Card

![Weather Card Config](./static/pebble-weather-card-editor.webp)

#### Calendar Card

Note the "Consolidate multi-day events" option is experimantal and only works in modern browsers (from 2023+)

![Weather Card Config](./static/pebble-calendar-card-editor.webp)

## Disclaimer

The pebble layout extends the built-in grid sections layout. As Home Assistant evolves, there is a risk these changes may conflict and prevent this layout from being fully functional. My intent is to keep this up to date with current versions of Home Assistant, but there may be lag time in applying fixes.
