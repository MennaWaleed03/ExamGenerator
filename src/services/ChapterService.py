from src.services.CourseService import course_service
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.db.models import Chapter,Course
from fastapi.exceptions import HTTPException
from fastapi import status
from uuid import UUID
from sqlalchemy.orm import selectinload
class ChapterService:
    
    async def get_course_chapters(self,course:Course,session:AsyncSession):
        if not course:
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The course doesn't exist")
        
        stmt = (
        select(Chapter)
        .where(Chapter.course_id == course.id).options(selectinload(Chapter.questions)).order_by(Chapter.chapter_number.asc()))

        result = await session.execute(stmt)
    
        chapters = result.scalars().all()
        
        return chapters  if chapters  else []
    
    async def get_chapter_by_id(self,chapter_id:UUID,session:AsyncSession):
        statement=select(Chapter).where(Chapter.id==chapter_id)
        result= await session.execute(statement=statement)
        chapter=result.scalars().first()
        if chapter:
            return chapter
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The chapter doesn't exist")

    async def create_new_chapter(self,course_id,teacher_id:UUID, session:AsyncSession,):
        course= await course_service.get_course_by_id(course_id=course_id,teacher_id=teacher_id,session=session)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The course doesn't exist")
        num_of_existing_chapters=course.number_of_chapters
        new_chapter_number=num_of_existing_chapters+1
        new_chapter=Chapter(course_id=course_id,
    chapter_number=new_chapter_number)
        
        session.add(new_chapter)
        course.number_of_chapters = new_chapter_number
        await session.commit()
        await session.refresh(new_chapter)
        return new_chapter

    async def delete_chapter(self,chapter_id:UUID,teacher_id:UUID,session:AsyncSession):

        chapter=await self.get_chapter_by_id(chapter_id=chapter_id,session=session)

        course= await course_service.get_course_by_id(course_id=chapter.course_id,teacher_id=teacher_id,session=session)

        await session.delete(chapter)

        course.number_of_chapters-=1

        result = await session.execute(
            select(Chapter)
            .where(Chapter.course_id == course.id)
            .order_by(Chapter.chapter_number.asc())
        )
        chapters = result.scalars().all()

        for i, ch in enumerate(chapters, start=1):
            ch.chapter_number = i #type:ignore

        await session.commit()
        return {"ok": True}




        


chapter_service=ChapterService()