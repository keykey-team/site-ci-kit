import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { TESTED_TREE_STATUS_CONTEXT } from "../config/ciPlan.config.mjs";
import { planCiRun, readRequestedCheckKinds } from "../lib/planCiRun.mjs";
import { formatTestedTreeDescription } from "../lib/testedTreeStatus.mjs";

const TREE_SHA = "c".repeat(40);
const SITE_AREAS_CONFIG_SOURCE = `export default {
  runEverythingPaths: [".github/**"],
  ignoredPaths: ["docs/**"],
  areas: {
    server: { paths: ["server/**"], install: "npm ci --prefix server", checks: { unit: "npm run test:unit --prefix server", integration: "npm run test:integration --prefix server" } },
    client: { paths: ["client/**"], install: "npm ci --prefix client", checks: { lint: "npm run lint --prefix client", build: "npm run build --prefix client" } },
  },
};`;

let temporaryDirectory;
before(() => {
  temporaryDirectory = mkdtempSync(path.join(tmpdir(), "site-ci-plan-test-"));
  process.env.RUNNER_TEMP = temporaryDirectory;
  process.env.AREAS_CONFIG_PATH = ".github/site-ci-areas.config.mjs";
});
after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));

function createFakeCore() {
  const outputs = {};
  const summary = {
    addHeading: () => summary,
    addRaw: () => summary,
    addTable: () => summary,
    write: async () => summary,
  };
  return { outputs, summary, setOutput: (name, value) => (outputs[name] = value), warning: () => {}, info: () => {} };
}

function createFakeGithub({ changedFilePaths = [], statusesBySha = {}, associatedPullRequests = [], parents = [{ sha: "parent" }] }) {
  const changedFiles = changedFilePaths.map((filename) => ({ filename }));
  return {
    paginate: async () => changedFiles,
    rest: {
      pulls: { listFiles: async () => ({ data: changedFiles }) },
      repos: {
        getContent: async () => ({ data: { content: Buffer.from(SITE_AREAS_CONFIG_SOURCE).toString("base64"), encoding: "base64" } }),
        compareCommitsWithBasehead: async () => ({ data: { files: changedFiles } }),
        listCommitStatusesForRef: async ({ ref }) => ({ data: statusesBySha[ref] ?? [] }),
        listPullRequestsAssociatedWithCommit: async () => ({ data: associatedPullRequests }),
      },
      git: { getCommit: async () => ({ data: { tree: { sha: TREE_SHA }, parents } }) },
    },
  };
}

const pullRequestContext = {
  eventName: "pull_request",
  sha: "pr-merge-ref",
  repo: { owner: "keykey-team", repo: "site" },
  payload: { pull_request: { number: 7, head: { sha: "pr-head" } } },
};

test("PR только с фронтом: lint и build клиента, сервер пропущен, отметка пойдёт на голову PR", async () => {
  process.env.REQUESTED_CHECKS = "lint unit integration build";
  const core = createFakeCore();
  await planCiRun({ github: createFakeGithub({ changedFilePaths: ["client/src/app.jsx"] }), context: pullRequestContext, core });

  assert.match(core.outputs["lint-script"], /npm run lint --prefix client/);
  assert.match(core.outputs["build-script"], /npm run build --prefix client/);
  assert.equal(core.outputs["unit-script"], "");
  assert.equal(core.outputs["integration-script"], "");
  assert.equal(core.outputs["is-tested-before"], "false");
  assert.equal(core.outputs["record-target-sha"], "pr-head");
  assert.equal(
    core.outputs["record-description"],
    formatTestedTreeDescription({ treeSha: TREE_SHA, satisfiedCheckKinds: ["lint", "unit", "integration", "build"] })
  );
});

test("деплой влитого PR с тем же деревом: всё пропущено, отметка переносится на коммит develop", async () => {
  process.env.REQUESTED_CHECKS = "unit integration";
  const core = createFakeCore();
  const testedOnPullRequest = {
    context: TESTED_TREE_STATUS_CONTEXT,
    state: "success",
    description: formatTestedTreeDescription({ treeSha: TREE_SHA, satisfiedCheckKinds: ["lint", "unit", "integration", "build"] }),
  };
  const github = createFakeGithub({
    changedFilePaths: ["server/src/app.js"],
    associatedPullRequests: [{ merge_commit_sha: "develop-merge", head: { sha: "pr-head" } }],
    statusesBySha: { "pr-head": [testedOnPullRequest] },
  });
  const pushContext = {
    eventName: "push",
    sha: "develop-merge",
    repo: { owner: "keykey-team", repo: "site" },
    payload: { before: "develop-before" },
  };
  await planCiRun({ github, context: pushContext, core });

  for (const checkKind of ["lint", "unit", "integration", "build"]) assert.equal(core.outputs[`${checkKind}-script`], "");
  assert.equal(core.outputs["is-tested-before"], "true");
  assert.equal(core.outputs["record-target-sha"], "develop-merge");
  assert.match(core.outputs["record-description"], /lint unit integration build$/);
});

test("новая ветка без «до» и без родителей — запускается всё, что просили", async () => {
  process.env.REQUESTED_CHECKS = "unit integration";
  const core = createFakeCore();
  const pushContext = {
    eventName: "push",
    sha: "first-commit",
    repo: { owner: "keykey-team", repo: "site" },
    payload: { before: "0000000000000000000000000000000000000000" },
  };
  await planCiRun({ github: createFakeGithub({ parents: [] }), context: pushContext, core });
  assert.match(core.outputs["unit-script"], /test:unit --prefix server/);
  assert.match(core.outputs["integration-script"], /test:integration --prefix server/);
  assert.equal(core.outputs["build-script"], "");
});

test("неизвестная проверка в checks — ошибка, а не тихий пропуск", () => {
  assert.throws(() => readRequestedCheckKinds("unit e2e"), /checks/);
  assert.throws(() => readRequestedCheckKinds(""), /checks/);
  assert.deepEqual(readRequestedCheckKinds("integration, unit"), ["unit", "integration"]);
});
