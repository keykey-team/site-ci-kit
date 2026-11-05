// PR, слиянием которого появился коммит (07385).
//
// «PR, связанные с коммитом» GitHub для коммита не из ветки по умолчанию
// (develop при main по умолчанию) возвращает только ОТКРЫТЫЕ PR — только что
// слитого там нет. Поэтому запасной путь — недавно закрытые PR в эту ветку:
// слитый секунды назад — среди первых по времени изменения.
import { RECENTLY_CLOSED_PULL_REQUESTS_PAGE_SIZE } from "../config/ciPlan.config.mjs";

export async function findPullRequestMergedAs({ github, repository, mergeCommitSha, baseBranch }) {
  const { data: associatedPullRequests } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
    ...repository,
    commit_sha: mergeCommitSha,
  });
  const associatedMergedPullRequest = associatedPullRequests.find(
    (pullRequest) => pullRequest.merge_commit_sha === mergeCommitSha && (!baseBranch || pullRequest.base.ref === baseBranch)
  );
  if (associatedMergedPullRequest || !baseBranch) return associatedMergedPullRequest ?? null;

  const { data: recentlyClosedPullRequests } = await github.rest.pulls.list({
    ...repository,
    state: "closed",
    base: baseBranch,
    sort: "updated",
    direction: "desc",
    per_page: RECENTLY_CLOSED_PULL_REQUESTS_PAGE_SIZE,
  });
  return recentlyClosedPullRequests.find((pullRequest) => pullRequest.merge_commit_sha === mergeCommitSha) ?? null;
}
