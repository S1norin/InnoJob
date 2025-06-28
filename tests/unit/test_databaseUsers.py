import pytest
from fastapi.testclient import TestClient
from main_backend import app, get_user_manager, get_vacancy_manager
from database.databaseUsers import UserManager
from database.database import VacancyManager
from config import db_host, db_name, db_user, db_password, db_port
import io
import psycopg2
from psycopg2 import sql
import time

TEST_DB_NAME = f"{db_name}_test"
TEST_DB_CONFIG = {
    "host": db_host,
    "dbname": TEST_DB_NAME,
    "user": db_user,
    "password": db_password,
    "port": db_port
}

# Test Data
TEST_USER = {
    "name": "Integration Test User",
    "email": "integration_test@example.com",
    "password": "securepassword123"
}

def create_test_database():

    admin_conn = psycopg2.connect(
        host=db_host,
        dbname="postgres",
        user=db_user,
        password=db_password,
        port=db_port
    )
    admin_conn.autocommit = True
    try:
        with admin_conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE {TEST_DB_NAME}")
    except psycopg2.errors.DuplicateDatabase:
        pass
    finally:
        admin_conn.close()

def drop_test_database():
    """Drop test database if it exists"""
    admin_conn = psycopg2.connect(
        host=db_host,
        dbname="postgres",
        user=db_user,
        password=db_password,
        port=db_port
    )
    admin_conn.autocommit = True
    try:
        with admin_conn.cursor() as cur:

            cur.execute(f"""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '{TEST_DB_NAME}'
                AND pid <> pg_backend_pid()
            """)
            cur.execute(f"DROP DATABASE IF EXISTS {TEST_DB_NAME}")
    finally:
        admin_conn.close()

@pytest.fixture(scope="module")
def test_client():

    drop_test_database()
    create_test_database()


    user_manager = UserManager(**TEST_DB_CONFIG)
    vacancy_manager = VacancyManager(**TEST_DB_CONFIG)


    user_manager._create_table_if_not_exists()
    vacancy_manager._create_tables_if_not_exists()

    with vacancy_manager._get_connection() as conn:
        with conn.cursor() as cur:

            cur.execute(
                "INSERT INTO employers (employer_id, name) VALUES (%s, %s) RETURNING id",
                (999, "Test Company")
            )
            employer_id = cur.fetchone()[0]

            cur.execute(
                "INSERT INTO cities (city_id, name) VALUES (%s, %s) RETURNING id",
                (999, "Test City")
            )
            city_id = cur.fetchone()[0]


            cur.execute(
                sql.SQL("""
                    INSERT INTO vacancies (name, employer, city, link)
                    VALUES (%s, %s, %s, %s)
                """),
                ("Test Vacancy", employer_id, city_id, "http://test.com")
            )
            conn.commit()


    def override_get_user_manager():
        return user_manager

    def override_get_vacancy_manager():
        return vacancy_manager

    app.dependency_overrides[get_user_manager] = override_get_user_manager
    app.dependency_overrides[get_vacancy_manager] = override_get_vacancy_manager

    with TestClient(app) as client:
        yield client

    drop_test_database()
    app.dependency_overrides.clear()

def test_main_page(test_client):
    response = test_client.get("/", timeout=5)
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "MainPage" in response.text


def test_vacancy_endpoints(test_client):

    response = test_client.get("/vacancies", timeout=5)
    assert response.status_code == 200
    vacancies = response.json()
    assert isinstance(vacancies, list)
    assert len(vacancies) > 0
    assert vacancies[0]["name"] == "Test Vacancy"


    response = test_client.get("/cities", timeout=5)
    assert response.status_code == 200
    assert "Test City" in response.json()

    response = test_client.get("/companies", timeout=5)
    assert response.status_code == 200
    assert "Test Company" in response.json()


def test_user_registration_and_login(test_client):

    response = test_client.post("/users/register", json=TEST_USER, timeout=5)
    assert response.status_code == 200
    assert "user_id" in response.json()


    user_manager = test_client.app.dependency_overrides[get_user_manager]()
    assert user_manager.check_user(TEST_USER["email"], TEST_USER["password"]) is True


    response = test_client.post("/login", json={
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }, timeout=5)
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert "Код не подтвержден" in response.json()["message"]


    with user_manager._get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET is_confirmed = TRUE WHERE email = %s",
                (TEST_USER["email"],)
            )
            conn.commit()


    response = test_client.post("/login", json={
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }, timeout=5)
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_cv_workflow(test_client):

    user_manager = test_client.app.dependency_overrides[get_user_manager]()
    user_manager.add_new_user(**TEST_USER)


    test_pdf = io.BytesIO(b"PDF_MOCK_CONTENT")
    response = test_client.post(
        "/upload-cv",
        data={"email": TEST_USER["email"]},
        files={"pdf_file": ("test_cv.pdf", test_pdf, "application/pdf")},
        timeout=10
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"


    response = test_client.get(f"/users/cv/{TEST_USER['email']}", timeout=5)
    assert response.status_code == 200
    assert "application/pdf" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    assert b"PDF_MOCK_CONTENT" in response.content


def test_error_cases(test_client):

    test_client.post("/users/register", json=TEST_USER, timeout=5)


    response = test_client.post("/users/register", json=TEST_USER, timeout=5)
    assert response.status_code == 400
    assert "already exists" in response.json().get("detail", "")


    response = test_client.post("/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    }, timeout=5)
    assert response.status_code == 401

    response = test_client.get("/users/cv/nonexistent@example.com", timeout=5)
    assert response.status_code == 404


    empty_file = io.BytesIO(b"")
    response = test_client.post(
        "/upload-cv",
        data={"email": TEST_USER["email"]},
        files={"pdf_file": ("empty.pdf", empty_file, "application/pdf")},
        timeout=5
    )
    assert response.status_code == 400


if __name__ == "__main__":
    pytest.main(["-v", __file__])