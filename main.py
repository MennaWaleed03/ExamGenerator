from pathlib import Path
from fastapi import FastAPI,Request,Depends
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from src.db.init_db import create_db
from src.routers.courses import courses_router
from src.db.main import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Course
from sqlalchemy import select
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
app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "src" / "static"),
    name="static"
)
app.include_router(courses_router,prefix='/courses',tags=["courses"])

