"""Word lists for all game modes."""
import random

WORDLE_WORDS = [
    "APPLE", "BRAVE", "CRANE", "DANCE", "EAGLE", "FLAME", "GRAPE", "HOUSE",
    "IMAGE", "JOKER", "KNIFE", "LEMON", "MAGIC", "NOBLE", "OCEAN", "PIANO",
    "QUEEN", "RIVER", "STORM", "TIGER", "ULTRA", "VIVID", "WHALE", "XENON",
    "YACHT", "ZEBRA", "BLAZE", "CHARM", "DRIFT", "EMBER", "FROST", "GHOST",
    "HAVEN", "IVORY", "JEWEL", "KNACK", "LUNAR", "MARSH", "NERVE", "ORBIT",
    "PEARL", "QUILT", "RADAR", "SHINE", "TORCH", "UNITY", "VIGOR", "WRIST",
    "YOUTH", "ZESTY", "ABOUT", "BELOW", "CLEAR", "DREAM", "EVERY", "FLOAT",
    "GREEN", "HEART", "INPUT", "JOINT", "KRAFT", "LIGHT", "MONEY", "NIGHT",
    "OTHER", "PLACE", "QUIET", "RIGHT", "SOUND", "THINK", "UNDER", "VALUE",
    "WORLD", "YOUNG", "ADAPT", "BLEND", "COVER", "DEPTH", "EXACT", "FRESH",
    "GRANT", "HEAVY", "ISSUE", "JUDGE", "KNOWN", "LARGE", "MOUNT", "NORTH",
    "OUTER", "POWER", "QUICK", "ROUND", "SHARP", "TOUCH", "UPPER", "VOCAL",
    "WATCH", "OXIDE", "YIELD", "ZONES", "ALIEN", "BEACH", "CLIMB", "DODGE",
    "ELITE", "FORGE", "GLOBE", "HOIST", "INDEX", "JOLLY", "KARMA", "LOTUS",
    "MAPLE", "NUDGE", "OPTIC", "PLUMB", "QUEST", "REIGN", "SLEEK", "TRUCE",
]

PICTIONARY_WORDS = [
    "ELEPHANT", "RAINBOW", "VOLCANO", "BICYCLE", "PIRATE", "DRAGON", "CASTLE",
    "GUITAR", "OCTOPUS", "ROCKET", "PENGUIN", "TORNADO", "DIAMOND", "ANCHOR",
    "COMPASS", "LANTERN", "BALLOON", "MONSTER", "SUNRISE", "CHICKEN", "HAMMER",
    "ISLAND", "LADDER", "MAGNET", "PARROT", "SPIDER", "TROPHY", "WIZARD",
    "CANDLE", "BRIDGE", "FOREST", "GARDEN", "HELMET", "JUNGLE", "KNIGHT",
    "MIRROR", "PILLOW", "RABBIT", "SHIELD", "THRONE", "CAMERA", "PLANET",
    "CASTLE", "FLOWER", "TURTLE", "BANANA", "CHERRY", "WINDOW", "BOTTLE",
]


def random_wordle_word() -> str:
    return random.choice(WORDLE_WORDS)


def random_pictionary_word() -> str:
    return random.choice(PICTIONARY_WORDS)


def evaluate_guess(guess: str, target: str) -> list:
    """Evaluate a 5-letter guess against the target word."""
    result = [{"letter": g, "status": "absent"} for g in guess]
    target_chars = list(target)

    # First pass: correct positions
    for i in range(len(guess)):
        if i < len(target) and guess[i] == target[i]:
            result[i]["status"] = "correct"
            target_chars[i] = None

    # Second pass: present but wrong position
    for i in range(len(guess)):
        if result[i]["status"] == "correct":
            continue
        if guess[i] in target_chars:
            result[i]["status"] = "present"
            idx = target_chars.index(guess[i])
            target_chars[idx] = None

    return result
