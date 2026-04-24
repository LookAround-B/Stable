export const getInitialTasksPageState = (cachedTasks) => ({
  tasks: Array.isArray(cachedTasks) ? cachedTasks : [],
  pageLoading: !Array.isArray(cachedTasks),
});
