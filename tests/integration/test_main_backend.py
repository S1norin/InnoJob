import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from io import BytesIO
from main_backend import app
from Extra_classes import UserCreate, UserLoginRequest, ConfirmRequest
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
def client(mock_vacancy_manager, mock_user_manager, mock_smtp):
    # Create test client with app state initialized
    with TestClient(app) as test_client:
        # Initialize the app state with our mock managers
        test_client.app.state.vacancy_manager = mock_vacancy_manager
        test_client.app.state.user_manager = mock_user_manager
        yield test_client

def test_read_main(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/html; charset=utf-8"

def test_get_all_vacancies(client, mock_vacancy_manager):
    response = client.get("/vacancies")
    assert response.status_code == 200
    assert response.json() == [{"id": 1, "title": "Test Vacancy"}]
    mock_vacancy_manager.get_vac_list.assert_called_once()

def test_get_cities(client, mock_vacancy_manager):
    response = client.get("/cities")
    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "Test City"}]
    mock_vacancy_manager.get_cities.assert_called_once()

def test_get_companies(client, mock_vacancy_manager):
    response = client.get("/companies")
    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "Test Company"}]
    mock_vacancy_manager.get_employers.assert_called_once()

def test_test_endpoint(client):
    response = client.get("/test")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_register_user_success(client, mock_user_manager, mock_smtp):
    user_data = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "password123"
    }
    response = client.post("/users/register", json=user_data)
    assert response.status_code == 200
    assert response.json() == {"message": "User registered", "user_id": 1}
    mock_user_manager.add_new_user.assert_called_once_with(
        name="Test User", email="test@example.com", password="password123"
    )
    mock_user_manager.set_confirmed_code.assert_called()
    mock_smtp.assert_awaited()

def test_register_user_failure(client, mock_user_manager):
    mock_user_manager.add_new_user.side_effect = ValueError("Email already exists")
    user_data = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "password123"
    }
    response = client.post("/users/register", json=user_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already exists"

def test_upload_cv_success(client, mock_user_manager):
    test_file = BytesIO(b"test file content")
    response = client.post(
        "/upload-cv",
        files={"pdf_file": ("test.pdf", test_file, "application/pdf")},
        data={"email": "test@example.com"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    mock_user_manager.add_cv_from_bytes.assert_called_once()

def test_download_cv_success(client, mock_user_manager):
    response = client.get("/users/cv/test@example.com")
    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'attachment; filename="test.pdf"'
    assert response.content == b"test content"
    mock_user_manager.get_cv.assert_called_once_with(user_email="test@example.com")

def test_download_cv_not_found(client, mock_user_manager):
    mock_user_manager.get_cv.side_effect = ValueError("Резюме для пользователя 'nonexistent@example.com' не найдено.")
    response = client.get("/users/cv/nonexistent@example.com")
    assert response.status_code == 500

def test_login_success(client, mock_user_manager):
    login_data = {
        "email": "test@example.com",
        "password": "correctpassword"
    }
    response = client.post("/login", json=login_data)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    mock_user_manager.check_user.assert_called_once_with(
        email="test@example.com", password="correctpassword"
    )

def test_login_failure(client, mock_user_manager):
    mock_user_manager.check_user.return_value = False
    login_data = {
        "email": "test@example.com",
        "password": "wrongpassword"
    }
    response = client.post("/login", json=login_data)
    assert response.status_code == 401
    assert "Неверный email или пароль" in response.json()["detail"]

def test_login_unconfirmed(client, mock_user_manager):
    mock_user_manager.get_is_confirmed.return_value = False
    login_data = {
        "email": "test@example.com",
        "password": "correctpassword"
    }
    response = client.post("/login", json=login_data)
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert "Код не подтвержден" in response.json()["message"]

def test_confirm_login_success(client, mock_user_manager):
    confirm_data = {
        "email": "test@example.com",
        "code": "123456"
    }
    response = client.post("/login/confirm", json=confirm_data)
    assert response.status_code == 200
    assert response.json()["status"] is True
    mock_user_manager.confirm_user_and_clear_code.assert_called_once_with("test@example.com")

def test_confirm_login_expired(client, mock_user_manager):
    mock_user_manager.get_sent_time.return_value = time.time() - 301  # Expired
    confirm_data = {
        "email": "test@example.com",
        "code": "123456"
    }
    response = client.post("/login/confirm", json=confirm_data)
    assert response.status_code == 400
    assert "Время истекло" in response.json()["detail"]

def test_confirm_login_wrong_code(client, mock_user_manager):
    mock_user_manager.get_confirmation_code.return_value = 654321
    confirm_data = {
        "email": "test@example.com",
        "code": "123456"
    }
    response = client.post("/login/confirm", json=confirm_data)
    assert response.status_code == 400
    assert "Неверный код" in response.json()["detail"]