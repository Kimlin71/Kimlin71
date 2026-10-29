# Pattern Draft Lab

A small, original pattern-drafting prototype with a measurement-driven rectangle block and a bodice measurement/specification workflow.

## What it does

- Accepts measurements in centimeters with decimal precision and converts them to millimeters internally.
- Calculates a simple rectangle block width as one quarter of the natural waist measurement.
- Captures preliminary bodice measurements in millimeters internally, with centimeter decimal entry.
- Records the supplied profile: ISO 8559-1:2017 anthropometry, ISO 8559-2:2025 size designation, and Winifred Aldrich, *Metric Pattern Cutting for Women’s Wear*, 6th edition (2015), Basic body blocks with bust darts.
- Models an ISO-to-Aldrich candidate mapping registry, separate ease rules, rule-acceptance criteria, structured formula references, construction-point/curve/dart schemas, finished-dimension and seam-match checks, geometric-integrity checks, size-domain checks, separate fidelity/consistency/fit/adaptation stages, and a distinct production-pattern layer. Candidate mappings remain drafts and contain no copied drafting formulas.
- Separates seam allowance as a pattern adaptation; it is excluded from master-block geometry.
- Blocks bodice geometry and SVG export until measurement definitions, edition-specific drafting rules, and explicit ease values are verified. Grading remains a separate specification.
- Shows a live SVG preview with stitch line, cut line, grainline, and cut dimensions.
- Exports a self-contained, true-size SVG file with physical millimeter dimensions and optional additional measurements in centimeter metadata.
- Saves the current draft on this device only when **Save draft on this device** is selected; a valid saved draft is restored on the next visit.

The rectangle's initial values are 60 cm waist, 20 cm height, and 1.27 cm seam allowance. The bodice profile is identified, but its measurement-label mapping, Aldrich edition 6 rules, and ease are pending verification. The candidate mapping rows are a research worklist, not claims of anatomical equivalence; missing source terms, pages, clauses, landmarks, and transformations remain blank. Neckline, shoulder, armscye, bust point, bust dart, waist dart, and side seam remain individually marked pending. No Aldrich formula, cross-system rule, or undocumented constant is inferred. Proposed numeric tolerances are labeled as internal technical proposals, not Aldrich requirements. The rectangle remains a simple geometry demo, not a validated garment-fit or production patternmaking system.

## Requirements

- Node.js 22.12+ (Node 24 or 26 recommended)
- npm

## Install and run

```sh
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`). Change the centimeter inputs to test the rectangle preview, optionally save measurements/drafts in this browser, then select **Export SVG** for the rectangle pattern. Geometry is converted to millimeters internally, and SVG dimensions remain in millimeters even though the browser preview is scaled to fit. Bodice geometry/export stays unavailable until the specified references and ease are verified. Select **Clear saved draft** to remove the locally stored copy.

## Verify

```sh
npm test
npm run lint
npm run build
```

## Geometry conventions

- Waist-derived stitch-line width: `waist / 4`.
- Seam allowance is applied as a separate adaptation to the master rectangle geometry.
- Bodice measurements, Aldrich rule provenance, ease, adaptation, and grading are represented separately; bodice geometry is not yet enabled.
- SVG `width`, `height`, and `viewBox` coordinates are expressed in millimeters.
