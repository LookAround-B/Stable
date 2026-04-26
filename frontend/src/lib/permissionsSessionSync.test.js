import fs from 'fs';
import path from 'path';

describe('permissions session sync', () => {
  it('syncs auth state across tabs and blocks the permissions page for non-admin users', () => {
    const authContextSource = fs.readFileSync(
      path.join(__dirname, '..', 'context', 'AuthContext.js'),
      'utf8'
    );
    const permissionsPageSource = fs.readFileSync(
      path.join(__dirname, '..', 'pages', 'PermissionsPage.js'),
      'utf8'
    );

    expect(authContextSource).toContain("window.addEventListener('storage'");
    expect(authContextSource).toContain("event.key === 'token' || event.key === 'user'");
    expect(permissionsPageSource).toContain('const ADMIN_ROLES =');
    expect(permissionsPageSource).toContain('const isAdmin = ADMIN_ROLES.includes(user?.designation);');
    expect(permissionsPageSource).toContain('<Navigate to="/dashboard" replace />');
  });
});
