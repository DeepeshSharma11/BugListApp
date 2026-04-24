import os
import logging
from groq import Groq

logger = logging.getLogger(__name__)

# Initialize Groq client
# This expects GROQ_API_KEY to be set in the environment
try:
    groq_client = Groq()
except Exception as e:
    logger.warning(f"Failed to initialize Groq client (ensure GROQ_API_KEY is set): {e}")
    groq_client = None

def generate_support_draft(subject: str, message: str) -> str:
    """
    Generates an AI draft reply for a support ticket using Groq (Llama model).
    """
    if not groq_client:
        return "Error: Groq API client is not initialized. Please configure GROQ_API_KEY in the environment."

    try:
        completion = groq_client.chat.completions.create(
            model=    "llama-3.3-70b-versatile", # Using a fast standard Llama model
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional, empathetic, and concise customer support agent for a platform called BugTracker. Your job is to draft a reply to a user's support ticket. Do NOT include greetings like 'Dear User' or sign-offs like 'Best regards', as the email system automatically adds those. Just provide the main body of the response."
                },
                {
                    "role": "user",
                    "content": f"Subject: {subject}\n\nMessage:\n{message}"
                }
            ],
            temperature=0.7,
            max_tokens=500,
            top_p=1,
            stream=False,
            stop=None,
        )
        
        draft = completion.choices[0].message.content.strip()
        return draft
    except Exception as e:
        logger.error(f"Error generating LLM draft: {e}")
        return f"Error generating draft: {e}"
