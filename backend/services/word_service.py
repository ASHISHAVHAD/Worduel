"""Word lists loaded from text files."""
import os
import random

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


def _load_words(filename: str) -> list:
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Word file not found: {path}")
    with open(path, "r") as f:
        words = [line.strip().upper() for line in f if line.strip()]
    if not words:
        raise ValueError(f"Word file is empty: {path}")
    return words


WORDLE_WORDS = _load_words("wordle_words.txt")
PICTIONARY_WORDS = _load_words("pictionary_words.txt")


def random_wordle_word() -> str:
    return random.choice(WORDLE_WORDS)


def random_pictionary_word() -> str:
    return random.choice(PICTIONARY_WORDS)


def evaluate_guess(guess: str, target: str) -> list:
    """Evaluate a 5-letter guess against the target word."""
    result = [{"letter": g, "status": "absent"} for g in guess]
    target_chars = list(target)

    for i in range(len(guess)):
        if i < len(target) and guess[i] == target[i]:
            result[i]["status"] = "correct"
            target_chars[i] = None

    for i in range(len(guess)):
        if result[i]["status"] == "correct":
            continue
        if guess[i] in target_chars:
            result[i]["status"] = "present"
            idx = target_chars.index(guess[i])
            target_chars[idx] = None

    return result
