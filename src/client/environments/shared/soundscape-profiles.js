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
