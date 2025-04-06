import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { mdiAlertCircleOutline } from "@mdi/js";

import {
  WiCloudy,
  WiDayCloudy,
  WiDayCloudyWindy,
  WiDaySunny,
  WiFog,
  WiHail,
  WiNightAltCloudy,
  WiNightAltCloudyWindy,
  WiNightAltRain,
  WiNightAltShowers,
  WiNightClear,
  WiRain,
  WiRainMix,
  WiShowers,
  WiSnow,
  WiStormShowers,
  WiStrongWind,
  WiThunderstorm,
} from "../utils/icons";

const WEATHER_ICONS: Record<string, string> = {
  "clear-night": WiNightClear,
  cloudy: WiCloudy,
  fog: WiFog,
  hail: WiHail,
  lightning: WiThunderstorm,
  "lightning-rainy": WiStormShowers,
  partlycloudy: WiDayCloudy,
  pouring: WiRain,
  rainy: WiShowers,
  snowy: WiSnow,
  "snowy-rainy": WiRainMix,
  sunny: WiDaySunny,
  windy: WiStrongWind,
  "windy-variant": WiDayCloudyWindy,
  exceptional: mdiAlertCircleOutline,
};

const NIGHT_WEATHER_ICONS: Record<string, string> = {
  ...WEATHER_ICONS,
  "clear-night": WiNightClear,
  partlycloudy: WiNightAltCloudy,
  pouring: WiNightAltRain,
  rainy: WiNightAltShowers,
  sunny: WiNightClear,
  "windy-variant": WiNightAltCloudyWindy,
};

@customElement("pebble-weather-icon")
class PebbleWeatherIcon extends LitElement {
  @property({ attribute: false }) public isNight?: boolean;
  @property({ attribute: false }) public condition?: string;
  @property({ attribute: false }) public path?: string;

  render() {
    let svgPath = this.path;

    if (this.condition && !svgPath) {
      svgPath = this.isNight ? NIGHT_WEATHER_ICONS[this.condition] : WEATHER_ICONS[this.condition];
    }

    if (!svgPath) {
      return nothing;
    }

    return html`
      <svg
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        role="img"
        aria-hidden="true"
        viewBox="0 0 30 30"
      >
        <g><path class="primary-path" d=${svgPath}></path></g>
      </svg>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: var(--ha-icon-display, inline-flex);
        align-items: center;
        justify-content: center;
        position: relative;
        vertical-align: middle;
        fill: var(--icon-primary-color, currentcolor);
        width: var(--mdc-icon-size, 24px);
        height: var(--mdc-icon-size, 24px);
      }

      svg {
        width: 100%;
        height: 100%;
        pointer-events: none;
        display: block;
        filter: drop-shadow(var(--pebble-text-shadow));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-weather-icon": PebbleWeatherIcon;
  }
}
