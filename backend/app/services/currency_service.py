from typing import Dict, Optional
from uuid import UUID, uuid4
from datetime import datetime
from decimal import Decimal
import logging

from app.schemas.currency import (
    CurrencyConfig, 
    CurrencyConfigUpdate, 
    CurrencyRate,
    ExchangeRateUpdate
)
from app.core.exceptions import NotFoundException, BadRequestException

logger = logging.getLogger(__name__)

class CurrencyService:
    def __init__(self, db, cache):
        self.db = db
        self.cache = cache
        
    async def get_currency_config(self) -> CurrencyConfig:
        """Get current currency configuration"""
        cache_key = "currency:config"
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return CurrencyConfig(**cached)
        
        try:
            # Get from database
            response = self.db.table("currency_config").select("*").single().execute()
            
            if response.data:
                config = CurrencyConfig(**response.data)
            else:
                # Create default configuration
                config = await self._create_default_config()
            
            # Cache for 1 hour
            await self.cache.set(cache_key, config.model_dump(), expire=3600)
            return config
            
        except Exception as e:
            logger.error(f"Error getting currency config: {str(e)}")
            # Return default if error
            return await self._create_default_config()
    
    async def update_currency_config(self, update: CurrencyConfigUpdate) -> CurrencyConfig:
        """Update currency configuration"""
        try:
            # Get existing config
            existing = await self.get_currency_config()
            
            # Prepare update data
            update_data = update.model_dump(exclude_unset=True)
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            if existing.id:
                # Update existing
                response = self.db.table("currency_config").update(update_data).eq("id", str(existing.id)).execute()
                if not response.data:
                    raise BadRequestException("Failed to update currency configuration")
                config = CurrencyConfig(**response.data[0])
            else:
                # Create new
                update_data['id'] = str(uuid4())
                update_data['created_at'] = datetime.utcnow().isoformat()
                response = self.db.table("currency_config").insert(update_data).execute()
                config = CurrencyConfig(**response.data[0])
            
            # Clear cache
            await self.cache.delete("currency:config")
            
            return config
            
        except Exception as e:
            logger.error(f"Error updating currency config: {str(e)}")
            raise
    
    async def update_exchange_rate(self, update: ExchangeRateUpdate) -> CurrencyConfig:
        """Update a single exchange rate"""
        try:
            config = await self.get_currency_config()
            
            # Update the rate
            if not config.rates:
                config.rates = {}
            
            config.rates[update.currency_code] = CurrencyRate(
                code=update.currency_code,
                rate=update.rate,
                name=update.name or update.currency_code,
                symbol=update.symbol or update.currency_code,
                updated_at=datetime.utcnow()
            )
            
            # Save to database
            update_data = {
                'rates': {k: v.model_dump() for k, v in config.rates.items()},
                'last_updated': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if config.id:
                response = self.db.table("currency_config").update(update_data).eq("id", str(config.id)).execute()
                if not response.data:
                    raise BadRequestException("Failed to update exchange rate")
                result = CurrencyConfig(**response.data[0])
            else:
                # Create new config with this rate
                update_data['id'] = str(uuid4())
                update_data['base_currency'] = config.base_currency
                update_data['auto_update'] = False
                update_data['update_frequency'] = 'daily'
                update_data['created_at'] = datetime.utcnow().isoformat()
                response = self.db.table("currency_config").insert(update_data).execute()
                result = CurrencyConfig(**response.data[0])
            
            # Clear cache
            await self.cache.delete("currency:config")
            
            return result
            
        except Exception as e:
            logger.error(f"Error updating exchange rate: {str(e)}")
            raise
    
    async def convert_currency(self, amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
        """Convert amount between currencies"""
        config = await self.get_currency_config()
        
        # If same currency, return as is
        if from_currency == to_currency:
            return amount
        
        # Get rates
        base_currency = config.base_currency
        
        # Convert to base currency first
        if from_currency != base_currency:
            if from_currency not in config.rates:
                raise BadRequestException(f"Exchange rate not configured for {from_currency}")
            from_rate = config.rates[from_currency].rate
            amount_in_base = amount / from_rate
        else:
            amount_in_base = amount
        
        # Convert from base to target currency
        if to_currency != base_currency:
            if to_currency not in config.rates:
                raise BadRequestException(f"Exchange rate not configured for {to_currency}")
            to_rate = config.rates[to_currency].rate
            final_amount = amount_in_base * to_rate
        else:
            final_amount = amount_in_base
        
        return final_amount
    
    async def _create_default_config(self) -> CurrencyConfig:
        """Create default currency configuration"""
        return CurrencyConfig(
            base_currency="VND",
            rates={
                "USD": CurrencyRate(
                    code="USD",
                    rate=Decimal("0.000041"),  # 1 VND = 0.000041 USD
                    name="US Dollar",
                    symbol="$",
                    updated_at=datetime.utcnow()
                ),
                "EUR": CurrencyRate(
                    code="EUR",
                    rate=Decimal("0.000037"),  # 1 VND = 0.000037 EUR
                    name="Euro",
                    symbol="€",
                    updated_at=datetime.utcnow()
                ),
                "GBP": CurrencyRate(
                    code="GBP",
                    rate=Decimal("0.000032"),  # 1 VND = 0.000032 GBP
                    name="British Pound",
                    symbol="£",
                    updated_at=datetime.utcnow()
                )
            },
            auto_update=False,
            update_frequency="daily",
            last_updated=datetime.utcnow()
        )