import spacy
import re
from spacy.matcher import PhraseMatcher
import pymorphy3




#Хрень которая переводит в ед число им падежа с большой буквы (вспоминаем уроки русского языка 4 класс)
def to_nominative_singular(word):
    word = word.split(" ")
    morph = pymorphy3.MorphAnalyzer() # Умный чел который умеет определять падежы
    for i, w in enumerate(word):
        word[i] = morph.parse(w)[0].normal_form.capitalize() # Переводим
    return " ".join(word)

# NLP модели для нормального и английского языка
nlp_en = spacy.load("en_core_web_sm")
nlp_ru = spacy.load("ru_core_news_sm")

# Хрень чтобы быстро икать ключевые слова в тексте
work_form_matcher_en = PhraseMatcher(nlp_en.vocab)
work_form_matcher_ru = PhraseMatcher(nlp_ru.vocab)

work_forms = ["remote", "hybrid", "office", "удалёнка", "офис", "гибрид"]

# Add patterns to both matchers
for matcher, nlp in [(work_form_matcher_en, nlp_en), (work_form_matcher_ru, nlp_ru)]:
    patterns = [nlp(text) for text in work_forms]
    matcher.add("WORK_FORM", patterns)


# PRE-BUILT VACANCY MATCHERS (FIXED)
vacancy_matcher_en = PhraseMatcher(nlp_en.vocab)
vacancy_matcher_ru = PhraseMatcher(nlp_ru.vocab)

# Enhanced vacancy keywords (added "стажёр")
vacancy_keywords = {
    'en': ["hiring", "apply now", "job opening", "vacancy", "position", "opportunity"],
    'ru': ["ищем", "требуется", "вакансия", "набор", "стажёр", "работа", "трудоустройство"]
}

# Create patterns for vacancy detection
patterns_en = [nlp_en(text) for text in vacancy_keywords['en']]
patterns_ru = [nlp_ru(text) for text in vacancy_keywords['ru']]
vacancy_matcher_en.add("VACANCY", patterns_en)
vacancy_matcher_ru.add("VACANCY", patterns_ru)

# Add custom patterns for job titles
job_title_patterns = [
    {"label": "OCCUPATION", "pattern": [{"LOWER": "стажёр"}, {"LOWER": "data"}, {"LOWER": "science"}]},
    {"label": "OCCUPATION", "pattern": [{"LOWER": "data"}, {"LOWER": "scientist"}]},
    {"label": "OCCUPATION", "pattern": [{"LOWER": "менеджер"}]},
    {"label": "OCCUPATION", "pattern": [{"LOWER": "разработчик"}]}
]

# Add patterns to both pipelines
for nlp in [nlp_en, nlp_ru]:
    ruler = nlp.add_pipe("entity_ruler")
    ruler.add_patterns(job_title_patterns)


# FIXED VACANCY DETECTION
def is_vacancy(doc):
    """Check if document contains vacancy keywords"""
    if doc.lang_ == "en":
        matches = vacancy_matcher_en(doc)
    else:  # Assume Russian
        matches = vacancy_matcher_ru(doc)
    return len(matches) > 0


def extract_job_title(doc):
    # First look for OCCUPATION entities
    for ent in doc.ents:
        if ent.label_ == "OCCUPATION":
            return ent.text.capitalize()

    # Look for keywords in the text
    job_keywords = ["developer", "менеджер", "специалист", "стажёр", "разработчик", "scientist", "маркетолог", "дизайнер"]
    for token in doc:
        if token.text.lower() in job_keywords:
            # Get surrounding text (3 words before and after)
            start = max(0, token.i)
            end = min(len(doc), token.i + 4)
            return doc[start:end].text.capitalize()

    # Fallback to first noun phrase (English only)
    if doc.lang_ == "en":
        for chunk in doc.noun_chunks:
            return chunk.text.capitalize()

    if ("стажировк" in doc.text or "Cтажировк" in doc.text):
        return "Стажёр"

    return None


