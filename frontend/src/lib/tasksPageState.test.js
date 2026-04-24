import { getInitialTasksPageState } from './tasksPageState';

describe('getInitialTasksPageState', () => {
  it('shows the full skeleton only before any task data has been cached', () => {
    expect(getInitialTasksPageState(null)).toEqual({
      tasks: [],
      pageLoading: true,
    });
  });

  it('keeps existing task content visible on revisit while refresh happens in the background', () => {
    const cachedTasks = [{ id: 'task-1', name: 'Arena clean-up' }];

    expect(getInitialTasksPageState(cachedTasks)).toEqual({
      tasks: cachedTasks,
      pageLoading: false,
    });
  });
});
