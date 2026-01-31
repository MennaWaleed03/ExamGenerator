from pydantic import BaseModel,ConfigDict,Field,conlist,field_validator
import uuid
from typing import Annotated
from datetime import datetime
from src.enums import ObjectiveEnum,DifficultyEnum,ExamStatus

from typing import List,Annotated
class CourseModel(BaseModel):
    name:Annotated[str,Field(...,description="The course name")]
 

class CourseCreateModel(CourseModel):
    number_of_chapters:Annotated[int,Field(gt=0)]

class CourseEditModel(CourseModel):
    pass


class CourseResponseModel(CourseModel):
    id:uuid.UUID
    created_at:datetime
    updated_at:datetime
    number_of_chapters:Annotated[int,Field(gt=0)]
    model_config = ConfigDict(from_attributes=True)




class ChapterModel(BaseModel):

    chapter_number :int
    completed : int

class ChapterCreateModel(BaseModel):
    chapter_number :int
class ChapterResponseModel(ChapterModel):
    id: uuid.UUID
    course_id : uuid.UUID
    model_config = ConfigDict(from_attributes=True)




class ChoicesModel(BaseModel):
    content:Annotated[str,Field(min_length=1)]
    is_correct:bool

class QuestionModel(BaseModel):

    content :Annotated[str,Field(min_length=1)]
    difficulty : DifficultyEnum
    objective :ObjectiveEnum
    model_config = ConfigDict(from_attributes=True)


class QuestionCreateModel(QuestionModel):
    choices: Annotated[List[ChoicesModel], Field(min_length=3, max_length=3)]

    


class QuestionRequestModel(BaseModel):

    questions: Annotated[List[QuestionCreateModel], Field(min_length=12, max_length=12)]

class ChoiceResponseModel(ChoicesModel):
    id:uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class QuestionResponseModel(QuestionModel):
    id:uuid.UUID
    choices:List[ChoiceResponseModel]


class QuestionEditModel(BaseModel):
    content:str
    choices:Annotated[List[ChoicesModel],Field(min_length=3,max_length=3)]


class ExamDetailsRequestModel(BaseModel):
    questions_per_chapter:Annotated[int,Field(gt=0)]
    difficult_questions:Annotated[int,Field(gt=0)]
    simple_questions:Annotated[int,Field(gt=0)]
    remembring_questions:Annotated[int,Field(gt=0)]
    understanding_questions:Annotated[int,Field(gt=0)]
    creative_questions:Annotated[int,Field(gt=0)]

class ExamResponseModel(BaseModel):
    exam_id:uuid.UUID
    exam_status:ExamStatus
    questions:List[QuestionResponseModel]