extends SceneTree
## Temporary headless smoke test: simulates catches, the YUMMY bonus,
## hits, and game over with deterministic item drops (natural spawns off).

var frames := 0
var main: Node2D
var drops_done := 0
var bombs_done := 0
var phase := "boot"
var yummy_seen := false

const FallingItem := preload("res://games/kucing_es_krim/scripts/falling_item.gd")


func _initialize() -> void:
	main = load("res://games/kucing_es_krim/main.tscn").instantiate()
	root.add_child(main)
	physics_frame.connect(_tick)


func _drop(type: int) -> void:
	var it := FallingItem.new()
	it.type = type
	it.color_index = 2
	it.position = Vector2(main.cat.position.x + 34.0, main.CATCH_Y - 27.0)
	main.items_node.add_child(it)


func _fail(msg: String) -> void:
	printerr("SMOKE FAIL: " + msg)
	quit(1)


func _tick() -> void:
	frames += 1
	if frames == 5:
		main._start_game()
		phase = "scoops"
		return
	if phase == "boot":
		return

	main.spawn_timer = 1000.0  # suppress random spawns for determinism

	if main.cat.stack.size() == 0 and main.score == 130 and not yummy_seen:
		yummy_seen = true  # 8 scoops * 10 + 50 bonus, stack cleared

	if phase == "scoops" and frames % 10 == 0:
		if drops_done < 8:
			_drop(FallingItem.Type.SCOOP)
			drops_done += 1
		elif main.items_node.get_child_count() == 0:
			if not yummy_seen:
				_fail("expected score 130 + cleared stack after 8 scoops, got score=%d stack=%d" % [main.score, main.cat.stack.size()])
				return
			phase = "bombs"

	if phase == "bombs" and frames % 20 == 0:
		if bombs_done < 3:
			_drop(FallingItem.Type.BOMB)
			bombs_done += 1
		elif main.items_node.get_child_count() == 0:
			if main.lives != 0:
				_fail("expected 0 lives after 3 bombs, got %d" % main.lives)
				return
			if main.state != main.State.OVER:
				_fail("expected state OVER, got %d" % main.state)
				return
			var cf := ConfigFile.new()
			if cf.load("user://save.cfg") != OK or cf.get_value("game", "best", -1) != main.score:
				_fail("best score not persisted")
				return
			print("SMOKE PASS: score=%d best=%d yummy_bonus=OK game_over=OK save=OK" % [main.score, main.best])
			quit(0)
			return

	if frames > 1200:
		_fail("timeout in phase " + phase)
