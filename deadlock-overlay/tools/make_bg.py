"""Generate assets/bg.svg: a faint constellation pattern (original artwork)."""
import math
import random
from pathlib import Path

random.seed(7)
W, H = 1800, 1100
nodes = [(random.uniform(0, W), random.uniform(0, H)) for _ in range(95)]

lines = set()
for i, (x, y) in enumerate(nodes):
    near = sorted(range(len(nodes)), key=lambda j: math.hypot(nodes[j][0] - x, nodes[j][1] - y))[1:3]
    for j in near:
        if math.hypot(nodes[j][0] - x, nodes[j][1] - y) < 260:
            lines.add(tuple(sorted((i, j))))

out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">']
for i, j in sorted(lines):
    (x1, y1), (x2, y2) = nodes[i], nodes[j]
    out.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="#fff" stroke-opacity="{random.uniform(0.09, 0.2):.2f}" stroke-width="1"/>')
for x, y in nodes:
    r = random.choice([1.2, 1.6, 2.2, 3.0])
    out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="#fff" fill-opacity="{random.uniform(0.2, 0.55):.2f}"/>')
out.append("</svg>")
Path(__file__).resolve().parent.parent.joinpath("assets", "bg.svg").write_text("\n".join(out), encoding="utf-8")
print(len(nodes), "nodes,", len(lines), "lines")
