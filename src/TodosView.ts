import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  listAllSessions,
  groupSessions,
  loadStatusMap,
  StatusSnapshot,
  TodoItem,
  Session,
} from "./SessionReader";

export interface FlatTodo {
  content: string;
  status: "pending" | "in_progress" | "completed";
  sessionId: string;
  project: string;
}

export interface ProjectTodoGroup {
  project: string;
  todos: FlatTodo[];
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTodosHtml(groups: ProjectTodoGroup[]): string {
  if (groups.length === 0) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
      color: var(--vscode-descriptionForeground); padding: 16px; }
  </style>
</head>
<body><p>No active todos.</p></body>
</html>`;
  }

  const STATUS_ICON: Record<FlatTodo["status"], string> = {
    in_progress: "●",
    pending: "○",
    completed: "✓",
  };

  const groupsHtml = groups
    .map((g) => {
      const todosHtml = g.todos
        .map(
          (t) =>
            `<div class="todo-row status-${t.status}" data-session-id="${escHtml(t.sessionId)}" data-status="${t.status}">
  <span class="icon">${STATUS_ICON[t.status]}</span>
  <span class="content">${escHtml(t.content)}</span>
</div>`,
        )
        .join("\n");
      return `<div class="project-group">
  <div class="project-header">${escHtml(g.project)}</div>
  ${todosHtml}
</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
      color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
    .project-header { padding: 4px 8px; font-size: 0.75em; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground);
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-top: 4px; }
    .todo-row { display: grid; grid-template-columns: 14px 1fr; align-items: center;
      gap: 6px; padding: 5px 8px 5px 10px; cursor: pointer;
      border-bottom: 1px solid var(--vscode-panel-border); }
    .todo-row:hover { background: var(--vscode-list-hoverBackground); }
    .todo-row.status-in_progress { border-left: 2px solid var(--vscode-notificationsInfoIcon-foreground, #75beff); }
    .todo-row.status-completed { opacity: 0.45; }
    .icon { font-size: 0.72em; color: var(--vscode-descriptionForeground); }
    .content { font-size: 0.88em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  </style>
</head>
<body>
${groupsHtml}
  <script>
    const vscode = acquireVsCodeApi();
    document.body.addEventListener('click', (e) => {
      const row = e.target.closest('.todo-row');
      if (!row) return;
      vscode.postMessage({ command: 'focusSession', sessionId: row.dataset.sessionId });
    });
  </script>
</body>
</html>`;
}
