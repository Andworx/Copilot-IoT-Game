"""Exact RJ-45 socket-pair recipes: no missing, unknown, duplicate, or extra links."""


def cables_match(required, actual):
    if not isinstance(actual, list) or len(actual) != len(required):
        return False
    seen = set()
    for cable in actual:
        if not isinstance(cable, dict) or type(cable.get("cable")) is not int:
            return False
        sockets = cable.get("sockets")
        if not isinstance(sockets, list) or len(sockets) != 2 or not all(isinstance(s, str) for s in sockets):
            return False
        if len(set(sockets)) != 2 or seen.intersection(sockets):
            return False
        seen.update(sockets)
        if not any(set(want["sockets"]) == set(sockets) for want in required):
            return False
    return True
