import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

try:
    from backend.ai_client import send_message_to_ai
    from backend.history import add_message, get_history
except ModuleNotFoundError:
    from ai_client import send_message_to_ai
    from history import add_message, get_history

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Smart AI Customer Support Assistant backend is ready."})

@app.route("/api/chat", methods=["POST"])
def chat():
    if not request.is_json:
        return jsonify({"status": "error", "error": "Request body must be JSON."}), 400

    data = request.get_json()
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"status": "error", "error": "Please provide a non-empty 'message'."}), 400

    if message.lower() == "history":
        return jsonify({"status": "ok", "history": get_history()})

    add_message("user", message)

    try:
        assistant_message = send_message_to_ai(message)
    except Exception as exc:
        error_message = str(exc)
        if "AI_API_KEY is not configured" in error_message:
            return (
                jsonify({"status": "error", "error": error_message}),
                500,
            )
        return (
            jsonify(
                {
                    "status": "error",
                    "error": "AI provider request failed.",
                    "details": error_message,
                }
            ),
            502,
        )

    add_message("assistant", assistant_message)
    return jsonify(
        {
            "status": "ok",
            "message": assistant_message,
            "history": get_history(),
        }
    )

@app.route("/api/history", methods=["GET"])
def history():
    return jsonify({"status": "ok", "history": get_history()})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
