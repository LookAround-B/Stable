export const filterTaskPermissions = (permissions, tab, searchQuery) => {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase();

  return permissions.filter((permission) => {
    if (tab === 'write' && !permission.key.endsWith('_write')) {
      return false;
    }

    if (tab === 'read' && !permission.key.endsWith('_read')) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = `${permission.label} ${permission.key}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
};
