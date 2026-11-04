import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { buildCheckScript } from "../lib/checkScripts.mjs";

function createArea(overrides = {}) {
  return {
    areaName: "server",
    installCommand: "echo installed >> install.log && mkdir -p server/node_modules",
    installKeyFiles: ["server/package-lock.json"],
    installedDirectories: ["server/node_modules"],
    commandsByCheckKind: { unit: "echo unit-ran >> check.log", lint: "echo lint-ran >> check.log" },
    ...overrides,
  };
}

function runScriptInDirectory(script, workingDirectory) {
  return spawnSync("bash", ["-c", script], { cwd: workingDirectory, encoding: "utf8" });
}

function readLines(filePath) {
  try {
    return readFileSync(filePath, "utf8").trim().split("\n");
  } catch {
    return [];
  }
}

test("нет областей — пустой скрипт, джоб пропускается", () => {
  assert.equal(buildCheckScript({ checkKind: "unit", areas: [] }), "");
});

test("зависимости ставятся один раз, пока lock-файл не менялся, и заново — после правки lock", () => {
  const workingDirectory = mkdtempSync(path.join(tmpdir(), "site-ci-check-script-"));
  try {
    mkdirSync(path.join(workingDirectory, "server"));
    writeFileSync(path.join(workingDirectory, "server/package-lock.json"), '{"lockfileVersion":3}');
    const script = buildCheckScript({ checkKind: "unit", areas: [createArea()] });

    for (let runNumber = 0; runNumber < 2; runNumber += 1) {
      const scriptRun = runScriptInDirectory(script, workingDirectory);
      assert.equal(scriptRun.status, 0, scriptRun.stderr);
    }
    assert.deepEqual(readLines(path.join(workingDirectory, "install.log")), ["installed"]);
    assert.deepEqual(readLines(path.join(workingDirectory, "check.log")), ["unit-ran", "unit-ran"]);

    writeFileSync(path.join(workingDirectory, "server/package-lock.json"), '{"lockfileVersion":3,"changed":true}');
    assert.equal(runScriptInDirectory(script, workingDirectory).status, 0);
    assert.deepEqual(readLines(path.join(workingDirectory, "install.log")), ["installed", "installed"]);
  } finally {
    rmSync(workingDirectory, { recursive: true, force: true });
  }
});

test("упавшая команда проверки валит скрипт", () => {
  const workingDirectory = mkdtempSync(path.join(tmpdir(), "site-ci-check-script-"));
  try {
    const failingArea = createArea({ installedDirectories: [], commandsByCheckKind: { unit: "exit 3" } });
    const scriptRun = runScriptInDirectory(buildCheckScript({ checkKind: "unit", areas: [failingArea] }), workingDirectory);
    assert.equal(scriptRun.status, 3);
  } finally {
    rmSync(workingDirectory, { recursive: true, force: true });
  }
});

test("lint проверяет JSON текстов: битый файл — ошибка с его именем, удалённый — пропуск", () => {
  const workingDirectory = mkdtempSync(path.join(tmpdir(), "site-ci-check-script-"));
  try {
    mkdirSync(path.join(workingDirectory, "locales"));
    writeFileSync(path.join(workingDirectory, "locales/uk.json"), '{"title": "Привіт"}');
    writeFileSync(path.join(workingDirectory, "locales/ru.json"), '{"title": "Привет",}');
    const area = createArea({ areaName: "client", installedDirectories: [] });
    const script = buildCheckScript({
      checkKind: "lint",
      areas: [area],
      jsonFilePathsByAreaName: { client: ["locales/uk.json", "locales/ru.json", "locales/deleted.json"] },
    });
    const scriptRun = runScriptInDirectory(script, workingDirectory);
    assert.equal(scriptRun.status, 1);
    assert.match(scriptRun.stdout, /::error file=locales\/ru\.json::JSON не разбирается/);
    assert.doesNotMatch(scriptRun.stdout, /uk\.json::/);
    assert.deepEqual(readLines(path.join(workingDirectory, "check.log")), []);
  } finally {
    rmSync(workingDirectory, { recursive: true, force: true });
  }
});

test("одинаковая установка двух областей выполняется один раз", () => {
  const sharedInstall = "npm ci --prefix server && npm ci --prefix client";
  const script = buildCheckScript({
    checkKind: "unit",
    areas: [
      createArea({ installCommand: sharedInstall, installedDirectories: [] }),
      createArea({ areaName: "client", installCommand: sharedInstall, installedDirectories: [] }),
    ],
  });
  assert.equal(script.split(sharedInstall).length - 1, 1);
});
