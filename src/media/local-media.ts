import { HomeAssistant } from "../types";
import { MediaPlayerItem } from "../sections/section-types";

export const resolveRandomMedia = async (hass: HomeAssistant, mediaSource?: string) => {
  let browsedMedia;
  try {
    browsedMedia = (await browseMedia(hass, mediaSource))?.children;
  } catch (e) {
    console.info(console.info(`Unable to browse media with media id ${mediaSource}`));
    return null;
  }
  const mediaOptions = browsedMedia?.filter((option) => option.media_class !== "directory") ?? [];
  const numOptions = mediaOptions.length;
  if (numOptions == 0) {
    return null;
  }

  const mediaId = mediaOptions[Math.floor(Math.random() * numOptions)].media_content_id;

  return await resolveMedia(hass, mediaId);
};

export const resolveMedia = async (hass: HomeAssistant, mediaId: string) => {
  try {
    const resolvedUrl = await hass.callWS<{ url: string }>({
      type: "media_source/resolve_media",
      media_content_id: mediaId,
    });

    return resolvedUrl.url ?? null;
  } catch (e) {
    console.info(`Unable to resolve media with media id ${mediaId}`);
  }

  return null;
};

export const browseMedia = async (hass: HomeAssistant, mediaSource?: string) => {
  const result = await hass.callWS<MediaPlayerItem>({
    type: "media_source/browse_media",
    media_content_id: mediaSource,
  });

  return result;
};
