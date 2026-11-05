import {
  buildNewarPottersSquare,
  buildVenetianBoatyard,
  buildAndeanLane,
} from "./outdoor-streets.js";
import {
  buildMadrasaCourtyard,
  buildSwahiliVerandah,
  buildLaoTempleCourt,
} from "./outdoor-architecture.js";
import { buildSubakTerraces, buildNaxiCanal } from "./outdoor-landscapes.js";
import { buildBahianSquare, buildTunisianCafe } from "./outdoor-coasts.js";
import { buildDouroVineyard } from "./douro-vineyard.js";
import { buildAlfamaHillside } from "./alfama-hillside.js";

export const outdoorBuilders = {
  "alfama-hillside": buildAlfamaHillside,
  "douro-vineyard": buildDouroVineyard,
  "newar-potters-square": buildNewarPottersSquare,
  "central-asian-madrasa": buildMadrasaCourtyard,
  "balinese-subak-terraces": buildSubakTerraces,
  "venetian-boatyard": buildVenetianBoatyard,
  "bahian-neighborhood-square": buildBahianSquare,
  "andean-stone-lane": buildAndeanLane,
  "swahili-verandah": buildSwahiliVerandah,
  "naxi-canal-quarter": buildNaxiCanal,
  "tunisian-terrace-cafe": buildTunisianCafe,
  "lao-temple-court": buildLaoTempleCourt,
};

export function buildOutdoorEnvironment(definition, renderer) {
  const build = outdoorBuilders[definition.id];
  if (!build)
    throw new Error(
      `No outdoor environment is registered for ${definition.id}.`,
    );
  return build(definition, renderer);
}
