import psycopg2

from parsers.parser import get_main_data, get_employer_data_hh, get_city_data
from parsers.parser_configs import *
from config import *


# Интерфейс для работы с вакансиями
class VacancyManager:
    def __init__(self, host, dbname, user, password, port):
        self.db_params = {'host': host, 'dbname': dbname, 'user': user, 'password': password, 'port': port}

        self._total_update()

    # Создаёт подключение для дальнейшей работы
    def _get_connection(self):
        return psycopg2.connect(**self.db_params)

    def _total_update(self):
        # Создание таблиц
        self.update_tables()
        self.create_tables_if_not_exists()
        self.update_sources()                # Обновляем источники ДО добавления данных
        self.update_employers()              # Добавляем работодателей
        self.update_vacancies_from_source()  # Добавляем вакансии


    # Удобная функция для создания таблиц (в случае отсутствия оных)
    def create_tables_if_not_exists(self):
        # Сначала создаём таблицу с источниками (если оных нет)
        query = """ 
            CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY,
            name TEXT
        );
        CREATE TABLE IF NOT EXISTS employers (
            id SERIAL PRIMARY KEY,
            employer_id INTEGER UNIQUE NOT NULL, 
            name TEXT NOT NULL,
            logo TEXT,
            source INTEGER REFERENCES sources(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS cities (
            id SERIAL PRIMARY KEY,
            city_id INTEGER UNIQUE NOT NULL,
            name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS vacancies (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            employer INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
            city INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
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
        CREATE TABLE IF NOT EXISTS formats (
            id SERIAL PRIMARY KEY,
            vacancy_id INTEGER REFERENCES vacancies(id) ON DELETE CASCADE, 
            format TEXT NOT NULL
        );"""

        with self._get_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute(query)
                except Exception as e:
                    print(e)

    # Обновляет список источников
    def update_sources(self):
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT id, name FROM sources')
                existing_sources = {name for _, name in cur.fetchall()}

                to_insert = []
                for source_id, source_name in sources.items():
                    if source_name not in existing_sources:
                        to_insert.append((source_id, source_name))

                if to_insert:
                    cur.executemany('INSERT INTO sources (id, name) VALUES (%s, %s)', to_insert)
                    conn.commit()


    # Функция для получения данных о всех вакансиях
    def get_vac_list(self):
        query = """
            SELECT v.id, v.name, e.name, c.name, v.salary_from, v.salary_to, 
                   v.salary_currency, v.salary_mode, v.experience, f.format, 
                   v.description, v.link, e.logo, s.name, r.requirement
            FROM vacancies v
            JOIN employers e ON v.employer = e.id
            JOIN cities c ON v.city = c.id
            JOIN sources s ON e.source = s.id
            LEFT JOIN requirements r ON v.id = r.vacancy_id
            LEFT JOIN formats f ON v.id = f.vacancy_id
            ORDER BY v.id;
        """
        vacancies = []
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                for row in cur.fetchall():
                    vac_id, name, employer, city, s_from, s_to, s_cur, s_mod, exp, fmt, desc, link, pic, source, req = row
                    vac = {
                        "id": vac_id,
                        "name": name,
                        "employer": employer,
                        "city": city,
                        "salary_from": s_from,
                        "salary_to": s_to,
                        "salary_currency": s_cur,
                        "salary_mode": s_mod,
                        "experience": exp,
                        "format": fmt if fmt else [],
                        "description": desc,
                        "link": link,
                        "picture": pic,
                        "source": source,
                        "requirements": req if req else []
                    }
                    try:
                        vacancies.index(vac)
                    except ValueError:
                        vacancies.append(vac)
        return vacancies

    def update_tables(self):
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DROP TABLE IF EXISTS requirements, vacancies, employers, formats CASCADE;")
                conn.commit()

    def update_vacancies_from_source(self):
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                vacancies_from_parser = get_main_data()  # Получаем данные при помощи парсера
                for vacancy in vacancies_from_parser:
                    name = vacancy.get("name")
                    city = self.find_city(vacancy.get('city'))
                    a=vacancy.get('employer_id')
                    b = vacancy.get('source')
                    emp = self.find_employer(a, b)
                    s_from = vacancy.get('salary_from')
                    s_to = vacancy.get('salary_to')
                    currency = vacancy.get('salary_currency')
                    mode = vacancy.get('salary_mode')
                    exp = vacancy.get('experience')
                    desc = vacancy.get('description')
                    link = vacancy.get('link')
                    try:
                        cur.execute(
                            "INSERT INTO vacancies ("
                            "name, "
                            "city, "
                            "employer, "
                            "salary_from, "
                            "salary_to, "
                            "salary_currency, "
                            "salary_mode, "
                            "experience, "
                            "description, "
                            "link"
                            ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;",
                            (name, city, emp, s_from, s_to, currency, mode, exp, desc, link)
                        )
                        vacancy_id = cur.fetchone()[0]  # Получаем айди
                        for skill in vacancy.get('requirements', []):  # Добавляем требования, если имеются
                            cur.execute(
                                "INSERT INTO requirements (vacancy_id, requirement) VALUES (%s, %s);",
                                (vacancy_id, skill)
                            )
                        for format in vacancy.get('format', []):
                            cur.execute(
                                "INSERT INTO formats (vacancy_id, format) VALUES (%s, %s);",
                                (vacancy_id, format)
                            )
                    except Exception as e:
                        print(f"Ошибка при обновлении вакансий {e}")
        print("Данные о вакансиях обновлены.")

    def add_employer(self, data: dict):
        request = """
            INSERT INTO employers (employer_id, name, logo, source) 
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (employer_id) DO NOTHING
        """
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(request, (data.get('emp_id'), data.get('name'), data.get('logo'), data.get('source')))
                conn.commit()

    def update_employers(self):
        for emp in employer_ids_hh:
            try:
                data = get_employer_data_hh(emp)
                self.add_employer(data)
            except Exception:
                pass

    def find_employer(self, e_id, source):
        request = f"""SELECT id FROM employers WHERE employer_id={e_id} AND source={source}"""
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute(request)
                    found_id = cur.fetchone()
                    return found_id[0]
                except Exception as e:
                    print(e, f"employer {e_id} not found")
                    return None

    def find_city(self, c_id):
        request = f'SELECT id FROM cities WHERE city_id={c_id}'
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute(request)
                    found_id = cur.fetchone()
                    if not found_id:
                        request = 'INSERT INTO cities (city_id, name) VALUES (%s, %s) RETURNING id'
                        data = get_city_data(c_id)
                        cur.execute(request, (data.get('area_id'), data.get('name')))
                        found_id = cur.fetchone()
                        conn.commit()
                    return found_id[0]

                except Exception as e:
                    print(f"Ошибка при поиске города: {str(e)}")

    def get_employers(self):
        requests = f'SELECT name FROM employers'
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(requests)
                data = [i[0] for i in cur.fetchall()]
                return data

    def get_cities(self):
        requests = f"SELECT name FROM cities"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(requests)
                data = [i[0] for i in cur.fetchall()]
                return data

    def get_sources(self):
        return [
            'hh.ru',
            # 'telegram'
        ]

    def get_formats(self):
        request = 'SELECT format FROM formats'
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(request)
                res = list(set([i[0] for i in cur.fetchall()]))
                return res

db = VacancyManager(db_host, db_name, db_user, db_password, db_port)
print(len(db.get_vac_list()))
db._total_update()
print(len(db.get_vac_list()))

db._total_update()
print(len(db.get_vac_list()))
# # print(db.get_formats())
# # # print(len(d))
# # print(len(db.get_employers()))
# # print(len(db.get_cities()))
