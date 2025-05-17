from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()


# Allow requests from your frontend (localhost:5500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "mistral"  # or "llama3", "phi", etc. if you want to switch later

class PromptRequest(BaseModel):
    prompt: str

class OperationResponse(BaseModel):
    operation: str
    target: str
    distance: float = None
    unit: str = None

@app.post("/generate", response_model=OperationResponse)
def generate_operation(prompt_request: PromptRequest):
    prompt = prompt_request.prompt

    # Instruct the model to return ONLY JSON
    system_prompt = (
        "You are a GIS assistant. "
        "Convert the user's prompt into a structured GeoJSON operation with fields: operation, target, distance (optional), and unit (optional). "
        "Valid operations include: 'buffer', 'merge', 'within_distance'. "
        "Respond ONLY with a compact JSON object."
    )

    response = requests.post(OLLAMA_API_URL, json={
        "model": MODEL_NAME,
        "prompt": f"{system_prompt}\nUser: {prompt}",
        "stream": False
    })

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to get response from Ollama")

    try:
        result = response.json()["response"]
        parsed = eval(result.strip())  # Use json.loads(result) if your model outputs strict JSON
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse LLM output: {e}")

    return parsed
