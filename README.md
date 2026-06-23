# Shopie — AI-Powered Shop Assistant

Shopie is a full-stack AI shopping assistant that lets users browse, filter, and search a product catalog through both a traditional UI and a conversational chatbot powered by Google Gemini. The chatbot understands natural language queries like *"show me Nike shoes under 5000"* and returns structured product recommendations alongside a filtered product grid.

---

## Features

- **AI Chatbot** — Natural language product search using Google Gemini 2.5 Flash. Understands brands, genders, colors, and price ranges (under, above, between).
- **Product Catalog** — Responsive grid of product cards with real-time client-side filtering by brand, gender, and price sort.
- **Dual Filtering** — Chatbot and catalog filters stay in sync: typing in the chat simultaneously filters the product grid.
- **Vector Search** — Pinecone vector store with Gemini embeddings enables semantic product search (extensible).
- **Dark Theme** — Modern glassmorphism UI with Tailwind CSS v4 dark theme.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **Backend** | Python FastAPI, Uvicorn |
| **Database** | Neon PostgreSQL (serverless) |
| **Vector DB** | Pinecone (gemini-embedding-001) |
| **AI / LLM** | Google Gemini 2.5 Flash |
| **Deployment** | Docker Compose, Vercel (frontend + backend) |

---

## Project Structure

```
shopie/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt         # Python dependencies
│   ├── db/
│   │   ├── .env                 # Secrets (DATABASE_URL, API keys)
│   │   └── dbconnect.py         # PostgreSQL connection singleton
│   ├── routes/
│   │   ├── chat.py              # POST /chat endpoint
│   │   └── products.py          # GET /products endpoint
│   └── services/
│       ├── gemini_chain.py      # Chatbot logic, filter extraction, SQL query builder
│       └── vector_store.py      # Pinecone vector store initialization
├── frontend/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (Geist font)
│   │   ├── page.tsx             # Product catalog page + client-side filtering
│   │   └── globals.css          # Global styles, Tailwind import
│   ├── components/
│   │   ├── ChatSidebar.tsx      # Chat assistant sidebar UI
│   │   └── ProductCard.tsx      # Product card component
│   └── lib/
│       └── api.ts               # Fetch wrapper for backend API
├── data/
│   └── data_insertion.py        # CSV → PostgreSQL data loader
├── shop-product-catalog.csv     # 129 product records
├── seed_pinecone.py             # Seeds Pinecone from PostgreSQL
├── docker-compose.yml           # Backend + Frontend services
├── Dockerfile                   # Backend Docker image
└── frontend/Dockerfile          # Frontend Docker image
```

---

## System Design

### Architecture Overview

```
┌──────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│   Browser     │       │    Vercel (Frontend)  │       │  Vercel (Backend)│
│  (Next.js)    │──────▶│   Next.js 16 + React  │──────▶│   FastAPI +      │
│               │       │   Tailwind CSS v4     │       │   Uvicorn        │
└──────────────┘       └──────────────────────┘       └────────┬────────┘
                                                               │
                    ┌──────────────────────────────────────────┼──────────┐
                    │                        ┌─────────────────▼──────┐   │
                    │                        │   PostgreSQL (Neon)    │   │
                    │                        │   ┌───────────────┐   │   │
                    │                        │   │   products    │   │   │
                    │                        │   │   (129 rows)  │   │   │
                    │                        │   └───────────────┘   │   │
                    │                        └────────────────────────┘   │
                    │                        ┌────────────────────────┐   │
                    │                        │  Pinecone (Vector DB)  │   │
                    │                        │  gemini-embedding-001  │   │
                    │                        └────────────────────────┘   │
                    └─────────────────────────────────────────────────────┘
                    │
                    │        ┌──────────────────────┐
                    └────────│  Google Gemini       │
                             │  2.5 Flash (Chat)    │
                             │  Embedding 001       │
                             └──────────────────────┘
```

### Data Flow

