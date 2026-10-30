const {test, expect} = require('@playwright/test');

function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

async function createIsolatedBook(page) {
  page.once('dialog', dialog => dialog.accept('自动化测试账本'));
  await page.locator('#newBook').click();
  await expect(page.locator('#status')).toContainText('自动化测试账本');
}

test('R01 cold Home shows the first-use flow without script errors', async ({page}) => {
  const errors = collectPageErrors(page);
  await page.goto('/');
  await expect(page.locator('#pageBody')).toBeVisible();
  await expect(page.getByRole('heading', {name: '开始使用星账本'})).toBeVisible();
  await expect(page.locator('#mobileNav button[data-go="home"]')).toHaveClass(/active/);
  expect(errors).toEqual([]);
});

test('R02 Home, month, books and back remain navigable', async ({page}) => {
  const errors = collectPageErrors(page);
  await page.goto('/');
  await createIsolatedBook(page);
  await page.locator('#mobileNav button[data-go="stats"]').click();
  await expect(page.getByRole('heading', {name: '每日收支'})).toBeVisible();
  await expect(page.locator('#mobileNav button[data-go="stats"]')).toHaveClass(/active/);
  await page.locator('#mobileNav button[data-go="books"]').click();
  await expect(page.getByRole('heading', {name: /^账本 · /})).toBeVisible();
  await expect(page.locator('#mobileNav button[data-go="books"]')).toHaveClass(/active/);
  await page.locator('#mobileNav button[data-go="home"]').click();
  // Swipe snapshots temporarily clone #title; assert against the live page.
  await expect(page.locator('.shell > main > #pageViewport > #content > #pageBody')).toContainText('最近账单');
  await expect(page.locator('#mobileNav button[data-go="home"]')).toHaveClass(/active/);
  expect(errors).toEqual([]);
});

test('R03 search filter closes, clears its overlay and can reopen', async ({page}) => {
  const errors = collectPageErrors(page);
  await page.goto('/');
  await createIsolatedBook(page);
  await page.locator('#mobileNav button[data-go="search"]').click();
  await page.locator('#openSearchFilters').click();
  await expect(page.locator('.search-filter-sheet')).toBeVisible();
  await page.locator('.search-filter-sheet [data-searchset="kind"][data-searchvalue="支出"]').click();
  await expect(page.locator('.search-filter-sheet [data-searchset="kind"][data-searchvalue="支出"]')).toHaveClass(/active/);
  await page.locator('.search-filter-sheet #closeBtn2').click();
  await expect(page.locator('.search-filter-sheet')).toHaveCount(0);
  await expect(page.locator('#query')).toBeVisible();
  await page.locator('#openSearchFilters').click();
  await expect(page.locator('.search-filter-sheet [data-searchset="kind"][data-searchvalue="支出"]')).toHaveClass(/active/);
  await page.locator('.search-filter-sheet #closeBtn').click();
  await expect(page.locator('.search-filter-sheet')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('R04 entry opens, keypad collapses and closing restores navigation', async ({page}) => {
  const errors = collectPageErrors(page);
  await page.goto('/');
  await createIsolatedBook(page);
  await page.locator('#addBtn').click();
  await expect(page.locator('#entry')).toBeVisible();
  await expect(page.locator('#mobileNav')).toHaveCSS('display', 'none');
  await expect(page.locator('[data-key="保存账单"]')).toHaveText('保存');
  await page.locator('[data-key="收起"]').click();
  await expect(page.locator('.entryback')).toHaveClass(/keypad-hidden/);
  await page.locator('.entry-amount-value').click();
  await expect(page.locator('.entryback')).not.toHaveClass(/keypad-hidden/);
  await page.locator('.entryback #closeBtn').click();
  await expect(page.locator('.entryback')).toHaveCount(0);
  await expect(page.locator('#mobileNav')).toHaveCSS('display', 'grid');
  expect(errors).toEqual([]);
});
