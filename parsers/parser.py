import requests
from time import sleep
from random import shuffle


from parsers.parser_configs import *
# from parsers.telegram_parser import parse_channel
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

def get_params_sj():
    params = []
    for employer_id in employer_isd_sj:
        params.append({
            'count': 100,
            'page': 0,  # Начинаем с первой страницы
            'id_client': employer_id  # Правильный параметр для фильтра по работодателю
        })
    return params

def get_data_superjob():
    print("Запрос вакансий с SuperJob.ru...")
    params = get_params_sj()  # Новая функция для параметров SuperJob
    vacancies = []
    headers = {"X-Api-App-Id": SUPERJOB_API_KEY}  # Заголовок авторизации

    for par in params:
        print(f"Запрос с параметрами: {par}")
        response = requests.get("https://api.superjob.ru/2.0/vacancies/",
                                headers=headers,
                                params=par)

        # Обработка ограничений API
        delay = 0.2
        while response.status_code == 403 or response.status_code == 429:
            sleep(delay)
            delay += 0.2
            response = requests.get("https://api.superjob.ru/2.0/vacancies/",
                                    headers=headers,
                                    params=par)

        if response.status_code != 200:
            print(f"Ошибка {response.status_code}: {response.text}")
            continue

        api_data = response.json()
        for vacancy_sj in api_data.get('objects', []):
            #
            #
            #
            #
            # print(*[f"{i}: {vacancy_sj[i]}" for i in vacancy_sj.keys()], sep='\n')
            # break



            # Основные поля
            name = vacancy_sj.get("profession", "Без названия")
            city_id = vacancy_sj.get('town', {}).get('id') if vacancy_sj.get('town') else None
            #
            # print(city_id)


            employer_id = vacancy_sj.get('client').get('id')




            # Обработка зарплаты
            salary_info = {
                "from": vacancy_sj.get("payment_from"),
                "to": vacancy_sj.get("payment_to"),
                "currency": vacancy_sj.get("currency", "rub").upper(),
            }

            # Форматирование опыта
            experience_map = {
                "noExperience": "Нет опыта",
                "between1And3": "1-3 года",
                "between3And6": "3-6 лет",
                "moreThan6": "Более 6 лет"
            }
            experience = experience_map.get(vacancy_sj.get("experience", {}).get("id", ""), "Нет данных")

            # Формат работы
            work_place = vacancy_sj.get("place_of_work", {})
            work_format = []
            if work_place:
                format_map = {
                    1: "В офисе",
                    2: "Гибрид",
                    3: "Удалённая работа"
                }
                work_format = [format_map.get(work_place.get("id"), "Другой формат")]

            # Описание и требования
            description = vacancy_sj.get("vacancyRichText", "") or vacancy_sj.get("candidat", "")
            skills = [skill["title"] for skill in vacancy_sj.get("skills", [])]

            vacancies.append({
                "name": name,
                "city": city_id,
                "employer_id": employer_id,
                "salary_from": salary_info["from"],
                "salary_to": salary_info["to"],
                "salary_currency": salary_info["currency"],
                "experience": experience,
                "format": work_format,
                "source": "2",
                "description": description,
                "link": vacancy_sj.get("link", "#"),
                "picture": vacancy_sj.get("client", {}).get("logo", "#"),
                "requirements": skills
            })

        # Пауза между запросами
        sleep(0.25)

    return vacancies

def get_data_hh():
    print("Запрос вакансий с HH.ru...")
    params = get_params_hh()
    vacancies = []

    for par in params:
        print(f"Запрос данных работодателей {par.get('employer_id')}")
        response = requests.get("https://api.hh.ru/vacancies", params=par)

        delay = 0.2
        while response.status_code == 403:
            sleep(delay)
            delay += 0.2
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

            if vacancy_hh.get('salary_range') is not None:
                salary_mode = vacancy_hh.get('salary_range').get('mode').get(name)

            experience = vacancy_hh.get('experience', {}).get("name", 'no data')

            form = [i['name'] for i in vacancy_hh.get('work_format')]
            if not form:
                form = ['Нет данных']
            form = list(map(lambda x: 'В офисе' if x == 'На\xa0месте работодателя' else x, form))

            url_alternate = vacancy_hh.get("alternate_url")  # Ссылка на вакансию на сайте
            url_api_details = vacancy_hh.get("url")  # URL для API деталей вакансии

            description_full = "Описание не загружено"
            picture = "#"
            requirements_list = []

            if url_api_details:
                try:
                    response_details = requests.get(url_api_details)

                    delay = 0.2

                    while response_details.status_code == 403:
                        response_details = requests.get(url_api_details)
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
                "format": form,
                "source": "1",
                "description": description_full,
                "link": url_alternate,
                "picture": picture if picture is not None else "#",
                "requirements": requirements_list
            })
        sleep(0.2)
    return vacancies

def get_main_data():
    data = []
    data.extend(get_data_hh())
    data.extend(get_data_superjob())
    # data.extend(parse_channel('IUCareerFinder'))

    shuffle(data)
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

def get_employer_data_sj(e_id):
    response = requests.get(f'https://api.superjob.ru/2.0/clients/{e_id}/', headers={"X-Api-App-Id": SUPERJOB_API_KEY}).json()
    # print(response)
    data = {
        'emp_id': response.get('id'),
        'name': response.get('title'),
        'logo':  response.get('client_logo'),
        'source': '2',
    }
    if data['logo'] == None:
        data['logo'] = "#"
    # print(*[f'{i}: {response[i]}' for i in response], sep='\n')
    # print(data)
    return data


def get_city_data(a_id, source):
    data = {}
    if source == '1':
        response = requests.get(f'https://api.hh.ru/areas/{a_id}').json()
        data = {
            'area_id': response.get('id'),
            'name': response.get('name')
        }
    elif source == '2':
        url = f'https://api.superjob.ru/2.0/towns/?id={a_id}'
        headers = {"X-Api-App-Id": SUPERJOB_API_KEY}
        response = requests.get(url, headers=headers).json()['objects'][0]
        data = {
            'area_id': response.get('id'),
            'name': response.get('title')
        }
    return data

# print(*parse_channel("IUCareerFinder", 30), sep='\n')
# get_employer_data_sj('4901295')
# get_data_superjob()
