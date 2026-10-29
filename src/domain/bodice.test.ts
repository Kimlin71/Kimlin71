import { describe, expect, it } from 'vitest'
import { BODICE_GEOMETRY_RULE_IDS, BODICE_SYSTEM_PROFILE, getBodiceDraftReadiness, validateBodiceAdaptation, validateBodiceDimensions, validateBodiceMeasurementMapping, validateEaseRule, type BodiceDraftSpecification, type BodiceDimensions } from './bodice'
import { REQUIRED_FINISHED_DIMENSION_CHECKS, REQUIRED_SEAM_MATCH_CHECKS, type BodiceValidationSuite } from './bodice-validation'

const measurements: BodiceDimensions = {
  bustMm: 900,
  waistMm: 700,
  shoulderBreadthMm: 400,
  armholeDepthMm: 220,
  frontWaistLengthMm: 400,
}

const pendingSpecification: BodiceDraftSpecification = {
  ...BODICE_SYSTEM_PROFILE,
  measurements,
  adaptation: { seamAllowanceMm: 0 },
}

function createVerifiedMappingRegistry(): BodiceDraftSpecification['measurementMapping'] {
  return {
    status: 'verified',
    records: BODICE_SYSTEM_PROFILE.measurementMapping.records.map((mapping) => ({
      ...mapping,
      aldrich: { ...mapping.aldrich, ruleId: 'test-only', sourceTerm: 'test fixture', sourcePage: 1, sourceTextVerified: true },
      iso: {
        ...mapping.iso,
        clause: 'test fixture',
        canonicalTerm: 'test fixture',
        measurementId: 'test fixture',
        landmarkStart: 'test fixture',
        landmarkEnd: 'test fixture',
        measurementPath: 'girth',
        measurementExtent: 'whole',
        planeOrLevel: 'test fixture',
        armPosition: 'test fixture',
        posture: 'test fixture',
      },
      relationship: { ...mapping.relationship, status: 'REFERENCE_ONLY', semanticEquivalence: 'none' },
      implementation: { ...mapping.implementation, variableClassification: 'BODY_MEASUREMENT', requiredForDraft: false },
      verification: {
        ...mapping.verification,
        checkedBy: 'test fixture',
        checkedDate: '2026-01-01',
        primarySourceChecked: true,
        aldrichPrimarySourceChecked: true,
        isoPrimarySourceChecked: true,
        status: 'verified',
        evidenceNote: 'Synthetic test data only; no source claim.',
      },
    })),
  }
}

function createVerifiedGeometryRule(id: typeof BODICE_GEOMETRY_RULE_IDS[number]) {
  return {
    id,
    source: { work: 'Metric Pattern Cutting for Women’s Wear', edition: '6 (2015)', page: 1 },
    formula: {
      output: 'test-output',
      formulaReference: 'test-fixture-only',
      expressionStatus: 'verified' as const,
      inputs: ['test-input'],
      constants: [],
      operatorOrder: ['test-operation'],
      divisorReference: null,
      unitsByTerm: { 'test-input': 'mm' },
      unit: 'mm' as const,
      appliesWhen: 'test-fixture-only',
      validRangeReference: 'test-fixture-only',
      rounding: 'final_only' as const,
      roundingReference: null,
    },
    acceptance: {
      sourceIdentified: 'PASS' as const,
      errataReviewed: 'PASS' as const,
      notSecondarySourceOnly: 'PASS' as const,
      editionConfirmed: 'PASS' as const,
      blockVariantConfirmed: 'PASS' as const,
      sourceLocationRecorded: 'PASS' as const,
      terminologyMapped: 'PASS' as const,
      anatomicalLandmarksMatch: 'PASS' as const,
      measurementPathMatches: 'PASS' as const,
      postureMatches: 'PASS' as const,
      variableClassified: 'PASS' as const,
      easeSeparated: 'PASS' as const,
      unitsExplicit: 'PASS' as const,
      formulaTranscribed: 'PASS' as const,
      conditionsTranscribed: 'PASS' as const,
      roundingDefined: 'PASS' as const,
      geometryDeterministic: 'PASS' as const,
      independentRecalculationPassed: 'PASS' as const,
      boundarySizesPassed: 'PASS' as const,
      dimensionalValidationPassed: 'PASS' as const,
      geometryValidationPassed: 'PASS' as const,
      secondPersonReviewed: 'NOT_REQUIRED' as const,
      finalStatus: 'VERIFIED' as const,
    },
  }
}

