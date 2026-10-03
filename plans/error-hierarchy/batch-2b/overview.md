# Batch 2b: C-port sites B, `/api`, host hooks

Depends only on T1; write-sets are disjoint from batch 2a. May run concurrently with 2a.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T5 | C-port throw sites, group B (14) | typescript-pro (sonnet) | `src/label/{index,node,rectangle}.ts`, `src/layout/dot/pack-components.ts`, `src/layout/fdp/{ports,xlayout}.ts`, `src/layout/sfdp/init.ts`, `src/layout/twopi/circle.ts`, `src/common/poly-shapes.ts`, `src/util/xml.ts`, `src/gvc/job.ts`, `src/errors.cport-b.test.ts` | T1 | [x] |
| T6 | `/api` argument checks, `ERR_INVALID_STATE`, builder → `InternalError` | typescript-pro (sonnet) | `src/api/{geometry,edge-ops,builder}.ts`, `src/api/errors.test.ts` | T1 | [x] |
| T7 | Host-hook argument checks | typescript-pro (sonnet) | `src/gvc/usershape.ts`, `src/gvc/image-resolver.ts`, `src/common/textmeasure-factory.ts`, `src/gvc/hooks-errors.test.ts` | T1 | [x] |

Specs: [T5](T5-cport-sites-b.md) · [T6](T6-api-errors.md) · [T7](T7-host-hooks.md)

The executor appends T5's returned rows to `../reclassification.md`.
