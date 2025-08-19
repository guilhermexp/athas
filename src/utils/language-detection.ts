/**
 * Detect programming language from file extension
 */
export function detectLanguageFromPath(filePath: string): string {
  const extension = filePath.toLowerCase().split(".").pop() || "";

  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    mjs: "javascript",
    cjs: "javascript",

    // Web technologies
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    json: "json",
    xml: "xml",
    svg: "xml",

    // Markup
    md: "markdown",
    markdown: "markdown",
    rst: "restructuredtext",
    tex: "latex",

    // Systems programming
    rs: "rust",
    go: "go",
    c: "c",
    h: "c",
    cpp: "cpp",
    cxx: "cpp",
    cc: "cpp",
    hpp: "cpp",
    hxx: "cpp",

    // High-level languages
    py: "python",
    pyw: "python",
    rb: "ruby",
    java: "java",
    kt: "kotlin",
    scala: "scala",
    cs: "csharp",
    php: "php",
    swift: "swift",

    // Functional languages
    hs: "haskell",
    ml: "ocaml",
    fs: "fsharp",
    clj: "clojure",
    lisp: "lisp",
    scm: "scheme",

    // Shell/Scripts
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    fish: "shell",
    ps1: "powershell",
    bat: "batch",
    cmd: "batch",

    // Config files
    toml: "toml",
    yaml: "yaml",
    yml: "yaml",
    ini: "ini",
    cfg: "ini",
    conf: "ini",

    // Data formats
    sql: "sql",
    csv: "csv",

    // Others
    dockerfile: "dockerfile",
    makefile: "makefile",
    r: "r",
    lua: "lua",
    vim: "vim",
    dart: "dart",
    elm: "elm",
  };

  return languageMap[extension] || "text";
}

/**
 * Detect language from file name (handles special cases like Dockerfile, Makefile)
 */
export function detectLanguageFromFileName(fileName: string): string {
  const lowercaseName = fileName.toLowerCase();

  // Special files without extensions
  if (lowercaseName === "dockerfile" || lowercaseName.startsWith("dockerfile.")) {
    return "dockerfile";
  }

  if (lowercaseName === "makefile" || lowercaseName.startsWith("makefile.")) {
    return "makefile";
  }

  if (lowercaseName === "cmakelists.txt") {
    return "cmake";
  }

  if (lowercaseName === ".gitignore" || lowercaseName === ".dockerignore") {
    return "gitignore";
  }

  return detectLanguageFromPath(fileName);
}
