// Planejamento da safra 2027/2028: execução calculada e publicada, servida pela API real (sem fixture do frontend).
import { test, expect } from '../helpers';

test.describe('Simulador · planejamento 2027/2028', () => {
  test('Uberlândia soja 2027 abre a execução publicada; trajetória e ano atualizam cena e painel', async ({ page, errors }) => {
    await page.goto('/#/simulador?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
    await expect(page.getByRole('heading', { level: 1, name: /Soja em Uberlândia/ })).toBeVisible();
    const p = page.getByTestId('profile-2d');
    await expect(p).toHaveAttribute('data-date', '2026-11-05');
    await expect(page.getByTestId('planning-day')).toContainText('dia 1 do ciclo');
    await expect(page.getByTestId('planning-run')).toContainText('sim_');
    await page.getByRole('radio', { name: '2028' }).check();
    await expect(p).toHaveAttribute('data-date', '2027-11-05');
    await expect(page.getByTestId('planning-season')).toContainText('2027/2028');
    expect(errors).toEqual([]);
  });
  test('cultura sem motor explica o motivo; a demonstração antiga continua acessível', async ({ page }) => {
    await page.goto('/#/simulador?modo=planejamento&mun=3170206&cultura=coffee_arabica');
    await expect(page.getByTestId('planning-unavailable')).toContainText('perene');
    await page.goto('/#/simulador'); await page.reload();
    await expect(page.getByTestId('open-planning')).toBeVisible();
  });
});
