import psycopg2
from parsers.telegram_parser import parse_channel
from config import *


class TelegramManager:
    def __init__(self, host, dbname, user, password, port):
        self.db_params = {'host': host, 'dbname': dbname, 'user': user, 'password': password, 'port': port}

    # Создаёт подключение для дальнейшей работы
    def _get_connection(self):
        return psycopg2.connect(**self.db_params)

    async def initialize(self):
        await self._total_update()


    async def _total_update(self):
        # Создание таблиц
        self.drop_tables()
        self.create_tables_if_not_exists()
        await self.update_vacancies_from_source()  # Добавляем вакансии


    # функция для создания таблиц (в случае отсутствия оных)
    def create_tables_if_not_exists(self):
        # Сначала создаём таблицу с источниками (если оных нет)
        query = """ 
            CREATE TABLE IF NOT EXISTS telegram_vacancies (
            id SERIAL PRIMARY KEY,
            title TEXT,
            description TEXT,
            link TEXT
        );
        """

        with self._get_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute(query)
                except Exception as e:
                    print(e)

    def get_vac_list(self):
        query = """
            SELECT id, title, description, link FROM telegram_vacancies
        """
        vacancies = {}
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                for row in cur.fetchall():
                    id, title, description, link = row
                    if id not in vacancies:
                        vacancies[id] = {
                            "id": id,
                            "title": title,
                            "description": description,
                            "link": link,
                        }
        return list(vacancies.values())

    def drop_tables(self):
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DROP TABLE IF EXISTS telegram_vacancies CASCADE;")
                conn.commit()

    async def update_vacancies_from_source(self):
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                vacancies_from_parser = await parse_channel("IUCareerFinder", 30)
                for vacancy in vacancies_from_parser:
                    job_title = vacancy["job_title"]
                    description = vacancy["description"]
                    link = vacancy["link"]
                    try:
                        cur.execute(
                            "INSERT INTO telegram_vacancies ("
                            "title, "
                            "description, "
                            "link"
                            ") VALUES (%s, %s, %s)",
                            (job_title, description, link)
                        )
                    except Exception as e:
                        print(f"Ошибка при обновлении вакансий {e}")
        print("Данные о вакансиях обновлены.")

