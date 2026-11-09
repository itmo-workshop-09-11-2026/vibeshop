"""Каталог и промокоды. Данные читаются из catalog.json (генерируется tools/export-catalog.mjs)."""
import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel

DATA_FILE = Path(__file__).with_name("catalog.json")

SORTS = ("popular", "price-asc", "price-desc")


class Category(BaseModel):
    id: str
    name: str


class Product(BaseModel):
    id: str
    sku: str
    category: str
    name: str
    price: int
    mass: int
    stock: int
    popularity: int
    image: str
    short: str
    description: str
    specs: List[Tuple[str, str]]


class Promo(BaseModel):
    percent: int
    label: str


class Catalog(BaseModel):
    categories: List[Category]
    products: List[Product]
    promos: Dict[str, Promo]


@lru_cache(maxsize=1)
def load_catalog() -> Catalog:
    return Catalog.model_validate(json.loads(DATA_FILE.read_text(encoding="utf-8")))


def normalize_text(text: str) -> str:
    return " ".join(text.lower().replace("ё", "е").split())


def find_products(category: Optional[str] = None, q: Optional[str] = None, sort: str = "popular") -> List[Product]:
    items = load_catalog().products
    if category and category != "all":
        items = [p for p in items if p.category == category]
    if q:
        needle = normalize_text(q)
        items = [p for p in items if needle in normalize_text(p.name)]
    if sort == "price-asc":
        key = lambda p: (p.price, -p.popularity, p.id)  # noqa: E731
    elif sort == "price-desc":
        key = lambda p: (-p.price, -p.popularity, p.id)  # noqa: E731
    else:
        key = lambda p: (-p.popularity, p.id)  # noqa: E731
    return sorted(items, key=key)


def get_product(product_id: str) -> Optional[Product]:
    return next((p for p in load_catalog().products if p.id == product_id), None)
