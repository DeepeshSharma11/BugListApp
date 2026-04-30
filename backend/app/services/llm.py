import os
import logging
from dotenv import load_dotenv
from groq import Groq

load_dotenv()  # Ensure GROQ_API_KEY is loaded before client init

logger = logging.getLogger(__name__)

# Initialize Groq client
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
        import time
        seed_hint = int(time.time() * 1000) % 99999
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional, empathetic, and concise customer support agent for a platform called BugTracker. Your job is to draft a reply to a user's support ticket. Do NOT include greetings like 'Dear User' or sign-offs like 'Best regards', as the email system automatically adds those. Just provide the main body of the response. Write a unique and varied reply each time."
                },
                {
                    "role": "user",
                    "content": f"Subject: {subject}\n\nMessage:\n{message}\n\n(Draft variation seed: {seed_hint})"
                }
            ],
            temperature=0.9,
            max_tokens=500,
            top_p=0.95,
            stream=False,
            stop=None,
        )
        
        draft = completion.choices[0].message.content.strip()
        return draft
    except Exception as e:
        logger.error(f"Error generating LLM draft: {e}")
        return f"Error generating draft: {e}"


def generate_bug_enhancement(raw_input: str) -> dict:
    """
    Takes a raw user description of a bug (voice-to-text or rough text)
    and returns structured fields: title, description, steps_to_reproduce,
    expected_behavior, actual_behavior, suggested_severity.
    Returns a dict. On error, returns {"error": <msg>}.
    """
    if not groq_client:
        return {"error": "Groq API client not initialized. Configure GROQ_API_KEY."}

    system_prompt = """You are a senior QA engineer helping developers write professional bug reports.
Given a rough description of a bug (possibly from voice-to-text), extract and return a JSON object with these exact keys:
- title: short, clear bug title (max 100 chars)
- description: detailed bug description (2-4 sentences)
- steps_to_reproduce: numbered steps as a single string with newlines
- expected_behavior: what should happen
- actual_behavior: what actually happens
- suggested_severity: one of: low, medium, high, critical

Return ONLY valid JSON. No markdown, no explanation, no code blocks."""

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Raw bug report:\n{raw_input}"},
            ],
            temperature=0.3,
            max_tokens=600,
            top_p=1,
            stream=False,
            stop=None,
        )
        import json
        raw = completion.choices[0].message.content.strip()
        # Strip markdown code fences if model wraps in ```json
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception as e:
        logger.error(f"Error in generate_bug_enhancement: {e}")
        return {"error": str(e)}
