# Monolith vs. Compiled: Anti-Slop Strategy

## Problem

A monolithic design prompt bundle tries to prevent AI slop through exhaustive prohibition. This approach:

1. Burns context tokens on rules irrelevant to the current task
2. Lulls the model into treating universal bans as decoration
3. Makes exceptions invisible — every rule looks equally important
4. Cannot prove compliance — prose instructions leave no audit trail

## Design Canon Strategy

The compiled approach:

1. Selects only rules matching the current surface profile
2. Prioritizes falsifiable heuristics over aesthetic opinion
3. Separates mechanical detectors from visual judgment
4. Keeps each rule small enough to verify independently
5. Allows explicit, scoped, rationale-required exceptions

## Anti-Slop Calibration Purpose

This calibration batch tests whether independently researched anti-pattern rules can detect AI-generated interface slop that a monolithic prompt would merely advise against.

## Key Metric

A successful anti-slop rule is one where:

- a control interface passes cleanly
- a typical AI-generated default triggers the detector
- a human designer can override with an explicit rationale
- the false-positive rate is documented and acceptable
