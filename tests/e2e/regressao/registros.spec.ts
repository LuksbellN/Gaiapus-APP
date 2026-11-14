// RT-12, RT-13, RT-15: propriedades, registros, rascunhos e conta.
import { test, expect, seedFarm, localState } from '../helpers';

test.describe('RT-12 propriedades e registros', () => {
  test('propriedade, talhões, quatro tipos de registro, editar e excluir com confirmação', async ({ page }) => {
    await seedFarm(page);
    await expect(page.getByText('Modo local.')).toBeVisible();
    await page.goto('/#/registros');
    for (const k of ['Plantio', 'Manejo ou evento', 'Colheita', 'Venda e custos']) await expect(page.getByRole('button', { name: k })).toBeVisible();
    await page.getByRole('button', { name: 'Colheita' }).click();
    await page.getByLabel('Data da colheita').fill('2026-03-10');
    await page.getByLabel('Quantidade colhida').fill('600');
    await page.getByLabel('Peso da saca (kg)').fill('60');
    await expect(page.getByText('kg/ha').first()).toBeVisible();
    await page.getByRole('button', { name: 'Salvar colheita' }).click();
    await expect(page.getByText('Colheita salvo.')).toBeVisible();
    await page.getByRole('button', { name: 'Abrir' }).first().click();
    await page.getByLabel('Quantidade colhida').fill('650');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByText('rev. 2')).toBeVisible();
    await page.getByRole('button', { name: 'Excluir' }).first().click();
    await expect(page.getByRole('dialog')).toContainText('não pode ser desfeita');
    await page.getByRole('button', { name: 'Excluir registro' }).click();
    expect((await localState(page)).records).toHaveLength(0);
  });

  test('plantio de café pede idade do cafezal', async ({ page }) => {
    await seedFarm(page);
    await page.goto('/#/registros?novo=plantio');
    await page.getByLabel('Cultura', { exact: true }).selectOption('Café arábica');
    await expect(page.getByLabel('Idade do cafezal (anos)')).toBeVisible();
  });
});

test.describe('RT-13 rascunhos', () => {
  test('rascunho volta depois de recarregar', async ({ page }) => {
    await seedFarm(page);
    await page.goto('/#/registros?novo=plantio');
    await page.getByLabel('Cultivar ou variedade').fill('CULTIVAR-A');
    await page.reload();
    await expect(page.getByLabel('Cultivar ou variedade')).toHaveValue('CULTIVAR-A');
  });

  test.fixme('D-06: trocar de talhão A → B → A recupera o rascunho de A sem recarregar', async ({ page }) => {
    await seedFarm(page);
    await page.goto('/#/registros?novo=plantio');
    await page.getByLabel('Cultivar ou variedade').fill('CULTIVAR-A');
    await page.locator('.page-head select').selectOption({ label: 'Talhão B' });
    await expect(page.getByLabel('Cultivar ou variedade')).toHaveValue('');
    await page.locator('.page-head select').selectOption({ label: 'Talhão A' });
    await expect(page.getByLabel('Cultivar ou variedade')).toHaveValue('CULTIVAR-A');
  });
});

test.describe('RT-15 conta', () => {
  test('telas de conta sem Supabase configurado: aviso, continuar sem conta e rotas', async ({ page }) => {
    await page.goto('/#/conta');
    await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible();
    await expect(page.getByText('Contas indisponíveis.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continuar sem conta' })).toBeVisible();
    await page.goto('/#/conta/cadastro');
    await expect(page.getByLabel('Seu nome')).toBeVisible();
    await page.goto('/#/conta/recuperar');
    await expect(page.getByLabel('E-mail da conta')).toBeVisible();
  });
});
