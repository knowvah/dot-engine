# Batch 4: diagnosis items (items 7 and 9)

Run in sequence: both tasks may write the engines registry and the divergence docs.
Each has an investigation budget of about 2 hours, then fix or park (AD-3). Agent:
debugger (opus). Diagnosis mode applies: instrument before hypothesizing, and the C is
the spec.

| ID | Description | Agent | Writes | Depends on | Done |
|---|---|---|---|---|---|
| [T12](T12-circo-fma-1855.md) | circo FMA patch; diagnose 1855 | debugger (opus) | circo position files + test; circo walk; registry/docs if accepted | batch 3 | [x] |
| [T13](T13-xlabel-flips.md) | label-placement flips, fdp 2471 / sfdp 2371 | debugger (opus) | `xlabels-place.ts`, `src/label/*`; attribution; registry/docs | T12 | [x] |

A parked task still gets a commit if its write-up adds a file, such as a test that pins
the current behaviour. Otherwise its outcome is a journal row plus a README line.
