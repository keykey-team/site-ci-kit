// Автовыкатка на прод по метке PR (07385) — запускается из
// .github/actions/release-to-prod после проверок деплоя stage-ветки.
//
// PR влит в develop и у него метка «в прод» → develop вливается в main
// merge-коммитом и запускается деплой main. Только если в develop нет ничего,
// кроме коммитов этого PR: иначе на прод уехала бы чужая невыпущенная работа.
// Слияние токеном GitHub Actions push-событий не порождает, поэтому деплой
// main запускается явно (workflow_dispatch).
import {
  COMPARE_COMMITS_LIMIT,
  FOREIGN_COMMITS_SHOWN_IN_COMMENT,
  MERGE_CONFLICT_STATUS,
  MERGE_NOTHING_TO_MERGE_STATUS,
  PULL_REQUEST_COMMITS_PAGE_SIZE,
} from "../config/releaseToProd.config.mjs";
import { findPullRequestMergedAs } from "./mergedPullRequest.mjs";

// Чужое невыпущенное — обычные коммиты не из этого PR. Merge-коммиты сами по
// себе не в счёт: «Merge main into develop» нового кода не несёт, а коммиты,
// которые приносит слияние чужой ветки, сами есть в списке и будут найдены.
export function findForeignUnreleasedCommits({ unreleasedCommits, pullRequestCommitShas, mergeCommitSha }) {
  const ownCommitShas = new Set([...pullRequestCommitShas, mergeCommitSha]);
  return unreleasedCommits.filter(
    (unreleasedCommit) => !ownCommitShas.has(unreleasedCommit.sha) && (unreleasedCommit.parents?.length ?? 1) < 2
  );
}

function formatCommitLine(unreleasedCommit) {
  const commitTitle = unreleasedCommit.commit.message.split("\n")[0];
  return `- \`${unreleasedCommit.sha.slice(0, 8)}\` ${commitTitle}`;
}

async function commentOnPullRequest({ github, repository, pullRequestNumber, commentBody }) {
  await github.rest.issues.createComment({ ...repository, issue_number: pullRequestNumber, body: commentBody });
}

async function refuseRelease({ github, core, repository, pullRequest, reasonText }) {
  await commentOnPullRequest({
    github,
    repository,
    pullRequestNumber: pullRequest.number,
    commentBody: `⚠️ Автовыкатка на прод не сделана: ${reasonText}\n\nПрод не тронут. Влейте вручную обычным PR в main.`,
  });
  core.summary.addRaw(`Автовыкатка не сделана: ${reasonText}\n`);
  await core.summary.write();
  core.setFailed(`Автовыкатка не сделана: ${reasonText.split("\n")[0]}`);
}

export async function releaseToProd({ github, context, core }) {
  const repository = { owner: context.repo.owner, repo: context.repo.repo };
  const stageBranch = process.env.STAGE_BRANCH;
  const prodBranch = process.env.PROD_BRANCH;
  const releaseLabel = process.env.RELEASE_LABEL;
  const deployWorkflowFile = process.env.DEPLOY_WORKFLOW_FILE;
  const mergeCommitSha = context.sha;

  const pullRequest = await findPullRequestMergedAs({ github, repository, mergeCommitSha, baseBranch: stageBranch });
  if (!pullRequest) {
    core.info(`Коммит ${mergeCommitSha} пришёл в ${stageBranch} не слиянием PR — автовыкатки нет.`);
    return;
  }
  if (!pullRequest.labels.some((label) => label.name === releaseLabel)) {
    core.info(`У PR #${pullRequest.number} нет метки «${releaseLabel}» — на прод не выкатывается.`);
    return;
  }

  const { data: comparison } = await github.rest.repos.compareCommitsWithBasehead({
    ...repository,
    basehead: `${prodBranch}...${mergeCommitSha}`,
  });
  if (comparison.ahead_by > COMPARE_COMMITS_LIMIT || comparison.commits.length < comparison.ahead_by) {
    await refuseRelease({
      github,
      core,
      repository,
      pullRequest,
      reasonText: `в ${stageBranch} больше ${COMPARE_COMMITS_LIMIT} невыпущенных коммитов — проверить, что все они из этого PR, нельзя.`,
    });
    return;
  }
  const pullRequestCommits = await github.paginate(github.rest.pulls.listCommits, {
    ...repository,
    pull_number: pullRequest.number,
    per_page: PULL_REQUEST_COMMITS_PAGE_SIZE,
  });
  const foreignCommits = findForeignUnreleasedCommits({
    unreleasedCommits: comparison.commits,
    pullRequestCommitShas: pullRequestCommits.map((pullRequestCommit) => pullRequestCommit.sha),
    mergeCommitSha,
  });
  if (foreignCommits.length) {
    const shownCommitLines = foreignCommits.slice(0, FOREIGN_COMMITS_SHOWN_IN_COMMENT).map(formatCommitLine);
    const hiddenCommitCount = foreignCommits.length - shownCommitLines.length;
    await refuseRelease({
      github,
      core,
      repository,
      pullRequest,
      reasonText:
        `в ${stageBranch} есть ещё невыпущенное, кроме этого PR (${foreignCommits.length}):\n` +
        `${shownCommitLines.join("\n")}${hiddenCommitCount > 0 ? `\n- …и ещё ${hiddenCommitCount}` : ""}`,
    });
    return;
  }

  let mergeResponse;
  try {
    mergeResponse = await github.rest.repos.merge({
      ...repository,
      base: prodBranch,
      head: mergeCommitSha,
      commit_message: `Merge ${stageBranch} into ${prodBranch}: PR #${pullRequest.number} ${pullRequest.title}`,
    });
  } catch (mergeError) {
    const reasonText =
      mergeError.status === MERGE_CONFLICT_STATUS
        ? `конфликт слияния ${stageBranch} → ${prodBranch}.`
        : `GitHub отказал в слиянии (${mergeError.status ?? "?"}: ${mergeError.message}).`;
    await refuseRelease({ github, core, repository, pullRequest, reasonText });
    return;
  }
  if (mergeResponse.status === MERGE_NOTHING_TO_MERGE_STATUS) {
    core.info(`Код PR #${pullRequest.number} уже в ${prodBranch} — сливать нечего.`);
    return;
  }

  await github.rest.actions.createWorkflowDispatch({ ...repository, workflow_id: deployWorkflowFile, ref: prodBranch });
  const deployRunsUrl = `${context.serverUrl}/${repository.owner}/${repository.repo}/actions/workflows/${deployWorkflowFile}`;
  const prodMergeSha = mergeResponse.data.sha;
  await commentOnPullRequest({
    github,
    repository,
    pullRequestNumber: pullRequest.number,
    commentBody: `🚀 Метка «${releaseLabel}»: ${stageBranch} влит в ${prodBranch} (\`${prodMergeSha.slice(0, 8)}\`), деплой прода запущен — [запуски деплоя](${deployRunsUrl}).`,
  });
  core.summary.addRaw(`PR #${pullRequest.number}: ${stageBranch} влит в ${prodBranch} (${prodMergeSha}), деплой прода запущен.\n`);
  await core.summary.write();
}
