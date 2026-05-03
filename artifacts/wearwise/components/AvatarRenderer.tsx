import React from "react";
import Svg, { Ellipse, Path, Rect } from "react-native-svg";

export const SKIN_TONE_HEX: Record<string, string> = {
  Ivory: "#FDEBD6",
  Sand: "#F0C99A",
  Honey: "#D4956A",
  Caramel: "#B5713E",
  Bronze: "#8B4513",
  Espresso: "#3D1F0D",
};

const HAIR = "#1A1008";
const SHIRT = "#C8C8D2";
const PANTS = "#78788A";
const STROKE = "rgba(0,0,0,0.06)";

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

export interface AvatarConfig {
  skinToneHex: string;
  heightFactor: number;
  widthFactor: number;
  faceShape: string;
}

interface Props {
  config: AvatarConfig;
  size?: number;
}

export function AvatarRenderer({ config, size = 280 }: Props) {
  const { skinToneHex, heightFactor, widthFactor, faceShape } = config;
  const skin = skinToneHex || "#F0C99A";

  const VW = 200;
  const cx = 100;

  const [headRx, headRy] = headDims(faceShape);

  const shoulderHW = 42 + widthFactor * 22;
  const waistHW    = 28 + widthFactor * 16;
  const hipHW      = 34 + widthFactor * 20;
  const legHW      = hipHW * 0.48;

  const headCy    = 66;
  const neckTop   = headCy + headRy - 4;
  const neckBot   = neckTop + 22;
  const shoulderY = neckBot + 4;
  const elbowY    = shoulderY + 66;
  const waistY    = shoulderY + 90;
  const hipBot    = waistY + 26;
  const legEnd    = hipBot + 128 + heightFactor * 52;
  const totalH    = legEnd + 18;

  const torsoPath = [
    `M ${cx - shoulderHW} ${shoulderY}`,
    `C ${cx - waistHW - 5} ${shoulderY + 28}, ${cx - waistHW} ${waistY - 18}, ${cx - waistHW} ${waistY}`,
    `L ${cx + waistHW} ${waistY}`,
    `C ${cx + waistHW} ${waistY - 18}, ${cx + waistHW + 5} ${shoulderY + 28}, ${cx + shoulderHW} ${shoulderY}`,
    `Z`,
  ].join(" ");

  const armLPath = [
    `M ${cx - shoulderHW + 10} ${shoulderY}`,
    `L ${cx - shoulderHW - 10} ${elbowY}`,
    `L ${cx - shoulderHW + 2} ${elbowY}`,
    `L ${cx - shoulderHW + 22} ${shoulderY}`,
    `Z`,
  ].join(" ");

  const armRPath = [
    `M ${cx + shoulderHW - 10} ${shoulderY}`,
    `L ${cx + shoulderHW + 10} ${elbowY}`,
    `L ${cx + shoulderHW - 2} ${elbowY}`,
    `L ${cx + shoulderHW - 22} ${shoulderY}`,
    `Z`,
  ].join(" ");

  const hipsPath = [
    `M ${cx - waistHW} ${waistY}`,
    `C ${cx - waistHW - 6} ${waistY + 10}, ${cx - hipHW} ${hipBot - 8}, ${cx - hipHW} ${hipBot}`,
    `L ${cx + hipHW} ${hipBot}`,
    `C ${cx + hipHW} ${hipBot - 8}, ${cx + waistHW + 6} ${waistY + 10}, ${cx + waistHW} ${waistY}`,
    `Z`,
  ].join(" ");

  const legGap = 5;
  const legLPath = [
    `M ${cx - hipHW} ${hipBot}`,
    `L ${cx - hipHW} ${legEnd}`,
    `L ${cx - legGap} ${legEnd}`,
    `L ${cx - legGap} ${hipBot}`,
    `Z`,
  ].join(" ");

  const legRPath = [
    `M ${cx + legGap} ${hipBot}`,
    `L ${cx + legGap} ${legEnd}`,
    `L ${cx + hipHW} ${legEnd}`,
    `L ${cx + hipHW} ${hipBot}`,
    `Z`,
  ].join(" ");

  const aspect = totalH / VW;

  return (
    <Svg width={size} height={size * aspect} viewBox={`0 0 ${VW} ${totalH}`}>
      {/* Arms */}
      <Path d={armLPath} fill={SHIRT} stroke={STROKE} strokeWidth={0.5} />
      <Path d={armRPath} fill={SHIRT} stroke={STROKE} strokeWidth={0.5} />

      {/* Hips + legs */}
      <Path d={hipsPath} fill={PANTS} stroke={STROKE} strokeWidth={0.5} />
      <Path d={legLPath} fill={PANTS} stroke={STROKE} strokeWidth={0.5} />
      <Path d={legRPath} fill={PANTS} stroke={STROKE} strokeWidth={0.5} />

      {/* Torso */}
      <Path d={torsoPath} fill={SHIRT} stroke={STROKE} strokeWidth={0.5} />

      {/* Neck */}
      <Rect
        x={cx - 10}
        y={neckTop}
        width={20}
        height={neckBot - neckTop + 6}
        fill={skin}
      />

      {/* Hair cap (slightly larger ellipse behind head) */}
      <Ellipse
        cx={cx}
        cy={headCy - 3}
        rx={headRx + 3}
        ry={headRy + 3}
        fill={HAIR}
      />

      {/* Head */}
      <Ellipse
        cx={cx}
        cy={headCy}
        rx={headRx}
        ry={headRy}
        fill={skin}
        stroke={STROKE}
        strokeWidth={0.5}
      />
    </Svg>
  );
}

