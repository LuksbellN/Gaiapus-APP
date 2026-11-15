// Integração Lara, etapa 8: vista "Perfil do solo" sobre os dados publicados, sem recálculo.
import { test, expect, type Page } from '../helpers';

const dayCard = (page: Page) => page.getByRole('complementary', { name: /Indicadores|Indicators/ }).locator('.card').first();

test.describe('Simulador · perfil do solo', () => {
  test('alternar Talhão/Perfil não muda números; o link guarda a vista; 3D carrega', async ({ page, errors }) => {
    await page.goto('/#/simulador?dia=120');
    await expect(page.getByRole('radio', { name: 'Talhão' })).toBeChecked();
    const before = await dayCard(page).textContent();
    await page.getByText('Perfil do solo', { exact: true }).first().click();
    await expect(page).toHaveURL(/vista=perfil/);
    await expect(page.locator('.sim__stage canvas')).toBeVisible();
    expect(await dayCard(page).textContent()).toBe(before);
    await expect(page.getByTestId('profile-notes')).toContainText('único reservatório');
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Perfil do solo' })).toBeChecked();
    expect(errors).toEqual([]);
  });

  test('sem WebGL o perfil 2D mostra o mesmo dia, sem raízes nem sondas', async ({ page }) => {
    await page.goto('/#/simulador?vista=perfil&dia=60&semwebgl=1');
    const p = page.getByTestId('profile-2d');
    await expect(p).toBeVisible();
    await expect(p).toHaveAttribute('data-date', '2020-12-03');
    await expect(p.getByTestId('roots')).toHaveCount(0);
    await expect(p.getByTestId('probe')).toHaveCount(0);
  });

  test('trocar o idioma mantém a vista e os números do dia', async ({ page }) => {
    await page.goto('/#/simulador?vista=perfil&dia=120&semwebgl=1');
    const water = await page.getByTestId('profile-2d').getAttribute('data-water');
    await page.locator('[data-testid="language-select"]:visible').first().selectOption('en');
    await expect(page.getByRole('radio', { name: 'Soil profile' })).toBeChecked();
    await expect(page.getByTestId('profile-2d')).toHaveAttribute('data-water', water!);
  });
});

test.describe('Simulador · estaca Gaiapus', () => {
  test('estaca aparece por padrão no perfil, pode ser desligada e o link guarda a escolha', async ({ page }) => {
    await page.goto('/#/simulador?vista=perfil&dia=60&semwebgl=1');
    const p = page.getByTestId('profile-2d');
    await expect(p.getByTestId('device')).toBeVisible();
    await expect(p.getByTestId('electrode')).toHaveCount(2);
    await expect(p.getByTestId('ruler-tick')).toHaveCount(5);
    await page.getByRole('checkbox', { name: 'Mostrar a estaca Gaiapus' }).uncheck();
    await expect(page).toHaveURL(/estaca=0/);
    await expect(p.getByTestId('device')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Mostrar a estaca Gaiapus' })).not.toBeChecked();
  });
  test('LED apagado no pousio de solo exposto (sem cultura, sem estresse de planta)', async ({ page }) => {
    await page.goto('/#/simulador?vista=perfil&dia=273&semwebgl=1');
    await expect(page.getByTestId('led')).toHaveAttribute('data-led', '0');
  });
});
