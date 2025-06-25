from pydantic import BaseModel, EmailStr

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