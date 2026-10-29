import { BODICE_SYSTEM_PROFILE, type BodiceAdaptation, type BodiceDimensions } from './domain/bodice'
import { formatCentimeters } from './domain/pattern'

type BodiceDraftPanelProps = {
  dimensions: BodiceDimensions
  adaptation: BodiceAdaptation
  measurementError: string | null
  readiness: string | null
  hasSavedDraft: boolean
  saveMessage: string
  onChange: (key: keyof BodiceDimensions, value: string) => void
  onChangeAdaptation: (value: string) => void
  onSave: () => void
  onClearSaved: () => void
}

const measurementFields: Array<{ key: keyof BodiceDimensions; id: string; label: string }> = [
  { key: 'bustMm', id: 'bodice-bust', label: 'Bust circumference' },
  { key: 'waistMm', id: 'bodice-waist', label: 'Waist circumference' },
  { key: 'shoulderBreadthMm', id: 'bodice-shoulder', label: 'Shoulder breadth' },
  { key: 'armholeDepthMm', id: 'bodice-armhole', label: 'Armhole depth' },
  { key: 'frontWaistLengthMm', id: 'bodice-length', label: 'Front waist length' },
]

export function BodiceDraftPanel({ dimensions, adaptation, measurementError, readiness, hasSavedDraft, saveMessage, onChange, onChangeAdaptation, onSave, onClearSaved }: BodiceDraftPanelProps) {
  return (
    <section className="workspace" aria-label="Bodice block specification workspace">
      <aside className="controls-panel">
        <div className="panel-title"><span className="panel-index">B</span><div><strong>Bodice measurements</strong><small>Enter body measurements in centimeters</small></div></div>
        {measurementFields.map(({ key, id, label }) => (
          <div className="bodice-measurement-field" key={key}>
            <label className="field-label" htmlFor={id}>{label}</label>
            <div className="input-wrap"><input id={id} type="number" min="0.1" step="0.1" value={Number.isFinite(dimensions[key]) ? formatCentimeters(dimensions[key]) : ''} onChange={(event) => onChange(key, event.target.value)} /><span>cm</span></div>
          </div>
        ))}

        <div className="field-spaced allowance-heading"><label className="field-label" htmlFor="bodice-allowance">Seam allowance · adaptation</label><output htmlFor="bodice-allowance">{formatCentimeters(adaptation.seamAllowanceMm)} cm</output></div>
        <input id="bodice-allowance" className="range-input" type="range" min="0" max="3" step="0.01" value={adaptation.seamAllowanceMm / 10} onChange={(event) => onChangeAdaptation(event.target.value)} />
        <div className="range-scale"><span>0 cm</span><span>3 cm</span></div>

        {measurementError && <p className="error-message" role="alert">{measurementError}</p>}
        <div className="bodice-method-note" role="status">
          <strong>{BODICE_SYSTEM_PROFILE.profileId} · Specification status</strong>
          <p>Anthropometry: {BODICE_SYSTEM_PROFILE.anthropometry.standard} · {BODICE_SYSTEM_PROFILE.anthropometry.status.replaceAll('-', ' ')} · Size designation: {BODICE_SYSTEM_PROFILE.sizeDesignation.standard} · {BODICE_SYSTEM_PROFILE.sizeDesignation.status.replaceAll('-', ' ')}</p>
          <p>Drafting: {BODICE_SYSTEM_PROFILE.drafting.method.system}, <em>{BODICE_SYSTEM_PROFILE.drafting.method.publication}</em>, 6th edition ({BODICE_SYSTEM_PROFILE.drafting.method.year}) · {BODICE_SYSTEM_PROFILE.drafting.status.replaceAll('-', ' ')}.</p>
          <p>Block family: {BODICE_SYSTEM_PROFILE.drafting.blockFamily} · Internal units: mm · Master seam allowance: {BODICE_SYSTEM_PROFILE.masterBlock.seamAllowanceMm} mm</p>
          <p>{readiness ?? 'Verified inputs are ready for geometry implementation.'}</p>
          <strong>Pending verified rules</strong>
          <ul className="bodice-pending-rules">
            {BODICE_SYSTEM_PROFILE.geometry.map(({ id, acceptance }) => <li key={id}>{id.replaceAll('_', ' ')}: {acceptance.finalStatus.toLowerCase()}</li>)}
            <li>Ease: {BODICE_SYSTEM_PROFILE.ease.source} · {BODICE_SYSTEM_PROFILE.ease.status.replaceAll('-', ' ')}</li>
          </ul>
          <p>Measurement mapping: {BODICE_SYSTEM_PROFILE.measurementMapping.status.replaceAll('-', ' ')} · {BODICE_SYSTEM_PROFILE.measurementMapping.records.length} candidate records. Rule policy: inferred rules {BODICE_SYSTEM_PROFILE.rulePolicy.inferredRules}; cross-system substitution {BODICE_SYSTEM_PROFILE.rulePolicy.crossSystemSubstitution}; undocumented constants {BODICE_SYSTEM_PROFILE.rulePolicy.undocumentedConstants}. Grading specification: {BODICE_SYSTEM_PROFILE.grading.specification}.</p>
          <details className="mapping-candidate-list">
            <summary>Review ISO-to-Aldrich candidate mappings</summary>
            <ul>
              {BODICE_SYSTEM_PROFILE.measurementMapping.records.map(({ mappingId, iso, relationship, verification, candidateNote }) => (
                <li key={mappingId}>
                  <strong>{candidateNote.split(':', 1)[0]}</strong>: {iso.canonicalTerm ?? 'ISO term not selected'} · {relationship.status} · {verification.status}
                </li>
              ))}
            </ul>
            <p>Candidate statuses are a worklist, not verified equivalence. Source terms, clauses, landmarks, transformations, and formulas remain blank until checked.</p>
          </details>
        </div>
        <div className="draft-storage-actions">
          <button className="save-draft-button" type="button" disabled={Boolean(measurementError)} onClick={onSave}>Save measurements on this device</button>
          <button className="clear-draft-button" type="button" disabled={!hasSavedDraft} onClick={onClearSaved}>Clear saved draft</button>
        </div>
        <p className="draft-storage-message" role="status">{saveMessage}</p>
        <p className="export-note">Millimeters internally · no pattern geometry generated yet</p>
      </aside>

      <div className="preview-panel">
        <div className="preview-toolbar"><div><span className="preview-live"><i /> BODICE RULES</span></div><span className="preview-scale">GEOMETRY PENDING</span></div>
        <div className="canvas-wrap">
          <div className="empty-state bodice-pending-state">Draft preview and SVG export remain unavailable while the listed geometry rules and ease are pending verification.</div>
        </div>
        <div className="preview-footer"><span>MASTER BLOCK · NO SEAM ALLOWANCE</span><span className="preview-footer-note">Grading is specified independently</span></div>
      </div>
    </section>
  )
}
