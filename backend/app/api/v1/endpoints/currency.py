from fastapi import APIRouter, Depends
from decimal import Decimal
from typing import Optional, Annotated

from app.api.deps import (
    get_current_user,
    get_supabase_service,
    get_cache,
    require_permission)
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
    db = Depends(get_supabase_service),
    cache = Depends(get_cache)
):
    """Get current currency configuration"""
    service = CurrencyService(db, cache)
    return await service.get_currency_config()

@router.put("/config", response_model=CurrencyConfig)
async def update_currency_config(
    config_update: CurrencyConfigUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db = Depends(get_supabase_service),
    cache = Depends(get_cache),
    _: dict = Depends(require_permission("admin", "edit"))
):
    """Update currency configuration (admin only)"""
    service = CurrencyService(db, cache)
    return await service.update_currency_config(config_update)

@router.post("/exchange-rate", response_model=CurrencyConfig)
async def update_exchange_rate(
    rate_update: ExchangeRateUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db = Depends(get_supabase_service),
    cache = Depends(get_cache),
    _: dict = Depends(require_permission("admin", "edit"))
):
    """Update a single exchange rate (admin only)"""
    service = CurrencyService(db, cache)
    return await service.update_exchange_rate(rate_update)

@router.put("/config/auto-update")
async def update_auto_sync_setting(
    auto_update: bool,
    current_user: Annotated[dict, Depends(get_current_user)],
    db = Depends(get_supabase_service),
    cache = Depends(get_cache),
    _: dict = Depends(require_permission("admin", "edit"))
):
    """Update auto-sync setting (admin only)"""
    service = CurrencyService(db, cache)
    update = CurrencyConfigUpdate(auto_update=auto_update)
    return await service.update_currency_config(update)

@router.get("/convert")
async def convert_currency(
    amount: Decimal,
    from_currency: str,
    to_currency: str,
    db = Depends(get_supabase_service),
    cache = Depends(get_cache)
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