function createVerifiedEaseRule() {
  return {
    easeRuleId: 'test-ease',
    blockId: 'test-block',
    edition: 6 as const,
    sourcePage: 1,
    dimension: { bodyMeasurementId: 'test-measurement', location: 'bust' as const },
    value: {
      amountMm: 0,
      formulaReference: null,
      applicationScope: 'full_girth' as const,
      distribution: { frontMm: 0, backMm: 0 },
    },
    interpretation: { wearingEase: true, designEase: false, constructionAllowance: false, seamAllowance: false as const },
    verification: { sourceVerified: true, distributionVerified: true, finishedMeasurementTested: true, status: 'verified' as const },
  }
}

function createSyntheticGeometryPrimitives() {
  return {
    dartShapingAllocation: { bustDartIntakeMm: 0, waistDartIntakeMm: 0, totalShapingMm: 0, allocationVerified: true },
    points: [{ pointId: 'test-point', dependsOn: ['test-origin'], constructionOrder: 1, originPointId: 'test-origin', positiveXDirection: 'right' as const, positiveYDirection: 'down' as const, xRule: 'test-x-reference', yRule: 'test-y-reference', mirroredFromPointId: null, projectedFromPointId: null, sourceReference: 'test-only', toleranceMm: 0.1, status: 'VERIFIED' as const }],
    curves: [{ curveId: 'test-curve', sourceMethod: 'explicit_control_points' as const, startPoint: 'test-start', endPoint: 'test-end', guidePoints: [], tangentConstraints: [], digitalRepresentation: 'cubic_bezier' as const, toleranceMm: 0.1, deterministic: true, status: 'VERIFIED' as const }],
    darts: [{ dartId: 'test-dart', dartPoint: 'test-point', centerline: 'test-centerline', legs: ['test-leg-a', 'test-leg-b'] as [string, string], intakeMm: 0, lengthMm: 1, direction: 'test-direction', distanceFromBustPointMm: 1, rotationVerified: true, trueingVerified: true, status: 'VERIFIED' as const }],
  }
}

