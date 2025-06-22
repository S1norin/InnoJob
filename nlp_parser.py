import spacy
import re
from spacy.matcher import PhraseMatcher
import pymorphy3

def to_nominative_singular(word):
    word = word.split(" ")
    morph = pymorphy3.MorphAnalyzer()
    for i, w in enumerate(word):
        word[i] = morph.parse(w)[0].normal_form.capitalize()
    return " ".join(word)

# Load models
nlp_en = spacy.load("en_core_web_sm")
nlp_ru = spacy.load("ru_core_news_sm")

# Create work form matchers
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
            return ent.text

    # Look for keywords in the text
    job_keywords = ["developer", "менеджер", "специалист", "стажёр", "разработчик", "scientist"]
    for token in doc:
        if token.text.lower() in job_keywords:
            # Get surrounding text (3 words before and after)
            start = max(0, token.i - 3)
            end = min(len(doc), token.i + 4)
            return doc[start:end].text

    # Fallback to first noun phrase (English only)
    if doc.lang_ == "en":
        for chunk in doc.noun_chunks:
            return chunk.text

    return None


def extract_company(doc):
    starred_companies = re.findall(r"\*\*([^\s*]+)\*\*", doc.text)
    if starred_companies:
        return re.sub(r'[\"\'«»“”‘’„‟]', '', starred_companies[0])
    for ent in doc.ents:
        if ent.label_ == "ORG":
            return ent.text
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
                "from": salary_from,
                "to": salary_to,
                "currency": match.group(3),
                "mode": "monthly" if "месяц" in doc.text else "yearly"
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


def extract_requirements(doc):
    requirements = []
    # Look for requirement sections
    for i, sent in enumerate(doc.sents):
        sent_text = sent.text.lower()

        # Russian keywords
        if any(kw in sent_text for kw in ["задачи", "требован", "обязанност", "обязательн"]):
            # Add current and next 5 sentences (typical requirements section)
            requirements.extend(s.text for s in list(doc.sents)[i:i + 6])
            break

        # English keywords
        elif any(kw in sent_text for kw in ["requirements", "qualifications", "must have", "responsibilities"]):
            requirements.extend(s.text for s in list(doc.sents)[i:i + 6])
            break

    return requirements


def parse_vacancy(text):
    # Process with both pipelines
    doc_ru = nlp_ru(text)

    # For Russian text, English processing isn't needed
    result = {
        "is_vacancy": is_vacancy(doc_ru),
        "job_title": extract_job_title(doc_ru),
        "company": extract_company(doc_ru),
        "location": next((to_nominative_singular(ent.text) for ent in doc_ru.ents if ent.label_ == "LOC"), None),
        "description": " ".join([sent.text for sent in doc_ru.sents][:3]),
        "work_form": extract_work_form(doc_ru),
    }

    # Add salary data if found
    salary_data = extract_salary(doc_ru) or {}
    result.update(salary_data)

    return result


if __name__ == '__main__':
    text = """📣 **Стажёр Data Science в Ozon Tech**

Проект генерации фона для товаров во время распродаж

**📌 Задачи: **
- разработка функционала для классической обработки, сегментации, генерации изображений
- обучение CV-моделей, продумывание и проверка гипотез, валидация результатов обучения
- работа с данными - сбор датасета, подготовка фичей
- оценка качества полученной модели, тестирование моделей, познакомится с методами деплоя моделей в прод
- взаимодействие с бизнес-заказчиками и перевод бизнес-требований в плоскость ML

[👉🏼 **Более подробно о стажировке**](https://job.ozon.ru/vacancy/121749776?__rr=1&abt_att=1)"""

    print(parse_vacancy(text))