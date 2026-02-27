from fastapi import APIRouter,Depends,status,Request
from src.db.main import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from src.services.ExamService import exam_service
from fastapi.exceptions import HTTPException
from fastapi.templating import Jinja2Templates
from schemas import  ExamResponseModel
from src.auth.dependencies import AccessTokenBearer
chapters_router=APIRouter()

templates = Jinja2Templates(directory="src/templates")


exams_router=APIRouter()

@exams_router.delete('/{exam_id}',status_code=status.HTTP_200_OK)
async def delete_exam(exam_id:UUID,session:AsyncSession=Depends(get_session),user_token_data=Depends(AccessTokenBearer())):
    teacher_id=UUID(user_token_data['user']['sub'])
    result= await exam_service.delete_exam(exam_id=exam_id,teacher_id=teacher_id,session=session)
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Couldn't delete the exams")
    return {"message":"Exam has been deleted successfully"}

@exams_router.patch('/{exam_id}')
async def save_exam(exam_id:UUID,session:AsyncSession=Depends(get_session),user_token_data=Depends(AccessTokenBearer())):
    teacher_id=UUID(user_token_data['user']['sub'])
    exam= await exam_service.save_exam(exam_id=exam_id,teacher_id=teacher_id,session=session)
    if not exam:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Couldn't save the exams")
    return exam

@exams_router.get('/{exam_id}/questions')
async def get_exam_questions(request:Request,exam_id:UUID,session=Depends(get_session),user_token_data=Depends(AccessTokenBearer())):
    teacher_id=UUID(user_token_data['user']['sub'])

    data=await exam_service.get_exam_questions(exam_id=exam_id,teacher_id=teacher_id,session=session)
    return templates.TemplateResponse(
        "exam_questions.html",
        {
            "request": request,
            "exam_questions": data, # list of questions , each question have id , content and list of choices
            "exam_id": str(exam_id),
    
        
             
        })