export type PhotoSource = "remote" | "local_media" | "picsum" | "entity";

export type VerticalAlignment = "start" | "end" | "center" | "around" | "between";
export type HorizontalAlignment = "start" | "end" | "center";

export type StackSectionConfig = {
  type: "custom:pebble-stack-section";
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
