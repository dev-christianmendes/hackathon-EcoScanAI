import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api.routes import scan

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

app = FastAPI(
    title="EcoScan AI API",
    description="Backend for EcoScan AI — identify waste and get recycling guidance powered by Google Vision.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the Next.js frontend
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router, prefix="/api", tags=["scan"])


@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "demo_mode": os.getenv("DEMO_MODE", "false").lower() == "true",
        "version": "1.0.0",
    }
