from pydantic import BaseModel, EmailStr
from typing import List

class UserCreate(BaseModel):
    name:str
    email:str
    password:str

#для удобного запроса пользовательских даных
class UserLoginRequest(BaseModel):
    email: str
    password: str

class ConfirmRequest(BaseModel):
    email: EmailStr
    code: int

class UserMail(BaseModel):
    mail: EmailStr

class NewPassword(BaseModel):
    mail: str
    new_password: str

class UserCard(BaseModel):
    name: str
    education_level: str
    age: int
    education_full: str
    description: str
    skills: List[str]

class CreateCard(BaseModel):
    education_level: str
    age: int
    education_full: str
    description: str
    skills: List[str]
