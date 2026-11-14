// Shared helpers for the regression suite. Every test runs in a fresh, empty browser context.
import { test as base, expect, type Page } from '../../apps/web/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../../apps/web/node_modules/@axe-core/playwright/dist/index.mjs';

export { expect };
export type { Page };

/** Console errors and page errors collected per test; asserted empty where noted. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await use(errors);
  },
});

export const MOBILE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } as const;

/** Creates one property in the given municipality with two plots through the real UI. */
export async function seedFarm(page: Page, mun = { code: '3170206', name: 'Uberlândia', uf: 'MG' }) {
  await page.goto(`/#/propriedades?mun=${mun.code}&nome=${encodeURIComponent(mun.name)}&uf=${mun.uf}`);
  await page.getByLabel('Nome da propriedade').fill('Sítio Teste');
  await page.getByRole('button', { name: 'Salvar propriedade' }).click();
  await expect(page.getByText('Propriedade "Sítio Teste" salva', { exact: false })).toBeVisible();
  for (const [name, area] of [['Talhão A', '12,5'], ['Talhão B', '30']]) {
    await page.getByLabel('Nome do talhão').fill(name);
    await page.getByLabel('Área (ha)', { exact: true }).fill(area);
    await page.getByRole('button', { name: 'Salvar talhão' }).click();
    await expect(page.getByText(`Talhão "${name}" salvo`)).toBeVisible();
  }
}

/** Reads the active local bucket (guest) without depending on internal modules. */
export const localState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gaiapus.v1.guest') ?? '{}'));

/** axe-core scan of the main content; returns violations at serious/critical impact. */
export async function seriousViolations(page: Page) {
  const r = await new AxeBuilder({ page }).include('#root').disableRules(['region']).analyze();
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}
