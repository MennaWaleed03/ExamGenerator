from fastapi import APIRouter,Depends,status,Request
from src.db.main import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from schemas import QuestionResponseModel,QuestionRequestModel,QuestionResponseModel
from src.services.ChapterService import chapter_service 
from fastapi.exceptions import HTTPException
from typing import List
from fastapi.templating import Jinja2Templates
from src.services.QuestionService import question_service
from fastapi.encoders import jsonable_encoder
chapters_router=APIRouter()

templates = Jinja2Templates(directory="src/templates")

@chapters_router.delete('/{chapter_id}')
async def delete_chapter(chapter_id:UUID,session:AsyncSession=Depends(get_session)):
    try:
        result =await chapter_service.delete_chapter(chapter_id,session)
        print (result)
        return result
  
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@chapters_router.post("/{chapter_id}/questions")
async def create_questions(chapter_id:UUID,questions:QuestionRequestModel,session:AsyncSession=Depends(get_session)):
    try:
        result= await question_service.create_questions(chapter_id=chapter_id,questions_bulk=questions,session=session)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))
    
@chapters_router.get('/{chapter_id}/questions',include_in_schema=False)
async def get_chapter_questions(request:Request,chapter_id:UUID,session:AsyncSession=Depends(get_session)):
    questions=await question_service.get_chapter_questions(chapter_id=chapter_id,session=session)
    questions_json = jsonable_encoder(questions)
    return  templates.TemplateResponse(
        "questions.html",
        {
            "request": request,
            "questions": questions,
            "questions_json": questions_json,
             "chapter_id": str(chapter_id),

             
        }
    )




@chapters_router.get('/api/{chapter_id}/questions',response_model=List[QuestionResponseModel])
async def get_questions(chapter_id:UUID,session:AsyncSession=Depends(get_session)):
    questions_and_choices = await question_service.get_chapter_questions(chapter_id=chapter_id,session=session)
    return questions_and_choices

