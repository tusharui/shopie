import os
import pandas as pd
import psycopg2

from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/db/.env")


def main():
    # Read CSV
    csv_file = "shop-product-catalog.csv"
    data = pd.read_csv(csv_file)

    # Connect to Neon PostgreSQL
    connection = psycopg2.connect(
        os.getenv("DATABASE_URL")
    )

    cursor = connection.cursor()

    try:
        sql = """
        INSERT INTO products (
            ProductID,
            ProductName,
            ProductBrand,
            Gender,
            Price,
            Description,
            PrimaryColor
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        records = data[
            [
                "ProductID",
                "ProductName",
                "ProductBrand",
                "Gender",
                "Price",
                "Description",
                "PrimaryColor"
            ]
        ].values.tolist()

        cursor.executemany(sql, records)

        connection.commit()

        print(f"Successfully inserted {len(records)} products.")

    except Exception as e:
        connection.rollback()
        print(f"Error: {e}")

    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()