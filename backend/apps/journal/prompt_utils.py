import os
import requests 
import json    
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Base URL for the Gemini API
GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/"
GEMINI_MODEL_NAME = "gemini-2.0-flash"

def get_journal_prompt(mood_type=None):
    """
    Generates a journal prompt using the Google Gemini AI model via direct HTTP requests.
    Falls back to a default if API key is missing or an error occurs.

    Args:
        mood_type (str, optional): The categorized mood (e.g., "tired", "happy", "anxious", "sad").
                                   Defaults to None, which provides a general prompt.

    Returns:
        str: A relevant journal prompt from Gemini or a default.
    """
    api_key = os.getenv('GEMINI_API_KEY') # Access API key directly from environment variables

    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment variables. Falling back to default prompts.")
        return _get_default_prompt(mood_type)

    try:
        mood_type_lower = mood_type.lower().strip() if mood_type else "neutral"

        # Construct the prompt for Gemini
        base_prompt = "You are a helpful assistant that provides short, reflective journal prompts. "
        if mood_type_lower == "anxious":
            user_input = "I'm feeling anxious."
            specific_guidance = "Provide a prompt that encourages finding calm and self-soothing related to nature or personal reflection. Make it concise and actionable."
        elif mood_type_lower == "sad":
            user_input = "I'm feeling sad."
            specific_guidance = "Provide a prompt that encourages comfort and noticing beauty, possibly related to plants or gentle self-care."
        elif mood_type_lower == "happy":
            user_input = "I'm feeling happy."
            specific_guidance = "Provide a prompt that helps celebrate joy and identify its sources, maybe linking to plant growth or gratitude."
        elif mood_type_lower == "stressed":
            user_input = "I'm feeling stressed."
            specific_guidance = "Provide a prompt that helps break down stress and identify small, manageable actions, possibly related to plant care routines."
        elif mood_type_lower == "relaxed":
            user_input = "I'm feeling relaxed."
            specific_guidance = "Provide a prompt that helps deepen feelings of peace and connection with the environment, perhaps observing plants."
        elif mood_type_lower == "energetic":
            user_input = "I'm feeling energetic."
            specific_guidance = "Provide a prompt that encourages channeling energy creatively or productively, possibly in relation to plant projects."
        else: # neutral or unknown mood
            user_input = "I want a general journal prompt."
            specific_guidance = "Provide a general, reflective journal prompt about daily feelings or observations, possibly linking to nature."
        
        full_gemini_prompt = f"{base_prompt} My current mood is: '{user_input}' {specific_guidance}"

        # --- CRITICAL CHANGE: Direct API call using requests ---
        headers = {
            "Content-Type": "application/json",
        }
        params = {
            "key": api_key # API key goes as a query parameter for Gemini API
        }
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": full_gemini_prompt}
                    ]
                }
            ]
        }
        
        # Make the POST request to the Gemini API
        response = requests.post(
            f"{GEMINI_API_BASE_URL}{GEMINI_MODEL_NAME}:generateContent",
            headers=headers,
            params=params,
            json=payload, # Use json= for automatic JSON serialization
            timeout=10 # Set a timeout for the request
        )
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)

        response_data = response.json()
        
        # Extract the generated text from the response
        if response_data and 'candidates' in response_data and \
           len(response_data['candidates']) > 0 and \
           'content' in response_data['candidates'][0] and \
           'parts' in response_data['candidates'][0]['content'] and \
           len(response_data['candidates'][0]['content']['parts']) > 0 and \
           'text' in response_data['candidates'][0]['content']['parts'][0]:
            
            return response_data['candidates'][0]['content']['parts'][0]['text'].strip()
        else:
            logger.error(f"Gemini API returned unexpected structure for mood '{mood_type}'. Response: {response_data}")
            return _get_default_prompt(mood_type) # Fallback if response structure is unexpected

    except requests.exceptions.RequestException as req_e:
        logger.error(f"Network or HTTP error calling Gemini API for mood '{mood_type}': {req_e}")
        # Log specific HTTP status code if available
        if req_e.response is not None:
            logger.error(f"Gemini API response status: {req_e.response.status_code}, body: {req_e.response.text}")
        return _get_default_prompt(mood_type) # Fallback on network/HTTP errors
    except json.JSONDecodeError as json_e:
        logger.error(f"JSON decode error from Gemini API response for mood '{mood_type}': {json_e}")
        return _get_default_prompt(mood_type) # Fallback on JSON errors
    except Exception as e:
        logger.error(f"An unexpected error occurred calling Gemini API for mood '{mood_type}': {e}")
        return _get_default_prompt(mood_type) # Catch any other unexpected errors

def _get_default_prompt(mood_type=None):
    """
    Provides a simple, hardcoded journal prompt as a fallback.
    """
    mood_type = mood_type.lower().strip() if mood_type else "neutral"
    
    prompts = {
        "tired": "Reflect on the most peaceful part of your day, and how you can bring more peace into tomorrow.",
        "happy": "Capture what made today joyful. What small things contributed to your happiness?",
        "anxious": "When you feel anxious, what helps you find calm? Describe a peaceful memory or a comforting thought.",
        "sad": "It's okay to feel sad. Write about a source of comfort or something beautiful you noticed today.",
        "stressed": "What's causing stress right now? Brainstorm one small action you can take to ease the burden.",
        "relaxed": "Describe a moment of deep relaxation today. What sensations or thoughts accompanied it?",
        "energetic": "Full of energy? Your plants might benefit from a gentle clean or or repotting!",
        "neutral": "How are you feeling right now? What's affecting your mood, even subtly?",
    }
    return prompts.get(mood_type, prompts["neutral"])
