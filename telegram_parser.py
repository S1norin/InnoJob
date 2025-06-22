from telethon.sync import TelegramClient
from telethon.sessions import StringSession
from nlp_parser import parse_vacancy

try:
    from config import telegram_session, telegram_api_id, telegram_api_hash
    if not telegram_session:
        raise ImportError("Dalbaeb exception")
except:
    print("Dalbaeb sozdai config s sessiei")


def parse_channel(channel_name, limit=10):
    with TelegramClient(StringSession(telegram_session), telegram_api_id, telegram_api_hash) as client:
        messages = client.get_messages(channel_name, limit=limit)
        return [m.text for m in messages if m.text]


# Example usage
if __name__ == "__main__":
    channel = "IUCareerFinder"
    messages = parse_channel(channel, 30)
    vacancies  = ""
    for text in messages:
        parsed = parse_vacancy(text)
        if parsed['is_vacancy']:
            print(parsed)
            print("=====================================")


