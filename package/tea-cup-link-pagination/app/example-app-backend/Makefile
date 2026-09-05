.DEFAULT_GOAL := build

.PHONY: build run test lint format

# Build backend target
build:
	stack --stack-yaml ../stack.yaml build --fast

# Run backend API executable
run:
	stack --stack-yaml ../stack.yaml exec example-app-backend-exe

# Run backend tests
test:
	stack --stack-yaml ../stack.yaml test --fast

# Lint Haskell code
lint:
	hlint src app test

# Format Haskell code
format:
	find src app test -name '*.hs' | xargs fourmolu --mode inplace
