# REPORTS MODULE - MANAGEMENT & OPERATIONS REPORTING SYSTEM

## 1. OVERVIEW

### 1.1 Purpose
The Reports module provides comprehensive reporting and analytics capabilities for management decision-making and operational monitoring across all homestay operations.

### 1.2 Report Categories
- **Operational Reports**: Daily operations, occupancy, housekeeping
- **Financial Reports**: Revenue, expenses, profitability analysis
- **Guest Analytics**: Guest demographics, satisfaction, loyalty
- **Performance Reports**: Staff productivity, KPIs, efficiency metrics
- **Inventory Reports**: Stock levels, consumption, wastage
- **Compliance Reports**: Tax reports, audit trails, regulatory compliance

### 1.3 Report Features
- **Real-time Data**: Live dashboard with key metrics
- **Scheduled Reports**: Automated generation and distribution
- **Custom Reports**: Build-your-own report builder
- **Export Formats**: PDF, Excel, CSV, API
- **Data Visualization**: Charts, graphs, heatmaps

---

## 2. DATABASE SCHEMA

### 2.1 Report Configuration Tables

```sql
-- Report definitions
CREATE TABLE report_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_code VARCHAR(50) UNIQUE NOT NULL,
    report_name VARCHAR(200) NOT NULL,
    report_category VARCHAR(50) NOT NULL,
    -- 'operational', 'financial', 'guest', 'performance', 'inventory', 'compliance'
    report_type VARCHAR(50) NOT NULL,
    -- 'standard', 'custom', 'dashboard', 'scheduled'
    
    -- Report configuration
    description TEXT,
    sql_query TEXT, -- For custom reports
    parameters JSONB,
    -- {
    --   "date_range": {"type": "daterange", "required": true},
    --   "property_id": {"type": "select", "required": false},
    --   "department": {"type": "multiselect", "required": false}
    -- }
    
    -- Display configuration
    display_config JSONB,
    -- {
    --   "charts": ["bar", "line", "pie"],
    --   "tables": true,
    --   "summary_cards": true,
    --   "export_formats": ["pdf", "excel", "csv"]
    -- }
    
    -- Access control
    required_permission VARCHAR(100),
    visibility VARCHAR(20) DEFAULT 'private',
    -- 'public', 'private', 'department', 'role'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Report schedules
CREATE TABLE report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES report_definitions(id),
    schedule_name VARCHAR(100) NOT NULL,
    
    -- Schedule configuration
    frequency VARCHAR(20) NOT NULL,
    -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'
    schedule_config JSONB,
    -- {
    --   "time": "08:00",
    --   "day_of_week": 1, // For weekly
    --   "day_of_month": 1, // For monthly
    --   "cron_expression": "0 8 * * 1" // For custom
    -- }
    
    -- Report parameters
    default_parameters JSONB,
    -- {
    --   "date_range": "last_month",
    --   "property_id": "all"
    -- }
    
    -- Distribution
    recipients JSONB,
    -- {
    --   "emails": ["manager@homestay.com"],
    --   "roles": ["MANAGER", "ACCOUNTANT"],
    --   "slack_channels": ["#daily-reports"]
    -- }
    delivery_format VARCHAR(20) DEFAULT 'pdf',
    
    -- Execution tracking
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    last_status VARCHAR(20),
    error_message TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Report execution history
CREATE TABLE report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES report_definitions(id),
    schedule_id UUID REFERENCES report_schedules(id),
    
    -- Execution details
    executed_by UUID REFERENCES users(id),
    execution_type VARCHAR(20),
    -- 'manual', 'scheduled', 'api'
    
    -- Parameters used
    parameters JSONB,
    
    -- Results
    row_count INTEGER,
    execution_time_ms INTEGER,
    file_url TEXT,
    file_size INTEGER,
    
    -- Status
    status VARCHAR(20),
    -- 'pending', 'running', 'completed', 'failed'
    error_message TEXT,
    
    executed_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Saved report filters
CREATE TABLE report_saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES report_definitions(id),
    user_id UUID REFERENCES users(id),
    
    filter_name VARCHAR(100) NOT NULL,
    filter_config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(report_id, user_id, filter_name)
);

-- Report subscriptions
CREATE TABLE report_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    report_id UUID REFERENCES report_definitions(id),
    
    -- Subscription preferences
    frequency VARCHAR(20),
    delivery_method VARCHAR(20),
    -- 'email', 'in_app', 'slack'
    format VARCHAR(20),
    
    -- Filters
    custom_filters JSONB,
    
    is_active BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, report_id)
);

-- KPI definitions
CREATE TABLE kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_code VARCHAR(50) UNIQUE NOT NULL,
    kpi_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    
    -- Calculation
    calculation_sql TEXT,
    unit VARCHAR(20),
    -- 'percentage', 'currency', 'number', 'ratio'
    
    -- Targets
    target_value DECIMAL(12,2),
    warning_threshold DECIMAL(12,2),
    critical_threshold DECIMAL(12,2),
    
    -- Display
    display_format VARCHAR(50),
    trend_direction VARCHAR(10),
    -- 'higher_better', 'lower_better'
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_report_executions_report ON report_executions(report_id);
CREATE INDEX idx_report_executions_date ON report_executions(executed_at);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at);
```

