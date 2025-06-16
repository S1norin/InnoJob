from telethon.sync import TelegramClient
from telethon.sessions import StringSession
from config import telegram_api_hash, telegram_api_id

api_id = telegram_api_id
api_hash = telegram_api_hash


with TelegramClient(StringSession(), api_id, api_hash) as client:
    client.start()
    session_string = client.session.save()

    print(session_string)
