import struct
from app.docker.demux import demux_docker_stream, extract_timestamp_and_level


def test_extract_timestamp_and_level():
    line = "2026-11-21T10:00:00.123456789Z [ERROR] Failed to connect to database"
    ts, msg, lvl = extract_timestamp_and_level(line)
    assert ts == "2026-11-21T10:00:00.123456789Z"
    assert msg == "[ERROR] Failed to connect to database"
    assert lvl == "ERROR"

    line_no_ts = "INFO: Server listening on port 8000"
    ts2, msg2, lvl2 = extract_timestamp_and_level(line_no_ts)
    assert ts2 is None
    assert msg2 == line_no_ts
    assert lvl2 == "INFO"

    line_warn = "2026-11-21T10:05:00Z Warning: high memory usage"
    ts3, msg3, lvl3 = extract_timestamp_and_level(line_warn)
    assert ts3 == "2026-11-21T10:05:00Z"
    assert lvl3 == "WARN"


def test_demux_tty_stream():
    raw_tty = b"2026-11-21T10:00:00Z line one\r\n2026-11-21T10:00:01Z [WARN] line two\n"
    entries = demux_docker_stream(raw_tty, is_tty=True)
    assert len(entries) == 2
    assert entries[0]["stream"] == "stdout"
    assert entries[0]["message"] == "line one"
    assert entries[1]["stream"] == "stdout"
    assert entries[1]["message"] == "[WARN] line two"
    assert entries[1]["level"] == "WARN"


def test_demux_multiplexed_stream():
    # Construct 2 frames: 1 stdout, 1 stderr
    msg1 = b"2026-11-21T10:00:00Z App booting\n"
    header1 = struct.pack(">BxxxI", 1, len(msg1))

    msg2 = b"2026-11-21T10:00:01Z [ERROR] Missing configuration\n"
    header2 = struct.pack(">BxxxI", 2, len(msg2))

    data = header1 + msg1 + header2 + msg2
    entries = demux_docker_stream(data, is_tty=False)

    assert len(entries) == 2
    assert entries[0]["stream"] == "stdout"
    assert entries[0]["message"] == "App booting"
    assert entries[1]["stream"] == "stderr"
    assert entries[1]["message"] == "[ERROR] Missing configuration"
    assert entries[1]["level"] == "ERROR"


def test_demux_fallback_on_corrupt_data():
    raw_garbage = b"regular unmultiplexed plain log message line\nsecond line\n"
    entries = demux_docker_stream(raw_garbage, is_tty=False)
    assert len(entries) >= 1
    assert "regular unmultiplexed" in entries[0]["message"]
