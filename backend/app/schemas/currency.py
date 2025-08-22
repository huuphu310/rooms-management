from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class CurrencyRate(BaseModel):
    """Exchange rate for a currency"""
    code: str = Field(..., description="Currency code (USD, EUR, etc.)")
    rate: Decimal = Field(..., gt=0, description="Exchange rate relative to base currency")
    name: str = Field(..., description="Currency name")
    symbol: str = Field(..., description="Currency symbol")
    updated_at: Optional[datetime] = None

class CurrencyConfig(BaseModel):
    """Currency configuration for the system"""
    id: Optional[UUID] = None
    base_currency: str = Field(default="VND", description="Base currency code")
    rates: Dict[str, CurrencyRate] = Field(default_factory=dict)
    auto_update: bool = Field(default=False, description="Auto-update exchange rates")
    update_frequency: str = Field(default="daily", description="Update frequency: daily, weekly, monthly")
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class CurrencyConfigUpdate(BaseModel):
    """Update currency configuration"""
    base_currency: Optional[str] = None
    rates: Optional[Dict[str, CurrencyRate]] = None
    auto_update: Optional[bool] = None
    update_frequency: Optional[str] = None

class ExchangeRateUpdate(BaseModel):
    """Update a single exchange rate"""
    currency_code: str
    rate: Decimal = Field(..., gt=0)
    name: Optional[str] = None
    symbol: Optional[str] = None