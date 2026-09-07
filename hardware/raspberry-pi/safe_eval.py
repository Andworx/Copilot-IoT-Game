"""Safe boolean-expression evaluator for logic_maps/<slug>.json.

Each device's `win` and per-lamp `when` fields are small boolean expressions
over switch/lamp keys, e.g. "power and fan and not mode" — a direct
transcription of the `checkWin`/`computeLamps` lambdas in
power pages/restore-and-spin/src/data/deviceProfiles.ts. Rather than eval()
arbitrary strings from a JSON file, this walks a parsed AST and only permits
boolean logic (and/or/not), bare names, and True/False/true/false literals.
"""
import ast

_ALLOWED_NODES = (
    ast.Expression,
    ast.BoolOp,
    ast.And,
    ast.Or,
    ast.UnaryOp,
    ast.Not,
    ast.Name,
    ast.Load,
    ast.Constant,
)


def evaluate(expr: str, variables: dict) -> bool:
    tree = ast.parse(expr, mode="eval")

    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED_NODES):
            raise ValueError(f"Disallowed element {type(node).__name__!r} in expression: {expr!r}")

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.BoolOp):
            values = [_eval(v) for v in node.values]
            return all(values) if isinstance(node.op, ast.And) else any(values)
        if isinstance(node, ast.UnaryOp):
            return not _eval(node.operand)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, bool):
                return node.value
            raise ValueError(f"Disallowed constant {node.value!r} in expression: {expr!r}")
        if isinstance(node, ast.Name):
            if node.id in ("true", "True"):
                return True
            if node.id in ("false", "False"):
                return False
            if node.id not in variables:
                raise ValueError(f"Unknown key {node.id!r} in expression: {expr!r}")
            return bool(variables[node.id])
        raise ValueError(f"Disallowed element {type(node).__name__!r} in expression: {expr!r}")

    return bool(_eval(tree))
