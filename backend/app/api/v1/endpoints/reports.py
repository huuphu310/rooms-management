from datetime import date, datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from fastapi.responses import StreamingResponse, JSONResponse
import io
import json

from app.core.database import get_supabase_service
from app.api.deps import get_current_user
from app.services.report_service import ReportService

router = APIRouter()

# ================================
# OPERATIONAL REPORTS
# ================================

@router.get("/daily-operations")
async def get_daily_operations_report(
    report_date: Optional[date] = Query(None, description="Report date (default: today)"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate comprehensive daily operational summary
    
    Includes:
    - Occupancy statistics
    - Revenue summary
    - Arrivals and departures
    - Housekeeping status
    - Operational alerts
    """
    service = ReportService(db)
    report = await service.get_daily_operations_report(report_date)
    return report

@router.get("/occupancy-analysis")
async def get_occupancy_analysis(
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    group_by: str = Query("day", description="Grouping: day, week, or month"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate detailed occupancy analysis with trends and forecasting
    
    Includes:
    - Occupancy trends over time
    - Analysis by room type
    - Day of week patterns
    - Forecasting
    """
    service = ReportService(db)
    report = await service.get_occupancy_analysis(start_date, end_date, group_by)
    return report

@router.get("/housekeeping")
async def get_housekeeping_report(
    report_date: Optional[date] = Query(None, description="Report date (default: today)"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate housekeeping operations report
    
    Includes:
    - Room cleaning status
    - Staff productivity metrics
    - Supplies usage
    - Pending tasks
    """
    service = ReportService(db)
    report = await service.get_housekeeping_report(report_date)
    return report

# ================================
# FINANCIAL REPORTS
# ================================

@router.get("/revenue")
async def get_revenue_report(
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    period: str = Query("daily", description="Period: daily, monthly, or yearly"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate comprehensive revenue analysis
    
    Includes:
    - Revenue by source
    - Revenue by room type
    - Payment method breakdown
    - Trends and comparisons
    """
    service = ReportService(db)
    report = await service.get_revenue_report(start_date, end_date, period)
    return report

@router.get("/profit-loss")
async def get_profit_loss_statement(
    period: str = Query(..., description="Period in YYYY-MM format"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate P&L statement with expense analysis
    
    Includes:
    - Revenue categories
    - Expense breakdown
    - Profitability metrics
    - Financial ratios
    """
    service = ReportService(db)
    report = await service.get_profit_loss_statement(period)
    return report

@router.get("/accounts-receivable")
async def get_accounts_receivable(
    as_of_date: Optional[date] = Query(None, description="As of date (default: today)"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate accounts receivable aging report
    
    Includes:
    - Outstanding balances
    - Aging analysis
    - Customer breakdown
    - Collection forecast
    """
    service = ReportService(db)
    report = await service.get_accounts_receivable(as_of_date)
    return report

# ================================
# GUEST ANALYTICS REPORTS
# ================================

@router.get("/guest-demographics")
async def get_guest_demographics(
    period: str = Query(..., description="Period in YYYY-MM format"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate guest demographics analysis
    
    Includes:
    - Nationality breakdown
    - Age groups
    - Travel purpose
    - Behavior patterns
    """
    service = ReportService(db)
    report = await service.get_guest_demographics(period)
    return report

@router.get("/guest-satisfaction")
async def get_guest_satisfaction(
    period: str = Query(..., description="Period in YYYY-MM format"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate guest satisfaction analysis
    
    Includes:
    - Rating breakdown
    - Category ratings
    - Feedback themes
    - NPS score
    """
    service = ReportService(db)
    report = await service.get_guest_satisfaction(period)
    return report

# ================================
# PERFORMANCE REPORTS
# ================================

@router.get("/staff-performance")
async def get_staff_performance(
    period: str = Query(..., description="Period in YYYY-MM format"),
    department: str = Query("all", description="Department filter"),
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate staff performance metrics
    
    Includes:
    - Department summary
    - Individual performance
    - Attendance metrics
    - Training status
    """
    service = ReportService(db)
    report = await service.get_staff_performance(period, department)
    return report

@router.get("/kpi-dashboard")
async def get_kpi_dashboard(
    db=Depends(get_supabase_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Get real-time KPI dashboard data
    
    Includes:
    - Current KPI values
    - Targets and thresholds
    - Trends
    - Alerts
    """
    service = ReportService(db)
    dashboard = await service.get_kpi_dashboard()
    return dashboard
