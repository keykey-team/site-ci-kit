// Сводка запуска планировщика (07385): что запускается и почему — чтобы
// по пропущенной проверке было видно причину, а не гадать.
import { SUMMARY_FILES_PER_AREA } from "../config/ciPlan.config.mjs";

function describeAreaFiles(areaPlan) {
  if (!areaPlan.changedFilePaths.length) return "—";
  const shownFilePaths = areaPlan.changedFilePaths.slice(0, SUMMARY_FILES_PER_AREA).map((filePath) => `\`${filePath}\``);
  const hiddenFileCount = areaPlan.changedFilePaths.length - shownFilePaths.length;
  return hiddenFileCount > 0 ? `${shownFilePaths.join(", ")} и ещё ${hiddenFileCount}` : shownFilePaths.join(", ");
}

export async function writePlanSummary({ core, treeSha, requestedCheckKinds, earlierTest, checksPlan, areaNamesByCheckKind }) {
  core.summary.addHeading("План проверок", 3);
  core.summary.addRaw(`Дерево файлов: \`${treeSha}\`. Проверки этого запуска: ${requestedCheckKinds.join(", ")}.\n\n`);

  if (earlierTest) {
    core.summary.addRaw(
      `**Это дерево уже проверено** (отметка на коммите \`${earlierTest.candidateSha.slice(0, 12)}\`` +
        `${earlierTest.statusUrl ? `, [запуск](${earlierTest.statusUrl})` : ""}) — все проверки пропущены.\n`
    );
    await core.summary.write();
    return;
  }

  if (checksPlan.isEverything) core.summary.addRaw(`Запускается всё: ${checksPlan.everythingReason}.\n\n`);
  const tableRows = checksPlan.areaPlans.map((areaPlan) => [
    areaPlan.areaName,
    areaPlan.checkKinds.join(", ") || "—",
    areaPlan.isTextOnly ? "только тексты" : "",
    describeAreaFiles(areaPlan),
  ]);
  if (tableRows.length) {
    core.summary.addTable([
      [
        { data: "Область", header: true },
        { data: "Проверки", header: true },
        { data: "Режим", header: true },
        { data: "Изменённые файлы", header: true },
      ],
      ...tableRows,
    ]);
  } else {
    core.summary.addRaw("Изменены только файлы, которые не проверяются (документация и т.п.) — все проверки пропущены.\n");
  }
  const skippedCheckKinds = requestedCheckKinds.filter((checkKind) => !areaNamesByCheckKind[checkKind]?.length);
  if (skippedCheckKinds.length) core.summary.addRaw(`\nПропущены (нечего проверять): ${skippedCheckKinds.join(", ")}.\n`);
  await core.summary.write();
}
