from typing import Dict, Optional
from uuid import UUID, uuid4
from datetime import datetime
from decimal import Decimal
import logging
import json

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
                # Convert rates from JSONB to proper format
                data = response.data
                if data.get('rates'):
                    # Parse rates if they're stored as JSON string
                    if isinstance(data['rates'], str):
                        data['rates'] = json.loads(data['rates'])
                    # Convert rate values to Decimal
                    for code, rate_data in data['rates'].items():
                        if isinstance(rate_data['rate'], (int, float, str)):
                            rate_data['rate'] = Decimal(str(rate_data['rate']))
                
                config = CurrencyConfig(**data)
            else:
                # Create default configuration
                config = await self._create_default_config()
            
            # Cache for 1 hour (convert to dict with float for JSON serialization)
            cache_data = config.model_dump()
            self._convert_decimals_for_json(cache_data)
            await self.cache.set(cache_key, cache_data, expire=3600)
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
            
            # Prepare update data - only update fields that were provided
            update_data = update.model_dump(exclude_unset=True)
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            # Preserve existing settings if not explicitly updated
            if 'auto_update' not in update_data and existing.auto_update is not None:
                update_data['auto_update'] = existing.auto_update
            if 'update_frequency' not in update_data and existing.update_frequency:
                update_data['update_frequency'] = existing.update_frequency
            
            # Convert rates to JSON-serializable format
            if 'rates' in update_data and update_data['rates']:
                rates_dict = {}
                for code, rate in update_data['rates'].items():
                    rate_dict = rate.model_dump() if hasattr(rate, 'model_dump') else rate
                    # Convert Decimal to float for JSON storage
                    if 'rate' in rate_dict and isinstance(rate_dict['rate'], Decimal):
                        rate_dict['rate'] = float(rate_dict['rate'])
                    # Convert datetime to string
                    if isinstance(rate_dict.get('updated_at'), datetime):
                        rate_dict['updated_at'] = datetime.utcnow().isoformat()
                    rates_dict[code] = rate_dict
                update_data['rates'] = json.dumps(rates_dict)
                update_data['last_updated'] = datetime.utcnow().isoformat()
            
            if existing.id:
                # Update existing
                response = self.db.table("currency_config").update(update_data).eq("id", str(existing.id)).execute()
                if not response.data:
                    raise BadRequestException("Failed to update currency configuration")
                config_data = response.data[0]
            else:
                # Create new
                update_data['id'] = str(uuid4())
                update_data['created_at'] = datetime.utcnow().isoformat()
                response = self.db.table("currency_config").insert(update_data).execute()
                config_data = response.data[0]
            
            # Parse the response data
            if config_data.get('rates') and isinstance(config_data['rates'], str):
                config_data['rates'] = json.loads(config_data['rates'])
            
            config = CurrencyConfig(**config_data)
            
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
            
            # Prepare rates for JSON storage
            rates_dict = {}
            for code, rate in config.rates.items():
                rate_dict = rate.model_dump() if hasattr(rate, 'model_dump') else rate
                # Convert Decimal to float for JSON storage
                if isinstance(rate_dict.get('rate'), Decimal):
                    rate_dict['rate'] = float(rate_dict['rate'])
                # Convert datetime to string
                if isinstance(rate_dict.get('updated_at'), datetime):
                    rate_dict['updated_at'] = rate_dict['updated_at'].isoformat()
                rates_dict[code] = rate_dict
            
            # Save to database
            update_data = {
                'rates': json.dumps(rates_dict),
                'last_updated': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if config.id:
                response = self.db.table("currency_config").update(update_data).eq("id", str(config.id)).execute()
                if not response.data:
                    raise BadRequestException("Failed to update exchange rate")
                result_data = response.data[0]
            else:
                # Create new config with this rate
                update_data['id'] = str(uuid4())
                update_data['base_currency'] = config.base_currency
                update_data['auto_update'] = False
                update_data['update_frequency'] = 'daily'
                update_data['created_at'] = datetime.utcnow().isoformat()
                response = self.db.table("currency_config").insert(update_data).execute()
                result_data = response.data[0]
            
            # Parse the response
            if result_data.get('rates') and isinstance(result_data['rates'], str):
                result_data['rates'] = json.loads(result_data['rates'])
            
            result = CurrencyConfig(**result_data)
            
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
                    rate=Decimal("25000"),  # 1 USD = 25000 VND (approximate)
                    name="US Dollar",
                    symbol="$",
                    updated_at=datetime.utcnow()
                ),
                "EUR": CurrencyRate(
                    code="EUR",
                    rate=Decimal("27000"),  # 1 EUR = 27000 VND (approximate)
                    name="Euro",
                    symbol="€",
                    updated_at=datetime.utcnow()
                ),
                "GBP": CurrencyRate(
                    code="GBP",
                    rate=Decimal("31000"),  # 1 GBP = 31000 VND (approximate)
                    name="British Pound",
                    symbol="£",
                    updated_at=datetime.utcnow()
                ),
                "JPY": CurrencyRate(
                    code="JPY",
                    rate=Decimal("170"),  # 1 JPY = 170 VND (approximate)
                    name="Japanese Yen",
                    symbol="¥",
                    updated_at=datetime.utcnow()
                )
            },
            auto_update=False,
            update_frequency="daily",
            last_updated=datetime.utcnow()
        )
    
    def _convert_decimals_for_json(self, data):
        """Recursively convert Decimal values to float for JSON serialization"""
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, Decimal):
                    data[key] = float(value)
                elif isinstance(value, dict):
                    self._convert_decimals_for_json(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            self._convert_decimals_for_json(item)