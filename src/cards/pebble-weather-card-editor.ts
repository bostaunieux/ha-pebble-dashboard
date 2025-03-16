import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";
import { mdiWeatherHurricane, mdiWeatherSunny } from "@mdi/js";
import initLocalize, { LocalizationKey } from "../localize";
import {
  supportsFeature,
  ForecastFeatures,
  getDefaultForecastType,
  getFeatureFromForecastType,
} from "../utils/weather-utils";
import { WeatherCardConfig } from "./weather-types";
import { getCardTextOptionsSchema } from "./card-options";

const computeLabel = (s: { label?: string }) => s.label;

@customElement("pebble-weather-card-editor")
class PebbleWeatherCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config: WeatherCardConfig;

  private localize: (key: LocalizationKey) => string;

  constructor() {
    super();
    this.config = {
      type: "custom:pebble-weather-card",
      entity: "",
      forecast_type: "hourly",
      hide_today: false,
      hide_forecast: false,
      forecast_count: 4,
    };
    this.localize = initLocalize(this.hass);
  }

  setConfig(config: WeatherCardConfig) {
    config = { ...this.config, ...config };
    const weather = this.hass?.states?.[config.entity];

    const forecastFeature = getFeatureFromForecastType(config.forecast_type);

    if (weather && forecastFeature != 0 && !supportsFeature(weather, forecastFeature)) {
      config = {
        ...config,
        forecast_type: getDefaultForecastType(weather) ?? undefined,
      };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config } }));
    }

    this.config = config;
  }

  _getSchema(weather: HassEntity | null) {
    const forecastOptions = [
      supportsFeature(weather, ForecastFeatures.HOURLY)
        ? {
            label: this.localize("weather.editor.form.forecast.forecast-type.option.hourly"),
            value: "hourly",
          }
        : null,
      supportsFeature(weather, ForecastFeatures.DAILY)
        ? {
            label: this.localize("weather.editor.form.forecast.forecast-type.option.daily"),
            value: "daily",
          }
        : null,
      supportsFeature(weather, ForecastFeatures.TWICE_DAILY)
        ? {
            label: this.localize("weather.editor.form.forecast.forecast-type.option.twice-daily"),
            value: "twice_daily",
          }
        : null,
    ].filter(Boolean);

    return [
      {
        label: this.localize("weather.editor.form.weather-entity.label"),
        name: "entity",
        selector: { entity: { filter: [{ domain: "weather" }] } },
      },

      {
        name: "",
        type: "expandable",
        iconPath: mdiWeatherSunny,
        title: this.localize("weather.editor.form.current-conditions.title"),
        schema: [
          {
            label: this.localize("weather.editor.form.hide-today.label"),
            name: "hide_today",
            selector: { boolean: {} },
            disabled: !this.config.hide_today && this.config.hide_forecast,
          },
          {
            name: "",
            type: "grid",
            schema: [
              ...(this.config.hide_today
                ? []
                : [
                    {
                      label: this.localize("weather.editor.form.today.secondary.label"),
                      name: "today_secondary",
                      selector: {
                        select: {
                          multiple: true,
                          options: [
                            {
                              label: this.localize(
                                "weather.editor.form.today.secondary.option.sun",
                              ),
                              value: "sun",
                            },
                            {
                              label: this.localize(
                                "weather.editor.form.today.secondary.option.wind",
                              ),
                              value: "wind",
                            },
                          ],
                        },
                      },
                    },

                    {
                      label: this.localize("weather.editor.form.today.description-inline.label"),
                      name: "today_description_inline",
                      selector: { boolean: {} },
                    },
                  ]),
            ],
          },
        ],
      },
      {
        name: "",
        type: "expandable",
        iconPath: mdiWeatherHurricane,
        title: this.localize("weather.editor.form.forecast.title"),
        schema: [
          {
            label: this.localize("weather.editor.form.forecast.hide-forecast.label"),
            name: "hide_forecast",
            selector: { boolean: {} },
            disabled: !this.config.hide_forecast && this.config.hide_today,
          },
          {
            name: "",
            type: "grid",
            schema: [
              ...(this.config.hide_forecast
                ? []
                : [
                    {
                      label: this.localize("weather.editor.form.forecast.forecast-type.label"),
                      name: "forecast_type",
                      selector: {
                        select: {
                          options: forecastOptions,
                        },
                      },
                    },
                    {
                      label: this.localize("weather.editor.form.forecast.forecast-count.label"),
                      name: "forecast_count",
                      selector: { number: { mode: "box", min: 1 } },
                    },
                  ]),
            ],
          },
        ],
      },
      getCardTextOptionsSchema(this.localize),
    ];
  }

  _onChange(ev: CustomEvent) {
    if (!this.config) return;

    this.config = ev.detail.value;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.config } }));
  }

  render() {
    if (!this.hass || !this.config) {
      return nothing;
    }

    const weather = this.hass.states?.[this.config.entity] ?? null;

    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${this.config}
          .schema=${this._getSchema(weather)}
          .computeLabel=${computeLabel}
          @value-changed=${this._onChange}
        ></ha-form>
      </div>
    `;
  }

  static get styles() {
    return [css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-weather-card-editor": PebbleWeatherCardEditor;
  }
}
