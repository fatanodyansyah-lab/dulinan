extends Node2D
## Hurt flash + the start / game-over card with pulsing CTA.

const W := 480.0
const H := 854.0

var _t := 0

@onready var main: Node2D = get_node("../..")


func _physics_process(_delta: float) -> void:
	_t += 1
	queue_redraw()


func _draw() -> void:
	if main.hurt_flash > 0:
		draw_rect(Rect2(0, 0, W, H), Color(0.878, 0.322, 0.42, main.hurt_flash / 12.0 * 0.25))

	if main.state == main.State.START:
		_draw_card("Kucing Es Krim",
				["Geser kucing untuk menangkap", "es krim yang jatuh.", "Hindari bom & ikan busuk!"],
				"KETUK UNTUK MAIN")
	elif main.state == main.State.OVER:
		_draw_card("Game Over!",
				["Skor kamu: %d" % main.score, "Terbaik: %d" % main.best],
				"MAIN LAGI")


func _draw_card(title: String, lines: Array, cta: String) -> void:
	draw_rect(Rect2(0, 0, W, H), Color(0.227, 0.125, 0.102, 0.55))

	var card := Rect2(W / 2 - 170, H / 2 - 160, 340, 300)
	KDraw.rounded_rect(self, card, 26, KDraw.CARD_BG)
	KDraw.rounded_rect_outline(self, card, 26, 4, KDraw.ACCENT)

	# Shrink the title if it would collide with the decorative scoops.
	var tf := KDraw.bold_font()
	var tsize := 36
	var title_w := tf.get_string_size(title, HORIZONTAL_ALIGNMENT_LEFT, -1, tsize).x
	if title_w > 250.0:
		tsize = int(36.0 * 250.0 / title_w)
	KDraw.text_c(self, tf, Vector2(W / 2, H / 2 - 104), title, tsize, KDraw.ACCENT)
	for i in lines.size():
		KDraw.text_c(self, KDraw.font(), Vector2(W / 2, H / 2 - 52 + i * 30), lines[i], 20, KDraw.TEXT_BROWN)

	# Pulsing "▶ CTA" (triangle drawn as a polygon so no emoji font is needed).
	var pulse := 1.0 + sin(_t * 0.1) * 0.04
	draw_set_transform(Vector2(W / 2, H / 2 + 104), 0.0, Vector2(pulse, pulse))
	var f := KDraw.bold_font()
	var tw := f.get_string_size(cta, HORIZONTAL_ALIGNMENT_LEFT, -1, 24).x
	var tri_x := -(tw + 22.0) / 2.0
	draw_colored_polygon(PackedVector2Array([
		Vector2(tri_x, -9), Vector2(tri_x + 14, 0), Vector2(tri_x, 9),
	]), KDraw.ACCENT)
	draw_string(f, Vector2(tri_x + 22, 24 * 0.36), cta, HORIZONTAL_ALIGNMENT_LEFT, -1, 24, KDraw.ACCENT)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	# Decorative scoops on the card corners.
	KDraw.scoop(self, Vector2(W / 2 - 145, H / 2 - 105), 0, 14.0)
	KDraw.scoop(self, Vector2(W / 2 + 145, H / 2 - 105), 1, 14.0)
