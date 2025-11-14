"""
메르카리 웹 크롤러
- URL을 받아 제목/설명/가격(원화)/배송비/카테고리/이미지 목록을 추출
- 최종적으로 crawl(url) 함수가 아래 키로 dict를 반환:
  {
    "productName": str | None,
    "description": str | None,
    "priceKRW": int | None,
    "hasShippingFee": bool | None,
    "categories": list[str],
    "images": list[str],
    "isSoldOut": bool | None
  }
"""

import time
import re
import json
from typing import Dict, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


class MercariCrawler:
    """메르카리 상품 정보 크롤러"""

    def __init__(self, headless: bool = True):
        self.headless = headless
        self.driver = None

    def _setup_driver(self):
        """Selenium WebDriver 설정"""
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )

        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)

    def crawl_raw(self, url: str) -> Optional[Dict]:
        """
        메르카리 상품 페이지에서 '원본(raw)' 정보를 추출해서 반환
        """
        if self.driver is None:
            self._setup_driver()

        try:
            self.driver.get(url)
            wait = WebDriverWait(self.driver, 15)
            time.sleep(2)  # 동적 로딩 대기

            product_info = {
                "url": url,
                "title": None,
                "description": None,
                "price": None,
                "shipping_included": None,
                "isSoldOut": None,
                "categories": [],
                "images": [],
            }

            # 1) 제목
            try:
                title_element = wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "h1.heading__a7d91561"))
                )
                product_info["title"] = (title_element.text or "").strip()
            except Exception:
                try:
                    title_element = self.driver.find_element(By.TAG_NAME, "h1")
                    product_info["title"] = (title_element.text or "").strip()
                except Exception:
                    pass

            # 2) 설명
            try:
                desc_element = self.driver.find_element(
                    By.CSS_SELECTOR, 'pre[data-testid="description"]'
                )
                product_info["description"] = (desc_element.text or "").strip()
            except Exception:
                # 폴백 셀렉터들
                for selector in ("pre.merText", "section pre", 'div[class*="description"] pre'):
                    try:
                        de = self.driver.find_element(By.CSS_SELECTOR, selector)
                        txt = (de.text or "").strip()
                        if txt:
                            product_info["description"] = txt
                            break
                    except Exception:
                        continue

            # 3) 가격(숫자만)
            try:
                price_selectors = [
                    'p.merText.body__5616e150.primary__5616e150',
                    'p[class*="body__"][class*="primary__"]',
                    'span[class*="price"]',
                    'div[class*="price"] p',
                ]
                for selector in price_selectors:
                    try:
                        elems = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for el in elems:
                            t = (el.text or "").strip()
                            if re.match(r"^[\d,]+$", t):  # 쉼표 포함 숫자만
                                product_info["price"] = int(t.replace(",", ""))
                                break
                        if product_info["price"]:
                            break
                    except Exception:
                        continue
            except Exception:
                pass

            # 4) 배송비 포함 여부 텍스트 → Bool
            try:
                shipping_selectors = [
                    'p.merText.caption__5616e150',
                    'p[class*="caption__"]',
                    'div[class*="shipping"] p',
                ]
                shipping_text = ""
                for selector in shipping_selectors:
                    try:
                        elems = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for el in elems:
                            text = (el.text or "").strip()
                            if "送料" in text:
                                shipping_text = text
                                break
                        if shipping_text:
                            break
                    except Exception:
                        continue

                if ("送料込み" in shipping_text) or ("送料無料" in shipping_text):
                    product_info["shipping_included"] = True
                elif ("送料別" in shipping_text) or ("着払い" in shipping_text):
                    product_info["shipping_included"] = False
                else:
                    product_info["shipping_included"] = None
            except Exception:
                pass

            # 5) 이미지
            try:
                image_urls = set()
                th_selectors = [
                    'div[data-testid^="imageThumbnail-"] img',
                    'div[class*="itemThumbnail"] img',
                    'div[class*="carousel"] img',
                    "figure img",
                ]
                for selector in th_selectors:
                    try:
                        imgs = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for img in imgs:
                            src = img.get_attribute("src")
                            if src and "mercdn.net/item/detail" in src and "/photos/" in src:
                                image_urls.add(src)
                        if image_urls:
                            break
                    except Exception:
                        continue

                # 폴백
                if not image_urls:
                    try:
                        all_imgs = self.driver.find_elements(By.TAG_NAME, "img")
                        for img in all_imgs:
                            src = img.get_attribute("src")
                            if src and "mercdn.net/item/detail" in src and "/photos/" in src:
                                image_urls.add(src)
                    except Exception:
                        pass

                product_info["images"] = list(image_urls)
            except Exception:
                pass

            # 6) 카테고리 경로
            try:
                categories = []

                # 6-1) ld+json BreadcrumbList
                try:
                    scripts = self.driver.find_elements(
                        By.CSS_SELECTOR, 'script[type="application/ld+json"]'
                    )

                    def pick_names_from_breadcrumb(obj):
                        names = []
                        for it in obj.get("itemListElement", []):
                            name = (it.get("name") or "").strip()
                            if not name:
                                continue
                            names.append(name)
                        return names

                    for s in scripts:
                        raw = s.get_attribute("textContent") or ""
                        if not raw.strip():
                            continue
                        try:
                            data = json.loads(raw)
                        except Exception:
                            continue

                        candidates = []
                        if isinstance(data, dict):
                            candidates.append(data)
                            if isinstance(data.get("@graph"), list):
                                candidates.extend(data["@graph"])
                        elif isinstance(data, list):
                            candidates.extend(data)

                        for obj in candidates:
                            if isinstance(obj, dict) and obj.get("@type") == "BreadcrumbList":
                                names = pick_names_from_breadcrumb(obj)
                                if names:
                                    categories = names
                                    break
                        if categories:
                            break
                except Exception:
                    pass

                product_info["categories"] = categories or []
            except Exception:
                pass

            # 7) 품절 여부 - 썸네일 스티커 기반 정확 판정
            try:
                html = self.driver.page_source

                # 품절 상품에만 등장하는 썸네일 스티커:
                # <div data-testid="thumbnail-sticker" ... aria-label="売り切れ">
                soldout_pattern = r'data-testid="thumbnail-sticker"[^>]*aria-label="売り切れ"'
                if re.search(soldout_pattern, html):
                    product_info["isSoldOut"] = True
                else:
                    product_info["isSoldOut"] = False

            except Exception:
                product_info["isSoldOut"] = False

            return product_info

        except Exception:
            return None

    def close(self):
        if self.driver:
            self.driver.quit()
            self.driver = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# ===== 최종 외부용 진입점: crawl(url) =====
def crawl(url: str) -> Dict:
    """
    스프링/Flask에서 바로 호출할 함수.
    내부로는 MercariCrawler.crawl_raw(url)을 사용하고,
    프로젝트에서 합의된 키로 변환해 반환한다.
    """
    with MercariCrawler(headless=True) as c:
        raw = c.crawl_raw(url)
        if not raw:
            return {}

        # hasShippingFee 변환: 포함(True) → False, 별도(False) → True, 불명(None) → None
        shipping_included = raw.get("shipping_included")
        if shipping_included is True:
            has_shipping_fee = False
        elif shipping_included is False:
            has_shipping_fee = True
        else:
            has_shipping_fee = None

        price_krw = raw.get("price")

        return {
            "productName": raw.get("title"),
            "description": raw.get("description"),
            "priceKRW": price_krw,
            "hasShippingFee": has_shipping_fee,
            "categories": raw.get("categories") or [],
            "images": raw.get("images") or [],
            "isSoldOut": raw.get("isSoldOut"),
        }


# 단독 실행 테스트 (선택)
if __name__ == "__main__":
    test_url = "https://jp.mercari.com/item/m41121124914"
    out = crawl(test_url)
    print(json.dumps(out, ensure_ascii=False, indent=2))
