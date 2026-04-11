import os
import instructor
from groq import Groq
from pydantic import BaseModel, Field
from typing import List, Optional
import pdfplumber
import docx
from dotenv import load_dotenv

load_dotenv()

# Define the structure for parsed resume data
class Experience(BaseModel):
    title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    duration: str = Field(..., description="Timeline of the job (e.g. Jan 2020 - Mar 2022)")
    description: List[str] = Field(..., description="Key responsibilities and achievements")

class Education(BaseModel):
    degree: str = Field(..., description="Degree obtained")
    institution: str = Field(..., description="University or school name")
    year: str = Field(..., description="Graduation year")

class ResumeData(BaseModel):
    name: str = Field(..., description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    summary: str = Field(..., description="A brief professional summary")
    skills: List[str] = Field(..., description="List of technical and soft skills extracted from the resume")
    experience: List[Experience] = Field(..., description="Work history")
    education: List[Education] = Field(..., description="Educational history")
    certifications: List[str] = Field(default_factory=list, description="Any certifications or awards")

class ResumeParserAgent:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables.")
        self.client = instructor.from_groq(Groq(api_key=api_key))

    def extract_text_from_pdf(self, file_path: str) -> str:
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    content = page.extract_text()
                    if content:
                        text += content + "\n"
        except Exception as e:
            print(f"Error extracting PDF: {e}")
        return text

    def extract_text_from_docx(self, file_path: str) -> str:
        try:
            doc = docx.Document(file_path)
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            print(f"Error extracting DOCX: {e}")
            return ""

    def extract_text(self, file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return self.extract_text_from_pdf(file_path)
        elif ext == ".docx":
            return self.extract_text_from_docx(file_path)
        elif ext == ".txt":
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def parse_resume(self, file_path: str) -> ResumeData:
        print(f"--- Extracting text from {os.path.basename(file_path)} ---")
        text = self.extract_text(file_path)
        
        if not text.strip():
            raise ValueError("No text could be extracted from the file.")

        print("--- Parsing structured data via Groq (Llama-3.1-70b) ---")
        try:
            resume_data = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                response_model=ResumeData,
                messages=[
                    {"role": "system", "content": "You are a professional resume parser. Extract the following information accurately. If a field is missing, provide a reasonable default or empty list/null as per schema."},
                    {"role": "user", "content": f"Parse this resume:\n\n{text}"}
                ]
            )
            return resume_data
        except Exception as e:
            print(f"Error during LLM parsing: {e}")
            raise

if __name__ == "__main__":
    # Test block
    import sys
    if len(sys.argv) > 1:
        parser = ResumeParserAgent()
        result = parser.parse_resume(sys.argv[1])
        print(result.model_dump_json(indent=2))
