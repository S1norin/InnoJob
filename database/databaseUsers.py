import psycopg2
from psycopg2 import Binary
import bcrypt
import time
#С помощью высших сил я смог написать это как адекватный человек(неточно)
class UserManager:#Этот черт будет использоваться для работы с бд юзеров
    def __init__(self, host, dbname, user, password, port):
        self.db_params = {
            'host': host,
            'dbname': dbname,
            'user': user,
            'password': password,
            'port': port
        }
        self._create_table_if_not_exists()#мы получаем куча говна и создаем таблицу если ее нет

    def _get_connection(self):
        return psycopg2.connect(**self.db_params)

    # ВНИМАНИЕ #ВНИМАНИЕ #ВНИМАНИЕ #ВНИМАНИЕ #ВНИМАНИЕ
    def _create_table_if_not_exists(self):
        create_query = """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            confirmation_code INTEGER,
            confirmation_code_created_at INTEGER,  
            is_confirmed BOOLEAN DEFAULT FALSE,
            level_of_education TEXT,
            course TEXT,
            description TEXT,
            cv_name VARCHAR(255),
            cv_pdf BYTEA,
            photo_name VARCHAR(255),
            photo_file BYTEA
        );
        CREATE TABLE IF NOT EXISTS skills (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            skill TEXT NOT NULL
        );
        
        """
        with self._get_connection() as conn:#ВНИМАНИЕ ДЛЯ СОХРАНЕНИЕ АДЕКВАТНОСТИ ВАШЕГО КОГДА МЫ ТЕПЕРЬ ИСПОЛЬЗУЕМ ДАННУЮ КОНСТРКЦИЮ
            with conn.cursor() as cur:#ИНАЧЕ ЭТА ХЕРНЯ БУДЕТ УЯЗВИМОЙ Т К ЕЕ НАДО ЗАКРЫВАТЬ (ТО ЧТО ВСЕ МЫ УДАЧНО ПРОДОЛБИЛИ)
                cur.execute(create_query)

