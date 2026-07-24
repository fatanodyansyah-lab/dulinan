extends Node2D
## HUD: score card, best score, hearts, mute toggle, and (in play) the
## on-screen left/right buttons. All hit zones are handled in main.gd.

const W := 480.0
const H := 854.0

@onready var main: Node2D = get_node("../..")


func _draw() -> void:
	# Score card.
	KDraw.rounded_rect(self, Rect2(W / 2 - 70, 16, 140, 46), 14, Color(1, 1, 1, 0.75))
	KDraw.text_c(self, KDraw.bold_font(), Vector2(W / 2, 40), str(main.score), 28, KDraw.ACCENT)
	KDraw.text_c(self, KDraw.bold_font(), Vector2(W / 2, 76), "TERBAIK %d" % main.best, 13, Color(0.69, 0.282, 0.247, 0.7))

	# Lives.
	for i in 3:
		KDraw.heart(self, Vector2(34 + i * 30, 40), 1.6, i < main.lives)

	# Mute button.
	KDraw.rounded_rect(self, Rect2(W - 58, 20, 40, 40), 12, Color(1, 1, 1, 0.75))
	_draw_speaker(Vector2(W - 38, 40), main.muted)

	if main.state == main.State.PLAY:
		_draw_buttons()


func _draw_speaker(c: Vector2, is_muted: bool) -> void:
	draw_colored_polygon(PackedVector2Array([
		c + Vector2(-10, -3), c + Vector2(-5, -3), c + Vector2(0, -9),
		c + Vector2(0, 9), c + Vector2(-5, 3), c + Vector2(-10, 3),
	]), KDraw.ACCENT)
	if is_muted:
		draw_line(c + Vector2(3, -3), c + Vector2(10, 4), KDraw.ACCENT, 2.5, true)
		draw_line(c + Vector2(10, -3), c + Vector2(3, 4), KDraw.ACCENT, 2.5, true)
	else:
		draw_arc(c + Vector2(1, 0), 5.5, -0.9, 0.9, 12, KDraw.ACCENT, 2.0, true)
		draw_arc(c + Vector2(1, 0), 9.0, -0.9, 0.9, 12, KDraw.ACCENT, 2.0, true)


func _draw_buttons() -> void:
	var by := H - 92.0
	for side in [[46.0, -1.0], [W - 46.0, 1.0]]:
		var bx: float = side[0]
		var dir: float = side[1]
		KDraw.rounded_rect(self, Rect2(bx - 38, by - 38, 76, 76), 18, Color(0.69, 0.282, 0.247, 0.25))
		KDraw.rounded_rect(self, Rect2(bx - 34, by - 42, 68, 68), 16, KDraw.CARD_BG)
		KDraw.rounded_rect_outline(self, Rect2(bx - 34, by - 42, 68, 68), 16, 3, KDraw.ACCENT)
		var g := Vector2(bx, by - 8)
		draw_colored_polygon(PackedVector2Array([
			g + Vector2(dir * 12, 0), g + Vector2(-dir * 8, -13), g + Vector2(-dir * 8, 13),
		]), KDraw.ACCENT)
