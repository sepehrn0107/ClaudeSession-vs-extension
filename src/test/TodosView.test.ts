import { describe, it, expect } from 'vitest';
import { buildTodosHtml, FlatTodo, ProjectTodoGroup } from '../TodosView';

function makeTodo(overrides: Partial<FlatTodo> = {}): FlatTodo {
  return {
    content: 'Write tests',
    status: 'pending',
    sessionId: 'sess-1',
    project: 'toolbox',
    ...overrides,
  };
}

describe('buildTodosHtml', () => {
  it('shows empty state when no groups provided', () => {
    const html = buildTodosHtml([]);
    expect(html).toContain('No active todos.');
  });

  it('shows project header for each group', () => {
    const groups: ProjectTodoGroup[] = [
      { project: 'gymbro', todos: [makeTodo({ project: 'gymbro' })] },
    ];
    const html = buildTodosHtml(groups);
    expect(html).toContain('gymbro');
  });

  it('renders todo content text', () => {
    const groups: ProjectTodoGroup[] = [
      { project: 'toolbox', todos: [makeTodo({ content: 'Fix the bug' })] },
    ];
    const html = buildTodosHtml(groups);
    expect(html).toContain('Fix the bug');
  });

  it('includes data-session-id on each todo row', () => {
    const groups: ProjectTodoGroup[] = [
      { project: 'toolbox', todos: [makeTodo({ sessionId: 'abc-123' })] },
    ];
    const html = buildTodosHtml(groups);
    expect(html).toContain('data-session-id="abc-123"');
  });

  it('marks in_progress rows with status-in_progress class', () => {
    const groups: ProjectTodoGroup[] = [
      { project: 'toolbox', todos: [makeTodo({ status: 'in_progress' })] },
    ];
    const html = buildTodosHtml(groups);
    expect(html).toContain('status-in_progress');
  });

  it('marks completed rows with status-completed class', () => {
    const groups: ProjectTodoGroup[] = [
      { project: 'toolbox', todos: [makeTodo({ status: 'completed' })] },
    ];
    const html = buildTodosHtml(groups);
    expect(html).toContain('status-completed');
  });

  it('escapes HTML-special characters in content', () => {
    const groups: ProjectTodoGroup[] = [
      { project: 'toolbox', todos: [makeTodo({ content: '<script>alert(1)</script>' })] },
    ];
    const html = buildTodosHtml(groups);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML-special characters in project name', () => {
    const groups: ProjectTodoGroup[] = [
      { project: '<evil>', todos: [makeTodo({ project: '<evil>' })] },
    ];
    const html = buildTodosHtml(groups);
    expect(html).not.toContain('<evil>');
    expect(html).toContain('&lt;evil&gt;');
  });

  it('renders multiple projects in order', () => {
    const groups: ProjectTodoGroup[] = [
      { project: 'alpha', todos: [makeTodo({ project: 'alpha' })] },
      { project: 'beta',  todos: [makeTodo({ project: 'beta' })] },
    ];
    const html = buildTodosHtml(groups);
    expect(html.indexOf('alpha')).toBeLessThan(html.indexOf('beta'));
  });

  it('includes focusSession postMessage in script', () => {
    const html = buildTodosHtml([
      { project: 'toolbox', todos: [makeTodo()] },
    ]);
    expect(html).toContain("command: 'focusSession'");
  });
});
