// Зведення smoke у сторінці запуску GitHub Actions і опис статусу коміту.

// Змінні, які smoke.yml передає скрипту зведення (scripts/writeRunSummary.mjs).
export const RUN_SUMMARY_ENV_NAMES = {
  stepSummaryFile: "GITHUB_STEP_SUMMARY",
  stepOutputFile: "GITHUB_OUTPUT",
  runUrl: "SMOKE_RUN_URL",
  reportArtifactName: "SMOKE_REPORT_ARTIFACT_NAME",
  reportArtifactUrl: "SMOKE_REPORT_ARTIFACT_URL",
  testStepOutcome: "SMOKE_TEST_STEP_OUTCOME",
};

// Вихід кроку, з якого smoke.yml бере опис статусу коміту.
export const STATUS_DESCRIPTION_OUTPUT_NAME = "status-description";

// GitHub обрізає опис статусу коміту до 140 символів — довший опис API відхиляє.
export const STATUS_DESCRIPTION_MAX_LENGTH = 140;

// Скільки упалих/пропущених тестів перелічувати у зведенні. Решта — у
// HTML-звіті: зведення має читатися з першого погляду.
export const SUMMARY_LISTED_TEST_LIMIT = 15;

// Перший рядок помилки довший за це — обрізаємо: повний текст є у звіті.
export const SUMMARY_ERROR_LINE_MAX_LENGTH = 200;

// Статуси тестів у JSON-звіті Playwright.
export const PLAYWRIGHT_TEST_STATUSES = {
  passed: "expected",
  failed: "unexpected",
  flaky: "flaky",
  skipped: "skipped",
};

export const SKIP_ANNOTATION_TYPE = "skip";

// Результат кроку запуску тестів у GitHub Actions (steps.<id>.outcome).
export const SUCCESS_STEP_OUTCOME = "success";
