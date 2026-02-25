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

Create a virtual environment:
```bash
# Linux / Mac
python -m venv venv
source venv/bin/activate

```bash
# Windows
python -m venv venv
venv\Scripts\activate

Install dependencies:
```bash
pip install -r requirements.txt

Set up the PostgreSQL database:

Create a database named exam_generator.

Update DATABASE_URL in config.py or .env.

Run the backend server:
```bash
uvicorn main:app --reload

Open the frontend by launching index.html in your browser.

Usage

Log in or register as a user.

Add questions to the categorized question bank.

Generate exams using the Genetic Algorithm to balance difficulty and topic distribution.

Preview or export generated exams.

Future Improvements

Add AI question suggestions using NLP for automated question generation.

Implement a grading and analytics system for exam results.

Deploy the platform to the cloud for remote access.

License

This project is licensed under the MIT License.
