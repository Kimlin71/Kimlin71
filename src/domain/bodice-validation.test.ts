import { describe, expect, it } from 'vitest'
import { REQUIRED_FINISHED_DIMENSION_CHECKS, REQUIRED_SEAM_MATCH_CHECKS, evaluateFinishedDimension, evaluateSeamMatch, isAdaptationEvaluationVerified, isBodiceValidationSuiteVerified, isFitEvaluationVerified, isGeometryIntegrityVerified, isSizeDomainVerified, createPendingBodiceValidationSuite, type FinishedDimensionCheck, type GeometryIntegrityReport, type SizeDomainReport } from './bodice-validation'
import { isProductionPatternReady, type ProductionPatternSpecification } from './bodice'

const finishedDimension: FinishedDimensionCheck = {
  checkId: 'finished_bust',
  bodyMeasurementId: 'body-bust',
  measurementConvention: 'bust-with-darts-excluded',
  bodyMeasurementMm: 900,
  easeMm: 40,
  constructionAllowanceMm: 0,
  measuredFinishedMm: 940,
  toleranceMm: 0.5,
}

const validGeometryIntegrity: GeometryIntegrityReport = {
  selfIntersectionFree: 'PASS',
  contoursClosed: 'PASS',
  duplicatePointSemanticsResolved: 'PASS',
  dartIntakesNonNegative: 'PASS',
  pieceOrientationCorrect: 'PASS',
  curveContinuityVerified: 'PASS',
  dependenciesResolved: 'PASS',
  dependencyGraphAcyclic: 'PASS',
  masterBlockExcludesSeamAllowance: 'PASS',
}

