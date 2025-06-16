from fastapi.middleware.cors import CORSMiddleware
from database import VacancyManager
from config import db_host, db_name, db_user, db_password, origins, db_port
from fastapi.responses import StreamingResponse
import io
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.concurrency import run_in_threadpool
from databaseUsers import UserManager
from Extra_classes import *

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def connect_to_db():
    global vacancy_manager
    global user_manager
    vacancy_manager = VacancyManager(host=db_host, dbname=db_name, user=db_user, password=db_password, port=db_port)
    user_manager = UserManager(host=db_host, dbname=db_name, user=db_user, password=db_password, port=db_port)


def get_user_manager():
    return user_manager

def get_vacancy_manager():
    return vacancy_manager

# Call initialize_db() when the app starts
@app.on_event("startup")
async def startup_event():
    connect_to_db()


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


#уже поинтереснее
@app.post("/users/register")
async def register_user(user_data: UserCreate, db: UserManager = Depends(get_user_manager)):
    try:
        user_id = await run_in_threadpool(
            db.add_new_user,
            name=user_data.name, email=user_data.email, password=user_data.password
        )
        #я пошутил все так же простто вызываем функцию (но зато как)
        return {"message": "User registered", "user_id": user_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
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
    if is_correct:#если да то говорим что все круто
        return {"status": "success", "message": "Вход выполнен успешно"}
    else:
        raise HTTPException(#в ином случае ну и пошло все в жопу
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )