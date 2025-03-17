import { mdiPencil, mdiDrag } from "@mdi/js";
import { LitElement, PropertyValues, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { styleMap } from "lit/directives/style-map.js";
import { HomeAssistant, Lovelace, LovelaceSectionConfig, LovelaceView } from "../types";
import { StackSectionConfig } from "../sections/section-types";

type PebbleLayoutConfig = LovelaceView & {
  percentage?: number | null;
  sections?: StackSectionConfig[];
};

@customElement("pebble-sections-layout")
export default class PebbleSectionsLayout extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ type: Number }) public index!: number;

  @property({ attribute: false }) public sections: StackSectionConfig[] = [];

  @state() private _config?: PebbleLayoutConfig;

  @state() private _percentage: number | null = null;

  @query(".container") private _container?: HTMLDivElement;

  @query(".section-0") private _primarySection?: HTMLDivElement;

  private _sectionConfigKeys: WeakMap<StackSectionConfig, string> = new WeakMap();

  private _dragging: boolean = false;

  constructor() {
    super();

    this._config = {};
  }

  setConfig(config: PebbleLayoutConfig) {
    this._config = config;
  }

  firstUpdated(_changedProperties: PropertyValues) {
    if (!this._config?.sections) {
      const view = {
        ...this.lovelace.config.views[this.index],
        sections: [
          {
            type: "custom:pebble-grid-section",
            columns: 1,
            cards: [],
          },
          {
            type: "custom:pebble-grid-section",
            columns: 1,
            cards: [],
          },
        ],
      } as StackSectionConfig;
      const updatedViews = [...this.lovelace.config.views];
      updatedViews.splice(this.index, 1, view);
      this.lovelace.saveConfig({
        ...this.lovelace.config,
        views: updatedViews,
      });
      this._config = view;
    }
  }

  connectedCallback() {
    super.connectedCallback();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }

  _getKey(sectionConfig: StackSectionConfig) {
    if (!this._sectionConfigKeys.has(sectionConfig)) {
      this._sectionConfigKeys.set(sectionConfig, Math.random().toString());
    }
    return this._sectionConfigKeys.get(sectionConfig);
  }

  render() {
    if (!this.lovelace) {
      return nothing;
    }

    const sectionsConfig = this._config?.sections ?? [];
    const editMode = this.lovelace.editMode;
    const percentage = this._percentage ?? this._config?.percentage;

    return html`
      <ha-sortable
        .disabled=${!editMode}
        @item-moved=${this._sectionMoved}
        group="section"
        handle-selector=".handle"
        draggable-selector=".section"
        .rollback=${false}
      >
        <div
          class=${`container ${editMode ? "edit-mode" : ""}`}
          style=${styleMap({
            "--section-count": 2,
            "--first-col-width": percentage ? percentage + "%" : undefined,
          })}
          @mousemove=${this._onDrag}
          @mouseup=${this._onDragEnd}
        >
          ${repeat(
            sectionsConfig,
            (sectionConfig) => this._getKey(sectionConfig),
            (_sectionConfig, idx) => {
              const section = this.sections[idx];
              // section.itemPath = [idx];
              return html`
                <div class=${`section section-${idx}`}>
                  ${editMode
                    ? html`
                        <div class="section-overlay">
                          <div class="section-actions">
                            <ha-svg-icon
                              aria-hidden="true"
                              class="handle"
                              .path=${mdiDrag}
                            ></ha-svg-icon>
                            <ha-icon-button
                              .label=${this.hass.localize("ui.common.edit")}
                              @click=${this._editSection}
                              .index=${idx}
                              .path=${mdiPencil}
                            ></ha-icon-button>
                          </div>
                        </div>
                      `
                    : nothing}
                  <div class="section-wrapper">${section}</div>
                  ${editMode && idx === 0
                    ? html`<div class="resize-bar">
                        <span>${percentage ? percentage + "%" : ""}</span>
                        <ha-icon-button
                          @mousedown=${this._onDragStart}
                          .path=${mdiDrag}
                        ></ha-icon-button>
                      </div>`
                    : nothing}
                </div>
              `;
            },
          )}
        </div>
      </ha-sortable>
    `;
  }

  async _editSection(ev: CustomEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const index = (ev.currentTarget as any).index;
    const sections = [...(this.lovelace.config.views[this.index].sections ?? [])];
    const section = sections[index];

    if (!section) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("show-dialog", {
        composed: true,
        detail: {
          dialogTag: "pebble-grid-section-dialog",
          dialogImport: () => {
            return import("../sections/pebble-grid-section-dialog");
          },
          dialogParams: {
            prompt: true,
            section,
            cancel: () => {},
            submit: (updatedSection: LovelaceSectionConfig) => {
              sections[index] = updatedSection;
              this._saveConfig(sections);
            },
          },
        },
      }),
    );
  }

  _sectionMoved(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const sections = [...(this.lovelace.config.views[this.index].sections ?? [])];
    const section = sections.splice(oldIndex, 1)[0];
    sections.splice(newIndex, 0, section);

    this._saveConfig(sections);
  }

  _saveConfig(sections: LovelaceSectionConfig[]) {
    const views = this.lovelace.config.views.map((view, index) => {
      if (index !== this.index) {
        return view;
      }
      return {
        ...view,
        sections,
      };
    });
    this.lovelace.saveConfig({
      ...this.lovelace.config,
      views,
    });
  }

  _onDragStart(_ev: Event) {
    this._dragging = true;
    this._percentage = null;
  }

  _onDragEnd = (_ev: Event) => {
    this._dragging = false;

    if (this._percentage && this._config!.percentage !== this._percentage) {
      const views = this.lovelace.config.views.map((view, index) => {
        if (index !== this.index) {
          return view;
        }
        return {
          ...view,
          percentage: this._percentage,
        };
      });
      this.lovelace.saveConfig({
        ...this.lovelace.config,
        views,
      });
    }
  };

  _onDrag(ev: DragEvent) {
    if (!this._dragging || !this._container || !this._primarySection) {
      return;
    }

    const container = this._container;
    const section = this._primarySection;

    const percentage = Math.round(
      100 * ((ev.clientX - section.getBoundingClientRect().left) / container.clientWidth),
    );

    this._percentage = percentage;
  }

  static get styles() {
    return css`
      :host {
        --grid-gap: 4px;
        --grid-max-section-count: 2;
        --grid-section-min-width: 320px;
        --grid-section-max-width: 80vw;
        --resize-grip-width: 16px;

        //    --header-height: 0px; /* TODO: Should this be removed altogether? */

        display: block;
      }

      .container > * {
        position: relative;
        max-width: var(--grid-section-max-width);
        width: 100%;
      }

      .section {
        border-radius: var(--ha-card-border-radius, 12px);
        height: 100%;
      }

      .container {
        --max-count: min(var(--section-count), var(--grid-max-section-count));
        --max-width: min(
          calc(
            (var(--max-count) + 1) * var(--grid-section-min-width) + (var(--max-count) + 2) *
              var(--grid-gap) - 1px
          ),
          calc(
            var(--max-count) * var(--grid-section-max-width) + (var(--max-count) + 1) *
              var(--grid-gap)
          )
        );
        display: grid;
        align-items: start;
        justify-items: center;
        grid-template-columns: var(--first-col-width, 30%) auto;
        grid-gap: 8px var(--grid-gap);
        box-sizing: border-box;
        /* max-width: var(--max-width); */
        margin: 0 auto;
        height: calc(100vh - var(--header-height, 0));
        overflow-y: hidden;
      }

      .container.edit-mode {
        overflow-y: auto;
        grid-template-columns: var(--first-col-width, 500px) auto;
        grid-gap: calc(8 * var(--grid-gap));
      }

      @media (max-width: 600px) {
        .container {
          --grid-gap: 8px;
        }
      }

      .section-actions {
        position: absolute;
        top: 4px;
        right: 0;
        inset-inline-end: 0;
        inset-inline-start: initial;
        opacity: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease-in-out;
        background-color: rgba(var(--rgb-card-background-color), 0.3);
        border-top-left-radius: 18px;
        border-top-right-radius: 18px;
        background: var(--secondary-background-color);
        --mdc-icon-button-size: 36px;
        --mdc-icon-size: 20px;
        color: var(--primary-text-color);
        z-index: 2;
      }

      .handle {
        cursor: grab;
        padding: 8px;
      }

      .resize-bar {
        width: var(--resize-grip-width);
        max-width: var(--resize-grip-width);
        height: min(100%, 100vh);
        /* cursor: col-resize; */
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        position: absolute;
        right: calc(-6 * var(--grid-gap));
        top: 0;
      }

      /* .section-wrapper {
        height: 100%;
      } */

      .edit-mode .section-wrapper {
        margin-top: 40px;
        /* border-radius: var(--ha-card-border-radius, 12px);
        border-top-right-radius: 0;
        border: 2px dashed var(--divider-color); */
      }

      .sortable-ghost {
        border-radius: var(--ha-card-border-radius, 12px);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-sections-layout": PebbleSectionsLayout;
  }
}
