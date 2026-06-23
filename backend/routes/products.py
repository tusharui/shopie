from fastapi import APIRouter
from psycopg2.extras import RealDictCursor
from db.dbconnect import get_db_connection

router = APIRouter()

@router.get("/products")
def get_products():
    db = get_db_connection()
    cursor = db.cursor(cursor_factory=RealDictCursor)

    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()

    cursor.close()

    return products