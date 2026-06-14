# Risks and Fixes

| Risk | Control |
| --- | --- |
| Public content posted without review | Every social draft creates a pending approval; no executor is enabled. |
| Token leakage in mobile or widget code | Provider and Laravel tokens remain server-side only. |
| Duplicate daily drafts | Daily state file prevents a second normal run for the same UTC date. |
| Email timeout log spam | Retry limit, backoff window, and log cooldown are configurable. |
| Sensitive support response handled as routine | Intent classifier escalates deposits, blocked cards, refunds, fraud claims, and similar high-risk messages. |
| Duplicate rewards or predictions | Database unique constraints and server-side checks protect user/match and reward source pairs. |
| Premature campaign messaging | World Cup push setting defaults to disabled on beta. |
| Unsupported social API access | X/Meta account tokens are optional, encrypted at rest, and no live connector is activated without credentials. |

## Remaining risks

- Social platform review and permissions are still required before any live X, Facebook, or Instagram action.
- JSON conversation storage is suitable for the current workload but should move to a database before large-scale automation.
- Daily opportunity quality depends on adding trusted business metrics to the report inputs.
