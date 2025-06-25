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
    #Открываем сессию телеграмм аккаунта и делаем всякое
    with TelegramClient(StringSession(telegram_session), telegram_api_id, telegram_api_hash) as client:
        messages = client.get_messages(channel_name, limit=limit) #Лутаем последние limit сообщений с канала
        vacancies = []
        for m in messages:
            parsed = parse_vacancy(m.text) #Разбиваем эту хуйню на много маленьких хуечков юзая nlp_parser
            parsed['id'] = m.id #Добавляем айди и ссылку
            parsed['link'] = f"https://t.me/{channel_name}/{m.id}"
            if parsed['is_vacancy']:
                # Возвращаем только если nlp решил что это ваканися
                vacancies.append(parsed)
        return vacancies


#Тест
if __name__ == "__main__":
    vacancies = parse_channel("IUCareerFinder", 30)
    for vacancy in vacancies:
        print(vacancy)



