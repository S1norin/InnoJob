import requests
from config import params
from base_models import Vacancy

def get_main_data():
    print("Запрос вакансий с HH.ru...")
    response = requests.get("https://api.hh.ru/vacancies", params=params)
    response.raise_for_status()
    api_data = response.json()
    print(f"Получено {len(api_data.get('items', []))} вакансий с HH.ru.")
    vacancies = list()
    for vacancy_hh in api_data.get('items', []):
        name = vacancy_hh.get("name")
        salary = vacancy_hh.get("salary")
        salary_from = salary.get("from") if salary else None
        salary_to = salary.get("to") if salary else None

        working_days_info = vacancy_hh.get("working_days")
        form = "no data"
        if working_days_info and isinstance(working_days_info, list) and len(working_days_info) > 0:
            form = working_days_info[0].get("name", "no data")

        url_alternate = vacancy_hh.get("alternate_url")  # Ссылка на вакансию на сайте
        url_api_details = vacancy_hh.get("url")  # URL для API деталей вакансии

        description_full = "Описание не загружено"
        requirements_list = []

        if url_api_details:
            try:
                # print(f"Запрос деталей для: {name} ({url_api_details})")
                response_details = get_dtat_from_url(url_api_details)
                response_details.raise_for_status()
                data_details = response_details.json()
                description_full = data_details.get("description", "Описание отсутствует")
                requirements_list = [skill.get("name") for skill in data_details.get("key_skills", []) if
                                     skill.get("name")]
            except requests.exceptions.RequestException as e:
                print(f"Ошибка при запросе деталей вакансии {name} ({url_api_details}): {e}")
            except ValueError as e:
                print(f"Ошибка декодирования JSON для вакансии {name} ({url_api_details}): {e}")
        else:
            print(f"Отсутствует URL для деталей вакансии: {name}")

        # print(f"Добавление вакансии из API: {name}")
        vacancies.append(Vacancy(name = name, salary_from = salary_from, salary_to = salary_to,
                                 form = form, description_full = description_full,
                                 url_alternate = url_alternate, requirements_list = requirements_list))
    return vacancies

def get_dtat_from_url(url):
    return requests.get(url)