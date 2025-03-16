import { StackSectionConfig } from "../sections/section-types";
import { HomeAssistant } from "../types";
import { resolveRandomMedia } from "./local-media";
import { getRandomPicsumPhoto, getNaturePicsumPhoto } from "./picsum-media";

export const getPhotoFromConfig = async (config: StackSectionConfig, hass: HomeAssistant) => {
  const photoSource = config.photo_source;

  if (photoSource === "picsum") {
    const photo =
      config.photo_config?.picsum?.collection === "nature"
        ? getNaturePicsumPhoto()
        : getRandomPicsumPhoto();
    return photo;
  }

  if (photoSource === "remote") {
    const photos = config.photo_config?.remote?.photos ?? [];
    if (photos.length === 0) {
      return;
    }

    return photos[Date.now() % photos.length];
  }

  if (photoSource === "local_media") {
    const mediaSource = config!.media_source;
    if (!mediaSource || !hass) {
      return;
    }

    return await resolveRandomMedia(hass, mediaSource);
  }

  if (photoSource === "entity") {
    const entity = config.photo_config?.entity?.entity_id;
    if (!entity) {
      return;
    }

    return hass?.states[entity]?.state;
  }
};
