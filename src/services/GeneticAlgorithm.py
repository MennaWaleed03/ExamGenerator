import random
from schemas import ExamDetailsRequestModel
from typing import List
from src.db.models import Question
class GeneticAlgorithm:


    def test_with_random_sampling(self,questions:List[Question],rules:ExamDetailsRequestModel,total_questions:int):

        exam= random.sample(questions, k=total_questions)

        return exam

genetic_algorithm=GeneticAlgorithm()