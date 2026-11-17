# Data flow: one guarded division (16.1.1 semantics)

```plantuml
@startuml
start
:r = n / d\n(fdivfOverflow: Math.fround on n, d and r);
if (Number.isFinite(r)?) then (yes)
  :return r;
  :caller uses the quotient;
else (no: ±inf or NaN)
  :return null (C: true, *res untouched);
  :caller falls back:\nscale = w | h, bend returns,\nalpha = 1, beta = 1;
endif
stop
@enduml
```

The old guards tested only `d == 0`. They differ from 16.1.1 when `d` is
non-zero and the quotient is still non-finite: a subnormal divisor, an
infinite or NaN operand, or a float32 overflow.
