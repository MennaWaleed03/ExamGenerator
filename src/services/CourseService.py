from schemas import CourseCreateModel,CourseEditModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.db.models import Course,Chapter
from fastapi.exceptions import HTTPException
from fastapi import status
from uuid import UUID
from sqlalchemy.orm import selectinload
class CourseService:

    async def is_course_exist(self,course_name,session:AsyncSession):
        statement= select(Course).where(Course.name==course_name)
        result=await session.execute(statement)

        return True if result.scalars().first() else False

    async def is_coursename_valid(self,course_name:str,session:AsyncSession):
        return not course_name.isnumeric()
    
    async def get_course_by_id(self,course_id:UUID,session:AsyncSession):
        statement= select(Course).where(Course.id==course_id)
        result= await session.execute(statement)
        course= result.scalars().first()
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The course doesn't exist")
        
        return course

    async def create_course(self,course_data:CourseCreateModel,session:AsyncSession):
        course_data_dict=course_data.model_dump()
        course_name_valid=await self.is_coursename_valid(course_data_dict["name"],session)

        if not course_name_valid:

            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Course Name can't be numbers only")
        course_exist=await self.is_course_exist(course_data_dict["name"],session)


        if course_exist:

            raise HTTPException(status_code=status.HTTP_409_CONFLICT,detail="the course already exist")
        new_course=Course(**course_data_dict)


        session.add(new_course)
        await session.flush()
        

        chapters = [ 
            Chapter(course_id=new_course.id,chapter_number=i + 1 )
            for i in range(new_course.number_of_chapters)
        ]

        session.add_all(chapters)
        await session.commit()
        await session.refresh(new_course)
        return new_course
    
    async def get_all_courses(self,session:AsyncSession):
        result= await session.execute(
            select(Course)
            .order_by(Course.updated_at.desc()))
        courses = result.scalars().all()

        return courses

    


    async def modify_course(self,course_id:UUID,course_data:CourseEditModel,session:AsyncSession):
        course=await self.get_course_by_id(course_id=course_id,session=session)
        course.name=course_data.name
        
        await session.commit()
        return course
    
    async def delete_course(self,course_id:UUID,session:AsyncSession):
        course=await self.get_course_by_id(course_id=course_id,session=session)
        if course:
            await session.delete(course)
            await session.commit()
            return
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The course doesn't exist")

course_service=CourseService()