import os
import re
from google import genai
from google.genai import errors
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor
from db.dbconnect import get_db_connection

load_dotenv(dotenv_path="backend/db/.env")

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

system_message = (
    "You are a helpful shop assistant. Answer only about the shop's product catalog. "
    "Use a friendly tone. If irrelevant, say: 'I can only help with product-related queries, sir.'"
)

BRANDS = ["nike", "adidas", "puma", "reebok", "asics", "converse", "vans", "new balance", "on running", "salomon", "decathlon"]
GENDERS = ["men", "women", "unisex"]
COLORS = ["black", "white", "blue", "red", "green", "grey", "gray", "pink", "purple", "orange", "brown", "beige", "cream", "navy", "coral", "olive", "multi"]

EXACT_BRANDS = {b.lower(): b.title() for b in ["ASICS", "Adidas", "Converse", "Decathlon", "New Balance", "Nike", "On Running", "Puma", "Reebok", "Salomon", "Vans"]}

def word_in(text, word):
    return bool(re.search(r'\b' + re.escape(word) + r'\b', text))

def extract_price_filter(query):
    nums = re.findall(r'(\d[\d,]*\d)', query)
    prices = [int(n.replace(",", "")) for n in nums]
    if not prices:
        return None, None
    lower = query.lower()
    if "under" in lower or "below" in lower or "less than" in lower or "within" in lower:
        return 0, prices[0]
    if "above" in lower or "over" in lower or "more than" in lower or "greater than" in lower:
        return prices[0], float("inf")
    if "between" in lower and len(prices) >= 2:
        return min(prices), max(prices)
    return None, None

def extract_filters(query):
    lower = query.lower()
    matched_brands = [EXACT_BRANDS[b] for b in BRANDS if word_in(lower, b)]
    matched_genders = [g.capitalize() for g in GENDERS if word_in(lower, g)]
    matched_colors = [c.capitalize() for c in COLORS if word_in(lower, c)]
    min_price, max_price = extract_price_filter(query)
    return {
        "brands": matched_brands,
        "genders": matched_genders,
        "colors": matched_colors,
        "min_price": min_price,
        "max_price": max_price,
    }

def query_db(filters, limit=8):
    conditions = []
    params = []

    if filters["brands"]:
        placeholders = ",".join(["%s"] * len(filters["brands"]))
        conditions.append(f"LOWER(productbrand) IN ({placeholders})")
        params.extend([b.lower() for b in filters["brands"]])
    if filters["genders"]:
        placeholders = ",".join(["%s"] * len(filters["genders"]))
        conditions.append(f"LOWER(gender) IN ({placeholders})")
        params.extend([g.lower() for g in filters["genders"]])
    if filters["colors"]:
        placeholders = ",".join(["%s"] * len(filters["colors"]))
        conditions.append(f"LOWER(primarycolor) IN ({placeholders})")
        params.extend([c.lower() for c in filters["colors"]])
    if filters["min_price"] is not None and filters["max_price"] == float("inf"):
        conditions.append("price >= %s")
        params.append(int(filters["min_price"]))
    elif filters["min_price"] is not None and filters["max_price"] is not None:
        if filters["min_price"] == 0:
            conditions.append("price <= %s")
            params.append(int(filters["max_price"]))
        else:
            conditions.append("price BETWEEN %s AND %s")
            params.extend([int(filters["min_price"]), int(filters["max_price"])])

    if not conditions:
        sql = f"SELECT productname, productbrand, price, gender, primarycolor, description FROM products ORDER BY price ASC LIMIT {limit}"
        params = []
    else:
        sql = "SELECT productname, productbrand, price, gender, primarycolor, description FROM products WHERE " + " AND ".join(conditions) + f" ORDER BY price ASC LIMIT {limit}"

    db = get_db_connection()
    cur = db.cursor(cursor_factory=RealDictCursor)
    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    return rows

def build_local_response(query):
    filters = extract_filters(query)

    parts = []
    if filters["brands"]:
        parts.append(f"brand: {filters['brands'][0]}")
    if filters["genders"]:
        parts.append(f"gender: {filters['genders'][0]}")
    if filters["colors"]:
        parts.append(f"color: {filters['colors'][0]}")
    if filters["min_price"] is not None and filters["max_price"] == float("inf"):
        parts.append(f"price above Rs.{int(filters['min_price']):,}")
    elif filters["min_price"] is not None and filters["max_price"] is not None:
        if filters["min_price"] == 0:
            parts.append(f"price under Rs.{int(filters['max_price']):,}")
        else:
            parts.append(f"price between Rs.{int(filters['min_price']):,} - Rs.{int(filters['max_price']):,}")

    rows = query_db(filters)
    if not rows:
        return "I couldn't find any products matching your query. Try browsing the catalog above."

    lines = [f"Here are the products I found{' for ' + ', '.join(parts) if parts else ''}:"]
    for m in rows:
        price = int(m["price"])
        lines.append(f"* {m['productname']} -- Rs.{price:,} ({m['productbrand']}, {m['gender']}, {m['primarycolor']})")
    lines.append("\nTip: Use the filters above to narrow down your search.")
    return "\n".join(lines)

def generate_response(query, history):
    filters = extract_filters(query)
    has_filters = any([
        filters["brands"],
        filters["genders"],
        filters["colors"],
        filters["min_price"] is not None or filters["max_price"] is not None
    ])

    if has_filters:
        reply = build_local_response(query)
        history.append(f"Assistant: {reply}")
        return reply, history

    try:
        rows = query_db(filters)
        context_str = ""
        for r in rows[:3]:
            context_str += f"Product Name: {r['productname']}\nBrand: {r['productbrand']}\nPrice: {r['price']}\nGender: {r['gender']}\nColor: {r['primarycolor']}\nDescription: {r['description']}\n\n"

        prompt = (
            f"{system_message}\n\n"
            f"Chat history:\n" + "\n".join(history[-6:]) +
            f"\n\nRelevant products:\n{context_str}\n"
            f"Assistant:"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        reply = response.text
        history.append(f"Assistant: {reply}")
        return reply, history
    except Exception:
        reply = "I can only help with product-related queries, sir."
        history.append(f"Assistant: {reply}")
        return reply, history
