# Batch 2: reduce the port's heap (conditional)

Runs when T2's `outcome` is `port-artifact` or `mixed`, and also for `c-faithful` when T2
lists a removable constant-overhead candidate (the maintainer's C-faithful outcome asks for
that too). When T2 lists no candidate, journal "T3: N/A, no candidate" and go to batch 3.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T3a..T3c | One representation change per commit, at most three | executor | bounded, see T3 | T2 | [x] (T3a, T3b) |

Sequential: each change is measured against the head that includes the previous one.

**Interface T3 → T4/T5:** in the journal, head's port peak RSS and peak live heap on c800
and c1600, and `R = port peak RSS / native peak RSS` on c1600 (native from T1).
