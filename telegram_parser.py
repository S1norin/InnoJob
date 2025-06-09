from config import telegram_api_id, telegram_api_hash
from telethon import TelegramClient
import requests

client = TelegramClient("anon", telegram_api_id, telegram_api_hash)