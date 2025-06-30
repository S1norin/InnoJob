import requests
from time import sleep

from parsers.parser_configs import *

def get_params_hh():
    params = []
    for i in employer_ids_hh:
        p = {
            "employer_id": i,
            "per_page": 100,
            "page": 0,
            "only_with_salary": False
        }
        params.append(p)
    return params


def get_data_from_url(url):
    return requests.get(url)

def get_data_hh():
    print("Запрос вакансий с HH.ru...")
    params = get_params_hh()
    vacancies = []
    for par in params:
        print(f"Запрос данных работодателей {par.get('employer_id')}")
        response = requests.get("https://api.hh.ru/vacancies", params=par)

        while response.status_code == 403:
            sleep(2)
            response = requests.get("https://api.hh.ru/vacancies", params=par)

        api_data = response.json()

        for vacancy_hh in api_data.get('items', []):
            name = vacancy_hh.get("name")

            area = vacancy_hh.get('area').get('id')
            emp = vacancy_hh.get('employer').get('id')

            salary = vacancy_hh.get("salary")
            salary_from, salary_to = None, None
            salary_currency = 'no data'
            salary_mode = "no data"

            if salary is not None:
                salary_from = salary.get("from")
                salary_to = salary.get("to")
                salary_currency = salary.get('currency')

            if vacancy_hh.get('salary_range') is not None:
                salary_mode = vacancy_hh.get('salary_range').get('mode').get(name)

            experience = vacancy_hh.get('experience', {}).get("name", 'no data')

            form = "no data"

            url_alternate = vacancy_hh.get("alternate_url")  # Ссылка на вакансию на сайте
            url_api_details = vacancy_hh.get("url")  # URL для API деталей вакансии

            description_full = "Описание не загружено"
            picture = "#"
            requirements_list = []

            if url_api_details:
                try:
                    response_details = get_data_from_url(url_api_details)

                    delay = 0

                    while response_details.status_code == 403:
                        response_details = get_data_from_url(url_api_details)
                        sleep(delay + 0.5)
                        delay += 0.5
                    data_details = response_details.json()

                    description_full = data_details.get("description", "Описание отсутствует")
                    requirements_list = [skill.get("name") for skill in data_details.get("key_skills", [])]
                    picture = data_details.get('employer').get('logo_url').get('90', ) if data_details.get(
                        'employer').get('logo_url') is not None else "#"
                except ValueError as e:
                    print(f"Ошибка декодирования JSON для вакансии {name} ({url_api_details}): {e}")
            else:
                print(f"Отсутствует URL для деталей вакансии: {name}")

            vacancies.append({
                "name": name,
                'city': area,
                "employer_id": emp,
                "salary_from": salary_from,
                "salary_to": salary_to,
                "salary_currency": salary_currency,
                "salary_mode": salary_mode,
                "experience": experience,
                "form": form,
                "source": "1",
                "description": description_full,
                "link": url_alternate,
                "picture": picture if picture is not None else "#",
                "requirements_list": requirements_list
            })
        sleep(0.2)
    return vacancies

def get_main_data():
    data = []
    data.extend(get_data_hh())
    return data

def get_employer_data_hh(e_id):
    response = requests.get(f'https://api.hh.ru/employers/{e_id}').json()
    data = {
        'emp_id': response.get('id'),
        'name': response.get('name'),
        'logo': response.get('logo_urls').get('90') if response.get("logo_urls") is not None else "#",
        'source': '1'
    }
    return data

def get_city_data(a_id):
    response = requests.get(f'https://api.hh.ru/areas/{a_id}').json()
    data = {
        'area_id': response.get('id'),
        'name': response.get('name')
    }
    return data