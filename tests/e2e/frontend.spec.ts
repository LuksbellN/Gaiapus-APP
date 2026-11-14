import {
  test,
  expect,
} from "../../apps/web/node_modules/@playwright/test/index.mjs";
import path from "node:path";
const evidence = path.resolve(process.cwd(), "design", "verification");

test("reference layout, real assets, day selection and sources at laptop size", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Balanço hídrico" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Milho safrinha.*retrospectivo/ }),
  ).toBeVisible();
  await expect(page.locator(".conditions-content")).not.toContainText("—");
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page
        .locator(".illustrated-earth")
        .evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBeGreaterThan(500);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(evidence, "desktop-1366.png"),
    fullPage: true,
  });
  const days = page.locator(".day-card");
  await days.nth(1).click();
  await expect(days.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/date=/);
  const previousDateUrl = page.url();
  await days.nth(2).click();
  await page.goBack();
  await expect(page).toHaveURL(previousDateUrl);
  await expect(days.nth(1)).toHaveAttribute("aria-pressed", "true");
  await page.goForward();
  await expect(days.nth(2)).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Ver valores em tabela" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Ver origem", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("não medições ao vivo");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("published crop analysis, location switching and unsupported water state", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Milho safrinha.*retrospectivo/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("safra 2021");
  await expect(page.getByRole("dialog")).toContainText("kg/ha");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Buscar um local/ }).click();
  await page
    .getByRole("textbox", { name: "Buscar município ou região" })
    .fill("uberlandia");
  await page.getByRole("button", { name: /Uberlândia.*Município/ }).click();
  await expect(page.locator(".location-select")).toContainText("Uberlândia");
  await expect(page.locator(".day-list")).toContainText(
    "Não há projeção hídrica publicada",
  );
  await page.getByRole("button", { name: /Soja.*primeiro corte/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Ainda sem estimativa");
  await expect(page.getByRole("dialog")).not.toContainText("0 kg/ha");
});

test("mobile composition, menu, keyboard search and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".crop-featured")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(evidence, "mobile-390.png"),
    fullPage: true,
  });
  await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sobre", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sobre", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "primeira estrutura de frontend",
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("textbox", { name: "Buscar município ou região" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page.getByRole("dialog")).toContainText("próxima etapa");
});

test("actual geographic map loads without replacing evidence context", async ({
  page,
}) => {
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error")
      console.log("map browser:", message.text());
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await expect(page.locator(".crop-featured")).toBeVisible();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator(".map-message")).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator(".location-select")).toContainText("Sorriso");
  await page.screenshot({
    path: path.join(evidence, "geography-map.png"),
    fullPage: true,
  });
});
