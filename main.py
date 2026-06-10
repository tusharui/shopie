from fastapi import FastAPI


app = FastAPI(title="Customer Care Chatbot API", version="1.0.0")

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Customer Care Chatbot API"}

def main():
    print("Hello from customercarechatbot!")


if __name__ == "__main__":
    main()