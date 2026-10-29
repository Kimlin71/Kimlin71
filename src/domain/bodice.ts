import { createPendingBodiceValidationSuite, isBodiceValidationSuiteVerified, type BodiceValidationSuite } from './bodice-validation'

export type BodiceDimensions = {
  bustMm: number
  waistMm: number
  shoulderBreadthMm: number
  armholeDepthMm: number
  frontWaistLengthMm: number
}

export type BodiceAdaptation = {
  seamAllowanceMm: number
}

export type SourceReference = {
  work: string
  edition: string
  page: number | null
  figure?: string | null
  table?: string | null
}

export const BODICE_GEOMETRY_RULE_IDS = [
  'neckline',
  'shoulder',
  'armscye',
  'bust_point',
  'bust_dart',
  'waist_dart',
  'side_seam',
] as const

export const BODICE_SPECIFICATION_LAYERS = [
  'iso-anthropometry',
  'mapping-registry',
  'aldrich-source-rules',
  'ease-and-allowances',
  'deterministic-geometry',
  'validation',
  'fit-adaptations',
  'production-pattern',
] as const

export type BodiceGeometryRuleId = typeof BODICE_GEOMETRY_RULE_IDS[number]

export type MappingStatus =
  | 'DIRECT'
  | 'CONDITIONAL'
  | 'DERIVED'
  | 'REFERENCE_ONLY'
  | 'ALDRICH_TABLE'
  | 'ALDRICH_CONSTANT'
  | 'UNMAPPED'
  | 'REJECTED'

export type SemanticEquivalence = 'exact' | 'partial' | 'none' | 'pending'
export type MeasurementPath = 'straight' | 'surface' | 'girth' | 'vertical' | 'calculated' | null
export type MappingVerificationStatus = 'draft' | 'verified' | 'rejected' | 'superseded'
export type BodiceVariableClassification =
  | 'BODY_MEASUREMENT'
  | 'TABLE_MEASUREMENT'
  | 'DERIVED_MEASUREMENT'
  | 'EASE'
  | 'DRAFTING_CONSTANT'
  | 'CONSTRUCTION_OFFSET'
  | 'GEOMETRIC_RESULT'
  | 'FIT_ADJUSTMENT'

export type BodiceMeasurementMapping = {
  mappingId: string
  aldrich: {
    edition: 6
    year: 2015
    block: 'basic_body_block_with_bust_dart'
    variant: string
    ruleId: string
    sourceTerm: string | null
    sourcePage: number | null
    sourceFigure: string | null
    sourceTable: string | null
    sourceTextVerified: boolean
  }
  iso: {
    standard: 'ISO_8559-1_2017'
    nationalAdoption: 'SS-EN_ISO_8559-1_2020'
    clause: string | null
    canonicalTerm: string | null
    measurementId: string | null
    landmarkStart: string | null
    landmarkEnd: string | null
    measurementPath: MeasurementPath
    measurementExtent: 'whole' | 'half' | 'quarter' | 'pending'
    planeOrLevel: string | null
    armPosition: string | null
    posture: string | null
  }
  relationship: {
    status: MappingStatus
    semanticEquivalence: SemanticEquivalence
    transformation: string | null
    transformationVerified: boolean
    easeIncluded: false
    easeRuleId: string | null
  }
  implementation: {
    variableName: string
    variableClassification: BodiceVariableClassification | 'PENDING'
    requiredForDraft: boolean | null
    unitInput: 'mm'
    unitInternal: 'mm'
    roundingStage: 'final_only'
    missingValuePolicy: 'error' | 'table_fallback' | 'explicit_estimate'
    formulaReference: string | null
  }
  verification: {
    checkedBy: string | null
    checkedDate: string | null
    primarySourceChecked: boolean
    aldrichPrimarySourceChecked: boolean
    isoPrimarySourceChecked: boolean
    secondChecker: string | null
    status: MappingVerificationStatus
    evidenceNote: string
  }
  candidateNote: string
}

type MappingCandidate = {
  id: string
  concept: string
  isoTerm: string | null
  status: MappingStatus
  note: string
}

