from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from database.database import VacancyManager
from database.telegram_database import TelegramManager
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
from fastapi.openapi.docs import get_swagger_ui_html
import time
from urllib.parse import quote
import psycopg2

app = FastAPI(docs_url=None, redoc_url=None)


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
app.mount("/fonts", StaticFiles(directory="fonts"), name="fonts")

security = HTTPBasic()

@app.on_event("startup")
async def startup_event():
    app.state.vacancy_manager = VacancyManager(host=db_host, dbname=db_name, user=db_user, password=db_password, port=db_port)
    app.state.user_manager = UserManager(host=db_host, dbname=db_name, user=db_user, password=db_password, port=db_port)
    app.state.telegram_manager = TelegramManager(host=db_host, dbname=db_name, user=db_user, password=db_password, port=db_port)
    await app.state.telegram_manager.initialize()
    print("Подключение к БД установлено и менеджеры готовы!")


def get_user_manager(request: Request) -> UserManager:
    return request.app.state.user_manager

def get_vacancy_manager(request: Request) -> VacancyManager:
    return request.app.state.vacancy_manager

def get_telegram_manager(request: Request) -> TelegramManager:
    return request.app.state.telegram_manager


async def verify_admin(
    credentials: HTTPBasicCredentials = Depends(security),
    db: UserManager = Depends(get_user_manager)
):
    try:
        # First, check if user even exists
        user_exists = await run_in_threadpool(db.user_in_base, credentials.username)
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Basic"},
            )

        # Then verify credentials
        is_correct = await run_in_threadpool(
            db.check_user,
            email=credentials.username,
            password=credentials.password
        )

        if not is_correct:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
                headers={"WWW-Authenticate": "Basic"},
            )

        # Finally check admin status
        is_admin = await run_in_threadpool(db.get_is_admin, credentials.username)
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required",
                headers={"WWW-Authenticate": "Basic"},
            )

        return credentials.username

    except HTTPException:
        # Re-raise known exceptions
        raise
    except Exception as e:
        # Log unexpected errors but don't reveal details
        print(f"Admin verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication"
        )

@app.get("/docs", include_in_schema=False)
async def get_swagger_documentation(current_admin: str = Depends(verify_admin)):
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="API Documentation (Admin Only)",
        swagger_ui_parameters={"syntaxHighlight.theme": "obsidian"}
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint(current_admin: str = Depends(verify_admin)):
    return app.openapi()

@app.get("/")
async def read_index():
    # Still in placeholder condition, as index page should automatically
    # redirect user to /job_listing if they're authorized

    # if authorized():
    #   read_job_listing()
    # else:
    #  read_welcome()

    return FileResponse('web/WelcomePage.html')

@app.get("/job_listing")
async def read_job_listing():
    # Placeholder, as there should be no access to this page
    # if user is unauthorized

    # if authorized():
    # return FileResponse('web/WelcomePage.html')

    return FileResponse('web/MainPage.html')

# Should be available for all users regardless of auth
@app.get("/welcome")
async def read_welcome():
    return FileResponse('web/WelcomePage.html')

@app.get("/confirmation")
async def read_confirm():
    return FileResponse('web/ConfirmPage.html')

@app.get("/email_page")
async def read_email():
    return FileResponse('web/EmailPage.html')

@app.get("/password_page")
async def read_password():
    return FileResponse('web/PasswordPage.html')


@app.get("/cv_listing_page")
async def serve_cv_listing_page():
    return FileResponse('web/MainCVs.html')

@app.get("/user_profile")
async def read_user_profile():
    return FileResponse('web/UserProfile.html')

@app.get("/vacancies")
async def get_all_vacancies(db: VacancyManager = Depends(get_vacancy_manager)):
    try:
        vacancies = await run_in_threadpool(db.get_vac_list)#по факту бахаем норм вызов получения джосона и чилим
        return vacancies
    except Exception as e:
        print(f"Server error getting vacancies: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch vacancies.")

@app.get("/telegram_vacancies")
async def get_telegram_vacancies(db: TelegramManager = Depends(get_telegram_manager)):
    try:
        vacancies = await run_in_threadpool(db.get_vac_list)#по факту бахаем норм вызов получения джосона и чилим
        return vacancies
    except Exception as e:
        print(f"Server error getting vacancies: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch vacancies.")

@app.get("/cv_listing")
async def get_all_cv_cards(db: UserManager = Depends(get_user_manager)):
    try:
        cards = await run_in_threadpool(db.get_literally_all_cards)
        return cards
    except Exception as e:
        print(f"Server error getting all CV cards: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch CV cards.")


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


