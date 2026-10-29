import { useMemo, useRef, useState } from 'react'
import { BodiceDraftPanel } from './BodiceDraftPanel'
import { BODICE_SYSTEM_PROFILE, getBodiceDraftReadiness, validateBodiceAdaptation, validateBodiceDimensions, type BodiceAdaptation, type BodiceDimensions, type BodiceDraftSpecification } from './domain/bodice'
import { applySeamAllowance, centimetersToMillimeters, createPatternGeometry, createPatternSvg, formatCentimeters as formatCm, millimetersToCentimeters, validateAdditionalMeasurements, validateDimensions, validatePatternAdaptation, type AdditionalMeasurement, type PatternAdaptationSettings, type PatternDimensions } from './domain/pattern'
import './App.css'

const initialDimensions: PatternDimensions = { waistMm: 600, heightMm: 200 }
const initialPatternAdaptation: PatternAdaptationSettings = { seamAllowanceMm: 12.7 }
const initialBodiceDimensions: BodiceDimensions = { bustMm: 900, waistMm: 700, shoulderBreadthMm: 400, armholeDepthMm: 220, frontWaistLengthMm: 400 }
const initialBodiceAdaptation: BodiceAdaptation = { seamAllowanceMm: 0 }
type DraftMeasurement = AdditionalMeasurement & { id: number }
type SavedDraft =
  | { version: 3; patternType: 'rectangle'; dimensions: PatternDimensions; measurements: DraftMeasurement[]; adaptation: PatternAdaptationSettings }
  | { version: 3; patternType: 'bodice'; dimensions: BodiceDimensions; adaptation: BodiceAdaptation }
const savedDraftKey = 'pattern-draft-lab.current-draft'
const legacySavedDraftKey = 'pattern-draft-lab.current-draft.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDraftMeasurement(value: unknown): value is DraftMeasurement {
  return isRecord(value)
    && typeof value.id === 'number'
    && Number.isInteger(value.id)
    && value.id >= 0
    && typeof value.name === 'string'
    && typeof value.valueMm === 'number'
    && Number.isFinite(value.valueMm)
}

function readSavedDraft(): SavedDraft | null {
  try {
    const stored = localStorage.getItem(savedDraftKey) ?? localStorage.getItem(legacySavedDraftKey)
    if (!stored) return null

    const parsed: unknown = JSON.parse(stored)
    if (!isRecord(parsed) || !isRecord(parsed.dimensions)) return null

    if (parsed.version === 2 && parsed.patternType === 'bodice') {
      const { bustMm, waistMm, shoulderBreadthMm, armholeDepthMm, frontWaistLengthMm, seamAllowanceMm } = parsed.dimensions
      if (typeof bustMm !== 'number' || typeof waistMm !== 'number' || typeof shoulderBreadthMm !== 'number' || typeof armholeDepthMm !== 'number' || typeof frontWaistLengthMm !== 'number' || typeof seamAllowanceMm !== 'number') return null
      const dimensions: BodiceDimensions = { bustMm, waistMm, shoulderBreadthMm, armholeDepthMm, frontWaistLengthMm }
      const adaptation = { seamAllowanceMm }
      if (validateBodiceDimensions(dimensions) || validateBodiceAdaptation(adaptation)) return null
      return { version: 3, patternType: 'bodice', dimensions, adaptation }
    }

    if (parsed.version === 1 || parsed.version === 2) {
      if (!Array.isArray(parsed.measurements) || !parsed.measurements.every(isDraftMeasurement)) return null
      const { waistMm, heightMm, seamAllowanceMm } = parsed.dimensions
      if (typeof waistMm !== 'number' || typeof heightMm !== 'number' || typeof seamAllowanceMm !== 'number') return null

      const dimensions = { waistMm, heightMm }
      const adaptation = { seamAllowanceMm }
      const measurements = parsed.measurements
      const ids = new Set(measurements.map(({ id }) => id))
      if (ids.size !== measurements.length || validateDimensions(dimensions) || validatePatternAdaptation(adaptation) || validateAdditionalMeasurements(measurements)) return null
      return { version: 3, patternType: 'rectangle', dimensions, measurements, adaptation }
    }

    if (parsed.version !== 3) return null
    if (parsed.patternType === 'rectangle' && Array.isArray(parsed.measurements) && parsed.measurements.every(isDraftMeasurement)) {
      const { waistMm, heightMm } = parsed.dimensions
      if (typeof waistMm !== 'number' || typeof heightMm !== 'number' || !isRecord(parsed.adaptation) || typeof parsed.adaptation.seamAllowanceMm !== 'number') return null
      const dimensions = { waistMm, heightMm }
      const adaptation = { seamAllowanceMm: parsed.adaptation.seamAllowanceMm }
      const measurements = parsed.measurements
      const ids = new Set(measurements.map(({ id }) => id))
      if (ids.size !== measurements.length || validateDimensions(dimensions) || validatePatternAdaptation(adaptation) || validateAdditionalMeasurements(measurements)) return null
      return { version: 3, patternType: 'rectangle', dimensions, measurements, adaptation }
    }
    if (parsed.patternType === 'bodice' && isRecord(parsed.adaptation)) {
      const { bustMm, waistMm, shoulderBreadthMm, armholeDepthMm, frontWaistLengthMm } = parsed.dimensions
      const { seamAllowanceMm } = parsed.adaptation
      if (typeof bustMm !== 'number' || typeof waistMm !== 'number' || typeof shoulderBreadthMm !== 'number' || typeof armholeDepthMm !== 'number' || typeof frontWaistLengthMm !== 'number' || typeof seamAllowanceMm !== 'number') return null
      const dimensions: BodiceDimensions = { bustMm, waistMm, shoulderBreadthMm, armholeDepthMm, frontWaistLengthMm }
      const adaptation = { seamAllowanceMm }
      if (validateBodiceDimensions(dimensions) || validateBodiceAdaptation(adaptation)) return null
      return { version: 3, patternType: 'bodice', dimensions, adaptation }
    }
    return null
  } catch {
    return null
  }
}

