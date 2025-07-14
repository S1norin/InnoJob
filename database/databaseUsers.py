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
            is_admin BOOLEAN DEFAULT FALSE
        );
        CREATE TABLE IF NOT EXISTS cards (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            card_id INT NOT NULL,
            level_of_education TEXT,
            education_full TEXT,
            age INTEGER,
            description TEXT,
            cv_name VARCHAR(255),
            cv_pdf BYTEA,
            photo_name VARCHAR(255),
            photo_file BYTEA,
            PRIMARY KEY (user_id, card_id)
        );
        
        CREATE TABLE IF NOT EXISTS skills (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            card_id INT NOT NULL,
            skill TEXT NOT NULL,
            FOREIGN KEY (user_id, card_id) REFERENCES cards(user_id, card_id) ON DELETE CASCADE
        );
        """
        boyarin_creation_query = "UPDATE users SET is_admin = true WHERE id = %s"

        with self._get_connection() as conn:#ВНИМАНИЕ ДЛЯ СОХРАНЕНИЕ АДЕКВАТНОСТИ ВАШЕГО КОГДА МЫ ТЕПЕРЬ ИСПОЛЬЗУЕМ ДАННУЮ КОНСТРКЦИЮ
            with conn.cursor() as cur:#ИНАЧЕ ЭТА ХЕРНЯ БУДЕТ УЯЗВИМОЙ Т К ЕЕ НАДО ЗАКРЫВАТЬ (ТО ЧТО ВСЕ МЫ УДАЧНО ПРОДОЛБИЛИ)
                cur.execute(create_query)
                conn.commit()
                if not self.user_in_base("oleg@petr.ru"):
                    admin_id = self.add_new_user("Oleg Petr", "oleg@petr.ru", "TuzhikMadzhik")
                    conn.commit()
                    cur.execute(boyarin_creation_query, (admin_id,))

#харашо а теперь передем к менее продолбаной части
    def add_new_user(self, name, email, password):
        query = "INSERT INTO users (name, email, password, is_confirmed) VALUES (%s, %s, %s, %s) RETURNING id;"
        password_bytes = password.encode('utf-8')
        hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')#данная залупа хеширует пароль причем сохраня соль хеширования непосредственно внутри

        try:
            with self._get_connection() as conn:#НЕ ЗАБЫВАЕМ ПРО ПРЕКРАСНЕЙШУЮ КОНСТРУКЦИЮ
                with conn.cursor() as cur:
                    cur.execute(query, (name, email, hashed_password, "True"))#захерачиваем пользователя
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
    def add_cv_from_bytes(self, user_email, card_number, pdf_content, pdf_name):
        query = "UPDATE cards SET cv_name = %s, cv_pdf = %s WHERE user_id = %s AND card_id = %s RETURNING user_id, card_id;"#умные запросы в базу данных
        id = self.get_user_id(user_email)
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (pdf_name, Binary(pdf_content), id, card_number))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError(f"Пользователь с email '{user_email}' не найден.")
                    return result[0]#возвращаем айди юзера (вдруг понадобиться)
        except psycopg2.Error as e:
            print(f"Ошибка БД при добавлении резюме: {e}")
            raise

    #прсто получаем файл нейм и его бинарное представление (все интересное смотри в гребанном мейне)
    def get_cv(self, user_email, card_number):
        query = "SELECT cv_name, cv_pdf FROM cards WHERE user_id = %s AND card_id = %s;"
        id = self.get_user_id(user_email)
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (id, card_number))
                    result = cur.fetchone()
                    if not result or not result[0]:
                        return None, None
                    return result  # Возвращает кортеж (file_name, file_data)
        except psycopg2.Error as e:
            print(f"Ошибка БД при получении резюме: {e}")
            raise


    def add_photo_from_bytes(self, user_email, card_number, photo_content, photo_name):
        query = "UPDATE cards SET photo_name = %s, photo_file = %s WHERE user_id = %s AND card_id = %s RETURNING user_id, card_id;"#умные запросы в базу данных
        id = self.get_user_id(user_email)
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (photo_name, Binary(photo_content), id, card_number))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError(f"Пользователь с email '{user_email}' не найден.")
                    return result[0]#возвращаем айди юзера (вдруг понадобиться)
        except psycopg2.Error as e:
            print(f"Ошибка БД при добавлении фото: {e}")
            raise

    #прсто получаем файл нейм и его бинарное представление (все интересное смотри в гребанном мейне)
    def get_photo(self, user_email, card_number):
        query = "SELECT photo_name, photo_file FROM cards WHERE user_id = %s AND card_id = %s;"
        id = self.get_user_id(user_email)
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (id, card_number))
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

    def get_user_id(self, email):
        query = "SELECT id FROM users WHERE email = %s"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (email,))
                result = cur.fetchone()
                if result:
                    return result[0]
                else:
                    return None


    def get_user_card(self, email, card_number):
        query1 = "SELECT id, name FROM users WHERE email = %s;"
        query2 = "SELECT level_of_education, education_full, age, description from cards where user_id = %s AND card_id = %s;"
        query3 = "SELECT skill FROM skills WHERE user_id = %s AND card_id = %s;"
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query1, (email,))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError(f"Пользователь с email '{email}' не найден.")
                    id = result[0]
                    name = result[1]
                    cur.execute(query2, (id, card_number))
                    result2 = cur.fetchone()
                    if not result2:
                        raise ValueError(f"Карточка '{card_number}' не найдена.")
                    cur.execute(query3, (id, card_number))
                    result3 = [skill[0] for skill in cur.fetchall()]
                    return {
                        "name": name,
                        "education_level":  result2[0],
                        "education_full": result2[1],
                        "age": result2[2],
                        "description": result2[3],
                        "skills": result3
                    }
        except psycopg2.Error as e:
            print(f"Ошибка БД при получении информации о пользователе: {e}")
            conn.rollback()
            raise

    def add_user_card(self, email, education_level, education_full, age, description, skills):
        get_card_id = "SELECT COALESCE(MAX(card_id), -1) + 1 FROM cards WHERE user_id = %s;"
        query1 = """
            INSERT INTO cards 
                (user_id, card_id, level_of_education, education_full, age, description) 
            VALUES 
                (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, card_id) 
            DO UPDATE SET
                level_of_education = EXCLUDED.level_of_education,
                education_full = EXCLUDED.education_full,
                age = EXCLUDED.age,
                description = EXCLUDED.description 
            """  # умные запросы в базу данных
        query2 = "DELETE FROM skills WHERE user_id = %s AND card_id = %s"
        query3 = "INSERT INTO skills (user_id, card_id, skill) VALUES (%s, %s, %s);"
        user_id = self.get_user_id(email)
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(get_card_id, (user_id,))
                    card_number = cur.fetchone()[0]
                    cur.execute(query1, (user_id, card_number, education_level, education_full, age, description))
                    cur.execute(query2, (user_id, card_number)) # сносим нафиг все старые скилы которые были у юзера
                    for skill in skills:
                        if skill: cur.execute(query3, (user_id, card_number, skill))  # вставляем новые
                    conn.commit()
        except psycopg2.Error as e:
            print(f"Ошибка БД при добавлении информации о пользователе: {e}")
            conn.rollback() # давай по новой миша все фигня
            raise

    def delete_user_card(self, email, card_number):
        query1 = "DELETE FROM cards WHERE user_id = %s AND card_id = %s"  # умные запросы в базу данных
        query2 = "DELETE FROM skills WHERE user_id = %s AND card_id = %s;"  # сносим нафиг все старые скилы которые были у юзера
        update_higher_cards_query = """
                UPDATE cards 
                SET card_id = card_id - 1 
                WHERE user_id = %s AND card_id > %s
            """
        update_higher_skills_query = """
                UPDATE skills 
                SET card_id = card_id - 1 
                WHERE user_id = %s AND card_id > %s
            """
        user_id = self.get_user_id(email)
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query1, (user_id, card_number))
                    cur.execute(query2, (user_id, card_number))
                    conn.commit()
        except psycopg2.Error as e:
            print(f"Ошибка БД при удалении информации о пользователе: {e}")
            conn.rollback()
            raise

    def edit_user_card(self, email, card_number, education_level, education_full, age, description, skills):
        query1 = """
            INSERT INTO cards 
                (user_id, card_id, level_of_education, education_full, age, description) 
            VALUES 
                (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, card_id) 
            DO UPDATE SET
                level_of_education = EXCLUDED.level_of_education,
                education_full = EXCLUDED.education_full,
                age = EXCLUDED.age,
                description = EXCLUDED.description 
            """  # умные запросы в базу данных
        query2 = "DELETE FROM skills WHERE user_id = %s AND card_id = %s"
        query3 = "INSERT INTO skills (user_id, card_id, skill) VALUES (%s, %s, %s);"
        user_id = self.get_user_id(email)
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query1, (user_id, card_number, education_level, education_full, age, description))
                    cur.execute(query2, (user_id, card_number)) # сносим нафиг все старые скилы которые были у юзера
                    for skill in skills:
                        if skill: cur.execute(query3, (user_id, card_number, skill))  # вставляем новые
                    conn.commit()
        except psycopg2.Error as e:
            print(f"Ошибка БД при изменении информации о пользователе: {e}")
            conn.rollback() # давай по новой миша все фигня
            raise

    def get_all_user_cards(self, email):
        query1 = "SELECT id FROM users WHERE email = %s;"
        query2 = "SELECT card_id, level_of_education, education_full, age, description, cv_name, photo_name FROM cards WHERE user_id = %s ORDER BY card_id;"
        query3 = "SELECT card_id, skill FROM skills WHERE user_id = %s;"
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query1, (email,))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError(f"Пользователь с email '{email}' не найден.")
                    user_id = result[0]
                    cur.execute(query2, (user_id,))
                    cards = cur.fetchall()
                    cur.execute(query3, (user_id,))
                    skills_rows = cur.fetchall()
                    # Map card_id to list of skills
                    skills_map = {}
                    for card_id, skill in skills_rows:
                        skills_map.setdefault(card_id, []).append(skill)
                    # Build card dicts
                    card_dicts = []
                    for card in cards:
                        card_id, level_of_education, education_full, age, description, cv_name, photo_name = card
                        card_dicts.append({
                            "card_id": card_id,
                            "education_level": level_of_education,
                            "education_full": education_full,
                            "age": age,
                            "description": description,
                            "cv_name": cv_name,
                            "photo_name": photo_name,
                            "skills": skills_map.get(card_id, [])
                        })
                    return card_dicts
        except psycopg2.Error as e:
            print(f"Ошибка БД при получении всех карточек пользователя: {e}")
            conn.rollback()
            raise

    def get_literally_all_cards(self):
        query1 = "SELECT id, name FROM users"
        query2 = "SELECT card_id, level_of_education, education_full, age, description, cv_name, photo_name FROM cards WHERE user_id = %s ORDER BY card_id;"
        query3 = "SELECT card_id, skill FROM skills WHERE user_id = %s;"
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query1)
                    result = cur.fetchall()
                    all_cards = []
                    for user in result:
                        user_id = user[0]
                        user_name = user[1]
                        cur.execute(query2, (user_id,))
                        cards = cur.fetchall()
                        cur.execute(query3, (user_id,))
                        skills_rows = cur.fetchall()
                        # Map card_id to list of skills
                        skills_map = {}
                        for card_id, skill in skills_rows:
                            skills_map.setdefault(card_id, []).append(skill)
                        # Build card dicts
                        card_dicts = []
                        for card in cards:
                            card_id, level_of_education, education_full, age, description, cv_name, photo_name = card
                            card_dicts.append({
                                "name": user_name,
                                "card_id": card_id,
                                "education_level": level_of_education,
                                "education_full": education_full,
                                "age": age,
                                "description": description,
                                "cv_name": cv_name,
                                "photo_name": photo_name,
                                "skills": skills_map.get(card_id, [])
                            })
                        all_cards += card_dicts
                    return all_cards
        except psycopg2.Error as e:
            print(f"Ошибка БД при получении всех карточек пользователя: {e}")
            conn.rollback()
            raise
    def get_is_admin(self, email):
        query = "SELECT is_admin FROM users WHERE email = %s;"
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (email,))
                    result = cur.fetchone()
                    if not result:  # сначала ищем есть ли такой меил
                        return False
                    return result[0]
        except psycopg2.Error as e:
            print(f"Ошибка БД при проверке пользователя: {e}")
            raise

