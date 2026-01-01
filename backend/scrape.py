import re
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright

def scrape_olx_data(url: str) -> dict:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            response = page.goto(url, wait_until="commit")
            html = response.text() if response else page.content()

            try:
                page.wait_for_selector('[data-testid="ad-price-container"]', timeout=8000)
                price_text = page.locator('[data-testid="ad-price-container"] h3').first.inner_text()
                price = "".join(filter(str.isdigit, price_text)) or None
            except PlaywrightTimeoutError:
                price = None

            lat = None
            lon = None
            for pattern in [r"lat[\"']?\s*[:=]\s*([-\d.]+)", r"lat[\"\\]+:([\d.]+)"]:
                match = re.search(pattern, html, flags=re.IGNORECASE)
                if match:
                    lat = match.group(1)
                    break
            for pattern in [r"lon[\"']?\s*[:=]\s*([-\d.]+)", r"lon[\"\\]+:([\d.]+)"]:
                match = re.search(pattern, html, flags=re.IGNORECASE)
                if match:
                    lon = match.group(1)
                    break

            return {"price_pln": price, "lat": lat, "lon": lon}
        finally:
            browser.close()
