import assert from "node:assert/strict";
import { before, test } from "node:test";

import { findForeignUnreleasedCommits, releaseToProd } from "../lib/releaseToProd.mjs";

before(() => {
  process.env.STAGE_BRANCH = "develop";
  process.env.PROD_BRANCH = "main";
  process.env.RELEASE_LABEL = "в прод";
  process.env.DEPLOY_WORKFLOW_FILE = "deploy.yml";
});

const context = { sha: "develop-merge", repo: { owner: "keykey-team", repo: "site" }, serverUrl: "https://github.com" };

function createCommit(sha, title = `commit ${sha}`) {
  return { sha, commit: { message: `${title}\n\nbody` } };
}

function createFakeCore() {
  const fakeCore = { failures: [], infos: [] };
  fakeCore.summary = { addRaw: () => fakeCore.summary, write: async () => fakeCore.summary };
  fakeCore.setFailed = (failureMessage) => fakeCore.failures.push(failureMessage);
  fakeCore.info = (infoMessage) => fakeCore.infos.push(infoMessage);
  return fakeCore;
}

function createFakeGithub({ labels = ["в прод"], unreleasedCommits, pullRequestCommits, mergeError = null }) {
  const calls = { merges: [], dispatches: [], comments: [] };
  const github = {
    calls,
    paginate: async () => pullRequestCommits,
    rest: {
      repos: {
        listPullRequestsAssociatedWithCommit: async () => ({
          data: [
            {
              number: 42,
              title: "fix(cart): keep size (#07385)",
              merge_commit_sha: "develop-merge",
              base: { ref: "develop" },
              labels: labels.map((name) => ({ name })),
            },
          ],
        }),
        compareCommitsWithBasehead: async () => ({
          data: { ahead_by: unreleasedCommits.length, commits: unreleasedCommits },
        }),
        merge: async (mergeRequest) => {
          calls.merges.push(mergeRequest);
          if (mergeError) throw mergeError;
          return { status: 201, data: { sha: "main-merge-sha" } };
        },
      },
      pulls: { listCommits: () => {} },
      actions: { createWorkflowDispatch: async (dispatchRequest) => calls.dispatches.push(dispatchRequest) },
      issues: { createComment: async (commentRequest) => calls.comments.push(commentRequest) },
    },
  };
  return github;
}

test("чужим считается всё невыпущенное, кроме коммитов PR и его merge-коммита", () => {
  const foreignCommits = findForeignUnreleasedCommits({
    unreleasedCommits: [createCommit("a"), createCommit("b"), createCommit("develop-merge"), createCommit("x")],
    pullRequestCommitShas: ["a", "b"],
    mergeCommitSha: "develop-merge",
  });
  assert.deepEqual(foreignCommits.map((foreignCommit) => foreignCommit.sha), ["x"]);
});

test("PR без метки — ничего не вливается", async () => {
  const github = createFakeGithub({ labels: [], unreleasedCommits: [createCommit("develop-merge")], pullRequestCommits: [] });
  const core = createFakeCore();
  await releaseToProd({ github, context, core });
  assert.equal(github.calls.merges.length, 0);
  assert.equal(core.failures.length, 0);
});

test("в develop только этот PR — develop вливается в main и запускается деплой прода", async () => {
  const github = createFakeGithub({
    unreleasedCommits: [createCommit("a"), createCommit("develop-merge")],
    pullRequestCommits: [createCommit("a")],
  });
  const core = createFakeCore();
  await releaseToProd({ github, context, core });
  assert.equal(github.calls.merges.length, 1);
  assert.equal(github.calls.merges[0].base, "main");
  assert.equal(github.calls.merges[0].head, "develop-merge");
  assert.deepEqual(github.calls.dispatches.map((dispatch) => [dispatch.workflow_id, dispatch.ref]), [["deploy.yml", "main"]]);
  assert.match(github.calls.comments[0].body, /влит в main/);
  assert.equal(core.failures.length, 0);
});

test("в develop есть чужое невыпущенное — не вливает, пишет в PR и краснеет", async () => {
  const github = createFakeGithub({
    unreleasedCommits: [createCommit("someone-else", "feat(menu): unreleased work"), createCommit("a"), createCommit("develop-merge")],
    pullRequestCommits: [createCommit("a")],
  });
  const core = createFakeCore();
  await releaseToProd({ github, context, core });
  assert.equal(github.calls.merges.length, 0);
  assert.equal(github.calls.dispatches.length, 0);
  assert.match(github.calls.comments[0].body, /feat\(menu\): unreleased work/);
  assert.equal(core.failures.length, 1);
});

test("конфликт слияния — прод не трогается, причина в PR", async () => {
  const conflictError = Object.assign(new Error("Merge conflict"), { status: 409 });
  const github = createFakeGithub({
    unreleasedCommits: [createCommit("develop-merge")],
    pullRequestCommits: [],
    mergeError: conflictError,
  });
  const core = createFakeCore();
  await releaseToProd({ github, context, core });
  assert.equal(github.calls.dispatches.length, 0);
  assert.match(github.calls.comments[0].body, /конфликт слияния/);
  assert.equal(core.failures.length, 1);
});