function createMappingCandidate({ id, concept, isoTerm, status, note }: MappingCandidate): BodiceMeasurementMapping {
  return {
    mappingId: id,
    aldrich: {
      edition: 6,
      year: 2015,
      block: 'basic_body_block_with_bust_dart',
      variant: 'basic_body_block_with_bust_dart',
      ruleId: id,
      sourceTerm: null,
      sourcePage: null,
      sourceFigure: null,
      sourceTable: null,
      sourceTextVerified: false,
    },
    iso: {
      standard: 'ISO_8559-1_2017',
      nationalAdoption: 'SS-EN_ISO_8559-1_2020',
      clause: null,
      canonicalTerm: isoTerm,
      measurementId: null,
      landmarkStart: null,
      landmarkEnd: null,
      measurementPath: null,
      measurementExtent: 'pending',
      planeOrLevel: null,
      armPosition: null,
      posture: null,
    },
    relationship: {
      status,
      semanticEquivalence: 'pending',
      transformation: null,
      transformationVerified: false,
      easeIncluded: false,
      easeRuleId: null,
    },
    implementation: {
      variableName: id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      variableClassification: 'PENDING',
      requiredForDraft: null,
      unitInput: 'mm',
      unitInternal: 'mm',
      roundingStage: 'final_only',
      missingValuePolicy: 'error',
      formulaReference: null,
    },
    verification: {
      checkedBy: null,
      checkedDate: null,
      primarySourceChecked: false,
      aldrichPrimarySourceChecked: false,
      isoPrimarySourceChecked: false,
      secondChecker: null,
      status: 'draft',
      evidenceNote: '',
    },
    candidateNote: `${concept}: ${note}`,
  }
}

export const ISO_TO_ALDRICH_MAPPING_CANDIDATES: BodiceMeasurementMapping[] = [
  createMappingCandidate({ id: 'bust-measurement', concept: 'Bust/chest measurement', isoTerm: 'Bust girth', status: 'CONDITIONAL', note: 'Verify whether Aldrich means full bust, chest, or another circumference.' }),
  createMappingCandidate({ id: 'waist-measurement', concept: 'Waist measurement', isoTerm: 'Waist girth', status: 'CONDITIONAL', note: 'Verify natural waist level and measurement tension.' }),
  createMappingCandidate({ id: 'neck-measurement', concept: 'Neck measurement', isoTerm: null, status: 'UNMAPPED', note: 'Determine whether Aldrich uses neck girth or neck base girth.' }),
  createMappingCandidate({ id: 'back-neck-to-waist', concept: 'Back neck-to-waist', isoTerm: 'Back-neck-point-to-waist', status: 'CONDITIONAL', note: 'Verify start landmark, back contour, and measurement path.' }),
  createMappingCandidate({ id: 'front-neck-to-waist', concept: 'Front neck-to-waist', isoTerm: 'Front-neck-point-to-waist', status: 'CONDITIONAL', note: 'Verify whether the path follows the bust surface in the same way.' }),
  createMappingCandidate({ id: 'bust-height', concept: 'Bust height', isoTerm: 'Bust height', status: 'UNMAPPED', note: 'Distinguish vertical height from a surface-following length.' }),
  createMappingCandidate({ id: 'bust-point-separation', concept: 'Bust-point separation', isoTerm: 'Bust point width', status: 'CONDITIONAL', note: 'Verify full distance versus a half-distance construction input.' }),
  createMappingCandidate({ id: 'shoulder-length', concept: 'Shoulder length', isoTerm: 'Shoulder length', status: 'CONDITIONAL', note: 'Verify start/end landmarks and any dart-related construction length.' }),
  createMappingCandidate({ id: 'across-back', concept: 'Across back', isoTerm: 'Across-back width', status: 'CONDITIONAL', note: 'Verify measurement level and arm position.' }),
  createMappingCandidate({ id: 'across-front-chest', concept: 'Across-front/chest', isoTerm: 'Across-front width', status: 'CONDITIONAL', note: 'Verify level, path, and whether bust shape is included.' }),
  createMappingCandidate({ id: 'scye-depth', concept: 'Scye depth', isoTerm: 'Scye-depth length', status: 'UNMAPPED', note: 'Determine whether this is a direct body measure or a table/formula value.' }),
  createMappingCandidate({ id: 'armscye-size', concept: 'Armscye size', isoTerm: 'Armscye girth', status: 'REFERENCE_ONLY', note: 'Candidate for validation only; do not substitute for geometric armscye construction.' }),
  createMappingCandidate({ id: 'neck-width', concept: 'Neck width', isoTerm: 'Neck base width', status: 'REFERENCE_ONLY', note: 'Candidate for validation only; determine whether construction uses a body measure or a proportion.' }),
  createMappingCandidate({ id: 'bust-projection', concept: 'Bust projection', isoTerm: 'Bust depth', status: 'REFERENCE_ONLY', note: 'Candidate for validation only; do not replace the verified dart rule.' }),
  createMappingCandidate({ id: 'back-shoulder-width', concept: 'Back shoulder width', isoTerm: 'Back shoulder width', status: 'REFERENCE_ONLY', note: 'Candidate for validation of finished shoulder/back geometry.' }),
  createMappingCandidate({ id: 'side-waist-length', concept: 'Side waist length', isoTerm: 'Side waist length', status: 'UNMAPPED', note: 'Verify whether the block uses this measure or only validates against it.' }),
  createMappingCandidate({ id: 'upper-arm-measurement', concept: 'Upper-arm measurement', isoTerm: 'Upper-arm girth', status: 'CONDITIONAL', note: 'Relevant to sleeve drafting; sleeve ease must remain separate.' }),
]

