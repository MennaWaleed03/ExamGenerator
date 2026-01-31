import enum

class DifficultyEnum(str, enum.Enum):
    simple = "simple"
    difficult = "difficult"

class ObjectiveEnum(str, enum.Enum):
    remembering = "remembering"
    understanding = "understanding"
    creativity = "creativity"


class ExamStatus(str,enum.Enum):
    draft = "draft"
    final = "final"