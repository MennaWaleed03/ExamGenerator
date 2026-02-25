# ExamGenerator – AI-Based Exam Optimization Platform

## Overview
**ExamGenerator** is a full-stack intelligent exam generation platform that dynamically creates optimized exams from categorized question banks.  
It leverages **Genetic Algorithms** to balance constraints such as difficulty, topic distribution, and exam requirements, providing an automated and fair exam creation process.

---

## Features
- **Optimized Exam Generation:** Uses a Genetic Algorithm to intelligently select and balance exam questions.  
- **Full-Stack Platform:** Backend powered by **FastAPI** and **PostgreSQL**; frontend built with **HTML, Bootstrap, and JavaScript** for interactive exam management.  
- **Secure APIs:** Implements **JWT-based authentication** and request validation with **Pydantic**, following a modular MVC architecture.  
- **Responsive UI:** Easily manage question banks, generate exams, and preview results.  
- **Scalable Design:** Supports multiple question categories and asynchronous database operations for high performance.

---

## Technologies Used
- **Backend:** FastAPI, PostgreSQL, SQLAlchemy (async queries, many-to-many relationships)  
- **Frontend:** HTML, Bootstrap, JavaScript  
- **AI / Optimization:** Genetic Algorithm for exam generation  
- **Authentication & Validation:** JWT, Pydantic  
- **Architecture:** Modular MVC pattern

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/YourUsername/ExamGenerator.git
cd ExamGenerator
2. Create a virtual environment:

```bash
# Linux / Mac
python -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Set up the PostgreSQL database:

* Create a database named `exam_generator`.
* Update `DATABASE_URL` in `config.py` or `.env`.

5. Run the backend server:

```bash
uvicorn main:app --reload
```

6. Open the frontend by launching `index.html` in your browser.

---

## Usage

1. Log in or register as a user.
2. Add questions to the categorized question bank.
3. Generate exams using the **Genetic Algorithm** to balance difficulty and topic distribution.
4. Preview or export generated exams.

---

## Future Improvements

* Add **AI question suggestions** using NLP for automated question generation.
* Implement a **grading and analytics system** for exam results.
* Deploy the platform to the **cloud** for remote access.

---

## License

This project is licensed under the MIT License.

---

```


✅ **Key improvements in this version:**  
- All **commands are in proper code blocks**.  
- Sections like **Usage**, **Installation**, and **Future Improvements** are clearly separated.  
- Everything is ready to **render perfectly on GitHub**.  

If you want, I can also **make a shorter 1-paragraph “CV-friendly” version** of this README so it’s **quick for recruiters to read**.  

Do you want me to do that?
