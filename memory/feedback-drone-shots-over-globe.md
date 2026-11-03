---
name: feedback-drone-shots-over-globe
description: Earth videos should favour ground-level drone shots over the space globe and use the Hook/Lead/Body/Open-loop/CTA structure
metadata:
  node_type: memory
  type: feedback
  originSessionId: 62c89f63-6778-4cbf-bf40-cde6b027cb0a
  modified: 2026-11-01T15:02:04.119Z
---

From 2026-11-01 (Long_4, oceans drained): the user wants most shots from *inside* the scene — drone/FPV flights over real terrain —
not the globe seen from space. Globe only for short "map" moments (~10% of screen time).
Script follows the "perfect structure": 01 Hook, 02 Lead, 03 Body 1, 04 Open loop, 05 Body 2, 06 Open loop, 07 Body 3, 08 CTA.
Long videos ~5 min, 16:9.

**Why:** the user's videos stall around 1k views; they see the repeated globe shots as the cause and want a change.

**How to apply:** plan drone shots first (AWS terrarium tiles incl. bathymetry, Chimgan_relief_test method), add open-loop
lines between bodies, and keep globe shots brief. Related: [[what-if-earth skill]].