async def send_email_utility(message: EmailMessage):
    smtp_client = aiosmtplib.SMTP(hostname=SMTP_HOST, port=SMTP_PORT)
    try:
        await smtp_client.connect()
        # Вызов starttls() УБРАН, так как aiosmtplib делает это автоматически

        await smtp_client.login(SMTP_USER, SMTP_PASSWORD)
        await smtp_client.send_message(message)

        print(f"Сообщение успешно отправлено на адрес {message['To']}")

    except aiosmtplib.SMTPException as e:
        print(f"Ошибка SMTP при отправке письма: {e}")
        # Для бэкенда важно не раскрывать детали ошибки пользователю
        raise HTTPException(
            status_code=500,
            detail="Не удалось отправить письмо. Попробуйте позже."
        )
    finally:
        if smtp_client.is_connected:
            await smtp_client.quit()

async def create_password(user_mail: str, db: UserManager = Depends(get_user_manager)):
    code = secrets.randbelow(900000) + 100000
    await run_in_threadpool(db.set_confirmed_code, user_mail, code)
    return {"detail": "Код подтверждения успешно отправлен."}

async def send_verification(user_mail: str, db: UserManager = Depends(get_user_manager)):
    code = await run_in_threadpool(db.get_confirmation_code, user_mail)
    if not code:
        raise HTTPException(status_code=400, detail="Код подтверждения не найден или истек.")

    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = user_mail
    message["Subject"] = "Ваш код подтверждения"
    message.set_content(f"Здравствуйте!\n\nВаш код для подтверждения: {code}")

    await send_email_utility(message)


#уже поинтереснее
@app.post("/users/register")
async def register_user(user_data: UserCreate, db: UserManager = Depends(get_user_manager)):
    try:
        in_base = await run_in_threadpool(db.is_user_exist,email=user_data.email)
        state = await run_in_threadpool(db.is_login, email = user_data.email)
        if in_base and not(state):
            await run_in_threadpool(db.drop_user, email=user_data.email)
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
@app.post("/users/cv/{user_email}/{card_number}")
async def upload_cv(
    card_number: int,
    db: UserManager = Depends(get_user_manager),
    email: str = Form(...),
    pdf_file: UploadFile = File(...)#получаем файл (эта важна)
):
    pdf_content_bytes = await pdf_file.read()

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
            card_number=card_number,
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
@app.get("/users/cv/{user_email}/{card_number}")
async def download_cv(
    user_email: str,
    card_number: int,
    db: UserManager = Depends(get_user_manager)
):

    try:
        file_name, pdf_content = await run_in_threadpool(
            db.get_cv,#вызываем функцию для получения фийла в виде байнари говна
            user_email=user_email,
            card_number=card_number
        )

        if not pdf_content:# ноу контент((
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Резюме для пользователя '{user_email}' не найдено."
            )

        if not file_name:
            raise HTTPException(status_code=404, detail="File name is missing")
        headers = {
            'Content-Disposition': f'attachment; filename=\"{quote(file_name)}\"; filename*=UTF-8\'\'{quote(file_name)}'
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
        await run_in_threadpool(db.set_login_state, email=login_data.email, state = True)
        return {"status": "success", "message": "Вход выполнен успешно"}
    elif not(db.get_is_confirmed(login_data.email)):
        return {"status": "error", "message": "Код не подтвержден. Пройдите регистрацию заново"}
    else:
        raise HTTPException(#в ином случае ну и пошло все в жопу
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )

@app.post("/is_log")
async def is_log(email: UserMail ,db: UserManager = Depends(get_user_manager)):
    state:bool = await run_in_threadpool(db.is_login, email = email.mail)
    return {"is_log": state}

@app.post("/cancle_log")
async def not_log(email: UserMail ,db: UserManager = Depends(get_user_manager)):
    await run_in_threadpool(db.set_login_state, email = email.mail, state = False)
    return {"user_status": False}

# Named function this strange to avoid name collision with /login
@app.get("/log_in_page")
async def read_login():
    # Placeholder, as this page shouldn't be available if user is already authorized

    # if authorized():
    #     return FileResponse('web/LogInPage.html')
    # else:
    #     pass

    return FileResponse('web/LogInPage.html')

# Named function this strange to be similiar to /log_in_page
@app.get("/sign_up_page")
async def read_signup():
    # Placeholder, as this page shouldn't be available if user is already authorized

    # if authorized():
    #     return FileResponse('web/LogInPage.html')
    # else:
    #     pass

    return FileResponse('web/SignUpPage.html')


    # Используем нашу новую функцию-утилиту для отправки
    await send_email_utility(message)

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


@app.post("/users/photo/{user_email}/{card_number}")
async def upload_photo(
    card_number: int,
    db: UserManager = Depends(get_user_manager),
    email: str = Form(...),
    photo: UploadFile = File(...) #получаем фотографию рожи пользователя
):
    photo_content_bytes = await photo.read() #захерачиваем его в бинарный вид чтобы не сохранять

    if not photo.filename or len(photo.filename) < 4:
        raise HTTPException(status_code=400, detail="Invalid photo filename")
    ext = photo.filename.lower().split('.')[-1]
    if ext not in ("png", "jpg", "jpeg"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Photo can be only jpg, jpeg or png, not {ext}"
        )

    if not photo_content_bytes: #если он пуст то нахер его
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    try:
        #если не пуст асинхронно вызываем сохранение этого говна
        await run_in_threadpool(
            db.add_photo_from_bytes,
            user_email=email,
            card_number=card_number,
            photo_content=photo_content_bytes,
            photo_name=photo.filename
        )
        #если все ок то пишем сак эсс и чилим
        return {
            "status": "success",
            "message": "Photo file uploaded successfully",
            "filename": photo.filename
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        print(f"Internal server error during photo upload: {e}") # Логируем для отладки
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred while processing the file."
        )

@app.get("/users/photo/{user_email}/{card_number}")
async def download_photo(
    user_email: str,
    card_number: int,
    db: UserManager = Depends(get_user_manager)
):

    try:
        file_name, photo_content = await run_in_threadpool(
            db.get_photo,#вызываем функцию для получения фийла в виде байнари говна
            user_email=user_email,
            card_number=card_number
        )

        if not photo_content:# ноу контент((
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Фото для пользователя '{user_email}' не найдено."
            )

        if not file_name:
            raise HTTPException(status_code=404, detail="File name is missing")
        headers = {
            'Content-Disposition': f'attachment; filename=\"{quote(file_name)}\"; filename*=UTF-8\'\'{quote(file_name)}'
        }

        return StreamingResponse(#отправляем ответ
            io.BytesIO(photo_content),  # Содержимое файла
            media_type=f"image/{file_name[-3:]}",  # Сообщаем, что это PNG или JPG
            headers=headers  # Добавляем заголовок для скачивания
        )

    except Exception as e:
        print(f"Ошибка при попытке скачать фото: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера при получении файла."
        )

