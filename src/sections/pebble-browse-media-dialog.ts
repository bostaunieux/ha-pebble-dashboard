import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { mdiArrowLeft, mdiClose } from "@mdi/js";
import initLocalize from "../localize";
import type { HomeAssistant } from "../types";
import type { MediaPlayerItem, BrowseMediaDialogParams } from "./section-types";
import { browseMedia } from "../media/local-media";
import "../components/pebble-media-tree";

@customElement("pebble-browse-media-dialog")
export default class PebbleBrowseMediaDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _rootItem?: MediaPlayerItem;

  @state() private _currentItem?: MediaPlayerItem;

  @state() private _navigateIds?: MediaPlayerItem[];

  @state() private _params?: BrowseMediaDialogParams;

  @state() private _opened = false;

  private get localize() {
    return initLocalize(this.hass);
  }

  constructor() {
    super();
    this._navigateIds = [];
  }

  public showDialog(params: BrowseMediaDialogParams): void {
    this._params = params;
    this._navigateIds = params.navigateIds || [
      {
        title: this.localize("section.editor.browse-media.title"),
        media_content_id: "",
        media_content_type: "",
      },
    ];
    this._opened = true;
    this._browse(this._navigateIds?.[0].media_content_id);
  }

  public closeDialog() {
    if (this._params?.cancel) {
      this._params.cancel();
    }
    if (this._opened) {
      this.dispatchEvent(new CustomEvent("dialog-closed", { detail: { dialog: this.localName } }));
    }
    this._opened = false;
    this._params = undefined;
    this._navigateIds = undefined;
    this._currentItem = undefined;
  }

  render() {
    if (!this._opened || !this._params) {
      return nothing;
    }

    const showBackButton =
      this._navigateIds && this._navigateIds.length > (this._params?.minimumNavigateLevel ?? 1);

    return html`
      <ha-dialog
        open
        flexContent
        scrimClickAction
        hideActions
        .heading=${this.localize("section.editor.browse-media.title")}
        @closed=${this.closeDialog}
      >
        <ha-dialog-header show-border slot="heading">
          ${showBackButton
            ? html`
                <ha-icon-button
                  slot="navigationIcon"
                  .path=${mdiArrowLeft}
                  @click=${this._goBack}
                ></ha-icon-button>
              `
            : nothing}
          <span slot="title">
            ${!this._currentItem
              ? this.hass.localize("ui.components.media-browser.media-player-browser")
              : this._currentItem.title}
          </span>

          <span slot="subtitle" class="subtitle">
            ${this.localize("section.editor.browse-media.subtitle")}
          </span>

          <ha-icon-button
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            dialogAction="close"
            slot="actionItems"
          ></ha-icon-button>
        </ha-dialog-header>

        <div class="content">
          ${this._error ? html`<ha-alert alert-type="error">${this._error}</ha-alert>` : ""}
          ${html`<div>${this.renderTreeView()}</div>`}
        </div>
      </ha-dialog>
    `;
  }

  renderTreeView() {
    return this._rootItem?.children?.length
      ? html`<pebble-media-tree
          .items=${this._rootItem?.children}
          @expanded-changed=${this._onExpandedChanged}
          @selected-changed=${this._onSelectedChanged}
        ></pebble-media-tree>`
      : nothing;
  }

  private async _onExpandedChanged(ev: CustomEvent) {
    const expanded = ev.detail.expanded;
    const item = ev.detail.item;
    if (expanded) {
      try {
        const browsedMedia = await browseMedia(this.hass!, item.media_content_id);
        if (!browsedMedia) {
          return;
        }

        if (!this._rootItem?.children) {
          return;
        }

        // Helper function to recursively update children
        const updateChildren = (children: MediaPlayerItem[]): MediaPlayerItem[] => {
          return children.map((child) => {
            if (child.media_content_id === item.media_content_id) {
              return {
                ...child,
                children: [...(browsedMedia.children ?? [])],
              };
            }
            if (child.children) {
              return {
                ...child,
                children: updateChildren(child.children),
              };
            }
            return child;
          });
        };

        // Update root item immutably
        this._rootItem = {
          ...this._rootItem,
          children: updateChildren(this._rootItem.children),
        };

        console.log(this._rootItem);
      } catch (e) {
        console.warn("Failed to browse media", e);
      }
    }
  }

  private _onSelectedChanged(ev: CustomEvent) {
    const item = ev.detail.item;
    if (item) {
      this._params?.submit?.(item);
      this.closeDialog();
    }
  }

  private async _browse(id?: string) {
    try {
      const browsedMedia = await browseMedia(this.hass!, id);
      if (!browsedMedia) {
        return;
      }

      this._currentItem = browsedMedia;
      if (this._rootItem == null) {
        this._rootItem = browsedMedia;
      }
    } catch (e) {
      console.warn("Failed to browse media", e);
    }
  }

  private _goBack() {
    this._navigateIds = this._navigateIds?.slice(0, -1);
    this._currentItem = undefined;

    this._browse(this._navigateIds![this._navigateIds!.length - 1].media_content_id);
  }

  static get styles() {
    return [
      css`
        /* Media query */
        @media all and (min-width: 450px) and (min-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: min(600px, 95vw);
            --mdc-dialog-max-width: min(600px, 95vw);
          }
        }

        /* Common values can be moved to custom properties */
        :host {
          --media-item-size: 48px;
          --preview-image-size: 80px;
          --border-radius: 8px;
          --gap-standard: 8px;
        }

        /* Group related styles */
        .content {
          min-height: 50vh;
        }

        .summary {
          margin-bottom: var(--gap-standard);
        }

        /* Media preview styles */
        .preview-images {
          display: grid;
          justify-content: space-between;
          grid-auto-flow: column;
          gap: 16px;
          margin-bottom: var(--gap-standard);
        }

        .preview-images img,
        .preview-images div {
          width: var(--preview-image-size);
          height: var(--preview-image-size);
          object-fit: cover;
          border-radius: var(--border-radius);
        }

        /* Folder styles */
        .preview-folders {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .preview-folder {
          padding: 8px 12px;
          cursor: pointer;
        }

        /* Media tree and items */
        .media-tree {
          display: flex;
          flex-direction: column;
          gap: var(--gap-standard);
        }

        .media-item {
          --mdc-icon-size: var(--media-item-size);
          background: transparent;
          cursor: pointer;
          border: none;
          padding: 0;
          margin: 0;
          font: inherit;
          display: flex;
          align-items: center;
          gap: var(--gap-standard);
        }

        .media-item-preview {
          height: var(--media-item-size);
          width: var(--media-item-size);
          object-fit: cover;
          display: grid;
          place-items: center;
          padding: 2px;
          border-radius: 4px;
        }

        .media-item-preview img {
          height: var(--media-item-size);
          width: var(--media-item-size);
          object-fit: cover;
          border-radius: var(--border-radius);
          border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
        }

        /* Typography */
        .subtitle {
          margin-top: var(--gap-standard);
          white-space: normal;
        }

        /* Icons */
        ha-svg-icon {
          color: var(--mdc-theme-text-icon-on-background, rgba(0, 0, 0, 0.38));
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-browse-media-dialog": PebbleBrowseMediaDialog;
  }
}
