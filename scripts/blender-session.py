"""Run a Python source file through the active Blender extension on localhost."""
import json
import socket
import sys
from pathlib import Path

code = Path(sys.argv[1]).read_text()
with socket.create_connection(("127.0.0.1", 9876), timeout=10) as conn:
    conn.settimeout(300)
    conn.sendall(json.dumps({"type": "execute", "code": code, "strict_json": True}).encode() + b"\0")
    chunks = bytearray()
    while b"\0" not in chunks:
        chunk = conn.recv(262144)
        if not chunk:
            break
        chunks.extend(chunk)
    response = json.loads(chunks.split(b"\0", 1)[0])
    print(json.dumps(response, indent=2))
    if response.get("status") != "ok":
        sys.exit(1)