@app.post("/users/{user_email}/cards")
async def add_user_card(user_email: str, data:CreateCard, db: UserManager = Depends(get_user_manager)):
    result = await run_in_threadpool(db.user_in_base, user_email) # проверяем что долбанафт есть в базе данных
    if result:
        card_id = await run_in_threadpool(db.add_user_card, user_email, data.education_level, data.education_full, data.age, data.description, data.skills) # запихуиваем всю инфу в таблицу
        return {"access":True, "message":"User in base", "card_id":card_id}
    else:
        return {"access": False, "message": "User not in base"}

#endpoint for checking
@app.get("/users/{user_email}/cards")
async def get_all_user_cards(user_email: str, db: UserManager = Depends(get_user_manager)):
    try:
        cards = await run_in_threadpool(db.get_all_user_cards, user_email)
        return cards
    except Exception as e:
        print(f"Server error getting all user cards: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch user cards.")

@app.get("/users/{user_email}/cards/{card_id}")
async def get_user_card(user_email: str, card_id: int, db: UserManager = Depends(get_user_manager)):
    try:
        user_info = await run_in_threadpool(db.get_user_card, user_email, card_id)# получаем говно в виде словаря
        return UserCard(**user_info) # Распихать полученное говно по параметрам модели UserInfo
    except Exception as e:
        print(f"Server error getting user info: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch user info.")

@app.delete("/users/{user_email}/cards/{card_id}")
async def delete_user_card(user_email: str, card_id: int, db: UserManager = Depends(get_user_manager)):
    result = await run_in_threadpool(db.user_in_base, user_email) # проверяем что долбанафт есть в базе данных
    if result:
        await run_in_threadpool(db.delete_user_card, user_email, card_id) # сносим нафиг
        return {"access":True, "message":"User in base"}
    else:
        return {"access": False, "message": "User not in base"}

@app.patch("/users/{user_email}/cards/{card_id}")
async def edit_user_card(user_email: str, card_id: int, data:CreateCard, db: UserManager = Depends(get_user_manager)):
    result = await run_in_threadpool(db.user_in_base, user_email) # проверяем что долбанафт есть в базе данных
    if result:
        await run_in_threadpool(db.edit_user_card, user_email, card_id, data.education_level, data.education_full, data.age, data.description, data.skills) # запихуиваем всю инфу в таблицу
        return {"access":True, "message": "User in base"}
    else:
        return {"access": False, "message": "User not in base"}

@app.get("/users/{user_email}/name")
async def get_user_card(user_email: str, db: UserManager = Depends(get_user_manager)):
    try:
        name = await run_in_threadpool(db.get_name, user_email)# получаем говно в виде словаря
        return {"name":name} # Распихать полученное говно по параметрам модели UserInfo
    except Exception as e:
        print(f"Server error getting user info: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch user info.")