export type EaseRule = {
  easeRuleId: string
  blockId: string
  edition: 6
  sourcePage: number | null
  dimension: {
    bodyMeasurementId: string
    location: 'bust' | 'waist' | 'neck' | 'armscye' | 'upper_arm' | 'other'
  }
  value: {
    amountMm: number | null
    formulaReference: string | null
    applicationScope: 'full_girth' | 'half_block' | 'quarter_block' | 'front_only' | 'back_only' | null
    distribution: { frontMm: number | null; backMm: number | null }
  }
  interpretation: {
    wearingEase: boolean | null
    designEase: boolean | null
    constructionAllowance: boolean | null
    seamAllowance: false
  }
  verification: {
    sourceVerified: boolean
    distributionVerified: boolean
    finishedMeasurementTested: boolean
    status: 'draft' | 'verified' | 'rejected'
  }
}

export type RuleCheckStatus = 'PASS' | 'FAIL' | 'PENDING' | 'NOT_REQUIRED'
export type RuleFinalStatus = 'DRAFT' | 'VERIFIED' | 'REJECTED' | 'SUPERSEDED'

export type BodiceRuleAcceptance = {
  sourceIdentified: RuleCheckStatus
  errataReviewed: RuleCheckStatus
  notSecondarySourceOnly: RuleCheckStatus
  editionConfirmed: RuleCheckStatus
  blockVariantConfirmed: RuleCheckStatus
  sourceLocationRecorded: RuleCheckStatus
  terminologyMapped: RuleCheckStatus
  anatomicalLandmarksMatch: RuleCheckStatus
  measurementPathMatches: RuleCheckStatus
  postureMatches: RuleCheckStatus
  variableClassified: RuleCheckStatus
  easeSeparated: RuleCheckStatus
  unitsExplicit: RuleCheckStatus
  formulaTranscribed: RuleCheckStatus
  conditionsTranscribed: RuleCheckStatus
  roundingDefined: RuleCheckStatus
  geometryDeterministic: RuleCheckStatus
  independentRecalculationPassed: RuleCheckStatus
  boundarySizesPassed: RuleCheckStatus
  dimensionalValidationPassed: RuleCheckStatus
  geometryValidationPassed: RuleCheckStatus
  secondPersonReviewed: RuleCheckStatus
  finalStatus: RuleFinalStatus
}

export type VerifiedFormulaSchema = {
  output: string
  formulaReference: string | null
  expressionStatus: 'pending_verified_transcription' | 'verified'
  inputs: string[]
  constants: string[]
  operatorOrder: string[]
  divisorReference: string | null
  unitsByTerm: Record<string, string>
  unit: 'mm'
  appliesWhen: string | null
  validRangeReference: string | null
  rounding: 'source_defined' | 'final_only' | null
  roundingReference: string | null
}

export type BodiceDraftingRule = {
  id: BodiceGeometryRuleId
  source: SourceReference | null
  formula: VerifiedFormulaSchema | null
  acceptance: BodiceRuleAcceptance
}

const pendingAcceptance = (): BodiceRuleAcceptance => ({
  sourceIdentified: 'PENDING',
  errataReviewed: 'PENDING',
  notSecondarySourceOnly: 'PENDING',
  editionConfirmed: 'PENDING',
  blockVariantConfirmed: 'PENDING',
  sourceLocationRecorded: 'PENDING',
  terminologyMapped: 'PENDING',
  anatomicalLandmarksMatch: 'PENDING',
  measurementPathMatches: 'PENDING',
  postureMatches: 'PENDING',
  variableClassified: 'PENDING',
  easeSeparated: 'PENDING',
  unitsExplicit: 'PENDING',
  formulaTranscribed: 'PENDING',
  conditionsTranscribed: 'PENDING',
  roundingDefined: 'PENDING',
  geometryDeterministic: 'PENDING',
  independentRecalculationPassed: 'PENDING',
  boundarySizesPassed: 'PENDING',
  dimensionalValidationPassed: 'PENDING',
  geometryValidationPassed: 'PENDING',
  secondPersonReviewed: 'PENDING',
  finalStatus: 'DRAFT',
})

