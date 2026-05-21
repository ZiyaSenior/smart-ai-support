import os
from dotenv import load_dotenv

load_dotenv()

AI_API_KEY = os.getenv("AI_API_KEY")
AI_API_URL = os.getenv("AI_API_URL", "https://api.qroq.ai/v1/chat")
AI_API_MODEL = os.getenv("AI_API_MODEL")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter-llama2-7b")
OPENROUTER_URL = os.getenv("OPENROUTER_URL", "https://api.openrouter.ai/v1/chat/completions")


def _extract_output(output):
    if isinstance(output, str):
        return output
    if isinstance(output, dict):
        return output.get("text") or output.get("message") or output.get("content") or str(output)
    if isinstance(output, list) and output:
        return _extract_output(output[0])
    return str(output)


def _build_openrouter_payload(message: str) -> dict:
    return {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": message}],
    }


def _build_generic_payload(message: str) -> dict:
    payload = {"prompt": message}
    if AI_API_MODEL:
        payload["model"] = AI_API_MODEL
    return payload


def _parse_openrouter_response(data: dict) -> str:
    if not isinstance(data, dict):
        return str(data)

    choices = data.get("choices") or []
    if choices and isinstance(choices, list):
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message") or {}
            if isinstance(message, dict):
                return _extract_output(message.get("content"))
            return _extract_output(message)
            
        return _extract_output(first)

    if "output" in data:
        return _extract_output(data["output"])
    if "response" in data:
        return str(data["response"])

    return str(data)


def send_message_to_ai(message: str) -> str:
    if OPENROUTER_API_KEY:
        api_key = OPENROUTER_API_KEY
        url = OPENROUTER_URL
        payload = _build_openrouter_payload(message)
    elif AI_API_KEY:
        api_key = AI_API_KEY
        url = AI_API_URL
        payload = _build_generic_payload(message)
    else:
        raise RuntimeError(
            "AI_API_KEY or OPENROUTER_API_KEY is not configured. Copy .env.example to .env and set one of these values."
        )

    try:
        import requests
    except ImportError as exc:
        raise RuntimeError(
            "The `requests` library is not available in this Python environment. "
            "Install dependencies with `pip install -r requirements.txt`."
        ) from exc

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    response = requests.post(url, json=payload, headers=headers, timeout=20)
    response.raise_for_status()

    data = response.json()
    if OPENROUTER_API_KEY:
        return _parse_openrouter_response(data)

    if isinstance(data, dict):
        if "output" in data:
            return _extract_output(data["output"])
        if "choices" in data and isinstance(data["choices"], list) and data["choices"]:
            first = data["choices"][0]
            if isinstance(first, dict):
                return first.get("text") or first.get("message") or str(first)
            return str(first)
        if "response" in data:
            return str(data["response"])

    return str(data)
