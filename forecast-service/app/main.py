from fastapi import FastAPI, BackgroundTasks, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import verify_token
from app.schemas import ForecastRequest
from app import db, jobs

app = FastAPI(title="Forecast Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/forecast")
def create_forecast(
    req: ForecastRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(default=""),
):
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    user_id = verify_token(token)
    job_id = db.create_job(user_id, req.model)
    background_tasks.add_task(jobs.process_job, job_id, req)
    return {"job_id": job_id}