export type BodicePointRule = {
  pointId: string
  dependsOn: string[]
  constructionOrder: number | null
  originPointId: string | null
  positiveXDirection: 'left' | 'right' | null
  positiveYDirection: 'up' | 'down' | null
  xRule: string | null
  yRule: string | null
  mirroredFromPointId: string | null
  projectedFromPointId: string | null
  sourceReference: string | null
  toleranceMm: number | null
  status: RuleFinalStatus
}

export type BodiceCurveRule = {
  curveId: string
  sourceMethod: 'physical_curve' | 'geometric_construction' | 'explicit_control_points' | null
  startPoint: string | null
  endPoint: string | null
  guidePoints: string[]
  tangentConstraints: string[]
  digitalRepresentation: 'cubic_bezier' | 'spline' | 'circular_arc' | 'pending'
  toleranceMm: number | null
  deterministic: boolean
  status: RuleFinalStatus
}

export type BodiceDartRule = {
  dartId: string
  dartPoint: string | null
  centerline: string | null
  legs: [string, string] | null
  intakeMm: number | null
  lengthMm: number | null
  direction: string | null
  distanceFromBustPointMm: number | null
  rotationVerified: boolean
  trueingVerified: boolean
  status: RuleFinalStatus
}

export type BodiceDartShapingAllocation = {
  bustDartIntakeMm: number | null
  waistDartIntakeMm: number | null
  totalShapingMm: number | null
  allocationVerified: boolean
}

export type ProductionPatternSpecification = {
  status: RuleFinalStatus
  seamAllowanceMm: number | null
  seamAllowanceSourceReference: string | null
  masterBlockExcludesSeamAllowance: true
  grainline: { status: RuleFinalStatus; sourceReference: string | null }
  notches: Array<{ notchId: string; sourceReference: string | null }>
  labels: Array<{ labelId: string; sourceReference: string | null }>
  metadata: { status: RuleFinalStatus; fields: string[] }
}

export type ProposedTechnicalTolerances = {
  status: 'proposal' | 'approved'
  source: 'internal-technical-proposal'
  pointCoordinatesMm: number
  straightSegmentsMm: number
  totalCircumferenceMm: number
  matchingSeamsMm: number
}

export type BodiceDraftMethod = {
  system: 'Winifred Aldrich'
  publication: 'Metric Pattern Cutting for Women’s Wear'
  edition: 6
  year: 2015
}

export type BodiceRulePolicy = {
  inferredRules: 'prohibited'
  crossSystemSubstitution: 'prohibited'
  undocumentedConstants: 'prohibited'
}

export type BodiceDraftSpecification = {
  profileId: 'GENERIC_WOMENSWEAR_V1'
  anthropometry: { standard: 'ISO 8559-1:2017'; status: 'reference-locked' }
  sizeDesignation: { standard: 'ISO 8559-2:2025'; status: 'reference-locked' }
  drafting: {
    method: BodiceDraftMethod
    blockFamily: 'Basic body blocks with bust darts'
    status: 'source-locked'
  }
  measurementMapping: {
    status: 'pending-verification' | 'verified'
    records: BodiceMeasurementMapping[]
  }
  measurements: BodiceDimensions
  geometry: BodiceDraftingRule[]
  points: BodicePointRule[]
  curves: BodiceCurveRule[]
  darts: BodiceDartRule[]
  dartShapingAllocation: BodiceDartShapingAllocation
  masterBlock: { seamAllowanceMm: 0 }
  ease: {
    source: 'ALDRICH_6E_VERIFIED_RULES'
    status: 'pending-verification' | 'verified'
    rules: EaseRule[]
  }
  adaptation: BodiceAdaptation
  grading: { specification: 'separate' }
  rulePolicy: BodiceRulePolicy
  proposedTechnicalTolerances: ProposedTechnicalTolerances
  validation: BodiceValidationSuite
  productionPattern: ProductionPatternSpecification
}

