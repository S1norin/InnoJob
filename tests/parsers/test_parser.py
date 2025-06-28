import pytest
from unittest.mock import patch, MagicMock, call
import json
from time import sleep
from parsers.parser import (
    get_params,
    get_data_from_url,
    get_main_data,
    get_employer_data,
    get_city_data,
    employer_ids
)


@pytest.fixture
def mock_requests():
    with patch('requests.get') as mock_get:
        yield mock_get


@pytest.fixture
def mock_sleep():
    with patch('time.sleep') as mock:
        yield mock


def test_get_params():
    params = get_params()
    assert len(params) == len(employer_ids)
    for param in params:
        assert 'employer_id' in param
        assert param['per_page'] == 100
        assert param['page'] == 0
        assert param['only_with_salary'] is False


def test_get_data_from_url(mock_requests):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {'test': 'data'}
    mock_requests.return_value = mock_response

    result = get_data_from_url('http://test.com')
    assert result == mock_response
    mock_requests.assert_called_once_with('http://test.com')


def test_get_main_data_success(mock_requests, mock_sleep):
    # We'll only test with the first employer to keep tests fast
    test_employer = employer_ids[0]

    # Create mock responses
    mock_responses = []

    # Main response for first employer
    main_mock = MagicMock()
    main_mock.status_code = 200
    main_mock.json.return_value = {
        'items': [{
            'name': 'Test Vacancy',
            'area': {'id': '1'},
            'employer': {'id': test_employer},
            'salary': {
                'from': 1000,
                'to': 2000,
                'currency': 'USD'
            },
            'experience': {'name': '1-3 years'},
            'alternate_url': 'http://test.com/vacancy',
            'url': 'http://api.test.com/vacancy/1'
        }]
    }
    mock_responses.append(main_mock)

    # Details response
    details_mock = MagicMock()
    details_mock.status_code = 200
    details_mock.json.return_value = {
        'description': 'Test description',
        'key_skills': [{'name': 'Python'}, {'name': 'Pytest'}],
        'employer': {
            'logo_urls': {'90': 'http://test.com/logo.png'}
        }
    }
    mock_responses.append(details_mock)

    # Empty responses for all other employers
    for _ in employer_ids[1:]:
        empty_mock = MagicMock()
        empty_mock.status_code = 200
        empty_mock.json.return_value = {'items': []}
        mock_responses.append(empty_mock)

    mock_requests.side_effect = mock_responses

    vacancies = get_main_data()

    # Should get one vacancy for our test employer
    assert len(vacancies) == 1
    assert vacancies[0]['name'] == 'Test Vacancy'
    assert vacancies[0]['description'] == 'Test description'
    assert vacancies[0]['requirements_list'] == ['Python', 'Pytest']


def test_get_main_data_rate_limit(mock_requests, mock_sleep):
    # Test with first employer
    test_employer = employer_ids[0]

    # Create responses
    mock_responses = []

    # First request for test employer - rate limited
    rate_limit_mock = MagicMock()
    rate_limit_mock.status_code = 403

    # Second request for test employer - success
    success_mock = MagicMock()
    success_mock.status_code = 200
    success_mock.json.return_value = {'items': []}

    # For other employers, return empty responses
    for emp_id in employer_ids:
        if emp_id == test_employer:
            mock_responses.append(rate_limit_mock)
            mock_responses.append(success_mock)
        else:
            empty_mock = MagicMock()
            empty_mock.status_code = 200
            empty_mock.json.return_value = {'items': []}
            mock_responses.append(empty_mock)

    mock_requests.side_effect = mock_responses

    vacancies = get_main_data()

    # Should have empty results
    assert vacancies == []



def test_vacancy_details_error_handling(mock_requests, mock_sleep, capsys):
    # Test with first employer
    test_employer = employer_ids[0]

    # Create responses
    mock_responses = []

    # Main response for test employer
    main_mock = MagicMock()
    main_mock.status_code = 200
    main_mock.json.return_value = {
        'items': [{
            'name': 'Test Vacancy',
            'area': {'id': '1'},
            'employer': {'id': test_employer},
            'alternate_url': 'http://test.com/vacancy',
            'url': 'http://api.test.com/vacancy/1'
        }]
    }
    mock_responses.append(main_mock)

    # Details response fails
    details_mock = MagicMock()
    details_mock.status_code = 500
    # Simulate JSON decode error
    details_mock.json.side_effect = ValueError("JSON decode error")
    mock_responses.append(details_mock)

    # Empty responses for all other employers
    for _ in employer_ids[1:]:
        empty_mock = MagicMock()
        empty_mock.status_code = 200
        empty_mock.json.return_value = {'items': []}
        mock_responses.append(empty_mock)

    mock_requests.side_effect = mock_responses

    vacancies = get_main_data()

    # Should still get the vacancy but with default description
    assert len(vacancies) == 1
    assert vacancies[0]['description'] == "Описание не загружено"

    # Verify error was logged
    captured = capsys.readouterr()
    assert "Ошибка декодирования JSON" in captured.out


def test_get_employer_data(mock_requests):
    test_emp_id = employer_ids[0]
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'id': test_emp_id,
        'name': 'Test Company',
        'logo_urls': {'90': 'http://test.com/logo.png'}
    }
    mock_requests.return_value = mock_response

    result = get_employer_data(test_emp_id)
    assert result == {
        'emp_id': test_emp_id,
        'name': 'Test Company',
        'logo': 'http://test.com/logo.png'
    }


def test_get_city_data(mock_requests):
    test_area_id = '1'
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'id': test_area_id,
        'name': 'Moscow'
    }
    mock_requests.return_value = mock_response

    result = get_city_data(test_area_id)
    assert result == {
        'area_id': test_area_id,
        'name': 'Moscow'
    }