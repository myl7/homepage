.PHONY: format format_check

format:
	prettier --write .
	taplo fmt
	uv run ruff format .
format_check:
	prettier --check .
	taplo fmt --check
	uv run ruff format --check .
