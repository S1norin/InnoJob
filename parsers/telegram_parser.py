from telethon.sync import TelegramClient
from telethon.sessions import StringSession
from nlp_parser import parse_vacancy
try:
    from parsers.parser_configs import telegram_session, telegram_api_id, telegram_api_hash
    if not telegram_session:
        raise ImportError("Dalbaeb exception")
except:
    print("Dalbaeb sozdai config s sessiei")


async def parse_channel(channel_name, limit=10):
    async with TelegramClient(
        StringSession(telegram_session),
        telegram_api_id,
        telegram_api_hash
    ) as client:
        messages = await client.get_messages(channel_name, limit=limit)
        vacancies = []
        for m in messages:
            parsed = parse_vacancy(m.text)
            parsed['link'] = f"https://t.me/{channel_name}/{m.id}"
            if parsed['is_vacancy']:
                vacancies.append(parsed)
        return vacancies


#Тест
if __name__ == "__main__":
    import asyncio

    vacancies = asyncio.run(parse_channel("IUCareerFinder", 30))
    for vacancy in vacancies:
        print(vacancy)



