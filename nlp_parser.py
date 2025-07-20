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
work_forms += [i.capitalize() for i in work_forms]

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



def is_vacancy(doc):
    """Check if document contains vacancy keywords"""
    if doc.lang_ == "en":
        matches = vacancy_matcher_en(doc)
    else:  # Assume Russian
        matches = vacancy_matcher_ru(doc)
    return len(matches) > 0


def extract_job_title(doc):
    # First look for OCCUPATION entities
    text = doc.text
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

    if doc.lang_ == "en":
        for chunk in doc.noun_chunks:
            return chunk.text.capitalize()
    job_keywords = {
        "Стажёр": ["стажировк", "cтажировк", "стажёр", "cтажёр"],
        "developer": ["developer"],
        "менеджер": ["менеджер"],
        "разработчик": ["разработчик"],
        "scientist": ["scientist"],
        "маркетолог": ["маркетолог"],
        "дизайнер": ["дизайнер"]
    }

    text_lower = text.lower()

    for job, keywords in job_keywords.items():
        for keyword in keywords:
            if keyword in text_lower:
                return job.capitalize()
    return "Не указано"


def parse_vacancy(text):
    text = text.replace("*", "")
    doc_ru = nlp_ru(text)
    result = {
        "is_vacancy": is_vacancy(doc_ru),
        "job_title": extract_job_title(doc_ru),
        "description": text
    }
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

    Опыт работы от 20 лет
    Зарплата от 0 до 10 рублей в месяц
    Иннополис
    офис
    
[👉🏼 **Более подробно о стажировке**](https://job.ozon.ru/vacancy/121749776?__rr=1&abt_att=1)"""

    print(parse_vacancy(text))