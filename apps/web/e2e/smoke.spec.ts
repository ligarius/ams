import { expect, test } from '@playwright/test';

const adminCredentials = {
  email: 'admin@example.com',
  password: 'Admin123!',
};

test.describe('approval workflow', () => {
  test('allows creating and updating an approval', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Correo electrónico').fill(adminCredentials.email);
    await page.getByLabel('Contraseña').fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await page.waitForURL('**/dashboard');

    const project = await page.evaluate(async () => {
      const companiesResponse = await fetch('/api/companies', { method: 'GET' });
      if (!companiesResponse.ok) {
        throw new Error('Failed to load companies');
      }
      const companies = await companiesResponse.json();
      if (!Array.isArray(companies) || companies.length === 0) {
        throw new Error('No companies available');
      }
      const companyId = companies[0].id;
      const uniqueName = `Proyecto aprobaciones ${Date.now()}`;
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          name: uniqueName,
          description: 'Proyecto generado desde pruebas end-to-end',
        }),
      });
      if (!projectResponse.ok) {
        const errorBody = await projectResponse.json().catch(() => null);
        throw new Error(errorBody?.message ?? 'Failed to create project');
      }
      const createdProject = await projectResponse.json();
      return createdProject;
    });

    await page.goto('/approvals');
    await expect(page.getByRole('heading', { name: 'Control de cambios y firmas clave' })).toBeVisible();

    const approvalTitle = 'Cambio de alcance automatizado';

    await page.getByLabel('Proyecto').click();
    await page.getByRole('option', { name: project.name }).click();
    await page.fill('#approval-title', approvalTitle);
    await page.fill('#approval-description', 'Validamos el cambio solicitado por el cliente.');
    await page.fill('#approval-template', 'template-123');
    await page.fill('#approval-signer-name', 'María Firmas');
    await page.fill('#approval-signer-email', 'maria.firmas@example.com');
    await page.fill('#approval-redirect', 'https://example.com/firma-exitosa');
    await page.getByRole('button', { name: 'Enviar aprobación' }).click();

    await expect(page.getByTestId('approval-form-feedback-success')).toHaveText(
      'Aprobación registrada correctamente.'
    );

    const pendingSection = page.getByTestId('pending-approvals');
    await expect(pendingSection.getByText(approvalTitle)).toBeVisible();

    await pendingSection.getByRole('button', { name: 'Rechazar' }).click();

    await expect(page.getByTestId('approval-feedback-success')).toHaveText('Aprobación rechazada correctamente.');
    await expect(pendingSection.getByText(approvalTitle)).toHaveCount(0);

    const recentSection = page.getByTestId('recent-approvals');
    await expect(recentSection.getByText(approvalTitle)).toBeVisible();
    await expect(recentSection.getByText('Rechazada')).toBeVisible();
  });
});
