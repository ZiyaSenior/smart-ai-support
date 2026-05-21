from datetime import datetime

MAX_HISTORY_ITEMS = 100
chat_history = []


def add_message(role: str, message: str) -> None:
    chat_history.append({
        "role": role,
        "message": message,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })
    while len(chat_history) > MAX_HISTORY_ITEMS:
        chat_history.pop(0)


def get_history() -> list:
    return list(chat_history)
