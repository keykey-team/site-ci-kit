import {
  DEFAULT_TARGET_ENVIRONMENT,
  RUNNER_ENV_NAMES,
  TARGET_ENVIRONMENTS,
} from "../config/runner.config.mjs";

/** Оточення, проти якого йде запуск: "stage" або "prod" (з E2E_TARGET_ENV). */
export function readTargetEnvironment() {
  const requestedEnvironment = process.env[RUNNER_ENV_NAMES.targetEnvironment] || DEFAULT_TARGET_ENVIRONMENT;
  const knownEnvironments = Object.values(TARGET_ENVIRONMENTS);
  if (!knownEnvironments.includes(requestedEnvironment)) {
    throw new Error(
      `${RUNNER_ENV_NAMES.targetEnvironment}="${requestedEnvironment}" — неизвестное окружение, ` +
        `допустимо: ${knownEnvironments.join(", ")}`,
    );
  }
  return requestedEnvironment;
}

export function isProdEnvironment(targetEnvironment) {
  return targetEnvironment === TARGET_ENVIRONMENTS.prod;
}
