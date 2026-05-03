import React from "react";
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

// ---------------------------------------------------------------------------
// Skin tone palette
// ---------------------------------------------------------------------------

export const SKIN_TONE_HEX: Record<string, string> = {
  Ivory:    "#FDEBD6",
  Sand:     "#F0C99A",
  Honey:    "#D4956A",
  Caramel:  "#B5713E",
  Bronze:   "#8B4513",
  Espresso: "#3D1F0D",
};

const HAIR = "#1A1008";

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function lighten(hex: string, pct: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * pct));
  const ng = Math.min(255, Math.round(g + (255 - g) * pct));
  const nb = Math.min(255, Math.round(b + (255 - b) * pct));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

function darken(hex: string, pct: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.max(0, Math.round(r * (1 - pct)));
  const ng = Math.max(0, Math.round(g * (1 - pct)));
  const nb = Math.max(0, Math.round(b * (1 - pct)));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Face shape → head [rx, ry]
// ---------------------------------------------------------------------------

function headDims(faceShape: string): [number, number] {
  switch (faceShape) {
    case "Round":     return [31, 31];
    case "Square":    return [30, 29];
    case "Diamond":   return [25, 35];
    case "Heart":     return [28, 32];
    case "Rectangle": return [24, 37];
    default:          return [27, 34]; // Oval
  }
}

// ---------------------------------------------------------------------------
// Shared geometry — used by BOTH AvatarRenderer and getBodyZones
// ---------------------------------------------------------------------------

function buildGeometry(config: AvatarConfig) {
  const { widthFactor, heightFactor, faceShape } = config;
  const [headRx, headRy] = headDims(faceShape);
  const cx = 100;

  // Width measurements (half-widths from cx)
  const shoulderHW = 42 + widthFactor * 22;   // 42–64
  const waistHW    = 24 + widthFactor * 16;   // 24–40
  const hipHW      = 32 + widthFactor * 22;   // 32–54
  const neckHW     =  9 + widthFactor * 2;    //  9–11
  const uArmHW     = 12 + widthFactor * 4;    // 12–16  upper arm half-width
  const fArmHW     =  8 + widthFactor * 3;    //  8–11  forearm half-width
  const legGap     =  5 + widthFactor * 2;    //  5–7   gap between legs

  // Key Y positions
  const headCy    = 65;
  const neckTop   = headCy + headRy - 5;
  const neckBot   = neckTop + 26;
  const shoulderY = neckBot + 4;
  const elbowY    = shoulderY + 76;
  const wristY    = elbowY + 66;
  const waistY    = shoulderY + 96;
  const hipTop    = waistY + 8;
  const hipBot    = waistY + 30;
  const kneeY     = hipBot + 80 + heightFactor * 18;
  const ankleY    = kneeY  + 60 + heightFactor * 18;
  const footY     = ankleY + 14;
  const legEnd    = ankleY; // used by getBodyZones
  const totalH    = footY  + 10;

  // Per-leg derived widths
  const thighW    = hipHW - legGap;               // full width of one leg at thigh
  const kneeInset = thighW * 0.26;                // outer edge moves inward thigh→knee
  const ankleInset= thighW * 0.62;                // outer edge moves inward thigh→ankle

  return {
    cx, headRx, headRy,
    shoulderHW, waistHW, hipHW, neckHW, uArmHW, fArmHW, legGap,
    headCy, neckTop, neckBot, shoulderY, elbowY, wristY,
    waistY, hipTop, hipBot, kneeY, ankleY, footY, legEnd, totalH,
    thighW, kneeInset, ankleInset,
  };
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AvatarConfig {
  skinToneHex: string;
  heightFactor: number;
  widthFactor:  number;
  faceShape:    string;
}

export interface BodyZones {
  top:      { left: number; top: number; width: number; height: number };
  bottom:   { left: number; top: number; width: number; height: number };
  dress:    { left: number; top: number; width: number; height: number };
  outerwear:{ left: number; top: number; width: number; height: number };
  shoes:    { left: number; top: number; width: number; height: number };
  avatarTotalHeight: number;
}

// ---------------------------------------------------------------------------
// Body zone computation (clothing overlay in Studio)
// ---------------------------------------------------------------------------

export function getBodyZones(config: AvatarConfig, renderWidth: number): BodyZones {
  const VW = 200;
  const scale = renderWidth / VW;
  const g = buildGeometry(config);
  const s = (v: number) => v * scale;

  return {
    top: {
      left:   s(g.cx - g.shoulderHW),
      top:    s(g.shoulderY),
      width:  s(g.shoulderHW * 2),
      height: s(g.waistY - g.shoulderY + 8),
    },
    outerwear: {
      left:   s(g.cx - g.shoulderHW - 5),
      top:    s(g.shoulderY - 4),
      width:  s((g.shoulderHW + 5) * 2),
      height: s(g.waistY - g.shoulderY + 14),
    },
    bottom: {
      left:   s(g.cx - g.hipHW),
      top:    s(g.hipBot),
      width:  s(g.hipHW * 2),
      height: s(g.legEnd - g.hipBot),
    },
    dress: {
      left:   s(g.cx - g.shoulderHW),
      top:    s(g.shoulderY),
      width:  s(g.shoulderHW * 2),
      height: s(g.legEnd - g.shoulderY),
    },
    shoes: {
      left:   s(g.cx - g.hipHW * 0.82),
      top:    s(g.legEnd - 10),
      width:  s(g.hipHW * 1.64),
      height: s(32),
    },
    avatarTotalHeight: s(g.totalH),
  };
}

// ---------------------------------------------------------------------------
// Avatar renderer — semi-realistic skin mannequin with SVG gradient shading
// ---------------------------------------------------------------------------

interface Props {
  config: AvatarConfig;
  size?:  number;
}

export function AvatarRenderer({ config, size = 280 }: Props) {
  let base = config.skinToneHex;
  if (!base || base.length < 4) base = "#F0C99A"; // fallback

  const hi  = lighten(base, 0.22);
  const sh  = darken(base,  0.18);
  const dsh = darken(base,  0.34);

  const VW = 200;
  const g  = buildGeometry(config);
  const {
    cx, headRx, headRy,
    shoulderHW, waistHW, hipHW, neckHW, uArmHW, fArmHW, legGap,
    headCy, neckTop, neckBot, shoulderY, elbowY, wristY,
    waistY, hipTop, hipBot, kneeY, ankleY, footY, totalH,
    thighW, kneeInset, ankleInset,
  } = g;

  const aspect = totalH / VW;

  // -------------------------------------------------------------------------
  // SVG paths
  // -------------------------------------------------------------------------

  // Neck — smooth tapered column
  const neckPath = [
    `M ${cx - neckHW - 1} ${neckTop}`,
    `C ${cx - neckHW - 2} ${neckTop + 8},  ${cx - neckHW}     ${neckBot - 6},  ${cx - neckHW}     ${neckBot}`,
    `L ${cx + neckHW}     ${neckBot}`,
    `C ${cx + neckHW}     ${neckBot - 6},  ${cx + neckHW + 2} ${neckTop + 8},  ${cx + neckHW + 1} ${neckTop}`,
    `Z`,
  ].join(" ");

  // Torso — smooth hourglass: shoulders → waist indent → hip flare
  const torsoPath = [
    `M ${cx - shoulderHW} ${shoulderY}`,
    `C ${cx - shoulderHW}     ${shoulderY + 32},  ${cx - waistHW - 7}  ${waistY - 24},  ${cx - waistHW} ${waistY}`,
    `C ${cx - waistHW - 3}    ${waistY + 18},     ${cx - hipHW + 2}    ${hipTop - 5},   ${cx - hipHW}   ${hipTop}`,
    `L ${cx - hipHW}   ${hipBot}`,
    `L ${cx + hipHW}   ${hipBot}`,
    `L ${cx + hipHW}   ${hipTop}`,
    `C ${cx + hipHW - 2}      ${hipTop - 5},      ${cx + waistHW + 3}  ${waistY + 18},  ${cx + waistHW} ${waistY}`,
    `C ${cx + waistHW + 7}    ${waistY - 24},     ${cx + shoulderHW}   ${shoulderY + 32},${cx + shoulderHW} ${shoulderY}`,
    `Z`,
  ].join(" ");

  // Left upper arm — tapered cylinder hanging from shoulder
  const lShX = cx - shoulderHW;
  const lUA = [
    `M ${lShX - uArmHW}     ${shoulderY + 2}`,
    `C ${lShX - uArmHW - 2} ${elbowY - 26},  ${lShX - uArmHW}     ${elbowY - 6},  ${lShX - uArmHW}     ${elbowY}`,
    `L ${lShX + uArmHW - 2} ${elbowY}`,
    `C ${lShX + uArmHW - 2} ${elbowY - 6},   ${lShX + uArmHW}     ${shoulderY + 26}, ${lShX + uArmHW} ${shoulderY + 2}`,
    `Z`,
  ].join(" ");

  // Left forearm — slightly narrower, tapers to wrist
  const lFA = [
    `M ${lShX - uArmHW}     ${elbowY}`,
    `C ${lShX - fArmHW - 2} ${elbowY + 22},  ${lShX - fArmHW - 1} ${wristY - 14}, ${lShX - fArmHW} ${wristY}`,
    `L ${lShX + fArmHW - 2} ${wristY}`,
    `C ${lShX + fArmHW - 2} ${wristY - 14},  ${lShX + uArmHW - 2} ${elbowY + 22}, ${lShX + uArmHW - 2} ${elbowY}`,
    `Z`,
  ].join(" ");

  // Right upper arm (mirror)
  const rShX = cx + shoulderHW;
  const rUA = [
    `M ${rShX + uArmHW}     ${shoulderY + 2}`,
    `C ${rShX + uArmHW + 2} ${elbowY - 26},  ${rShX + uArmHW}     ${elbowY - 6},  ${rShX + uArmHW}     ${elbowY}`,
    `L ${rShX - uArmHW + 2} ${elbowY}`,
    `C ${rShX - uArmHW + 2} ${elbowY - 6},   ${rShX - uArmHW}     ${shoulderY + 26}, ${rShX - uArmHW} ${shoulderY + 2}`,
    `Z`,
  ].join(" ");

  // Right forearm (mirror)
  const rFA = [
    `M ${rShX + uArmHW}     ${elbowY}`,
    `C ${rShX + fArmHW + 2} ${elbowY + 22},  ${rShX + fArmHW + 1} ${wristY - 14}, ${rShX + fArmHW} ${wristY}`,
    `L ${rShX - fArmHW + 2} ${wristY}`,
    `C ${rShX - fArmHW + 2} ${wristY - 14},  ${rShX - uArmHW + 2} ${elbowY + 22}, ${rShX - uArmHW + 2} ${elbowY}`,
    `Z`,
  ].join(" ");

  // Left leg — thigh widens, tapers through knee → calf → ankle
  const liX = cx - legGap;          // inner x (right side of left leg)
  const loX = cx - hipHW;           // outer x (left side of left leg) at thigh
  const leftLeg = [
    `M ${liX}               ${hipBot}`,
    `C ${liX}               ${hipBot + 32}, ${liX + 1}              ${kneeY - 16}, ${liX + 1}             ${kneeY}`,
    `C ${liX + 1}           ${kneeY + 20},  ${liX + 3}              ${ankleY - 14}, ${liX + 3}            ${ankleY}`,
    `L ${liX - ankleInset}  ${ankleY}`,
    `C ${liX - ankleInset - 4} ${ankleY - 14}, ${liX - thighW + kneeInset + 2} ${kneeY + 20}, ${loX + kneeInset}  ${kneeY}`,
    `C ${loX + kneeInset - 2}  ${kneeY - 16},  ${loX + 2}          ${hipBot + 32}, ${loX}                 ${hipBot}`,
    `Z`,
  ].join(" ");

  // Right leg (mirror)
  const riX = cx + legGap;
  const roX = cx + hipHW;
  const rightLeg = [
    `M ${riX}               ${hipBot}`,
    `C ${riX}               ${hipBot + 32}, ${riX - 1}              ${kneeY - 16}, ${riX - 1}             ${kneeY}`,
    `C ${riX - 1}           ${kneeY + 20},  ${riX - 3}              ${ankleY - 14}, ${riX - 3}            ${ankleY}`,
    `L ${riX + ankleInset}  ${ankleY}`,
    `C ${riX + ankleInset + 4} ${ankleY - 14}, ${riX + thighW - kneeInset - 2} ${kneeY + 20}, ${roX - kneeInset}  ${kneeY}`,
    `C ${roX - kneeInset + 2}  ${kneeY - 16},  ${roX - 2}          ${hipBot + 32}, ${roX}                 ${hipBot}`,
    `Z`,
  ].join(" ");

  // Foot ovals
  const footHW = thighW * 0.22;
  const lFootCx = (liX + loX) / 2;
  const rFootCx = (riX + roX) / 2;

  return (
    <Svg
      width={size}
      height={size * aspect}
      viewBox={`0 0 ${VW} ${totalH}`}
    >
      <Defs>
        {/* Horizontal cylindrical gradient — makes flat shapes appear round */}
        <LinearGradient id="sgH" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%"   stopColor={dsh} stopOpacity="1" />
          <Stop offset="26%"  stopColor={base} stopOpacity="1" />
          <Stop offset="50%"  stopColor={hi}   stopOpacity="1" />
          <Stop offset="74%"  stopColor={base} stopOpacity="1" />
          <Stop offset="100%" stopColor={dsh}  stopOpacity="1" />
        </LinearGradient>

        {/* Radial face gradient — soft highlight from upper-left */}
        <RadialGradient id="sgFace" cx="40%" cy="35%" rx="56%" ry="58%">
          <Stop offset="0%"   stopColor={hi}   stopOpacity="1" />
          <Stop offset="60%"  stopColor={base}  stopOpacity="1" />
          <Stop offset="100%" stopColor={sh}   stopOpacity="1" />
        </RadialGradient>

        {/* Hair gradient */}
        <LinearGradient id="sgHair" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={darken(HAIR, 0.08)} stopOpacity="1" />
          <Stop offset="100%" stopColor={HAIR}               stopOpacity="1" />
        </LinearGradient>

        {/* Arm gradient — same as body but anchored within narrower bounding box */}
        <LinearGradient id="sgArm" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%"   stopColor={dsh}  stopOpacity="1" />
          <Stop offset="30%"  stopColor={base} stopOpacity="1" />
          <Stop offset="52%"  stopColor={hi}   stopOpacity="1" />
          <Stop offset="70%"  stopColor={base} stopOpacity="1" />
          <Stop offset="100%" stopColor={dsh}  stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* ── ARMS (drawn behind torso so body naturally covers attachment) ── */}
      <Path d={lUA}  fill="url(#sgArm)" />
      <Path d={lFA}  fill="url(#sgArm)" />
      <Path d={rUA}  fill="url(#sgArm)" />
      <Path d={rFA}  fill="url(#sgArm)" />

      {/* ── LEGS ── */}
      <Path d={leftLeg}  fill="url(#sgH)" />
      <Path d={rightLeg} fill="url(#sgH)" />

      {/* Foot ovals */}
      <Ellipse cx={lFootCx} cy={footY} rx={footHW} ry={6} fill={sh} />
      <Ellipse cx={rFootCx} cy={footY} rx={footHW} ry={6} fill={sh} />

      {/* ── TORSO (covers arm-body join) ── */}
      <Path d={torsoPath} fill="url(#sgH)" />

      {/* ── NECK ── */}
      <Path d={neckPath} fill="url(#sgH)" />

      {/* ── HAIR CAP (slightly larger ellipse behind face) ── */}
      <Ellipse
        cx={cx}
        cy={headCy - 4}
        rx={headRx + 3}
        ry={headRy + 4}
        fill="url(#sgHair)"
      />

      {/* ── FACE ── */}
      <Ellipse
        cx={cx}
        cy={headCy}
        rx={headRx}
        ry={headRy}
        fill="url(#sgFace)"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Config computation from Phase 1 raw data
// ---------------------------------------------------------------------------

export function computeAvatarConfig(
  heightValue: number | null,
  heightUnit:  "cm" | "ft",
  weightValue: number | null,
  weightUnit:  "kg" | "lb",
  skinTone:    string | null,
  faceShape:   string | null,
): AvatarConfig {
  const heightCm = toHeightCm(heightValue, heightUnit);
  const weightKg = toWeightKg(weightValue, weightUnit);

  const heightFactor = Math.max(0, Math.min(1, (heightCm - 148) / 54));
  const neutralKg    = heightCm - 102;
  const widthFactor  = Math.max(0, Math.min(1, 0.5 + (weightKg - neutralKg) / 36));

  return {
    skinToneHex: SKIN_TONE_HEX[skinTone ?? ""] ?? "#F0C99A",
    heightFactor,
    widthFactor,
    faceShape: faceShape ?? "Oval",
  };
}

function toHeightCm(value: number | null, unit: "cm" | "ft"): number {
  if (value === null) return 170;
  if (unit === "cm")  return value;
  const idx = value;
  let ft: number, inch: number;
  if (idx < 24) { ft = 4 + Math.floor(idx / 12); inch = idx % 12; }
  else          { ft = 6; inch = idx - 24; }
  return ft * 30.48 + inch * 2.54;
}

function toWeightKg(value: number | null, unit: "kg" | "lb"): number {
  if (value === null) return 70;
  return unit === "kg" ? value : value * 0.453592;
}