export const BODICE_SYSTEM_PROFILE: Omit<BodiceDraftSpecification, 'measurements' | 'adaptation'> = {
  profileId: 'GENERIC_WOMENSWEAR_V1',
  anthropometry: { standard: 'ISO 8559-1:2017', status: 'reference-locked' },
  sizeDesignation: { standard: 'ISO 8559-2:2025', status: 'reference-locked' },
  drafting: {
    method: {
      system: 'Winifred Aldrich',
      publication: 'Metric Pattern Cutting for Women’s Wear',
      edition: 6,
      year: 2015,
    },
    blockFamily: 'Basic body blocks with bust darts',
    status: 'source-locked',
  },
  measurementMapping: { status: 'pending-verification', records: ISO_TO_ALDRICH_MAPPING_CANDIDATES },
  geometry: BODICE_GEOMETRY_RULE_IDS.map((id) => ({
    id,
    source: null,
    formula: null,
    acceptance: pendingAcceptance(),
  })),
  masterBlock: { seamAllowanceMm: 0 },
  points: [],
  curves: [],
  darts: [],
  dartShapingAllocation: {
    bustDartIntakeMm: null,
    waistDartIntakeMm: null,
    totalShapingMm: null,
    allocationVerified: false,
  },
  ease: { source: 'ALDRICH_6E_VERIFIED_RULES', status: 'pending-verification', rules: [] },
  grading: { specification: 'separate' },
  rulePolicy: {
    inferredRules: 'prohibited',
    crossSystemSubstitution: 'prohibited',
    undocumentedConstants: 'prohibited',
  },
  proposedTechnicalTolerances: {
    status: 'proposal',
    source: 'internal-technical-proposal',
    pointCoordinatesMm: 0.1,
    straightSegmentsMm: 0.2,
    totalCircumferenceMm: 0.5,
    matchingSeamsMm: 1,
  },
  validation: createPendingBodiceValidationSuite(),
  productionPattern: {
    status: 'DRAFT',
    seamAllowanceMm: null,
    seamAllowanceSourceReference: null,
    masterBlockExcludesSeamAllowance: true,
    grainline: { status: 'DRAFT', sourceReference: null },
    notches: [],
    labels: [],
    metadata: { status: 'DRAFT', fields: [] },
  },
}

export function validateBodiceDimensions(dimensions: BodiceDimensions): string | null {
  const positiveMeasurements: Array<[string, number]> = [
    ['Bust circumference', dimensions.bustMm],
    ['Waist circumference', dimensions.waistMm],
    ['Shoulder breadth', dimensions.shoulderBreadthMm],
    ['Armhole depth', dimensions.armholeDepthMm],
    ['Front waist length', dimensions.frontWaistLengthMm],
  ]
  for (const [name, value] of positiveMeasurements) {
    if (!Number.isFinite(value) || value <= 0) return `Enter a ${name.toLowerCase()} greater than zero.`
  }
  if (dimensions.armholeDepthMm >= dimensions.frontWaistLengthMm) {
    return 'Armhole depth must be shorter than front waist length.'
  }
  return null
}

export function validateBodiceAdaptation(adaptation: BodiceAdaptation): string | null {
  if (!Number.isFinite(adaptation.seamAllowanceMm) || adaptation.seamAllowanceMm < 0) {
    return 'Seam allowance cannot be negative.'
  }
  return null
}

const REQUIRED_RULE_CHECKS: Array<keyof BodiceRuleAcceptance> = [
  'sourceIdentified',
  'errataReviewed',
  'notSecondarySourceOnly',
  'editionConfirmed',
  'blockVariantConfirmed',
  'sourceLocationRecorded',
  'terminologyMapped',
  'anatomicalLandmarksMatch',
  'measurementPathMatches',
  'postureMatches',
  'variableClassified',
  'easeSeparated',
  'unitsExplicit',
  'formulaTranscribed',
  'conditionsTranscribed',
  'roundingDefined',
  'geometryDeterministic',
  'independentRecalculationPassed',
  'boundarySizesPassed',
  'dimensionalValidationPassed',
  'geometryValidationPassed',
]

