"""Промокоды: те же правила, что на сайте (site/js/core/promo.js)."""
from typing import Optional, Tuple

from .catalog import Promo, load_catalog


def normalize_code(raw: str) -> str:
    return raw.strip().upper()


def find_promo(raw: str) -> Optional[Tuple[str, Promo]]:
    code = normalize_code(raw)
    promo = load_catalog().promos.get(code)
    return (code, promo) if promo else None


def calc_discount(subtotal: int, percent: int) -> int:
    """Единое правило округления: до целого рубля, половина вверх, без float."""
    if subtotal <= 0 or percent <= 0:
        return 0
    return (subtotal * percent + 50) // 100
