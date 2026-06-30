# AIOS — Business Engine

## Business Engine Purpose

The Business Engine transforms AIOS from a developer tool into a revenue-generating platform.
It manages the marketplace, billing, licensing, and organization hierarchy needed to
monetize AI workflows at scale.

## Marketplace Concept

- **Agent Marketplace:** users publish and sell agent packs (.apagent ZIP format)
- **Factory Marketplace:** pre-built factory templates for specific industries
  (e.g. e-commerce copywriting, legal document analysis, video production)
- **Workflow Store:** individual workflow templates purchasable à la carte
- **Rating & Review system** for quality signal
- Revenue split: 70% creator / 30% platform

## Billing Concept

- **Usage-based:** charge per workflow run (based on AI tokens consumed + cost_usd tracked)
- **Subscription tiers:**
  - Free: 100 workflow runs/month, community agents only
  - Pro: unlimited runs, all agents, priority AI routing
  - Enterprise: custom models, dedicated infra, SLA, team seats
- **Token wallet:** users pre-purchase token credits, deducted per run
- `cost_usd` already tracked per WorkflowRun — billing foundation is live

## License Concept

- **Open Core:** core AIOS engine is open source (MIT)
- **Commercial add-ons:** marketplace, advanced analytics, enterprise SSO → paid
- **Agent licenses:** creators choose: free, paid one-time, subscription

## Organization Concept

- **Multi-tenant:** each Organization has isolated agents, factories, workflows
- **Team seats:** Organization owner invites members with role-based permissions
  (owner / admin / developer / viewer)
- **Namespace isolation:** each org gets `/org/{slug}/api/` prefix
- **DB model:** Organization, OrgMember, OrgInvite (planned, not yet implemented)

## Revenue Dashboard Concept

- Real-time revenue metrics: MRR, ARR, churn, LTV
- Per-factory revenue attribution
- Top-earning agents and creators
- AI cost vs revenue margin per workflow
- Alert when margin < threshold
- `GET /api/business/revenue` → live dashboard data (planned)

## Future Monetization Model

1. **Phase 1 (current):** self-hosted, no billing — focus on product-market fit
2. **Phase 2:** SaaS launch with Pro tier, Stripe integration
3. **Phase 3:** Marketplace launch with creator revenue share
4. **Phase 4:** Enterprise tier with custom contracts
5. **Phase 5:** API-as-a-service — third parties embed AIOS workflows via REST

## Key Metrics to Track (Pre-Launch)

- Workflow runs per day (already tracked)
- Success rate per factory
- Average cost_usd per run
- Agent utilization rate
- User retention (DAU/MAU)
