/* Run against an isolated local DB populated by backend.import_learning_tests. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const base = process.env.MOSPHYSICS_BROWSER_URL;
if (!base || !["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname)) {
  throw new Error("Set MOSPHYSICS_BROWSER_URL to an isolated localhost server");
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"]) {
        await page.goto(base + "/tests");
        await page.evaluate(theme => localStorage.setItem("mosphysics-theme", theme), theme);
        for (const route of ["/tests", "/test?kind=physics", "/test?kind=fun", "/quotes", "/ege"]) {
          await page.goto(base + route);
          if (route === "/ege") await page.locator("[data-ege] article").first().waitFor();
          else await page.locator("[data-tests] .card, [data-test] .card").first().waitFor();
          assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${route}: overflow at ${width} ${theme}`);
        }
      }
    }
    const cases = [
      ["/test?kind=physics", 0, [2, 1, 1, 2, 2]],
      ["/test?kind=physics", 1, [1, 1, 0, 2, 1]],
      ["/test?kind=fun", 0, [0, 1, 2, 2, 0]],
      ["/quotes", 0, [1, 0, 2, 1, 2]],
    ];
    for (const [route, item, answers] of cases) {
      await page.goto(base + route);
      await page.locator("[data-tests] .card, [data-test] .card").nth(item).click();
      await page.locator("fieldset").first().waitFor();
      await page.getByRole("button", { name: "Отправить ответы" }).click();
      await page.getByText("Ответьте на все вопросы, прежде чем отправлять.").waitFor();
      for (const [index, answer] of answers.entries()) {
        await page.locator("fieldset").nth(index).locator("input").nth(answer).check();
      }
      await page.getByRole("button", { name: "Отправить ответы" }).click();
      await page.getByText("Верных ответов: 5 из 5 (100%).").waitFor();
      assert.equal(await page.locator('[aria-label="Результат и разбор ответов"] article').count(), 5);
      await page.getByRole("button", { name: "Пройти ещё раз" }).click();
      await page.locator("fieldset input:enabled").first().waitFor();
      assert.equal(await page.locator("fieldset input:checked").count(), 0);
    }
    await page.goto(base + "/ege");
    await page.locator("[data-ege] article").first().waitFor();
    const tasks = page.locator("[data-ege] article");
    assert.equal(await tasks.count(), 10);
    const first = tasks.first();
    await first.locator("input").fill("4");
    await first.locator("button").click();
    await first.getByText("Пока неверно.", { exact: false }).waitFor();
    await first.locator("input").fill("3,0");
    await first.locator("input").press("Enter");
    await first.getByText("Верно!", { exact: true }).waitFor();
    await page.route("**/api/ege/submit", route => route.abort());
    await first.locator("input").fill("3");
    await first.locator("button").click();
    await first.getByText("Ответ не проверен.", { exact: false }).waitFor();
    assert.equal(await first.locator("input").inputValue(), "3");
    assert(await first.locator("button").isEnabled());
    await page.unroute("**/api/ege/submit");
    for (const [index, answer] of ["3", "2", "2", "9", "40", "5000", "8400", "6", "4", "50"].entries()) {
      const task = tasks.nth(index);
      await task.locator("input").fill(answer);
      await task.locator("input").press("Enter");
      await task.getByText("Верно!", { exact: true }).waitFor();
    }
    assert.deepEqual(errors, []);
    console.log("Learning browser scenarios passed");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
