from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_items():
    """Get users - TODO: Implement"""
    return {"message": "users endpoint - To be implemented"}
