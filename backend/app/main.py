from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from .models import Requisition
from .routers.workflow import router as workflow_router
from .services.seed_service import seed_demo_dataset, ensure_sample_files_on_disk

# Ensure tables exist immediately at startup or import time (including TestClient)
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_sample_files_on_disk()
    db = SessionLocal()
    try:
        if db.query(Requisition).count() == 0:
            seed_demo_dataset(db, actor="System Startup Auto-Seeder")
    finally:
        db.close()
    yield


app = FastAPI(
    title="AI-Powered HR Hiring Automation System API",
    description=(
        "Human-in-the-loop multi-agent hiring workflow: Agent 1 (Resume Scoring), "
        "Agent 2 (Consent-Aware Screening Call), and Agent 3 (Timezone-Aware Interview Scheduling & Email)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflow_router)


@app.get("/")
def root():
    return {
        "service": "AI-Powered HR Hiring Automation System",
        "docs": "/docs",
        "health": "/api/health",
    }