---

## 3. OPERATIONAL REPORTS

### 3.1 Daily Operations Report

#### `GET /api/reports/daily-operations`
**Description:** Comprehensive daily operational summary
**Parameters:**
- `date`: 2024-01-20 (default: today)
- `property_id`: UUID (optional)

**Response Structure:**
```json
{
  "report_date": "2024-01-20",
  "summary": {
    "occupancy": {
      "total_rooms": 50,
      "occupied_rooms": 42,
      "occupancy_rate": 84,
      "arrivals_today": 8,
      "departures_today": 5,
      "in_house_guests": 95
    },
    "revenue": {
      "room_revenue": 15000000,
      "pos_revenue": 3500000,
      "other_revenue": 500000,
      "total_revenue": 19000000,
      "adr": 357142, // Average Daily Rate
      "rev_par": 300000 // Revenue Per Available Room
    },
    "operations": {
      "check_ins_completed": 8,
      "check_outs_completed": 5,
      "pending_arrivals": 2,
      "pending_departures": 1,
      "rooms_to_clean": 13,
      "maintenance_issues": 2
    }
  },
  "detailed_sections": {
    "arrivals": [
      {
        "booking_code": "BK202401201234",
        "guest_name": "John Doe",
        "room": "301",
        "check_in_time": "14:00",
        "nights": 3,
        "status": "confirmed",
        "special_requests": "Late check-in"
      }
    ],
    "departures": [...],
    "in_house_guests": [...],
    "housekeeping_status": {
      "clean": 35,
      "dirty": 13,
      "inspected": 30,
      "out_of_order": 2
    },
    "vip_guests": [...],
    "long_stay_guests": [...],
    "pending_payments": [...]
  },
  "alerts": [
    {
      "type": "overbooking",
      "severity": "high",
      "message": "Room type Deluxe overbooked for 2024-01-22"
    }
  ]
}
```

### 3.2 Occupancy Analysis Report

#### `GET /api/reports/occupancy-analysis`
**Description:** Detailed occupancy trends and forecasting
**Parameters:**
- `date_range`: {"from": "2024-01-01", "to": "2024-01-31"}
- `group_by`: "day" | "week" | "month"

**Response Structure:**
```json
{
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  },
  "summary": {
    "average_occupancy": 75.5,
    "peak_occupancy": 95,
    "lowest_occupancy": 45,
    "total_room_nights_available": 1550,
    "total_room_nights_sold": 1170
  },
  "trends": [
    {
      "date": "2024-01-01",
      "occupancy_rate": 85,
      "rooms_occupied": 43,
      "adr": 350000,
      "rev_par": 297500
    }
  ],
  "by_room_type": {
    "Standard": {
      "average_occupancy": 82,
      "total_nights_sold": 450
    },
    "Deluxe": {
      "average_occupancy": 78,
      "total_nights_sold": 420
    }
  },
  "by_day_of_week": {
    "Monday": 65,
    "Tuesday": 68,
    "Wednesday": 72,
    "Thursday": 75,
    "Friday": 88,
    "Saturday": 92,
    "Sunday": 85
  },
  "forecast": {
    "next_7_days": 78,
    "next_30_days": 75,
    "recommendations": [
      "Consider promotional rates for mid-week",
      "Increase rates for weekend peak demand"
    ]
  }
}
```