export function validateBodiceMeasurementMapping(mapping: BodiceMeasurementMapping): string | null {
  const { aldrich, iso, relationship, implementation, verification } = mapping
  if (verification.status !== 'verified' || !verification.primarySourceChecked
    || !verification.aldrichPrimarySourceChecked || !verification.isoPrimarySourceChecked
    || !aldrich.sourceTextVerified) {
    return `Mapping ${mapping.mappingId} has not been verified against both primary sources.`
  }
  const checkedDate = verification.checkedDate
  const parsedDate = checkedDate ? new Date(`${checkedDate}T00:00:00Z`) : null
  const isValidDate = checkedDate !== null
    && /^\d{4}-\d{2}-\d{2}$/.test(checkedDate)
    && parsedDate !== null
    && !Number.isNaN(parsedDate.valueOf())
    && parsedDate.toISOString().slice(0, 10) === checkedDate
  if (!verification.checkedBy?.trim() || !isValidDate || !verification.evidenceNote.trim()) {
    return `Mapping ${mapping.mappingId} needs verifier, date, and evidence note.`
  }
  if (!aldrich.sourceTerm?.trim() || !Number.isInteger(aldrich.sourcePage) || !aldrich.sourcePage || !aldrich.ruleId.trim()) {
    return `Mapping ${mapping.mappingId} needs Aldrich source terminology, rule ID, and page.`
  }
  if (!iso.clause?.trim() || !iso.canonicalTerm?.trim() || !iso.measurementId?.trim()
    || !iso.landmarkStart?.trim() || !iso.landmarkEnd?.trim() || !iso.measurementPath
    || iso.measurementExtent === 'pending' || !iso.planeOrLevel?.trim()
    || !iso.armPosition?.trim() || !iso.posture?.trim()) {
    return `Mapping ${mapping.mappingId} needs a complete ISO definition and measurement conditions.`
  }
  if (relationship.easeIncluded) return `Mapping ${mapping.mappingId} must not include ease.`
  if (implementation.requiredForDraft === null || implementation.variableClassification === 'PENDING') {
    return `Mapping ${mapping.mappingId} needs a draft-use decision and variable classification.`
  }
  if (relationship.status === 'DIRECT' && relationship.semanticEquivalence !== 'exact') {
    return `Direct mapping ${mapping.mappingId} requires exact semantic equivalence.`
  }
  if (relationship.status === 'DIRECT' && relationship.transformation !== null) {
    return `Direct mapping ${mapping.mappingId} cannot include a transformation.`
  }
  if ((relationship.status === 'CONDITIONAL' || relationship.status === 'DERIVED')
    && (!relationship.transformation?.trim() || !relationship.transformationVerified)) {
    return `Mapping ${mapping.mappingId} needs a documented, verified transformation or condition.`
  }
  if (relationship.status === 'DERIVED' && implementation.variableClassification !== 'DERIVED_MEASUREMENT') {
    return `Derived mapping ${mapping.mappingId} must be classified as DERIVED_MEASUREMENT.`
  }
  if (relationship.status === 'ALDRICH_TABLE'
    && (implementation.variableClassification !== 'TABLE_MEASUREMENT'
      || implementation.missingValuePolicy !== 'table_fallback'
      || !aldrich.sourceTable?.trim())) {
    return `Aldrich table mapping ${mapping.mappingId} needs table classification, table source, and table fallback policy.`
  }
  if (relationship.status === 'ALDRICH_CONSTANT'
    && implementation.variableClassification !== 'DRAFTING_CONSTANT') {
    return `Aldrich constant ${mapping.mappingId} must be classified as DRAFTING_CONSTANT.`
  }
  if (relationship.status === 'UNMAPPED' || relationship.status === 'REJECTED') {
    return `Mapping ${mapping.mappingId} cannot be used as a verified draft input.`
  }
  if (implementation.unitInput !== 'mm' || implementation.unitInternal !== 'mm'
    || implementation.roundingStage !== 'final_only') {
    return `Mapping ${mapping.mappingId} must use millimeters and final-only rounding.`
  }
  return null
}

export function validateEaseRule(rule: EaseRule): string | null {
  if (rule.verification.status !== 'verified' || !rule.verification.sourceVerified
    || !rule.verification.distributionVerified || !rule.verification.finishedMeasurementTested) {
    return `Ease rule ${rule.easeRuleId} is not fully verified.`
  }
  if (!rule.easeRuleId.trim() || !rule.blockId.trim() || !rule.dimension.bodyMeasurementId.trim()) {
    return 'Ease rule needs an ID, block, and body-measurement reference.'
  }
  if (!rule.sourcePage || !Number.isInteger(rule.sourcePage)) return `Ease rule ${rule.easeRuleId} needs a source page.`
  if ((rule.value.amountMm === null) === (rule.value.formulaReference === null)) {
    return `Ease rule ${rule.easeRuleId} needs either an explicit amount or a formula reference, but not both.`
  }
  if (rule.value.formulaReference !== null && !rule.value.formulaReference.trim()) {
    return `Ease rule ${rule.easeRuleId} needs a non-empty formula reference.`
  }
  if (rule.value.amountMm !== null && !Number.isFinite(rule.value.amountMm)) {
    return `Ease rule ${rule.easeRuleId} needs a finite millimeter amount.`
  }
  if (!rule.value.applicationScope) return `Ease rule ${rule.easeRuleId} needs an application scope.`
  if (rule.value.distribution.frontMm === null || rule.value.distribution.backMm === null
    || !Number.isFinite(rule.value.distribution.frontMm) || !Number.isFinite(rule.value.distribution.backMm)) {
    return `Ease rule ${rule.easeRuleId} needs verified front/back distribution.`
  }
  if (rule.interpretation.wearingEase === null || rule.interpretation.designEase === null
    || rule.interpretation.constructionAllowance === null || rule.interpretation.seamAllowance !== false) {
    return `Ease rule ${rule.easeRuleId} must classify ease and exclude seam allowance.`
  }
  return null
}

