import requests
from config import params

def get_data_from_url(url):
    return requests.get(url)

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
        salary_from = salary.get("from", "None") if salary is not None else None
        salary_to = salary.get("to", "None") if salary is not None else None
        salary_mode = vacancy_hh.get('salary_range').get('mode').get(name) if vacancy_hh.get('salary_range') is not None else "no data"
        salary_currency = salary.get('currency') if salary is not None else 'no data'

        experience = vacancy_hh.get('experience', {}).get("name", 'no data')

        form = "no data"

        url_alternate = vacancy_hh.get("alternate_url")  # Ссылка на вакансию на сайте
        url_api_details = vacancy_hh.get("url")  # URL для API деталей вакансии

        description_full = "Описание не загружено"
        picture = "#"
        requirements_list = []

        if url_api_details:
            try:
                # print(f"Запрос деталей для: {name} ({url_api_details})")
                response_details = get_data_from_url(url_api_details)
                response_details.raise_for_status()
                data_details = response_details.json()


                description_full = data_details.get("description", "Описание отсутствует")
                requirements_list = [skill.get("name") for skill in data_details.get("key_skills", [])]
                picture = data_details.get('employer').get('logo_url').get('90',) if data_details.get('employer').get('logo_url') is not None else "#"
            except requests.exceptions.RequestException as e:
                print(f"Ошибка при запросе деталей вакансии {name} ({url_api_details}): {e}")
            except ValueError as e:
                print(f"Ошибка декодирования JSON для вакансии {name} ({url_api_details}): {e}")
        else:
            print(f"Отсутствует URL для деталей вакансии: {name}")

        # for i in vacancy_hh.keys():
        #     print(f"{i}: {vacancy_hh[i]}")
        # break
        # print(f"Добавление вакансии из API: {name}")

        vacancies.append({"name": name,
                          "salary_from": salary_from,
                          "salary_to": salary_to,
                          "salary_currency": salary_currency,
                          "salary_mode": salary_mode,
                          "experience": experience,
                          "form":  form,
                          "description": description_full,
                          "link": url_alternate,
                          "picture": picture if picture is not None else "#",
                          "requirements_list": requirements_list
                          })
    return vacancies