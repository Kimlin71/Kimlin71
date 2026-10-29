export type PatternDimensions = {
  waistMm: number
  heightMm: number
}

export type PatternAdaptationSettings = {
  seamAllowanceMm: number
}

export type AdditionalMeasurement = {
  name: string
  valueMm: number
}

export function centimetersToMillimeters(valueCm: number): number {
  return Number((valueCm * 10).toFixed(1))
}

export function millimetersToCentimeters(valueMm: number): number {
  return valueMm / 10
}

export function formatCentimeters(valueMm: number): string {
  const value = millimetersToCentimeters(valueMm).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return value.includes('.') ? value : `${value}.0`
}

export type Point = { x: number; y: number }
export type Segment = { start: Point; end: Point }

export type PatternGeometry = {
  widthMm: number
  heightMm: number
  outline: Point[]
  grainline: Segment
}

export function validateDimensions(dimensions: PatternDimensions): string | null {
  if (!Number.isFinite(dimensions.waistMm) || dimensions.waistMm <= 0) {
    return 'Enter a waist measurement greater than zero.'
  }
  if (!Number.isFinite(dimensions.heightMm) || dimensions.heightMm <= 0) {
    return 'Enter a height greater than zero.'
  }
  return null
}

export function validatePatternAdaptation(adaptation: PatternAdaptationSettings): string | null {
  if (!Number.isFinite(adaptation.seamAllowanceMm) || adaptation.seamAllowanceMm < 0) {
    return 'Seam allowance cannot be negative.'
  }
  return null
}

export function validateAdditionalMeasurements(measurements: AdditionalMeasurement[]): string | null {
  for (const [index, measurement] of measurements.entries()) {
    const name = measurement.name.trim()
    if (!name) return `Enter a name for additional measurement ${index + 1}.`
    if (!Number.isFinite(measurement.valueMm) || measurement.valueMm <= 0) {
      return `Enter a measurement greater than zero for ${name}.`
    }
  }
  return null
}

export function createPatternGeometry(dimensions: PatternDimensions): PatternGeometry {
  const validationError = validateDimensions(dimensions)
  if (validationError) throw new RangeError(validationError)

  const widthMm = dimensions.waistMm / 4
  const { heightMm } = dimensions
  const centerX = widthMm / 2

  return {
    widthMm,
    heightMm,
    outline: [
      { x: 0, y: 0 },
      { x: widthMm, y: 0 },
      { x: widthMm, y: heightMm },
      { x: 0, y: heightMm },
    ],
    grainline: {
      start: { x: centerX, y: 12 },
      end: { x: centerX, y: heightMm - 12 },
    },
  }
}

export type PatternAdaptation = PatternAdaptationSettings & {
  seamAllowanceMm: number
  cutOutline: Point[]
  cutWidthMm: number
  cutHeightMm: number
}

export function applySeamAllowance(geometry: PatternGeometry, settings: PatternAdaptationSettings): PatternAdaptation {
  const validationError = validatePatternAdaptation(settings)
  if (validationError) throw new RangeError(validationError)
  const { seamAllowanceMm } = settings

  return {
    seamAllowanceMm,
    cutOutline: [
      { x: -seamAllowanceMm, y: -seamAllowanceMm },
      { x: geometry.widthMm + seamAllowanceMm, y: -seamAllowanceMm },
      { x: geometry.widthMm + seamAllowanceMm, y: geometry.heightMm + seamAllowanceMm },
      { x: -seamAllowanceMm, y: geometry.heightMm + seamAllowanceMm },
    ],
    cutWidthMm: geometry.widthMm + seamAllowanceMm * 2,
    cutHeightMm: geometry.heightMm + seamAllowanceMm * 2,
  }
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function pointsAttribute(points: Point[]): string {
  return points.map(({ x, y }) => `${formatNumber(x)},${formatNumber(y)}`).join(' ')
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;',
    }
    return entities[character]
  })
}

