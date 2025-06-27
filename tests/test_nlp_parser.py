from nlp_parser import to_nominative_singular, is_vacancy, extract_location, extract_company, extract_salary, extract_expirience, extract_job_title ,extract_work_form
from tests.test_telegram_parser import text
import spacy

nlp_ru = spacy.load("ru_core_news_sm")



def test_to_nominative_singular():
    assert to_nominative_singular("word") == "Word"
    assert to_nominative_singular("кошки") == "Кошка"
    assert to_nominative_singular("хавать кошек") == "Хавать Кошка"
def test_is_vacancy():
    assert is_vacancy(nlp_ru(text))
    assert not is_vacancy(nlp_ru("Повар спрашивает повара повар какова твоя профессия"))

def test_extract_job_title():
    assert extract_job_title(nlp_ru(text)) == "Стажёр data science"
    assert not extract_job_title(nlp_ru(""))


def test_extract_company():
    assert extract_company(nlp_ru(text)) == "Ozon Tech"
    assert not extract_company(nlp_ru(""))


def test_extract_location():
    assert extract_location(nlp_ru(text)) == "Иннополис"
    assert not extract_location(nlp_ru(""))

def test_extract_salary():
    assert extract_salary(nlp_ru(text)) == {
        "salary_from": 0,
        "salary_to": 10,
        "salary_currency": 'руб',
        "salary_mode": 'monthly'
    }
    assert extract_salary(nlp_ru("")) == {
        "salary_from": None,
        "salary_to": None,
        "salary_currency": None,
        "salary_mode": None
    }


def test_extract_work_form():
    assert extract_work_form(nlp_ru(text)) == "Офис"
    assert not extract_work_form(nlp_ru(""))
def test_extract_expirience():
    assert extract_expirience(nlp_ru(text)) == "Опыт работы от 20 лет"
    assert not extract_expirience(nlp_ru(""))
