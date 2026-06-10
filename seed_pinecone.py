import os
import time

os.environ["GOOGLE_API_KEY"] = "AIzaSyCPlTch2vtMpwwWMRCYQJYX8AJnHj170f0"
os.environ["PINECONE_API_KEY"] = "pcsk_6G9Bre_S8jwwWVqJGDq77YSF1n3DUtcj2f5AvviVgW8v8hfCF2P88xajgUhTJVztj4vFbE"

from backend.db.dbconnect import get_db_connection
from backend.services.vector_store import vectorstore
from psycopg2.extras import RealDictCursor

conn = get_db_connection()
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute("SELECT * FROM products")
products = cur.fetchall()
cur.close()
conn.close()

BATCH_SIZE = 3
for i in range(0, len(products), BATCH_SIZE):
    batch = products[i : i + BATCH_SIZE]
    texts = []
    metadatas = []
    ids = []
    for p in batch:
        text = f"{p['productname']} - {p['description']} - Brand: {p['productbrand']} - Price: {p['price']} - Gender: {p['gender']} - Color: {p['primarycolor']}"
        meta = {
            "ProductName": p["productname"],
            "ProductBrand": p["productbrand"],
            "Price": str(p["price"]),
            "Gender": p["gender"],
            "PrimaryColor": p["primarycolor"],
            "Description": p["description"],
            "ProductID": str(p["productid"]),
        }
        texts.append(text)
        metadatas.append(meta)
        ids.append(str(p["productid"]))

    for attempt in range(5):
        try:
            vectorstore.add_texts(texts=texts, metadatas=metadatas, ids=ids)
            print(f"Inserted batch {i // BATCH_SIZE + 1} ({len(batch)} items)")
            break
        except Exception as e:
            if "RESOURCE_EXHAUSTED" in str(e):
                wait = 15
                print(f"Quota hit, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"Error: {e}")
                time.sleep(5)

    time.sleep(1)

print("Done seeding Pinecone!")
