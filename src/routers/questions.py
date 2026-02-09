from fastapi import APIRouter,Depends,status,Request
from src.db.main import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from schemas import QuestionEditModel,QuestionResponseModel
from src.services.ChapterService import chapter_service 
from fastapi.exceptions import HTTPException
from typing import List
from fastapi.templating import Jinja2Templates
from src.services.QuestionService import question_service
from fastapi.encoders import jsonable_encoder
chapters_router=APIRouter()

templates = Jinja2Templates(directory="src/templates")


questions_router=APIRouter()

@questions_router.patch('/{question_id}',response_model=QuestionResponseModel)
async def edit_question(question_id:UUID,data_body:QuestionEditModel,session:AsyncSession=Depends(get_session)):

    result=await question_service.edit_question(question_id,data_body,session)
    return result

@questions_router.delete('/{question_id}')
async def delete_questions(question_id,session:AsyncSession=Depends(get_session)):

    result=await question_service.delete_question_by_id(question_id,session)
    if  result:
        return result

