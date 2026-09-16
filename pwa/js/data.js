/* Mental Maths Practice - data.js (v3, 7-category rebuild).
 * The 18 legacy categories have been retired in favour of the
 * seven approved mental-math categories required by the
 * mental_math_seven_categories_master_prompt.md spec.
 *
 * - 50+ unique questions per category (350 minimum, more by design).
 * - Every answer is computed and validated at build time.
 * - Question pool lives in js/question-bank.js (loaded next).
 */
window.CATEGORIES = ["Speed", "Percentage", "Dozen", "Area", "DMAS Rule", "Zakat (2.5%)", "Profit and Loss"];
window.DIFFICULTIES = ["Easy", "Moderate", "Hard"];
window.QUESTIONS = [];
