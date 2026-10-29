export type VerificationState = 'PENDING' | 'PASS' | 'FAIL'

export type FinishedDimensionCheck = {
  checkId: 'finished_bust' | 'finished_waist' | 'finished_neckline' | 'armscye_length' | string
  bodyMeasurementId: string
  measurementConvention: 'bust-with-darts-excluded' | 'waist-with-dart-intake-excluded' | 'front-plus-back' | 'seamline-length'
  bodyMeasurementMm: number | null
  easeMm: number | null
  constructionAllowanceMm: number | null
  measuredFinishedMm: number | null
  toleranceMm: number | null
}

export type FinishedDimensionResult = {
  checkId: string
  targetFinishedDimensionMm: number | null
  measuredFinishedDimensionMm: number | null
  deviationMm: number | null
  status: VerificationState
}

export type SeamMatchCheck = {
  checkId: string
  leftSegmentId: string
  rightSegmentId: string
  leftLengthMm: number | null
  rightLengthMm: number | null
  toleranceMm: number | null
  intentionalDifferenceReason: string | null
  expectedDifferenceMm: number | null
}

export type SeamMatchResult = {
  checkId: string
  differenceMm: number | null
  residualDifferenceMm: number | null
  status: VerificationState
  intentionalDifferenceReason: string | null
}

export type GeometryIntegrityReport = {
  selfIntersectionFree: VerificationState
  contoursClosed: VerificationState
  duplicatePointSemanticsResolved: VerificationState
  dartIntakesNonNegative: VerificationState
  pieceOrientationCorrect: VerificationState
  curveContinuityVerified: VerificationState
  dependenciesResolved: VerificationState
  dependencyGraphAcyclic: VerificationState
  masterBlockExcludesSeamAllowance: VerificationState
}

export type SizeDomainCase = {
  caseId: string
  boundary: 'minimum' | 'base' | 'maximum' | 'interior'
  lengthType: 'short' | 'regular' | 'long' | null
  extremeAllowedBustWaistRatio: boolean
  measurementsValid: VerificationState
  geometryValid: VerificationState
  sizeConditionsApplied: VerificationState
}

export type SizeDomainReport = {
  supportsLengthTypes: boolean
  requiresExtremeAllowedBustWaistRatio: boolean
  cases: SizeDomainCase[]
}

export type EvaluationStage = {
  status: VerificationState
  evidenceNote: string
}

export type FitEvaluationStage = EvaluationStage & {
  targetPopulation: string | null
  fitSubject: string | null
}

export type AdaptationEvaluationStage = EvaluationStage & {
  modifications: Array<{ adaptationId: string; description: string }>
  sourceRulesUnchanged: boolean
}

export type BodiceValidationSuite = {
  finishedDimensions: FinishedDimensionCheck[]
  seamMatches: SeamMatchCheck[]
  geometryIntegrity: GeometryIntegrityReport | null
  sizeDomain: SizeDomainReport
  evaluation: {
    editionFidelity: EvaluationStage
    blockConsistency: EvaluationStage
    fit: FitEvaluationStage
    adaptation: AdaptationEvaluationStage
  }
}

export const REQUIRED_FINISHED_DIMENSION_CHECKS = [
  'finished_bust',
  'finished_waist',
  'finished_neckline',
  'armscye_length',
] as const

export const REQUIRED_SEAM_MATCH_CHECKS = [
  'front_back_shoulder_after_dart',
  'front_back_side_seam',
  'waist_after_dart',
  'armscye_to_sleeve',
  'notches',
  'cross_seams',
] as const

export function createPendingBodiceValidationSuite(): BodiceValidationSuite {
  return {
    finishedDimensions: [],
    seamMatches: [],
    geometryIntegrity: null,
    sizeDomain: { supportsLengthTypes: true, requiresExtremeAllowedBustWaistRatio: true, cases: [] },
    evaluation: {
      editionFidelity: { status: 'PENDING', evidenceNote: '' },
      blockConsistency: { status: 'PENDING', evidenceNote: '' },
      fit: { status: 'PENDING', evidenceNote: '', targetPopulation: null, fitSubject: null },
      adaptation: { status: 'PENDING', evidenceNote: '', modifications: [], sourceRulesUnchanged: true },
    },
  }
}

export function evaluateFinishedDimension(check: FinishedDimensionCheck): FinishedDimensionResult {
  if (!check.checkId.trim() || !check.bodyMeasurementId.trim() || !check.measurementConvention) {
    return { checkId: check.checkId, targetFinishedDimensionMm: null, measuredFinishedDimensionMm: check.measuredFinishedMm, deviationMm: null, status: 'FAIL' }
  }
  const values = [check.bodyMeasurementMm, check.easeMm, check.constructionAllowanceMm, check.measuredFinishedMm, check.toleranceMm]
  if (values.some((value) => value === null)) {
    return { checkId: check.checkId, targetFinishedDimensionMm: null, measuredFinishedDimensionMm: check.measuredFinishedMm, deviationMm: null, status: 'PENDING' }
  }

  const [bodyMm, easeMm, allowanceMm, measuredMm, toleranceMm] = values as number[]
  if (![bodyMm, easeMm, allowanceMm, measuredMm, toleranceMm].every(Number.isFinite)
    || bodyMm <= 0 || measuredMm < 0 || toleranceMm < 0) {
    return { checkId: check.checkId, targetFinishedDimensionMm: null, measuredFinishedDimensionMm: measuredMm, deviationMm: null, status: 'FAIL' }
  }

  const targetFinishedDimensionMm = bodyMm + easeMm + allowanceMm
  const deviationMm = measuredMm - targetFinishedDimensionMm
  return {
    checkId: check.checkId,
    targetFinishedDimensionMm,
    measuredFinishedDimensionMm: measuredMm,
    deviationMm,
    status: Math.abs(deviationMm) <= toleranceMm ? 'PASS' : 'FAIL',
  }
}

