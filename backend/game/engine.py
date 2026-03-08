import random
from typing import List

# 200 common 5-letter words for the game
WORD_LIST = [
    "about","above","abuse","actor","acute","admit","adopt","adult","after","again",
    "agent","agree","ahead","alarm","album","alert","alien","align","alike","alive",
    "alley","allow","alone","along","aloud","alter","angel","anger","angle","angry",
    "anime","ankle","annex","antic","anvil","aorta","apple","apply","apron","aptly",
    "arena","argue","arise","armor","array","arson","aside","asset","atlas","atone",
    "attic","audio","audit","avail","avoid","awake","award","aware","awful","badly",
    "baker","basic","basis","batch","beach","beard","beast","begin","being","below",
    "bench","bible","birth","black","blade","blame","bland","blank","blast","blaze",
    "bleed","bless","blind","block","blood","bloom","blown","blues","blunt","board",
    "bonus","boost","botch","bound","brace","braid","brave","bread","break","breed",
    "bribe","bride","brief","bring","brisk","broke","brook","brown","brush","buddy",
    "build","built","bulge","bumpy","bunch","burst","buyer","cabin","camel","candy",
    "cargo","carry","carve","catch","cause","cease","chain","chair","chalk","chaos",
    "charm","chart","chase","cheap","check","cheek","chess","chest","chick","chief",
    "child","claim","clamp","clash","clasp","class","clean","clear","clerk","click",
    "climb","cling","clock","clone","close","cloth","cloud","coach","coral","cough",
    "count","court","cover","craft","crane","crash","crisp","cross","crowd","cruel",
    "crush","curve","cycle","daily","dance","debug","delay","delve","dense","depth",
    "derby","derby","digit","dirty","disco","doing","doubt","dough","draft","drain",
]

VALID_WORDS = set(WORD_LIST)

# Also allow any real 5-letter attempt (simple check)
def is_valid_word(word: str) -> bool:
    return len(word) == 5 and word.isalpha()

def pick_word() -> str:
    return random.choice(WORD_LIST).upper()

def evaluate_guess(guess: str, target: str) -> List[dict]:
    """Returns per-letter result list."""
    guess  = guess.upper()
    target = target.upper()
    result = [{"letter": g, "status": "absent"} for g in guess]
    target_chars = list(target)

    # Pass 1: mark correct
    for i in range(5):
        if guess[i] == target[i]:
            result[i]["status"] = "correct"
            target_chars[i] = None

    # Pass 2: mark present
    for i in range(5):
        if result[i]["status"] == "correct":
            continue
        if guess[i] in target_chars:
            result[i]["status"] = "present"
            target_chars[target_chars.index(guess[i])] = None

    return result
