origins = [
    "http://localhost:63342",
]
params = {
                "area": 2734, # Код региона (можно уточнить, если нужен другой)
                "per_page": 100, # Уменьшил для скорости тестов, можно вернуть 100
                "page": 0,
                "only_with_salary": False
            }

db_host="localhost"
db_name="postgres"
db_user="sinorin"
db_password="123"
db_port=5432

telegram_api_id, telegram_api_hash = '', ''