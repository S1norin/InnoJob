import psycopg2
from psycopg2 import Binary
from parser import *


# Как эту хуйню юзать:
# При инициализации передаешь ей хост, имя бд, юзера, пароль, порт
# класс создает подключение и курсор и все делает за вас
# Что вам нужно юзать:
# 1) get_vac_list возвращает список
#   [
#       Имя
#       Нижняя граница зарплаты
#       Верхняя граница зарплаты
#       Формат
#       Описание (в тегах HTML)
#       Ссылка на вакансию
#       [Список ключевых навыков]
#   ]
# 2) update - думаю, понятно, что функция делает. Если есть еще вопросы, занесите банку сгущенки в 5-512

class DB:
    def __init__(self, host, dbname, user, password, port):
        try:
            self.host = host
            self.dbname = dbname
            self.user = user
            self.password = password
            self.port = port

            self.conn = psycopg2.connect(host=host, dbname=dbname, user=user,
                                         password=password, port=port)
            self.cur = self.conn.cursor()
            self.update()
        except Exception as e:
            print(f"Ошибка при инициализации DB: {e}")  # Более информативное сообщение

    def get_vac_list(self):
        request = "SELECT id, name, salary_from, salary_to, format, description, link FROM Vacancy"
        self.cur.execute(request)
        vac_tuples = self.cur.fetchall()  # Получаем список кортежей

        data_for_fastapi = []
        if not vac_tuples:
            return []

        for vac_row_tuple in vac_tuples:
            # Преобразуем кортеж в словарь
            vac_dict = {
                "id": vac_row_tuple[0],
                "name": vac_row_tuple[1],
                "salary_from": vac_row_tuple[2],
                "salary_to": vac_row_tuple[3],
                "format": vac_row_tuple[4],  # Убедитесь, что имя поля 'format' используется последовательно
                "description": vac_row_tuple[5],
                "link": vac_row_tuple[6]
            }

            # Получаем требования для текущей вакансии
            self.cur.execute("SELECT requirement FROM Requirements WHERE Vacancy_id = %s", (vac_dict["id"],))
            requirements_list = [req[0] for req in self.cur.fetchall()]
            vac_dict["requirements"] = requirements_list

            data_for_fastapi.append(vac_dict)

        return data_for_fastapi

    def add_vac(self, name, salary_from, salary_to, form, description, link, requirements):
        sql_insert_vacancy = """
            INSERT INTO Vacancy (name, salary_from, salary_to, format, description, link)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;
        """
        db_salary_from = salary_from if salary_from is not None else None
        db_salary_to = salary_to if salary_to is not None else None

        try:
            self.cur.execute(sql_insert_vacancy, (name, db_salary_from, db_salary_to, form, description, link))
            vac_id = self.cur.fetchone()[0]

            if vac_id and requirements:  # Проверяем, что requirements не пустой
                sql_insert_requirement = "INSERT INTO Requirements (vacancy_id, requirement) VALUES (%s, %s);"
                for req_item in requirements:
                    self.cur.execute(sql_insert_requirement, (vac_id, req_item))
            self.conn.commit()
        except psycopg2.Error as e:
            print(f"Ошибка psycopg2 при добавлении вакансии '{name}': {e}")
            self.conn.rollback()  # Откатываем транзакцию в случае ошибки
        except Exception as e:
            print(f"Непредвиденная ошибка при добавлении вакансии '{name}': {e}")
            self.conn.rollback()

    def add_user(self, name, email, password):
        sql_insert_user = """
            INSERT INTO Users (name, email, password, cv_name, cv_pdf)
            VALUES (%s, %s, %s, %s, %s) RETURNING id;
        """
        try:
            self.cur.execute(sql_insert_user, (name, email, password, None, None))
            self.conn.commit()
            return self.cur.fetchone()[0]
        except psycopg2.IntegrityError as e:
            if "unique_email" in str(e):
                print(f"User with email '{email}' already exists")
                raise ValueError("Email address already in use") from e
            else:
                print(f"Database error: {e}")
                self.conn.rollback()
                raise
        except psycopg2.Error as e:
            print(f"Непредвиденная ошибка при добавлении пользователя '{name}': {e}")
            self.conn.rollback()
            raise
        except Exception as e:
            print(f"Непредвиденная ошибка при добавлении пользователя '{name}': {e}")
            self.conn.rollback()
            raise

    def add_cv(self, user_email, pdf_path, pdf_name):
        try:
            with open(pdf_path, 'rb') as f:
                pdf_data = f.read()

            self.cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
            user_result = self.cur.fetchone()

            if not user_result:
                raise ValueError(f"No user found with email {user_email}")

            user_id = user_result[0]

            # Insert PDF document
            self.cur.execute(
                """UPDATE Users 
                   SET cv_name = %s, cv_pdf = %s 
                   WHERE id = %s""",
                (pdf_name, Binary(pdf_data), user_id))

            self.conn.commit()

            doc_id = self.cur.fetchone()[0]
            self.conn.commit()

            print(f"Successfully inserted PDF with ID {doc_id} for user {user_email}")
            return doc_id

        except Exception as e:
            if 'conn' in locals(): self.conn.rollback()
            print(f"Error inserting PDF: {e}")
            raise

    def get_cv(self, user_email, output_path):
        self.cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
        user_result = self.cur.fetchone()

        if not user_result:
            raise ValueError(f"No user found with email {user_email}")

        user_id = user_result[0]
        self.cur.execute(
            "SELECT file_name, file_data FROM pdf_documents WHERE id = %s",
            (user_id,)
        )

        file_name, file_data = self.cur.fetchone()

        with open(output_path, 'wb') as file:
            file.write(file_data)
        return file_name

    def close(self):
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
        print("Соединение с БД закрыто.")

    def update(self):
        try:
            self.cur.execute("DROP TABLE IF EXISTS Requirements CASCADE")
            self.cur.execute("DROP TABLE IF EXISTS Vacancy CASCADE")
            self.cur.execute("DROP TABLE IF EXISTS Users CASCADE")
            self.cur.execute(
                """CREATE TABLE Vacancy (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    salary_from INTEGER,
                    salary_to INTEGER,
                    format TEXT,
                    description TEXT,
                    link TEXT
                );""")
            self.cur.execute(
                """CREATE TABLE Requirements (
                    id SERIAL PRIMARY KEY,
                    vacancy_id INTEGER REFERENCES Vacancy(id) ON DELETE CASCADE,
                    requirement TEXT NOT NULL
                );""")
            self.cur.execute(
                """CREATE TABLE Users (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                   cv_name VARCHAR(255),
                   cv_pdf BYTEA
              );""")
            self.conn.commit()
            print("Таблицы Vacancy и Requirements пересозданы.")

            vacancies = get_main_data()

            for vacancy in vacancies:
                data_for_db = (
                    vacancy.name,
                    vacancy.salary_from,
                    vacancy.salary_to,
                    vacancy.form,
                    vacancy.description_full,
                    vacancy.url_alternate
                )

                # Insert into Vacancy table
                self.cur.execute(
                    """
                    INSERT INTO Vacancy (name, salary_from, salary_to, format, description, link)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id;
                    """,
                    data_for_db
                )
                vacancy_id = self.cur.fetchone()[0]

                # Insert requirements separately
                for skill in vacancy.requirements_list:
                    self.cur.execute(
                        "INSERT INTO Requirements (vacancy_id, requirement) VALUES (%s, %s)",
                        (vacancy_id, skill)
                    )

            print("Вакансии с HH.ru обработаны.")

            print("Метод update завершен.")

        except psycopg2.Error as e:
            print(f"Ошибка psycopg2 в методе update: {e}")
            if self.conn:
                self.conn.rollback()
        except Exception as e:
            print(f"Непредвиденная ошибка в методе update: {e}")
            if self.conn:
                self.conn.rollback()