### 3.3 Housekeeping Report

#### `GET /api/reports/housekeeping`
**Description:** Room cleaning status and productivity
```json
{
  "date": "2024-01-20",
  "room_status": {
    "total_rooms": 50,
    "clean_vacant": 8,
    "clean_occupied": 34,
    "dirty_vacant": 5,
    "dirty_occupied": 1,
    "out_of_order": 2
  },
  "cleaning_schedule": {
    "checkout_cleans": 5,
    "stayover_cleans": 35,
    "deep_cleans": 2,
    "total_to_clean": 42
  },
  "staff_productivity": [
    {
      "staff_name": "Mary Johnson",
      "rooms_cleaned": 12,
      "average_time_per_room": 28,
      "efficiency_score": 95
    }
  ],
  "pending_tasks": [
    {
      "room": "105",
      "type": "checkout_clean",
      "priority": "high",
      "assigned_to": "John Smith",
      "due_time": "12:00"
    }
  ],
  "supplies_usage": {
    "towels": 120,
    "amenities_sets": 42,
    "cleaning_supplies_cost": 150000
  }
}
```

---

## 4. FINANCIAL REPORTS

### 4.1 Revenue Report

#### `GET /api/reports/revenue`
**Description:** Comprehensive revenue analysis
**Parameters:**
- `period`: "daily" | "monthly" | "yearly"
- `date_range`: {"from": "2024-01-01", "to": "2024-01-31"}

**Response Structure:**
```json
{
  "summary": {
    "total_revenue": 500000000,
    "room_revenue": 400000000,
    "fnb_revenue": 80000000,
    "other_revenue": 20000000,
    "growth_rate": 15.5,
    "vs_last_period": "+12%"
  },
  "revenue_breakdown": {
    "by_source": {
      "direct_booking": 200000000,
      "ota_booking": 150000000,
      "walk_in": 50000000,
      "corporate": 100000000
    },
    "by_room_type": {
      "Standard": 150000000,
      "Deluxe": 200000000,
      "Suite": 50000000
    },
    "by_payment_method": {
      "cash": 150000000,
      "bank_transfer": 200000000,
      "credit_card": 100000000,
      "e_wallet": 50000000
    }
  },
  "daily_trend": [
    {
      "date": "2024-01-01",
      "revenue": 16000000,
      "transactions": 45,
      "average_transaction": 355555
    }
  ],
  "top_performers": {
    "best_room_type": "Deluxe",
    "best_day": "2024-01-15",
    "highest_adr_day": "2024-01-20"
  },
  "year_over_year": {
    "current_year": 500000000,
    "last_year": 433000000,
    "growth": 67000000,
    "growth_percentage": 15.5
  }
}
```

### 4.2 Profit & Loss Statement

#### `GET /api/reports/profit-loss`
**Description:** P&L statement with expense analysis
```json
{
  "period": "2024-01",
  "revenue": {
    "room_revenue": 400000000,
    "food_beverage": 80000000,
    "other_operating": 20000000,
    "total_revenue": 500000000
  },
  "expenses": {
    "operating_expenses": {
      "salaries_wages": 150000000,
      "employee_benefits": 30000000,
      "utilities": 25000000,
      "supplies": 15000000,
      "maintenance": 10000000,
      "marketing": 20000000,
      "insurance": 8000000,
      "property_tax": 12000000,
      "total_operating": 270000000
    },
    "non_operating_expenses": {
      "depreciation": 20000000,
      "interest": 10000000,
      "total_non_operating": 30000000
    },
    "total_expenses": 300000000
  },
  "profitability": {
    "gross_profit": 230000000,
    "operating_profit": 200000000,
    "net_profit": 200000000,
    "profit_margin": 40,
    "ebitda": 230000000
  },
  "ratios": {
    "expense_ratio": 60,
    "labor_cost_ratio": 36,
    "gop_margin": 46
  },
  "comparison": {
    "vs_last_month": "+8%",
    "vs_last_year": "+15%",
    "vs_budget": "+5%"
  }
}
```

