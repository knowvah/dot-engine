## Observation: native xdot prints memory after an HTML border's dash style
- **Context**: Item 38 (HTML `STYLE="rounded,dashed"`), comparing `-Txdot`.
- **Finding**: For an HTML table/cell border that is dashed or dotted, native
  16.1.0 xdot writes `S 14979 -dashed(dotted,table size too small for
  content,...)` and similar: unrelated string literals as style arguments.
  `doBorder` (`lib/common/htmltable.c:261`) passes the bare literal
  `"dashed"`/`"dotted"` to `gvrender_set_style`; `xdot_style`
  (`plugin/core/gvrender_core_dot.c:183`) assumes `parse_style`'s
  `name\0arg\0...\0\0` layout and reads past the literal's NUL until a
  double NUL. The bytes depend on the binary's rodata layout.
- **Impact**: xdot (and `-Tdot` `_draw_`/`_ldraw_`) for dashed/dotted HTML
  borders cannot be an oracle; the port writes `S 6 -dashed`. Compare SVG,
  or the xdot of nodes without such borders. Not something to port.
- **Confidence**: High (C read; the garbage matches adjacent htmltable.c
  string literals).
