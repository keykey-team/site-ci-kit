import assert from "node:assert/strict";
import { test } from "node:test";

import { TESTED_TREE_STATUS_CONTEXT } from "../config/ciPlan.config.mjs";
import {
  findTestedTreeStatus,
  formatTestedTreeDescription,
  isTestedTreeStatusSufficient,
  listTestedTreeCandidateShas,
  parseTestedTreeDescription,
} from "../lib/testedTreeStatus.mjs";

const TREE_SHA = "a".repeat(40);
const OTHER_TREE_SHA = "b".repeat(40);
const repository = { owner: "keykey-team", repo: "site" };

function createTestedStatus(treeSha, satisfiedCheckKinds, overrides = {}) {
  return {
    context: TESTED_TREE_STATUS_CONTEXT,
    state: "success",
    description: formatTestedTreeDescription({ treeSha, satisfiedCheckKinds }),
    target_url: "https://github.com/run/1",
    ...overrides,
  };
}

function createFakeGithub({ statusesBySha = {}, associatedPullRequests = [], parents = [] }) {
  return {
    rest: {
      repos: {
        listCommitStatusesForRef: async ({ ref }) => ({ data: statusesBySha[ref] ?? [] }),
        listPullRequestsAssociatedWithCommit: async () => ({ data: associatedPullRequests }),
      },
      git: { getCommit: async () => ({ data: { parents } }) },
    },
  };
}

test("описание отметки читается обратно и укладывается в лимит GitHub", () => {
  const description = formatTestedTreeDescription({ treeSha: TREE_SHA, satisfiedCheckKinds: ["lint", "unit", "integration", "build"] });
  assert.ok(description.length <= 140);
  assert.deepEqual(parseTestedTreeDescription(description), {
    treeSha: TREE_SHA,
    satisfiedCheckKinds: ["lint", "unit", "integration", "build"],
  });
  assert.equal(parseTestedTreeDescription("smoke на stage идёт"), null);
});

test("отметка годится, только если дерево то же и проверено не меньше нужного", () => {
  const fullStatus = createTestedStatus(TREE_SHA, ["lint", "unit", "integration", "build"]);
  assert.ok(isTestedTreeStatusSufficient({ commitStatus: fullStatus, treeSha: TREE_SHA, requiredCheckKinds: ["unit"] }));
  assert.ok(!isTestedTreeStatusSufficient({ commitStatus: fullStatus, treeSha: OTHER_TREE_SHA, requiredCheckKinds: ["unit"] }));

  const deployOnlyStatus = createTestedStatus(TREE_SHA, ["unit", "integration"]);
  assert.ok(!isTestedTreeStatusSufficient({ commitStatus: deployOnlyStatus, treeSha: TREE_SHA, requiredCheckKinds: ["lint", "unit"] }));

  const failedStatus = createTestedStatus(TREE_SHA, ["unit"], { state: "failure" });
  assert.ok(!isTestedTreeStatusSufficient({ commitStatus: failedStatus, treeSha: TREE_SHA, requiredCheckKinds: ["unit"] }));

  const foreignStatus = createTestedStatus(TREE_SHA, ["unit"], { context: "stage-smoke" });
  assert.ok(!isTestedTreeStatusSufficient({ commitStatus: foreignStatus, treeSha: TREE_SHA, requiredCheckKinds: ["unit"] }));
});

test("кандидаты: сам коммит, голова PR, голова слитого PR и второй родитель merge-коммита", async () => {
  const github = createFakeGithub({
    associatedPullRequests: [
      { merge_commit_sha: "merge", head: { sha: "feature-head" } },
      { merge_commit_sha: "unrelated", head: { sha: "other-head" } },
    ],
    parents: [{ sha: "main-before" }, { sha: "develop-tip" }],
  });
  const candidateShas = await listTestedTreeCandidateShas({ github, repository, commitSha: "merge", pullRequestHeadSha: "pr-head" });
  assert.deepEqual(candidateShas, ["merge", "pr-head", "feature-head", "develop-tip"]);
});

test("поиск находит отметку на первом подходящем кандидате", async () => {
  const github = createFakeGithub({
    statusesBySha: {
      merge: [createTestedStatus(OTHER_TREE_SHA, ["lint", "unit", "integration", "build"])],
      "feature-head": [createTestedStatus(TREE_SHA, ["lint", "unit", "integration", "build"])],
    },
  });
  const testedTreeStatus = await findTestedTreeStatus({
    github,
    repository,
    candidateShas: ["merge", "feature-head"],
    treeSha: TREE_SHA,
    requiredCheckKinds: ["unit", "integration"],
  });
  assert.equal(testedTreeStatus.candidateSha, "feature-head");

  const notFound = await findTestedTreeStatus({
    github,
    repository,
    candidateShas: ["merge"],
    treeSha: TREE_SHA,
    requiredCheckKinds: ["unit"],
  });
  assert.equal(notFound, null);
});
