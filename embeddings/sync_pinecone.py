import os
import time
import psycopg2
import pandas as pd

from dotenv import load_dotenv
from tqdm.auto import tqdm
from pinecone import Pinecone, ServerlessSpec
from langchain_google_genai import GoogleGenerativeAIEmbeddings


load_dotenv()


# =========================
# Pinecone Configuration
# =========================

api_key = os.getenv("PINECONE_API_KEY")

pc = Pinecone(api_key=api_key)

spec = ServerlessSpec(
    cloud="aws",
    region="us-east-1"
)

index_name = "shop-product-catalog"

existing_indexes = [
    index_info["name"]
    for index_info in pc.list_indexes()
]

if index_name not in existing_indexes:
    pc.create_index(
        name=index_name,
        dimension=768,
        metric="dotproduct",
        spec=spec
    )

    while not pc.describe_index(index_name).status["ready"]:
        time.sleep(1)

index = pc.Index(index_name)

time.sleep(1)


# =========================
# PostgreSQL (Neon)
# =========================

db_connection = psycopg2.connect(
    os.getenv("DATABASE_URL")
)

cursor = db_connection.cursor()


# =========================
# Google Embeddings
# =========================

os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")

embed_model = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001"
)


# =========================
# Fetch Data
# =========================

def fetch_data():
    query = "SELECT * FROM products"

    cursor.execute(query)

    columns = [
        desc[0]
        for desc in cursor.description
    ]

    rows = cursor.fetchall()

    return pd.DataFrame(rows, columns=columns)


# =========================
# Pinecone Sync
# =========================

def sync_with_pinecone(data):

    batch_size = 100

    total_batches = (
        len(data) + batch_size - 1
    ) // batch_size

    for i in tqdm(
        range(0, len(data), batch_size),
        desc="Processing Batches",
        unit="batch",
        total=total_batches
    ):

        i_end = min(len(data), i + batch_size)

        batch = data.iloc[i:i_end]

        # Product IDs
        ids = [
            str(row["ProductID"])
            for _, row in batch.iterrows()
        ]

        # Text for embedding
        texts = [
            f"{row['Description']} "
            f"{row['ProductName']} "
            f"{row['ProductBrand']} "
            f"{row['Gender']} "
            f"{row['Price']} "
            f"{row['PrimaryColor']}"
            for _, row in batch.iterrows()
        ]

        # Generate embeddings
        embeddings = embed_model.embed_documents(texts)

        # Metadata
        metadata = [
            {
                "ProductName": row["ProductName"],
                "ProductBrand": row["ProductBrand"],
                "Gender": row["Gender"],
                "Price": row["Price"],
                "PrimaryColor": row["PrimaryColor"],
                "Description": row["Description"],
            }
            for _, row in batch.iterrows()
        ]

        # Upsert into Pinecone
        vectors = list(
            zip(ids, embeddings, metadata)
        )

        with tqdm(
            total=len(vectors),
            desc="Upserting Vectors",
            unit="vector"
        ) as pbar:

            index.upsert(vectors=vectors)

            pbar.update(len(vectors))


# =========================
# Main
# =========================

def main():

    try:
        data = fetch_data()

        print(f"Fetched {len(data)} products")

        sync_with_pinecone(data)

        print("Sync completed successfully!")

    finally:
        cursor.close()
        db_connection.close()


if __name__ == "__main__":
    main()