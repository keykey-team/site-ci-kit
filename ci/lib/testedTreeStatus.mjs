// Отметка «это дерево файлов уже проверено» — статус коммита (07385).
// Дерево git (tree sha) одинаково у PR-слияния, у merge-коммита в develop и у
// develop → main, если между ними никто ничего не влил. Тогда проверять его
// второй раз незачем: результат тот же, только дольше.
import {
  COMMIT_STATUSES_PAGE_SIZE,
  TESTED_TREE_DESCRIPTION_PREFIX,
  TESTED_TREE_DESCRIPTION_SEPARATOR,
  TESTED_TREE_STATUS_CONTEXT,
} from "../config/ciPlan.config.mjs";

const TREE_SHA_PATTERN = /^[0-9a-f]{40}$/;

export function formatTestedTreeDescription({ treeSha, satisfiedCheckKinds }) {
  return `${TESTED_TREE_DESCRIPTION_PREFIX} ${treeSha}${TESTED_TREE_DESCRIPTION_SEPARATOR}${satisfiedCheckKinds.join(" ")}`;
}

export function parseTestedTreeDescription(statusDescription) {
  const [treePart, checksPart = ""] = String(statusDescription ?? "").split(TESTED_TREE_DESCRIPTION_SEPARATOR);
  const [prefix, treeSha] = treePart.trim().split(/\s+/);
  if (prefix !== TESTED_TREE_DESCRIPTION_PREFIX || !TREE_SHA_PATTERN.test(treeSha ?? "")) return null;
  return { treeSha, satisfiedCheckKinds: checksPart.trim().split(/\s+/).filter(Boolean) };
}

export function isTestedTreeStatusSufficient({ commitStatus, treeSha, requiredCheckKinds }) {
  if (commitStatus.context !== TESTED_TREE_STATUS_CONTEXT || commitStatus.state !== "success") return false;
  const testedTree = parseTestedTreeDescription(commitStatus.description);
  if (!testedTree || testedTree.treeSha !== treeSha) return false;
  return requiredCheckKinds.every((checkKind) => testedTree.satisfiedCheckKinds.includes(checkKind));
}

// Коммиты, на которых может лежать отметка для этого дерева:
//   — сам коммит (перезапуск);
//   — голова PR (так CI ставит отметку на pull_request, а слияние этого PR в
//     develop или main даёт новый коммит с тем же деревом);
//   — второй и дальше родители merge-коммита (develop, влитый в main без PR).
export async function listTestedTreeCandidateShas({ github, repository, commitSha, pullRequestHeadSha }) {
  const candidateShas = [commitSha];
  if (pullRequestHeadSha) candidateShas.push(pullRequestHeadSha);

  const { data: associatedPullRequests } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
    ...repository,
    commit_sha: commitSha,
  });
  associatedPullRequests
    .filter((pullRequest) => pullRequest.merge_commit_sha === commitSha)
    .forEach((pullRequest) => candidateShas.push(pullRequest.head.sha));

  const { data: commit } = await github.rest.git.getCommit({ ...repository, commit_sha: commitSha });
  commit.parents.slice(1).forEach((parent) => candidateShas.push(parent.sha));

  return [...new Set(candidateShas)];
}

export async function findTestedTreeStatus({ github, repository, candidateShas, treeSha, requiredCheckKinds }) {
  for (const candidateSha of candidateShas) {
    const { data: commitStatuses } = await github.rest.repos.listCommitStatusesForRef({
      ...repository,
      ref: candidateSha,
      per_page: COMMIT_STATUSES_PAGE_SIZE,
    });
    const sufficientStatus = commitStatuses.find((commitStatus) =>
      isTestedTreeStatusSufficient({ commitStatus, treeSha, requiredCheckKinds })
    );
    if (sufficientStatus) {
      return { candidateSha, statusUrl: sufficientStatus.target_url, description: sufficientStatus.description };
    }
  }
  return null;
}
