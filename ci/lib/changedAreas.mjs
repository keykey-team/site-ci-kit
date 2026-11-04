// Какие области сайта и какие их проверки затронула правка (07385).
// Чистая функция: на входе конфиг областей и список изменённых файлов,
// на выходе — план. Всё сомнительное (список файлов неизвестен, файл не
// попал ни в одну область, правка в общих файлах) — запуск всего: лишний
// прогон дешевле пропущенной ошибки.
import { createPathMatcher } from "./pathGlob.mjs";

function planEveryArea(siteAreasConfig, requestedCheckKinds, everythingReason) {
  return {
    isEverything: true,
    everythingReason,
    areaPlans: siteAreasConfig.areas.map((area) => ({
      areaName: area.areaName,
      changedFilePaths: [],
      isTextOnly: false,
      jsonFilePathsToValidate: [],
      checkKinds: requestedCheckKinds.filter((checkKind) => area.commandsByCheckKind[checkKind]),
    })),
    ignoredFilePaths: [],
    unmatchedFilePaths: [],
  };
}

function selectAreaCheckKinds(area, areaFilePaths, requestedCheckKinds) {
  const isTextOnlyPath = createPathMatcher(area.textOnlyPaths);
  const isTextOnly = area.textOnlyPaths.length > 0 && areaFilePaths.every(isTextOnlyPath);
  const allowedCheckKinds = isTextOnly ? area.textOnlyChecks : Object.keys(area.commandsByCheckKind);
  return {
    isTextOnly,
    checkKinds: requestedCheckKinds.filter((checkKind) => allowedCheckKinds.includes(checkKind)),
  };
}

export function planChecksForChangedFiles({ siteAreasConfig, changedFilePaths, requestedCheckKinds }) {
  if (changedFilePaths === null) {
    return planEveryArea(siteAreasConfig, requestedCheckKinds, "список изменённых файлов неизвестен");
  }

  const isIgnoredPath = createPathMatcher(siteAreasConfig.ignoredPaths);
  const isRunEverythingPath = createPathMatcher(siteAreasConfig.runEverythingPaths);
  const ignoredFilePaths = changedFilePaths.filter(isIgnoredPath);
  const relevantFilePaths = changedFilePaths.filter((filePath) => !isIgnoredPath(filePath));

  const runEverythingFilePath = relevantFilePaths.find(isRunEverythingPath);
  if (runEverythingFilePath) {
    return planEveryArea(siteAreasConfig, requestedCheckKinds, `изменён общий файл ${runEverythingFilePath}`);
  }

  const areaMatchers = siteAreasConfig.areas.map((area) => ({ area, isAreaPath: createPathMatcher(area.paths) }));
  const unmatchedFilePaths = relevantFilePaths.filter(
    (filePath) => !areaMatchers.some(({ isAreaPath }) => isAreaPath(filePath))
  );
  if (unmatchedFilePaths.length) {
    return planEveryArea(siteAreasConfig, requestedCheckKinds, `файл вне областей: ${unmatchedFilePaths[0]}`);
  }

  const areaPlans = areaMatchers.flatMap(({ area, isAreaPath }) => {
    const areaFilePaths = relevantFilePaths.filter(isAreaPath);
    if (!areaFilePaths.length) return [];
    const isJsonFilePath = createPathMatcher(area.jsonFilePaths);
    return [
      {
        areaName: area.areaName,
        changedFilePaths: areaFilePaths,
        jsonFilePathsToValidate: areaFilePaths.filter(isJsonFilePath),
        ...selectAreaCheckKinds(area, areaFilePaths, requestedCheckKinds),
      },
    ];
  });

  return { isEverything: false, everythingReason: null, areaPlans, ignoredFilePaths, unmatchedFilePaths };
}

export function listAreasByCheckKind(checksPlan, requestedCheckKinds) {
  return Object.fromEntries(
    requestedCheckKinds.map((checkKind) => [
      checkKind,
      checksPlan.areaPlans.filter((areaPlan) => areaPlan.checkKinds.includes(checkKind)).map((areaPlan) => areaPlan.areaName),
    ])
  );
}
