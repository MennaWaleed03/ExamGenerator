import random
from schemas import ExamDetailsRequestModel
from typing import List, Any
from src.db.models import Question
import random

class GeneticExamGenerator:

    def __init__(self,questions_ids_per_chapter,total_number_of_required_questions,
                 num_of_chapters,
                 difficulty_map,
                 objective_map,
                 exam_constraints,
                 diff_avail,
                 obj_avail,
                 w_diff,
                 w_obj,
                 ):

        self.chapter_pools=questions_ids_per_chapter
        self.total_required_ques=total_number_of_required_questions
        self.num_of_chapters=num_of_chapters
        self.difficulty_by_qid=difficulty_map
        self.objective_by_qid=objective_map
        self.difficulty_targets = {"simple": exam_constraints.simple_questions, "difficult": exam_constraints.difficult_questions}
        self.objective_targets = {"remembering": exam_constraints.remembering_questions, "understanding": exam_constraints.understanding_questions, "creativity": exam_constraints.creative_questions}
        self.questions_per_chapter=exam_constraints.questions_per_chapter
        self.w_diff = float(w_diff)
        self.w_obj = float(w_obj)
        self.ensure_no_duplicates_across_exam =True
        self.population_size= 80
        self.max_generations= 300
        self.tournament_size= 4
        self.crossover_rate = 0.85
        self.mutation_rate = 0.15
        self.elitism = 2
        self.diff_avail=diff_avail
        self.obj_avail=obj_avail

    def flatten(self,chrom:List[List[Any]]):
        return [qid for chapter in chrom for qid in chapter]
    
    def repair_no_duplicates(self, chrom: List[List[Any]]) -> None:

        used = set()
        for chapter_idx, chapter in enumerate(chrom):
            pool = self.chapter_pools[chapter_idx]
            for i, qid in enumerate(chapter):
                if qid not in used:
                    used.add(qid)
                    continue

                replacement = None
                for _ in range(8):
                    cand = random.choice(pool)
                    if cand not in used and cand not in chapter:
                        replacement = cand
                        break

                if replacement is None:
                    for cand in pool:
                        if cand not in used and cand not in chapter:
                            replacement = cand
                            break

                if replacement is not None:
                    chapter[i] = replacement
                    used.add(replacement)

    def generate_chrmosomes(self):

        chrom:List[List[Any]]=[] #type:ignore

        for pool in self.chapter_pools:
            chrom.append(random.sample(pool,self.questions_per_chapter) )
       
        if self.ensure_no_duplicates_across_exam:
            self.repair_no_duplicates(chrom)
        return chrom
    
    def evaluate_chromosome(self,chrom):
        difficulty_counts={"simple":0,"difficult":0,}
        objective_counts={"remembering":0,"understanding":0,"creativity":0}
        diff_map = self.difficulty_by_qid
        obj_map  = self.objective_by_qid
        flat_chrom=self.flatten(chrom=chrom)

        duplicate_counts=len(flat_chrom)-len(set(flat_chrom))
        for qid in flat_chrom:
            difficulty_counts[diff_map[qid]]+=1
            objective_counts[obj_map[qid]]+=1

        return difficulty_counts,objective_counts, duplicate_counts
    
    def fitness_function(self,chrom):

        difficulty_counts, objective_counts, duplicate_counts = self.evaluate_chromosome(chrom)

        wd=self.difficulty_targets['difficult']/self.diff_avail['difficult'] if self.diff_avail['difficult'] !=0 else 0

        ws=self.difficulty_targets['simple']/self.diff_avail['simple'] if self.diff_avail['simple'] !=0 else 0

        wr=self.objective_targets['remembering']/self.obj_avail['remembering'] if self.obj_avail['remembering'] !=0 else 0

        wu=self.objective_targets['understanding']/self.obj_avail['understanding'] if self.obj_avail['understanding'] !=0 else 0

        wc=self.objective_targets['creativity']/self.obj_avail['creativity'] if self.obj_avail['creativity'] !=0 else 0

        difficulty_error= (
            ws*abs(difficulty_counts['simple']-self.difficulty_targets['simple'])
            +
            wd*abs(difficulty_counts['difficult']-self.difficulty_targets['difficult'])
            )

        objective_error= (
            wr*abs(objective_counts['remembering']-self.objective_targets['remembering'])
            +
            wu*abs(objective_counts['understanding']-self.objective_targets['understanding'])
            +
            wc*abs(objective_counts['creativity']-self.objective_targets['creativity'])
            )

        penality=self.w_diff*difficulty_error+self.w_obj*objective_error

        if self.ensure_no_duplicates_across_exam and duplicate_counts > 0:
            # strong penalty for duplicates
            penality += 10.0 * duplicate_counts
        
        normalized_penalty = penality / self.total_required_ques

        fitness_function_value=1.0/(1.0+ normalized_penalty)

        return fitness_function_value 


    def select_parents(self,population: List[List[List[Any]]], fitnesses: List[float]):
        #Note:population is the list of all candidate solutions
        t=min(self.tournament_size,len(population))
        candidates_ids=random.sample(range(len(population)),t)
        best_idx=max(candidates_ids,key=lambda i:fitnesses[i])

        return population[best_idx]


    def cross_over(self,parent1,parent2):

        if random.random()>self.crossover_rate:
            return [list(x) for x in parent1], [list(x) for x in parent2]
        k= self.num_of_chapters
        mask=[random.random() <.5 for _ in range(k)]

        child1 = [ list(parent1[i]) if mask[i] else list(parent2[i])for i in range(k)]
        child2= [ list(parent2[i]) if mask[i] else list(parent1[i])for i in range(k)]

        if self.ensure_no_duplicates_across_exam:
                    pass
        if self.ensure_no_duplicates_across_exam:
            self.repair_no_duplicates(child1)
            self.repair_no_duplicates(child2)

        return child1,child2
    
    def mutate(self,chrom):
        if random.random() > self.mutation_rate:
            return

        
        chapter_id=random.choice(range(self.num_of_chapters))
        chapter=chrom[chapter_id]
        pool=self.chapter_pools[chapter_id]
        used = set(self.flatten(chrom))
        pos = random.choice(range(self.questions_per_chapter))
        old=chapter[pos]
        used.discard(old)

        replacement = None
        for _ in range(8):
            candidate=random.choice(pool)
            if candidate !=old and (not self.ensure_no_duplicates_across_exam or candidate not in used) and candidate not in chapter:
                replacement = candidate
                break

        if replacement is None:
            for candidate in pool:
                if candidate != old and (not self.ensure_no_duplicates_across_exam or candidate not in used) and candidate not in chapter:
                    replacement = candidate
                    break

        if replacement is not None:
            chapter[pos] = replacement

    

    def run(self):
        print("max_generations =", self.max_generations)

        population=[self.generate_chrmosomes() for i in range(self.population_size)]
        current_gen=0

        fitnesses=[self.fitness_function(chrom=chrom) for chrom in population]

        best_idx=max(range(len(population)), key=lambda i:fitnesses[i])
        best_chromosome=population[best_idx]
        best_fit = fitnesses[best_idx]

        for gen in range(1, self.max_generations + 1):
            current_gen=gen
            ranked=sorted(zip(population,fitnesses),key=lambda x:x[1],reverse=True)
            new_population=[ranked[i][0] for i in range(min(len(ranked),self.elitism))]

            if best_fit >= 1.0 - 1e-12:
                diff_counts, obj_counts,_=self.evaluate_chromosome(best_chromosome)
                solution=self.flatten(best_chromosome)
                print(current_gen)
                for k,v in self.diff_avail.items():
                    print(f"{k}: {v}")
                for k,v in self.obj_avail.items():
                    print(f"{k}: {v}")
                print("-"*30)
                return solution, best_fit, diff_counts, obj_counts
            
            while len(new_population) <len(population):
                parent1=self.select_parents(population=population,fitnesses=fitnesses)
                parent2=self.select_parents(population=population,fitnesses=fitnesses)

                child1, child2=self.cross_over(parent1=parent1,parent2=parent2)

                self.mutate(child1)
                self.mutate(child2)

                new_population.append(child1)

                if len(new_population)<len(population):
                    new_population.append(child2)
            population=new_population
            fitnesses=[self.fitness_function(chrom=chromosome) for chromosome in population]

            current_best_idx=max(range(len(population)),key=lambda i: fitnesses[i])         
            current_best_chrom=population[current_best_idx]
            current_best_fit=fitnesses[current_best_idx]

            if current_best_fit>best_fit:
                best_fit=current_best_fit
                best_chromosome=current_best_chrom
        diff_counts, obj_counts,_=self.evaluate_chromosome(best_chromosome)
        solution=self.flatten(best_chromosome)
        print(current_gen)
        for k,v in self.diff_avail.items():
            print(f"{k}: {v}")
        for k,v in self.obj_avail.items():
            print(f"{k}: {v}")
        print("-"*30)
        return  solution, best_fit ,diff_counts,obj_counts

        