export function isProductionPatternReady(pattern: ProductionPatternSpecification): boolean {
  if (pattern.status !== 'VERIFIED' || pattern.masterBlockExcludesSeamAllowance !== true) return false
  if (pattern.seamAllowanceMm === null || !Number.isFinite(pattern.seamAllowanceMm) || pattern.seamAllowanceMm < 0
    || !pattern.seamAllowanceSourceReference?.trim()) return false
  if (pattern.grainline.status !== 'VERIFIED' || !pattern.grainline.sourceReference?.trim()) return false
  if (pattern.notches.some((notch) => !notch.notchId.trim() || !notch.sourceReference?.trim())) return false
  if (pattern.labels.some((label) => !label.labelId.trim() || !label.sourceReference?.trim())) return false
  return pattern.metadata.status === 'VERIFIED' && pattern.metadata.fields.length > 0
    && pattern.metadata.fields.every((field) => Boolean(field.trim()))
}

function isRuleAcceptanceVerified(acceptance: BodiceRuleAcceptance): boolean {
  return acceptance.finalStatus === 'VERIFIED'
    && REQUIRED_RULE_CHECKS.every((check) => acceptance[check] === 'PASS')
    && (acceptance.secondPersonReviewed === 'PASS' || acceptance.secondPersonReviewed === 'NOT_REQUIRED')
}

