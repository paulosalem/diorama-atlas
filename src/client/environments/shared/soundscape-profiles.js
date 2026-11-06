const loop = (asset, level, position, extra = {}) => ({
  asset,
  level,
  position,
  mode: "loop",
  ...extra,
});
const event = (asset, level, position, interval, extra = {}) => ({
  asset,
  level,
  position,
  interval,
  mode: "event",
  ...extra,
});

export const SOUNDSCAPES = {
  "finnish-lakeside-sauna": {
    label:
      "Quiet fire and garden ambience; illustrative recordings, not Finnish field recordings",
    layers: [
      loop("cooking-fire", 0.16, [-2.05, 0.7, 0.1], { refDistance: 2 }),
      loop("garden-birds", 0.1, [-5, 3, 5], { refDistance: 4 }),
    ],
  },
  "mongolian-ger": {
    label:
      "Quiet household handling; illustrative recordings, not a Mongolian field recording",
    layers: [
      event("service-dishes", 0.16, [0, 0.6, -1.6], [24, 46]),
      event("wood-work", 0.1, [3.6, 0.3, 1.7], [32, 57]),
    ],
  },
  "alfama-hillside": {
    label: "Distant conversation, dishes and birds in an imagined Alfama court",
    layers: [
      loop("room-murmur", 0.15, [-3.8, 3.5, -0.6], { cutoff: 1800 }),
      event("service-dishes", 0.2, [-4.2, 3.2, -0.6], [24, 43]),
      loop("garden-birds", 0.12, [9, 5, -4], { refDistance: 4 }),
    ],
  },
  "roman-domus": {
    label:
      "Quiet garden birds and household work; illustrative modern recordings",
    layers: [
      loop("garden-birds", 0.16, [0, 3, -11], { refDistance: 5 }),
      event("wood-work", 0.15, [13, 0.8, 6], [25, 45]),
    ],
  },
  "douro-vineyard": {
    label: "Quiet birds and handling in the vineyard workroom",
    layers: [
      loop("garden-birds", 0.2, [17, 4, 4], { refDistance: 6 }),
      event("wood-work", 0.2, [-8, 1, -1], [25, 44]),
      event("paper-pages", 0.12, [-9.7, 0.9, 0.4], [35, 55]),
    ],
  },
  "newar-potters-square": {
    label: "Distant courtyard birds and quiet workshop handling",
    layers: [
      loop("garden-birds", 0.16, [-5, 5, -5], { refDistance: 5 }),
      event("wood-work", 0.25, [-3, 0.9, -2], [18, 34]),
      event("paper-pages", 0.13, [2, 0.8, -3], [27, 45]),
    ],
  },
  "central-asian-madrasa": {
    label: "Courtyard birds and pages in a shaded study",
    layers: [
      loop("garden-birds", 0.19, [6, 5, -6], { refDistance: 6 }),
      event("paper-pages", 0.26, [-4, 0.9, -3], [20, 38]),
    ],
  },
  "balinese-subak-terraces": {
    label: "A quiet bird-filled garden and a pavilion tea setting",
    layers: [
      loop("garden-birds", 0.32, [-6, 4, -8], { refDistance: 7 }),
      event("service-dishes", 0.15, [3, 1.1, 1], [29, 48]),
    ],
  },
  "venetian-boatyard": {
    label: "Timber-work handling and distant courtyard birds",
    layers: [
      event("wood-work", 0.35, [-3, 1, -3], [13, 27]),
      loop("garden-birds", 0.1, [7, 5, -5], { refDistance: 4 }),
      event("paper-pages", 0.16, [-4, 1, 1], [28, 45]),
    ],
  },
  "bahian-neighborhood-square": {
    label: "Distant conversation, café dishes and courtyard birds",
    layers: [
      loop("room-murmur", 0.2, [-5, 1.5, -4], { cutoff: 2200 }),
      loop("garden-birds", 0.16, [5, 5, -3], { refDistance: 4 }),
      event("service-dishes", 0.23, [-3, 1, 1], [18, 32]),
    ],
  },
  "andean-stone-lane": {
    label: "Quiet garden birds and handling at a workshop doorway",
    layers: [
      loop("garden-birds", 0.18, [4, 4, -5], { refDistance: 4 }),
      event("wood-work", 0.19, [-3, 1, -4], [24, 43]),
    ],
  },
  "swahili-verandah": {
    label: "A shaded tea setting, turning pages and distant birds",
    layers: [
      loop("garden-birds", 0.16, [6, 5, -4], { refDistance: 5 }),
      event("service-dishes", 0.2, [-2, 0.8, -2], [23, 41]),
      event("paper-pages", 0.17, [2, 0.8, -1], [29, 47]),
    ],
  },
  "naxi-canal-quarter": {
    label: "Courtyard birds, paper and quiet tea service",
    layers: [
      loop("garden-birds", 0.24, [-5, 4, -6], { refDistance: 5 }),
      event("paper-pages", 0.2, [3, 0.9, -2], [25, 44]),
      event("service-dishes", 0.18, [-3, 1, -3], [29, 48]),
    ],
  },
  "tunisian-terrace-cafe": {
    label: "Low café conversation, cups and distant birds",
    layers: [
      loop("room-murmur", 0.17, [-4, 1.5, -3], { cutoff: 2400 }),
      event("service-dishes", 0.28, [-2, 0.9, -1], [15, 30]),
      loop("garden-birds", 0.12, [6, 5, -6], { refDistance: 4 }),
    ],
  },
  "lao-temple-court": {
    label: "Courtyard birds and pages at a shaded reading place",
    layers: [
      loop("garden-birds", 0.25, [-6, 5, -7], { refDistance: 6 }),
      event("paper-pages", 0.16, [3, 0.8, -2], [30, 49]),
    ],
  },
  riad: {
    label: "Courtyard fountain, distant birds and tea service",
    music: "music-marrakech",
    musicPosition: [-3.5, 1.1, -1.5],
    layers: [
      loop("fountain-courtyard", 0.8, [0, 0.8, -0.35], {
        refDistance: 2,
        portalZ: -4.3,
      }),
      loop("garden-birds", 0.23, [2.5, 5, -1], { cutoff: 7000 }),
      event("service-dishes", 0.3, [-3.5, 0.9, -0.6], [18, 35], {
        portalZ: -4.3,
      }),
    ],
  },
  cafe: {
    label: "Quiet conversation, cups and the preparation room",
    music: "music-kissaten",
    musicPosition: [-0.69, 1, -3.84],
    layers: [
      loop("room-murmur", 0.42, [-1.8, 1.2, 1.3], {
        cutoff: 2600,
        portalZ: -4.6,
      }),
      event("service-dishes", 0.55, [2.1, 1.1, -0.8], [10, 21], {
        portalZ: -4.6,
      }),
      event("wood-work", 0.3, [-0.4, 1, -6], [20, 33], { portalZ: -4.6 }),
    ],
  },
  tavern: {
    label: "Low conversation and dishes from the service room",
    layers: [
      loop("room-murmur", 0.58, [-1.5, 1.2, 0.6], {
        cutoff: 2400,
        portalZ: -4.6,
      }),
      event("service-dishes", 0.48, [-0.5, 1, -6.3], [9, 23], {
        portalZ: -4.6,
      }),
      event("wood-work", 0.3, [2.1, 1.1, -2], [24, 40]),
    ],
  },
  herbshop: {
    label: "Paper parcels, wooden drawers and a quiet exterior",
    layers: [
      loop("garden-birds", 0.12, [-5, 2.5, 1.5], { cutoff: 4000 }),
      event("paper-pages", 0.53, [-0.5, 1, -2], [9, 21], { portalZ: -4.6 }),
      event("wood-drawer", 0.28, [2.6, 1.2, -3], [18, 34], { portalZ: -4.6 }),
    ],
  },
  bookshop: {
    label: "Turning pages and birds beyond the reading room",
    layers: [
      loop("garden-birds", 0.15, [-4.7, 2.2, 1], { cutoff: 4200 }),
      event("paper-pages", 0.44, [0, 0.95, 0.4], [12, 26], { portalZ: -4.6 }),
      event("paper-pages", 0.23, [-0.6, 0.9, -6.1], [22, 42], {
        portalZ: -4.6,
      }),
    ],
  },
  workshop: {
    label: "Work-surface handling, paper and the open courtyard",
    layers: [
      loop("garden-birds", 0.2, [4.5, 3.5, 1.5], { cutoff: 6500 }),
      event("wood-work", 0.38, [-0.6, 1.1, -0.9], [12, 23], { portalZ: -4.6 }),
      event("paper-pages", 0.2, [-0.5, 1, -6], [18, 29], {
        cutoff: 4500,
        portalZ: -4.6,
      }),
    ],
  },
  kitchen: {
    label: "A low hearth, utensils and garden birds",
    layers: [
      loop("cooking-fire", 0.48, [-1.38, 0.45, -3.85], {
        refDistance: 2,
        portalZ: -4.6,
      }),
      loop("garden-birds", 0.3, [4.5, 2.5, 2], { cutoff: 7000 }),
      event("wood-work", 0.32, [-1.3, 0.9, -3.8], [14, 28]),
      event("service-dishes", 0.28, [-0.5, 1, -6], [24, 39], { portalZ: -4.6 }),
    ],
  },
};

export function getSoundscapeProfile(family) {
  const profile = SOUNDSCAPES[family];
  if (!profile) throw new RangeError(`Unknown soundscape family: ${family}`);
  return profile;
}

export function musicProfile(ambientProfile, mode) {
  const local = mode === "place" && ambientProfile?.music;
  return {
    label: local ? "Music for this place" : "Atlas theme",
    layers: [
      loop(
        local || "music-atlas-theme",
        0.4,
        local ? ambientProfile.musicPosition : undefined,
        local ? { refDistance: 4, cutoff: 8500, portalZ: -4.6 } : {},
      ),
    ],
  };
}
