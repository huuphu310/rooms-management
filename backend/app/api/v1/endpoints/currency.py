from fastapi import APIRouter, Depends
from decimal import Decimal
from typing import Optional

from app.api.deps import (
    CurrentUser,
    SupabaseClient,
    Cache,
    require_permission
)
from app.schemas.currency import (
    CurrencyConfig,
    CurrencyConfigUpdate,
    ExchangeRateUpdate
)
from app.services.currency_service import CurrencyService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/config", response_model=CurrencyConfig)
async def get_currency_config(
    db: SupabaseClient,
    cache: Cache
):
    """Get current currency configuration"""
    service = CurrencyService(db, cache)
    return await service.get_currency_config()

@router.put("/config", response_model=CurrencyConfig)
async def update_currency_config(
    config_update: CurrencyConfigUpdate,
    current_user: CurrentUser,
    db: SupabaseClient,
    cache: Cache,
    _: dict = Depends(require_permission("admin", "edit"))
):
    """Update currency configuration (admin only)"""
    service = CurrencyService(db, cache)
    return await service.update_currency_config(config_update)

@router.post("/exchange-rate", response_model=CurrencyConfig)
async def update_exchange_rate(
    rate_update: ExchangeRateUpdate,
    current_user: CurrentUser,
    db: SupabaseClient,
    cache: Cache,
    _: dict = Depends(require_permission("admin", "edit"))
):
    """Update a single exchange rate (admin only)"""
    service = CurrencyService(db, cache)
    return await service.update_exchange_rate(rate_update)

@router.get("/convert")
async def convert_currency(
    amount: Decimal,
    from_currency: str,
    to_currency: str,
    db: SupabaseClient,
    cache: Cache
):
    """Convert amount between currencies"""
    service = CurrencyService(db, cache)
    converted = await service.convert_currency(amount, from_currency, to_currency)
    
    return {
        "original_amount": amount,
        "from_currency": from_currency,
        "to_currency": to_currency,
        "converted_amount": converted,
        "rate_applied": converted / amount if amount > 0 else 0
    }