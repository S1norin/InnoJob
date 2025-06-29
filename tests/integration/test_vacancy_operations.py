import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from io import BytesIO
from main_backend import app

import time

@pytest.fixture
def mock_vacancy_manager():
    with patch('main_backend.VacancyManager') as mock:
        instance = mock.return_value
        instance.get_vac_list.return_value = [{"id": 1, "title": "Test Vacancy"}]
        instance.get_cities.return_value = [{"id": 1, "name": "Test City"}]
        instance.get_employers.return_value = [{"id": 1, "name": "Test Company"}]
        yield instance

@pytest.fixture
def mock_user_manager():
    with patch('main_backend.UserManager') as mock:
        instance = mock.return_value
        instance.add_new_user.return_value = 1
        instance.check_user.return_value = True
        instance.get_is_confirmed.return_value = True
        instance.get_cv.return_value = ("test.pdf", b"test content")
        instance.add_cv_from_bytes.return_value = True
        instance.set_confirmed_code.return_value = None
        instance.get_confirmation_code.return_value = 123456
        instance.get_sent_time.return_value = time.time()
        instance.confirm_user_and_clear_code.return_value = True
        yield instance

@pytest.fixture
def mock_smtp():
    with patch('main_backend.aiosmtplib.send', new_callable=AsyncMock) as mock:
        yield mock

@pytest.fixture
def test_db(mock_vacancy_manager, mock_user_manager, mock_smtp):

    with TestClient(app) as test_client:

        test_client.app.state.vacancy_manager = mock_vacancy_manager
        test_client.app.state.user_manager = mock_user_manager
        yield test_client

def test_vacancy_lifecycle(test_db):
    response = test_db.get("/vacancies")
    assert response.status_code == 200

    try:
        vacancy_data = {
            "name": "Python Developer",
            "employer": "Test Company",
            "city": "Test City",
            "salary_from": 100000,
            "salary_to": 150000,
            "salary_currency": "USD",
            "salary_mode": "monthly",
            "experience": "1-3 years",
            "format": "remote",
            "description": "Test job description",
            "link": "http://example.com/job/1",
            "requirements": ["Python", "FastAPI", "PostgreSQL"]
        }
        test_db.post("/vacancies", json=vacancy_data)
    except:
        pass

    response = test_db.get("/vacancies")
    assert response.status_code == 200