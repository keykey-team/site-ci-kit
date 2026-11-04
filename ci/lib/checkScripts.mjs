// Bash-скрипт одного джоба ci.yml (lint / unit / integration / build) для
// выбранных областей (07385): установка зависимостей области и её команда.
// Команды берутся из конфига сайта как есть — это код самого сайта.
import { INSTALL_MARKER_FILE_NAME } from "../config/ciPlan.config.mjs";

export function quoteForShell(text) {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}

// Ключ установки — содержимое lock-файлов, сама команда и версия Node: если
// что-то из этого другое, node_modules с прошлого запуска не годятся.
function buildInstallScriptLines(area) {
  const groupTitle = `${area.areaName} — установка зависимостей`;
  if (!area.installedDirectories.length) {
    return [`echo ${quoteForShell(`::group::${groupTitle}`)}`, area.installCommand, `echo '::endgroup::'`];
  }
  const keyFileArguments = area.installKeyFiles.map(quoteForShell).join(" ");
  const markerPaths = area.installedDirectories.map((directory) => `${directory}/${INSTALL_MARKER_FILE_NAME}`);
  const markerChecks = markerPaths
    .map((markerPath) => `[ "$(cat ${quoteForShell(markerPath)} 2>/dev/null)" = "$install_key" ]`)
    .join(" && ");
  const markerWrites = area.installedDirectories.map(
    (directory) =>
      `  [ -d ${quoteForShell(directory)} ] && printf '%s' "$install_key" > ${quoteForShell(`${directory}/${INSTALL_MARKER_FILE_NAME}`)}`
  );
  return [
    `echo ${quoteForShell(`::group::${groupTitle}`)}`,
    `install_key="$( { cat ${keyFileArguments} 2>/dev/null || true; printf '%s\\n' ${quoteForShell(area.installCommand)}; node --version; } | sha256sum | cut -d' ' -f1 )"`,
    `if ${markerChecks}; then`,
    `  echo ${quoteForShell(`${area.areaName}: зависимости с прошлого запуска этого раннера (lock-файлы не менялись) — установка пропущена`)}`,
    "else",
    `  ${area.installCommand}`,
    ...markerWrites,
    "fi",
    `echo '::endgroup::'`,
  ];
}

// Строгий JSON (без комментариев) — для файлов текстов: битый перевод иначе
// всплыл бы только на сборке или вообще на живой странице. Удалённые в правке
// файлы пропускаются.
const JSON_VALIDATION_SCRIPT = [
  'const fs = require("fs");',
  "let hasInvalidJson = false;",
  "for (const filePath of process.argv.slice(1)) {",
  "  if (!fs.existsSync(filePath)) continue;",
  '  try { JSON.parse(fs.readFileSync(filePath, "utf8")); }',
  "  catch (parseError) { hasInvalidJson = true; console.log(`::error file=${filePath}::JSON не разбирается: ${parseError.message}`); }",
  "}",
  "process.exit(hasInvalidJson ? 1 : 0);",
].join(" ");

function buildJsonValidationScriptLines(areaName, jsonFilePaths) {
  if (!jsonFilePaths.length) return [];
  return [
    `echo ${quoteForShell(`::group::${areaName} — проверка JSON (${jsonFilePaths.length})`)}`,
    `node -e ${quoteForShell(JSON_VALIDATION_SCRIPT)} ${jsonFilePaths.map(quoteForShell).join(" ")}`,
    `echo '::endgroup::'`,
  ];
}

export function buildCheckScript({ checkKind, areas, jsonFilePathsByAreaName = {} }) {
  if (!areas.length) return "";
  const installedCommands = new Set();
  const scriptLines = ["set -euo pipefail"];
  for (const area of areas) {
    if (!installedCommands.has(area.installCommand)) {
      scriptLines.push(...buildInstallScriptLines(area));
      installedCommands.add(area.installCommand);
    }
    if (checkKind === "lint") {
      scriptLines.push(...buildJsonValidationScriptLines(area.areaName, jsonFilePathsByAreaName[area.areaName] ?? []));
    }
    scriptLines.push(
      `echo ${quoteForShell(`::group::${area.areaName} — ${checkKind}`)}`,
      area.commandsByCheckKind[checkKind],
      `echo '::endgroup::'`
    );
  }
  return `${scriptLines.join("\n")}\n`;
}
