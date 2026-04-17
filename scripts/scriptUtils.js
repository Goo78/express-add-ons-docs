const path = require("path");
const fs = require("node:fs");
const glob = require("glob");
const globSync = glob.globSync || glob.sync;

const ROOT_DIR = path.resolve(__dirname, "..");

const DOC_APIS_SUBDIR = "src/pages/references/document-sandbox/document-apis";

function getRedirectionsFilePath() {
  return path.resolve(ROOT_DIR, "src", "pages", "redirects.json");
}

function readRedirectionsFile() {
  return JSON.parse(fs.readFileSync(getRedirectionsFilePath())).data;
}

function writeRedirectionsFile(data) {
  const redirectionsData = {
    total: data.length,
    offset: 0,
    limit: data.length,
    data: data,
    ":type": "sheet",
  };
  fs.writeFileSync(getRedirectionsFilePath(), JSON.stringify(redirectionsData));
}

function getFiles(fileExtensions, subDir = DOC_APIS_SUBDIR) {
  const extPattern = fileExtensions.join("|");
  const pattern = path
    .join(ROOT_DIR, subDir, `**/*+(${extPattern})`)
    .replaceAll(path.sep, "/");
  return globSync(pattern).map((f) => path.relative(ROOT_DIR, f));
}

function getDeployableFiles(subDir = DOC_APIS_SUBDIR) {
  return getFiles([".md", ".json"], subDir);
}

function getMarkdownFiles(subDir = DOC_APIS_SUBDIR) {
  return getFiles([".md"], subDir);
}

function removeFileExtension(file) {
  const base = path.basename(file);
  const ext = path.extname(file);
  const end = file.length - base.length;
  const baseWithoutExt = base.substring(0, base.length - ext.length);
  return `${file.substring(0, end)}${baseWithoutExt}`;
}

// Markdown link matcher for rewriting link targets.
//
// The label portion `[...]` supports two kinds of content, alternated freely:
//   1. `code spans` — anything between backticks is treated as opaque, so a
//      literal `]` inside a code span (e.g. `[iterator]`) doesn't prematurely
//      close the label. This is important for TypeDoc-generated inheritance
//      lines like `[`ReadOnlyItemList`](...).[`[iterator]`](...)`.
//   2. non-backtick, non-`]` characters — ordinary label text.
//
// Capture groups (preserved from the original pattern so existing callers
// keep working):
//   $1  the full `[label](` prefix
//   $2  optional leading `/` or `./`
//   $3  the link target (substituted)
//   $4  optional `#fragment`
//   $5  the closing `)`
const getFindPatternForMarkdownFiles = (from) =>
  `(\\[(?:\`[^\`]*\`|[^\`\\]])*]\\()(/|./)?(${from})(#[^\\()]*)?(\\))`;

const getReplacePatternForMarkdownFiles = (to) => `$1$2${to}$4$5`;

function replaceLinksInFile({ file, linkMap, getFindPattern, getReplacePattern }) {
  const absPath = path.isAbsolute(file)
    ? file
    : path.resolve(ROOT_DIR, file);
  let data = fs.readFileSync(absPath, "utf8");
  linkMap.forEach((to, from) => {
    const find = getFindPattern(from);
    const replace = getReplacePattern(to);
    data = data.replaceAll(new RegExp(find, "gm"), replace);
  });
  fs.writeFileSync(absPath, data, "utf-8");
}

module.exports = {
  ROOT_DIR,
  DOC_APIS_SUBDIR,
  getRedirectionsFilePath,
  readRedirectionsFile,
  writeRedirectionsFile,
  getDeployableFiles,
  getMarkdownFiles,
  getFindPatternForMarkdownFiles,
  getReplacePatternForMarkdownFiles,
  removeFileExtension,
  replaceLinksInFile,
};
