"""ОРБИТА API: каталог, проверка промокода, health. Учебный проект, данные вымышлены."""
from typing import List, Optional

from fastapi import APIRouter, FastAPI, HTTPException, Query, Request
from pydantic import BaseModel, Field

from .catalog import SORTS, Catalog, Category, Product, find_products, get_product, load_catalog
from .promo import calc_discount, find_promo, normalize_code

app = FastAPI(
    title="ОРБИТА API",
    version="1.0.0",
    description="Каталог и промокоды учебного магазина «ОРБИТА». Все данные вымышлены.",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)
api = APIRouter(prefix="/api")


class Health(BaseModel):
    status: str
    products: int


class PromoRequest(BaseModel):
    code: str = Field(max_length=64, description="Промокод; регистр и пробелы по краям не важны")
    subtotal: Optional[int] = Field(default=None, ge=0, le=100_000_000, description="Стоимость товаров в целых рублях")


class PromoResult(BaseModel):
    valid: bool
    code: str
    percent: int = 0
    discount: Optional[int] = None
    total: Optional[int] = None
    message: str


@app.middleware("http")
async def no_cache(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("Cache-Control", "no-cache")
    return response


@api.get("/health", response_model=Health, tags=["service"])
def health() -> Health:
    return Health(status="ok", products=len(load_catalog().products))


@api.get("/catalog", response_model=Catalog, tags=["catalog"], summary="Категории, товары и промокоды целиком")
def catalog() -> Catalog:
    return load_catalog()


@api.get("/categories", response_model=List[Category], tags=["catalog"])
def categories() -> List[Category]:
    return load_catalog().categories


@api.get("/products", response_model=List[Product], tags=["catalog"])
def products(
    category: Optional[str] = Query(default=None, description="id категории или all"),
    q: Optional[str] = Query(default=None, max_length=100, description="Поиск по названию"),
    sort: str = Query(default="popular", description="popular | price-asc | price-desc"),
) -> List[Product]:
    if sort not in SORTS:
        raise HTTPException(status_code=422, detail="sort: допустимо popular, price-asc, price-desc")
    return find_products(category, q, sort)


@api.get("/products/{product_id}", response_model=Product, tags=["catalog"])
def product(product_id: str) -> Product:
    found = get_product(product_id)
    if found is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return found


@api.post("/promo/validate", response_model=PromoResult, tags=["promo"])
def validate_promo(body: PromoRequest) -> PromoResult:
    code = normalize_code(body.code)
    if not code:
        return PromoResult(valid=False, code="", message="Введите промокод.")
    found = find_promo(code)
    if found is None:
        return PromoResult(valid=False, code=code, message="Такого промокода нет. Проверьте написание.")
    code, promo = found
    discount = calc_discount(body.subtotal, promo.percent) if body.subtotal is not None else None
    total = body.subtotal - discount if discount is not None else None
    return PromoResult(
        valid=True, code=code, percent=promo.percent, discount=discount, total=total,
        message=f"Промокод {code} применён: {promo.label}.",
    )


app.include_router(api)
