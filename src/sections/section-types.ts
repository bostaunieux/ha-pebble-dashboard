export type PhotoSource = "remote" | "local_media" | "picsum" | "entity" | "none";

export type VerticalAlignment = "start" | "end" | "center" | "around" | "between";
export type HorizontalAlignment = "start" | "end" | "center";

// Visibility condition types
export type Condition =
  | LocationCondition
  | NumericStateCondition
  | StateCondition
  | ScreenCondition
  | TimeCondition
  | UserCondition
  | OrCondition
  | AndCondition
  | NotCondition;

interface BaseCondition {
  condition: string;
}

export interface LocationCondition extends BaseCondition {
  condition: "location";
  locations?: string[];
}

export interface NumericStateCondition extends BaseCondition {
  condition: "numeric_state";
  entity?: string;
  below?: string | number;
  above?: string | number;
}

export interface StateCondition extends BaseCondition {
  condition: "state";
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
}

export interface ScreenCondition extends BaseCondition {
  condition: "screen";
  media_query?: string;
}

export interface TimeCondition extends BaseCondition {
  condition: "time";
  after?: string;
  before?: string;
  weekdays?: ("sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat")[];
}

export interface UserCondition extends BaseCondition {
  condition: "user";
  users?: string[];
}

export interface OrCondition extends BaseCondition {
  condition: "or";
  conditions?: Condition[];
}

export interface AndCondition extends BaseCondition {
  condition: "and";
  conditions?: Condition[];
}

export interface NotCondition extends BaseCondition {
  condition: "not";
  conditions?: Condition[];
}

export type StackSectionConfig = {
  type: "custom:pebble-grid-section";
  visibility?: Condition[];
  columns?: number;
  title?: string;
  vertical_align?: VerticalAlignment;
  horizontal_align?: HorizontalAlignment;
  bg_blur?: number;
  border_radius?: number;
  cards: any[];
  media_source?: string;
  photo_source?: PhotoSource;
  photo_config?: {
    entity?: { entity_id: string };
    remote?: { photos: string[] };
    picsum?: { collection?: "all" | "nature" };
    refresh_interval?: number;
  };
};

export type StackSectionDialogParams = {
  submit?: (config: StackSectionConfig) => void;
  cancel?: () => void;
  section: StackSectionConfig;
};

export type MediaPlayerItem = {
  title: string;
  media_content_type: string;
  media_content_id: string;
  media_class?: string;
  thumbnail?: string;
  children?: MediaPlayerItem[];
};

export type MediaPlayerItemId = {
  media_content_type: string | undefined;
  media_content_id: string | undefined;
};

export type MediaPickedEvent = {
  item: MediaPlayerItem;
  navigateIds: MediaPlayerItem[];
};

export type BrowseMediaDialogParams = {
  entityId: string;
  mediaPickedCallback: (pickedMedia: MediaPlayerItem) => void;
  navigateIds?: MediaPlayerItem[];
  minimumNavigateLevel?: number;
  submit?: (pickedMedia: MediaPlayerItem) => void;
  cancel?: () => void;
};
