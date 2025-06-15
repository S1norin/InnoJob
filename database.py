import psycopg2

from parser import get_main_data, get_employer_data, get_area_data, employer_ids
from config import *


# Интерфейс для работы с вакансиями
class VacancyManager:
    def __init__(self, host, dbname, user, password, port):
        # Объявляю переменные, которые в последствии могут понадобиться для работы
        self.host = host
        self.dbname = dbname
        self.user = user
        self.password = password
        self.port = port
        self.db_params = {'host': host, 'dbname': dbname, 'user': user, 'password': password, 'port': port}

        # Создание таблиц
        self._create_tables_if_not_exists()

    # Создаёт подключение для дальнейшей работы
    def _get_connection(self):
        return psycopg2.connect(**self.db_params)

    # Удобная функция для создания таблиц (в случае отсутствия оных)
    def _create_tables_if_not_exists(self):
        query = """
        CREATE TABLE IF NOT EXISTS employers (
            id SERIAL PRIMARY KEY,
            employer_id INTEGER UNIQUE NOT NULL, 
            name TEXT NOT NULL,
            logo TEXT
        );
        CREATE TABLE IF NOT EXISTS vacancies (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            employer INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
            area TEXT,
            salary_from INTEGER,
            salary_to INTEGER,
            salary_currency TEXT,
            salary_mode TEXT,
            experience TEXT,
            format TEXT,
            description TEXT,
            link TEXT
        );
        CREATE TABLE IF NOT EXISTS requirements (
            id SERIAL PRIMARY KEY,
            vacancy_id INTEGER REFERENCES vacancies(id) ON DELETE CASCADE, 
            requirement TEXT NOT NULL
        );
        """

        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                conn.commit()

    # Функция для получения данных о всех вакансиях
    def get_vac_list(self):
        query = """
            SELECT v.id, v.name, e.name, v.area, v.salary_from, v.salary_to, 
                   v.salary_currency, v.salary_mode, v.experience, v.format, 
                   v.description, v.link, e.logo, r.requirement
            FROM vacancies v
            JOIN employers e ON v.employer = e.id
            LEFT JOIN requirements r ON v.id = r.vacancy_id
            ORDER BY v.id;
        """
        vacancies = []
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                for row in cur.fetchall():
                    vac_id, name, employer, area, s_from, s_to, s_cur, s_mod, exp, fmt, desc, link, pic, req = row
                    vac = {
                        "id": vac_id,
                        "name": name,
                        "employer": employer,
                        "area": area,
                        "salary_from": s_from,
                        "salary_to": s_to,
                        "salary_currency": s_cur,
                        "salary_mode": s_mod,
                        "experience": exp,
                        "format": fmt,
                        "description": desc,
                        "link": link,
                        "picture": pic,
                        "requirements": req if req else []
                    }
                    try:
                        vacancies.index(
                            vac)  # Проверка на уникальность. Если не найдёт - вызовет ValueError, except его перехватит и добавит
                    except ValueError:
                        vacancies.append(vac)
        return vacancies

    # Функция для обновления списка вакансий
    def update_tables(self):
        # Гарантированно обнуляет таблицы
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DROP TABLE IF EXISTS requirements, vacancies, CASCADE;")
                conn.commit()

        # Пересоздаём таблицы
        self._create_tables_if_not_exists()

    def update_vacancies_from_source(self):
        self.update_tables()
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                vacancies_from_parser = get_main_data()  # Получаем данные при помощи парсера
                for vacancy in vacancies_from_parser:
                    try:
                        self.find_employer(vacancy.get('employer_id'))
                        cur.execute(
                            "INSERT INTO vacancies ("
                            "name, "
                            "area, "
                            "employer, "
                            "salary_from, "
                            "salary_to, "
                            "salary_currency, "
                            "salary_mode, "
                            "experience, "
                            "format, "
                            "description, "
                            "link"
                            ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;",
                            (vacancy.get("name"),
                             vacancy.get('city'),
                             self.find_employer(vacancy.get('employer_id')),
                             vacancy.get('salary_from'),
                             vacancy.get('salary_to'),
                             vacancy.get('salary_currency'),
                             vacancy.get('salary_mode'),
                             vacancy.get('experience'),
                             vacancy.get('form'),
                             vacancy.get('description'),
                             vacancy.get('link'))
                        )
                        vacancy_id = cur.fetchone()[0]  # Получаем айди
                        for skill in vacancy.get('requirements', []):  # Добавляем требования, если имеются
                            cur.execute(
                                "INSERT INTO requirements (vacancy_id, requirement) VALUES (%s, %s);",
                                (vacancy_id, skill)
                            )
                    except Exception as e:
                        print(e)
                        continue

        print("Данные о вакансиях успешно обновлены.")

    def add_employer(self, data: dict):
        request = """INSERT INTO employers (employer_id, name, logo) VALUES (%s, %s, %s) RETURNING id"""
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute(request, (data.get('emp_id'), data.get('name'), data.get('logo')))
                    conn.commit()
                except Exception:
                    pass

    def update_employers(self, employer_list):
        self.update_tables()
        for emp in employer_list:
            try:
                data = get_employer_data(emp)
                self.add_employer(data)
            except Exception:
                print(f"Работодатель {emp} уже присутствует в БД")

    def find_employer(self, e_id):
        request = f"""SELECT id FROM employers WHERE employer_id={e_id}"""
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute(request)
                    found_id = cur.fetchone()
                    return found_id[0]
                except Exception as e:
                    print(e, f"employer {e_id} not found")
