import { type CSSResultGroup, css } from "lit";

export const COLORS = [
  "red",
  "pink",
  "light-purple",
  "purple",
  "blue",
  "light-blue",
  "cyan",
  "teal",
  "green",
  "light-green",
  "lime",
  "gold",
  "yellow",
  "amber",
  "light-orange",
  "orange",
  "brown",
  "grey",
  "white",
] as const;

export type ColorOption = (typeof COLORS)[number];

type RgbColor = {
  red: number;
  blue: number;
  green: number;
};

export const computeCssColor = (color: ColorOption) => {
  if (COLORS.includes(color)) {
    return `var(--color-${color})`;
  }
  return color;
};

export const getColor = (seed: number) => {
  const a = 5; // This is a multiplier, should be relatively prime to m
  const c = 1; // This is an increment, can be any value if 'a' is not 1
  const m = COLORS.length;

  // Linear congruential generator formula
  const index = (a * seed + c) % m;

  // Return the color at the new index
  return COLORS[index];
};

export const COLOR_CSS_VARS: CSSResultGroup = css`
  :host {
    --color-red: rgb(255, 109, 96);
    --color-pink: rgb(255, 144, 194);
    --color-light-purple: rgb(229, 212, 255);
    --color-purple: rgb(190, 173, 250);
    --color-blue: rgb(80, 196, 255);
    --color-light-blue: rgb(160, 233, 255);
    --color-cyan: rgb(157, 241, 223);
    --color-teal: rgb(178, 216, 216);
    --color-green: rgb(166, 207, 152);
    --color-light-green: rgb(208, 245, 190);
    --color-lime: rgb(203, 255, 169);
    --color-gold: rgb(229, 210, 131);
    --color-yellow: rgb(232, 215, 163);
    --color-amber: rgb(236, 143, 94);
    --color-light-orange: rgb(250, 171, 120);
    --color-orange: rgb(255, 155, 80);
    --color-brown: rgb(176, 146, 106);
    --color-grey: rgb(176, 176, 176);
    --color-white: rgb(255, 255, 255);
  }
`;

const getIlluminance = ({ red, green, blue }: RgbColor) => {
  // Calculate the illuminance using the luminance formula
  const illuminance = 0.299 * red + 0.587 * green + 0.114 * blue;

  return Math.round(illuminance);
};

/**
 * Calculate 0-255 illuminance value from provided hexadecimal color value. 0 is dark, 255 is light.
 * */
const getIlluminanceFromHex = (input: string) => {
  const hexColor =
    input.length === 4
      ? "#" + input[1] + input[1] + input[2] + input[2] + input[3] + input[3]
      : input;

  // Convert the hexadecimal color to RGB
  const red = parseInt(hexColor.substring(1, 3), 16);
  const green = parseInt(hexColor.substring(3, 5), 16);
  const blue = parseInt(hexColor.substring(5, 7), 16);

  return getIlluminance({ red, green, blue });
};

export const isDark = (color: string | RgbColor) =>
  (typeof color === "string" ? getIlluminanceFromHex(color) : getIlluminance(color)) < 185;

export const getAverageBackgroundColor = (
  container: HTMLElement,
  card: HTMLElement,
  imageUrl: string,
): Promise<RgbColor> => {
  const { top, left, width, height } = container.getBoundingClientRect();
  const {
    top: cardTop,
    left: cardLeft,
    width: cardWidth,
    height: cardHeight,
  } = card.getBoundingClientRect();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = "absolute";
  canvas.style.top = "" + top;
  canvas.style.left = "" + left;
  canvas.style.zIndex = "0";

  document.getElementsByTagName("body")[0].appendChild(canvas);

  const ctx = canvas.getContext("2d");

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // avoid security error
    img.onerror = () => {
      reject("Failed to load image");
    };
    img.onload = () => {
      if (!ctx) {
        reject("Canvas context not created");
        return false;
      }

      const {
        width: imgWidth,
        height: imgHeight,
        offsetX,
        offsetY,
      } = getCoverDimensions(width, height, img.naturalWidth, img.naturalHeight);

      let imageData: ImageData;
      try {
        ctx.drawImage(img, offsetX, offsetY, imgWidth, imgHeight);
        imageData = ctx.getImageData(cardLeft, cardTop, cardWidth, cardHeight);
      } catch (e) {
        console.error("Error drawing image on canvas", e);
        reject("Failed to draw image");
        return false;
      }
      const pixelMap = imageData.data;

      let red = 0;
      let green = 0;
      let blue = 0;
      let length = 4 * Math.floor(cardWidth) * Math.floor(cardHeight);

      for (let i = 0; i < length; i += 4) {
        red += pixelMap[i];
        green += pixelMap[i + 1];
        blue += pixelMap[i + 2];
      }
      length = length / 4;
      red = Math.round(red / length);
      green = Math.round(green / length);
      blue = Math.round(blue / length);

      canvas.parentNode?.removeChild(canvas);
      resolve({ red, green, blue });
      return true;
    };

    img.src = imageUrl;
  });
};

const getCoverDimensions = (
  parentWidth: number,
  parentHeight: number,
  childWidth: number,
  childHeight: number,
  scale = 1,
  offsetX = 0.5,
  offsetY = 0.5,
) => {
  const childRatio = childWidth / childHeight;
  const parentRatio = parentWidth / parentHeight;
  let width = parentWidth * scale;
  let height = parentHeight * scale;

  if (childRatio < parentRatio) {
    height = width / childRatio;
  } else {
    width = height * childRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    offsetX: Math.round((parentWidth - width) * offsetX),
    offsetY: Math.round((parentHeight - height) * offsetY),
  };
};
