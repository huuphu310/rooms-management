from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_items():
    """Get billing - TODO: Implement"""
    return {"message": "billing endpoint - To be implemented"}
