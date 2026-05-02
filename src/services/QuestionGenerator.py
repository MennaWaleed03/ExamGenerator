import fitz #type:ignore
import re
from typing import List
import json
from google import genai
from google.genai import types
import time
# =========================
# 1) PDF EXTRACT + CLEAN
# =========================
class QuestionGenerator:
    def __init__(self,num_questions,API_KEY,model_name,file_path):
        

        self.HYPHEN_LINEBREAK_RE = re.compile(r"(\w)-\n(\w)")
        self.MULTISPACE_RE = re.compile(r"[ \t]+")
        self.MULTINEWLINE_RE = re.compile(r"\n{3,}")
        self.BULLETS_RE = re.compile(r"[•●▪➢◦‣∙·]")

        self.META_RE = re.compile(
            r"\b(dr\.?|doctor|faculty|university|mansoura|department)\b|"
            r"\b20\d{2}\b|"
            r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b",
            re.IGNORECASE
        )

        self.num_qestions=num_questions
        self.API_KEY=API_KEY
        self.model_name=model_name
        self.file_path=file_path
        

    def extract_page_text(self,page: fitz.Page) -> str:
        """Basic text extraction."""
        return page.get_text("text", sort=True) or ""

    def basic_clean(self,text: str) -> str:
        """Minimal safe cleaning."""
        if not text:
            return ""

        t = text.replace("\r\n", "\n").replace("\r", "\n")
        t = self.HYPHEN_LINEBREAK_RE.sub(r"\1\2", t)
        t = self.BULLETS_RE.sub("- ", t)
        t = self.MULTISPACE_RE.sub(" ", t)

        lines = [line.strip() for line in t.split("\n")]

        # remove exact duplicate lines (keep order)
        seen = set()
        cleaned_lines = []
        for line in lines:
            if not line:
                cleaned_lines.append("")
                continue
            if line not in seen:
                cleaned_lines.append(line)
                seen.add(line)

        t = "\n".join(cleaned_lines)
        t = self.MULTINEWLINE_RE.sub("\n\n", t)
        return t.strip()

    def extract_and_clean_pdf(self,pdf_path: str) -> List[str]:
        doc = fitz.open(pdf_path)
        cleaned_pages = []
        for page in doc:
            raw = self.extract_page_text(page)
            cleaned_pages.append(self.basic_clean(raw))
        return cleaned_pages


    # =========================
    # 2) CHUNKING (page-based)
    # =========================

    def word_count(self,text: str) -> int:
        return len(re.findall(r"\b\w+\b", text or ""))

    def first_nonempty_line(self,text: str) -> str:
        for ln in (text or "").splitlines():
            s = ln.strip()
            if s:
                return s
        return ""

    def is_metadata_page(self,page: str) -> bool:
        w = self.word_count(page)
        if w > 120:
            return False
        return bool(self.META_RE.search(page))

    def is_heading_only_page(self,page: str) -> bool:
        lines = [ln.strip() for ln in (page or "").splitlines() if ln.strip()]
        if not lines:
            return True
        if self.word_count(page) > 30:
            return False
        short_lines = sum(1 for ln in lines if len(ln) <= 40)
        return (len(lines) <= 4) and (short_lines == len(lines))

    def is_strong_new_section(self,page: str) -> bool:
        head = self.first_nonempty_line(page)
        return bool(re.match(r"^\d+(\.\d+)?\s*[\)\.]?\s+\S+", head))

    def split_by_paragraphs(self,text: str, max_words: int) -> List[str]:
        paras = [p.strip() for p in (text or "").split("\n\n") if p.strip()]
        out, buf, buf_w = [], [], 0 #type: ignore

        for p in paras:
            pw = self.word_count(p)
            if buf and (buf_w + pw) > max_words:
                out.append("\n\n".join(buf).strip())
                buf, buf_w = [p], pw
            else:
                buf.append(p)
                buf_w += pw

        if buf:
            out.append("\n\n".join(buf).strip())
        return out

    def build_chunks_from_clean_pages(
        self,
        pages: List[str],
        min_words: int = 180,
        max_words: int = 900,
        drop_metadata: bool = True
    ) -> List[str]:
        kept = []
        for p in pages:
            p = (p or "").strip()
            if not p:
                continue
            if drop_metadata and self.is_metadata_page(p):
                continue
            kept.append(p)

        chunks: List[str] = []
        i = 0
        while i < len(kept):
            cur_pages = [kept[i]]
            cur_text = kept[i]
            cur_w = self.word_count(cur_text)

            j = i + 1

            if self.is_heading_only_page(cur_text):
                while j < len(kept) and cur_w < min_words:
                    cur_pages.append(kept[j])
                    cur_text = "\n\n".join(cur_pages)
                    cur_w = self.word_count(cur_text)
                    j += 1
            else:
                while cur_w < min_words and j < len(kept):
                    if self.is_strong_new_section(kept[j]) and cur_w >= int(min_words * 0.75):
                        break
                    cur_pages.append(kept[j])
                    cur_text = "\n\n".join(cur_pages)
                    cur_w = self.word_count(cur_text)
                    j += 1

            if cur_w > max_words:
                chunks.extend(self.split_by_paragraphs(cur_text, max_words=max_words))
            else:
                chunks.append(cur_text.strip())

            i = max(j, i + 1)

        return [c for c in chunks if c.strip()]


    # =========================
    # 3) GEMINI MCQ GENERATION
    # =========================

    def safe_json_loads(self, raw_text: str):
        raw_text = (raw_text or "").strip()
        if not raw_text:
            raise ValueError("Gemini returned empty text.")

        cleaned = raw_text.replace("```json", "").replace("```", "").strip()

        # Attempt 1: direct parse
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Attempt 2: extract first JSON array/object substring
            start_candidates = [cleaned.find("["), cleaned.find("{")]
            start_candidates = [i for i in start_candidates if i != -1]
            if not start_candidates:
                raise

            start = min(start_candidates)
            end = max(cleaned.rfind("]"), cleaned.rfind("}"))
            if end == -1 or end <= start:
                raise

            snippet = cleaned[start:end+1]
            return json.loads(snippet)

    def build_mcq_prompt(self,text_chunk: str, num_questions: int) -> str:

        return f"""
        You are an expert instructor generating multiple-choice exam questions for a university course.

        Based on the provided chapter content, generate high-quality exam questions.

        Requirements:
        1. Generate exactly {num_questions} questions.
        2. Each question must have:
        - content (the question text)
        - difficulty: either "simple" or "difficult" only it can't be any thing else
        - objective: one of "remembering", "understanding", or "creativity" only it can't be any thing else
        3. Each question must contain exactly 3 answer choices.
        4. Only one choice must be correct.
        5. Mark the correct choice using "is_correct": true and the others "is_correct": false.

        Return the output as valid JSON only, without explanations, comments, or markdown formatting.

        The JSON structure MUST exactly match the following schema:

        {{
        "questions": [
            {{
            "content": "string",
            "difficulty": "simple",
            "objective": "remembering",
            "choices": [
                {{
                "content": "string",
                "is_correct": true
                }},
                {{
                "content": "string",
                "is_correct": false
                }},
                {{
                "content": "string",
                "is_correct": false
                }}
            ]
            }}
        ]
        }}

        Important rules:
        - Do not include any text outside the JSON.
        - Ensure the JSON is syntactically valid.
        - Ensure each question has exactly 3 choices.
        - Ensure exactly one choice has "is_correct": true.

        Now generate the questions using the provided chapter content.

        Content:
        {text_chunk}
        """.strip()

    def clamp_text(self, text: str, max_chars: int = 12000) -> str:
        text = (text or "").strip()
        return text[:max_chars]
    def normalize_generated_questions(self, mcqs: dict) -> dict:
        valid_difficulties = {"simple", "difficult"}
        valid_objectives = {"remembering", "understanding", "creativity"}

        if not isinstance(mcqs, dict):
            return {"questions": []}

        questions = mcqs.get("questions", [])
        if not isinstance(questions, list):
            return {"questions": []}

        normalized_questions = []

        for q in questions:
            if not isinstance(q, dict):
                continue

            difficulty = str(q.get("difficulty", "")).strip().lower()
            objective = str(q.get("objective", "")).strip().lower()

            if difficulty not in valid_difficulties:
                difficulty = "simple"

            if objective not in valid_objectives:
                objective = "creativity"

            choices = q.get("choices", [])
            if not isinstance(choices, list):
                choices = []

            normalized_choices = []
            for ch in choices[:3]:
                if not isinstance(ch, dict):
                    continue
                normalized_choices.append({
                    "content": str(ch.get("content", "")).strip(),
                    "is_correct": bool(ch.get("is_correct", False))
                })

            # make sure exactly 3 choices exist
            while len(normalized_choices) < 3:
                normalized_choices.append({
                    "content": "",
                    "is_correct": False
                })

            normalized_choices = normalized_choices[:3]

            # ensure exactly one correct answer
            correct_count = sum(1 for ch in normalized_choices if ch["is_correct"])
            if correct_count != 1:
                for idx, ch in enumerate(normalized_choices):
                    ch["is_correct"] = (idx == 0)

            normalized_questions.append({
                "content": str(q.get("content", "")).strip(),
                "difficulty": difficulty,
                "objective": objective,
                "choices": normalized_choices
            })

        return {"questions": normalized_questions}
    def generate_mcqs_from_chunk(self,client: genai.Client, chunk_text: str, num_questions: int):
        chunk_text = self.clamp_text(chunk_text, 12000)
        prompt = self.build_mcq_prompt(chunk_text, num_questions)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.4,
                top_p=0.9,
                max_output_tokens=2048,
                response_mime_type="application/json",
            ),
        )

        raw_text = (response.text or "").strip()

        try:
            return self.safe_json_loads(raw_text)
        except Exception:
            print("\n--- GEMINI RAW OUTPUT START ---")
            print(raw_text)
            print("--- GEMINI RAW OUTPUT END ---\n")
            raise




    def run (self):

        client = genai.Client(api_key=self.API_KEY)

        pdf_path = self.file_path

        # Extract + clean
        cleaned_pages = self.extract_and_clean_pdf(pdf_path)

        # Build chunks
        chunks = self.build_chunks_from_clean_pages(cleaned_pages, min_words=180, max_words=900, drop_metadata=True)
        num_chunks=len(chunks)

        all_questions = {
            "questions": []
        }
        questions_per_chunk = self.num_qestions // num_chunks
        remaining = self.num_qestions % num_chunks

        for i, chunk in enumerate(chunks):
            n = questions_per_chunk + (1 if i < remaining else 0)
            if n <= 0:
                continue

            print(f"Generating questions for chunk {i+1}/{len(chunks)} (words={self.word_count(chunk)}) ...")
            mcqs = self.generate_mcqs_from_chunk(client, chunk, n)
            mcqs = self.normalize_generated_questions(mcqs)
            all_questions["questions"].extend(mcqs["questions"])
            time.sleep(12)

        # Print JSON result
        print(json.dumps(all_questions, indent=2, ensure_ascii=False))
        return all_questions

# question_generator=QuestionGenerator(30,API_KEY,model_name)
# print(question_generator.run())