export function createPatternSvg(dimensions: PatternDimensions, measurements: AdditionalMeasurement[] = [], settings: PatternAdaptationSettings = { seamAllowanceMm: 0 }): string {
  const geometry = createPatternGeometry(dimensions)
  const measurementError = validateAdditionalMeasurements(measurements)
  if (measurementError) throw new RangeError(measurementError)

  const adaptation = applySeamAllowance(geometry, settings)
  const totalWidth = adaptation.cutWidthMm
  const totalHeight = adaptation.cutHeightMm
  const width = formatNumber(totalWidth)
  const height = formatNumber(totalHeight)
  const seam = formatNumber(adaptation.seamAllowanceMm)
  const grainX = formatNumber(geometry.grainline.start.x + adaptation.seamAllowanceMm)
  const grainStart = formatNumber(geometry.grainline.start.y + adaptation.seamAllowanceMm)
  const grainEnd = formatNumber(geometry.grainline.end.y + adaptation.seamAllowanceMm)
  const stitchOutline = geometry.outline.map(({ x, y }) => ({ x: x + adaptation.seamAllowanceMm, y: y + adaptation.seamAllowanceMm }))
  const cutOutline = adaptation.cutOutline.map(({ x, y }) => ({ x: x + adaptation.seamAllowanceMm, y: y + adaptation.seamAllowanceMm }))
  const grainStartX = geometry.grainline.start.x + adaptation.seamAllowanceMm
  const grainEndX = geometry.grainline.end.x + adaptation.seamAllowanceMm
  const grainStartY = geometry.grainline.start.y + adaptation.seamAllowanceMm
  const grainEndY = geometry.grainline.end.y + adaptation.seamAllowanceMm

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">`,
    '  <title id="title">Pattern Draft Lab — rectangle pattern</title>',
    `  <desc id="description">Pattern piece ${formatNumber(geometry.widthMm)} by ${formatNumber(geometry.heightMm)} millimeters with ${seam} millimeter seam allowance.</desc>`,
    measurements.length > 0
      ? `  <metadata id="additional-measurements">${measurements.map(({ name, valueMm }) => `<measurement name="${escapeXml(name.trim())}" value-cm="${formatNumber(millimetersToCentimeters(valueMm))}"/>`).join('')}</metadata>`
      : '',
    `  <polygon points="${pointsAttribute(cutOutline)}" fill="#fffdf8" stroke="#d58b63" stroke-width="0.4" stroke-dasharray="2 1" data-role="cut-line"/>`,
    `  <polygon points="${pointsAttribute(stitchOutline)}" fill="#d9e9e2" fill-opacity="0.55" stroke="#203c36" stroke-width="0.6" data-role="stitch-line"/>`,
    `  <line x1="${grainX}" y1="${grainStart}" x2="${grainX}" y2="${grainEnd}" stroke="#405e54" stroke-width="0.45" stroke-dasharray="4 1.5" data-role="grainline"/>`,
    `  <path d="M ${formatNumber(grainStartX - 1.4)} ${formatNumber(grainStartY + 3)} L ${grainX} ${grainStart} L ${formatNumber(grainStartX + 1.4)} ${formatNumber(grainStartY + 3)} M ${formatNumber(grainEndX - 1.4)} ${formatNumber(grainEndY - 3)} L ${grainX} ${grainEnd} L ${formatNumber(grainEndX + 1.4)} ${formatNumber(grainEndY - 3)}" fill="none" stroke="#405e54" stroke-width="0.45"/>`,
    `  <text x="${formatNumber(totalWidth / 2)}" y="${formatNumber(geometry.heightMm / 2 + adaptation.seamAllowanceMm)}" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#203c36">${formatNumber(geometry.widthMm)} × ${formatNumber(geometry.heightMm)} mm</text>`,
    '</svg>',
  ].join('\n')
}