#харашо а теперь передем к менее продолбаной части
    def add_new_user(self, name, email, password):
        query = "INSERT INTO users (name, email, password) VALUES (%s, %s, %s) RETURNING id;"
        password_bytes = password.encode('utf-8')
        hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')#данная залупа хеширует пароль причем сохраня соль хеширования непосредственно внутри

        try:
            with self._get_connection() as conn:#НЕ ЗАБЫВАЕМ ПРО ПРЕКРАСНЕЙШУЮ КОНСТРУКЦИЮ
                with conn.cursor() as cur:
                    cur.execute(query, (name, email, hashed_password))#захерачиваем пользователя
                    user_id = cur.fetchone()[0]
                    return user_id#если понадобиться можно будет получат ид
        except psycopg2.IntegrityError:
            raise ValueError(f"Пользователь с email '{email}' уже существует.")
        except psycopg2.Error as e:
            print(f"Ошибка БД при добавлении пользователя: {e}")
            raise

    #угадайте что делает данная
    def check_user(self, email, password):
        query = "SELECT password FROM users WHERE email = %s;"
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (email,))
                    result = cur.fetchone()
                    if not result:#сначала ищем есть ли такой меил
                        return False

                    stored_hash = result[0].encode('utf-8')
                    return bcrypt.checkpw(password.encode('utf-8'), stored_hash)#и вот тут благодаря магии у нас сравнивается пароль с хешированой версие пароли юзара
        except psycopg2.Error as e:
            print(f"Ошибка БД при проверке пользователя: {e}")
            raise

    #сохраняем файл как бинарное очко
    def add_cv_from_bytes(self, user_email, pdf_content, pdf_name):
        query = "UPDATE users SET cv_name = %s, cv_pdf = %s WHERE email = %s RETURNING id;"#умные запросы в базу данных
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (pdf_name, Binary(pdf_content), user_email))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError(f"Пользователь с email '{user_email}' не найден.")
                    return result[0]#возвращаем айди юзера (вдруг понадобиться)
        except psycopg2.Error as e:
            print(f"Ошибка БД при добавлении резюме: {e}")
            raise

    #прсто получаем файл нейм и его бинарное представление (все интересное смотри в гребанном мейне)
    def get_cv(self, user_email):
        query = "SELECT cv_name, cv_pdf FROM users WHERE email = %s;"
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (user_email,))
                    result = cur.fetchone()
                    if not result or not result[0]:
                        return None, None
                    return result  # Возвращает кортеж (file_name, file_data)
        except psycopg2.Error as e:
            print(f"Ошибка БД при получении резюме: {e}")
            raise


    def add_photo_from_bytes(self, user_email, photo_content, photo_name):
        query = "UPDATE users SET photo_name = %s, photo_file = %s WHERE email = %s RETURNING id;"#умные запросы в базу данных
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (photo_name, Binary(photo_content), user_email))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError(f"Пользователь с email '{user_email}' не найден.")
                    return result[0]#возвращаем айди юзера (вдруг понадобиться)
        except psycopg2.Error as e:
            print(f"Ошибка БД при добавлении фото: {e}")
            raise

    #прсто получаем файл нейм и его бинарное представление (все интересное смотри в гребанном мейне)
    def get_photo(self, user_email):
        query = "SELECT photo_name, photo_file FROM users WHERE email = %s;"
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (user_email,))
                    result = cur.fetchone()
                    if not result or not result[0]:
                        return None, None
                    return result  # Возвращает кортеж (file_name, file_data)
        except psycopg2.Error as e:
            print(f"Ошибка БД при получении ajnj: {e}")
            raise


    def get_sent_time(self, email):
        query = "SELECT confirmation_code_created_at FROM users WHERE email = %s"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (email,))
                result = cur.fetchone()
                if result:
                    return result[0]
                else:
                    return None

    def get_confirmation_code(self, email):
        query = "SELECT confirmation_code FROM users WHERE email = %s"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (email,))
                result = cur.fetchone()
                if result:
                    return result[0]
                else:
                    return None


    def get_is_confirmed(self, email):
        query = "SELECT is_confirmed FROM users WHERE email = %s"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (email,))
                result = cur.fetchone()
                if result:
                    return bool(result[0])
                else:
                    return None

    def set_confirmed_code(self, user_email, code):
        query = """
            UPDATE users 
            SET confirmation_code = %s, 
                confirmation_code_created_at = %s 
            WHERE email = %s
            """
        current_time = int(time.time())
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (code, current_time, user_email))

    def confirm_user_and_clear_code(self, user_email):
        query = """
            UPDATE users 
            SET is_confirmed = TRUE,
                confirmation_code = NULL,
                confirmation_code_created_at = NULL
            WHERE email = %s
        """
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (user_email,))



    def change_password(self, mail, password):
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        query = """
                UPDATE users 
                SET password = %s
                WHERE email = %s
            """
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (hashed_password, mail))



    def user_in_base(self, email):
        query = "SELECT id FROM users WHERE email = %s"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (email,))
                result = cur.fetchone()
                if result:
                    return True
                else:
                    return False


    def get_user_info(self, email):
        query = "SELECT id, level_of_education, course, description FROM users WHERE email = %s;"
        query2 = "SELECT skill FROM skills WHERE user_id = %s;"
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (email,))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError(f"Пользователь с email '{email}' не найден.")
                    id = result[0]
                    cur.execute(query2, (id,))
                    result2 = [skill[0] for skill in cur.fetchall()] # эти долбанафты вернули нам словарь кортежей а не словарь строк переделываем
                    return { # возвращаем словарь чтоб потом в беке сделать распаковку товаров с алиэкспресс
                        "educationLevel":  result[1],
                        "course": result[2],
                        "description": result[3],
                        "skills": result2
                            }

        except psycopg2.Error as e:
            print(f"Ошибка БД при добавлении информации о пользователе: {e}")
            conn.rollback() # давай по новой миша все фигня
            raise

    def set_user_info(self, email, educationLevel, course, description, skills):
        query = "UPDATE users SET level_of_education = %s, course = %s, description = %s WHERE email = %s RETURNING id;"  # умные запросы в базу данных
        delete_query = "DELETE FROM skills WHERE user_id = %s;"  # сносим нафиг все старые скилы которые были у юзера
        query2 = "INSERT INTO skills (user_id, skill) VALUES (%s, %s);"
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (educationLevel, course, description, email))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError(f"Пользователь с email '{email}' не найден.")
                    id = result[0]
                    cur.execute(delete_query, (id,)) # сносим нафиг все старые скилы которые были у юзера
                    for skill in skills:
                        if skill: cur.execute(query2, (id,skill))  # вставляем новые
                    conn.commit()
        except psycopg2.Error as e:
            print(f"Ошибка БД при добавлении информации о пользователе: {e}")
            conn.rollback() # давай по новой миша все фигня
            raise

