from fastapi import APIRouter,Depends,status,Request
from src.db.main import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from src.services.ExamService import exam_service
from fastapi.exceptions import HTTPException
from fastapi.templating import Jinja2Templates

chapters_router=APIRouter()

templates = Jinja2Templates(directory="src/templates")


exams_router=APIRouter()

@exams_router.delete('/{exam_id}')
async def delete_exam(exam_id:UUID,session:AsyncSession=Depends(get_session)):
    result= await exam_service.delete_exam(exam_id=exam_id,session=session)
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Couldn't delete the exams")
    return {"message":"Exam has been deleted successfully"}

@exams_router.patch('/{exam_id}')
async def save_exam(exam_id:UUID,session:AsyncSession=Depends(get_session)):
    exam= await exam_service.save_exam(exam_id=exam_id,session=session)
    if not exam:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Couldn't save the exams")
    return exam