### 4.3 Accounts Receivable Report

#### `GET /api/reports/accounts-receivable`
**Description:** Outstanding payments and aging analysis
```json
{
  "as_of_date": "2024-01-20",
  "summary": {
    "total_receivable": 50000000,
    "current": 30000000,
    "overdue": 20000000,
    "average_days_outstanding": 15
  },
  "aging_analysis": {
    "current": {
      "amount": 30000000,
      "percentage": 60,
      "count": 25
    },
    "1_30_days": {
      "amount": 10000000,
      "percentage": 20,
      "count": 10
    },
    "31_60_days": {
      "amount": 5000000,
      "percentage": 10,
      "count": 5
    },
    "61_90_days": {
      "amount": 3000000,
      "percentage": 6,
      "count": 3
    },
    "over_90_days": {
      "amount": 2000000,
      "percentage": 4,
      "count": 2
    }
  },
  "by_customer": [
    {
      "customer": "ABC Corporation",
      "total_outstanding": 15000000,
      "oldest_invoice": "2024-01-01",
      "days_overdue": 20,
      "risk_level": "medium"
    }
  ],
  "collection_forecast": {
    "expected_this_week": 10000000,
    "expected_this_month": 35000000
  }
}
```

---

## 5. GUEST ANALYTICS REPORTS

### 5.1 Guest Demographics Report

#### `GET /api/reports/guest-demographics`
**Description:** Guest profile analysis
```json
{
  "period": "2024-01",
  "total_guests": 1250,
  "demographics": {
    "by_nationality": {
      "Vietnamese": 450,
      "American": 200,
      "Japanese": 150,
      "Korean": 120,
      "Others": 330
    },
    "by_age_group": {
      "18-25": 150,
      "26-35": 400,
      "36-45": 350,
      "46-55": 250,
      "56+": 100
    },
    "by_gender": {
      "male": 650,
      "female": 580,
      "other": 20
    },
    "by_purpose": {
      "business": 400,
      "leisure": 600,
      "event": 150,
      "other": 100
    }
  },
  "behavior_patterns": {
    "average_length_of_stay": 2.5,
    "booking_lead_time": 7.2,
    "repeat_guest_rate": 25,
    "direct_booking_rate": 40
  },
  "preferences": {
    "room_type": {
      "Standard": 40,
      "Deluxe": 45,
      "Suite": 15
    },
    "payment_method": {
      "cash": 30,
      "bank_transfer": 40,
      "credit_card": 30
    }
  }
}
```

### 5.2 Guest Satisfaction Report

#### `GET /api/reports/guest-satisfaction`
**Description:** Feedback and satisfaction metrics
```json
{
  "period": "2024-01",
  "summary": {
    "total_reviews": 125,
    "average_rating": 4.3,
    "nps_score": 45,
    "response_rate": 35
  },
  "ratings_breakdown": {
    "5_star": 45,
    "4_star": 50,
    "3_star": 20,
    "2_star": 7,
    "1_star": 3
  },
  "by_category": {
    "cleanliness": 4.5,
    "service": 4.4,
    "location": 4.6,
    "facilities": 4.1,
    "value_for_money": 4.2
  },
  "feedback_themes": {
    "positive": [
      {"theme": "Friendly staff", "mentions": 85},
      {"theme": "Clean rooms", "mentions": 72},
      {"theme": "Good location", "mentions": 65}
    ],
    "negative": [
      {"theme": "Slow WiFi", "mentions": 15},
      {"theme": "Noise issues", "mentions": 12},
      {"theme": "Limited parking", "mentions": 8}
    ]
  },
  "action_items": [
    {
      "issue": "WiFi speed",
      "priority": "high",
      "assigned_to": "IT Department",
      "status": "in_progress"
    }
  ]
}
```

---

## 6. PERFORMANCE REPORTS

### 6.1 Staff Performance Report

