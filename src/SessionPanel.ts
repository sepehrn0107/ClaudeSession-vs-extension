import * as vscode from "vscode";
import {
  ConversationItem,
  SessionStats,
  ToolCallItem,
  computeSessionStats,
  readSessionItems,
  Session,
} from "./SessionReader";

export class SessionPanel {
  static open(session: Session, extensionUri: vscode.Uri): void {
    const panel = vscode.window.createWebviewPanel(
      "claudeSession",
      session.firstUserMessage.slice(0, 40) || "Session",
      vscode.ViewColumn.One,
      { enableScripts: true },
    );

    let items: ConversationItem[] = [];
    let stats: SessionStats | null = null;
    try {
      items = readSessionItems(session.filePath);
      stats = computeSessionStats(session.filePath);
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to read session: ${e}`);
    }

    panel.webview.html = buildHtml(session, items, stats);
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStatsBar(stats: SessionStats): string {
  const usedK = (stats.memoryUsed / 1000).toFixed(0);
  const limitK = (stats.memoryLimit / 1000).toFixed(0);
  const toolChips = Object.entries(stats.toolCounts)
    .map(
      ([name, count]) =>
        `<span class="chip" title="Actions Claude took">${escHtml(name)} \u00d7${count}</span>`,
    )
    .join("");
  return `<div class="stats-bar">
  <span class="chip" title="Words Claude is holding in memory this session">Memory: ${usedK}K / ${limitK}K</span>
  <span class="sep">\u00b7</span>
  <span class="chip" title="Percentage of context loaded from saved checkpoint instead of re-read">Checkpoint: ${stats.checkpointPct}%</span>
  <span class="sep">\u00b7</span>
  <span class="chip" title="Number of back-and-forths">${stats.exchangeCount} exchanges</span>
  <span class="sep">\u00b7</span>
  <span class="chip">${stats.durationMinutes} min</span>
  ${toolChips ? `<span class="sep">\u00b7</span>${toolChips}` : ""}
</div>`;
}

function buildToolCallHtml(item: ToolCallItem): string {
  const preview = escHtml(item.inputPreview || item.toolName);
  const full = escHtml(item.inputFull);
  return `<div class="tool-call" data-expanded="false">
  <div class="tool-header">
    <span class="toggle">\u25b6</span>
    <span class="tool-name">[${escHtml(item.toolName)}]</span>
    <span class="tool-preview">${preview}</span>
  </div>
  <pre class="tool-full">${full}</pre>
</div>`;
}

function buildHtml(
  session: Session,
  items: ConversationItem[],
  stats: SessionStats | null,
): string {
  const date = session.startedAt
    ? new Date(session.startedAt).toLocaleString()
    : "Unknown";

  const itemsHtml = items
    .map((item) => {
      if ("kind" in item && item.kind === "tool_call") {
        return buildToolCallHtml(item as ToolCallItem);
      }
      const m = item as { role: string; text: string; timestamp: string };
      const role = m.role === "user" ? "You" : "Claude";
      const cls = m.role === "user" ? "user" : "assistant";
      const time = m.timestamp
        ? new Date(m.timestamp).toLocaleTimeString()
        : "";
      return `<div class="message ${cls}">
  <div class="meta"><span class="role">${role}</span><span class="time">${time}</span></div>
  <div class="body">${escHtml(m.text)}</div>
</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>Claude Session</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
      color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; }
    .header { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 12px; margin-bottom: 16px; }
    .header h2 { font-size: 1.1em; font-weight: 600; margin-bottom: 4px; }
    .header .meta { font-size: 0.82em; color: var(--vscode-descriptionForeground); }
    .stats-bar { display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
      margin-top: 10px; padding: 6px 10px; border-radius: 5px;
      background: var(--vscode-editor-inactiveSelectionBackground); }
    .chip { font-size: 0.78em; color: var(--vscode-foreground); cursor: default; }
    .sep { font-size: 0.78em; color: var(--vscode-descriptionForeground); }
    .message { margin-bottom: 20px; max-width: 860px; }
    .message .meta { display: flex; gap: 12px; align-items: baseline; margin-bottom: 4px; }
    .message .role { font-weight: 600; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.04em; }
    .message.user .role { color: var(--vscode-charts-blue); }
    .message.assistant .role { color: var(--vscode-charts-green); }
    .message .time { font-size: 0.78em; color: var(--vscode-descriptionForeground); }
    .message .body { line-height: 1.6; white-space: pre-wrap; word-break: break-word;
      padding: 10px 14px; border-radius: 6px; background: var(--vscode-editor-inactiveSelectionBackground); }
    .message.user .body { background: var(--vscode-inputOption-activeBackground); }
    .tool-call { margin: 4px 0 8px 0; max-width: 860px; }
    .tool-header { display: flex; align-items: center; gap: 8px; cursor: pointer;
      padding: 4px 8px; border-radius: 4px; font-size: 0.82em;
      background: var(--vscode-editor-inactiveSelectionBackground);
      color: var(--vscode-descriptionForeground); user-select: none; }
    .tool-header:hover { background: var(--vscode-list-hoverBackground); }
    .toggle { font-size: 0.7em; transition: transform 0.1s; }
    .tool-name { font-weight: 600; color: var(--vscode-foreground); }
    .tool-preview { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
    .tool-full { display: none; margin-top: 4px; padding: 8px 12px; border-radius: 4px; font-size: 0.8em;
      background: var(--vscode-textCodeBlock-background); white-space: pre-wrap; word-break: break-all;
      color: var(--vscode-foreground); }
    .tool-call[data-expanded="true"] .tool-full { display: block; }
    .tool-call[data-expanded="true"] .toggle { display: inline-block; transform: rotate(90deg); }
    .empty { color: var(--vscode-descriptionForeground); font-style: italic; margin-top: 40px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${escHtml(session.firstUserMessage || session.id)}</h2>
    <div class="meta">${escHtml(date)} &nbsp;\u00b7&nbsp; ${escHtml(session.projectPath)}</div>
    ${stats ? buildStatsBar(stats) : ""}
  </div>
  ${itemsHtml || '<div class="empty">No messages found in this session.</div>'}
  <script>
    document.querySelectorAll('.tool-call').forEach(el => {
      el.querySelector('.tool-header').addEventListener('click', () => {
        const expanded = el.dataset.expanded === 'true';
        el.dataset.expanded = expanded ? 'false' : 'true';
      });
    });
  </script>
</body>
</html>`;
}