function createSyntheticValidationSuite(): BodiceValidationSuite {
  return {
    finishedDimensions: REQUIRED_FINISHED_DIMENSION_CHECKS.map((checkId) => ({
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
    })),
    seamMatches: REQUIRED_SEAM_MATCH_CHECKS.map((checkId) => ({
      checkId,
      leftSegmentId: 'test-left',
      rightSegmentId: 'test-right',
      leftLengthMm: 100,
      rightLengthMm: 100,
      toleranceMm: 0.5,
      intentionalDifferenceReason: null,
      expectedDifferenceMm: null,
    })),
    geometryIntegrity: {
      selfIntersectionFree: 'PASS',
      contoursClosed: 'PASS',
      duplicatePointSemanticsResolved: 'PASS',
      dartIntakesNonNegative: 'PASS',
      pieceOrientationCorrect: 'PASS',
      curveContinuityVerified: 'PASS',
      dependenciesResolved: 'PASS',
      dependencyGraphAcyclic: 'PASS',
      masterBlockExcludesSeamAllowance: 'PASS',
    },
    sizeDomain: {
      supportsLengthTypes: true,
      requiresExtremeAllowedBustWaistRatio: true,
      cases: [
        { caseId: 'minimum', boundary: 'minimum', lengthType: 'regular', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'base', boundary: 'base', lengthType: 'regular', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'maximum', boundary: 'maximum', lengthType: 'regular', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'short', boundary: 'interior', lengthType: 'short', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'long', boundary: 'interior', lengthType: 'long', extremeAllowedBustWaistRatio: false, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
        { caseId: 'extreme-ratio', boundary: 'interior', lengthType: 'regular', extremeAllowedBustWaistRatio: true, measurementsValid: 'PASS', geometryValid: 'PASS', sizeConditionsApplied: 'PASS' },
      ],
    },
    evaluation: {
      editionFidelity: { status: 'PASS', evidenceNote: 'Synthetic fixture only.' },
      blockConsistency: { status: 'PASS', evidenceNote: 'Synthetic fixture only.' },
      fit: { status: 'PASS', evidenceNote: 'Synthetic fixture only.', targetPopulation: 'synthetic-sample', fitSubject: 'synthetic-form' },
      adaptation: { status: 'PASS', evidenceNote: 'Synthetic fixture only.', modifications: [{ adaptationId: 'fit-001', description: 'Synthetic adaptation only.' }], sourceRulesUnchanged: true },
    },
  }
}

describe('bodice specification readiness', () => {
  it('validates body measurements in millimeters', () => {
    expect(validateBodiceDimensions({ ...measurements, bustMm: 0 })).toMatch(/bust circumference/i)
    expect(validateBodiceDimensions({ ...measurements, armholeDepthMm: 400 })).toMatch(/shorter/i)
    expect(validateBodiceDimensions(measurements)).toBeNull()
  })

  it('keeps seam allowance in an independent adaptation setting', () => {
    expect(validateBodiceAdaptation({ seamAllowanceMm: 0 })).toBeNull()
    expect(validateBodiceAdaptation({ seamAllowanceMm: -1 })).toMatch(/negative/i)
  })

  it('blocks geometry while ISO measurement definitions are unverified', () => {
    expect(getBodiceDraftReadiness(pendingSpecification)).toMatch(/ISO 8559-1/i)
  })

  it('keeps candidate mappings explicitly draft and does not invent source details', () => {
    const candidates = BODICE_SYSTEM_PROFILE.measurementMapping.records
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every((mapping) => mapping.verification.status === 'draft')).toBe(true)
    expect(candidates.every((mapping) => mapping.aldrich.sourceTerm === null && mapping.aldrich.sourcePage === null)).toBe(true)
    expect(candidates.every((mapping) => mapping.implementation.requiredForDraft === null)).toBe(true)
    expect(candidates.find((mapping) => mapping.mappingId === 'armscye-size')?.relationship.status).toBe('REFERENCE_ONLY')
  })

  it('rejects an unverified or incomplete mapping even when marked required', () => {
    const candidate = BODICE_SYSTEM_PROFILE.measurementMapping.records[0]
    expect(validateBodiceMeasurementMapping(candidate)).toMatch(/not been verified/i)
    expect(validateBodiceMeasurementMapping({
      ...candidate,
      verification: {
        ...candidate.verification,
        status: 'verified',
        primarySourceChecked: true,
        aldrichPrimarySourceChecked: true,
        isoPrimarySourceChecked: true,
      },
      aldrich: { ...candidate.aldrich, sourceTextVerified: true },
    })).toMatch(/needs verifier/i)
  })

  it('requires all seven edition-specific, page-cited geometry rules before geometry', () => {
    const withDefinitions = { ...pendingSpecification, ...createSyntheticGeometryPrimitives(), measurementMapping: createVerifiedMappingRegistry() }
    expect(getBodiceDraftReadiness(withDefinitions)).toMatch(/neckline rule is pending/i)

    const verifiedGeometry = BODICE_GEOMETRY_RULE_IDS.map(createVerifiedGeometryRule)
    const withRules = { ...withDefinitions, geometry: verifiedGeometry }
    expect(getBodiceDraftReadiness(withRules)).toMatch(/ease rules.*pending verification/i)

    const mismatchedSourceRules = verifiedGeometry.map((rule, index) => index === 0
      ? { ...rule, source: { ...rule.source, edition: '5 (2014)' } }
      : rule)
    expect(getBodiceDraftReadiness({ ...withDefinitions, geometry: mismatchedSourceRules })).toMatch(/neckline rule needs.*edition 6/i)
  })

  it('requires explicit finite ease, but does not require grading to generate the base block', () => {
    const verifiedGeometry = BODICE_GEOMETRY_RULE_IDS.map(createVerifiedGeometryRule)
    const ready = {
      ...pendingSpecification,
      ...createSyntheticGeometryPrimitives(),
      measurementMapping: createVerifiedMappingRegistry(),
      geometry: verifiedGeometry,
      dartShapingAllocation: { bustDartIntakeMm: 0, waistDartIntakeMm: 0, totalShapingMm: 0, allocationVerified: true },
      ease: { source: 'ALDRICH_6E_VERIFIED_RULES' as const, status: 'verified' as const, rules: [createVerifiedEaseRule()] },
      validation: createSyntheticValidationSuite(),
    }
    expect(getBodiceDraftReadiness(ready)).toBeNull()
    expect(validateEaseRule({ ...createVerifiedEaseRule(), value: { ...createVerifiedEaseRule().value, applicationScope: null } })).toMatch(/application scope/i)
    expect(getBodiceDraftReadiness({ ...ready, ease: { ...ready.ease, rules: [] } })).toMatch(/ease rules.*pending verification/i)
    expect(getBodiceDraftReadiness({ ...ready, masterBlock: { seamAllowanceMm: 1 as 0 } })).toMatch(/exclude seam allowance/i)
  })
})
