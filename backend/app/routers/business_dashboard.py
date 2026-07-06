from fastapi import APIRouter, Depends
from app.services.business_dashboard_service import BusinessDashboardService, BusinessDashboardData
from app.auth import get_current_user

router = APIRouter(tags=["Business Dashboard"])

@router.get("/business/dashboard", response_model=BusinessDashboardData)
async def get_business_dashboard(
    user=Depends(get_current_user),
    service: BusinessDashboardService = Depends(BusinessDashboardService)
):
    """
    Get the current state of all Business Engine modules.
    """
    return service.get_dashboard_data()
