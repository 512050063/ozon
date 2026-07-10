import importlib.util
import pathlib


module_path = pathlib.Path(__file__).resolve().parent / "ozon" / "ozon_product_by_url.py"
spec = importlib.util.spec_from_file_location("ozon_product_by_url", module_path)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)


html = """
<html>
  <head>
    <meta property="og:image" content="https://ir-21.ozonru.cn/s3/multimedia-1-s/c600/11785348828.jpg">
    <script type="application/ld+json">
      {
        "@context": "http://schema.org",
        "@type": "Product",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "1969"
        },
        "brand": "Amato Home",
        "image": "https://ir-21.ozonru.cn/s3/multimedia-1-s/11785348828.jpg",
        "name": "Amato Home 电吹风 3000 瓦特, 2 个速度配件1",
        "offers": {
          "@type": "Offer",
          "url": "https://www.ozon.ru/product/fen-dlya-volos-professionalnyy-4738440079/",
          "price": "111.78",
          "priceCurrency": "CNY"
        },
        "sku": "4738440079"
      }
    </script>
  </head>
</html>
"""

product = module.extract_structured_product_from_html(
    html,
    "https://www.ozon.ru/product/fen-dlya-volos-professionalnyy-4738440079/",
)

assert product["sku"] == "4738440079"
assert product["title"] == "Amato Home 电吹风 3000 瓦特, 2 个速度配件1"
assert product["main_image"] == "https://ir-21.ozonru.cn/s3/multimedia-1-s/11785348828.jpg"
assert product["price"] == "111.78"
assert product["currency"] == "CNY"
assert product["rating"] == "4.9"
assert product["review_count"] == "1969"
assert product["link"] == "https://www.ozon.ru/product/fen-dlya-volos-professionalnyy-4738440079/"

print("ozon structured product extraction assertions passed")
