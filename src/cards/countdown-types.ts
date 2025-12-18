import { CardTextOptions } from "./card-options";

export type CountdownCardConfig = {
  type: "custom:pebble-countdown-card";
  entity?: string;
  date?: string; // Alternative to entity: static date
  title?: string; // Optional title for the static date
  hide_if_no_event?: boolean; // Modified to be boolean
  no_event_text?: string;
  horizontal_alignment?: "start" | "center" | "end";
  vertical_alignment?: "start" | "center" | "end";
} & CardTextOptions;
