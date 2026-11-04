// Планировщик джобов ci.yml (07385) — запускается из actions/github-script
// в .github/actions/ci-plan. Код сайта не клонирует: изменённые файлы, дерево
// коммита и конфиг областей берёт из API GitHub.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  CHECK_KINDS,
  COMPARE_FILES_LIMIT,
  EMPTY_COMMIT_SHA_PATTERN,
  PULL_REQUEST_FILES_LIMIT,
  PULL_REQUEST_FILES_PAGE_SIZE,
} from "../config/ciPlan.config.mjs";
import { listAreasByCheckKind, planChecksForChangedFiles } from "./changedAreas.mjs";
import { buildCheckScript } from "./checkScripts.mjs";
import { writePlanSummary } from "./planSummary.mjs";
import { readSiteAreasConfig } from "./siteAreasConfig.mjs";
import {
  findTestedTreeStatus,
  formatTestedTreeDescription,
  listTestedTreeCandidateShas,
  parseTestedTreeDescription,
} from "./testedTreeStatus.mjs";

export function readRequestedCheckKinds(requestedChecksText) {
  const requestedCheckKinds = String(requestedChecksText ?? "").split(/[\s,]+/).filter(Boolean);
  const unknownCheckKinds = requestedCheckKinds.filter((checkKind) => !CHECK_KINDS.includes(checkKind));
  if (!requestedCheckKinds.length || unknownCheckKinds.length) {
    throw new Error(`checks: "${requestedChecksText}" — допустимо ${CHECK_KINDS.join(", ")} через пробел`);
  }
  return CHECK_KINDS.filter((checkKind) => requestedCheckKinds.includes(checkKind));
}

async function loadSiteAreasConfig({ github, repository, commitSha, areasConfigPath }) {
  const { data: configFile } = await github.rest.repos.getContent({ ...repository, path: areasConfigPath, ref: commitSha });
  const configSource = Buffer.from(configFile.content, configFile.encoding).toString("utf8");
  const temporaryDirectory = path.join(process.env.RUNNER_TEMP ?? process.cwd(), "site-ci-plan");
  await mkdir(temporaryDirectory, { recursive: true });
  const temporaryConfigPath = path.join(temporaryDirectory, `site-areas-${commitSha}.config.mjs`);
  await writeFile(temporaryConfigPath, configSource);
  const { default: rawConfig } = await import(pathToFileURL(temporaryConfigPath).href);
  return readSiteAreasConfig(rawConfig);
}

async function listPullRequestFilePaths({ github, repository, pullRequestNumber }) {
  const pullRequestFiles = await github.paginate(github.rest.pulls.listFiles, {
    ...repository,
    pull_number: pullRequestNumber,
    per_page: PULL_REQUEST_FILES_PAGE_SIZE,
  });
  if (pullRequestFiles.length >= PULL_REQUEST_FILES_LIMIT) return null;
  return pullRequestFiles.flatMap((changedFile) => [changedFile.filename, changedFile.previous_filename].filter(Boolean));
}

async function listComparedFilePaths({ github, repository, baseSha, headSha }) {
  const { data: comparison } = await github.rest.repos.compareCommitsWithBasehead({
    ...repository,
    basehead: `${baseSha}...${headSha}`,
  });
  const comparedFiles = comparison.files ?? [];
  if (comparedFiles.length >= COMPARE_FILES_LIMIT) return null;
  return comparedFiles.flatMap((changedFile) => [changedFile.filename, changedFile.previous_filename].filter(Boolean));
}

// База сравнения: PR — его базовая ветка (список файлов PR); push — коммит до
// push; ручной запуск и прочее — первый родитель. Новая ветка без «до» и
// коммит без родителей — null, то есть «запустить всё».
async function listChangedFilePaths({ github, context, repository, commitParents }) {
  if (context.eventName === "pull_request") {
    return listPullRequestFilePaths({ github, repository, pullRequestNumber: context.payload.pull_request.number });
  }
  const pushBeforeSha = context.eventName === "push" ? context.payload.before : "";
  const hasPushBefore = pushBeforeSha && !EMPTY_COMMIT_SHA_PATTERN.test(pushBeforeSha);
  const baseSha = hasPushBefore ? pushBeforeSha : commitParents[0]?.sha;
  if (!baseSha) return null;
  return listComparedFilePaths({ github, repository, baseSha, headSha: context.sha });
}

async function findEarlierTestOfTree({ github, core, repository, context, treeSha, requestedCheckKinds }) {
  try {
    const candidateShas = await listTestedTreeCandidateShas({
      github,
      repository,
      commitSha: context.sha,
      pullRequestHeadSha: context.payload.pull_request?.head?.sha,
    });
    return await findTestedTreeStatus({ github, repository, candidateShas, treeSha, requiredCheckKinds: requestedCheckKinds });
  } catch (lookupError) {
    core.warning(`Не удалось проверить, тестировалось ли дерево раньше — проверки пойдут: ${lookupError.message}`);
    return null;
  }
}

export async function planCiRun({ github, context, core }) {
  const repository = { owner: context.repo.owner, repo: context.repo.repo };
  const requestedCheckKinds = readRequestedCheckKinds(process.env.REQUESTED_CHECKS);
  const siteAreasConfig = await loadSiteAreasConfig({
    github,
    repository,
    commitSha: context.sha,
    areasConfigPath: process.env.AREAS_CONFIG_PATH,
  });
  const { data: commit } = await github.rest.git.getCommit({ ...repository, commit_sha: context.sha });
  const treeSha = commit.tree.sha;
  const recordTargetSha = context.payload.pull_request?.head?.sha ?? context.sha;

  const earlierTest = await findEarlierTestOfTree({ github, core, repository, context, treeSha, requestedCheckKinds });
  let changedFilePaths = null;
  if (!earlierTest) {
    changedFilePaths = await listChangedFilePaths({ github, context, repository, commitParents: commit.parents }).catch(
      (listError) => {
        core.warning(`Список изменённых файлов не получен — запускается всё: ${listError.message}`);
        return null;
      }
    );
  }
  const checksPlan = earlierTest
    ? { isEverything: false, everythingReason: null, areaPlans: [], ignoredFilePaths: [], unmatchedFilePaths: [] }
    : planChecksForChangedFiles({ siteAreasConfig, changedFilePaths, requestedCheckKinds });

  const areaNamesByCheckKind = listAreasByCheckKind(checksPlan, requestedCheckKinds);
  const jsonFilePathsByAreaName = Object.fromEntries(
    checksPlan.areaPlans.map((areaPlan) => [areaPlan.areaName, areaPlan.jsonFilePathsToValidate])
  );
  for (const checkKind of CHECK_KINDS) {
    const areas = siteAreasConfig.areas.filter((area) => (areaNamesByCheckKind[checkKind] ?? []).includes(area.areaName));
    core.setOutput(`${checkKind}-script`, buildCheckScript({ checkKind, areas, jsonFilePathsByAreaName }));
  }

  const satisfiedCheckKinds = earlierTest
    ? parseTestedTreeDescription(earlierTest.description).satisfiedCheckKinds
    : requestedCheckKinds;
  core.setOutput("tree-sha", treeSha);
  core.setOutput("is-tested-before", earlierTest ? "true" : "false");
  core.setOutput("record-target-sha", recordTargetSha);
  core.setOutput("record-description", formatTestedTreeDescription({ treeSha, satisfiedCheckKinds }));

  await writePlanSummary({ core, treeSha, requestedCheckKinds, earlierTest, checksPlan, areaNamesByCheckKind });
}
