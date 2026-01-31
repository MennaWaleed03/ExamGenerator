from fastapi import APIRouter,Depends,status,Request,Response
from typing import List
from src.db.main import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from schemas import CourseCreateModel,CourseResponseModel,CourseEditModel,ChapterResponseModel,ExamDetailsRequestModel,QuestionResponseModel,ExamResponseModel
from src.services.CourseService import course_service
from src.services.ChapterService import chapter_service
from src.services.ExamService import exam_service
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse

from fastapi.templating import Jinja2Templates
courses_router=APIRouter()


@courses_router.post("",response_model=CourseResponseModel)
async def create_course(course_data:CourseCreateModel,session:AsyncSession=Depends(get_session)):
    try:
        course=await course_service.create_course(course_data=course_data,session=session)
        return course
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))


templates = Jinja2Templates(directory="src/templates")

@courses_router.get("", include_in_schema=False, name="courses")
async def home(request: Request, session:AsyncSession=Depends(get_session)):
    courses=await course_service.get_all_courses(session)

    courses_json = [
        {
            "id": str(c.id),  # UUID must be string
            "name": c.name,
            "number_of_chapters": c.number_of_chapters
        }
        for c in courses
    ]
    return templates.TemplateResponse(
       
        "course.html",
        {"request":request,"courses":courses,"courses_json":courses_json}
       
    )

@courses_router.patch("/{course_id}")
async def modify_course(course_id:UUID,course_data:CourseEditModel,session:AsyncSession=Depends(get_session)):
    try:
        result= await course_service.modify_course(course_id,course_data,session)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e)+ "Something went wrong please try again")
    return result

@courses_router.delete('/{course_id}')
async def delete_course(course_id:UUID,session:AsyncSession=Depends(get_session)):
    try:
        await course_service.delete_course(course_id,session)
        return {"message": "The course is deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))


@courses_router.get("/{course_id}/chapters")
async def get_course_chapters(request:Request,course_id:UUID,session:AsyncSession=Depends(get_session)):
    course=await course_service.get_course_by_id(course_id=course_id,session=session)
    try:
        chapters=await chapter_service.get_course_chapters(course_id,session)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))
    return templates.TemplateResponse(
        "chapters.html",
        {
            "request": request,
            "chapters": chapters,
             "course_id": str(course_id),
             "course_name":course.name
             
        }
    )

@courses_router.post("/{course_id}/chapters",response_model=ChapterResponseModel)
async def create_chapter(course_id:UUID,session:AsyncSession=Depends(get_session)):

        chapter=await chapter_service.create_new_chapter(course_id=course_id,session=session)
        return chapter


@courses_router.post('/{course_id}/Exam',response_model=ExamResponseModel)
async def generate_exam(course_id:UUID,exam_details:ExamDetailsRequestModel,session:AsyncSession=Depends(get_session)):
    generated_exam= await exam_service.generate_exam(course_id=course_id,exam_constraints=exam_details,session=session)
    return generated_exam


@courses_router.post('/api/{course_id}/Exam',response_model=ExamResponseModel)
async def generate_exam_test(course_id:UUID,exam_details:ExamDetailsRequestModel,session:AsyncSession=Depends(get_session)):
    generated_exam= await exam_service.generate_exam(course_id=course_id,exam_constraints=exam_details,session=session)
    return  generated_exam

@courses_router.post('/api/{course_id}/exams/{exam_id}/regenerate',response_model=ExamResponseModel)
async def regenerate_exam(course_id:UUID,exam_id:UUID,session:AsyncSession=Depends(get_session)):
    regenerated_exam=await exam_service.regenerate_exam(course_id=course_id,exam_id=exam_id,session=session)
    if not regenerated_exam:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Something went wrong please try again later")
    return regenerated_exam





@courses_router.get("/api/{course_id}/chapters")
async def get_all_course_chapters(request:Request,course_id:UUID,session:AsyncSession=Depends(get_session)):

    try:
        chapters=await chapter_service.get_course_chapters(course_id,session)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))
    return chapters



    
@courses_router.get("/api", response_model=list[CourseResponseModel])
async def courses_api(response:Response,session: AsyncSession = Depends(get_session)):

    response.headers["Cache-Control"] = "no-store, max-age=0, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return await course_service.get_all_courses(session)

@courses_router.get("/api/{course_id}")
async def get_course_by_id(course_id:UUID,session:AsyncSession=Depends(get_session)):
    pass

@courses_router.post("/api")
async def create_course_api(course_data:CourseCreateModel,session:AsyncSession=Depends(get_session)):
    try:
        course=await course_service.create_course(course_data=course_data,session=session)
        return course
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))