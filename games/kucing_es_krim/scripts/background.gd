extends Node2D
## Static backdrop: gradient sky, paw-print pattern, floor band, catch line.
## Drawn once; nothing here animates.

const W := 480.0
const H := 854.0
const CATCH_Y := 629.0


func _draw() -> void:
	# Vertical gradient #f9e2d4 -> #f3cdb9.
	draw_polygon(
		PackedVector2Array([Vector2(0, 0), Vector2(W, 0), Vector2(W, H), Vector2(0, H)]),
		PackedColorArray([Color("f9e2d4"), Color("f9e2d4"), Color("f3cdb9"), Color("f3cdb9")])
	)

	# Faint paw prints, staggered grid.
	var paw := Color("c77b5e", 0.07)
	for row in 9:
		for col in 5:
			var px := col * 110.0 + (55.0 if row % 2 == 1 else 10.0) + 30.0
			var py := row * 100.0 + 40.0
			KDraw.ellipse(self, Vector2(px, py + 8), 11, 9, paw)
			for k in [-1, 0, 1]:
				draw_circle(Vector2(px + k * 9, py - 6 + abs(k) * 2), 4.5, paw)

	# Floor band + soft shadow.
	draw_rect(Rect2(0, H - 140, W, 140), Color("e5b39a"))
	KDraw.ellipse(self, Vector2(W / 2, H - 70), 190, 36, Color(0, 0, 0, 0.06))

	# Dashed catch line (3 on / 9 off).
	var lc := Color(0.69, 0.282, 0.247, 0.3)
	var x := 0.0
	while x < W:
		draw_line(Vector2(x, CATCH_Y), Vector2(minf(x + 3.0, W), CATCH_Y), lc, 3.0)
		x += 12.0
