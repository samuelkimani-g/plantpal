import requests
import json
import os
from django.conf import settings

# This function will make a call to the Gemini API
def get_suggestion(mood_type="neutral", journal_text=""):
    """
    Generates a journal prompt suggestion using the Gemini API based on mood type and optional journal text.
    """
    api_key = os.environ.get("GEMINI_API_KEY") # Ensure GEMINI_API_KEY is set in your environment variables
    if not api_key:
        print("GEMINI_API_KEY is not set in environment variables.")
        return "Please set GEMINI_API_KEY to get AI suggestions."

    # Construct the prompt for the LLM
    prompt_text = f"As a helpful AI assistant for a digital plant companion app, provide a concise (max 2 sentences) and encouraging journal prompt. The user is currently feeling {mood_type}. "
    if journal_text:
        prompt_text += f"Their last journal entry was: '{journal_text[:100]}...'. " # Truncate text for prompt
    prompt_text += "Suggest something positive and relevant to their mood or general well-being that relates to growth or self-reflection."

    # Gemini API endpoint (using gemini-2.0-flash as specified earlier)
    api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {
        'Content-Type': 'application/json',
    }
    params = {
        'key': api_key
    }

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt_text}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 100, # Keep the suggestion concise
        }
    }

    try:
        response = requests.post(api_url, headers=headers, params=params, data=json.dumps(payload))
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        result = response.json()
        
        # Parse the response to get the generated text
        if result.get('candidates') and result['candidates'][0].get('content') and result['candidates'][0]['content'].get('parts'):
            return result['candidates'][0]['content']['parts'][0]['text']
        else:
            print("Gemini API did not return expected structure:", result)
            return "No suggestion available at this moment."
    except requests.exceptions.RequestException as e:
        print(f"Error calling Gemini API: {e}")
        return "Failed to get AI suggestion. Please try again later."
    except json.JSONDecodeError:
        print(f"Error decoding JSON from Gemini API response: {response.text}")
        return "Failed to process AI suggestion."
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return "An unknown error occurred with AI suggestion."