export function evaluateSeamMatch(check: SeamMatchCheck): SeamMatchResult {
  const base = { checkId: check.checkId, intentionalDifferenceReason: check.intentionalDifferenceReason }
  if (!check.checkId.trim() || !check.leftSegmentId.trim() || !check.rightSegmentId.trim()) {
    return { ...base, differenceMm: null, residualDifferenceMm: null, status: 'FAIL' }
  }
  if (check.leftLengthMm === null || check.rightLengthMm === null || check.toleranceMm === null) {
    return { ...base, differenceMm: null, residualDifferenceMm: null, status: 'PENDING' }
  }
  if (check.intentionalDifferenceReason?.trim() && check.expectedDifferenceMm === null) {
    return { ...base, differenceMm: null, residualDifferenceMm: null, status: 'FAIL' }
  }
  const expectedDifferenceMm = check.expectedDifferenceMm ?? 0
  const intentionalDifferenceIsDocumented = Boolean(check.intentionalDifferenceReason?.trim())
  if (![check.leftLengthMm, check.rightLengthMm, check.toleranceMm, expectedDifferenceMm].every(Number.isFinite)
    || check.leftLengthMm < 0 || check.rightLengthMm < 0 || check.toleranceMm < 0) {
    return { ...base, differenceMm: null, residualDifferenceMm: null, status: 'FAIL' }
  }
  if (expectedDifferenceMm < 0 || (expectedDifferenceMm > 0 && !intentionalDifferenceIsDocumented)) {
    return { ...base, differenceMm: null, residualDifferenceMm: null, status: 'FAIL' }
  }

  const differenceMm = Math.abs(check.leftLengthMm - check.rightLengthMm)
  const residualDifferenceMm = Math.abs(differenceMm - expectedDifferenceMm)
  return {
    ...base,
    differenceMm,
    residualDifferenceMm,
    status: residualDifferenceMm <= check.toleranceMm ? 'PASS' : 'FAIL',
  }
}

export function isGeometryIntegrityVerified(report: GeometryIntegrityReport): boolean {
  return Object.values(report).every((status) => status === 'PASS')
}

export function isSizeDomainVerified(report: SizeDomainReport): boolean {
  if (report.cases.length === 0) return false
  const caseIds = report.cases.map(({ caseId }) => caseId)
  if (caseIds.some((caseId) => !caseId.trim()) || new Set(caseIds).size !== caseIds.length) return false

  const requiredBoundaries = ['minimum', 'base', 'maximum'] as const
  for (const boundary of requiredBoundaries) {
    if (report.cases.filter((testCase) => testCase.boundary === boundary).length !== 1) return false
  }

  if (report.supportsLengthTypes) {
    const requiredLengthTypes = ['short', 'regular', 'long'] as const
    if (requiredLengthTypes.some((lengthType) => !report.cases.some((testCase) => testCase.lengthType === lengthType))) return false
  } else if (report.cases.some((testCase) => testCase.lengthType !== null)) {
    return false
  }
  if (report.requiresExtremeAllowedBustWaistRatio
    && !report.cases.some((testCase) => testCase.extremeAllowedBustWaistRatio)) return false

  return report.cases.every((testCase) =>
    testCase.measurementsValid === 'PASS'
    && testCase.geometryValid === 'PASS'
    && testCase.sizeConditionsApplied === 'PASS')
}

function isEvaluationStageVerified(stage: EvaluationStage): boolean {
  return stage.status === 'PASS' && Boolean(stage.evidenceNote.trim())
}

export function isBodiceValidationSuiteVerified(suite: BodiceValidationSuite): boolean {
  const hasExactlyOneCheck = (checks: Array<{ checkId: string }>, checkId: string) =>
    checks.filter((check) => check.checkId === checkId).length === 1

  const dimensions = new Map(suite.finishedDimensions.map((check) => [check.checkId, evaluateFinishedDimension(check)]))
  if (REQUIRED_FINISHED_DIMENSION_CHECKS.some((id) =>
    !hasExactlyOneCheck(suite.finishedDimensions, id) || dimensions.get(id)?.status !== 'PASS')) return false

  const seams = new Map(suite.seamMatches.map((check) => [check.checkId, evaluateSeamMatch(check)]))
  if (REQUIRED_SEAM_MATCH_CHECKS.some((id) =>
    !hasExactlyOneCheck(suite.seamMatches, id) || seams.get(id)?.status !== 'PASS')) return false

  if (!suite.geometryIntegrity || !isGeometryIntegrityVerified(suite.geometryIntegrity)) return false
  if (!isSizeDomainVerified(suite.sizeDomain)) return false
  if (!isEvaluationStageVerified(suite.evaluation.editionFidelity)
    || !isEvaluationStageVerified(suite.evaluation.blockConsistency)) return false
  if (!isFitEvaluationVerified(suite.evaluation.fit)
    || !isAdaptationEvaluationVerified(suite.evaluation.adaptation)) return false
  if (suite.evaluation.adaptation.sourceRulesUnchanged !== true) return false
  return true
}

export function isFitEvaluationVerified(stage: FitEvaluationStage): boolean {
  return isEvaluationStageVerified(stage)
    && Boolean(stage.targetPopulation?.trim())
    && Boolean(stage.fitSubject?.trim())
}

export function isAdaptationEvaluationVerified(stage: AdaptationEvaluationStage): boolean {
  if (!isEvaluationStageVerified(stage) || !stage.sourceRulesUnchanged) return false
  return stage.modifications.every((modification) =>
    Boolean(modification.adaptationId.trim()) && Boolean(modification.description.trim()))
}
