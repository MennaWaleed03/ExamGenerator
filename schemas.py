from pydantic import BaseModel,ConfigDict,Field,EmailStr
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


class UserModel(BaseModel):
    id:uuid.UUID
    username:str
    email:str
    first_name:str
    last_name:str
    courses:List[CourseResponseModel]=[]
    created_at:datetime
    updated_at:datetime
    model_config=ConfigDict(
       from_attributes=True
    )

class UserCreateModel(BaseModel):
    first_name: str = Field(max_length=25)
    last_name: str = Field(max_length=25)
    username:Annotated[str,Field(max_length=20)]
    email:Annotated[EmailStr,Field(max_length=40)]
    password:Annotated[str,Field(min_length=6)]

class UserLoginModel(BaseModel):

    email:Annotated[EmailStr,Field(max_length=40)]
    password:Annotated[str,Field(min_length=6)]


class ChapterModel(BaseModel):

    chapter_number :int
 

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

    questions: List[QuestionCreateModel]

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
    questions_per_chapter:int
    difficult_questions:int
    simple_questions:int
    remembering_questions:int
    understanding_questions:int
    creative_questions:int

class ExamResponseModel(BaseModel):
    exam_id:uuid.UUID
    exam_status:ExamStatus
    questions:List[QuestionResponseModel]