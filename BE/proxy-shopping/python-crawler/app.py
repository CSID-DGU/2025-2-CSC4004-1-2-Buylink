# app.py
from flask import Flask, request, jsonify
from mercari_crawler_2 import crawl

app = Flask(__name__)

@app.route("/crawl", methods=["POST"])
def do_crawl():
    body = request.get_json(force=True) or {}
    url = body.get("url")
    if not url:
        return jsonify({"success": False, "data": None, "error": "url is required"}), 400
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
