// Сопоставление путей репозитория с шаблонами конфига областей (07385).
// Синтаксис — как в .gitignore/paths GitHub Actions, без отрицаний:
//   **  — любое число каталогов (в том числе ни одного),
//   *   — любые символы внутри одного имени,
//   ?   — один символ внутри имени.
// Шаблон без слэша в конце сравнивается с путём целиком: `package.json` —
// только файл в корне, `**/package.json` — в любом каталоге.

const REGEX_SPECIAL_CHARACTERS = /[.+^${}()|[\]\\]/g;

function escapeRegexText(text) {
  return text.replace(REGEX_SPECIAL_CHARACTERS, "\\$&");
}

export function convertGlobToRegex(globPattern) {
  let regexSource = "";
  for (let position = 0; position < globPattern.length; position += 1) {
    const character = globPattern[position];
    const isDoubleStar = character === "*" && globPattern[position + 1] === "*";
    if (isDoubleStar) {
      const isFollowedBySlash = globPattern[position + 2] === "/";
      regexSource += isFollowedBySlash ? "(?:.*/)?" : ".*";
      position += isFollowedBySlash ? 2 : 1;
    } else if (character === "*") {
      regexSource += "[^/]*";
    } else if (character === "?") {
      regexSource += "[^/]";
    } else {
      regexSource += escapeRegexText(character);
    }
  }
  return new RegExp(`^${regexSource}$`);
}

export function createPathMatcher(globPatterns) {
  const patternRegexes = globPatterns.map(convertGlobToRegex);
  return (repositoryPath) => patternRegexes.some((patternRegex) => patternRegex.test(repositoryPath));
}