#### `GET /api/reports/staff-performance`
**Description:** Employee productivity and efficiency metrics
```json
{
  "period": "2024-01",
  "department_summary": {
    "front_desk": {
      "total_staff": 8,
      "check_ins_processed": 450,
      "average_per_staff": 56,
      "efficiency_score": 88
    },
    "housekeeping": {
      "total_staff": 12,
      "rooms_cleaned": 1250,
      "average_per_staff": 104,
      "efficiency_score": 92
    },
    "pos": {
      "total_staff": 5,
      "transactions": 2500,
      "revenue_per_staff": 100000000,
      "efficiency_score": 85
    }
  },
  "individual_performance": [
    {
      "employee": "John Smith",
      "department": "Front Desk",
      "metrics": {
        "check_ins": 75,
        "check_outs": 68,
        "upsells": 12,
        "guest_satisfaction": 4.5
      },
      "ranking": 2,
      "performance_score": 90
    }
  ],
  "attendance": {
    "attendance_rate": 95,
    "punctuality_rate": 92,
    "overtime_hours": 150,
    "leave_taken": 45
  },
  "training": {
    "completed_courses": 25,
    "pending_certifications": 8,
    "average_score": 85
  }
}
```

### 6.2 KPI Dashboard

#### `GET /api/reports/kpi-dashboard`
**Description:** Key Performance Indicators overview
```json
{
  "timestamp": "2024-01-20T15:00:00Z",
  "kpis": {
    "occupancy": {
      "current": 84,
      "target": 80,
      "trend": "up",
      "status": "good"
    },
    "adr": {
      "current": 350000,
      "target": 320000,
      "trend": "up",
      "status": "excellent"
    },
    "rev_par": {
      "current": 294000,
      "target": 256000,
      "trend": "up",
      "status": "excellent"
    },
    "guest_satisfaction": {
      "current": 4.3,
      "target": 4.0,
      "trend": "stable",
      "status": "good"
    },
    "labor_cost_ratio": {
      "current": 32,
      "target": 35,
      "trend": "down",
      "status": "excellent"
    },
    "average_length_of_stay": {
      "current": 2.5,
      "target": 2.2,
      "trend": "up",
      "status": "good"
    }
  },
  "alerts": [
    {
      "kpi": "direct_booking_rate",
      "message": "Below target by 5%",
      "severity": "warning"
    }
  ],
  "period_comparison": {
    "vs_yesterday": "+2%",
    "vs_last_week": "+5%",
    "vs_last_month": "+8%",
    "vs_last_year": "+15%"
  }
}
```

---

## 7. INVENTORY REPORTS

### 7.1 Stock Level Report

#### `GET /api/reports/inventory-stock`
**Description:** Current inventory status
```json
{
  "as_of": "2024-01-20T15:00:00Z",
  "summary": {
    "total_items": 250,
    "total_value": 50000000,
    "low_stock_items": 15,
    "out_of_stock_items": 3,
    "overstock_items": 8
  },
  "by_category": {
    "food_beverage": {
      "items": 120,
      "value": 25000000,
      "turnover_rate": 4.2
    },
    "housekeeping_supplies": {
      "items": 80,
      "value": 15000000,
      "turnover_rate": 3.5
    },
    "amenities": {
      "items": 50,
      "value": 10000000,
      "turnover_rate": 5.0
    }
  },
  "critical_items": [
    {
      "item": "Bath Towels",
      "current_stock": 50,
      "min_stock": 200,
      "status": "critical",
      "days_until_stockout": 2
    }
  ],
  "consumption_forecast": {
    "next_7_days": [
      {"item": "Coffee", "expected_usage": 50, "current_stock": 45}
    ]
  }
}
```

### 7.2 Purchase Analysis Report

