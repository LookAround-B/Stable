import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..', '..');

describe('stable operation read/write permission wiring', () => {
  it('publishes the stable operation permission catalog from the backend role defaults API', () => {
    const roleDefaultsPath = path.join(repoRoot, 'backend', 'src', 'pages', 'api', 'permissions', 'role-defaults.ts');
    const rolesPath = path.join(repoRoot, 'backend', 'src', 'lib', 'roles-prd.ts');
    const roleDefaultsSource = fs.readFileSync(roleDefaultsPath, 'utf8');
    const rolesSource = fs.readFileSync(rolesPath, 'utf8');

    expect(rolesSource).toContain('feed_inventory_read');
    expect(rolesSource).toContain('feed_inventory_write');
    expect(rolesSource).toContain('medicine_inventory_read');
    expect(rolesSource).toContain('grass_bedding_write');
    expect(rolesSource).toContain('export const ALL_TASK_PERMISSIONS');
    expect(roleDefaultsSource).toContain('availableTaskPermissions: ALL_TASK_PERMISSIONS');
  });

  it('uses the available task permission catalog in the permissions page and stable page guards', () => {
    const permissionsPagePath = path.join(repoRoot, 'frontend', 'src', 'pages', 'PermissionsPage.js');
    const hookPath = path.join(repoRoot, 'frontend', 'src', 'hooks', 'usePermissions.js');
    const permissionsPageSource = fs.readFileSync(permissionsPagePath, 'utf8');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    expect(permissionsPageSource).toContain('const [availableTaskPermissions, setAvailableTaskPermissions] = useState([]);');
    expect(permissionsPageSource).toContain('setAvailableTaskPermissions(roleRes.data?.data?.availableTaskPermissions || []);');
    expect(permissionsPageSource).toContain('...availableTaskPermissions,');

    expect(hookSource).toContain('canWriteFeedInventory');
    expect(hookSource).toContain('canWriteMedicineInventory');
    expect(hookSource).toContain('canWriteFarrierInventory');
    expect(hookSource).toContain('canWriteTackInventory');
    expect(hookSource).toContain('canWriteGrassAndBedding');
    expect(hookSource).toContain('canWriteHousekeepingInventory');
  });
});
