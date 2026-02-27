from src.services.ChapterService import chapter_service
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,update
from src.db.models import Question,Choice,Chapter,Course
from fastapi.exceptions import HTTPException
from fastapi import status
from uuid import UUID
from schemas import QuestionRequestModel,QuestionEditModel

from sqlalchemy.orm import selectinload
from sqlalchemy.sql import func
 
class QuestionService:

        
    async def validate_questions(self,questions:QuestionRequestModel,session:AsyncSession):
        unique_questions=set()
        


        for question in questions.questions:

            q = question.model_dump()

            unique_questions.add(q["content"])
            unique_choices=set()
            for choice in q["choices"]:
                
                unique_choices.add(choice["content"])
            if len(unique_choices)!=3:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The Choices for every question should be unique")


        if len(unique_questions)!=len(questions.questions):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The questions should be unique")

        

        return True
    


    async def create_questions(self,chapter_id:UUID,teacher_id:UUID,questions_bulk:QuestionRequestModel,session:AsyncSession):

        chapter= await chapter_service.get_chapter_by_id(chapter_id=chapter_id,session=session)
        stmt=await session.execute((select(Course)
              .join(Chapter,Course.id==Chapter.course_id)
              .where(Course.id==chapter.course_id,
                     Course.teacher_id==teacher_id)))
        teacher_has_access=stmt.scalars().first()
        if teacher_has_access is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User don't have access to generate questions for this chapter")
        result_list = []

        async with session.begin_nested():

            is_questions_valid=await self.validate_questions(questions=questions_bulk,session=session)
            if not is_questions_valid:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The questions and choices should be unique")
            

            for question in questions_bulk.questions:
                
                question_dict=question.model_dump()

                choices=question_dict["choices"]
                if sum(choice["is_correct"] for choice in choices) !=1:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="There are more than right choice")
                

                del question_dict['choices']
                question_dict["chapter_id"]=chapter_id


                new_question=Question(** question_dict)
                session.add(new_question)
                await session.flush()
                created_choices = []
                for choice in choices:
  
                    new_choice=Choice(**choice,question_id=new_question.id)
                    
                    session.add(new_choice)
                    await session.flush()
                    created_choices.append({
                    "id": new_choice.id,
                    "content": new_choice.content,
                    "is_correct": new_choice.is_correct
                })
                
                result_list.append({
                "id": new_question.id,
                "content": new_question.content,
                "difficulty": new_question.difficulty,
                "objective": new_question.objective,
                "choices": created_choices
                 })


                await session.execute(
                    update(Chapter)
                    .where(Chapter.id == chapter.id)
                    .values(updated_at=func.now()))

            await session.commit()
  
            
        return result_list
    async def get_question_by_id(self,question_id:UUID,teacher_id:UUID,session:AsyncSession):
        result= await session.execute((select(Question)
                                      .join(Chapter,Chapter.id==Question.chapter_id)
                                      .join(Course,Chapter.course_id==Course.id)
                                      .where(Question.id==question_id,
                                             Course.teacher_id==teacher_id)
                                      .options(selectinload(Question.choices))))

        question =result.scalars().first()
        if question:
            return question
        else :
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The questions doesn't exist or user don't have access for this question") 
    
    async def get_chapter_questions(self,chapter_id:UUID,teacher_id:UUID,session:AsyncSession):

        chapter= await chapter_service.get_chapter_by_id(chapter_id=chapter_id,session=session)
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The Chapter is not exist")
        stmt=await session.execute((select(Course)
              .join(Chapter,Course.id==Chapter.course_id)
              .where(Course.id==chapter.course_id,
                     Course.teacher_id==teacher_id)))
        teacher_has_access=stmt.scalars().first()
        if teacher_has_access is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User don't have access to generate questions for this chapter")
        result= await session.execute(select(Question).where(Question.chapter_id==chapter_id).options(selectinload(Question.choices)))
        questions_with_choices=result.scalars().all()

        return questions_with_choices

    async def edit_question(self,teacher_id:UUID,question_id:UUID,data_body:QuestionEditModel,session:AsyncSession):

        question= await self.get_question_by_id(question_id=question_id,teacher_id=teacher_id,session=session)

        choices=data_body.choices


        if sum(choice.is_correct for choice in choices)!=1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="There must me one correct choice")
        if  not data_body.content or str(data_body.content).isnumeric():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Please enter a valid question")
        
        for choice in choices :
            if  not choice.content or str(choice.content).isnumeric():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Please enter a valid choice content")


        question.content=data_body.content #type:ignore

        for i,choice in enumerate(question.choices):#type:ignore
            choice.content=choices[i].content
            choice.is_correct=choices[i].is_correct
        await session.commit()
        new_question= await self.get_question_by_id(question_id=question_id,teacher_id=teacher_id,session=session)
        return new_question
    
    async def delete_question_by_id(self,question_id:UUID,teacher_id:UUID,session:AsyncSession):
        question= await self.get_question_by_id(question_id=question_id,teacher_id=teacher_id,session=session)
        if not question:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The question doesn't exist")
        await session.delete(question)
        await session.commit()

        return {"ok": True}

question_service= QuestionService()