def extract_company(doc):
    companies = [
        'Атомдата-Иннополис',
        'Иннополис Девелопмент',
        'АЙВИС',
        'АйДи Решения',
        'АйТиСфера',
        'Ай Си Спейс',
        'АйСиЭл Системные Технологии',
        'АйСиЭл Софт',
        'АйСиЭл Техно',
        'АйСиЭл Электроникс',
        'Ай-Теко Новые Технологии',
        'АйТуБи',
        'Ак Барс Цифровые Технологии',
        'Аллока Аналитика',
        'А-ТРЭКЕР',
        'Бастрим',
        'Батареон',
        'Би Пи Эм Энвайронмент',
        'Бипиум',
        'БРИОЛОДЖИ',
        'Вайс Сити Системс',
        'Валадорус Софт',
        'Вейвз Иннополис',
        'Визиолоджи Технологии',
        'ВРМ Групп',
        'ВФ-Инно',
        'Гемоскан',
        'Гросс Диджитал',
        'Джайвис',
        'Джетс',
        'ДжиДиСи Сервисез',
        'ДиджиталБизФэктори',
        'ДИОН СОФТ',
        'Дуглис-СААС',
        'Единые банковские технологии',
        'ЕОРА ДАТА ЛАБ',
        'Зед Софт Лабс',
        'ЗенКар',
        'Зинг',
        'ИВКС',
        'Индасофт Инновации',
        'ИнноГеоТех',
        'Иннодата',
        'Иннокод',
        'Иннополис 2023',
        'Иннософт',
        'Инностейдж ЦР',
        'Инференс Технолоджис',
        'Интеллектуальная видеоаналитика',
        'ИТ ИКС 5 Технологии',
        'Итерра-Модули',
        'ИЦС Платформа',
        'Касандра Груп',
        'Контур Инновации',
        'К-Проекты',
        'Кьюми АйТи',
        'Лемон Технолоджис Груп',
        'Магнит ИТ Лаб',
        'Маркетплейс-Технологии',
        'Марс Технологии',
        'МВС Индата',
        'Медитека Диджитал',
        'МедМаркет',
        'Мобильная платформа',
        'Мобильное решение',
        'МОНЕТА ЛАБС',
        'МТС Лаб',
        'Навикей',
        'Национальный Центр Информатизации',
        'НИХАО',
        'НовоГен',
        'Новые облачные технологии',
        'НПП Связь-Управление',
        'Оптимус',
        'Оргнефтехим АйТи',
        'ОРЛАН Диджитал',
        'Открытая мобильная платформа',
        'Оун',
        'Поуму',
        'ПРМ Иннополис',
        'ПСК СМАРТ ПАРК',
        'Радиус Исследования',
        'Райхлин Технологии',
        'Риэль Цифровые Технологии',
        'РМД',
        'Роадар',
        'Робософт',
        'РТК Софт Лабс',
        'РуНедра',
        'Русланд Тех',
        'Русдронопорт',
        'РЭДМЭДРОБОТ ИННОВАЦИИ',
        'Рэйлюкс',
        'Сайберскейп инвестмент',
        'СафДекор',
        'Свежие решения',
        'СДС Телеком',
        'Синергия Софт',
        'Сирин Групп',
        'СИСТЭМСОФТ',
        'СКБ Инфоматика',
        'СМАРТФАРМ',
        'Сорамитсу Лабс',
        'СТУДИЯ ЛИДС',
        'ТА-Информационные Технологии',
        'ТатИТнефть',
        'ТатМобайлИнформ СиДиСи',
        'ТГТ Сервис',
        'Техкрауд ЭйАй',
        'ТИИД',
        'ТРАКИНСТОК',
        'Транспэрент Технолоджис',
        'Трендпласт-М',
        'Умная камера',
        'Умные решения',
        'Универсальные ИТ системы',
        'ФармМедПолис РТ',
        'ХайРус',
        'ХайтекПарк',
        'Цифровой Сервис Провайдер',
        'ЦОК НТИ',
        'Эвотэк-Мирай Геномикс',
        'ЭЛСУР',
        'ЭНЕРГОСОФТ',
        'Эттон Груп',
        'Эттон Нефтегазовые Решения',
        'Юнителлер-РТИ',
        'Acronis',
        'ICL Services',
        'ICL Soft',
        'Uniteller',
        'Эттон',
        'Cognitive Pilot',
        'HiRUS',
        'ТаксНет',
        'Татнефть Цифровые Технологии',
        'Сорамитсу Лабс',
        'Инфоматика',
        'Sirin',
        'red_mad_robot',
        'RoadAR',
        'Radius-etl.ru',
        'Headmade',
        'FIX',
        'Мемориал',
        'Lemon Technologies Group',
        'Qummy',
        'Контур',
'Digital Biz Factory'
    ]
    text = doc.text
    for company in companies:
        if company in text:
            return company

    text_lower = text.lower()
    for company in companies:
        if company.lower() in text_lower:
            return company

    return None