export interface BodyZones {
  top: { left: number; top: number; width: number; height: number };
  bottom: { left: number; top: number; width: number; height: number };
  dress: { left: number; top: number; width: number; height: number };
  outerwear: { left: number; top: number; width: number; height: number };
  shoes: { left: number; top: number; width: number; height: number };
  avatarTotalHeight: number;
}

export function getBodyZones(config: AvatarConfig, renderWidth: number): BodyZones {
  const VW = 200;
  const scale = renderWidth / VW;
  const { widthFactor, heightFactor, faceShape } = config;

  const [, headRy] = headDims(faceShape);

  const shoulderHW = 42 + widthFactor * 22;
  const hipHW      = 34 + widthFactor * 20;

  const headCy    = 66;
  const neckTop   = headCy + headRy - 4;
  const neckBot   = neckTop + 22;
  const shoulderY = neckBot + 4;
  const waistY    = shoulderY + 90;
  const hipBot    = waistY + 26;
  const legEnd    = hipBot + 128 + heightFactor * 52;
  const totalH    = legEnd + 18;

  const cx = 100;
  const s = (v: number) => v * scale;

  return {
    top: {
      left: s(cx - shoulderHW),
      top: s(shoulderY),
      width: s(shoulderHW * 2),
      height: s(waistY - shoulderY + 8),
    },
    outerwear: {
      left: s(cx - shoulderHW - 5),
      top: s(shoulderY - 4),
      width: s((shoulderHW + 5) * 2),
      height: s(waistY - shoulderY + 14),
    },
    bottom: {
      left: s(cx - hipHW),
      top: s(hipBot),
      width: s(hipHW * 2),
      height: s(legEnd - hipBot),
    },
    dress: {
      left: s(cx - shoulderHW),
      top: s(shoulderY),
      width: s(shoulderHW * 2),
      height: s(legEnd - shoulderY),
    },
    shoes: {
      left: s(cx - hipHW * 0.82),
      top: s(legEnd - 10),
      width: s(hipHW * 1.64),
      height: s(32),
    },
    avatarTotalHeight: s(totalH),
  };
}

export function computeAvatarConfig(
  heightValue: number | null,
  heightUnit: "cm" | "ft",
  weightValue: number | null,
  weightUnit: "kg" | "lb",
  skinTone: string | null,
  faceShape: string | null,
): AvatarConfig {
  const heightCm = toHeightCm(heightValue, heightUnit);
  const weightKg = toWeightKg(weightValue, weightUnit);

  const heightFactor = Math.max(0, Math.min(1, (heightCm - 148) / 54));

  const neutralKg = heightCm - 102;
  const widthFactor = Math.max(0, Math.min(1, 0.5 + (weightKg - neutralKg) / 36));

  return {
    skinToneHex: SKIN_TONE_HEX[skinTone ?? ""] ?? "#F0C99A",
    heightFactor,
    widthFactor,
    faceShape: faceShape ?? "Oval",
  };
}

function toHeightCm(value: number | null, unit: "cm" | "ft"): number {
  if (value === null) return 170;
  if (unit === "cm") return value;
  const idx = value;
  let ft: number, inch: number;
  if (idx < 24) {
    ft = 4 + Math.floor(idx / 12);
    inch = idx % 12;
  } else {
    ft = 6;
    inch = idx - 24;
  }
  return ft * 30.48 + inch * 2.54;
}

function toWeightKg(value: number | null, unit: "kg" | "lb"): number {
  if (value === null) return 70;
  return unit === "kg" ? value : value * 0.453592;
}
