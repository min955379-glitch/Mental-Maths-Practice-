# Mental Maths Practice — release notes

## v1.7.0 — Seven Approved Categories Only (2026-09-16)

The question bank has been narrowed to the seven categories the project
approves for syllabus-aligned arithmetic practice:

1. **Speed** — speed / distance / time, km/h math
2. **Percentage** — percent of a number, reverse percentages, % discount
3. **Dozen** — convert dozens to items, per-dozen pricing, mixed counts
4. **Area** — squares, rectangles, triangles, semicircles (π = 22/7)
5. **DMAS Rule** — division / multiplication / addition / subtraction, brackets
6. **Zakat (2.5%)** — dividing the eligible amount by 40
7. **Profit and Loss** — percentages of the cost price

**Bank spec**
- 350 questions (50 per category)
- Difficulty: **Easy / Moderate / Hard** (the v1.6.0 ``Medium`` and
  ``Expert`` tiers have been merged into Easy / Moderate / Hard)
- All shipped math uses the proper Unicode symbols ``+ − × ÷`` (no
  ASCII ``*``)
- Independent verifier (`tools/question_bank_v3/verify.py`) reports
  ``350 verified, 0 failures``

**Other changes**
- New generator (`pwa/js/generator.js`) covers all seven categories,
  unlimited replenishment at runtime.
- Hint library (`pwa/js/hints.js`) extended with question-specific
  guidance for every approved category.
- UI chooser now offers **Easy / Moderate / Hard**, with **Mixed** still
  one tap away.
- Builder pipeline (`tools/question_bank_v3/build.py`) emits the bank
  file and syncs the runtime assets into the APK.

**APK**
- File: `apk/Mental-Maths-Practice.apk`
- Size: 167 KB (166,954 bytes)
- MD5:  ``71816c86653fef07d83449de12e1a014``
- versionCode: 11
- versionName: 1.7.0
- Signed v1+v2+v3 with the project release key (SHA-256
  ``2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43``).

**Tests**
- 176 / 176 PASS across the 9 JS suites
  (regressions 15 / pwa 14 / quiz-actions 6 / skip-question 15 /
   select-component 26 / theme-contrast 52 / timer-discard 19 /
   contact-us 14 / content-difficulty 15).

**Install**
```
adb install -r Mental-Maths-Practice.apk
```
or sideload by copying the APK to the device and tapping it.

## v1.6.0 — build + test reliability, the APK ships the verified bank (2026-09-15)

- Fixed offline build path so apksigner is on PATH.
- PWA test suite rewritten to drive the real application; 9 suites green.
- The v1.5.0 release button fix (Skip costs nothing, comes back at the end)
  is preserved.

## v1.5.0 — Skip question

- The Skip button is now free; the question comes back at the end of the
  session so the user can pick it up if they want.

## v1.4.0 and earlier

See the git history.
