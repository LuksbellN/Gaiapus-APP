// RT-20, RT-22, RT-25: language switch keeps route and data, persists, works on auth routes and long texts fit.
import { test, expect, seedFarm, localState, type Page } from '../helpers';
import { NO_FIRST_RUN } from '../helpers';

const pick = (page: Page) => page.locator('[data-testid="language-select"]:visible').first();
const prefsWith = (locale: string) => `localStorage.setItem('gaiapus.prefs', JSON.stringify({ v: 1, locale: ${JSON.stringify(locale)} }))`;

test.describe('RT-20 troca de idioma', () => {
  test('mantém rota, consulta e dados locais; persiste ao recarregar', async ({ page, errors }) => {
    await seedFarm(page);
    await page.goto('/#/registros?talhao=x');
    await expect(page.getByRole('heading', { level: 1, name: 'Registros da safra' })).toBeVisible();
    const before = await localState(page);
    const url = page.url();
    await pick(page).selectOption('en');
    await expect(page.getByRole('heading', { level: 1, name: 'Crop season records' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(page.url()).toBe(url);
    expect(await localState(page)).toEqual(before);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Crop season records' })).toBeVisible();
    for (const l of ['es', 'fr', 'de']) {
      await pick(page).selectOption(l);
      await expect(page.locator('html')).toHaveAttribute('lang', l);
      await expect(page.getByRole('heading', { level: 1, name: 'Crop season records' })).toHaveCount(0);
    }
    expect(page.url()).toBe(url);
    expect(errors).toEqual([]);
  });

  test('sem preferência, o idioma vem do navegador; preferência salva vence', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'fr-FR' }); await ctx.addInitScript(NO_FIRST_RUN);
    const page = await ctx.newPage();
    await page.goto('/#/conta');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await page.evaluate(prefsWith('en'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await ctx.close();
  });
});

test.describe('RT-22 rotas de autenticação', () => {
  for (const [path, title] of [['/auth/callback', 'Confirm email'], ['/auth/recovery', 'Recover access']] as const) {
    test(`${path} em inglês, sem perder a rota`, async ({ page }) => {
      await page.addInitScript(prefsWith('en'));
      await page.goto(path + '?code=abc');
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      // Code removed from history; path kept.
      await expect.poll(() => new URL(page.url()).pathname).toBe(path);
      expect(new URL(page.url()).search).toBe('');
      await pick(page).selectOption('pt-BR');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(path.endsWith('recovery') ? 'Recuperar acesso' : 'Confirmar e-mail');
    });
  }
});

test.describe('RT-25 textos longos', () => {
  const ROUTES = ['/explorar?semwebgl=1', '/visao-geral', '/planejar', '/simulador', '/field-shift', '/registros', '/conta', '/ajuda'];
  for (const locale of ['de', 'fr']) {
    for (const width of [320, 768, 1440]) {
      test(`${locale} em ${width}px sem rolagem horizontal`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await seedFarm(page);
        await page.evaluate(prefsWith(locale));
        await page.reload();
        const wide: string[] = [];
        for (const r of ROUTES) {
          await page.goto('/#' + r);
          await expect(page.locator('html')).toHaveAttribute('lang', locale);
          await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
          const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          if (over > 1) wide.push(`${r}: +${over}px`);
        }
        expect(wide).toEqual([]);
      });
    }
  }
});
