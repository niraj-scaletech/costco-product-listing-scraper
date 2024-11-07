import { Page } from "puppeteer-extra-plugin/dist/puppeteer";
import { apikey, sequence_id, showBrowser } from "./config";

import { browser } from "@crawlora/browser";

export default async function ({
  searches,
}: {
  searches: string;
}) {
  const formedData = searches.trim().split("\n").map(v => v.trim())

  await browser(async ({ page, wait, output, debug }) => {
    for await (const keyword of formedData) {
      let allProducts = [];

      await page.goto(`https://www.costco.com`, { waitUntil: 'networkidle2' });
      await wait(2)

      await page.waitForSelector('input[aria-label="Search Costco"]', { timeout: 60000 });
      await page.click('input[aria-label="Search Costco"]');
      await page.keyboard.type(keyword, { delay: 100 });
      await wait(2)

      await page.click('button[data-testid="SearchButton"]');
      await wait(3)

      debug("Page loaded successfully.");

      let hasNextPage = true;
      while (hasNextPage) {
        const products = await getProductsDetail(page);
        debug(`Found ${products.length} products.`);

        allProducts.push(...products)

        hasNextPage = await getNextButton(page, wait, debug);
      }

      console.log("🚀 ~ forawait ~ allProducts:", allProducts, allProducts.length);

      await wait(2000)

    }

  }, { showBrowser, apikey })

}

async function getNextButton(page: Page, wait: any, debug: debug.Debugger): Promise<boolean> {
  // Wait for the pagination container to load
  await page.waitForSelector('.MuiPagination-ul', { timeout: 20000 });

  // Get all buttons within the pagination container
  const paginationButtons = await page.$$('.MuiPagination-ul > li > button');

  if (paginationButtons.length === 0) {
    debug('No pagination buttons found.');
    return false;
  }

  // Select the last button (usually "Next" button in pagination)
  const nextButton = paginationButtons[paginationButtons.length - 1];

  // Check if it’s a "Next" button and not disabled
  const isDisabled = await nextButton.evaluate(button => button.disabled);
  if (isDisabled) {
    debug('Next button is disabled. No more pages available.');
    return false;
  }

  // Click the next button and wait
  await nextButton.click();
  await wait(2);
  debug('Navigated to the next page.');

  return true;

}


async function getProductsDetail(page: Page) {
  return await page.evaluate(() => {
    const productElements = Array.from(document.querySelectorAll('.MuiGrid2-root div[data-testid="Grid"]')) || [];

    return productElements.map(product => ({
      title: product.querySelector('a span')?.textContent?.trim() || 'N/A',
      price: product.querySelector('[data-testid^="Text_Price"]')?.textContent?.trim() || 'N/A',
    })).filter(product => product.title !== 'N/A');
  });
}
