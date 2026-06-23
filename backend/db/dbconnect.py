import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

_connection = None

def get_db_connection():
    global _connection
    try:
        if _connection is None or _connection.closed:
            _connection = psycopg2.connect(os.getenv("DATABASE_URL"))
        else:
            _connection.cursor().execute("SELECT 1")
    except Exception:
        _connection = psycopg2.connect(os.getenv("DATABASE_URL"))
    return _connection
