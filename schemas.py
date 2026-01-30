from pydantic import BaseModel,ConfigDict,Field
import uuid
from typing import Annotated
from datetime import datetime
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
