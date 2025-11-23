.PHONY: all frontend backend build clean run dev install help

all: build

help:
	@echo "Available targets:"
	@echo "  make install  - Install frontend dependencies"
	@echo "  make frontend - Build frontend (React + Vite)"
	@echo "  make backend  - Build backend (Go server)"
	@echo "  make build    - Build both frontend and backend"
	@echo "  make run      - Run the server"
	@echo "  make dev      - Run frontend in dev mode"
	@echo "  make clean    - Clean build artifacts"

install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

frontend:
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Frontend built successfully!"

backend:
	@echo "Building backend..."
	go mod download
	go build -o nlbw-ui .
	@echo "Backend built successfully!"

build: frontend backend
	@echo "Build complete! Run with: ./nlbw-ui"

run:
	./nlbw-ui

dev:
	@echo "Starting frontend dev server..."
	@echo "Make sure backend is running on port 8080"
	cd frontend && npm run dev

clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/dist/*
	rm -f nlbw-ui
	@echo "Clean complete!"
