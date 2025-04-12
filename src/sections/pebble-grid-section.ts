import { css, html, LitElement, type CSSResultGroup, type PropertyValues, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { customElement, property, state, query } from "lit/decorators.js";
import { getAverageBackgroundColor, isDark } from "../utils/colors";
import type { HomeAssistant, Lovelace } from "../types";
import type { StackSectionConfig } from "./section-types";
import { getPhotoFromConfig } from "../media";
import debounce from "../utils/debounce";
import { getTimeUntilNextInterval } from "../utils/calendar-utils";

const DEFAULT_PHOTO_UPDATE_INTERVAL_MS = 1_000 * 60 * 60;

customElements.whenDefined("hui-grid-section").then(() => {
  const HuiGridSection = customElements.get("hui-grid-section") as typeof LitElement & {
    new (): LitElement;
  };
  if (!HuiGridSection) {
    return;
  }
  @customElement("pebble-grid-section")
  class _PebbleGridSection extends HuiGridSection {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @property({ attribute: false }) public lovelace?: Lovelace;

    @state() private _config?: StackSectionConfig;

    @state() private _altBackground?: string;

    @state() private _mainBackground?: string;

    @state() private _isMainActive = true;

    @state() private _isDarkBackground = true;

    @query(".pebble-container") private _containerNode!: HTMLDivElement;

    /** For entity photo source, the URL of the photo */
    private _photoEntityUrl?: string;

    private _intervalId?: NodeJS.Timeout;

    connectedCallback() {
      super.connectedCallback();

      this._updateBackgroundImage();
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      clearInterval(this._intervalId);
    }

    updated(changedProps: PropertyValues) {
      super.updated(changedProps);

      if (
        changedProps.has("hass") &&
        this._config?.photo_source === "entity" &&
        this._config?.photo_config?.entity?.entity_id
      ) {
        const newPhotoUrl =
          changedProps.get("hass")?.states?.[this._config.photo_config.entity.entity_id]?.state;
        const oldPhotoUrl = this._photoEntityUrl;
        if (newPhotoUrl && oldPhotoUrl !== newPhotoUrl) {
          this._photoEntityUrl = newPhotoUrl;
          this._updateBackgroundImage();
        }
      }
    }

    async setConfig(config: StackSectionConfig) {
      // @ts-expect-error Inherited from hui-grid-section
      super.setConfig(config);

      // entity-based photo source will update automatically, so we don't need to poll
      if (config.photo_source != null && config.photo_source !== "entity") {
        const delay = getTimeUntilNextInterval(
          config.photo_config?.refresh_interval ?? DEFAULT_PHOTO_UPDATE_INTERVAL_MS,
        );
        console.log("delay", delay);
        this._intervalId = setInterval(() => {
          this._updateBackgroundImage();
        }, delay);
      } else {
        clearInterval(this._intervalId);
      }
    }

    render() {
      if (!this._config || !this.hass) {
        return nothing;
      }
      const horizontalAlign = this._config?.horizontal_align;
      const verticalAlign = this._config?.vertical_align;
      const editMode = this.lovelace?.editMode ?? false;

      const rootStyles: Record<string, string | undefined> = {
        "--main-background": this._mainBackground ? `url(${this._mainBackground})` : "#000",
        "--alt-background": this._altBackground ? `url(${this._altBackground})` : "#000",
        "--primary-text-color": this._isDarkBackground || editMode ? "#e1e1e1" : "#212121",
        "--paper-item-icon-color": "var(--primary-text-color)",
        "--pebble-bg-blur": this._config?.bg_blur ? `${this._config?.bg_blur}px` : undefined,
      };

      if (this._config?.border_radius != null) {
        rootStyles["--pebble-card-border-radius"] = `${this._config.border_radius}px`;
        rootStyles["--ha-card-border-width"] = "1px";
      }

      const cardsClasses = classMap({
        cards: true,
        "halign-start": horizontalAlign === "start",
        "halign-center": horizontalAlign === "center",
        "halign-end": horizontalAlign === "end",
        "valign-start": verticalAlign === "start",
        "valign-center": verticalAlign === "center",
        "valign-end": verticalAlign === "end",
        "valign-between": verticalAlign === "between",
        "valign-around": verticalAlign === "around",
      });
      return html`<div
        class=${classMap({
          "pebble-container": true,
          "edit-mode": editMode,
          "main-bg": this._isMainActive,
          light: !this._isDarkBackground,
          "has-bg": this._mainBackground != null || this._altBackground != null,
        })}
        style=${styleMap(rootStyles)}
      >
        <div class="bg">
          <div class=${cardsClasses}>${super.render()}</div>
        </div>
      </div>`;
    }

    async _updateBackgroundImage() {
      if (!this._config) {
        return;
      }

      const image = await getPhotoFromConfig(this._config, this.hass);
      if (image) {
        this._setBackground(image);
      }
    }

    _setBackground = debounce((image: string) => {
      if (this._isMainActive) {
        this._altBackground = image;
      } else {
        this._mainBackground = image;
      }
      // delay the switch to allow the new image to load in the background
      setTimeout(async () => {
        this._isMainActive = !this._isMainActive;

        const container = this._containerNode;
        const image = this._isMainActive ? this._mainBackground : this._altBackground;
        if (!container || !image) {
          return;
        }

        const color = await getAverageBackgroundColor(container, container, image);
        this._isDarkBackground = isDark(color);
      }, 1_500);
    }, 1_000);

    static get styles(): CSSResultGroup[] {
      return [
        super.styles ?? [],
        css`
          :host {
            --grid-row-height: 66px;
            --paper-item-icon-color: var(--primary-text-color);
            --pebble-background-mask: linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8));
            --pebble-dark-shadow: rgba(0, 0, 0, 0.3) 1.5px 1.5px 0px;
            --pebble-light-shadow: rgba(255, 255, 255, 0.3) 1.5px 1.5px 0px;
            --ha-card-border-width: 0px;

            --original-ha-card-border-radius: var(--ha-card-border-radius, 12px);
            --ha-card-border-radius: var(--pebble-card-border-radius, 12px);
          }

          .pebble-container {
            --pebble-text-shadow: var(--pebble-dark-shadow);

            position: relative;
            height: 100%;
            padding: 0;

            box-shadow: var(--ha-card-box-shadow, none);
            box-sizing: border-box;
            border-radius: var(--ha-card-border-radius, 12px);
            border-width: var(--ha-card-border-width, 1px);
            border-style: solid;
            border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
          }

          .pebble-container.light {
            --pebble-text-shadow: var(--pebble-light-shadow);
          }
          .cards {
            height: calc(100vh - var(--header-height));
          }

          .cards .container {
            display: grid;
            gap: 16px;
            align-content: space-between;
            height: min(100%, calc(100vh - var(--header-height)));

            backdrop-filter: blur(var(--pebble-bg-blur));
          }

          .edit-mode .cards .container {
            align-content: start;
          }

          .cards.halign-start .container {
            justify-content: start;
          }

          .cards.halign-center .container {
            justify-content: center;
          }

          .cards.halign-end .container {
            justify-content: end;
          }

          .cards.valign-start .container {
            align-content: start;
          }

          .cards.valign-center .container {
            align-content: center;
          }

          .cards.valign-end .container {
            align-content: end;
          }

          .cards.valign-around .container {
            align-content: space-around;
          }

          .cards.valign-between .container {
            align-content: space-between;
          }

          .cards .container > :not(.add) {
            margin: var(--vertical-stack-card-margin, var(--stack-card-margin, 4px 0));

            --ha-card-background: transparent;
            --ha-card-border-radius: 0;
            --ha-card-border-width: 0;
          }

          .has-bg .cards .container > :not(.add) {
            text-shadow: var(--pebble-text-shadow);
          }

          .edit-mode .add {
            border-radius: var(--original-ha-card-border-radius, 12px);
          }

          .bg {
            position: relative;
            height: 100%;
            z-index: 1;
            background: no-repeat center/cover var(--main-background);
          }

          .edit-mode .bg {
            background-image: var(--pebble-background-mask), var(--main-background);
          }

          .bg::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: no-repeat center/cover var(--alt-background);
            opacity: 1;
            transition: opacity 1s;
            z-index: -1;
          }

          .bg,
          .bg::before {
            box-shadow: inset 0 0 0 50vmin rgba(0, 0, 0, 0.2);
          }

          .edit-mode .bg::before {
            background-image: var(--pebble-background-mask), var(--alt-background);
          }

          .main-bg .bg::before {
            opacity: 0;
          }

          .card {
            position: relative;
          }
        `,
      ];
    }
  }
});
