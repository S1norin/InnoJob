import pytest
from unittest.mock import patch, MagicMock, ANY
from database.database import VacancyManager

# Mock employer IDs for testing
TEST_EMPLOYER_IDS = [1, 2, 3]


@pytest.fixture
def mock_db():
    with patch('psycopg2.connect') as mock_connect, \
            patch('database.database.get_main_data') as mock_get_main, \
            patch('database.database.get_employer_data') as mock_get_emp, \
            patch('database.database.get_city_data') as mock_get_city, \
            patch('database.database.employer_ids', TEST_EMPLOYER_IDS):
        # Create mock connection objects
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn

        # Set up context manager behavior
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.__exit__.return_value = False
        mock_conn.cursor.return_value = mock_cursor

        # Set up cursor context manager behavior
        mock_cursor.__enter__.return_value = mock_cursor
        mock_cursor.__exit__.return_value = False

        # Set default return values
        mock_get_main.return_value = []
        mock_get_emp.return_value = {'emp_id': 1, 'name': 'Test', 'logo': 'logo.png'}
        mock_get_city.return_value = {'area_id': 1, 'name': 'City'}

        # Return all mocks
        yield {
            'connect': mock_connect,
            'conn': mock_conn,
            'cursor': mock_cursor,
            'get_main': mock_get_main,
            'get_emp': mock_get_emp,
            'get_city': mock_get_city
        }


def test_init(mock_db):
    vm = VacancyManager('host', 'db', 'user', 'pass', 5432)

    # Verify connection was established
    mock_db['connect'].assert_called_with(
        host='host', dbname='db', user='user', password='pass', port=5432
    )

    # Verify tables were created
    create_table_calls = [call[0][0] for call in mock_db['cursor'].execute.call_args_list]
    assert any('CREATE TABLE' in sql for sql in create_table_calls)


def test_get_vac_list(mock_db):
    # Configure mock return value
    mock_db['cursor'].fetchall.return_value = [
        (1, 'Vacancy', 'Employer', 'City', 1000, 2000, 'USD', None,
         '1-3 years', 'Full-time', 'Desc', 'link', 'logo.png', 'Python')
    ]

    vm = VacancyManager('host', 'db', 'user', 'pass', 5432)
    result = vm.get_vac_list()

    # Verify results
    assert len(result) == 1
    assert result[0]['name'] == 'Vacancy'
    assert result[0]['requirements'] == 'Python'


def test_update_vacancies(mock_db):
    # Setup test data
    test_vacancy = {
        'name': 'Test', 'city': 1, 'employer_id': 1,
        'salary_from': 1000, 'salary_to': 2000, 'salary_currency': 'USD',
        'salary_mode': None, 'experience': '1-3', 'form': 'Full',
        'description': 'Desc', 'link': 'link', 'requirements': ['Python']
    }
    mock_db['get_main'].return_value = [test_vacancy]

    # Create instance and patch internal methods
    vm = VacancyManager('host', 'db', 'user', 'pass', 5432)
    vm.find_city = MagicMock(return_value=1)
    vm.find_employer = MagicMock(return_value=1)

    # Reset mock to ignore previous calls from constructor
    mock_db['cursor'].reset_mock()

    # Perform update
    vm.update_vacancies_from_source()

    # Verify database operations
    executed_sql = [call[0][0] for call in mock_db['cursor'].execute.call_args_list]
    assert any('DROP TABLE' in sql for sql in executed_sql)
    assert any('CREATE TABLE' in sql for sql in executed_sql)
    assert any('INSERT INTO vacancies' in sql for sql in executed_sql)


def test_add_employer(mock_db):
    vm = VacancyManager('host', 'db', 'user', 'pass', 5432)

    # Reset mock to ignore previous calls from constructor
    mock_db['cursor'].reset_mock()

    vm.add_employer({'emp_id': 1, 'name': 'Test', 'logo': 'logo.png'})

    # Verify the insert call was made
    executed_sql = [call[0][0] for call in mock_db['cursor'].execute.call_args_list]
    assert any('INSERT INTO employers' in sql for sql in executed_sql)


def test_find_employer(mock_db):
    # Configure mock to return a real value
    mock_db['cursor'].fetchone.return_value = (1,)  # Return tuple, not list

    vm = VacancyManager('host', 'db', 'user', 'pass', 5432)
    result = vm.find_employer(1)

    # Verify we get a real integer
    assert result == 1
    assert isinstance(result, int)


def test_find_city_existing(mock_db):
    # Configure mock to return a real value
    mock_db['cursor'].fetchone.return_value = (1,)  # Return tuple, not list

    vm = VacancyManager('host', 'db', 'user', 'pass', 5432)
    result = vm.find_city(1)

    # Verify we get a real integer
    assert result == 1
    assert isinstance(result, int)


def test_find_city_new(mock_db):
    # First call: city not found (returns None)
    # Second call: return new ID
    mock_db['cursor'].fetchone.side_effect = [None, (2,)]
    mock_db['get_city'].return_value = {'area_id': 1, 'name': 'New City'}

    vm = VacancyManager('host', 'db', 'user', 'pass', 5432)
    result = vm.find_city(1)

    # Verify we get a real integer
    assert result == 2
    assert isinstance(result, int)


def test_get_employers(mock_db):
    # Configure mock to return real values
    mock_db['cursor'].fetchall.return_value = [('Emp1',), ('Emp2',)]

    vm = VacancyManager('host', 'db', 'user', 'pass', 5432)
    result = vm.get_employers()

    # Verify we get real strings
    assert result == ['Emp1', 'Emp2']
    assert all(isinstance(item, str) for item in result)


def test_get_cities(mock_db):
    # Configure mock to return real values
    mock_db['cursor'].fetchall.return_value = [('City1',), ('City2',)]

    vm = VacancyManager('host', 'db', 'user', 'pass', 5432)
    result = vm.get_cities()

    # Verify we get real strings
    assert result == ['City1', 'City2']
    assert all(isinstance(item, str) for item in result)