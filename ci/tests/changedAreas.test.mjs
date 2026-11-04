import assert from "node:assert/strict";
import { test } from "node:test";

import { listAreasByCheckKind, planChecksForChangedFiles } from "../lib/changedAreas.mjs";
import { convertGlobToRegex } from "../lib/pathGlob.mjs";
import { readSiteAreasConfig } from "../lib/siteAreasConfig.mjs";

const ALL_CHECK_KINDS = ["lint", "unit", "integration", "build"];

const siteAreasConfig = readSiteAreasConfig({
  runEverythingPaths: [".github/**", "scripts/**", "package.json"],
  ignoredPaths: ["docs/**", "**/*.md", "e2e/**"],
  areas: {
    server: {
      paths: ["server/**", "shared-test-cases/**"],
      install: "npm ci --prefix server",
      checks: { lint: "lint server", unit: "unit server", integration: "integration server" },
    },
    client: {
      paths: ["client/**", "shared-test-cases/**"],
      contentOnlyPaths: ["client/public/locales/**"],
      contentOnlyChecks: ["lint", "build"],
      jsonFilePaths: ["client/public/locales/**/*.json"],
      install: "npm ci --prefix client",
      checks: { lint: "lint client", unit: "unit client", build: "build client" },
    },
  },
});

function planFor(changedFilePaths, requestedCheckKinds = ALL_CHECK_KINDS) {
  return planChecksForChangedFiles({ siteAreasConfig, changedFilePaths, requestedCheckKinds });
}

function summarizeAreaChecks(checksPlan) {
  return Object.fromEntries(checksPlan.areaPlans.map((areaPlan) => [areaPlan.areaName, areaPlan.checkKinds]));
}

test("шаблоны путей: ** — любая глубина, * — внутри имени, корневой файл — только в корне", () => {
  assert.ok(convertGlobToRegex("server/**").test("server/src/app.js"));
  assert.ok(convertGlobToRegex("**/*.md").test("README.md"));
  assert.ok(convertGlobToRegex("**/*.md").test("docs/a/b.md"));
  assert.ok(!convertGlobToRegex("package.json").test("client/package.json"));
  assert.ok(convertGlobToRegex("client/public/locales/**/*.json").test("client/public/locales/uk/common.json"));
  assert.ok(!convertGlobToRegex("client/*.js").test("client/src/a.js"));
  assert.ok(!convertGlobToRegex("server/**").test("serverless/a.js"));
});

test("правка только фронта не запускает проверок сервера", () => {
  const checksPlan = planFor(["client/src/widgets/Header/ui/Header.jsx"]);
  assert.equal(checksPlan.isEverything, false);
  assert.deepEqual(summarizeAreaChecks(checksPlan), { client: ["lint", "unit", "build"] });
  assert.deepEqual(listAreasByCheckKind(checksPlan, ALL_CHECK_KINDS), {
    lint: ["client"],
    unit: ["client"],
    integration: [],
    build: ["client"],
  });
});

test("правка только сервера не собирает фронт", () => {
  assert.deepEqual(summarizeAreaChecks(planFor(["server/src/modules/catalog/service.js"])), {
    server: ["lint", "unit", "integration"],
  });
});

test("только контент фронта (тексты, картинки) — проверка JSON, линт и сборка, без юнит-тестов", () => {
  const checksPlan = planFor(["client/public/locales/uk/common.json", "client/public/locales/ru/common.json"]);
  assert.deepEqual(summarizeAreaChecks(checksPlan), { client: ["lint", "build"] });
  assert.equal(checksPlan.areaPlans[0].isContentOnly, true);
  assert.deepEqual(checksPlan.areaPlans[0].jsonFilePathsToValidate, [
    "client/public/locales/uk/common.json",
    "client/public/locales/ru/common.json",
  ]);
});

test("контент и код фронта вместе — полный набор фронта", () => {
  const checksPlan = planFor(["client/public/locales/uk/common.json", "client/src/app.jsx"]);
  assert.deepEqual(summarizeAreaChecks(checksPlan), { client: ["lint", "unit", "build"] });
  assert.equal(checksPlan.areaPlans[0].isContentOnly, false);
});

test("общие для двух областей файлы запускают обе", () => {
  assert.deepEqual(summarizeAreaChecks(planFor(["shared-test-cases/cart.cases.json"])), {
    server: ["lint", "unit", "integration"],
    client: ["lint", "unit", "build"],
  });
});

test("документация и сценарии e2e не запускают ничего", () => {
  const checksPlan = planFor(["docs/qa/checklist.md", "README.md", "e2e/site.adapter.mjs"]);
  assert.equal(checksPlan.isEverything, false);
  assert.deepEqual(checksPlan.areaPlans, []);
  assert.equal(checksPlan.ignoredFilePaths.length, 3);
});

test("правка CI, скриптов или корневых пакетов запускает всё", () => {
  for (const changedFilePath of [".github/workflows/deploy.yml", "scripts/deploy.sh", "package.json"]) {
    const checksPlan = planFor(["client/src/app.jsx", changedFilePath]);
    assert.equal(checksPlan.isEverything, true, changedFilePath);
    assert.match(checksPlan.everythingReason, /общий файл/);
    assert.deepEqual(summarizeAreaChecks(checksPlan), {
      server: ["lint", "unit", "integration"],
      client: ["lint", "unit", "build"],
    });
  }
});

test("файл вне всех областей — запуск всего, а не пропуск", () => {
  const checksPlan = planFor(["tools/new-script.js"]);
  assert.equal(checksPlan.isEverything, true);
  assert.match(checksPlan.everythingReason, /tools\/new-script\.js/);
});

test("неизвестный список файлов — запуск всего", () => {
  const checksPlan = planFor(null);
  assert.equal(checksPlan.isEverything, true);
  assert.equal(checksPlan.areaPlans.length, 2);
});

test("деплою нужны только unit и integration — сборку и линт он не получает", () => {
  const checksPlan = planFor(["client/src/app.jsx", "server/src/app.js"], ["unit", "integration"]);
  assert.deepEqual(summarizeAreaChecks(checksPlan), { server: ["unit", "integration"], client: ["unit"] });
});

test("конфиг с ошибками отвергается с перечнем проблем", () => {
  assert.throws(
    () =>
      readSiteAreasConfig({
        areas: {
          client: {
            paths: [],
            install: "",
            checks: { test: "x" },
            contentOnlyPaths: ["client/locales/**"],
          },
        },
      }),
    (configError) => {
      assert.match(configError.message, /areas\.client\.paths/);
      assert.match(configError.message, /areas\.client\.install/);
      assert.match(configError.message, /неизвестные проверки test/);
      assert.match(configError.message, /contentOnlyChecks/);
      return true;
    }
  );
});
