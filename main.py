from pathlib import Path
from fastapi import FastAPI,Depends
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from src.db.init_db import create_db
from src.routers.courses import courses_router
from src.routers.chapters import chapters_router
from src.routers.questions import questions_router
from src.routers.exams import exams_router
from src.routers.users import users_router
from src.errors import error_handler
from src.db.main import get_session
from fastapi.responses import RedirectResponse
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError,HTTPException

@asynccontextmanager
async def life_span(app:FastAPI):
    print("Server is Started")
    await create_db()
    yield

    print("Server has been stopped")



version="v1"

app=FastAPI(
version=version,
title="Exam Generator",
description="A REST API for a genertaing exams for different courses",
lifespan=life_span
)

templates = Jinja2Templates(directory="src/templates")
@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/users/login")



BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory="src/static"), name="static")
app.include_router(courses_router,prefix='/courses',tags=["courses"])
app.include_router(chapters_router,prefix='/chapters',tags=["chapters"])
app.include_router(questions_router,prefix='/questions',tags=["questions"])
app.include_router(exams_router,prefix='/exams',tags=["exams"])
app.include_router(users_router,prefix='/users',tags=["users"])

app.add_exception_handler(RequestValidationError,error_handler.validation_exception_handler) #type:ignore
app.add_exception_handler(StarletteHTTPException, error_handler.http_exception_handler)#type:ignore
