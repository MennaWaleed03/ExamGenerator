from src.services.GeneticAlgorithm import genetic_algorithm
from src.services.QuestionService import question_service
from src.services.ChapterService import chapter_service
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.exceptions import HTTPException
from fastapi import status
from src.db.models import Exam,Question,exam_question_table
from uuid import UUID
from schemas import QuestionResponseModel,ExamDetailsRequestModel
from sqlalchemy import insert,select,delete
from src.enums import ExamStatus

class ExamService:


    async def get_exam_by_id(self,exam_id:UUID,session:AsyncSession):
        statement=select(Exam).where(Exam.id==exam_id)
        result=await session.execute(statement)
        exam=result.scalars().first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The exam doesn't exist")
        return exam
    async def validate_number_of_questions(self,total_chapters_number:int,exam_constraints:ExamDetailsRequestModel,session:AsyncSession)->bool:

        total_objective_questions=4*total_chapters_number
        total_difficulty_questions=6*total_chapters_number
        if (exam_constraints.creative_questions> total_objective_questions) or(exam_constraints.understanding_questions>total_objective_questions) or(exam_constraints.remembring_questions>total_chapters_number) or(exam_constraints.difficult_questions>total_difficulty_questions)or(exam_constraints.simple_questions>total_difficulty_questions):
            raise  HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Invalid input numbers")
        total_questions=total_chapters_number *exam_constraints.questions_per_chapter

        if exam_constraints.questions_per_chapter>12:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="the number of qustions per chapter shouldn't excced 12")

        if (exam_constraints.difficult_questions+exam_constraints.simple_questions) !=total_questions:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The sum of difficult and simple questions must eqult the total required questiosn")
        
        if (exam_constraints.remembring_questions+exam_constraints.understanding_questions+exam_constraints.creative_questions) !=total_questions:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The sum of questions of different objectives must eqult the total required questiosn")
        
        return True
    
    async def get_all_course_questions(self,exam_constraints:ExamDetailsRequestModel,course_id:UUID,session:AsyncSession):
        total_questions: list[Question] = []

        chapters=await chapter_service.get_course_chapters(course_id=course_id,session=session)
        if not chapters:
            return [],0
        num_of_chapters=len(chapters)
        p
        required_exam_valid= await self.validate_number_of_questions(total_chapters_number=num_of_chapters,exam_constraints=exam_constraints,session=session)


        for chapter in chapters:
            if chapter.completed==False:
                raise   HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="All Chapters must be completed before generating the exam")

        if required_exam_valid:
            for chapter in chapters:
                
                questions= await question_service.get_chapter_questions(chapter_id=chapter.id,session=session)

                total_questions.extend(
                questions
            )
        total_number_of_required_questions=num_of_chapters* exam_constraints.questions_per_chapter
        return total_questions, total_number_of_required_questions
    
    async def generate_exam(self,course_id:UUID,exam_constraints:ExamDetailsRequestModel,session:AsyncSession):
        total_questions,total_number_of_required_questions= await self.get_all_course_questions(exam_constraints=exam_constraints,course_id=course_id,session=session)

        selected_questions:list[Question]= genetic_algorithm.test_with_random_sampling(questions=total_questions,rules=exam_constraints,total_questions=total_number_of_required_questions)
        constraints=exam_constraints.model_dump()
        new_exam=Exam(course_id=course_id,constraints=constraints)
        session.add(new_exam)
        await session.flush() 
        rows=[{"exam_id":new_exam.id,"question_id":q.id} for q in selected_questions]
        await session.execute(insert(exam_question_table),rows)
        await session.commit()
        return {
            "exam_id":new_exam.id,
            "exam_status":new_exam.status,
            "questions":[QuestionResponseModel.model_validate(q) for q in selected_questions]
        }

    async def regenerate_exam(self,course_id:UUID,exam_id:UUID,session:AsyncSession):
        exam= await self.get_exam_by_id(exam_id=exam_id,session=session)
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The exam doesn't exist")
        rules = ExamDetailsRequestModel.model_validate(exam.constraints) #type:ignore

        if exam.status==ExamStatus.final: #type:ignore
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Can't regenerate saved exam")
        total_questions,total_number_of_required_questions= await self.get_all_course_questions(exam_constraints= rules,course_id=course_id,session=session)

        selected_questions:list[Question]= genetic_algorithm.test_with_random_sampling(questions=total_questions,rules= rules,total_questions=total_number_of_required_questions)
   
        await session.execute(delete(exam_question_table).where(exam_question_table.c.exam_id==exam_id))
        rows = [{"exam_id": exam_id, "question_id": q.id} for q in selected_questions]
        await session.execute(insert(exam_question_table), rows)

        await session.commit()
        return {
            "exam_id":exam.id,#type:ignore
            "exam_status":exam.status,#type:ignore
            "questions":[QuestionResponseModel.model_validate(q) for q in selected_questions]
        }

    async def save_exam(self,exam_id:UUID,session:AsyncSession):
        exam= await self.get_exam_by_id(exam_id=exam_id,session=session)

        if not exam:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The exam doesn't exist")
        if exam.status==ExamStatus.final:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The exam is already saved")
        exam.status=ExamStatus.final
        await session.commit()
        await session.refresh(exam)

        return exam



    async def delete_exam(self,exam_id:UUID,session:AsyncSession):
        exam=await self.get_exam_by_id(exam_id=exam_id,session=session)
        if exam:
            await session.delete(exam)
            await session.commit()
            return True
        return False



        


exam_service=ExamService()