function downloadSvg(svg: string) {
  const file = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = 'pattern-draft.svg'
  link.click()
  URL.revokeObjectURL(url)
}

function parseCentimeterInput(value: string): number {
  return value === '' ? Number.NaN : centimetersToMillimeters(Number(value))
}

function App() {
  const [savedDraft] = useState(readSavedDraft)
  const [patternType, setPatternType] = useState<'rectangle' | 'bodice'>(savedDraft?.patternType ?? 'rectangle')
  const [dimensions, setDimensions] = useState(savedDraft?.patternType === 'rectangle' ? savedDraft.dimensions : initialDimensions)
  const [patternAdaptation, setPatternAdaptation] = useState(savedDraft?.patternType === 'rectangle' ? savedDraft.adaptation : initialPatternAdaptation)
  const [bodiceDimensions, setBodiceDimensions] = useState(savedDraft?.patternType === 'bodice' ? savedDraft.dimensions : initialBodiceDimensions)
  const [bodiceAdaptation, setBodiceAdaptation] = useState(savedDraft?.patternType === 'bodice' ? savedDraft.adaptation : initialBodiceAdaptation)
  const [additionalMeasurements, setAdditionalMeasurements] = useState<DraftMeasurement[]>(savedDraft?.patternType === 'rectangle' ? savedDraft.measurements : [])
  const [copied, setCopied] = useState(false)
  const [hasSavedDraft, setHasSavedDraft] = useState(Boolean(savedDraft))
  const [saveMessage, setSaveMessage] = useState(savedDraft ? 'Saved draft restored from this browser.' : 'Draft not saved. Saving keeps it on this device.')
  const nextMeasurementId = useRef(savedDraft?.patternType === 'rectangle' ? Math.max(0, ...savedDraft.measurements.map(({ id }) => id + 1)) : 0)
  const error = validateDimensions(dimensions)
  const patternAdaptationError = validatePatternAdaptation(patternAdaptation)
  const measurementError = validateAdditionalMeasurements(additionalMeasurements)
  const bodiceMeasurementError = validateBodiceDimensions(bodiceDimensions)
  const bodiceAdaptationError = validateBodiceAdaptation(bodiceAdaptation)
  const bodiceSpecification: BodiceDraftSpecification = {
    ...BODICE_SYSTEM_PROFILE,
    measurements: bodiceDimensions,
    adaptation: bodiceAdaptation,
  }
  const bodiceReadiness = getBodiceDraftReadiness(bodiceSpecification)
  const geometry = useMemo(() => error ? null : createPatternGeometry(dimensions), [dimensions, error])
  const adaptation = useMemo(() => geometry && !patternAdaptationError ? applySeamAllowance(geometry, patternAdaptation) : null, [geometry, patternAdaptation, patternAdaptationError])
  const canExport = patternType === 'rectangle' && Boolean(geometry) && Boolean(adaptation) && !measurementError
  const canSave = patternType === 'rectangle' ? canExport : !bodiceMeasurementError && !bodiceAdaptationError
  function update(key: keyof typeof dimensions, value: string) {
    setDimensions((current) => ({ ...current, [key]: parseCentimeterInput(value) }))
  }

  function updatePatternAdaptation(value: string) {
    setPatternAdaptation({ seamAllowanceMm: parseCentimeterInput(value) })
  }

  function updateBodice(key: keyof BodiceDimensions, value: string) {
    setBodiceDimensions((current) => ({ ...current, [key]: parseCentimeterInput(value) }))
  }

  function updateBodiceAdaptation(value: string) {
    setBodiceAdaptation({ seamAllowanceMm: parseCentimeterInput(value) })
  }

  function addMeasurement() {
    const id = nextMeasurementId.current++
    setAdditionalMeasurements((current) => [...current, { id, name: '', valueMm: Number.NaN }])
  }

  function updateMeasurementName(id: number, name: string) {
    setAdditionalMeasurements((current) => current.map((measurement) => measurement.id === id ? { ...measurement, name } : measurement))
  }

  function updateMeasurementValue(id: number, value: string) {
    const valueMm = parseCentimeterInput(value)
    setAdditionalMeasurements((current) => current.map((measurement) => measurement.id === id ? { ...measurement, valueMm } : measurement))
  }

  function removeMeasurement(id: number) {
    setAdditionalMeasurements((current) => current.filter((measurement) => measurement.id !== id))
  }

  function saveDraft() {
    if (!canSave) return
    try {
      const draft: SavedDraft = patternType === 'rectangle'
        ? { version: 3, patternType, dimensions, measurements: additionalMeasurements, adaptation: patternAdaptation }
        : { version: 3, patternType, dimensions: bodiceDimensions, adaptation: bodiceAdaptation }
      localStorage.setItem(savedDraftKey, JSON.stringify(draft))
      setHasSavedDraft(true)
      setSaveMessage(patternType === 'bodice' ? 'Bodice measurements saved on this device.' : 'Draft saved on this device.')
    } catch {
      setSaveMessage('Could not save the draft in this browser.')
    }
  }

  function clearSavedDraft() {
    try {
      localStorage.removeItem(savedDraftKey)
      localStorage.removeItem(legacySavedDraftKey)
      setHasSavedDraft(false)
      setSaveMessage('Saved draft removed from this device.')
    } catch {
      setSaveMessage('Could not remove the saved draft.')
    }
  }

  async function copySvg() {
    if (!canExport || patternType !== 'rectangle') return
    const svg = createPatternSvg(dimensions, additionalMeasurements, patternAdaptation)
    await navigator.clipboard.writeText(svg)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const outerWidth = adaptation?.cutWidthMm ?? 0
  const outerHeight = adaptation?.cutHeightMm ?? 0
  const displayScale = geometry ? Math.min(440 / outerWidth, 420 / outerHeight, 2.2) : 1
  const viewWidth = outerWidth * displayScale
  const viewHeight = outerHeight * displayScale
  const originX = (500 - viewWidth) / 2
  const originY = (470 - viewHeight) / 2

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Pattern Draft Lab home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Pattern<span className="brand-light">Draft</span><small>LAB</small></span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> LOCAL WORKSPACE <span className="topbar-divider">/</span> CM</div>
      </header>

      <section className="intro" id="top">
        <div>
          <div className="eyebrow"><span>01</span> &nbsp; PATTERN DEVELOPMENT</div>
          <h1>From measure<br />to <em>made.</em></h1>
          <p className="intro-copy">A small drafting bench for exploring fit, proportion, and the geometry in between.</p>
        </div>
        <div className="intro-stamp" aria-label="Draft study number 001">
          <span>STUDIO STUDY</span><strong>001</strong><span>{patternType === 'rectangle' ? 'RECTANGLE BLOCK' : 'BODICE BLOCK'}</span>
        </div>
      </section>

      <div className="workspace-heading">
        <div><span className="section-kicker">THE DRAFTING TABLE</span><h2>{patternType === 'rectangle' ? 'Rectangle block' : 'Bodice block specification'}</h2></div>
        <label className="pattern-type-control">
          <span className="sr-only">Pattern type</span>
          <select aria-label="Pattern type" value={patternType} onChange={(event) => {
            const nextPattern = event.target.value === 'bodice' ? 'bodice' : 'rectangle'
            setPatternType(nextPattern)
            setSaveMessage('Pattern changed. Save to keep this draft on this device.')
          }}>
            <option value="rectangle">Rectangle block</option>
            <option value="bodice">Close-fitting bodice block</option>
          </select>
        </label>
        <div className="save-indicator"><span className="status-dot" /> Preview updates live</div>
      </div>

      {patternType === 'rectangle' ? (
      <section className="workspace" aria-label="Pattern drafting workspace">
        <aside className="controls-panel">
          <div className="panel-title"><span className="panel-index">A</span><div><strong>Measurements</strong><small>All values in centimeters</small></div></div>

          <label className="field-label" htmlFor="waist">Natural waist</label>
          <div className="input-wrap"><input id="waist" type="number" min="0.1" step="0.1" value={Number.isFinite(dimensions.waistMm) ? formatCm(dimensions.waistMm) : ''} onChange={(event) => update('waistMm', event.target.value)} aria-describedby="waist-help" /><span>cm</span></div>
          <p id="waist-help" className="field-hint">The block uses one quarter of this measurement.</p>

          <label className="field-label field-spaced" htmlFor="height">Block height</label>
          <div className="input-wrap"><input id="height" type="number" min="0.1" step="0.1" value={Number.isFinite(dimensions.heightMm) ? formatCm(dimensions.heightMm) : ''} onChange={(event) => update('heightMm', event.target.value)} /><span>cm</span></div>

          <div className="field-spaced allowance-heading"><label className="field-label" htmlFor="allowance">Seam allowance · adaptation</label><output htmlFor="allowance">{formatCm(patternAdaptation.seamAllowanceMm)} cm</output></div>
          <input id="allowance" className="range-input" type="range" min="0" max="3" step="0.01" value={millimetersToCentimeters(patternAdaptation.seamAllowanceMm)} onChange={(event) => updatePatternAdaptation(event.target.value)} />
          <div className="range-scale"><span>0 cm</span><span>3 cm</span></div>

          <section className="additional-measurements" aria-label="Additional measurements">
            <div className="measurements-heading">
              <div><strong>Additional measurements</strong><small>Optional notes included with the SVG.</small></div>
              <button className="add-measurement-button" type="button" onClick={addMeasurement}>+ Add</button>
            </div>
            {additionalMeasurements.map((measurement) => (
              <div className="measurement-row" key={measurement.id}>
                <input
                  id={`measurement-name-${measurement.id}`}
                  type="text"
                  value={measurement.name}
                  placeholder="e.g. Hip"
                  aria-label="Additional measurement name"
                  onChange={(event) => updateMeasurementName(measurement.id, event.target.value)}
                />
                <div className="input-wrap">
                  <input
                    id={`measurement-value-${measurement.id}`}
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={Number.isFinite(measurement.valueMm) ? formatCm(measurement.valueMm) : ''}
                    aria-label={`${measurement.name || 'Additional measurement'} value in centimeters`}
                    onChange={(event) => updateMeasurementValue(measurement.id, event.target.value)}
                  />
                  <span>cm</span>
                </div>
                <button className="remove-measurement-button" type="button" aria-label={`Remove ${measurement.name || 'additional measurement'}`} onClick={() => removeMeasurement(measurement.id)}>×</button>
              </div>
            ))}
            {measurementError && <p className="error-message" role="alert">{measurementError}</p>}
          </section>

          {error && <p className="error-message" role="alert">{error}</p>}
          {patternAdaptationError && <p className="error-message" role="alert">{patternAdaptationError}</p>}

          <div className="formula-card"><span className="formula-label">WIDTH FORMULA</span><code>waist ÷ 4</code><div className="formula-result"><span>Pattern width</span><strong>{geometry ? `${formatCm(geometry.widthMm)} cm` : '—'}</strong></div></div>

          <div className="panel-actions">
            <button className="button-primary" type="button" disabled={!canExport} onClick={() => canExport && downloadSvg(createPatternSvg(dimensions, additionalMeasurements, patternAdaptation))}><span aria-hidden="true">↧</span> Export SVG</button>
            <button className="button-secondary" type="button" disabled={!canExport} onClick={() => void copySvg()}>{copied ? 'Copied!' : 'Copy SVG'}</button>
          </div>
          <div className="draft-storage-actions">
            <button className="save-draft-button" type="button" disabled={!canExport} onClick={saveDraft}>Save draft on this device</button>
            <button className="clear-draft-button" type="button" disabled={!hasSavedDraft} onClick={clearSavedDraft}>Clear saved draft</button>
          </div>
          <p className="draft-storage-message" role="status">{saveMessage}</p>
          <p className="export-note">True-size SVG · millimeter units · no account needed</p>
        </aside>

        <div className="preview-panel">
          <div className="preview-toolbar"><div><span className="preview-live"><i /> LIVE PREVIEW</span></div><span className="preview-scale">{geometry ? `${formatCm(outerWidth)} × ${formatCm(outerHeight)} cm CUT SIZE` : 'CHECK INPUTS'}</span></div>
          <div className="canvas-wrap">
            {geometry ? (
              <svg className="pattern-svg" viewBox="0 0 500 470" role="img" aria-label={`Rectangle pattern, stitch line ${formatCm(geometry.widthMm)} by ${formatCm(geometry.heightMm)} centimeters, with ${formatCm(patternAdaptation.seamAllowanceMm)} centimeter seam allowance`}>
                <defs><pattern id="dot-grid" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d7d1c3" /></pattern><marker id="arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7" fill="none" stroke="#8a7863" strokeWidth="1" /></marker></defs>
                <rect width="500" height="470" fill="url(#dot-grid)" />
                <g transform={`translate(${originX} ${originY})`}>
                  <rect x="0" y="0" width={viewWidth} height={viewHeight} className="cut-line" />
                  <rect x={patternAdaptation.seamAllowanceMm * displayScale} y={patternAdaptation.seamAllowanceMm * displayScale} width={geometry.widthMm * displayScale} height={geometry.heightMm * displayScale} className="stitch-line" />
                  <line x1={patternAdaptation.seamAllowanceMm * displayScale + geometry.widthMm * displayScale / 2} y1={patternAdaptation.seamAllowanceMm * displayScale + 15} x2={patternAdaptation.seamAllowanceMm * displayScale + geometry.widthMm * displayScale / 2} y2={patternAdaptation.seamAllowanceMm * displayScale + geometry.heightMm * displayScale - 15} className="grainline" />
                  <line x1="0" y1={viewHeight + 23} x2={viewWidth} y2={viewHeight + 23} className="dimension-line" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  <text x={viewWidth / 2} y={viewHeight + 39} className="dimension-label" textAnchor="middle">{formatCm(outerWidth)} cm cut</text>
                  <line x1={viewWidth + 24} y1="0" x2={viewWidth + 24} y2={viewHeight} className="dimension-line" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  <text x={viewWidth + 38} y={viewHeight / 2} className="dimension-label" textAnchor="middle" transform={`rotate(90 ${viewWidth + 38} ${viewHeight / 2})`}>{formatCm(outerHeight)} cm</text>
                  <text x={viewWidth / 2} y={viewHeight / 2 + 4} className="pattern-label" textAnchor="middle">{formatCm(geometry.widthMm)} × {formatCm(geometry.heightMm)}</text>
                  <text x={viewWidth / 2} y={viewHeight / 2 + 19} className="pattern-sublabel" textAnchor="middle">STITCH LINE · CM</text>
                  <text x={viewWidth / 2} y={16} className="grain-label" textAnchor="middle">GRAINLINE</text>
                </g>
              </svg>
            ) : <div className="empty-state">Enter valid measurements to preview the block.</div>}
          </div>
          <div className="preview-footer"><span><i className="legend-cut" /> CUT LINE</span><span><i className="legend-stitch" /> STITCH LINE</span><span><i className="legend-grain" /> GRAINLINE</span><span className="preview-footer-note">Diagram scales to fit · export remains true size</span></div>
        </div>
      </section>
      ) : (
        <BodiceDraftPanel
          dimensions={bodiceDimensions}
          adaptation={bodiceAdaptation}
          measurementError={bodiceMeasurementError || bodiceAdaptationError}
          readiness={bodiceReadiness}
          hasSavedDraft={hasSavedDraft}
          saveMessage={saveMessage}
          onChange={updateBodice}
          onChangeAdaptation={updateBodiceAdaptation}
          onSave={saveDraft}
          onClearSaved={clearSavedDraft}
        />
      )}

      <footer className="page-footer"><span>AN EXPLORATION IN FORM & FIT</span><span>Pattern Draft Lab <b>·</b> 001</span></footer>
    </main>
  )
}

export default App
