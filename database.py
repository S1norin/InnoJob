import psycopg2
from parser import get_main_data


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
        CREATE TABLE IF NOT EXISTS vacancy (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            salary_from INTEGER,
            salary_to INTEGER,
            salary_currency TEXT,
            salary_mode TEXT,
            experience TEXT,
            format TEXT,
            description TEXT,
            link TEXT,
            picture TEXT
        );
        CREATE TABLE IF NOT EXISTS requirements (
            id SERIAL PRIMARY KEY,
            vacancy_id INTEGER REFERENCES vacancy(id) ON DELETE CASCADE, 
            requirement TEXT NOT NULL
        );"""
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                conn.commit()


    # Функция для получения данных о всех вакансиях
    def get_vac_list(self):
        query = """
            SELECT v.id, v.name, v.salary_from, v.salary_to, v.salary_currency, v.salary_mode, v.experience, v.format, v.description, v.link, v.picture, r.requirement
            FROM vacancy v
            LEFT JOIN requirements r ON v.id = r.vacancy_id
            ORDER BY v.id;
        """
        vacancies = []
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                for row in cur.fetchall():
                    vac_id, name, s_from, s_to, s_cur, s_mod, exp, fmt, desc, link, pic, req = row
                    vac = {
                            "id": vac_id,
                            "name": name,
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
                        vacancies.index(vac) # Проверка на уникальность. Если не найдёт - вызовет ValueError, except его перехватит и добавит
                    except ValueError:
                        vacancies.append(vac)
        return vacancies

    # Функция для обновления списка вакансий
    def update_vacancies_from_source(self):
        # Гарантированно обнуляет таблицы
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DROP TABLE IF EXISTS requirements, vacancy CASCADE;")
                conn.commit()

        # Пересоздаём таблицы
        self._create_tables_if_not_exists()

        with self._get_connection() as conn:
            with conn.cursor() as cur:
                vacancies_from_parser = get_main_data()  # Получаем данные при помощи парсера
                for vacancy in vacancies_from_parser:
                    try:
                        cur.execute(
                            "INSERT INTO vacancy (name, salary_from, salary_to, salary_currency, salary_mode, experience, format, description, link, picture) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;",
                            (vacancy.get("name"), vacancy.get('salary_from'), vacancy.get('salary_to'), vacancy.get('salary_currency'), vacancy.get('salary_mode'), vacancy.get('experience'), vacancy.get('form'), vacancy.get('description'), vacancy.get('link'), vacancy.get('picture'))
                        )
                    except Exception as e:
                        print(e)
                        break
                    vacancy_id = cur.fetchone()[0]  # Получаем айди
                    for skill in vacancy.get('requirements', []):  # Добавляем требования, если имеются
                        cur.execute(
                            "INSERT INTO requirements (vacancy_id, requirement) VALUES (%s, %s);",
                            (vacancy_id, skill)
                        )
        print("Данные о вакансиях успешно обновлены.")