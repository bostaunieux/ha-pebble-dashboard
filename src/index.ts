import "./cards/pebble-calendar-card";
import "./cards/pebble-clock-card";
import "./cards/pebble-weather-card";
import "./patched/hui-view-editor";
import "./patched/hui-card-element-editor";
import "./sections/pebble-grid-section";
import "./layouts/pebble-sections-layout";
import { version } from "../package.json";
import type { LovelaceElement } from "./types";

declare global {
  interface Window {
    customCards?: unknown[];
    loadCardHelpers?: () => Promise<{
      createCardElement: (config: unknown) => LovelaceElement;
    }>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "pebble-calendar-card",
  name: "Pebble Calendar Card",
  preview: true,
  description: "Big monthly quick glance calendar",
});

window.customCards.push({
  type: "pebble-clock-card",
  name: "Pebble Clock Card",
  preview: true,
  description: "Simple digital clock",
});

window.customCards.push({
  type: "pebble-weather-card",
  name: "Pebble Weather Card",
  preview: true,
  description: "Pebble Weather Card",
});

window.customCards.push({
  type: "pebble-stack-card",
  name: "Pebble Stack Card",
  preview: false,
  description: "Card to vertically stack other cards over a dynamic background image",
});

console.info(`🪨 %PEBBLE DASHBOARD ${version} is installed`, "color: orange; font-weight: bold");
