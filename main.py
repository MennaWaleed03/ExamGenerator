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

BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory="src/static"), name="static")
app.include_router(courses_router,prefix='/courses',tags=["courses"])
app.include_router(chapters_router,prefix='/chapters',tags=["chapters"])
app.include_router(questions_router,prefix='/questions',tags=["questions"])
app.include_router(exams_router,prefix='/exams',tags=["exams"])