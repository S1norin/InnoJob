from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database.database import VacancyManager
from config import *
from fastapi.responses import StreamingResponse, FileResponse
import io
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.concurrency import run_in_threadpool
from database.databaseUsers import UserManager
from Extra_classes import *
from email.message import EmailMessage
import aiosmtplib
import secrets
import time

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the static directories
app.mount("/web", StaticFiles(directory="web"), name="web")
app.mount("/pics", StaticFiles(directory="pics"), name="pics")



@app.on_event("startup")
async def startup_event():
    app.state.vacancy_manager = VacancyManager(host=db_host, dbname=db_name, user=db_user, password=db_password, port=db_port)
    app.state.user_manager = UserManager(host=db_host, dbname=db_name, user=db_user, password=db_password, port=db_port)
    print("Подключение к БД установлено и менеджеры готовы!")


def get_user_manager(request: Request) -> UserManager:
    return request.app.state.user_manager

def get_vacancy_manager(request: Request) -> VacancyManager:
    return request.app.state.vacancy_manager

@app.get("/")
async def read_main():
    return FileResponse('web/MainPage.html')

@app.get("/vacancies")
async def get_all_vacancies(db: VacancyManager = Depends(get_vacancy_manager)):
    try:
        vacancies = await run_in_threadpool(db.get_vac_list)#по факту бахаем норм вызов получения джосона и чилим
        return vacancies
    except Exception as e:
        print(f"Server error getting vacancies: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch vacancies.")

@app.get("/cities")
async def get_cities(db: VacancyManager = Depends(get_vacancy_manager)):
    try:
        cities = await run_in_threadpool(db.get_cities)#по факту бахаем норм вызов получения джосона и чилим
        return cities
    except Exception as e:
        print(f"Server error getting cities: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch cities.")


@app.get("/companies")
async def get_companies(db: VacancyManager = Depends(get_vacancy_manager)):
    try:
        companies = await run_in_threadpool(db.get_employers)  # по факту бахаем норм вызов получения джосона и чилим
        return companies
    except Exception as e:
        print(f"Server error getting companies: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch companies.")


@app.get("/test")
async def test():
    return {"message": "Hello World"}

async def create_password(user_mail, db: UserManager = Depends(get_user_manager)):
    code = secrets.randbelow(900000)+100000
    await run_in_threadpool(db.set_confirmed_code, user_mail, code)


async def send_verification(user_mail, db: UserManager = Depends(get_user_manager)):
    code = await run_in_threadpool(db.get_confirmation_code, user_mail)
    if not code:
        raise HTTPException(status_code=400, detail="Код подтверждения не найден")
    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = user_mail
    message["Subject"] = "Password"
    message.set_content(f"Ваш код подтверждения: {code}")

    await aiosmtplib.send(
        message,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASSWORD,
        use_tls=True,
    )