#### `GET /api/reports/purchase-analysis`
**Description:** Purchasing patterns and vendor analysis
```json
{
  "period": "2024-01",
  "summary": {
    "total_purchases": 75000000,
    "total_orders": 125,
    "average_order_value": 600000,
    "total_vendors": 25
  },
  "by_vendor": [
    {
      "vendor": "ABC Supplies",
      "total_purchases": 20000000,
      "order_count": 35,
      "on_time_delivery_rate": 95,
      "quality_score": 4.5
    }
  ],
  "cost_analysis": {
    "vs_budget": "-5%",
    "vs_last_month": "+3%",
    "cost_savings": 2000000
  },
  "recommendations": [
    "Consider bulk purchasing for coffee - potential 10% savings",
    "Review vendor pricing for cleaning supplies"
  ]
}
```

---

## 8. COMPLIANCE & AUDIT REPORTS

### 8.1 Tax Report

#### `GET /api/reports/tax-summary`
**Description:** VAT and tax obligations summary
```json
{
  "period": "2024-01",
  "tax_summary": {
    "total_revenue": 500000000,
    "taxable_revenue": 500000000,
    "vat_collected": 50000000,
    "vat_rate": 10,
    "input_vat": 7500000,
    "vat_payable": 42500000
  },
  "by_category": {
    "room_revenue": {
      "amount": 400000000,
      "vat": 40000000
    },
    "fnb_revenue": {
      "amount": 80000000,
      "vat": 8000000
    },
    "other_revenue": {
      "amount": 20000000,
      "vat": 2000000
    }
  },
  "invoice_summary": {
    "total_invoices": 450,
    "electronic_invoices": 400,
    "manual_invoices": 50,
    "cancelled_invoices": 5
  },
  "compliance_status": {
    "filing_deadline": "2024-02-10",
    "days_remaining": 21,
    "required_documents": "ready",
    "status": "compliant"
  }
}
```

### 8.2 Audit Trail Report

#### `GET /api/reports/audit-trail`
**Description:** System activity and security audit
```json
{
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-20"
  },
  "summary": {
    "total_activities": 15420,
    "unique_users": 45,
    "security_events": 12,
    "data_modifications": 8750
  },
  "by_module": {
    "booking": 5200,
    "billing": 3450,
    "pos": 4500,
    "admin": 2270
  },
  "critical_events": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "user": "john.smith",
      "action": "delete_booking",
      "resource": "BK202401151234",
      "ip_address": "192.168.1.100"
    }
  ],
  "user_activities": [
    {
      "user": "admin",
      "login_count": 20,
      "actions_performed": 450,
      "last_activity": "2024-01-20T14:30:00Z"
    }
  ],
  "compliance_checks": {
    "password_policy": "passed",
    "access_control": "passed",
    "data_retention": "passed",
    "backup_verification": "passed"
  }
}
```

---

## 9. CUSTOM REPORT BUILDER

### 9.1 Report Builder API

#### `POST /api/reports/custom/create`
**Description:** Create custom report definition
```json
{
  "report_name": "Weekly Revenue by Source",
  "report_type": "custom",
  "data_source": {
    "tables": ["bookings", "billing_invoices", "pos_transactions"],
    "joins": [
      {
        "from": "bookings.id",
        "to": "billing_invoices.booking_id",
        "type": "left"
      }
    ]
  },
  "columns": [
    {
      "field": "bookings.booking_source",
      "alias": "Source",
      "aggregate": null
    },
    {
      "field": "billing_invoices.total_amount",
      "alias": "Revenue",
      "aggregate": "sum"
    }
  ],
  "filters": [
    {
      "field": "bookings.created_at",
      "operator": "between",
      "value": ["@start_date", "@end_date"]
    }
  ],
  "group_by": ["bookings.booking_source"],
  "order_by": [
    {
      "field": "Revenue",
      "direction": "desc"
    }
  ],
  "visualization": {
    "chart_type": "bar",
    "x_axis": "Source",
    "y_axis": "Revenue"
  }
}
```

### 9.2 Report Query API

#### `POST /api/reports/custom/execute`
**Description:** Execute custom report
```json
{
  "report_id": "uuid",
  "parameters": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "property_id": "uuid"
  },
  "format": "json", // or "csv", "excel", "pdf"
  "include_charts": true
}
```

---

## 10. REPORT SCHEDULING & DISTRIBUTION

### 10.1 Schedule Configuration

