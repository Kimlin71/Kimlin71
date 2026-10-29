import { describe, expect, it } from 'vitest'
import { applySeamAllowance, centimetersToMillimeters, createPatternGeometry, createPatternSvg, millimetersToCentimeters, validateAdditionalMeasurements, validateDimensions, validatePatternAdaptation } from './pattern'

const example = { waistMm: 600, heightMm: 200 }
const adaptationSettings = { seamAllowanceMm: 12.7 }

describe('pattern dimensions', () => {
  it('converts decimal centimeters to millimeters and back', () => {
    expect(centimetersToMillimeters(60.25)).toBe(602.5)
    expect(millimetersToCentimeters(12.7)).toBe(1.27)
  })

  it('derives the rectangle width from one quarter of the waist', () => {
    expect(createPatternGeometry(example).widthMm).toBe(150)
  })

  it('keeps seam allowance out of master geometry and applies it as a separate adaptation', () => {
    const geometry = createPatternGeometry(example)
    expect(geometry.outline[0]).toEqual({ x: 0, y: 0 })
    expect(geometry.outline[2]).toEqual({ x: 150, y: 200 })

    const adaptation = applySeamAllowance(geometry, adaptationSettings)
    expect(adaptation.cutOutline[0]).toEqual({ x: -12.7, y: -12.7 })
    expect(adaptation.cutOutline[2]).toEqual({ x: 162.7, y: 212.7 })
    expect(adaptation.cutWidthMm).toBe(175.4)
    expect(adaptation.cutHeightMm).toBe(225.4)
    expect(geometry.outline[0]).toEqual({ x: 0, y: 0 })
  })

  it('rejects negative or non-finite adaptation allowances', () => {
    const geometry = createPatternGeometry(example)
    expect(() => applySeamAllowance(geometry, { seamAllowanceMm: -1 })).toThrow(/negative/i)
    expect(() => applySeamAllowance(geometry, { seamAllowanceMm: Number.NaN })).toThrow(/negative/i)
  })

  it('rejects invalid measurements', () => {
    expect(validateDimensions({ ...example, waistMm: 0 })).toMatch(/waist/i)
    expect(validateDimensions({ ...example, heightMm: Number.NaN })).toMatch(/height/i)
    expect(validatePatternAdaptation({ seamAllowanceMm: -1 })).toMatch(/negative/i)
  })

  it('requires a name and a positive value for each additional measurement', () => {
    expect(validateAdditionalMeasurements([{ name: '', valueMm: 900 }])).toMatch(/name/i)
    expect(validateAdditionalMeasurements([{ name: 'Hip', valueMm: 0 }])).toMatch(/greater than zero/i)
    expect(validateAdditionalMeasurements([{ name: 'Hip', valueMm: 920 }])).toBeNull()
  })

  it('exports a self-contained SVG with physical millimeter dimensions', () => {
    const svg = createPatternSvg(example, [], adaptationSettings)
    expect(svg).toContain('width="175.4mm" height="225.4mm"')
    expect(svg).toContain('data-role="stitch-line"')
    expect(svg).toContain('data-role="cut-line"')
    expect(svg).toContain('150 × 200 mm')
  })

  it('includes safely escaped additional measurements in SVG metadata', () => {
    const svg = createPatternSvg(example, [{ name: 'Hip & "Seat"', valueMm: 960 }], adaptationSettings)
    expect(svg).toContain('<metadata id="additional-measurements">')
    expect(svg).toContain('name="Hip &amp; &quot;Seat&quot;" value-cm="96"')
  })
})
