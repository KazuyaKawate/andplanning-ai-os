# AIOS — Project Overview

## What is AIOS?

AIOS (And Planning AI OS) is a self-evolving AI operating system built on FastAPI + Next.js.
It gives users a web-based "OS" interface to run AI workflows, manage agents, debug code,
collaborate with virtual AI developers, and autonomously improve itself.

## Core Concept

Traditional software requires humans to write every line. AIOS inverts this:
AI agents plan, code, review, and apply changes — with human approval as the final gate.
The OS learns from every run, accumulates lessons, and generates its own roadmap.

## Product Vision

- Phase 1 target: replace the majority of solo-dev iteration loops with AI-assisted cycles
- Phase 2 target: team-grade collaboration where virtual agents specialise by role
- Phase 3 target: marketplace of agent packs, plugin factories, and revenue-generating workflows
- Long-term: autonomous business engine — an AI company that manages itself

## Target Users

- Indie developers and solopreneurs who want 10× output without hiring
- Small product teams that want AI in every dev/ops loop
- Enterprises evaluating self-improving AI infrastructure

## Current Stage (2026-06-30)

- **Backend:** 25 DB models, 18 routers, 92 endpoints — production-ready at 95%
- **Frontend:** 16 OS pages (Next.js 16 App Router, TypeScript)
- **AI:** Claude (primary) → OpenAI → Gemini → Ollama fallback chain
- **Auth:** JWT, bcrypt, 7-day tokens, admin roles
- **Self-Evolution:** live — scans codebase, generates suggestions, tracks lessons
- **Status:** pre-investor demo, not yet deployed to public production
