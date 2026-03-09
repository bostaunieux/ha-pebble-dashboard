import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { mdiPlus, mdiDrag, mdiClose } from "@mdi/js";
import initLocalize from "../localize";
import type { HomeAssistant } from "../types";
import type {
  PhotoSource,
  StackSectionDialogParams,
  StackSectionConfig,
  MediaPlayerItem,
} from "./section-types";

const TABS = ["tab-settings", "tab-visibility"] as const;
const computeLabel = (s: { label?: string }) => s.label;

@customElement("pebble-grid-section-dialog")
export default class PebbleGridSectionDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  /* Keep a separate copy of the remote photo list so an id can be stored alongside photo urls for use with sorting */
  @state() private _remotePhotos?: { id: number; photo: string }[] = [];

  @state() private _section?: StackSectionConfig;

  @query(".add-remote-input") private _addRemotePhotoInputNode?: HTMLInputElement;

  @state() private _currTab: (typeof TABS)[number] = TABS[0];

  private _params?: StackSectionDialogParams;

  private get localize() {
    return initLocalize(this.hass);
  }

  async showDialog(params: StackSectionDialogParams) {
    this._error = undefined;

    this._section = JSON.parse(JSON.stringify(params.section));

    this._remotePhotos = (params.section.photo_config?.remote?.photos ?? []).map((photo) => ({
      id: Math.random(),
      photo,
    }));

    this._params = params;
  }

  closeDialog() {
    if (!this._section) {
      return;
    }
    this._error = undefined;
    this._section = undefined;

    this.dispatchEvent(new CustomEvent("dialog-closed", { detail: { dialog: this.localName } }));
  }

  render() {
    const section = this._section;
    if (!section) {
      return nothing;
    }

    return html`
      <ha-dialog open @closed=${this.closeDialog}>
        <ha-dialog-header slot="header">
          <span slot="title">${this.localize("section.editor.title")}</span>
          <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
            ${TABS.map(
              (tab) => html`
                <ha-tab-group-tab
                  slot="nav"
                  .panel=${tab}
                  .active=${this._currTab === tab}
                >
                  ${this.hass!.localize(
                    `ui.panel.lovelace.editor.edit_section.${tab.replace("-", "_")}`,
                  )}
                </ha-tab-group-tab>
              `,
            )}
          </ha-tab-group>
        </ha-dialog-header>

        <div class="content">
          ${this._error ? html`<ha-alert alert-type="error">${this._error}</ha-alert>` : ""}
          ${this._currTab === "tab-visibility"
            ? html`
                <hui-section-visibility-editor
                  .hass=${this.hass}
                  .config=${this._section}
                  @value-changed=${this._configChanged}
                >
                </hui-section-visibility-editor>
              `
            : nothing}
          ${this._currTab === "tab-settings"
            ? html`
                <ha-expansion-panel
                  .expanded=${true}
                  .header=${this.localize("section.editor.formatting.title")}
                  .outlined=${true}
                >
                  <div class="grid">
                    <ha-select
                      .label=${this.localize("section.editor.alignment.vertical-align.title")}
                      .value=${section["vertical_align"]}
                      @selected=${this._onSelectChange}
                      .configKey=${"vertical_align"}
                      .options=${[
                        { value: "start", label: this.localize("section.editor.alignment.option.start") },
                        { value: "middle", label: this.localize("section.editor.alignment.option.middle") },
                        { value: "end", label: this.localize("section.editor.alignment.option.end") },
                        { value: "between", label: this.localize("section.editor.alignment.option.between") },
                        { value: "around", label: this.localize("section.editor.alignment.option.around") },
                      ]}
                    ></ha-select>

                    <ha-select
                      .label=${this.localize("section.editor.alignment.horizontal-align.title")}
                      .value=${section["horizontal_align"]}
                      @selected=${this._onSelectChange}
                      .configKey=${"horizontal_align"}
                      .options=${[
                        { value: "start", label: this.localize("section.editor.alignment.option.start") },
                        { value: "middle", label: this.localize("section.editor.alignment.option.middle") },
                        { value: "end", label: this.localize("section.editor.alignment.option.end") },
                      ]}
                    ></ha-select>

                    <ha-textfield
                      .label=${this.localize("section.editor.formatting.background-blur.label")}
                      .placeholder=${2}
                      .type=${"number"}
                      .min=${0}
                      .value=${section["bg_blur"]}
                      @input=${this._onInputChange}
                      .configKey=${"bg_blur"}
                    ></ha-textfield>

                    <ha-select
                      .label=${this.localize("section.editor.formatting.border-radius.label")}
                      .value=${String(section["border_radius"] ?? "none")}
                      @selected=${this._onSelectChange}
                      .configKey=${"border_radius"}
                      .options=${[
                        { value: "none", label: this.localize("section.editor.formatting.border-radius.options.default") },
                        ...[...Array(13)].map((_, i) => i * 2).map(r => ({ value: String(r), label: String(r) })),
                      ]}
                    ></ha-select>
                  </div>
                </ha-expansion-panel>

                <ha-expansion-panel
                  .expanded=${true}
                  .header=${this.localize("section.editor.photo-source.title")}
                  .outlined=${true}
                >
                  <div class="source-select">
                    <ha-select
                      .label=${this.localize("section.editor.photo-source.label")}
                      .value=${section["photo_source"] ?? "none"}
                      @selected=${this._onPhotoSourceChange}
                      .options=${[
                        { value: "none", label: this.localize("section.editor.photo-source.none") },
                        { value: "local_media", label: this.localize("section.editor.photo-source.local-media.title") },
                        { value: "picsum", label: this.localize("section.editor.photo-source.picsum.title") },
                        { value: "entity", label: this.localize("section.editor.photo-source.entity.title") },
                        { value: "remote", label: this.localize("section.editor.photo-source.remote.title") },
                      ]}
                    ></ha-select>
                    ${section.photo_source && section.photo_source !== "none"
                      ? html`
                          <div class="grid">
                            <ha-textfield
                              .label=${this.localize(
                                "section.editor.photo-source.refresh-interval.label",
                              )}
                              .type=${"number"}
                              .min=${1}
                              .value=${section.photo_config?.refresh_interval ?? ""}
                              .configKey=${"refresh_interval"}
                              @input=${this._onPhotoConfigChange}
                            ></ha-textfield>
                          </div>
                        `
                      : nothing}
                  </div>

                  <div class="sub-content">
                    ${section["photo_source"] === "local_media"
                      ? html`<div>
                          <div class="source-description">
                            ${this.localize("section.editor.photo-source.local-media.description")}
                          </div>
                          <div class="local-media-input">
                            <ha-textfield
                              name="media_source"
                              .label=${this.localize(
                                "section.editor.photo-source.local-media.media-source",
                              )}
                              .value=${section.media_source ?? ""}
                              .configKey=${"media_source"}
                              @input=${this._onInputChange}
                            ></ha-textfield>
                            <ha-button @click=${this.onExplore} slot="trigger" appearance="plain"
                              >${this.localize(
                                "section.editor.photo-source.local-media.explore",
                              )}</ha-button
                            >
                          </div>
                        </div>`
                      : nothing}
                    ${section["photo_source"] === "picsum"
                      ? html`
                          <div class="source-description">
                            ${this.localize("section.editor.photo-source.picsum.description")} (<a
                              href="https://picsum.photos/"
                              target="_blank"
                              >picsum.photos</a
                            >)
                          </div>
                          <div class="grid">
                            <ha-select
                              .label=${this.localize(
                                "section.editor.photo-source.picsum.collection.label",
                              )}
                              .value=${section.photo_config?.picsum?.collection ?? "all"}
                              @selected=${this._onPicsumCollectionChange}
                              .options=${[
                                { value: "all", label: this.localize("section.editor.photo-source.picsum.collection.option.all") },
                                { value: "nature", label: this.localize("section.editor.photo-source.picsum.collection.option.nature") },
                              ]}
                            ></ha-select>
                          </div>
                        `
                      : nothing}
                    ${section["photo_source"] === "entity"
                      ? html`<div class="">
                          <div class="source-description">
                            ${this.localize("section.editor.photo-source.entity.description")}
                          </div>
                          <ha-form
                            .hass=${this.hass}
                            .data=${section.photo_config?.entity ?? {}}
                            .schema=${[
                              {
                                label: this.localize(
                                  "section.editor.photo-source.entity.entity-id",
                                ),
                                name: "entity_id",
                                selector: { entity: { domain: ["sensor", "image", "input_text"] } },
                              },
                            ]}
                            .computeLabel=${computeLabel}
                            @value-changed=${this._onPhotoEntityChange}
                          ></ha-form>
                        </div>`
                      : nothing}
                    ${section["photo_source"] === "remote"
                      ? html`
                          <div class="source-description">
                            ${this.localize("section.editor.photo-source.remote.description")}
                          </div>
                          <div class="list">
                            <div class="add-remote-url">
                              <ha-textfield
                                class="add-remote-input"
                                .placeholder=${this.localize(
                                  "section.editor.photo-source.remote.add-photo",
                                )}
                                @keydown=${this._onAddLocalPhotoKeyPress}
                              ></ha-textfield>
                              <ha-icon-button
                                class="add-remote-button"
                                .path=${mdiPlus}
                                .title=${this.localize(
                                  "section.editor.photo-source.remote.add-photo",
                                )}
                                @click=${this._addLocalPhoto}
                              >
                              </ha-icon-button>
                            </div>

                            ${this._remotePhotos && this._remotePhotos.length > 0
                              ? html`<ha-sortable
                                  @item-moved=${this._onLocalPhotoMove}
                                  .group=${"photo-urls"}
                                  .handle-selector=${".handle"}
                                  .draggable-selector=${".photo-url-item"}
                                  .rollback=${true}
                                >
                                  <div>
                                    ${this._remotePhotos.map(({ photo, id }, index) => {
                                      const onDelete = () => this._removeLocalPhoto(id);
                                      return html`
                                        <div class="photo-url-item">
                                          <div class="handle">
                                            <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                                          </div>
                                          <picture>
                                            <source srcset=${photo} />
                                            <img
                                              class="photo-preview"
                                              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mO8Ww8AAj8BXkQ+xPEAAAAASUVORK5CYII="
                                              alt="placeholder"
                                            />
                                          </picture>
                                          <ha-textfield
                                            class="photo"
                                            name=${`photo-url-${index}`}
                                            .value=${photo ?? ""}
                                            .icon=${mdiDrag}
                                            .photoIndex=${index}
                                            @input=${this._onLocalPhotoChange}
                                          ></ha-textfield>
                                          <ha-icon-button
                                            class="delete"
                                            @click=${onDelete}
                                            .label=${this.localize(
                                              "section.editor.photo-source.remote.delete-photo",
                                            )}
                                            .path=${mdiClose}
                                          ></ha-icon-button>
                                        </div>
                                      `;
                                    })}
                                  </div>
                                </ha-sortable> `
                              : nothing}
                          </div>
                        `
                      : nothing}
                  </div>
                </ha-expansion-panel>
              `
            : nothing}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._dismiss}
          >
            ${this.localize("dialogs.generic.cancel")}
          </ha-button>

          <ha-button slot="primaryAction" @click=${this._confirm}>
            ${this.localize("dialogs.generic.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  _dismiss() {
    this._params!.cancel?.();
    this.closeDialog();
  }

  _confirm() {
    if (!this._params?.submit || !this._section) {
      this.closeDialog();
      return;
    }

    const source = this._section.photo_source;
    const remote =
      source === "remote" || this._remotePhotos!.length > 0
        ? {
            photos: this._remotePhotos!.map(({ photo }) => photo),
          }
        : undefined;

    const updatedSection = {
      ...this._section,
      bg_blur: this._section.bg_blur ? +this._section.bg_blur : undefined,
      border_radius:
        (this._section.border_radius as number | "none") !== "none"
          ? this._section.border_radius
          : undefined,
      photo_config: {
        ...(this._section.photo_config ?? {}),
        remote,
      },
    };

    this._params.submit(updatedSection);
    this.closeDialog();
  }

  private _configChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._section = ev.detail.value;
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.name as (typeof TABS)[number];
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  _onSelectChange(ev: CustomEvent<{ value: string }>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { configKey } = ev.target as any;

    this._section = {
      ...this._section!,
      [configKey]: ev.detail.value,
    };
  }

  _onPhotoSourceChange(ev: CustomEvent<{ value: string }>) {
    const photoSource = ev.detail.value === "none" ? undefined : (ev.detail.value as PhotoSource);

    this._section = {
      ...this._section!,
      photo_source: photoSource,
    };
  }

  _onInputChange(ev: CustomEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { value, configKey } = ev.target as any;

    this._section = {
      ...this._section!,
      [configKey]: value,
    };
  }

  _onBgBlurChange(ev: CustomEvent<{ value: number }>) {
    this._section = {
      ...this._section!,
      bg_blur: ev.detail.value,
    };
  }

  _onPicsumCollectionChange(ev: CustomEvent<{ value: string }>) {
    if (!this._section) {
      return;
    }

    this._section = {
      ...this._section,
      photo_config: {
        ...(this._section.photo_config ?? {}),
        picsum: {
          collection: ev.detail.value === "nature" ? "nature" : "all",
        },
      },
    };
  }

  _onPhotoEntityChange(ev: CustomEvent) {
    const { entity_id } = ev.detail.value;

    this._section = {
      ...this._section!,
      photo_config: {
        ...(this._section!.photo_config ?? {}),
        entity: { entity_id },
      },
    };
  }

  private _onPhotoConfigChange(ev: CustomEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { value, configKey } = ev.target as any;

    this._section = {
      ...this._section!,
      photo_config: {
        ...(this._section!.photo_config ?? {}),
        [configKey]: value ? Number(value) : undefined,
      },
    };
  }

  _onLocalPhotoChange(ev: CustomEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { value, photoIndex } = ev.target as any;

    const photos = [...this._remotePhotos!];
    photos[photoIndex] = { photo: value, id: photos[photoIndex].id };
    this._remotePhotos = photos;
  }

  _onLocalPhotoMove(ev: CustomEvent) {
    const { oldIndex, newIndex } = ev.detail;

    const photos = [...this._remotePhotos!];
    const oldPhoto = photos.splice(oldIndex, 1)[0];
    photos.splice(newIndex, 0, oldPhoto);

    this._remotePhotos = photos;
  }

  _onAddLocalPhotoKeyPress(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.key === "Enter") {
      this._addLocalPhoto();
    }
  }

  _addLocalPhoto() {
    const newPhoto = this._addRemotePhotoInputNode;
    if (!newPhoto || newPhoto.value.length === 0) {
      return;
    }

    this._remotePhotos = [...this._remotePhotos!, { id: Math.random(), photo: newPhoto.value }];

    newPhoto.value = "";
  }

  _removeLocalPhoto(value: number) {
    this._remotePhotos = this._remotePhotos!.filter(({ id }) => id !== value);
  }

  onExplore() {
    this.dispatchEvent(
      new CustomEvent("show-dialog", {
        composed: true,
        detail: {
          dialogTag: "pebble-browse-media-dialog",
          dialogImport: () => {
            return import("./pebble-browse-media-dialog");
          },
          dialogParams: {
            prompt: true,
            cancel: () => {},
            submit: (mediaItem: MediaPlayerItem) => {
              this._section = {
                ...this._section!,
                media_source: mediaItem.media_content_id,
              };
            },
          },
        },
      }),
    );
  }

  static get styles() {
    return [
      css`

        :host {
          --mdc-button-horizontal-padding: 16px;
          --mdc-button-outline-width: 1px;
        }

        ha-textfield {
          display: block;
          width: 100%;
          --text-field-suffix-padding-right: 30px;
        }

        ha-expansion-panel {
          padding-bottom: 16px;
        }

        .content {
          display: grid;
          gap: 16px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(
            var(--form-grid-column-count, auto-fit),
            minmax(var(--form-grid-min-width, 200px), 1fr)
          );
          grid-column-gap: 8px;
          grid-row-gap: 24px;
        }

        /** remote urls */
        .list {
          display: grid;
          gap: 16px;
        }

        .add-remote-url {
          display: flex;
          align-items: center;
        }

        .add-remote-button {
          position: absolute;
          right: 36px;
        }

        .photo-url-item {
          display: flex;
          align-items: center;
          --mdc-icon-size: 24px;
        }

        .photo-url-item .delete {
          position: absolute;
          right: 36px;
        }

        .source-select {
          display: grid;
          gap: 8px;
          grid-template-columns: 1fr 1fr;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .handle {
          cursor: grab;
        }

        .handle ha-svg-icon {
          margin-right: 0;
        }

        .label {
          font-size: 12px;
          font-weight: 500;
          color: var(--input-label-ink-color);
        }
        .date-range-details-content {
          display: inline-block;
        }
        ha-svg-icon {
          width: 40px;
          margin-right: 8px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          direction: var(--direction);
          vertical-align: top;
        }
        .key {
          display: inline-block;
          vertical-align: top;
        }
        .value {
          display: inline-block;
          vertical-align: top;
        }
        .photo-preview {
          width: 40px;
          height: 40px;
          object-fit: cover;
          margin-right: 8px;
        }

        .source-description {
          margin: 16px 0;
        }

        .local-media-input {
          display: grid;
          grid-template-columns: auto max-content;
          align-items: center;
        }

        .preview-images,
        .preview-folders {
          display: grid;
          justify-content: space-between;
          grid-auto-flow: column;
          gap: 16px;
          margin-bottom: 8px;
        }

        .preview-images img,
        .preview-images div {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-grid-section-dialog": PebbleGridSectionDialog;
  }
}
