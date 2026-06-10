import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore

load_dotenv(dotenv_path="backend/db/.env")

# Init embedding model
embedding_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

# Init Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = "shop-product-catalog"

existing = [i.name for i in pc.list_indexes()]
if index_name not in existing:
    pc.create_index(
        name=index_name,
        dimension=3072,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

index = pc.Index(index_name)

# Init vectorstore
vectorstore = PineconeVectorStore(
    index=index,
    embedding=embedding_model,
    text_key="Description"
)