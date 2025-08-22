from typing import Dict, Any, Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.orm import Session
from decimal import Decimal

from app.api.deps import get_db, get_current_user
from app.schemas.inventory import (
    ProductCreate, ProductUpdate, ProductResponse,
    StockMovementCreate, StockMovementResponse, StockAdjustment,
    SupplierCreate, SupplierUpdate, SupplierResponse,
    PurchaseOrderCreate, PurchaseOrderResponse,
    ServiceCreate, ServiceUpdate, ServiceResponse,
    InventoryReport, StockLevelResponse
)
from app.services.inventory_service import InventoryService
from app.core.logger import logger

router = APIRouter()


# Product endpoints
@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new product"""
    return await InventoryService.create_product(db, product)


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update product information"""
    return await InventoryService.update_product(db, product_id, product_update)


@router.post("/products/{product_id}/adjust-stock", response_model=StockMovementResponse)
async def adjust_stock(
    product_id: UUID,
    adjustment: StockAdjustment,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Adjust product stock level"""
    adjustment.product_id = product_id
    return await InventoryService.adjust_stock(db, adjustment, current_user['id'])


@router.post("/products/{product_id}/sale", response_model=StockMovementResponse)
async def record_sale(
    product_id: UUID,
    quantity: int = Body(..., gt=0),
    unit_price: Optional[Decimal] = Body(None),
    reference_id: Optional[UUID] = Body(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record a product sale"""
    return await InventoryService.record_sale(db, product_id, quantity, unit_price, reference_id)


@router.get("/products/low-stock", response_model=List[ProductResponse])
async def get_low_stock_products(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get products with low stock"""
    return await InventoryService.get_low_stock_products(db)


# Supplier endpoints
@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new supplier"""
    return await InventoryService.create_supplier(db, supplier)


# Purchase Order endpoints
@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    order: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new purchase order"""
    return await InventoryService.create_purchase_order(db, order, current_user['id'])


@router.post("/purchase-orders/{order_id}/receive", response_model=PurchaseOrderResponse)
async def receive_purchase_order(
    order_id: UUID,
    received_items: Dict[str, int] = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Receive items from a purchase order"""
    items_dict = {UUID(k): v for k, v in received_items.items()}
    return await InventoryService.receive_purchase_order(db, order_id, items_dict, current_user['id'])


# Service endpoints
@router.post("/services", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new service"""
    return await InventoryService.create_service(db, service)


# Report endpoints
@router.get("/report", response_model=InventoryReport)
async def get_inventory_report(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive inventory report"""
    return await InventoryService.get_inventory_report(db)
