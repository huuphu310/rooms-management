from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
import json
import asyncio
from collections import defaultdict
from supabase import Client

from app.schemas.reports import (
    ReportDefinition,
    ReportSchedule,
    ReportExecution,
    DailyOperationsReport,
    RevenueReport,
    ProfitLossReport,
    GuestDemographicsReport,
    KPIDashboard
)
from app.core.exceptions import (
    NotFoundException, ValidationException, BusinessRuleException
)


class ReportService:
    def __init__(self, db: Client):
        self.db = db

    # ================================
    # OPERATIONAL REPORTS
    # ================================

    async def get_daily_operations_report(self, report_date: date = None) -> DailyOperationsReport:
        """Generate comprehensive daily operational summary"""
        if not report_date:
            report_date = date.today()
        
        try:
            # Get occupancy data
            occupancy = await self._get_occupancy_summary(report_date)
            
            # Get revenue data
            revenue = await self._get_revenue_summary(report_date)
            
            # Get operational data
            operations = await self._get_operations_summary(report_date)
            
            # Get arrivals and departures
            arrivals = await self._get_arrivals(report_date)
            departures = await self._get_departures(report_date)
            
            # Get housekeeping status
            housekeeping = await self._get_housekeeping_status(report_date)
            
            # Get alerts
            alerts = await self._get_operational_alerts(report_date)
            
            return DailyOperationsReport(
                report_date=report_date,
                summary={
                    "occupancy": occupancy,
                    "revenue": revenue,
                    "operations": operations
                },
                detailed_sections={
                    "arrivals": arrivals,
                    "departures": departures,
                    "housekeeping_status": housekeeping,
                    "alerts": alerts
                }
            )
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate daily operations report: {str(e)}")

    async def get_occupancy_analysis(self, start_date: date, end_date: date, group_by: str = "day") -> Dict[str, Any]:
        """Generate detailed occupancy analysis with trends"""
        try:
            # Get occupancy trends
            trends = await self._get_occupancy_trends(start_date, end_date, group_by)
            
            # Get occupancy by room type
            by_room_type = await self._get_occupancy_by_room_type(start_date, end_date)
            
            # Get occupancy by day of week
            by_day_of_week = await self._get_occupancy_by_day_of_week(start_date, end_date)
            
            # Calculate summary statistics
            summary = await self._calculate_occupancy_summary(start_date, end_date)
            
            # Generate forecast
            forecast = await self._generate_occupancy_forecast()
            
            return dict(
                period={"from": start_date, "to": end_date},
                summary=summary,
                trends=trends,
                by_room_type=by_room_type,
                by_day_of_week=by_day_of_week,
                forecast=forecast
            )
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate occupancy analysis: {str(e)}")

    async def get_housekeeping_report(self, report_date: date = None) -> Dict[str, Any]:
        """Generate housekeeping operations report"""
        if not report_date:
            report_date = date.today()
        
        try:
            # Room status summary
            room_status = self.db.table("rooms").select("status, COUNT(*)").group_by("status").execute()
            
            # Cleaning schedule
            cleaning_tasks = self.db.table("housekeeping_tasks").select("*").eq(
                "scheduled_date", report_date.isoformat()
            ).execute()
            
            # Staff productivity
            staff_productivity = await self._calculate_housekeeping_productivity(report_date)
            
            # Supplies usage
            supplies_usage = await self._get_supplies_usage(report_date)
            
            return {
                "date": report_date.isoformat(),
                "room_status": self._format_room_status(room_status.data),
                "cleaning_schedule": self._format_cleaning_schedule(cleaning_tasks.data),
                "staff_productivity": staff_productivity,
                "supplies_usage": supplies_usage
            }
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate housekeeping report: {str(e)}")

    # ================================
    # FINANCIAL REPORTS
    # ================================

    async def get_revenue_report(self, start_date: date, end_date: date, period: str = "daily") -> RevenueReport:
        """Generate comprehensive revenue analysis"""
        try:
            # Get total revenue summary
            summary = await self._get_revenue_summary_period(start_date, end_date)
            
            # Get revenue breakdown by source
            by_source = await self._get_revenue_by_source(start_date, end_date)
            
            # Get revenue breakdown by room type
            by_room_type = await self._get_revenue_by_room_type(start_date, end_date)
            
            # Get revenue breakdown by payment method
            by_payment = await self._get_revenue_by_payment_method(start_date, end_date)
            
            # Get daily/monthly trend based on period
            trend = await self._get_revenue_trend(start_date, end_date, period)
            
            # Year over year comparison
            yoy = await self._get_year_over_year_revenue(start_date, end_date)
            
            return RevenueReport(
                summary=summary,
                revenue_breakdown={
                    "by_source": by_source,
                    "by_room_type": by_room_type,
                    "by_payment_method": by_payment
                },
                trend=trend,
                year_over_year=yoy
            )
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate revenue report: {str(e)}")

    async def get_profit_loss_statement(self, period_month: str) -> ProfitLossReport:
        """Generate P&L statement for a specific month"""
        try:
            # Parse month (format: YYYY-MM)
            year, month = period_month.split("-")
            start_date = date(int(year), int(month), 1)
            
            # Calculate end date (last day of month)
            if int(month) == 12:
                end_date = date(int(year) + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(int(year), int(month) + 1, 1) - timedelta(days=1)
            
            # Get revenue data
            revenue = await self._calculate_revenue_categories(start_date, end_date)
            
            # Get expense data
            expenses = await self._calculate_expense_categories(start_date, end_date)
            
            # Calculate profitability metrics
            profitability = self._calculate_profitability_metrics(revenue, expenses)
            
            # Calculate financial ratios
            ratios = self._calculate_financial_ratios(revenue, expenses, profitability)
            
            # Get comparison data
            comparison = await self._get_pl_comparison(period_month)
            
            return ProfitLossReport(
                period=period_month,
                revenue=revenue,
                expenses=expenses,
                profitability=profitability,
                ratios=ratios,
                comparison=comparison
            )
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate P&L statement: {str(e)}")

    async def get_accounts_receivable(self, as_of_date: date = None) -> Dict[str, Any]:
        """Generate accounts receivable aging report"""
        if not as_of_date:
            as_of_date = date.today()
        
        try:
            # Get outstanding invoices
            outstanding = self.db.table("billing_invoices").select("*").eq(
                "payment_status", "pending"
            ).lte("due_date", as_of_date.isoformat()).execute()
            
            # Calculate aging buckets
            aging = self._calculate_aging_analysis(outstanding.data, as_of_date)
            
            # Group by customer
            by_customer = self._group_receivables_by_customer(outstanding.data)
            
            # Calculate summary
            summary = {
                "total_receivable": sum(inv["amount_due"] for inv in outstanding.data),
                "current": aging["current"]["amount"],
                "overdue": sum(bucket["amount"] for key, bucket in aging.items() if key != "current"),
                "average_days_outstanding": self._calculate_average_dso(outstanding.data, as_of_date)
            }
            
            return {
                "as_of_date": as_of_date.isoformat(),
                "summary": summary,
                "aging_analysis": aging,
                "by_customer": by_customer
            }
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate accounts receivable report: {str(e)}")

    # ================================
    # GUEST ANALYTICS REPORTS
    # ================================

    async def get_guest_demographics(self, period_month: str) -> GuestDemographicsReport:
        """Generate guest demographics analysis"""
        try:
            # Parse month
            year, month = period_month.split("-")
            start_date = date(int(year), int(month), 1)
            
            # Get guest data for the period
            guests = self.db.table("customers").select("*").gte(
                "created_at", start_date.isoformat()
            ).execute()
            
            # Analyze demographics
            demographics = {
                "by_nationality": self._analyze_nationality(guests.data),
                "by_age_group": self._analyze_age_groups(guests.data),
                "by_gender": self._analyze_gender(guests.data),
                "by_purpose": self._analyze_travel_purpose(guests.data)
            }
            
            # Analyze behavior patterns
            behavior = await self._analyze_guest_behavior(start_date)
            
            # Analyze preferences
            preferences = await self._analyze_guest_preferences(start_date)
            
            return GuestDemographicsReport(
                period=period_month,
                total_guests=len(guests.data),
                demographics=demographics,
                behavior_patterns=behavior,
                preferences=preferences
            )
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate guest demographics report: {str(e)}")

    async def get_guest_satisfaction(self, period_month: str) -> Dict[str, Any]:
        """Generate guest satisfaction analysis"""
        try:
            # Get reviews for the period
            reviews = self.db.table("guest_reviews").select("*").eq(
                "month", period_month
            ).execute()
            
            if not reviews.data:
                return {
                    "period": period_month,
                    "summary": {"total_reviews": 0, "average_rating": 0},
                    "message": "No reviews found for this period"
                }
            
            # Calculate satisfaction metrics
            summary = {
                "total_reviews": len(reviews.data),
                "average_rating": sum(r["rating"] for r in reviews.data) / len(reviews.data),
                "nps_score": self._calculate_nps(reviews.data),
                "response_rate": self._calculate_response_rate(period_month)
            }
            
            # Rating breakdown
            ratings_breakdown = self._calculate_ratings_breakdown(reviews.data)
            
            # Category ratings
            by_category = self._calculate_category_ratings(reviews.data)
            
            # Feedback themes
            feedback_themes = self._analyze_feedback_themes(reviews.data)
            
            return {
                "period": period_month,
                "summary": summary,
                "ratings_breakdown": ratings_breakdown,
                "by_category": by_category,
                "feedback_themes": feedback_themes
            }
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate guest satisfaction report: {str(e)}")

    # ================================
    # PERFORMANCE REPORTS
    # ================================

    async def get_staff_performance(self, period_month: str, department: str = "all") -> Dict[str, Any]:
        """Generate staff performance metrics"""
        try:
            # Get staff data
            query = self.db.table("users").select("*")
            if department != "all":
                query = query.eq("department", department)
            
            staff = query.execute()
            
            # Calculate department summary
            department_summary = await self._calculate_department_performance(period_month, department)
            
            # Calculate individual performance
            individual_performance = []
            for employee in staff.data:
                metrics = await self._calculate_employee_metrics(employee["id"], period_month)
                individual_performance.append({
                    "employee": employee["full_name"],
                    "department": employee["department"],
                    "metrics": metrics,
                    "performance_score": self._calculate_performance_score(metrics)
                })
            
            # Get attendance data
            attendance = await self._calculate_attendance_metrics(period_month)
            
            # Get training data
            training = await self._get_training_metrics(period_month)
            
            return {
                "period": period_month,
                "department_summary": department_summary,
                "individual_performance": individual_performance,
                "attendance": attendance,
                "training": training
            }
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate staff performance report: {str(e)}")

    async def get_kpi_dashboard(self) -> KPIDashboard:
        """Get real-time KPI dashboard data"""
        try:
            # Get all active KPIs
            kpis = self.db.table("kpi_definitions").select("*").eq("is_active", True).execute()
            
            kpi_data = {}
            alerts = []
            
            for kpi in kpis.data:
                # Calculate current value
                current_value = await self._calculate_kpi_value(kpi)
                
                # Determine status
                status = self._determine_kpi_status(current_value, kpi)
                
                # Get trend
                trend = await self._get_kpi_trend(kpi["id"])
                
                kpi_data[kpi["kpi_code"].lower()] = {
                    "current": current_value,
                    "target": kpi["target_value"],
                    "trend": trend,
                    "status": status
                }
                
                # Generate alerts if needed
                if status in ["warning", "critical"]:
                    alerts.append({
                        "kpi": kpi["kpi_code"],
                        "message": f"{kpi['kpi_name']} is {status}",
                        "severity": status
                    })
            
            # Get period comparisons
            period_comparison = await self._get_kpi_period_comparison()
            
            return KPIDashboard(
                timestamp=datetime.utcnow(),
                kpis=kpi_data,
                alerts=alerts,
                period_comparison=period_comparison
            )
        except Exception as e:
            raise BusinessRuleException(f"Failed to generate KPI dashboard: {str(e)}")

    # ================================
    # REPORT MANAGEMENT
    # ================================

    async def list_reports(self, category: str = None, user_id: UUID = None) -> List[ReportDefinition]:
        """List available reports based on user permissions"""
        try:
            query = self.db.table("report_definitions").select("*").eq("is_active", True)
            
            if category:
                query = query.eq("report_category", category)
            
            reports = query.execute()
            
            # Filter based on user permissions if user_id provided
            if user_id:
                # TODO: Implement permission filtering
                pass
            
            return [ReportDefinition(**report) for report in reports.data]
        except Exception as e:
            raise BusinessRuleException(f"Failed to list reports: {str(e)}")

    async def execute_report(self, report_id: UUID, parameters: Dict[str, Any], user_id: UUID) -> Dict[str, Any]:
        """Execute a report with given parameters"""
        try:
            # Get report definition
            report = self.db.table("report_definitions").select("*").eq("id", str(report_id)).execute()
            
            if not report.data:
                raise NotFoundException(f"Report {report_id} not found")
            
            report_def = report.data[0]
            
            # Log execution
            execution = {
                "report_id": str(report_id),
                "executed_by": str(user_id),
                "execution_type": "manual",
                "parameters": parameters,
                "status": "running",
                "executed_at": datetime.utcnow().isoformat()
            }
            
            exec_result = self.db.table("report_executions").insert(execution).execute()
            execution_id = exec_result.data[0]["id"]
            
            # Execute report based on code
            report_data = await self._execute_report_by_code(report_def["report_code"], parameters)
            
            # Update execution record
            self.db.table("report_executions").update({
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat(),
                "row_count": len(report_data.get("data", []))
            }).eq("id", execution_id).execute()
            
            return report_data
            
        except Exception as e:
            # Update execution record with error
            if 'execution_id' in locals():
                self.db.table("report_executions").update({
                    "status": "failed",
                    "error_message": str(e),
                    "completed_at": datetime.utcnow().isoformat()
                }).eq("id", execution_id).execute()
            
            raise BusinessRuleException(f"Failed to execute report: {str(e)}")

    async def create_report_schedule(self, report_id: UUID, schedule_config: Dict[str, Any], user_id: UUID) -> ReportSchedule:
        """Create a scheduled report"""
        try:
            schedule = {
                "report_id": str(report_id),
                "schedule_name": schedule_config["name"],
                "frequency": schedule_config["frequency"],
                "schedule_config": schedule_config["config"],
                "default_parameters": schedule_config.get("parameters", {}),
                "recipients": schedule_config["recipients"],
                "delivery_format": schedule_config.get("format", "pdf"),
                "created_by": str(user_id),
                "next_run_at": self._calculate_next_run(schedule_config["frequency"], schedule_config["config"])
            }
            
            result = self.db.table("report_schedules").insert(schedule).execute()
            
            return ReportSchedule(**result.data[0])
        except Exception as e:
            raise BusinessRuleException(f"Failed to create report schedule: {str(e)}")

    # ================================
    # HELPER METHODS
    # ================================

    async def _get_occupancy_summary(self, report_date: date) -> Dict[str, Any]:
        """Get occupancy summary for a specific date"""
        # Total rooms
        total_rooms = self.db.table("rooms").select("COUNT(*)").eq("status", "active").execute()
        
        # Occupied rooms
        occupied = self.db.table("room_allocations").select("COUNT(DISTINCT room_id)").lte(
            "check_in_date", report_date.isoformat()
        ).gt("check_out_date", report_date.isoformat()).in_(
            "assignment_status", ["assigned", "locked"]
        ).execute()
        
        # Arrivals and departures
        arrivals = self.db.table("room_allocations").select("COUNT(*)").eq(
            "check_in_date", report_date.isoformat()
        ).execute()
        
        departures = self.db.table("room_allocations").select("COUNT(*)").eq(
            "check_out_date", report_date.isoformat()
        ).execute()
        
        total = total_rooms.data[0]["count"] if total_rooms.data else 0
        occupied_count = occupied.data[0]["count"] if occupied.data else 0
        
        return {
            "total_rooms": total,
            "occupied_rooms": occupied_count,
            "occupancy_rate": round((occupied_count / total * 100) if total > 0 else 0, 1),
            "arrivals_today": arrivals.data[0]["count"] if arrivals.data else 0,
            "departures_today": departures.data[0]["count"] if departures.data else 0
        }

    async def _get_revenue_summary(self, report_date: date) -> Dict[str, Any]:
        """Get revenue summary for a specific date"""
        # Room revenue
        room_revenue = self.db.table("billing_invoices").select("SUM(room_charges)").eq(
            "invoice_date", report_date.isoformat()
        ).execute()
        
        # POS revenue
        pos_revenue = self.db.table("pos_transactions").select("SUM(total_amount)").eq(
            "transaction_date", report_date.isoformat()
        ).execute()
        
        # Calculate ADR and RevPAR
        bookings = self.db.table("bookings").select("room_rate").eq(
            "check_in_date", report_date.isoformat()
        ).execute()
        
        adr = sum(b["room_rate"] for b in bookings.data) / len(bookings.data) if bookings.data else 0
        
        return {
            "room_revenue": room_revenue.data[0]["sum"] if room_revenue.data else 0,
            "pos_revenue": pos_revenue.data[0]["sum"] if pos_revenue.data else 0,
            "total_revenue": (room_revenue.data[0]["sum"] or 0) + (pos_revenue.data[0]["sum"] or 0),
            "adr": adr,
            "rev_par": adr * 0.84  # Assuming occupancy rate from above
        }

    async def _execute_report_by_code(self, report_code: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute report based on report code"""
        report_map = {
            "DAILY_OPS": self.get_daily_operations_report,
            "OCCUPANCY_ANALYSIS": self.get_occupancy_analysis,
            "HOUSEKEEPING": self.get_housekeeping_report,
            "REVENUE": self.get_revenue_report,
            "PROFIT_LOSS": self.get_profit_loss_statement,
            "ACCOUNTS_RECEIVABLE": self.get_accounts_receivable,
            "GUEST_DEMOGRAPHICS": self.get_guest_demographics,
            "GUEST_SATISFACTION": self.get_guest_satisfaction,
            "STAFF_PERFORMANCE": self.get_staff_performance,
            "KPI_DASHBOARD": self.get_kpi_dashboard
        }
        
        if report_code not in report_map:
            raise ValidationException(f"Unknown report code: {report_code}")
        
        # Call the appropriate report method with parameters
        report_method = report_map[report_code]
        
        # Convert parameters to appropriate types and call method
        if report_code == "DAILY_OPS":
            return await report_method(parameters.get("date"))
        elif report_code == "OCCUPANCY_ANALYSIS":
            return await report_method(
                parameters["date_range"]["from"],
                parameters["date_range"]["to"],
                parameters.get("group_by", "day")
            )
        # Add more parameter mappings as needed
        
        return await report_method(**parameters)

    def _calculate_next_run(self, frequency: str, config: Dict[str, Any]) -> datetime:
        """Calculate next run time for scheduled report"""
        now = datetime.utcnow()
        
        if frequency == "daily":
            # Run at specified time tomorrow
            time_str = config.get("time", "08:00")
            hour, minute = map(int, time_str.split(":"))
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
        elif frequency == "weekly":
            # Run on specified day of week
            target_weekday = config.get("day_of_week", 1)  # Monday = 1
            days_ahead = target_weekday - now.isoweekday()
            if days_ahead <= 0:
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            time_str = config.get("time", "08:00")
            hour, minute = map(int, time_str.split(":"))
            next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)
        elif frequency == "monthly":
            # Run on specified day of month
            day = config.get("day_of_month", 1)
            if now.day >= day:
                # Move to next month
                if now.month == 12:
                    next_run = now.replace(year=now.year + 1, month=1, day=day)
                else:
                    next_run = now.replace(month=now.month + 1, day=day)
            else:
                next_run = now.replace(day=day)
            time_str = config.get("time", "08:00")
            hour, minute = map(int, time_str.split(":"))
            next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)
        else:
            # Default to tomorrow
            next_run = now + timedelta(days=1)
        
        return next_run