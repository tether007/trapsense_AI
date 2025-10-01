from fastapi import FastAPI,Request,Response
from fastapi.middleware.cors import CORSMiddleware
from src.routes import media,users,predictions,alerts   


app=FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include your router
app.include_router(media.router, prefix="/api/media")
app.include_router(users.router, prefix="/api/users")
app.include_router(alerts.router, prefix="/api/alerts")
app.include_router(predictions.router, prefix="/api/predictions")

# Optional: root route for testing
@app.get("/")
def root():
    return {"message": "Backend is running"}