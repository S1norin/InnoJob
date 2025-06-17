from pydantic import BaseModel

class UserCreate(BaseModel):
    name:str
    email:str
    password:str

#для удобного запроса пользовательских даных
class UserLoginRequest(BaseModel):
    email: str
    password: str