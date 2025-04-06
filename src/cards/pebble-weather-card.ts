import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { HassEntity } from "home-assistant-js-websocket";
import { mdiWater } from "@mdi/js";
import { isAfter, isBefore } from "date-fns";
import initLocalize, { LocalizationKey } from "../localize";
import { WiSunrise, WiSunset } from "../utils/icons";
import { supportsFeature, ForecastFeatures, getDefaultForecastType } from "../utils/weather-utils";
import "../components/pebble-weather-icon";
import "./pebble-weather-card-editor";
import { ForecastAttribute, ForecastEvent, WeatherCardConfig } from "./weather-types";
import { HomeAssistant } from "../types";

const RETRIES = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 60_000, 60_000];

@customElement("pebble-weather-card")
class PebbleWeatherCard extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;

  @state() private config: WeatherCardConfig;

  @state() private isNight: boolean;
  @state() private weather: HassEntity | null;
  @state() private forecastEvent?: ForecastEvent;

  private _retryCount: number;

  private _unsubscribe?: () => Promise<void>;

  private localize: (key: LocalizationKey) => string;

  constructor() {
    super();
    this.config = {
      type: "custom:pebble-weather-card",
      entity: "",
      hide_today: false,
      hide_forecast: false,
      forecast_type: "hourly",
      forecast_count: 4,
    };
    this.isNight = false;
    this.weather = null;
    this._retryCount = 0;
    this.localize = initLocalize(this._hass);
  }

  connectedCallback() {
    super.connectedCallback();
    this._subscribe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.();
  }

  set hass(hass: HomeAssistant) {
    this.weather = hass.states?.[this.config.entity];
    this.isNight = hass.states?.["sun.sun"]?.state === "below_horizon";

    this._hass = hass;
  }

  getCardSize() {
    let cardSize = 0;
    if (!this.config.hide_today) {
      cardSize += 2;
    }
    if (!this.config.hide_forecast) {
      cardSize += 3;
    }
    return cardSize;
  }

  static getConfigElement() {
    return document.createElement("pebble-weather-card-editor");
  }

  static getStubConfig(hass: HomeAssistant, entities: string[]) {
    const entity = entities.find((e) => e.startsWith("weather."));
    const weather = entity ? hass?.states?.[entity] : null;
    return entity && weather
      ? {
          entity: entity,
          forecast_type: getDefaultForecastType(weather),
        }
      : null;
  }

  setConfig(config: WeatherCardConfig) {
    this.config = config;

    if (config.hide_forecast && !this.config.hide_forecast) {
      this._unsubscribe?.();
    } else if (
      (!config.hide_forecast && this.config.hide_forecast) ||
      config.forecast_type !== this.config.forecast_type
    ) {
      this._subscribe();
    }
  }

  render() {
    const weather = this.weather;
    if (!weather) {
      return nothing;
    }

    const { forecast_type, forecast_count, today_description_inline } = this.config;
    const hourly = forecast_type === "hourly";
    const forecast = this.forecastEvent?.forecast?.slice(0, forecast_count ?? 4) ?? [];

    const sunset = this._hass.states?.["sun.sun"].attributes?.next_setting;
    const sunrise = this._hass.states?.["sun.sun"].attributes?.next_rising;

    const textSize = this.config.text_size;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
    };

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="weather">
          ${this.config.hide_today
            ? null
            : html` <div class="current">
                <div class="primary">
                  <div class="temp">${weather.attributes.temperature}°</div>
                  <div class="icon">
                    <pebble-weather-icon
                      .condition=${weather.state}
                      .isNight=${this.isNight}
                    ></pebble-weather-icon>
                  </div>
                  ${today_description_inline ? this._renderDescription(weather, true) : nothing}
                </div>
                <div>
                  ${weather.attributes.apparent_temperature
                    ? html` <div class="feels-like">
                        Feels ${weather.attributes.apparent_temperature}°
                      </div>`
                    : nothing}
                  <div class="secondary">${this._renderSun()} ${this._renderWind(weather)}</div>
                  ${!today_description_inline ? this._renderDescription(weather, false) : nothing}
                </div>
              </div>`}
          ${this.config.hide_forecast
            ? null
            : html` <div class="forecast-list">
                ${forecast.map((entry) => {
                  const isNight =
                    hourly &&
                    sunrise != null &&
                    sunset != null &&
                    ((this.isNight && isBefore(new Date(entry.datetime), new Date(sunrise))) ||
                      (!this.isNight && isAfter(new Date(entry.datetime), new Date(sunset))));
                  
                  return html`
                    <div class="forecast">
                      <div>${this._renderDateTime(entry.datetime, hourly)}</div>
                      <div class="forecast-icon">
                        <pebble-weather-icon
                          .condition=${entry.condition}
                          .isNight=${isNight}
                        ></pebble-weather-icon>
                      </div>
                      <div class="forecast-precip">${this._renderPrecipitation(entry)}</div>
                      <div class="forecast-temp">
                        ${!hourly && "templow" in entry
                          ? html`<span>${entry.templow}</span>`
                          : null}
                        <span>${entry.temperature}</span>
                      </div>
                    </div>
                  `;
                })}
              </div>`}
        </div>
      </ha-card>
    `;
  }

  _renderDescription(entity: HassEntity, inline: boolean) {
    const lang = this._hass.selectedLanguage || this._hass.language;
    const description =
      this._hass.resources[lang]?.[`component.weather.entity_component._.state.${entity.state}`];

    return description
      ? html`<div class="description ${inline ? "inline" : ""}">${description}</div>`
      : null;
  }

  _renderSun() {
    const sun = this._hass?.states?.["sun.sun"];
    if (!sun || !(this.config.today_secondary ?? []).includes("sun")) {
      return nothing;
    }

    const icon = this.isNight ? WiSunrise : WiSunset;
    const timestamp = this.isNight ? sun.attributes.next_rising : sun.attributes.next_setting;
    let date;
    try {
      date = new Date(Date.parse(timestamp));
    } catch (e) {
      console.info("Invalid sunrise/sunset date: ", e);
      return nothing;
    }

    const lang = this._hass.locale?.language ?? "en-US";
    const formatter = new Intl.DateTimeFormat(lang, {
      timeStyle: "short",
    });

    return html`
      <div class="sun">
        <pebble-weather-icon .path=${icon}></pebble-weather-icon>
        ${formatter.format(date)}
      </div>
    `;
  }

  _renderWind(entity: HassEntity) {
    if (!entity.attributes?.wind_speed || !(this.config.today_secondary ?? []).includes("wind")) {
      return nothing;
    }

    return html`
      <div class="wind">
        <pebble-weather-icon .condition=${"windy"}></pebble-weather-icon>
        ${Math.round(entity.attributes.wind_speed)} ${entity.attributes.wind_speed_unit}
      </div>
    `;
  }

  _getPrecipitationFormatter() {
    let unit;
    switch (this.weather?.attributes?.precipitation_unit) {
      case "in":
        unit = "inch";
        break;
      case "mm":
        unit = "millimeter";
        break;
      default:
        return null;
    }

    return new Intl.NumberFormat(this._hass.locale?.language ?? "en-US", {
      style: "unit",
      unit,
      unitDisplay: "narrow",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  _renderPrecipitation(forecast: ForecastAttribute) {
    if (!("precipitation_probability" in forecast)) {
      return nothing;
    }

    const formatter = "precipitation" in forecast ? this._getPrecipitationFormatter() : null;
    const precipitation = formatter
      ? html`<span>${formatter.format(forecast.precipitation!)}</span>`
      : nothing;

    return html`<pebble-weather-icon .path=${mdiWater}></pebble-weather-icon>
      <div class="precip-details">
        <span>${forecast.precipitation_probability ?? 0}%</span>
        ${precipitation}
      </div>`;
  }

  _renderDateTime(datetime: string, hourly: boolean) {
    let date;
    try {
      date = new Date(datetime);
    } catch (e) {
      console.info("Invalid forecase date: ", e);
      return nothing;
    }

    if (!hourly && date.getDate() === new Date().getDate()) {
      return this.localize("weather.card.forecast.today");
    }

    const options = hourly
      ? ({
          hour: "numeric",
        } as const)
      : ({
          weekday: "short",
        } as const);

    const formattedDateTime = new Intl.DateTimeFormat(
      this._hass.locale?.language ?? "en-US",
      options,
    ).format(date);

    return hourly ? formattedDateTime.toLocaleLowerCase() : formattedDateTime;
  }

  async _subscribe() {
    if (!this.isConnected || !this.config || !this._hass || this.config.hide_forecast) {
      return;
    }

    const { entity, forecast_type = "hourly" } = this.config;
    if (!entity) {
      return;
    }

    if (forecast_type === "hourly" && !supportsFeature(this.weather, ForecastFeatures.HOURLY)) {
      throw new Error(`Weather entity "${entity}" does not support hourly forecasts.`);
    }

    if (forecast_type === "daily" && !supportsFeature(this.weather, ForecastFeatures.DAILY)) {
      throw new Error(`Weather entity "${entity}" does not support daily forecasts.`);
    }

    this._unsubscribe?.();

    try {
      this._unsubscribe = await this._hass.connection.subscribeMessage<ForecastEvent>(
        (event) => {
          this.forecastEvent = event;
          this._retryCount = 0;
        },
        {
          type: "weather/subscribe_forecast",
          forecast_type,
          entity_id: entity,
        },
      );
    } catch (e) {
      console.error("pebble-weather-card: Error subscribing to weather forecast: ", e);
      const delay = RETRIES[this._retryCount];
      if (delay) {
        console.info("pebble-weather-card: Will retry, attempt after delay: ", delay);
        this._retryCount++;
        setTimeout(() => {
          this._subscribe();
        }, delay);
      } else {
        console.warn("pebble-weather-card: Hit max subscribe retry events, aborting.");
      }
    }
  }

  static get styles() {
    return css`
      :host {
        --mdc-icon-size: 100px;
      }

      ha-card {
        padding: 24px;
        filter: var(--pebble-card-filter, "none");
        font-size: var(--pebble-font-size, var(--card-primary-font-size, 16px));
      }

      .weather {
        display: grid;
        gap: 18px;
      }

      .current {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }

      .primary {
        display: flex;
        align-items: center;
        font-size: 4em;
        column-gap: 24px;
        row-gap: 0;
        overflow: hidden;
        max-height: var(--mdc-icon-size);
      }

      .secondary {
        --mdc-icon-size: 40px;
        font-size: 1.25em;
        display: flex;
        row-gap: 12px;
        column-gap: 18px;
        align-items: center;
        margin-bottom: 12px;
      }

      .description {
        font-size: 1.5em;
        line-height: 120%;
      }

      .description.inline {
        font-size: 0.5em;
      }

      .feels-like {
        font-size: 1.5em;
        line-height: 120%;
        margin-bottom: 12px;
      }

      .forecast-list {
        display: grid;
        grid-auto-columns: minmax(1fr, 150px);
        grid-auto-flow: column;
        justify-content: space-between;

        font-size: 1.5em;
        gap: 8px;
      }

      .forecast {
        display: grid;
        gap: 20px;
        justify-items: center;
      }

      .forecast-icon {
        --mdc-icon-size: 2.5em;
        margin: 4px 0;
      }

      .forecast-precip {
        --mdc-icon-size: 1em;
        font-size: 1.25rem;
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .precip-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: center;
      }

      .forecast-temp {
        display: flex;
        gap: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-weather-card": PebbleWeatherCard;
  }
}
