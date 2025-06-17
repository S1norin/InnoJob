import psycopg2
from psycopg2 import Binary
import bcrypt
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
            cv_name VARCHAR(255),
            cv_pdf BYTEA
        );"""
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

    #угадайте что делает данная залупа
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
