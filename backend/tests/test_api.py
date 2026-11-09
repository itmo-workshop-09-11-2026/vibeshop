from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "products": 16}
    assert r.headers["cache-control"] == "no-cache"


def test_products_filters_sort():
    assert len(client.get("/api/products").json()) == 16
    food = client.get("/api/products", params={"category": "food"}).json()
    assert food and all(p["category"] == "food" for p in food)
    assert [p["id"] for p in client.get("/api/products", params={"q": "  КРУЖКА "}).json()] == ["mag-mug"]
    asc = [p["price"] for p in client.get("/api/products", params={"sort": "price-asc"}).json()]
    assert asc == sorted(asc)
    desc = [p["price"] for p in client.get("/api/products", params={"sort": "price-desc"}).json()]
    assert desc == sorted(desc, reverse=True)
    pop = [p["popularity"] for p in client.get("/api/products").json()]
    assert pop == sorted(pop, reverse=True)
    assert client.get("/api/products", params={"q": "ёжик"}).json() == []
    # поиск и категория вместе
    assert client.get("/api/products", params={"q": "эспрессо", "category": "gear"}).json() == []
    assert client.get("/api/products", params={"sort": "bad"}).status_code == 422


def test_promo_valid_and_rounding():
    r = client.post("/api/promo/validate", json={"code": " orbit10 ", "subtotal": 300}).json()
    assert r["valid"] and r["code"] == "ORBIT10" and r["percent"] == 10
    assert r["discount"] == 30 and r["total"] == 270
    # половина вверх: 5 ₽ → скидка 1 ₽
    assert client.post("/api/promo/validate", json={"code": "ORBIT10", "subtotal": 5}).json()["discount"] == 1
    assert client.post("/api/promo/validate", json={"code": "ORBIT10", "subtotal": 4}).json()["discount"] == 0
    no_sum = client.post("/api/promo/validate", json={"code": "ORBIT10"}).json()
    assert no_sum["valid"] and no_sum["discount"] is None


def test_promo_invalid_and_bad_input():
    r = client.post("/api/promo/validate", json={"code": "WRONG", "subtotal": 300}).json()
    assert r["valid"] is False and r["discount"] is None and "нет" in r["message"]
    assert client.post("/api/promo/validate", json={"code": "  "}).json()["valid"] is False
    assert client.post("/api/promo/validate", json={"code": "ORBIT10", "subtotal": -1}).status_code == 422
    assert client.post("/api/promo/validate", json={}).status_code == 422
