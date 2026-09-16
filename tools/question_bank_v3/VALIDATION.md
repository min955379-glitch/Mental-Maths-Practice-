tools/question_bank_v3 — VALIDATION NOTES
=========================================

This directory contains the v1.7.0 question bank: 350 questions across the
seven approved categories (Speed, Percentage, Dozen, Area, DMAS Rule,
Zakat (2.5%), Profit and Loss), each at three difficulty levels (Easy,
Moderate, Hard).

Rules the bank MUST honour
--------------------------

1.  **Categories** — only the seven listed above. Anything else has been
    removed from the bank and from the runtime (UI, generators, hints,
    stats).

2.  **Per-category minimum** — every category must carry at least 50
    seeded questions. ``verify.py`` enforces this.

3.  **Difficulties** — ``Easy``, ``Moderate``, ``Hard``. No ``Medium``
    and no ``Expert``.

4.  **Hint safety** — every shipped question has either a hand-written
    ``hint`` field or, via the hints library, one that never reveals the
    answer. ``pwa.test.mjs / C4`` and the ``revealsAnswer`` helper in
    ``pwa/js/hints.js`` catch leaks.

5.  **Mathematical correctness** — the `verify.py` script compares
    ``correctAnswer`` against the answer it derives from the question
    shape with an algebraic evaluator that accepts Unicode `+ − × ÷`
    as well as ASCII `+ - * /`.

6.  **Typography** — the user-facing maths uses `× ÷ −` instead of the
    ASCII `*/-`. The build script enforces this in the raw question
    text and in hints/explanations.

7.  **Schema** — see `common.py` for the canonical structured question
    shape. Every question must contain ``id``, ``question``,
    ``correctAnswer``, ``acceptedAnswers``, ``unit``, ``category``,
    ``difficulty``, ``shortcut``, ``explanation``, ``mentalPattern``,
    ``commonMistake``, ``sourceType`` fields.

Files
-----

- ``common.py`` — shared helpers (math evaluator, schema checkers,
  UTF-8 typography enforcer).
- ``cats_*.py`` — one module per category, each contributing 50
  questions (Easy + Moderate + Hard).
- ``build.py`` — emits `pwa/js/data.js` (CATEGORIES, DIFFICULTIES), the
  bank file `pwa/js/question-bank.js` (window.QUESTION_BANK and the
  merge line), and syncs the runtime assets into the APK.
- ``verify.py`` — independent mathematical verifier (350/350).

Reproducing
-----------

::

  python3 tools/question_bank_v3/build.py    # regenerate bank + sync assets
  python3 tools/question_bank_v3/verify.py   # 350/350 verified, 0 failures
