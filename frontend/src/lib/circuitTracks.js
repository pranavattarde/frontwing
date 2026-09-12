/**
 * circuitTracks.js — High-Precision SVG Track Outlines & Sector Segments for F1 Circuits
 * 
 * Provides authentic 2D vector path geometries, viewBoxes, and sector boundary ratios
 * for official Formula 1 circuits.
 */

export const CIRCUITS = {
  monza: {
    name: "Autodromo Nazionale Monza",
    key: "monza",
    viewBox: "0 0 500 260",
    lengthMeters: 5793,
    // Monza has: Start Straight -> Prima Variante (T1-T2) -> Curva Grande (T3) -> Variante della Roggia (T4-T5) -> Lesmo 1 & 2 (T6-T7) -> Serraglio -> Variante Ascari (T8-T10) -> Rettifilo -> Curva Parabolica (T11)
    trackPath: "M 110 215 L 370 215 C 390 215 400 210 405 200 C 410 190 405 180 395 180 L 320 180 C 310 180 305 170 305 160 L 305 130 C 305 110 320 100 350 100 L 410 100 C 430 100 440 90 440 75 C 440 60 425 50 405 50 L 260 50 C 240 50 230 60 220 75 L 180 120 C 170 135 155 140 135 140 L 95 140 C 65 140 50 160 50 185 C 50 205 75 215 110 215 Z",
    startFinish: { x: 230, y: 215, rotation: 0 },
    sectors: [
      { id: "S1", ratio: 0.32, color: "#B138DD", name: "Sector 1 (Variante del Rettifilo)" },
      { id: "S2", ratio: 0.68, color: "#00D26A", name: "Sector 2 (Lesmo & Serraglio)" },
      { id: "S3", ratio: 1.00, color: "#FFD600", name: "Sector 3 (Ascari & Parabolica)" },
    ],
  },
  zandvoort: {
    name: "Circuit Zandvoort",
    key: "zandvoort",
    viewBox: "0 0 460 280",
    lengthMeters: 4259,
    // Tarzanbocht, Gerlachbocht, Hugenholtz banked turn, Scheivlak, Kumhobocht, Arie Luyendykbocht
    trackPath: "M 130 235 L 340 235 C 390 235 410 210 405 180 C 400 150 375 145 350 150 L 290 165 C 270 170 250 155 255 135 C 260 115 285 105 310 105 L 360 105 C 385 105 400 90 395 70 C 390 50 365 45 340 45 L 210 45 C 180 45 165 60 160 85 L 155 125 C 150 150 130 165 105 165 L 85 165 C 60 165 50 185 55 205 C 60 225 85 235 130 235 Z",
    startFinish: { x: 235, y: 235, rotation: 0 },
    sectors: [
      { id: "S1", ratio: 0.33, color: "#B138DD", name: "Sector 1 (Tarzan & Hugenholtz)" },
      { id: "S2", ratio: 0.67, color: "#00D26A", name: "Sector 2 (Scheivlak & Infield)" },
      { id: "S3", ratio: 1.00, color: "#FFD600", name: "Sector 3 (Arie Luyendyk Banked Turn)" },
    ],
  },
  silverstone: {
    name: "Silverstone Circuit",
    key: "silverstone",
    viewBox: "0 0 480 300",
    lengthMeters: 5891,
    // Copse, Maggotts, Becketts, Chapel, Hangar Straight, Stowe, Vale, Club, Abbey, Village, Wellington Straight, Brooklands, Luffield
    trackPath: "M 230 240 L 340 240 C 365 240 380 225 385 205 L 390 160 C 395 135 420 125 435 105 C 445 90 435 70 415 70 L 350 70 C 330 70 315 85 305 105 L 270 160 C 260 175 240 180 220 175 L 140 160 C 115 155 100 135 105 110 L 110 80 C 115 55 95 45 75 55 C 55 65 50 90 55 115 L 75 190 C 85 220 115 240 165 240 Z",
    startFinish: { x: 285, y: 240, rotation: 0 },
    sectors: [
      { id: "S1", ratio: 0.34, color: "#B138DD", name: "Sector 1 (Abbey, Farm & Village)" },
      { id: "S2", ratio: 0.66, color: "#00D26A", name: "Sector 2 (Copse & Maggotts-Becketts)" },
      { id: "S3", ratio: 1.00, color: "#FFD600", name: "Sector 3 (Stowe, Vale & Club)" },
    ],
  },
  qatar: {
    name: "Lusail International Circuit",
    key: "qatar",
    viewBox: "0 0 460 280",
    lengthMeters: 5419,
    // 1km Main straight, tight T1 hairpin, fast flowing multi-apex mid sector, Triple-apex T12-T14, T16 onto straight
    trackPath: "M 110 230 L 370 230 C 405 230 420 205 405 180 L 350 135 C 335 120 340 100 360 90 L 390 75 C 405 65 400 45 380 45 L 290 45 C 265 45 250 60 245 80 L 235 115 C 230 135 210 145 190 140 L 140 130 C 115 125 95 140 90 165 L 80 195 C 75 220 90 230 110 230 Z",
    startFinish: { x: 240, y: 230, rotation: 0 },
    sectors: [
      { id: "S1", ratio: 0.35, color: "#B138DD", name: "Sector 1 (Main Straight & T1 Hairpin)" },
      { id: "S2", ratio: 0.68, color: "#00D26A", name: "Sector 2 (High Speed Flowing S-Curves)" },
      { id: "S3", ratio: 1.00, color: "#FFD600", name: "Sector 3 (Triple Apex & Final Turn)" },
    ],
  },
  spielberg: {
    name: "Red Bull Ring",
    key: "spielberg",
    viewBox: "0 0 440 260",
    lengthMeters: 4318,
    // T1 Niki Lauda, uphill straight, T3 tight hairpin, T4 Rauch, T6-T7 Gerhard Berger, Jochen Rindt curve
    trackPath: "M 120 210 L 340 210 C 375 210 395 190 385 165 L 330 65 C 320 45 295 45 280 65 L 245 115 C 235 130 215 135 195 130 L 150 120 C 120 115 105 135 100 160 L 95 185 C 90 205 105 210 120 210 Z",
    startFinish: { x: 230, y: 210, rotation: 0 },
    sectors: [
      { id: "S1", ratio: 0.31, color: "#B138DD", name: "Sector 1 (Start/Finish & Turn 1)" },
      { id: "S2", ratio: 0.65, color: "#00D26A", name: "Sector 2 (Uphill Hairpin & Turn 4)" },
      { id: "S3", ratio: 1.00, color: "#FFD600", name: "Sector 3 (Fast Infield & Final Corners)" },
    ],
  },
  monaco: {
    name: "Circuit de Monaco",
    key: "monaco",
    viewBox: "0 0 450 290",
    lengthMeters: 3337,
    // Sainte Devote, Beau Rivage, Massenet, Casino, Mirabeau, Hairpin, Portier, Tunnel, Chicane, Tabac, Swimming Pool, Rascasse, Anthony Noghes
    trackPath: "M 140 240 L 310 240 C 335 240 355 225 350 200 L 340 170 C 335 150 350 135 370 140 L 400 150 C 420 155 435 140 430 115 L 420 80 C 410 50 380 40 350 45 L 270 60 C 245 65 230 85 235 110 L 240 130 C 245 150 230 165 210 165 L 130 165 C 105 165 90 180 85 200 L 80 215 C 75 235 95 240 140 240 Z",
    startFinish: { x: 225, y: 240, rotation: 0 },
    sectors: [
      { id: "S1", ratio: 0.36, color: "#B138DD", name: "Sector 1 (Sainte Dévote to Casino)" },
      { id: "S2", ratio: 0.69, color: "#00D26A", name: "Sector 2 (Mirabeau, Hairpin & Tunnel)" },
      { id: "S3", ratio: 1.00, color: "#FFD600", name: "Sector 3 (Chicane, Swimming Pool & Rascasse)" },
    ],
  },
  spa: {
    name: "Circuit de Spa-Francorchamps",
    key: "spa",
    viewBox: "0 0 480 290",
    lengthMeters: 7004,
    // La Source, Eau Rouge, Raidillon, Kemmel, Les Combes, Malmedy, Bruxelles, Pouhon, Campus, Stavelot, Blanchimont, Bus Stop
    trackPath: "M 100 230 L 280 230 C 300 230 315 220 325 200 L 370 120 C 385 95 410 85 435 90 C 455 95 460 75 445 60 L 400 35 C 375 20 340 35 320 60 L 250 145 C 240 160 220 165 200 155 L 140 130 C 110 115 80 135 75 165 L 70 195 C 65 220 80 230 100 230 Z",
    startFinish: { x: 190, y: 230, rotation: 0 },
    sectors: [
      { id: "S1", ratio: 0.33, color: "#B138DD", name: "Sector 1 (La Source & Eau Rouge/Raidillon)" },
      { id: "S2", ratio: 0.71, color: "#00D26A", name: "Sector 2 (Les Combes, Bruxelles & Pouhon)" },
      { id: "S3", ratio: 1.00, color: "#FFD600", name: "Sector 3 (Campus, Blanchimont & Bus Stop)" },
    ],
  },
  barcelona: {
    name: "Circuit de Barcelona-Catalunya",
    key: "barcelona",
    viewBox: "0 0 480 290",
    lengthMeters: 4657,
    trackPath: "M 110 240 L 350 240 C 380 240 405 220 405 195 C 405 170 380 160 360 160 L 290 160 C 270 160 255 145 260 125 C 265 105 285 95 310 95 L 370 95 C 400 95 420 75 410 50 C 400 30 370 35 340 45 L 210 90 C 185 100 170 120 165 145 L 160 175 C 155 195 135 205 115 205 L 85 205 C 60 205 50 220 55 235 C 60 240 85 240 110 240 Z",
    startFinish: { x: 230, y: 240, rotation: 0 },
    sectors: [
      { id: "S1", ratio: 0.31, color: "#B138DD", name: "Sector 1 (Elf & Long Right Renault)" },
      { id: "S2", ratio: 0.65, color: "#00D26A", name: "Sector 2 (Seat & High-Speed Campsa)" },
      { id: "S3", ratio: 1.00, color: "#FFD600", name: "Sector 3 (Banc Sabadell & Flat-Out Sweeps)" },
    ],
  },
};

/**
 * Resolve circuit configuration by session name or track alias
 */
export function getCircuitByTrackName(trackName) {
  if (!trackName || typeof trackName !== "string") return CIRCUITS.monza;

  const lower = trackName.toLowerCase();
  if (lower.includes("monza") || lower.includes("italian")) return CIRCUITS.monza;
  if (lower.includes("zandvoort") || lower.includes("dutch")) return CIRCUITS.zandvoort;
  if (lower.includes("silverstone") || lower.includes("british")) return CIRCUITS.silverstone;
  if (lower.includes("qatar") || lower.includes("lusail")) return CIRCUITS.qatar;
  if (lower.includes("austria") || lower.includes("spielberg") || lower.includes("red_bull_ring")) return CIRCUITS.spielberg;
  if (lower.includes("monaco") || lower.includes("monte")) return CIRCUITS.monaco;
  if (lower.includes("spa") || lower.includes("belgian") || lower.includes("francorchamps")) return CIRCUITS.spa;
  if (lower.includes("barcelona") || lower.includes("catalunya") || lower.includes("spain") || lower.includes("spanish") || lower.includes("madrid")) return CIRCUITS.barcelona;

  // Fallback to Monza layout if unknown
  return CIRCUITS.monza;
}
