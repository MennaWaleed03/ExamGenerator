from src.services.ChapterService import chapter_service
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.db.models import Question,Choice
from fastapi.exceptions import HTTPException
from fastapi import status
from uuid import UUID
from schemas import QuestionRequestModel,QuestionEditModel
from collections import defaultdict
from sqlalchemy.orm import selectinload

 
class QuestionService:

        
    async def validate_questions(self,questions:QuestionRequestModel,session:AsyncSession):

        difficulty_count:dict = defaultdict(int)
        objective_count :dict= defaultdict(int)

        for question in questions.questions:

            q = question.model_dump()
            difficulty_count[q["difficulty"]] += 1
            objective_count[q["objective"]] += 1

        if len(set(difficulty_count.values())) != 1 or len(difficulty_count.keys())!=2:
            return False

        if len(set(objective_count.values())) != 1 or len(objective_count.keys())!=3:
            return False

        return True
    


    async def create_questions(self,chapter_id:UUID,questions_bulk:QuestionRequestModel,session:AsyncSession):

        chapter= await chapter_service.get_chapter_by_id(chapter_id=chapter_id,session=session)
        result_list = []
        if chapter.completed==True:
            raise HTTPException(status_code=status.HTTP_302_FOUND,detail="The chapter already have 12 questions")

        async with session.begin_nested():

            is_questions_valid=await self.validate_questions(questions=questions_bulk,session=session)
            if not is_questions_valid:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The questions should be eqully distributed")
            

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


            chapter.completed=True
            await session.commit()
  
            
        return result_list
    async def get_question_by_id(self,question_id:UUID,session:AsyncSession):
        result= await session.execute(select(Question).where(Question.id==question_id).options(selectinload(Question.choices)))

        question =result.scalars().first()
        if question:
            return question
        else :
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The questions doesn't exist") 
    
    async def get_chapter_questions(self,chapter_id:UUID,session:AsyncSession):

        chapter= await chapter_service.get_chapter_by_id(chapter_id=chapter_id,session=session)
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The Chapter is not exist")
        result= await session.execute(select(Question).where(Question.chapter_id==chapter_id).options(selectinload(Question.choices)))
        questions_with_choices=result.scalars().all()

        return questions_with_choices

    async def edit_question(self,question_id:UUID,data_body:QuestionEditModel,session:AsyncSession):

        result= await session.execute(select(Question).where(Question.id==question_id).options(selectinload(Question.choices)))
        question=result.scalars().first()
        choices=data_body.choices

        if sum(choice.is_correct for choice in choices)!=1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="There must me one correct choice")

        question.content=data_body.content #type:ignore

        for i,choice in enumerate(question.choices):#type:ignore
            choice.content=choices[i].content
            choice.is_correct=choices[i].is_correct
        await session.commit()
        new_question= await self.get_question_by_id(question_id=question_id,session=session)
        return new_question
question_service= QuestionService()