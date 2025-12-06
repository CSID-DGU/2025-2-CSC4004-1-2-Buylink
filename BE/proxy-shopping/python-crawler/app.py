# app.py
from flask import Flask, request, jsonify
from mercari_crawler_2 import crawl

app = Flask(__name__)

# Temporary mock data for testing
MOCK_MODE = False

@app.route("/crawl", methods=["POST"])
def do_crawl():
    body = request.get_json(force=True) or {}
    url = body.get("url")
    if not url:
        return jsonify({"success": False, "data": None, "error": "url is required"}), 400

    if MOCK_MODE:
        # Return mock data for testing
        mock_data = {
            "productName": "테스트 상품 - Nintendo Switch",
            "description": "테스트용 목 데이터입니다. 실제 크롤링이 완료되면 실제 데이터가 표시됩니다.",
            "priceKRW": 35000,
            "hasShippingFee": False,
            "categories": ["게임", "Nintendo Switch", "본체"],
            "images": [
                "https://static.mercdn.net/item/detail/orig/photos/test1.jpg",
                "https://static.mercdn.net/item/detail/orig/photos/test2.jpg"
            ],
            "isSoldOut": False
        }
        return jsonify({"success": True, "data": mock_data, "error": None}), 200

    try:
        data = crawl(url)
        if not data:
            return jsonify({"success": False, "data": None, "error": "crawl failed"}), 502
        return jsonify({"success": True, "data": data, "error": None}), 200
    except Exception as e:
        return jsonify({"success": False, "data": None, "error": str(e)}), 500

if __name__ == "__main__":
    # pip install flask selenium webdriver-manager
    app.run(host="0.0.0.0", port=5001)
