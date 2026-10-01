// Зведення smoke для сторінки запуску в GitHub Actions: скільки пройшло/упало,
// посилання на HTML-звіт і запуск, перелік упалих і пропущених тестів. Також
// віддає короткий опис для статусу коміту (stage-smoke).
// Запускається з каталогу e2e/ бібліотеки після тестів, навіть якщо вони впали.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { RUN_RESULTS_FILE, RUNNER_ENV_NAMES } from "../config/runner.config.mjs";
import {
  PLAYWRIGHT_TEST_STATUSES,
  RUN_SUMMARY_ENV_NAMES,
  SKIP_ANNOTATION_TYPE,
  STATUS_DESCRIPTION_MAX_LENGTH,
  STATUS_DESCRIPTION_OUTPUT_NAME,
  SUCCESS_STEP_OUTCOME,
  SUMMARY_ERROR_LINE_MAX_LENGTH,
  SUMMARY_LISTED_TEST_LIMIT,
} from "../config/runSummary.config.mjs";

// Кольорові коди терміналу в тексті помилок Playwright — у markdown вони сміття.
const TERMINAL_COLOR_CODE_PATTERN = /\u001b\[[0-9;]*m/g;

function readRunResults() {
  if (!existsSync(RUN_RESULTS_FILE)) return null;
  return JSON.parse(readFileSync(RUN_RESULTS_FILE, "utf8"));
}

function readFirstLineOfError(errorMessage) {
  const errorText = (errorMessage ?? "").replace(TERMINAL_COLOR_CODE_PATTERN, "");
  const firstErrorLine = errorText.split("\n").find((errorLine) => errorLine.trim()) ?? "";
  return firstErrorLine.trim().slice(0, SUMMARY_ERROR_LINE_MAX_LENGTH);
}

function readFirstErrorLine(failedTest) {
  return readFirstLineOfError(failedTest.results.at(-1)?.error?.message);
}

// Помилки поза тестами: spec-файл не імпортувався, впав хук тощо.
function formatRunErrors(runErrors) {
  if (runErrors.length === 0) return [];
  return [
    "#### Ошибки запуска (вне тестов)",
    ...runErrors.map((runError) => `- ${readFirstLineOfError(runError.message)}`),
    "",
  ];
}

function readSkipReason(skippedTest) {
  const skipAnnotation = skippedTest.annotations.find((annotation) => annotation.type === SKIP_ANNOTATION_TYPE);
  return skipAnnotation?.description ?? "";
}

// JSON-звіт — дерево: файл → describe → spec → test (по проєкту браузера).
function collectTestOutcomes(reportSuite, parentTitles = []) {
  const suiteTitles = reportSuite.title ? [...parentTitles, reportSuite.title] : parentTitles;
  const specOutcomes = (reportSuite.specs ?? []).flatMap((reportSpec) =>
    reportSpec.tests.map((specTest) => ({
      titlePath: [...suiteTitles, reportSpec.title].join(" › "),
      testStatus: specTest.status,
      errorLine: readFirstErrorLine(specTest),
      skipReason: readSkipReason(specTest),
    })),
  );
  const nestedOutcomes = (reportSuite.suites ?? []).flatMap((nestedSuite) => collectTestOutcomes(nestedSuite, suiteTitles));
  return [...specOutcomes, ...nestedOutcomes];
}

function formatTestList(listTitle, testOutcomes, describeOutcome) {
  if (testOutcomes.length === 0) return [];
  const listedOutcomes = testOutcomes.slice(0, SUMMARY_LISTED_TEST_LIMIT);
  const hiddenCount = testOutcomes.length - listedOutcomes.length;
  return [
    `#### ${listTitle}`,
    ...listedOutcomes.map((testOutcome) => `- \`${testOutcome.titlePath}\` — ${describeOutcome(testOutcome)}`),
    ...(hiddenCount > 0 ? [`- …и ещё ${hiddenCount} — в HTML-отчёте`] : []),
    "",
  ];
}

function buildReportLinkLine() {
  const reportArtifactName = process.env[RUN_SUMMARY_ENV_NAMES.reportArtifactName] ?? "";
  const reportArtifactUrl = process.env[RUN_SUMMARY_ENV_NAMES.reportArtifactUrl] ?? "";
  if (!reportArtifactUrl) return `**Отчёт Playwright:** не загружен (артефакт \`${reportArtifactName}\`)`;
  return (
    `**Отчёт Playwright:** [${reportArtifactName}](${reportArtifactUrl}) — скачать zip, распаковать, ` +
    "`npx playwright show-report <папка>`"
  );
}

function buildSummary(targetEnvironment, runResults, isTestStepSuccessful) {
  const runUrl = process.env[RUN_SUMMARY_ENV_NAMES.runUrl] ?? "";
  const verdict = isTestStepSuccessful ? "ПРОЙДЕН" : "ПРОВАЛ";
  const headerLines = [`### Smoke ${targetEnvironment}: ${verdict}`, ""];
  const linkLines = [buildReportLinkLine(), "", `**Запуск:** ${runUrl}`, ""];

  if (!runResults) {
    const notStartedLines = [
      "Тесты не запустились: нет файла результатов. Причина — в логе шага запуска тестов",
      "(чаще всего неполный site.config.mjs / site.adapter.mjs или ошибка установки браузера).",
      "",
    ];
    return { markdown: [...headerLines, ...notStartedLines, ...linkLines].join("\n"), statusDescription: "smoke не запустился — см. лог" };
  }

  const { expected: passedCount, unexpected: failedCount, flaky: flakyCount, skipped: skippedCount } = runResults.stats;
  const testOutcomes = (runResults.suites ?? []).flatMap((reportSuite) => collectTestOutcomes(reportSuite));
  const countLines = [
    "| Прошло | Упало | Нестабильно | Пропущено |",
    "|---|---|---|---|",
    `| ${passedCount} | ${failedCount} | ${flakyCount} | ${skippedCount} |`,
    "",
  ];
  const failedLines = formatTestList(
    "Упавшие",
    testOutcomes.filter((testOutcome) => testOutcome.testStatus === PLAYWRIGHT_TEST_STATUSES.failed),
    (testOutcome) => testOutcome.errorLine,
  );
  const skippedLines = formatTestList(
    "Пропущенные",
    testOutcomes.filter((testOutcome) => testOutcome.testStatus === PLAYWRIGHT_TEST_STATUSES.skipped),
    (testOutcome) => testOutcome.skipReason || "без причины",
  );
  const statusDescription = `${passedCount} прошло, ${failedCount} упало, ${flakyCount} нестабильно, ${skippedCount} пропущено`;
  return {
    markdown: [
      ...headerLines,
      ...countLines,
      ...linkLines,
      ...formatRunErrors(runResults.errors ?? []),
      ...failedLines,
      ...skippedLines,
    ].join("\n"),
    statusDescription,
  };
}

function writeSummaryOutputs({ markdown, statusDescription }) {
  const stepSummaryFile = process.env[RUN_SUMMARY_ENV_NAMES.stepSummaryFile];
  const stepOutputFile = process.env[RUN_SUMMARY_ENV_NAMES.stepOutputFile];
  if (stepSummaryFile) appendFileSync(stepSummaryFile, `${markdown}\n`);
  else console.log(markdown);
  if (stepOutputFile) {
    const trimmedDescription = statusDescription.slice(0, STATUS_DESCRIPTION_MAX_LENGTH);
    appendFileSync(stepOutputFile, `${STATUS_DESCRIPTION_OUTPUT_NAME}=${trimmedDescription}\n`);
  }
}

const targetEnvironment = process.env[RUNNER_ENV_NAMES.targetEnvironment] ?? "";
const isTestStepSuccessful = process.env[RUN_SUMMARY_ENV_NAMES.testStepOutcome] === SUCCESS_STEP_OUTCOME;
writeSummaryOutputs(buildSummary(targetEnvironment, readRunResults(), isTestStepSuccessful));
