from pydantic import BaseModel
from typing import List, Dict, Any

class ModuleStatus(BaseModel):
    name: str
    status: str
    last_updated: str
    metrics: Dict[str, Any]

class BusinessDashboardData(BaseModel):
    brand: Dict[str, Any]
    social: List[Dict[str, Any]]
    content_count: int
    marketing_campaigns: int
    analytics_summary: Dict[str, Any]
    revenue_summary: Dict[str, Any]
    workflow_history: List[Dict[str, Any]]
    infrastructure: Dict[str, str]

class BusinessDashboardService:
    def get_dashboard_data(self) -> BusinessDashboardData:
        # Mock data representing the current state of all engines
        return BusinessDashboardData(
            brand={
                "name": "AIOS",
                "fullName": "AI Operating System",
                "status": "active"
            },
            social=[
                {"platform": "GitHub", "status": "synced"},
                {"platform": "X", "status": "synced"},
                {"platform": "note", "status": "pending"}
            ],
            content_count=12,
            marketing_campaigns=3,
            analytics_summary={
                "total_impressions": 25000,
                "total_clicks": 850,
                "average_ctr": "3.4%"
            },
            revenue_summary={
                "monthly_revenue": "¥12,800",
                "active_subscriptions": 42
            },
            workflow_history=[
                {"id": "wf-001", "name": "Brand Profile Automation", "status": "completed", "time": "2 hours ago"},
                {"id": "wf-002", "name": "Content Batch Generation", "status": "running", "time": "10 mins ago"}
            ],
            infrastructure={
                "dns": "propagating",
                "ssl": "pending"
            }
        )
