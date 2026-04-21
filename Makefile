.PHONY: install chat test

install:
	pip install -e ".[dev]"

chat:
	python -m agent chat "$(Q)"

test:
	pytest -v tests/ -m agent_test