export function getBodiceDraftReadiness(specification: BodiceDraftSpecification): string | null {
  const measurementError = validateBodiceDimensions(specification.measurements)
  if (measurementError) return measurementError
  const adaptationError = validateBodiceAdaptation(specification.adaptation)
  if (adaptationError) return adaptationError
  if (specification.anthropometry.standard !== 'ISO 8559-1:2017'
    || specification.anthropometry.status !== 'reference-locked'
    || specification.measurementMapping.status !== 'verified'
    || specification.measurementMapping.records.some((mapping) => {
      if (mapping.implementation.requiredForDraft === null) return true
      return mapping.implementation.requiredForDraft && validateBodiceMeasurementMapping(mapping) !== null
    })) {
    return 'Verified ISO 8559-1 measurement definitions and labels are required before drafting.'
  }
  if (specification.profileId !== 'GENERIC_WOMENSWEAR_V1') return 'Unsupported bodice system profile.'
  if (specification.sizeDesignation.standard !== 'ISO 8559-2:2025'
    || specification.sizeDesignation.status !== 'reference-locked') {
    return 'ISO 8559-2:2025 must be used for size designation.'
  }
  if (specification.masterBlock.seamAllowanceMm !== 0) {
    return 'The master block must exclude seam allowance.'
  }
  if (specification.rulePolicy.inferredRules !== 'prohibited'
    || specification.rulePolicy.crossSystemSubstitution !== 'prohibited'
    || specification.rulePolicy.undocumentedConstants !== 'prohibited') {
    return 'Bodice rule policy must prohibit inferred rules, cross-system substitution, and undocumented constants.'
  }
  if (specification.drafting.status !== 'source-locked'
    || specification.drafting.method.system !== 'Winifred Aldrich'
    || specification.drafting.method.publication !== 'Metric Pattern Cutting for Women’s Wear'
    || specification.drafting.method.edition !== 6
    || specification.drafting.method.year !== 2015) {
    return 'Drafting must use Winifred Aldrich, Metric Pattern Cutting for Women’s Wear, edition 6 (2015).'
  }
  if (specification.points.length === 0 || specification.points.some((point) =>
    point.status !== 'VERIFIED' || !point.pointId.trim() || point.dependsOn.length === 0
    || point.constructionOrder === null || !Number.isInteger(point.constructionOrder)
    || !point.originPointId || !point.positiveXDirection || !point.positiveYDirection
    || !point.xRule?.trim() || !point.yRule?.trim() || !point.sourceReference?.trim()
    || point.toleranceMm === null || !Number.isFinite(point.toleranceMm) || point.toleranceMm <= 0)) {
    return 'All construction points need verified dependencies, coordinate rules, source references, and tolerances.'
  }
  if (specification.curves.length === 0 || specification.curves.some((curve) =>
    curve.status !== 'VERIFIED' || !curve.curveId.trim() || !curve.sourceMethod
    || !curve.startPoint || !curve.endPoint || curve.digitalRepresentation === 'pending'
    || !curve.deterministic || curve.toleranceMm === null || !Number.isFinite(curve.toleranceMm)
    || curve.toleranceMm <= 0)) {
    return 'All neckline and armscye curves need verified deterministic definitions and tolerances.'
  }
  if (specification.darts.length === 0 || specification.darts.some((dart) =>
    dart.status !== 'VERIFIED' || !dart.dartId.trim() || !dart.dartPoint || !dart.centerline
    || !dart.legs || !dart.direction || dart.intakeMm === null || !Number.isFinite(dart.intakeMm)
    || dart.intakeMm < 0 || dart.lengthMm === null || !Number.isFinite(dart.lengthMm) || dart.lengthMm <= 0
    || dart.distanceFromBustPointMm === null || !Number.isFinite(dart.distanceFromBustPointMm)
    || !dart.rotationVerified || !dart.trueingVerified)) {
    return 'Bust and waist darts need verified intake, placement, rotation, and trueing rules.'
  }
  const dartAllocation = specification.dartShapingAllocation
  if (!dartAllocation.allocationVerified || dartAllocation.bustDartIntakeMm === null
    || dartAllocation.waistDartIntakeMm === null || dartAllocation.totalShapingMm === null
    || ![dartAllocation.bustDartIntakeMm, dartAllocation.waistDartIntakeMm, dartAllocation.totalShapingMm].every(Number.isFinite)
    || Math.abs(dartAllocation.bustDartIntakeMm + dartAllocation.waistDartIntakeMm - dartAllocation.totalShapingMm) > 0.001) {
    return 'Bust/waist dart shaping allocation must be verified and agree with the total suppression.'
  }
  const rulesById = new Map(specification.geometry.map((rule) => [rule.id, rule]))
  for (const id of BODICE_GEOMETRY_RULE_IDS) {
    const rule = rulesById.get(id)
    if (!rule || !isRuleAcceptanceVerified(rule.acceptance)) return `The Aldrich ${id.replaceAll('_', ' ')} rule is pending verification.`
    if (!rule.formula?.formulaReference?.trim() || rule.formula.expressionStatus !== 'verified'
      || !rule.formula.output.trim() || rule.formula.inputs.length === 0
      || rule.formula.operatorOrder.length === 0
      || [...rule.formula.inputs, ...rule.formula.constants].some((term) => !rule.formula?.unitsByTerm[term]?.trim())
      || (rule.formula.divisorReference !== null
        && ![...rule.formula.inputs, ...rule.formula.constants].includes(rule.formula.divisorReference))
      || !rule.formula.rounding || !rule.formula.appliesWhen
      || !rule.formula.validRangeReference
      || (rule.formula.rounding === 'source_defined' && !rule.formula.roundingReference?.trim())
      || !rule.source?.page || !Number.isInteger(rule.source.page)
      || rule.source.work !== specification.drafting.method.publication
      || rule.source.edition !== `${specification.drafting.method.edition} (${specification.drafting.method.year})`) {
      return `The Aldrich ${id.replaceAll('_', ' ')} rule needs a formula and source page from edition 6 (2015).`
    }
  }
  if (specification.ease.source !== 'ALDRICH_6E_VERIFIED_RULES' || specification.ease.status !== 'verified'
    || specification.ease.rules.length === 0
    || specification.ease.rules.some((rule) => validateEaseRule(rule) !== null)) {
    return 'Ease rules from ALDRICH_6E_VERIFIED_RULES are pending verification.'
  }
  if (!isBodiceValidationSuiteVerified(specification.validation)) {
    return 'Finished dimensions, seam matching, geometry integrity, size-domain checks, edition fidelity, and block consistency must pass before geometry is ready.'
  }
  return null
}
