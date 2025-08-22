from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException, status
from decimal import Decimal

from app.models.inventory import (
    Product, StockMovement, Supplier, PurchaseOrder, 
    PurchaseOrderItem, Service, StockLocation, StockLevel,
    MovementTypeEnum, StockStatusEnum, PurchaseOrderStatusEnum
)
from app.schemas.inventory import (
    ProductCreate, ProductUpdate, ProductResponse,
    StockMovementCreate, StockMovementResponse, StockAdjustment,
    SupplierCreate, SupplierUpdate, SupplierResponse,
    PurchaseOrderCreate, PurchaseOrderResponse,
    ServiceCreate, ServiceUpdate, ServiceResponse,
    InventoryReport, StockLevelResponse
)
from app.core.logger import logger
from app.core.redis_client import CacheService, cache_service
import json


class InventoryService:
    
    @staticmethod
    async def create_product(db: Session, product_data: ProductCreate) -> ProductResponse:
        try:
            existing = db.query(Product).filter(Product.sku == product_data.sku).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Product with SKU {product_data.sku} already exists"
                )
            
            product_dict = product_data.dict(exclude={'initial_stock', 'supplier_id'})
            db_product = Product(
                **product_dict,
                supplier_id=product_data.supplier_id,
                current_stock=product_data.initial_stock
            )
            db.add(db_product)
            db.flush()
            
            if product_data.initial_stock > 0:
                movement = StockMovement(
                    product_id=db_product.id,
                    movement_type=MovementTypeEnum.PURCHASE,
                    quantity=product_data.initial_stock,
                    stock_before=0,
                    stock_after=product_data.initial_stock,
                    unit_price=product_data.cost_price,
                    total_value=product_data.cost_price * product_data.initial_stock,
                    notes="Initial stock"
                )
                db.add(movement)
                db_product.last_restock_date = datetime.utcnow()
            
            db.commit()
            db.refresh(db_product)
            
            await InventoryService._invalidate_cache()
            logger.info(f"Product created: {db_product.id} - {db_product.name}")
            return ProductResponse.from_orm(db_product)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating product: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create product: {str(e)}"
            )

    @staticmethod
    async def update_product(
        db: Session,
        product_id: UUID,
        product_update: ProductUpdate
    ) -> ProductResponse:
        try:
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with id {product_id} not found"
                )
            
            update_data = product_update.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(product, field, value)
            
            product.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(product)
            
            await InventoryService._invalidate_cache(product_id)
            logger.info(f"Product updated: {product_id}")
            return ProductResponse.from_orm(product)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating product {product_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update product: {str(e)}"
            )

    @staticmethod
    async def adjust_stock(
        db: Session,
        adjustment: StockAdjustment,
        user_id: UUID
    ) -> StockMovementResponse:
        try:
            product = db.query(Product).filter(Product.id == adjustment.product_id).first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product not found"
                )
            
            stock_before = product.current_stock
            difference = adjustment.new_quantity - stock_before
            
            if difference == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No stock change required"
                )
            
            movement_type = MovementTypeEnum.ADJUSTMENT
            quantity = abs(difference)
            
            movement = StockMovement(
                product_id=product.id,
                movement_type=movement_type,
                quantity=quantity,
                stock_before=stock_before,
                stock_after=adjustment.new_quantity,
                unit_price=product.cost_price,
                total_value=product.cost_price * quantity,
                notes=f"{adjustment.reason}. {adjustment.notes or ''}",
                created_by=user_id
            )
            
            product.current_stock = adjustment.new_quantity
            
            db.add(movement)
            db.commit()
            db.refresh(movement)
            
            await InventoryService._invalidate_cache(product.id)
            logger.info(f"Stock adjusted for product {product.id}: {stock_before} -> {adjustment.new_quantity}")
            
            return StockMovementResponse.from_orm(movement)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error adjusting stock: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to adjust stock: {str(e)}"
            )

    @staticmethod
    async def record_sale(
        db: Session,
        product_id: UUID,
        quantity: int,
        unit_price: Optional[Decimal] = None,
        reference_id: Optional[UUID] = None
    ) -> StockMovementResponse:
        try:
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found"
                )
            
            if product.current_stock < quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock. Available: {product.current_stock}"
                )
            
            stock_before = product.current_stock
            stock_after = stock_before - quantity
            sale_price = unit_price or product.selling_price
            
            movement = StockMovement(
                product_id=product_id,
                movement_type=MovementTypeEnum.SALE,
                quantity=quantity,
                stock_before=stock_before,
                stock_after=stock_after,
                unit_price=sale_price,
                total_value=sale_price * quantity,
                reference_type="pos_transaction",
                reference_id=reference_id
            )
            
            product.current_stock = stock_after
            product.last_sale_date = datetime.utcnow()
            
            db.add(movement)
            db.commit()
            db.refresh(movement)
            
            await InventoryService._invalidate_cache(product_id)
            logger.info(f"Sale recorded for product {product_id}: {quantity} units")
            
            return StockMovementResponse.from_orm(movement)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error recording sale: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to record sale: {str(e)}"
            )

    @staticmethod
    async def create_purchase_order(
        db: Session,
        order_data: PurchaseOrderCreate,
        user_id: UUID
    ) -> PurchaseOrderResponse:
        try:
            supplier = db.query(Supplier).filter(Supplier.id == order_data.supplier_id).first()
            if not supplier:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Supplier not found"
                )
            
            order_number = f"PO-{datetime.now().strftime('%Y%m%d')}-{db.query(PurchaseOrder).count() + 1:04d}"
            
            subtotal = Decimal(0)
            tax_total = Decimal(0)
            
            for item in order_data.items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if not product:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Product {item.product_id} not found"
                    )
                
                item_total = item.quantity * item.unit_price
                item_tax = item.tax_amount or (item_total * product.tax_rate / 100)
                subtotal += item_total
                tax_total += item_tax
            
            db_order = PurchaseOrder(
                order_number=order_number,
                supplier_id=order_data.supplier_id,
                status=PurchaseOrderStatusEnum.DRAFT,
                subtotal=subtotal,
                tax_total=tax_total,
                total_amount=subtotal + tax_total,
                expected_delivery=order_data.expected_delivery,
                notes=order_data.notes,
                created_by=user_id
            )
            db.add(db_order)
            db.flush()
            
            for item_data in order_data.items:
                product = db.query(Product).filter(Product.id == item_data.product_id).first()
                item_total = item_data.quantity * item_data.unit_price
                
                db_item = PurchaseOrderItem(
                    purchase_order_id=db_order.id,
                    product_id=item_data.product_id,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    tax_amount=item_data.tax_amount or (item_total * product.tax_rate / 100),
                    total_amount=item_total
                )
                db.add(db_item)
            
            db.commit()
            db.refresh(db_order)
            
            logger.info(f"Purchase order created: {db_order.order_number}")
            return PurchaseOrderResponse.from_orm(db_order)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating purchase order: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create purchase order: {str(e)}"
            )

    @staticmethod
    async def receive_purchase_order(
        db: Session,
        order_id: UUID,
        received_items: Dict[UUID, int],
        user_id: UUID
    ) -> PurchaseOrderResponse:
        try:
            order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
            if not order:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Purchase order not found"
                )
            
            if order.status == PurchaseOrderStatusEnum.RECEIVED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Order already fully received"
                )
            
            all_received = True
            
            for item in order.items:
                if item.product_id in received_items:
                    received_qty = received_items[item.product_id]
                    item.received_quantity += received_qty
                    
                    if item.received_quantity > item.quantity:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Received quantity exceeds ordered quantity for product {item.product_id}"
                        )
                    
                    product = db.query(Product).filter(Product.id == item.product_id).first()
                    stock_before = product.current_stock
                    stock_after = stock_before + received_qty
                    
                    movement = StockMovement(
                        product_id=item.product_id,
                        movement_type=MovementTypeEnum.PURCHASE,
                        quantity=received_qty,
                        stock_before=stock_before,
                        stock_after=stock_after,
                        unit_price=item.unit_price,
                        total_value=item.unit_price * received_qty,
                        reference_type="purchase_order",
                        reference_id=order.id,
                        created_by=user_id
                    )
                    db.add(movement)
                    
                    product.current_stock = stock_after
                    product.last_restock_date = datetime.utcnow()
                    
                    if item.received_quantity < item.quantity:
                        all_received = False
                else:
                    if item.received_quantity < item.quantity:
                        all_received = False
            
            if all_received:
                order.status = PurchaseOrderStatusEnum.RECEIVED
                order.received_date = datetime.utcnow()
            else:
                order.status = PurchaseOrderStatusEnum.PARTIAL
            
            db.commit()
            db.refresh(order)
            
            await InventoryService._invalidate_cache()
            logger.info(f"Purchase order {order.order_number} received")
            
            return PurchaseOrderResponse.from_orm(order)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error receiving purchase order: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to receive purchase order: {str(e)}"
            )

    @staticmethod
    async def get_low_stock_products(db: Session) -> List[ProductResponse]:
        try:
            products = db.query(Product).filter(
                and_(
                    Product.is_active == True,
                    Product.current_stock <= Product.reorder_point
                )
            ).all()
            
            return [ProductResponse.from_orm(p) for p in products]
            
        except Exception as e:
            logger.error(f"Error getting low stock products: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get low stock products: {str(e)}"
            )

    @staticmethod
    async def get_inventory_report(db: Session) -> InventoryReport:
        try:
            total_products = db.query(Product).filter(Product.is_active == True).count()
            
            total_value = db.query(
                func.sum(Product.current_stock * Product.cost_price)
            ).filter(Product.is_active == True).scalar() or 0
            
            low_stock = db.query(Product).filter(
                and_(
                    Product.is_active == True,
                    Product.current_stock <= Product.min_stock,
                    Product.current_stock > 0
                )
            ).all()
            
            out_of_stock = db.query(Product).filter(
                and_(
                    Product.is_active == True,
                    Product.current_stock == 0
                )
            ).all()
            
            top_selling_query = db.query(
                Product.id,
                Product.name,
                Product.sku,
                func.count(StockMovement.id).label('sales_count'),
                func.sum(StockMovement.quantity).label('total_sold')
            ).join(
                StockMovement, 
                and_(
                    StockMovement.product_id == Product.id,
                    StockMovement.movement_type == MovementTypeEnum.SALE
                )
            ).filter(
                StockMovement.created_at >= datetime.utcnow() - timedelta(days=30)
            ).group_by(
                Product.id, Product.name, Product.sku
            ).order_by(
                desc('total_sold')
            ).limit(10).all()
            
            top_selling = [
                {
                    "product_id": str(item[0]),
                    "name": item[1],
                    "sku": item[2],
                    "sales_count": item[3],
                    "total_sold": item[4]
                }
                for item in top_selling_query
            ]
            
            stock_by_category = db.query(
                Product.category,
                func.sum(Product.current_stock * Product.cost_price).label('value')
            ).filter(
                Product.is_active == True
            ).group_by(Product.category).all()
            
            stock_valuation = {
                str(cat): float(val) for cat, val in stock_by_category
            }
            
            return InventoryReport(
                total_products=total_products,
                total_stock_value=Decimal(str(total_value)),
                low_stock_items=[ProductResponse.from_orm(p) for p in low_stock],
                out_of_stock_items=[ProductResponse.from_orm(p) for p in out_of_stock],
                top_selling_products=top_selling,
                slow_moving_products=[],
                expiring_soon=[],
                stock_valuation=stock_valuation
            )
            
        except Exception as e:
            logger.error(f"Error generating inventory report: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate inventory report: {str(e)}"
            )

    @staticmethod
    async def create_supplier(db: Session, supplier_data: SupplierCreate) -> SupplierResponse:
        try:
            db_supplier = Supplier(**supplier_data.dict())
            db.add(db_supplier)
            db.commit()
            db.refresh(db_supplier)
            
            logger.info(f"Supplier created: {db_supplier.id} - {db_supplier.name}")
            return SupplierResponse.from_orm(db_supplier)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating supplier: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create supplier: {str(e)}"
            )

    @staticmethod
    async def create_service(db: Session, service_data: ServiceCreate) -> ServiceResponse:
        try:
            db_service = Service(**service_data.dict())
            db.add(db_service)
            db.commit()
            db.refresh(db_service)
            
            logger.info(f"Service created: {db_service.id} - {db_service.name}")
            return ServiceResponse.from_orm(db_service)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating service: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create service: {str(e)}"
            )

    @staticmethod
    async def _invalidate_cache(product_id: Optional[UUID] = None):
        try:
            if product_id:
                await cache_service.delete(f"product:{product_id}")
            
            # Delete pattern matching keys
            await cache_service.delete_pattern("inventory:*")
        except Exception as e:
            logger.warning(f"Failed to invalidate cache: {str(e)}")