#### `POST /api/reports/schedules/create`
**Description:** Create automated report schedule
```json
{
  "report_id": "uuid",
  "schedule_name": "Daily Operations Report",
  "frequency": "daily",
  "time": "08:00",
  "timezone": "Asia/Ho_Chi_Minh",
  "recipients": {
    "emails": [
      "manager@homestay.com",
      "owner@homestay.com"
    ],
    "roles": ["MANAGER", "SUPERVISOR"],
    "slack": {
      "channel": "#daily-reports",
      "webhook_url": "https://hooks.slack.com/..."
    }
  },
  "format": "pdf",
  "include_summary": true,
  "parameters": {
    "property_id": "all",
    "include_forecast": true
  }
}
```

### 10.2 Distribution Methods

```typescript
interface ReportDistribution {
  email: {
    subject_template: "{{report_name}} - {{date}}",
    body_template: "Please find attached the {{report_name}} for {{date}}",
    attachments: ["pdf", "excel"],
    embed_summary: true
  };
  
  slack: {
    message_format: "markdown",
    include_charts: true,
    thread_replies: true,
    mentions: ["@channel", "@manager"]
  };
  
  webhook: {
    url: "https://api.example.com/reports",
    method: "POST",
    headers: {
      "Authorization": "Bearer token",
      "Content-Type": "application/json"
    },
    retry_policy: {
      max_attempts: 3,
      backoff: "exponential"
    }
  };
  
  storage: {
    provider: "s3", // or "google_drive", "onedrive"
    bucket: "reports",
    path: "/{{year}}/{{month}}/{{report_name}}_{{date}}.{{format}}",
    retention_days: 365
  };
}
```

---

## 11. DASHBOARD & VISUALIZATION

### 11.1 Executive Dashboard

```json
{
  "widgets": [
    {
      "id": "occupancy_gauge",
      "type": "gauge",
      "title": "Current Occupancy",
      "data_source": "real_time",
      "refresh_interval": 60,
      "thresholds": {
        "low": 60,
        "medium": 75,
        "high": 90
      }
    },
    {
      "id": "revenue_trend",
      "type": "line_chart",
      "title": "Revenue Trend (30 days)",
      "data_source": "api/reports/revenue-trend",
      "refresh_interval": 300
    },
    {
      "id": "kpi_cards",
      "type": "metric_cards",
      "metrics": [
        "adr",
        "rev_par",
        "occupancy",
        "guest_satisfaction"
      ]
    },
    {
      "id": "booking_heatmap",
      "type": "heatmap",
      "title": "Booking Patterns",
      "dimensions": ["day_of_week", "hour"],
      "metric": "booking_count"
    }
  ],
  "layout": {
    "type": "responsive_grid",
    "columns": 12,
    "rows": "auto"
  }
}
```

### 11.2 Chart Types & Visualizations

```typescript
interface ChartTypes {
  basic: [
    'line',
    'bar',
    'column',
    'pie',
    'donut',
    'area',
    'scatter'
  ];
  
  advanced: [
    'heatmap',
    'treemap',
    'sankey',
    'funnel',
    'waterfall',
    'radar',
    'gauge'
  ];
  
  interactive: {
    drill_down: true,
    zoom_pan: true,
    export: ['png', 'svg', 'pdf'],
    annotations: true,
    real_time_update: true
  };
}
```

---

## 12. PERFORMANCE & OPTIMIZATION

### 12.1 Report Caching

```python
class ReportCache:
    def __init__(self):
        self.cache_ttl = {
            'real_time': 60,  # seconds
            'daily': 3600,    # 1 hour
            'monthly': 86400, # 24 hours
            'static': 604800  # 7 days
        }
    
    def get_cached_report(self, report_id, parameters):
        cache_key = self.generate_cache_key(report_id, parameters)
        cached = redis.get(cache_key)
        
        if cached:
            return json.loads(cached)
        
        # Generate report
        report_data = self.generate_report(report_id, parameters)
        
        # Cache result
        ttl = self.get_ttl(report_id)
        redis.setex(cache_key, ttl, json.dumps(report_data))
        
        return report_data
```

### 12.2 Query Optimization