#уже поинтереснее
@app.post("/users/register")
async def register_user(user_data: UserCreate, db: UserManager = Depends(get_user_manager)):
    try:
        user_id = await run_in_threadpool(
            db.add_new_user,
            name=user_data.name, email=user_data.email, password=user_data.password
        )
        await create_password(user_data.email, db)
        await send_verification(user_data.email, db)
        return {"message": "User registered", "user_id": user_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print("Ошибка при регистрации:", repr(e))
        raise HTTPException(status_code=500, detail="Internal server error.")

#загрузка гребанного пдф файла
@app.post("/upload-cv")
async def upload_cv(
    db: UserManager = Depends(get_user_manager),
    email: str = Form(...),
    pdf_file: UploadFile = File(...)#получаем файл (эта важна)
):
    pdf_content_bytes = await pdf_file.read()#захерачиваем его в бинарный вид чтобы не сохранять

    if not pdf_content_bytes:#если он пуст то нахер его
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    try:
        #если не пуст асинхронно вызываем сохранение этого говна
        await run_in_threadpool(
            db.add_cv_from_bytes,
            user_email=email,
            pdf_content=pdf_content_bytes,
            pdf_name=pdf_file.filename
        )
        #если все ок то пишем сак сес и чилим
        return {
            "status": "success",
            "message": "CV uploaded successfully",
            "filename": pdf_file.filename
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        print(f"Internal server error during CV upload: {e}") # Логируем для отладки
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred while processing the file."
        )


#тыбзим файл
@app.get("/users/cv/{user_email}")
async def download_cv(
    user_email: str,
    db: UserManager = Depends(get_user_manager)
):

    try:
        file_name, pdf_content = await run_in_threadpool(
            db.get_cv,#вызываем функцию для получения фийла в виде байнари говна
            user_email=user_email
        )

        if not pdf_content:# ноу контент((
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Резюме для пользователя '{user_email}' не найдено."
            )

        headers = {
            'Content-Disposition': f'attachment; filename="{file_name}"'#по факту самое сложное для ундерстендинга но на деле не сложно просто создаем описание того что браущеру надо сделать если прям интересно то попроси расшифровать иишку данное говно
        }

        return StreamingResponse(#отправляем ответ
            io.BytesIO(pdf_content),  # Содержимое файла
            media_type="application/pdf",  # Сообщаем, что это PDF
            headers=headers  # Добавляем заголовок для скачивания
        )

    except Exception as e:
        print(f"Ошибка при попытке скачать резюме: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера при получении файла."
        )

#функция для проверки есть ли пользователь в нашей системе
@app.post("/login")
async def login_user(
    login_data: UserLoginRequest,# нам автоматом это закидывается в класс
    db: UserManager = Depends(get_user_manager)
):
    is_correct: bool = await run_in_threadpool(#асинхронно спрашиваем есть ли такой педик в системе
        db.check_user,
        email=login_data.email,
        password=login_data.password
    )
    if is_correct and db.get_is_confirmed(login_data.email):#если да то говорим что все круто
        return {"status": "success", "message": "Вход выполнен успешно"}
    elif not(db.get_is_confirmed(login_data.email)):
        return {"status": "error", "message": "Код не подтвержден"}
    else:
        raise HTTPException(#в ином случае ну и пошло все в жопу
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )




async def create_password(user_mail, db: UserManager = Depends(get_user_manager)):
    code = secrets.randbelow(900000)+100000
    await run_in_threadpool(db.set_confirmed_code, user_mail, code)


async def send_verification(user_mail, db: UserManager = Depends(get_user_manager)):
    code = await run_in_threadpool(db.get_confirmation_code, user_mail)
    if not code:
        raise HTTPException(status_code=400, detail="Код подтверждения не найден")
    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = user_mail
    message["Subject"] = "Password"
    message.set_content(f"Ваш код подтверждения: {code}")

    await aiosmtplib.send(
        message,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASSWORD,
        use_tls=True,
    )

@app.post("/login/confirm")
async def check_password(data: ConfirmRequest, db: UserManager = Depends(get_user_manager)):
    code = await run_in_threadpool(db.get_confirmation_code, data.email)
    entry = await run_in_threadpool(db.get_sent_time, data.email)
    if not entry:
        raise HTTPException(status_code=404, detail="Пароль не пришел или время истекло")
    if time.time() - entry > 300:
        raise HTTPException(status_code=400, detail="Время истекло")
    if int(data.code) != code:
        raise HTTPException(status_code=400, detail="Неверный код")
    await run_in_threadpool(db.confirm_user_and_clear_code, data.email)
    return {"message": "Вход подтвержден", "status": True}


@app.post("/write-mail")
async def write_mail(data:UserMail, db: UserManager = Depends(get_user_manager)):
    result = await run_in_threadpool(db.user_in_base, data.mail)
    if result:
        await create_password(data.mail, db)
        await send_verification(data.mail, db)
        return {"access":True, "message":"User in base"}
    else:
        return {"access": False, "message": "User not in base"}



@app.post("/change_password")
async def change_password(data: NewPassword, db: UserManager = Depends(get_user_manager)):
    await run_in_threadpool(db.change_password, data.mail, data.new_password)
    return {"status":True, "message":"Password change"}

















