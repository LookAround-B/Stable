import fs from 'fs';
import path from 'path';
import { filterTaskPermissions } from './permissionsTaskFilters';

describe('permissions task filters', () => {
  const permissions = [
    { key: 'feed_inventory_read', label: 'Feed Inventory Read' },
    { key: 'feed_inventory_write', label: 'Feed Inventory Write' },
    { key: 'medicine_logs_approve', label: 'Medicine Logs Approve' },
  ];

  it('keeps all operational permissions in the ALL tab', () => {
    expect(filterTaskPermissions(permissions, 'all', '')).toEqual(permissions);
  });

  it('shows only write permissions in the WRITE tab', () => {
    expect(filterTaskPermissions(permissions, 'write', '')).toEqual([
      permissions[1],
    ]);
  });

  it('shows only read permissions in the READ tab', () => {
    expect(filterTaskPermissions(permissions, 'read', '')).toEqual([
      permissions[0],
    ]);
  });

  it('filters by search text across labels and keys', () => {
    expect(filterTaskPermissions(permissions, 'all', 'approve')).toEqual([
      permissions[2],
    ]);
    expect(filterTaskPermissions(permissions, 'all', 'feed_inventory')).toEqual([
      permissions[0],
      permissions[1],
    ]);
  });

  it('renders tabs and a search input on the permissions page', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'pages', 'PermissionsPage.js'),
      'utf8'
    );
    const cssSource = fs.readFileSync(
      path.join(__dirname, '..', 'styles', 'global.css'),
      'utf8'
    );

    expect(source).toContain("['all', 'write', 'read']");
    expect(source).toContain('Search operational permissions');
    expect(source).toContain('filterTaskPermissions(');
    expect(source).toContain('inline-flex h-9');
    expect(source).toContain('perm-task-filter-search');
    expect(cssSource).toContain('.perm-task-filter-search');
    expect(cssSource).toContain('height: 32px !important;');
    expect(cssSource).toContain('max-width: 220px;');
  });
});
