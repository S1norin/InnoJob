import requests
from time import sleep


employer_ids = [
    '5970367', '9981358', '11856196', '9756959', '7311', '156424', '10647164', '10491049', '562662', '773061',
    '4042737', '4468207', '10433406', '59436', '5184662', '4170578', '147672', '3154691', '10831945', '10572529',
    '3335092', '4376554', '913233', '5079653', '10603974', '2488672', '567799', '9936093', '3565512', '2752199',
    '1272806', '4499572', '4949743', '1441807', '3091070', '2300703', '5855834', '10202226', '1009889', '618292',
    '11675594', '10958322', '3590333', '2436044', '4470289', '41862', '9041158', '11380393', '4476030', '4899433',
    '5624188', '4811345', '4858306', '4255949', '5925142', '2337948', '5396549', '11537930', '2073427', '5224941',
    '10084292'
]


def get_params():
    params = []
    for i in employer_ids:
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

def get_main_data():
    print("Запрос вакансий с HH.ru...")
    params = get_params()
    vacancies = []
    for par in params:
        print(f"Запрос данных работодателя {par.get('employer_id')}")
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
                salary_currency = salary.get('currency')

            if vacancy_hh.get('salary_range') is not None:
                salary_mode = vacancy_hh.get('salary_range').get('mode').get(name)


            experience = vacancy_hh.get('experience', {}).get("name", 'no data')
            form = [i['name'] for i in vacancy_hh.get('work_format')]
            if not form:
                form = ['Нет данных']

            url_alternate = vacancy_hh.get("alternate_url")  # Ссылка на вакансию на сайте
            url_api_details = vacancy_hh.get("url")  # URL для API деталей вакансии

            description_full = "Описание не загружено"
            picture = "#"
            requirements_list = []

            if url_api_details:
                try:
                    # print(f"Запрос деталей для: {name} ({url_api_details})")
                    response_details = get_data_from_url(url_api_details)

                    delay = 0.2

                    while response_details.status_code == 403:
                        response_details = get_data_from_url(url_api_details)
                        sleep(delay)
                        delay += 0.2
                    data_details = response_details.json()


                    description_full = data_details.get("description", "Описание отсутствует")
                    requirements_list = [skill.get("name") for skill in data_details.get("key_skills", [])]
                    picture = data_details.get('employer').get('logo_url').get('90',) if data_details.get('employer').get('logo_url') is not None else "#"
                    # print(f'Получено: {name}')
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
                "format":  form,
                "description": description_full,
                "link": url_alternate,
                "picture": picture if picture is not None else "#",
                "requirements": requirements_list
            })
        sleep(0.2)
    return vacancies

def get_employer_data(e_id):
    response = requests.get(f'https://api.hh.ru/employers/{e_id}').json()
    data = {
        'emp_id': response.get('id'),
        'name': response.get('name'),
        'logo': response.get('logo_urls').get('90') if response.get("logo_urls") is not None else "#"
    }
    return data

def get_city_data(a_id):
    response = requests.get(f'https://api.hh.ru/areas/{a_id}').json()
    data = {
        'area_id': response.get('id'),
        'name': response.get('name')
    }
    return data
