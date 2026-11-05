// Отметка «дерево проверено» после зелёных проверок (07385). Ставится на
// голову PR (pull_request) или на сам коммит (push, ручной запуск) — оттуда
// её находит planCiRun при следующем прогоне того же дерева.
import { TESTED_TREE_STATUS_CONTEXT } from "../config/ciPlan.config.mjs";

export async function recordTestedTree({ github, context, core }) {
  const targetSha = process.env.RECORD_TARGET_SHA;
  const statusDescription = process.env.RECORD_DESCRIPTION;
  if (!targetSha || !statusDescription) throw new Error("нет RECORD_TARGET_SHA или RECORD_DESCRIPTION от планировщика");

  await github.rest.repos.createCommitStatus({
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha: targetSha,
    state: "success",
    context: TESTED_TREE_STATUS_CONTEXT,
    description: statusDescription,
    target_url: `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
  });
  core.info(`${TESTED_TREE_STATUS_CONTEXT} = success на ${targetSha}: ${statusDescription}`);
}
