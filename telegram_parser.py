import asyncio
from config import telegram_api_id, telegram_api_hash
from telethon import TelegramClient, utils
import requests

# client = TelegramClient("anon", telegram_api_id, telegram_api_hash)
#
# async def get_sinorin_message():
#         chat = await client.get_input_entity('sins_of_rin')
#         async for message in client.iter_messages(chat):
#                 return(message)
#
# print(get_sinorin_message())
# Note the import from telethon.sync

with TelegramClient("anon", telegram_api_id, telegram_api_hash) as client:
    # No 'async' or 'await' is needed here.
    for message in client.iter_messages('sins_of_rin', limit=1):
        print(f"Sender ID: {message.sender_id}")
        print(f"Message Text: {message.text}")