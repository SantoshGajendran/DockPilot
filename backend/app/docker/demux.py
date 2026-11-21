import re
import struct
from typing import Any, Dict, List, Optional, Tuple


LEVEL_REGEX = re.compile(
    r"\b(ERROR|CRITICAL|FATAL|WARN|WARNING|INFO|DEBUG|TRACE)\b", re.IGNORECASE
)
TIMESTAMP_REGEX = re.compile(
    r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+(.*)$"
)


def extract_timestamp_and_level(line: str) -> Tuple[Optional[str], str, Optional[str]]:
    ts: Optional[str] = None
    msg = line

    match_ts = TIMESTAMP_REGEX.match(line)
    if match_ts:
        ts = match_ts.group(1)
        msg = match_ts.group(2)

    level: Optional[str] = None
    match_lvl = LEVEL_REGEX.search(msg)
    if match_lvl:
        raw_lvl = match_lvl.group(1).upper()
        if raw_lvl in ("CRITICAL", "FATAL"):
            level = "ERROR"
        elif raw_lvl == "WARNING":
            level = "WARN"
        elif raw_lvl == "TRACE":
            level = "DEBUG"
        else:
            level = raw_lvl

    return ts, msg, level


def demux_docker_stream(data: bytes, is_tty: bool = False) -> List[Dict[str, Any]]:
    if not data:
        return []

    entries: List[Dict[str, Any]] = []

    if is_tty:
        # TTY mode: lines are plain text separated by newline
        text = data.decode("utf-8", errors="replace")
        for line in text.splitlines():
            line_str = line.strip("\r")
            if line_str:
                ts, msg, lvl = extract_timestamp_and_level(line_str)
                entries.append(
                    {
                        "stream": "stdout",
                        "timestamp": ts,
                        "message": msg,
                        "level": lvl,
                    }
                )
        return entries

    # Multiplexed mode: 8-byte header per frame
    # Docker multiplex frames must have stream_type in (1, 2) and bytes 1..4 as 0x000000
    total_len = len(data)
    is_multiplexed = (
        total_len >= 8
        and data[0] in (1, 2)
        and data[1:4] == b"\x00\x00\x00"
    )

    if not is_multiplexed:
        text = data.decode("utf-8", errors="replace")
        for line in text.splitlines():
            line_str = line.strip("\r")
            if line_str:
                ts, msg, lvl = extract_timestamp_and_level(line_str)
                entries.append(
                    {
                        "stream": "stdout",
                        "timestamp": ts,
                        "message": msg,
                        "level": lvl,
                    }
                )
        return entries

    offset = 0
    while offset + 8 <= total_len:
        stream_id = data[offset]
        if stream_id not in (1, 2) or data[offset + 1 : offset + 4] != b"\x00\x00\x00":
            # Broken framing: decode remainder as raw
            chunk = data[offset:]
            offset = total_len
            text = chunk.decode("utf-8", errors="replace")
            for line in text.splitlines():
                line_str = line.strip("\r")
                if line_str:
                    ts, msg, lvl = extract_timestamp_and_level(line_str)
                    entries.append(
                        {
                            "stream": "stdout",
                            "timestamp": ts,
                            "message": msg,
                            "level": lvl,
                        }
                    )
            break

        stream_name = "stdout" if stream_id == 1 else "stderr"
        size = struct.unpack(">I", data[offset + 4 : offset + 8])[0]
        offset += 8

        if offset + size > total_len:
            chunk = data[offset:]
            offset = total_len
        else:
            chunk = data[offset : offset + size]
            offset += size

        text = chunk.decode("utf-8", errors="replace")
        for line in text.splitlines():
            line_str = line.strip("\r")
            if line_str:
                ts, msg, lvl = extract_timestamp_and_level(line_str)
                entries.append(
                    {
                        "stream": stream_name,
                        "timestamp": ts,
                        "message": msg,
                        "level": lvl,
                    }
                )

    return entries

