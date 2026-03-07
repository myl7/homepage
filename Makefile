.PHONY: format format_check

format:
	prettier --write .
	taplo fmt
format_check:
	prettier --check .
	taplo fmt --check
