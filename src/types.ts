import type { HTMLTemplateResult } from "lit";
import { Connection, HassConfig, HassEntities, HassEntity } from "home-assistant-js-websocket";

type LocalizeFunc = (
  key: string,
  values?: Record<string, string | number | HTMLTemplateResult | null | undefined>,
) => string;

interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  icon?: string;
  device_id?: string;
  area_id?: string;
  labels: string[];
  // hidden?: boolean;
  // entity_category?: EntityCategory;
  // translation_key?: string;
  // platform?: string;
  // display_precision?: number;
}

interface Resources {
  [language: string]: Record<string, string>;
}

export interface HomeAssistant {
  connection: Connection;
  connected: boolean;
  states: HassEntities;
  entities: { [id: string]: EntityRegistryDisplayEntry };
  config: HassConfig;
  // i18n
  // current effective language in that order:
  //   - backend saved user selected language
  //   - language in local app storage
  //   - browser language
  //   - english (en)
  language: string;
  // local stored language, keep that name for backward compatibility
  selectedLanguage: string | null;
  locale: any /*TODO Fix ME FrontendLocaleData */;
  resources: Resources;
  localize: LocalizeFunc;
  callApi<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    parameters?: Record<string, any>,
    headers?: Record<string, string>,
  ): Promise<T>;
  callWS<T>(params: unknown): Promise<T>;
  formatEntityAttributeValue: (stateObj: HassEntity, attribute: string, value?: any) => string;
}

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  view_layout?: unknown;
  layout_options?: unknown;
  type: string;
  [key: string]: unknown;
}

export interface LovelaceSectionConfig {
  title?: string;
  type?: string;
  cards?: LovelaceCardConfig[];
}

export interface LovelaceView {
  type?: string;
  badges?: unknown[];
  cards?: LovelaceCardConfig[];
  sections?: LovelaceSectionConfig[];
}

export interface LovelaceConfig {
  title?: string;
  background?: string;
  views: LovelaceView[];

  index?: number;
  path?: string;
  icon?: string;
  theme?: string;
  panel?: boolean;
  visible?:
    | boolean
    | {
        user?: string;
      }[];
  subview?: boolean;
  back_path?: string;
  max_columns?: number;
}

export interface Lovelace {
  config: LovelaceConfig;
  // rawConfig: LovelaceRawConfig;
  editMode: boolean;
  // urlPath: string | null;
  // mode: "generated" | "yaml" | "storage";
  // locale: FrontendLocaleData;
  // enableFullEditMode: () => void;
  // setEditMode: (editMode: boolean) => void;
  saveConfig: (newConfig: LovelaceConfig) => Promise<void>;
  // deleteConfig: () => Promise<void>;
}

export interface LovelaceElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceConfig): void;
}

export interface HASSDomEvent<T> extends Event {
  detail: T;
}
