"""Reads one narration line aloud with Piper, pausing at punctuation.

    python narrate.py <voice.onnx> <out.wav> <text>

Piper leaves pauses to the voice model, which often reads straight through
commas, colons and even full stops. Instead the line is split at
punctuation, each piece is voiced on its own (ending with its punctuation,
so it still sounds like the end of a phrase), and the pieces are joined
with a set silence:

    , (comma)                     PAUSES["comma"]
    ; : and a spaced dash ( - )   PAUSES["clause"]
    . ! ? (end of a sentence)     PAUSES["sentence"]
    [pause] in the text           PAUSES["marker"]

"5,570" and "0.5" are not split (no space after the mark).
Called by scripts/voice.mjs.
"""

import re
import sys
import wave

from piper import PiperVoice

PAUSES = {"comma": 0.15, "clause": 0.3, "sentence": 0.35, "marker": 0.5}

# A break: punctuation followed by a space, a spaced dash, or [pause].
BREAK = re.compile(
    r"(?P<sentence>(?<=[.!?])\s+)"
    r"|(?P<clause>(?<=[;:])\s+|\s+[—–-]\s+)"
    r"|(?P<comma>(?<=,)\s+)"
    r"|(?P<marker>\s*\[pause\]\s*)",
    re.IGNORECASE,
)


def pieces(text):
    """The line as (piece, pause after it in seconds)."""
    result, start = [], 0
    for match in BREAK.finditer(text):
        piece = text[start : match.start()].strip()
        if piece:
            result.append((piece, PAUSES[match.lastgroup]))
        elif result:  # two breaks in a row: keep the longer pause
            last, pause = result[-1]
            result[-1] = (last, max(pause, PAUSES[match.lastgroup]))
        start = match.end()
    tail = text[start:].strip()
    if tail:
        result.append((tail, 0.0))
    return result


def main():
    model, out, text = sys.argv[1], sys.argv[2], sys.argv[3]
    voice = PiperVoice.load(model)
    rate = voice.config.sample_rate
    audio = bytearray()
    for piece, pause in pieces(text):
        for chunk in voice.synthesize(piece):
            audio += chunk.audio_int16_bytes
        audio += bytes(2 * int(rate * pause))  # 16-bit silence
    with wave.open(out, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(bytes(audio))


if __name__ == "__main__":
    main()