1. **Page Load** — Frontend fetches all products from `GET /products` and caches them in state.
2. **User Types in Chat** — The query is sent to `POST /chat` AND passed to the frontend search filter simultaneously.
3. **Backend Processing** (`gemini_chain.py`):
   - `extract_filters()` parses the query for brands, genders, colors, and price ranges using regex.
   - If structured filters are found, `build_local_response()` queries PostgreSQL directly with a parameterized SQL query and returns a plain-text bullet list (no AI call — faster and deterministic).
   - If no structured filters are found, the top 3 products are bundled into a prompt and sent to Gemini 2.5 Flash for a conversational response.
4. **Frontend Filtering** — The same query runs through a client-side filter that matches keywords against product name, brand, description, color, and gender. When a price qualifier (under/above/between) is detected, keyword matching is bypassed to stay aligned with the backend.
5. **Rendering** — `filteredProducts` state drives the product card grid. The chat response streams/hydrates into the sidebar.

### Chatbot Logic Detail

```
User Query: "show me Nike shoes under 5000"
                │
                ▼
        extract_filters(query)
         ├── brands: ["Nike"]
         ├── genders: []
         ├── colors: []
         ├── min_price: 0
         └── max_price: 5000
                │
                ▼
        has_filters = true ──────────────────► build_local_response(query)
                                                    │
                                                    ▼
                                            query_db(filters, limit=50)
                                             │
                                             ▼
                                     SQL: SELECT ... WHERE
                                          LOWER(brand) IN ('nike')
                                          AND price <= 5000
                                          ORDER BY price ASC
                                          LIMIT 50
                                             │
                                             ▼
                                     Returns text bullet list:
                                     "Here are the products I found..."
```

### Client-Side Filtering

The `page.tsx` filtering effect runs whenever `[products, searchQuery, brand, gender, sort]` changes:

1. **Price qualifier detection** — If query contains both a price keyword (under/above/between etc.) and digits, keyword text matching is skipped.
2. **Keyword matching** — Remaining words (after removing stop words and numbers) are matched against `productname`, `productbrand`, `description`, `primarycolor`, and `gender` using substring inclusion.
3. **Price filter** — Numbers in the query trigger `<=` or `>=` pricing based on qualifier words.
4. **Dropdown filters** — Brand and gender exact-match filters are applied.
5. **Sort** — Price ascending/descending.

### Database Schema

```sql
CREATE TABLE products (
    ProductID INTEGER PRIMARY KEY,
    ProductName TEXT,
    ProductBrand TEXT,
    Gender TEXT,
    Price INTEGER,
    Description TEXT,
    PrimaryColor TEXT
);
```

The database is a Neon PostgreSQL instance seeded from `shop-product-catalog.csv` (129 products across 11 brands).

---

## Running Locally

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL (or a Neon connection string)
- Google Gemini API key
- Pinecone API key (optional — only needed for vector search)

### 1. Clone and Install

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Configure Environment

Create `backend/db/.env`:

```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
GOOGLE_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
```

### 3. Seed the Database

```bash
python data/data_insertion.py
```

### 4. Start the Backend

```bash
uvicorn backend.main:app --reload --port 8000
```

### 5. Start the Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Using Docker

```bash
docker compose up --build
```

This starts the backend on port 8000 and frontend on port 3000.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/products` | Returns all products from PostgreSQL |
| `POST` | `/chat` | Accepts `{ query, history }`, returns AI response |

### POST /chat

```json
// Request
{ "query": "show me shoes under 2000", "history": [] }

// Response
{
  "response": "Here are the products I found for price under Rs.2,000:\n* Bamba -- Rs.1,299 (Decathlon, Men, Orange)\n* Adilette Slides -- Rs.1,999 (Adidas, Unisex, Blue)\n\nTip: Use the filters above to narrow down your search.",
  "history": ["User: show me shoes under 2000", "Assistant: ..."]
}
```

---

## Deployment

- **Frontend** — Deploy the `frontend/` directory to Vercel. Set `NEXT_PUBLIC_API_URL` to the backend URL.
- **Backend** — Deploy the root directory to Vercel as a Python serverless function, or use `docker compose up` on a VPS.
