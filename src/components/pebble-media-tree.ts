import type { MediaPlayerItem } from "../sections/section-types";
import { LitElement, css, html, nothing, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  mdiChevronRight,
  mdiChevronDown,
  mdiFolder,
  mdiImage,
  mdiApplication,
  mdiVideo,
} from "@mdi/js";

const mediaIconMap: Record<string, string> = {
  image: mdiImage,
  video: mdiVideo,
  directory: mdiFolder,
  app: mdiApplication,
};

@customElement("pebble-media-tree")
export class PebbleMediaTree extends LitElement {
  @property({ type: Array }) items: MediaPlayerItem[] = [];

  @property({ type: Boolean }) loading = false;

  @property({ type: Array, attribute: "expanded-ids" }) expandedIds: string[] = [];

  @state() private _loadingId?: string;

  render() {
    return html`<div class="tree">${this.items.map((item) => this.renderItem(item))}</div>`;
  }

  private renderItem(item: MediaPlayerItem): TemplateResult {
    const isFolder = item.media_class === "directory";
    const isApp = item.media_class === "app";
    const isFolderOrApp = isFolder || isApp;
    const isExpanded = this.expandedIds.includes(item.media_content_id);
    const isLoading = item.media_content_id === this._loadingId;

    const icon = mediaIconMap[item.media_class ?? ""] ?? mdiImage;

    const photoCount =
      item.children?.filter((child) => child.media_class === "image").length ?? null;

    const onExpand = (e: MouseEvent) => {
      e.stopPropagation();
      this._handleExpand(item);
    };

    const onExpandKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        this._handleExpand(item);
      }
    };

    const onSelect = (e: MouseEvent) => {
      e.stopPropagation();
      this._handleSelect(item);
    };

    return html`
      <div class="tree-item">
        <div
          class="item-content"
          @click=${isFolderOrApp ? onExpand : undefined}
          @keydown=${isFolderOrApp ? onExpandKeyDown : undefined}
          tabindex=${isFolderOrApp ? 0 : -1}
        >
          ${isFolderOrApp
            ? html`
                <ha-icon-button
                  class="expand-button"
                  .path=${isExpanded ? mdiChevronDown : mdiChevronRight}
                ></ha-icon-button>
              `
            : html`<div class="expand-spacer"></div>`}

          <ha-svg-icon
            .path=${icon}
            class="item-icon ${isFolderOrApp ? "folder" : "image"}"
          ></ha-svg-icon>

          <span class="item-title">
            ${item.title} ${photoCount !== null ? html` (${photoCount})` : nothing}
          </span>

          ${isLoading
            ? html`
                <slot name="loading">
                  <ha-circular-progress size="small" active></ha-circular-progress>
                </slot>
              `
            : nothing}
          ${isFolder
            ? html`
                <ha-button
                  class="select-button"
                  appearance="plain"
                  @click=${onSelect}
                  @keydown=${onSelect}
                  aria-label="Select ${item.title}"
                >
                  Select
                </ha-button>
              `
            : nothing}
        </div>

        ${isFolderOrApp && isExpanded && item.children
          ? html`
              <div class="item-children">
                ${item.children.map((child) => this.renderItem(child))}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _handleExpand(item: MediaPlayerItem) {
    if (!item) return;

    const isFolder = item.media_class === "directory" || item.media_class === "app";

    if (isFolder) {
      const expanded = this.expandedIds.includes(item.media_content_id);
      const newExpandedIds = expanded
        ? this.expandedIds.filter((id) => id !== item.media_content_id)
        : [...this.expandedIds, item.media_content_id];

      this.expandedIds = newExpandedIds;
      this.dispatchEvent(
        new CustomEvent("expanded-changed", {
          detail: { item, expanded: !expanded },
        }),
      );
    }
  }

  private _handleSelect(item: MediaPlayerItem) {
    if (!item) return;

    this.dispatchEvent(
      new CustomEvent("selected-changed", {
        detail: { item },
      }),
    );
  }

  static styles = css`
    .tree {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tree-item {
      display: flex;
      flex-direction: column;
    }

    .item-content {
      display: flex;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      border-radius: 4px;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }

    .item-content:hover {
      background: rgba(var(--rgb-primary-text-color), 0.08);
    }

    .selected > .item-content {
      background: rgba(var(--rgb-primary-color), 0.12);
    }

    .item-children {
      margin-left: 28px;
    }

    .expand-button {
      --mdc-icon-size: 20px;
      --mdc-icon-button-size: 36px;
      width: 32px;
    }

    .expand-spacer {
      width: 28px;
    }

    .item-icon {
      --mdc-icon-size: 20px;
      margin-right: 8px;
    }

    .item-icon.folder {
      color: var(--secondary-text-color);
    }

    .item-icon.image {
      color: var(--primary-text-color);
    }

    .item-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .select-button {
      opacity: 0;
      transition: opacity 0.1s ease-in-out;
    }

    .item-content:hover .select-button,
    .selected .select-button {
      opacity: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-media-tree": PebbleMediaTree;
  }
}