def extract_location(doc):
    locations = ['Казань', 'Москва', 'Санкт-Петербург', 'Алматы', 'Нижний Новгород', 'Иннополис', 'Екатеринбург', 'Краснодар', 'Челябинск', 'Пермь', 'Ижевск', 'Ульяновск']
    text = doc.text
    for location in locations:
        if location in text:
            return location

    text_lower = text.lower()
    for location in locations:
        if location.lower() in text_lower:
            return location

    return None


def extract_salary(doc):
    salary_patterns = [
        r"(?:£|\$|€)(\d{1,3}(?:,\d{3})*)(?:\s*-\s*(\d{1,3}(?:,\d{3})*))?\s*(K|k)?",
        r"(?:з/п|зарплата).*?(\d[\d\s]+)\s*(?:-|до)\s*(\d[\d\s]+)\s*([$€₽руб]|\w+)",
        r"(\d[\d\s]+)\s*(?:-|до)\s*(\d[\d\s]+)\s*(руб|₽|USD|\$)"
    ]

    for pattern in salary_patterns:
        matches = re.finditer(pattern, doc.text)
        for match in matches:
            # Clean and convert numbers
            salary_from = int(match.group(1).replace(" ", "").replace(",", "")) if match.group(1) else None
            salary_to = int(match.group(2).replace(" ", "").replace(",", "")) if match.group(2) and match.group(
                2).isdigit() else None

            return {
                "salary_from": salary_from,
                "salary_to": salary_to,
                "salary_currency": match.group(3),
                "salary_mode": "monthly" if "месяц" in doc.text else None
            }
    return {}


def extract_work_form(doc):
    """Extract work form using pre-built matcher"""
    if doc.lang_ == "en":
        matches = work_form_matcher_en(doc)
    else:  # Assume Russian
        matches = work_form_matcher_ru(doc)

    for match_id, start, end in matches:
        return doc[start:end].text
    return None

def extract_expirience(doc):
    expirience_keywords = ["опыт работы", "опыт", "expirience"]
    for token in doc:
        if token.text.lower() in expirience_keywords:
            # Get surrounding text (3 words before and after)
            start = max(0, token.i)
            end = min(len(doc), token.i + 5)
            return re.sub(r'[^a-zA-Zа-яА-Я0-9\s]', '', doc[start:end].text.capitalize())
    return None


def parse_vacancy(text):
    # Process with both pipelines
    text = text.replace("*", "")
    doc_ru = nlp_ru(text)
    # For Russian text, English processing isn't needed
    result = {
        "is_vacancy": is_vacancy(doc_ru),
        "job_title": extract_job_title(doc_ru),
        "company": extract_company(doc_ru),
        "location": extract_location(doc_ru),
        "experience": extract_expirience(doc_ru),
        "description": " ".join([sent.text for sent in doc_ru.sents][:3]),
        "work_form": extract_work_form(doc_ru),
    }

    # Add salary data if found
    salary_data = extract_salary(doc_ru) or {
                "salary_from": None,
                "salary_to": None,
                "salary_currency": None,
                "salary_mode": None
            }
    result.update(salary_data)

    return result


#Тест
if __name__ == '__main__':
    text = """📣 **Стажёр Data Science в Ozon Tech**

Проект генерации фона для товаров во время распродаж

**📌 Задачи: **
- разработка функционала для классической обработки, сегментации, генерации изображений
- обучение CV-моделей, продумывание и проверка гипотез, валидация результатов обучения
- работа с данными - сбор датасета, подготовка фичей
- оценка качества полученной модели, тестирование моделей, познакомится с методами деплоя моделей в прод
- взаимодействие с бизнес-заказчиками и перевод бизнес-требований в плоскость ML

Зарплата от 0 до 10 рублей

опыт работы 10 вечностей. Кстати иди нахуй
[👉🏼 **Более подробно о стажировке**](https://job.ozon.ru/vacancy/121749776?__rr=1&abt_att=1)"""

    print(parse_vacancy(text))