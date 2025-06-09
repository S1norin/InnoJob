from pydantic import BaseModel, HttpUrl
from typing import List, Optional

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class Vacancy(BaseModel):
    name: str
    salary_from: Optional[int] = None
    salary_to: Optional[int] = None
    form: str
    description_full: str
    url_alternate: str
    requirements_list: List[str] = []