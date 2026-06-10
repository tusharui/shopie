import streamlit as st
import requests

st.set_page_config(page_title="Customer Care Chatbot", layout="wide")

# Sidebar Title
st.sidebar.title("💬 Customer Care Chatbot")

# Chat history state
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# Display previous messages in sidebar
for chat in st.session_state.chat_history:
    st.sidebar.markdown(f"**You:** {chat['user']}")
    st.sidebar.markdown(f"**Bot:** {chat['bot']}")

# User input
user_input = st.sidebar.text_input("Type your message...", key="user_input")

# Send to FastAPI when input is entered
if user_input:
    try:
        # You can pass the user_input to backend if your API accepts it (currently it doesn’t)
        # Example GET with param: response = requests.get(f"http://localhost:8000/?msg={user_input}")
        response = requests.get("http://localhost:8000/")
        bot_reply = response.json().get("message", "Error: No response")

    except Exception as e:
        bot_reply = f"Error contacting server: {e}"

    # Update chat history
    st.session_state.chat_history.append({
        "user": user_input,
        "bot": bot_reply
    })

    # Clear input and rerun
    st.rerun()

# Blank main interface
st.markdown("<h1 style='text-align: center; color: gray;'>Welcome to the Customer Care Chatbot</h1>", unsafe_allow_html=True)