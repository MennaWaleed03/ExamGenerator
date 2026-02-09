from typing import List, Dict,Tuple
from src.services.ChapterService import chapter_service
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.exceptions import HTTPException
from fastapi import status
from src.db.models import Exam,Question,exam_question_table
from uuid import UUID
from schemas import QuestionResponseModel,ExamDetailsRequestModel
from sqlalchemy import insert,select,delete
from src.enums import ExamStatus

from sqlalchemy.orm import selectinload
from collections import Counter
from src.services.GeneticAlgorithm import GeneticExamGenerator

class ExamService:

    def _enum_to_text(self,x):
        if x is None:
            return None
        # if it's an Enum instance
        return getattr(x, "value", str(x))



    async def get_exam_by_id(self,exam_id:UUID,session:AsyncSession):
        statement=select(Exam).where(Exam.id==exam_id)
        result=await session.execute(statement)
        exam=result.scalars().first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The exam doesn't exist")
        return exam
    

    async def validate_number_of_questions(self,chapters,exam_constraints:ExamDetailsRequestModel,session:AsyncSession):
       
       
        total_chapters_number=len(chapters)

        required_total=exam_constraints.questions_per_chapter*total_chapters_number

        min_chapter_questions = min((len(ch.questions) for ch in chapters), default=0)

        diff_counter=Counter()  #type:ignore
        obj_counter=Counter()   #type:ignore

        if exam_constraints.questions_per_chapter>min_chapter_questions:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="some or all chapters don't have the required number of questions")
        
        

        for chapter in chapters:
           
            for question in chapter.questions:
                diff_counter[self._enum_to_text(question.difficulty)]+=1
                obj_counter[self._enum_to_text(question.objective) ]+=1
                



        

        if (exam_constraints.difficult_questions+exam_constraints.simple_questions) != required_total:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The sum of difficult and simple questions must equal the total required questiosn")
        
        if (exam_constraints.remembering_questions+exam_constraints.understanding_questions+exam_constraints.creative_questions) != required_total:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The sum of questions of different objectives must equal the total required questiosn")
        
        if exam_constraints.difficult_questions >diff_counter.get("difficult",0):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"The required number of difficult questions excceed the number of difficult questions in all chapters, there is only {diff_counter.get("difficult",0)} difficult questions")
        
 
        if exam_constraints.simple_questions >diff_counter.get("simple", 0):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"The required number of simple questions excceed the number of difficult simple in all chapters, there is only {diff_counter.get("simple", 0)} simple questions")
        
        if exam_constraints.remembering_questions >obj_counter.get("remembering", 0):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"The required number of remembring questions excceed the number of remembring questions in all chapters, there is only {obj_counter.get("remembering", 0)} remebering questions")
        
        if exam_constraints.understanding_questions >obj_counter.get("understanding", 0) :
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"The required number of understanding questions excceed the number of understanding questions in all chapters, there is only {obj_counter.get("understanding", 0)} understanding questions")
        
        if exam_constraints.creative_questions> obj_counter.get("creativity", 0):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"The required number of creative questions excceed the number of creative questions in all chapters, there is only {obj_counter.get("creativity", 0)} creative questions")
        

     
 
        
        return required_total, total_chapters_number, dict(diff_counter), dict(obj_counter)
    
    
    async def get_all_course_questions(self,exam_constraints:ExamDetailsRequestModel,course_id:UUID,session:AsyncSession):
        questions_ids_per_chapter:List[List[UUID]]=[]
        difficulty_map: Dict[UUID, str] ={}
        objective_map: Dict[UUID, str] ={}
        

        chapters=await chapter_service.get_course_chapters(course_id=course_id,session=session)
        if not chapters:
            return [], 0, 0, {}, {}
        
    
        required_total, num_chapters , diff_avail, obj_avail= await self.validate_number_of_questions(chapters=chapters,exam_constraints=exam_constraints,session=session)


        for chapter in chapters:
            ids=[]
    
            for q in chapter.questions:
                ids.append(q.id)
                difficulty_map[q.id] = self._enum_to_text(q.difficulty)
                objective_map[q.id] = self._enum_to_text(q.objective)

            questions_ids_per_chapter.append(ids)
                
    
        return required_total,questions_ids_per_chapter ,num_chapters,difficulty_map,objective_map,diff_avail,obj_avail
    
    
    async def run_generic_algorithm(self,course_id:UUID,exam_constraints:ExamDetailsRequestModel,session:AsyncSession):

        required_total,questions_ids_per_chapter,num_of_chapters,difficulty_map,objective_map,diff_avail,obj_avail= await self.get_all_course_questions(exam_constraints=exam_constraints,course_id=course_id,session=session)
        
        generator = GeneticExamGenerator(
            questions_ids_per_chapter,
            required_total,
            num_of_chapters,
            difficulty_map,
            objective_map,
            exam_constraints,
            diff_avail,
            obj_avail,
            w_diff=1,
            w_obj=1,
            )

        selected_questions_ids, best_fit, diff_counts, obj_counts =generator.run() # :Tuple[List[UUID],float]
        print(best_fit)
        if len(selected_questions_ids) != required_total:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Generator did not return the required number of questions.")

        return selected_questions_ids, diff_counts, obj_counts
    
    async def get_questions_from_ids(self,selected_questuons_ids,session:AsyncSession):

        stmt = (
    select(Question)
    .where(Question.id.in_(selected_questuons_ids)).options(selectinload(Question.choices)))

        result = await session.execute(stmt)
        questions = result.scalars().all()
        question_by_id = {q.id: q for q in questions}
        ordered_questions = [
        question_by_id[qid]
        for qid in selected_questuons_ids if qid in question_by_id ]

        return ordered_questions

    async def generate_exam(self,course_id:UUID,exam_constraints:ExamDetailsRequestModel,session:AsyncSession):

        selected_questuons_ids, diff_counts, obj_counts=await self.run_generic_algorithm(course_id=course_id,exam_constraints=exam_constraints,session=session)


        constraints=exam_constraints.model_dump()
        new_exam=Exam(course_id=course_id,constraints=constraints)

        session.add(new_exam)
        await session.flush() 

        rows=[{"exam_id":new_exam.id,"question_id":q} for q in selected_questuons_ids]

        await session.execute(insert(exam_question_table),rows)
        await session.commit()

        questions=await self.get_questions_from_ids(selected_questuons_ids,session)

        return {
            "exam_id":new_exam.id,
            "exam_status":new_exam.status,
            "questions":[QuestionResponseModel.model_validate(q) for q in questions],
            "diff_counts": diff_counts,
            "obj_counts": obj_counts
        }

    async def regenerate_exam(self,course_id:UUID,exam_id:UUID,session:AsyncSession):
        exam= await self.get_exam_by_id(exam_id=exam_id,session=session)
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="The exam doesn't exist")
        constraints = ExamDetailsRequestModel.model_validate(exam.constraints) #type:ignore

        if exam.status==ExamStatus.final: #type:ignore
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Can't regenerate saved exam")
        
        # await session.execute(delete(exam_question_table).where(exam_question_table.c.exam_id==exam_id))

        regenerated_exam=await self.generate_exam(course_id=course_id,exam_constraints=constraints,session=session)
        
        return regenerated_exam
    
   
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


    async def get_course_exams(self,course_id:UUID,session:AsyncSession):
        data:list=[]
        statment=select(Exam).where(Exam.course_id==course_id ).where(Exam.status == ExamStatus.final).options(selectinload(Exam.questions)).order_by(Exam.updated_at.asc())
        result=await session.execute(statement=statment)
        exams=result.scalars().all()
       
        for exam in exams:
            data.append({
                "exam_id":exam.id,
                "updated_at":exam.updated_at,
                "exam_status":exam.status,
                "course_id":exam.course_id,
                "difficult_count":sum(1 for q in exam.questions if q.difficulty == "difficult"),

                "simple_count":sum(1 for q in exam.questions if q.difficulty=="simple"),

                "remembering_count":sum(1 for q in exam.questions if q.objective=="remembering"),

                "creative_count":sum(1 for q in exam.questions if q.objective=="creativity"),

                "understanding_count":sum(1 for q in exam.questions if q.objective=="understanding")
            })
            

        return data

    async def delete_exam(self,exam_id:UUID,session:AsyncSession):
        exam=await self.get_exam_by_id(exam_id=exam_id,session=session)
        if exam.status==ExamStatus.draft:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="The user can't delete a draft exam it's the system job")
        if exam:
            await session.delete(exam)
            await session.commit()
            return True
        return False

    async def get_exam_questions(self,exam_id:UUID,session:AsyncSession):
        exam=await self.get_exam_by_id(exam_id=exam_id,session=session)
        if not exam or exam.status==ExamStatus.draft:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Can't access this exam")
        questions_ids_stms=select(exam_question_table.c.question_id).where(exam_question_table.c.exam_id==exam_id)
        questions_ids_res= await session.execute(questions_ids_stms)
        questions_ids= questions_ids_res.scalars().all()
        if not questions_ids:
            return []
        
        question_stms=select(Question).where(Question.id.in_(questions_ids)).options(selectinload(Question.choices))
        questions_res=await session.execute(question_stms)
        questions=questions_res.scalars().all()
        



        for q in questions:
            q.difficulty = self._enum_to_text(q.difficulty)
            q.objective  = self._enum_to_text(q.objective)

        return questions


exam_service=ExamService()