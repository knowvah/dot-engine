# Batch 3: public boundaries (breaking)

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T8 | Entry-point argument checks, shared guard, `InternalError` + cause wrap, exports, TSDoc `@throws` | typescript-pro (sonnet) | `src/index.ts`, `src/render/public.ts`, `src/render/xdot-public.ts`, `src/error-contract.test.ts` | T1–T7 | [x] |

| T8b | GvcContext constructor/register + renderWithContext argument checks | executor | `src/gvc/context.ts`, `src/gvc/device.ts`, `src/gvc/context-args.test.ts` | T8 | [x] |

Spec: [T8-public-boundaries.md](T8-public-boundaries.md). Run the corpus gate
([../corpus-gate.md](../corpus-gate.md)) after this batch.