const validSizeDomain: SizeDomainReport = {
  supportsLengthTypes: false,
  requiresExtremeAllowedBustWaistRatio: true,
  cases: [
    { caseId: 'min', boundary: 'minimum', lengthType: null, extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
    { caseId: 'base', boundary: 'base', lengthType: null, extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
    { caseId: 'max', boundary: 'maximum', lengthType: null, extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
    { caseId: 'extreme', boundary: 'interior', lengthType: null, extremeAllowedBustWaistRatio: true, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
  ],
}

describe('bodice validation schema', () => {
  it('compares finished measurements against body, ease, and documented allowances', () => {
    expect(evaluateFinishedDimension(finishedDimension)).toMatchObject({ targetFinishedDimensionMm: 940, deviationMm: 0, status: 'PASS' })
    expect(evaluateFinishedDimension({ ...finishedDimension, measuredFinishedMm: 942 })).toMatchObject({ status: 'FAIL' })
    expect(evaluateFinishedDimension({ ...finishedDimension, easeMm: null })).toMatchObject({ status: 'PENDING' })
  })

  it('checks seam lengths with an explicit tolerance and documented intentional differences', () => {
    const seam = { checkId: 'side-seam', leftSegmentId: 'front', rightSegmentId: 'back', leftLengthMm: 400, rightLengthMm: 401, toleranceMm: 0.5, intentionalDifferenceReason: null, expectedDifferenceMm: null }
    expect(evaluateSeamMatch(seam)).toMatchObject({ differenceMm: 1, residualDifferenceMm: 1, status: 'FAIL' })
    expect(evaluateSeamMatch({ ...seam, intentionalDifferenceReason: 'Documented ease at this seam.' })).toMatchObject({ status: 'FAIL' })
    expect(evaluateSeamMatch({ ...seam, intentionalDifferenceReason: 'Documented ease at this seam.', expectedDifferenceMm: 1 })).toMatchObject({ differenceMm: 1, residualDifferenceMm: 0, status: 'PASS' })
    expect(evaluateSeamMatch({ ...seam, expectedDifferenceMm: 1 })).toMatchObject({ status: 'FAIL' })
  })

  it('requires all geometric-integrity checks to pass', () => {
    expect(isGeometryIntegrityVerified(validGeometryIntegrity)).toBe(true)
    expect(isGeometryIntegrityVerified({ ...validGeometryIntegrity, contoursClosed: 'PENDING' })).toBe(false)
  })

  it('requires minimum, base, maximum, and the requested size-domain cases', () => {
    expect(isSizeDomainVerified(validSizeDomain)).toBe(true)
    expect(isSizeDomainVerified({ ...validSizeDomain, cases: validSizeDomain.cases.filter(({ boundary }) => boundary !== 'maximum') })).toBe(false)
    expect(isSizeDomainVerified({ ...validSizeDomain, requiresExtremeAllowedBustWaistRatio: false, supportsLengthTypes: true })).toBe(false)
    expect(isSizeDomainVerified({ ...validSizeDomain, cases: [...validSizeDomain.cases, validSizeDomain.cases[0]] })).toBe(false)
    expect(isSizeDomainVerified({ ...validSizeDomain, cases: validSizeDomain.cases.map((testCase) => testCase.boundary === 'base' ? { ...testCase, caseId: '' } : testCase) })).toBe(false)
  })

  it('keeps edition fidelity, block consistency, fit, and adaptation as distinct stages', () => {
    const suite = createPendingBodiceValidationSuite()
    expect(isBodiceValidationSuiteVerified(suite)).toBe(false)
    expect(suite.evaluation.fit.status).toBe('PENDING')
    expect(suite.evaluation.adaptation.sourceRulesUnchanged).toBe(true)
  })

  it('does not verify the suite while fit or adaptation stages remain pending', () => {
    const suite = createPendingBodiceValidationSuite()
    suite.finishedDimensions = REQUIRED_FINISHED_DIMENSION_CHECKS.map((checkId) => ({
      checkId,
      bodyMeasurementId: `test-${checkId}`,
      measurementConvention: checkId === 'finished_bust'
        ? 'bust-with-darts-excluded'
        : checkId === 'finished_waist'
          ? 'waist-with-dart-intake-excluded'
          : checkId === 'finished_neckline' ? 'front-plus-back' : 'seamline-length',
      bodyMeasurementMm: 100,
      easeMm: 0,
      constructionAllowanceMm: 0,
      measuredFinishedMm: 100,
      toleranceMm: 0.5,
    }))
    suite.seamMatches = REQUIRED_SEAM_MATCH_CHECKS.map((checkId) => ({
      checkId,
      leftSegmentId: 'left',
      rightSegmentId: 'right',
      leftLengthMm: 100,
      rightLengthMm: 100,
      toleranceMm: 0.5,
      intentionalDifferenceReason: null,
      expectedDifferenceMm: null,
    }))
    suite.geometryIntegrity = {
      selfIntersectionFree: 'PASS',
      contoursClosed: 'PASS',
      duplicatePointSemanticsResolved: 'PASS',
      dartIntakesNonNegative: 'PASS',
      pieceOrientationCorrect: 'PASS',
      curveContinuityVerified: 'PASS',
      dependenciesResolved: 'PASS',
      dependencyGraphAcyclic: 'PASS',
      masterBlockExcludesSeamAllowance: 'PASS',
    }
    suite.sizeDomain = {
      supportsLengthTypes: true,
      requiresExtremeAllowedBustWaistRatio: true,
      cases: [
        { caseId: 'minimum', boundary: 'minimum', lengthType: 'regular', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'base', boundary: 'base', lengthType: 'regular', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'maximum', boundary: 'maximum', lengthType: 'regular', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'short', boundary: 'interior', lengthType: 'short', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'long', boundary: 'interior', lengthType: 'long', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'ratio', boundary: 'interior', lengthType: 'regular', extremeAllowedBustWaistRatio: true, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
      ],
    }
    suite.evaluation.editionFidelity = { status: 'PASS', evidenceNote: 'Verified.' }
    suite.evaluation.blockConsistency = { status: 'PASS', evidenceNote: 'Verified.' }
    suite.evaluation.fit = { status: 'PENDING', evidenceNote: '', targetPopulation: null, fitSubject: null }
    suite.evaluation.adaptation = { status: 'PENDING', evidenceNote: '', modifications: [], sourceRulesUnchanged: true }
    expect(isBodiceValidationSuiteVerified(suite)).toBe(false)
  })

  it('requires a named target population and fit subject for a fit result', () => {
    const fit = { status: 'PASS' as const, evidenceNote: 'Fit review evidence attached.', targetPopulation: 'test population', fitSubject: 'test form' }
    expect(isFitEvaluationVerified(fit)).toBe(true)
    expect(isFitEvaluationVerified({ ...fit, fitSubject: null })).toBe(false)
  })

  it('keeps adaptations as a separate layer that cannot change source rules', () => {
    const adaptation = { status: 'PASS' as const, evidenceNote: 'Adaptation record attached.', modifications: [{ adaptationId: 'fit-001', description: 'Documented fit adjustment.' }], sourceRulesUnchanged: true }
    expect(isAdaptationEvaluationVerified(adaptation)).toBe(true)
    expect(isAdaptationEvaluationVerified({ ...adaptation, sourceRulesUnchanged: false })).toBe(false)
    expect(isAdaptationEvaluationVerified({ ...adaptation, modifications: [{ adaptationId: '', description: '' }] })).toBe(false)
  })

  it('does not mark the production layer ready until its separate details are verified', () => {
    const pattern: ProductionPatternSpecification = {
      status: 'VERIFIED',
      seamAllowanceMm: 10,
      seamAllowanceSourceReference: 'production-spec-1',
      masterBlockExcludesSeamAllowance: true,
      grainline: { status: 'VERIFIED', sourceReference: 'grainline-spec-1' },
      notches: [{ notchId: 'notch-1', sourceReference: 'notch-spec-1' }],
      labels: [{ labelId: 'piece-name', sourceReference: 'label-spec-1' }],
      metadata: { status: 'VERIFIED', fields: ['piece-name', 'size'] },
    }
    expect(isProductionPatternReady(pattern)).toBe(true)
    expect(isProductionPatternReady({ ...pattern, seamAllowanceSourceReference: null })).toBe(false)
    expect(isProductionPatternReady({ ...pattern, metadata: { ...pattern.metadata, status: 'DRAFT' } })).toBe(false)
  })

  it('rejects duplicate required evidence rows instead of allowing last-write-wins', () => {
    const suite = createPendingBodiceValidationSuite()
    const duplicate = { checkId: 'finished_bust', bodyMeasurementId: 'test-bust', measurementConvention: 'bust-with-darts-excluded' as const, bodyMeasurementMm: 100, easeMm: 0, constructionAllowanceMm: 0, measuredFinishedMm: 100, toleranceMm: 0.5 }
    suite.finishedDimensions = [duplicate, duplicate]
    expect(isBodiceValidationSuiteVerified(suite)).toBe(false)
  })
})
