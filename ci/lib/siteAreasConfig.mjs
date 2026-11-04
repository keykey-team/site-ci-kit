// Проверка конфига областей сайта (`areas-config` в ci.yml, 07385).
// Формат — docs/site-contract.md §1. Ошибка формата валит планировщик с
// понятным текстом: молча запустить «что-то» хуже, чем не запустить ничего.
import { CHECK_KINDS } from "../config/ciPlan.config.mjs";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isStringList(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function readOptionalStringList(owner, fieldName, problems) {
  const fieldValue = owner[fieldName];
  if (fieldValue === undefined) return [];
  if (!isStringList(fieldValue)) problems.push(`${fieldName}: ожидается массив непустых строк`);
  return isStringList(fieldValue) ? fieldValue : [];
}

function readArea(areaName, areaConfig, problems) {
  const areaProblems = [];
  if (!isStringList(areaConfig.paths) || areaConfig.paths.length === 0) {
    areaProblems.push("paths: нужен хотя бы один шаблон пути");
  }
  if (!isNonEmptyString(areaConfig.install)) areaProblems.push("install: нужна команда установки зависимостей");

  const checkCommands = areaConfig.checks ?? {};
  const unknownCheckKinds = Object.keys(checkCommands).filter((checkKind) => !CHECK_KINDS.includes(checkKind));
  if (unknownCheckKinds.length) {
    areaProblems.push(`checks: неизвестные проверки ${unknownCheckKinds.join(", ")} (допустимо: ${CHECK_KINDS.join(", ")})`);
  }
  const commandsByCheckKind = Object.fromEntries(
    CHECK_KINDS.filter((checkKind) => isNonEmptyString(checkCommands[checkKind])).map((checkKind) => [
      checkKind,
      checkCommands[checkKind],
    ])
  );
  if (!Object.keys(commandsByCheckKind).length) areaProblems.push("checks: нет ни одной команды проверки");

  const textOnlyPaths = readOptionalStringList(areaConfig, "textOnlyPaths", areaProblems);
  const textOnlyChecks = readOptionalStringList(areaConfig, "textOnlyChecks", areaProblems);
  const unknownTextOnlyChecks = textOnlyChecks.filter((checkKind) => !commandsByCheckKind[checkKind]);
  if (unknownTextOnlyChecks.length) {
    areaProblems.push(`textOnlyChecks: у области нет команд ${unknownTextOnlyChecks.join(", ")}`);
  }
  if (textOnlyPaths.length && !textOnlyChecks.length) {
    areaProblems.push("textOnlyChecks: при textOnlyPaths нужно перечислить, какие проверки остаются");
  }

  const jsonFilePaths = readOptionalStringList(areaConfig, "jsonFilePaths", areaProblems);
  if (jsonFilePaths.length && !commandsByCheckKind.lint) {
    areaProblems.push("jsonFilePaths: JSON проверяется в джобе lint — у области нужна команда checks.lint");
  }
  const installKeyFiles = readOptionalStringList(areaConfig, "installKeyFiles", areaProblems);
  const installedDirectories = readOptionalStringList(areaConfig, "installedDirectories", areaProblems);

  problems.push(...areaProblems.map((problem) => `areas.${areaName}.${problem}`));
  return {
    areaName,
    paths: isStringList(areaConfig.paths) ? areaConfig.paths : [],
    textOnlyPaths,
    textOnlyChecks,
    jsonFilePaths,
    installCommand: areaConfig.install,
    installKeyFiles,
    installedDirectories,
    commandsByCheckKind,
  };
}

export function readSiteAreasConfig(rawConfig) {
  const problems = [];
  if (!rawConfig || typeof rawConfig !== "object") {
    throw new Error("конфиг областей: default export должен быть объектом");
  }
  const runEverythingPaths = readOptionalStringList(rawConfig, "runEverythingPaths", problems);
  const ignoredPaths = readOptionalStringList(rawConfig, "ignoredPaths", problems);
  const areaEntries = Object.entries(rawConfig.areas ?? {});
  if (!areaEntries.length) problems.push("areas: нужна хотя бы одна область");
  const areas = areaEntries.map(([areaName, areaConfig]) => readArea(areaName, areaConfig ?? {}, problems));

  if (problems.length) {
    throw new Error(`конфиг областей с ошибками:\n- ${problems.join("\n- ")}`);
  }
  return { runEverythingPaths, ignoredPaths, areas };
}
