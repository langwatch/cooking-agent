.PHONY: install chat test api web dev

install:
	pip install -e ".[dev]"

chat:
	python -m agent chat "$(Q)"

test:
	pytest -v tests/ -m agent_test

api:
	uvicorn api.main:app --reload --port 8000

web:
	cd web && npm run dev

dev:
	@echo "Run 'make api' and 'make web' in separate terminals."
