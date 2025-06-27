from telegram_parser import parse_channel

text = """📣 **Стажёр Data Science в Ozon Tech**

    Проект генерации фона для товаров во время распродаж

    **📌 Задачи: **
    - разработка функционала для классической обработки, сегментации, генерации изображений
    - обучение CV-моделей, продумывание и проверка гипотез, валидация результатов обучения
    - работа с данными - сбор датасета, подготовка фичей
    - оценка качества полученной модели, тестирование моделей, познакомится с методами деплоя моделей в прод
    - взаимодействие с бизнес-заказчиками и перевод бизнес-требований в плоскость ML

    Опыт работы от 20 лет
    Зарплата от 0 до 10 рублей в месяц
    Иннополис
    Офис
    
[👉🏼 **Более подробно о стажировке**](https://job.ozon.ru/vacancy/121749776?__rr=1&abt_att=1)"""


def test_parse_channel(mocker):
    mock_client = mocker.patch('telegram_parser.TelegramClient')
    mock_instance = mock_client.return_value.__enter__.return_value

    # Setup mock return values
    mock_message = mocker.Mock()
    mock_message.id = 0
    mock_message.text = text

    mock_instance.get_messages.return_value = [mock_message]

    assert len(parse_channel("")) == 1
    assert mock_client.call_count == 1

    mock_message.text = "some meaningless sheet"

    assert len(parse_channel("")) == 0
    assert mock_client.call_count == 2



