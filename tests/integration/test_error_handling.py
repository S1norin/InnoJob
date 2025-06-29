import pytest
from fastapi.testclient import TestClient
from main_backend import app
import psycopg2
import os
import io
from unittest.mock import patch, MagicMock
from config import db_password, db_port, db_name, db_host, db_user


TEST_DB_CONFIG = {
    "host": db_host,
    "dbname": db_name + "_test",
    "user": db_user,
    "password": db_password,
    "port": db_port
}

# Mock HH.ru API responses
MOCK_HH_RESPONSE = {
    "items": [],
    "found": 0,
    "pages": 0,
    "per_page": 0,
    "page": 0
}

MOCK_EMPLOYER_RESPONSE = {
    "name": "Test Company",
    "description": "Test description"
}

@pytest.fixture(scope="session", autouse=True)
def mock_external_services():

    with patch('requests.get') as mock_get:
        mock_get.return_value.json.return_value = MOCK_HH_RESPONSE
        mock_get.return_value.status_code = 200
        mock_get.side_effect = lambda url, **kwargs: (
            MagicMock(json=lambda: MOCK_EMPLOYER_RESPONSE, status_code=200)
            if "employers/" in url else
            MagicMock(json=lambda: MOCK_HH_RESPONSE, status_code=200)
        )
        yield

@pytest.fixture(scope="module")
def test_db():

    admin_conn = psycopg2.connect(
        host=TEST_DB_CONFIG["host"],
        user=TEST_DB_CONFIG["user"],
        password=TEST_DB_CONFIG["password"],
        port=TEST_DB_CONFIG["port"]
    )
    admin_conn.autocommit = True
    admin_cur = admin_conn.cursor()


    admin_cur.execute(f"""
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '{TEST_DB_CONFIG["dbname"]}'
        AND pid <> pg_backend_pid();
    """)


    admin_cur.execute(f"DROP DATABASE IF EXISTS {TEST_DB_CONFIG['dbname']}")
    admin_cur.execute(f"CREATE DATABASE {TEST_DB_CONFIG['dbname']}")
    admin_cur.close()
    admin_conn.close()

    os.environ.update({
        "DB_HOST": TEST_DB_CONFIG["host"],
        "DB_NAME": TEST_DB_CONFIG["dbname"],
        "DB_USER": TEST_DB_CONFIG["user"],
        "DB_PASSWORD": TEST_DB_CONFIG["password"],
        "DB_PORT": str(TEST_DB_CONFIG["port"]),
        "TESTING": "True"
    })


    with TestClient(app) as client:
        # Trigger startup event
        client.get("/")
        yield client

    admin_conn = psycopg2.connect(
        host=TEST_DB_CONFIG["host"],
        user=TEST_DB_CONFIG["user"],
        password=TEST_DB_CONFIG["password"],
        port=TEST_DB_CONFIG["port"]
    )
    admin_conn.autocommit = True
    admin_cur = admin_conn.cursor()


    admin_cur.execute(f"""
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '{TEST_DB_CONFIG["dbname"]}'
        AND pid <> pg_backend_pid();
    """)

    admin_cur.execute(f"DROP DATABASE {TEST_DB_CONFIG['dbname']}")
    admin_cur.close()
    admin_conn.close()

TEST_USER = {
    "name": "Test User",
    "email": "test@example.com",
    "password": "securepassword123"
}

def test_error_handling(test_db):


    response = test_db.post("/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code != 500


    response1 = test_db.post("/users/register", json=TEST_USER)
    response2 = test_db.post("/users/register", json=TEST_USER)
    assert response2.status_code != 500


    response = test_db.post(
        "/upload-cv",
        files={"pdf_file": ("test.pdf", io.BytesIO(b"test"), "application/pdf")},
        data={"email": "nonexistent@example.com"}
    )
    assert response.status_code != 500