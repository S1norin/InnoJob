import psycopg2
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from config import db_host, db_name, db_user, db_password, origins, db_port
from database import VacancyManager
import os
import uuid

app = FastAPI()
database = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def connect_to_db():
    global database
    database = VacancyManager(host=db_host, dbname=db_name, user=db_user,
                            password=db_password, port=db_port)
    database.update_vacancies_from_source()

# Call initialize_db() when the app starts
@app.on_event("startup")
async def startup_event():
    connect_to_db()


@app.get("/vacancies")
def get_vacancies():
    try:
        if database is None:
            raise Exception("Database not connected")
        vacancies = database.get_vac_list()
        return vacancies
    except Exception as e:
        print(f"Error fetching vacancies: {e}")
        return []

@app.get("/test")
async def test():
    return {"message": "Hello World"}

"""
@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    try:
        # Check if database is connected
        if database is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database connection not established"
            )

        # Call your existing add_user method
        user_id = database.add_user(
            name=user_data.name,
            email=user_data.email,
            password=user_data.password
        )

        return {
            "status": "success",
            "message": "User registered successfully",
            "user_id": user_id,
            "email": user_data.email
        }

    except psycopg2.IntegrityError as e:
        if "unique_email" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database integrity error"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/upload-cv")
async def upload_cv(
    email: str = Form(...),
    pdfFile: UploadFile = File(...)
):
    try:
        if database is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database connection not established"
            )
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)

        unique_filename = f"{uuid.uuid4()}.pdf"
        temp_file_path = os.path.join(temp_dir, unique_filename)

        with open(temp_file_path, "wb") as buffer:
            buffer.write(await pdfFile.read())

        database.add_cv(
            user_email=email,
            pdf_path=temp_file_path,
            pdf_name=pdfFile.filename
        )

        try:
            os.remove(temp_file_path)
        except Exception as e:
            print(f"Warning: Could not delete temporary file {temp_file_path}: {e}")

        return {
            "status": "success",
            "message": "CV uploaded successfully",
            "filename": pdfFile.filename
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )"""