"""
Input sanitization utilities for Nevika Cura.
Strips dangerous HTML/script content from user inputs.
Blocks prompt injection attempts for AI/LLM routes.
"""
import re
import html


# Pattern to match script tags and event handlers
SCRIPT_PATTERN = re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL)
EVENT_PATTERN = re.compile(r'\bon\w+\s*=', re.IGNORECASE)
TAG_PATTERN = re.compile(r'<[^>]+>')

# Additional XSS vectors
DANGEROUS_PATTERNS = [
    re.compile(r'javascript:', re.IGNORECASE),
    re.compile(r'<iframe', re.IGNORECASE),
    re.compile(r'<object', re.IGNORECASE),
    re.compile(r'<embed', re.IGNORECASE),
    re.compile(r'eval\s*\(', re.IGNORECASE),
    re.compile(r'document\.(cookie|write|location)', re.IGNORECASE),
]

# Prompt injection patterns for AI routes
PROMPT_INJECTION_PATTERNS = [
    re.compile(r'ignore\s+(previous|above|all)\s+(instructions?|prompt)', re.IGNORECASE),
    re.compile(r'you\s+are\s+now\s+a', re.IGNORECASE),
    re.compile(r'system\s*:\s*', re.IGNORECASE),
    re.compile(r'ASSISTANT\s*:', re.IGNORECASE),
    re.compile(r'disregard\s+(everything|all)', re.IGNORECASE),
    re.compile(r'pretend\s+you\s+are', re.IGNORECASE),
    re.compile(r'new\s+instructions?\s*:', re.IGNORECASE),
    re.compile(r'override\s+.*?(instructions?|rules?|guidelines?)', re.IGNORECASE),
]


def sanitize_string(value: str) -> str:
    """Remove dangerous HTML/JS from a string while keeping safe text."""
    if not isinstance(value, str):
        return value
    value = SCRIPT_PATTERN.sub('', value)
    value = EVENT_PATTERN.sub('', value)
    for pattern in DANGEROUS_PATTERNS:
        value = pattern.sub('', value)
    value = TAG_PATTERN.sub('', value)
    value = html.unescape(value)
    return value.strip()


def sanitize_ai_input(value: str, max_length: int = 3000) -> str:
    """Sanitize text before sending to LLM — blocks prompt injection."""
    if not isinstance(value, str):
        return ""
    value = sanitize_string(value[:max_length])
    for pattern in PROMPT_INJECTION_PATTERNS:
        value = pattern.sub('[filtered]', value)
    return value


def is_prompt_injection(text: str) -> bool:
    """Check if text contains prompt injection attempt."""
    if not text:
        return False
    for pattern in PROMPT_INJECTION_PATTERNS:
        if pattern.search(text):
            return True
    return False


def sanitize_dict(data: dict) -> dict:
    """Recursively sanitize all string values in a dictionary."""
    if not isinstance(data, dict):
        return data
    cleaned = {}
    for key, value in data.items():
        if isinstance(value, str):
            cleaned[key] = sanitize_string(value)
        elif isinstance(value, dict):
            cleaned[key] = sanitize_dict(value)
        elif isinstance(value, list):
            cleaned[key] = [
                sanitize_dict(item) if isinstance(item, dict)
                else sanitize_string(item) if isinstance(item, str)
                else item
                for item in value
            ]
        else:
            cleaned[key] = value
    return cleaned
