// Minimal vscode stub for vitest — only the APIs used by pure-function modules.
export const Uri = {
  file: (p: string) => ({ fsPath: p, toString: () => p }),
  parse: (s: string) => ({ fsPath: s, toString: () => s }),
};

export const window = {
  createWebviewPanel: () => ({}),
  showErrorMessage: () => Promise.resolve(undefined),
};

export const ViewColumn = { One: 1, Two: 2, Three: 3 };

export const ExtensionContext = {};

export default {};