```sql
-- Materialized view for daily statistics
CREATE MATERIALIZED VIEW daily_statistics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_bookings,
    SUM(total_amount) as revenue,
    AVG(nights) as avg_los,
    COUNT(DISTINCT customer_id) as unique_guests
FROM bookings
WHERE status = 'completed'
GROUP BY DATE(created_at)
WITH DATA;

-- Refresh daily
CREATE OR REPLACE FUNCTION refresh_daily_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_statistics;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh
SELECT cron.schedule('refresh-daily-stats', '0 1 * * *', 
    'SELECT refresh_daily_statistics()');
```

---

## 13. ACCESS CONTROL & PERMISSIONS

### 13.1 Report Permissions

```python
REPORT_PERMISSIONS = {
    'operational': {
        'daily_operations': ['MANAGER', 'SUPERVISOR', 'RECEPTIONIST'],
        'occupancy_analysis': ['MANAGER', 'SUPERVISOR'],
        'housekeeping': ['MANAGER', 'SUPERVISOR', 'HOUSEKEEPER']
    },
    'financial': {
        'revenue': ['MANAGER', 'ACCOUNTANT', 'OWNER'],
        'profit_loss': ['MANAGER', 'ACCOUNTANT', 'OWNER'],
        'accounts_receivable': ['ACCOUNTANT', 'MANAGER']
    },
    'guest': {
        'demographics': ['MANAGER', 'MARKETING'],
        'satisfaction': ['MANAGER', 'SUPERVISOR', 'MARKETING']
    },
    'compliance': {
        'tax_report': ['ACCOUNTANT', 'MANAGER', 'OWNER'],
        'audit_trail': ['ADMIN', 'MANAGER', 'AUDITOR']
    }
}
```

### 13.2 Data Access Control

```python
def apply_data_filters(report_query, user):
    """Apply data access restrictions based on user role"""
    
    if not user.is_super_admin:
        # Property filter
        if not user.can_access_all_properties:
            report_query.filter(property_id=user.property_id)
        
        # Department filter
        if user.role in ['SUPERVISOR', 'STAFF']:
            report_query.filter(department=user.department)
        
        # Date range restriction
        if user.role == 'STAFF':
            max_days = 30
            report_query.filter(
                date__gte=datetime.now() - timedelta(days=max_days)
            )
    
    return report_query
```

---

## 14. EXPORT & INTEGRATION

### 14.1 Export Formats

```python
class ReportExporter:
    def export_pdf(self, report_data):
        """Generate PDF with charts and formatting"""
        pdf = PDFGenerator()
        pdf.add_header(report_data['title'])
        pdf.add_summary(report_data['summary'])
        
        for chart in report_data['charts']:
            pdf.add_chart(chart)
        
        for table in report_data['tables']:
            pdf.add_table(table)
        
        return pdf.generate()
    
    def export_excel(self, report_data):
        """Generate Excel with multiple sheets"""
        workbook = ExcelWorkbook()
        
        # Summary sheet
        workbook.add_sheet('Summary', report_data['summary'])
        
        # Data sheets
        for dataset in report_data['datasets']:
            workbook.add_sheet(dataset['name'], dataset['data'])
        
        # Charts sheet
        workbook.add_charts_sheet(report_data['charts'])
        
        return workbook.generate()
```

### 14.2 API Integration

```typescript
interface ReportAPI {
  // REST endpoints
  rest: {
    base_url: '/api/reports',
    endpoints: {
      list: 'GET /',
      execute: 'POST /{id}/execute',
      schedule: 'POST /{id}/schedule',
      export: 'GET /{id}/export'
    }
  };
  
  // GraphQL schema
  graphql: {
    query: `
      type Query {
        report(id: ID!, parameters: JSON): Report
        reports(category: String): [Report]
        dashboard(type: String): Dashboard
      }
    `,
    subscription: `
      type Subscription {
        reportUpdate(id: ID!): Report
        kpiUpdate(kpi: String!): KPI
      }
    `
  };
  
  // Webhook events
  webhooks: {
    events: [
      'report.generated',
      'report.scheduled',
      'report.failed',
      'kpi.threshold_exceeded'
    ]
  };
}
```