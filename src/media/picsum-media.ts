export const NATURE_PICSUM_IDS = [
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",

  "25",
  "27",
  "28",
  "29",

  "33",
  "35",
  "37",
  "38",
  "41",
  "44",

  "46",
  "47",
  "49",
  "50",
  "54",
  "58",

  "59",
  "62",
  "70",
  "75",
  "77",
  "83",
  "84",

  "89",
  "93",
  "95",
  "110",
  "120",
  "124",

  "128",
  "135",
  "149",
  "184",
  "185",
  "198",
  "213",
];

export const getNaturePicsumPhoto = () => {
  const id = NATURE_PICSUM_IDS[Math.floor(Math.random() * NATURE_PICSUM_IDS.length)];
  return `https://picsum.photos/id/${id}/1200/800`;
};

export const getRandomPicsumPhoto = () => {
  return `https://picsum.photos/1200/800?ts=${Date.now()}`;
};
