<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4a — dot ordering/ranking core (ns, flat, mincross family)

Total uncovered branches in scope (files <90% br, >=8 uncovered): 505

Priority order (uncovered br, pct, file):

-   52   76.78  src/layout/dot/ns.ts
-   50   64.53  src/layout/dot/flat.ts
-   44   66.91  src/layout/dot/mincross.ts
-   38   76.68  src/layout/dot/conc.ts
-   34   74.62  src/layout/dot/mincross-build.ts
-   34   79.26  src/layout/dot/mincross-cross.ts
-   34   69.09  src/layout/dot/position-aux.ts
-   33   81.96  src/layout/dot/mincross-order.ts
-   30   85.43  src/layout/dot/classify.ts
-   28   67.44  src/layout/dot/cluster-path.ts
-   26   79.68  src/layout/dot/mincross-flat.ts
-   23   82.17  src/layout/dot/cluster.ts
-   23      75  src/layout/dot/position-ycoords.ts
-   21      65  src/layout/dot/init.ts
-   20   65.51  src/layout/dot/pack-components.ts
-   15   82.95  src/layout/dot/fastgr.ts

## Uncovered appendix

### src/layout/dot/ns.ts — 52/224 branch paths uncovered

Uncovered statement lines: 20-21, 114, 174, 274, 285, 356-357, 363-366, 404, 409, 427, 473, 475-476, 493-494, 496

- L17: binary-expr [1]/2
- L18: binary-expr [1]/2
- L20: binary-expr [0,1]/2
- L21: binary-expr [0,1]/2
- L23: binary-expr [1]/2
- L23: binary-expr [1]/2
- L25: binary-expr [1]/2
- L27: binary-expr [1]/2
- L49: binary-expr [1]/2
- L59: binary-expr [1]/2
- L114: if [0]/2
- L128: binary-expr [1]/2
- L133: binary-expr [1]/2
- L133: binary-expr [1]/2
- L133: binary-expr [1]/2
- L174: if [0]/2
- L185: binary-expr [1]/2
- L190: binary-expr [1]/2
- L190: binary-expr [1]/2
- L190: binary-expr [1]/2
- L257: binary-expr [1]/2
- L274: if [0]/2
- L285: if [0]/2
- L356: if [0]/2
- L357: if [0]/2
- L362: if [1]/2
- L364: if [0,1]/2
- L365: if [0,1]/2
- L365: binary-expr [0,1]/2
- L366: if [0,1]/2
- L366: binary-expr [0,1]/2
- L371: cond-expr [0]/2
- L383: if [1]/2
- L404: if [0]/2
- L409: if [0]/2
- L409: cond-expr [0,1]/2
- L427: if [0]/2
- L440: binary-expr [1]/2
- L473: if [0]/2
- L475: if [0]/2
- L476: if [0]/2
- L493: if [0]/2
- L494: if [0]/2
- L496: if [0]/2

### src/layout/dot/flat.ts — 50/141 branch paths uncovered

Uncovered statement lines: 41, 91-97, 99-100, 115, 119, 126, 137, 153, 185, 223, 407, 427, 434, 474-475

- L40: if [1]/2
- L51: if [1]/2
- L92: if [0,1]/2
- L92: binary-expr [0,1]/2
- L95: if [0,1]/2
- L96: if [0,1]/2
- L97: if [0,1]/2
- L97: binary-expr [0,1]/2
- L99: if [0,1]/2
- L99: binary-expr [0,1,2]/3
- L100: if [0,1]/2
- L100: binary-expr [0,1,2]/3
- L109: binary-expr [1]/2
- L114: if [1]/2
- L115: if [0,1]/2
- L118: if [1]/2
- L119: if [0]/2
- L119: binary-expr [1]/2
- L125: binary-expr [1]/2
- L126: if [0]/2
- L126: binary-expr [1]/2
- L137: if [0]/2
- L152: if [1]/2
- L163: binary-expr [1]/2
- L185: if [0]/2
- L223: if [0]/2
- L273: if [1]/2
- L284: if [1]/2
- L315: binary-expr [1]/2
- L341: binary-expr [1]/2
- L407: if [0]/2
- L427: if [0]/2
- L434: if [0]/2
- L435: cond-expr [0]/2
- L470: if [1]/2
- L471: binary-expr [1]/2
- L490: if [1]/2

### src/layout/dot/mincross.ts — 44/133 branch paths uncovered

Uncovered statement lines: 53-55, 60-61, 91, 132, 134, 136, 172, 176, 212, 243, 273, 278, 284, 327, 329, 332, 335, 346, 360, 372

- L53: if [0,1]/2
- L54: if [0,1]/2
- L54: cond-expr [0,1]/2
- L61: cond-expr [0,1]/2
- L75: if [1]/2
- L91: if [0]/2
- L92: cond-expr [1]/2
- L93: cond-expr [1]/2
- L122: cond-expr [1]/2
- L123: cond-expr [1]/2
- L132: if [0]/2
- L134: if [0]/2
- L136: if [0]/2
- L140: cond-expr [1]/2
- L142: cond-expr [1]/2
- L143: cond-expr [1]/2
- L165: cond-expr [1]/2
- L166: cond-expr [1]/2
- L172: if [0]/2
- L176: if [0]/2
- L177: cond-expr [1]/2
- L178: cond-expr [1]/2
- L181: cond-expr [1]/2
- L212: if [0]/2
- L213: cond-expr [1]/2
- L214: cond-expr [1]/2
- L243: if [0]/2
- L244: cond-expr [1]/2
- L245: cond-expr [1]/2
- L273: if [0]/2
- L278: if [0]/2
- L284: if [0]/2
- L327: if [0]/2
- L329: if [0]/2
- L332: if [0]/2
- L335: if [0]/2
- L346: if [0]/2
- L360: if [0]/2
- L372: if [0]/2
- L377: cond-expr [0]/2

### src/layout/dot/conc.ts — 38/163 branch paths uncovered

Uncovered statement lines: 36-40, 81, 83, 123, 216, 253, 271, 275, 295, 353

- L35: if [1]/2
- L36: if [0,1]/2
- L37: if [0,1]/2
- L38: if [0,1]/2
- L39: if [0,1]/2
- L81: if [0]/2
- L83: if [0]/2
- L85: binary-expr [1]/2
- L85: binary-expr [1]/2
- L86: binary-expr [1]/2
- L86: binary-expr [1]/2
- L122: binary-expr [1]/2
- L123: if [0]/2
- L130: binary-expr [1]/2
- L147: binary-expr [1]/2
- L155: binary-expr [1]/2
- L185: binary-expr [1]/2
- L191: binary-expr [1]/2
- L214: binary-expr [1]/2
- L216: if [0]/2
- L218: binary-expr [1]/2
- L218: binary-expr [1]/2
- L225: binary-expr [1]/2
- L226: binary-expr [1]/2
- L252: binary-expr [1]/2
- L253: if [1]/2
- L270: if [0]/2
- L270: binary-expr [1]/2
- L273: binary-expr [0,1]/2
- L293: binary-expr [1]/2
- L295: if [0]/2
- L344: if [1]/2
- L353: if [0]/2

### src/layout/dot/mincross-build.ts — 34/134 branch paths uncovered

Uncovered statement lines: 206, 208, 219-221, 227, 241, 263, 267, 287, 295, 301, 314, 324, 342-343, 363

- L61: cond-expr [1]/2
- L65: cond-expr [1]/2
- L66: cond-expr [1]/2
- L73: cond-expr [1]/2
- L74: cond-expr [1]/2
- L133: binary-expr [1]/2
- L136: binary-expr [1]/2
- L145: binary-expr [1]/2
- L146: binary-expr [1]/2
- L183: binary-expr [1]/2
- L192: cond-expr [1]/2
- L193: cond-expr [1]/2
- L206: if [0]/2
- L208: if [0]/2
- L218: cond-expr [1]/2
- L219: if [0]/2
- L220: if [0]/2
- L221: if [0]/2
- L221: binary-expr [1]/2
- L227: if [0]/2
- L241: if [0]/2
- L263: if [0]/2
- L267: if [0]/2
- L285: if [1]/2
- L287: if [0]/2
- L295: if [0]/2
- L296: cond-expr [1]/2
- L297: cond-expr [1]/2
- L301: if [0]/2
- L314: if [0]/2
- L324: if [0]/2
- L342: if [0]/2
- L343: if [0]/2
- L363: if [0]/2

### src/layout/dot/mincross-cross.ts — 34/164 branch paths uncovered

Uncovered statement lines: 46-48, 188, 210, 232, 270, 298, 366, 368, 380, 395

- L46: if [0,1]/2
- L47: if [0,1]/2
- L84: cond-expr [1]/2
- L104: cond-expr [1]/2
- L105: cond-expr [1]/2
- L118: binary-expr [1]/2
- L186: cond-expr [1]/2
- L188: if [0]/2
- L189: cond-expr [1]/2
- L190: cond-expr [1]/2
- L210: if [0]/2
- L218: binary-expr [1]/2
- L218: binary-expr [1]/2
- L232: if [0]/2
- L246: binary-expr [1]/2
- L260: if [1]/2
- L270: if [0]/2
- L289: cond-expr [1]/2
- L290: cond-expr [1]/2
- L295: cond-expr [1]/2
- L296: cond-expr [1]/2
- L297: if [0]/2
- L329: cond-expr [1]/2
- L340: cond-expr [1]/2
- L366: if [0]/2
- L368: if [0]/2
- L370: cond-expr [1]/2
- L375: cond-expr [1]/2
- L375: binary-expr [1]/2
- L380: if [0]/2
- L386: if [1]/2
- L395: if [0]/2

### src/layout/dot/position-aux.ts — 34/110 branch paths uncovered

Uncovered statement lines: 66, 207, 213, 215, 217, 308, 351

- L54: binary-expr [1]/2
- L57: binary-expr [1]/2
- L60: binary-expr [1]/2
- L63: binary-expr [1]/2
- L66: binary-expr [0,1]/2
- L69: binary-expr [1]/2
- L72: binary-expr [1]/2
- L78: binary-expr [1]/2
- L81: binary-expr [1]/2
- L84: binary-expr [1]/2
- L96: binary-expr [1]/2
- L121: binary-expr [1]/2
- L122: binary-expr [1]/2
- L147: binary-expr [1]/2
- L169: binary-expr [1]/2
- L170: binary-expr [1]/2
- L197: if [1]/2
- L199: if [1]/2
- L207: if [0]/2
- L213: if [0]/2
- L215: if [0]/2
- L217: if [0]/2
- L266: if [1]/2
- L272: if [1]/2
- L277: binary-expr [1]/2
- L277: binary-expr [1]/2
- L308: if [0]/2
- L322: if [1]/2
- L350: binary-expr [1]/2
- L351: if [0]/2
- L353: if [1]/2
- L364: if [1]/2
- L371: if [1]/2

### src/layout/dot/mincross-order.ts — 33/183 branch paths uncovered

Uncovered statement lines: 30, 53-56, 144, 152, 158, 175, 212, 301, 303, 356, 374, 394

- L41: cond-expr [1]/2
- L42: cond-expr [1]/2
- L43: if [1]/2
- L54: cond-expr [0,1]/2
- L55: cond-expr [0,1]/2
- L56: if [0,1]/2
- L144: if [0]/2
- L152: if [0]/2
- L158: if [0]/2
- L175: if [0]/2
- L176: cond-expr [1]/2
- L177: cond-expr [1]/2
- L190: cond-expr [1]/2
- L202: cond-expr [1]/2
- L202: cond-expr [1]/2
- L212: if [0]/2
- L213: cond-expr [1]/2
- L214: cond-expr [1]/2
- L281: cond-expr [1]/2
- L282: cond-expr [1]/2
- L295: binary-expr [1]/2
- L301: if [0]/2
- L303: if [0]/2
- L324: cond-expr [1]/2
- L325: cond-expr [1]/2
- L326: cond-expr [1]/2
- L327: cond-expr [1]/2
- L355: if [0]/2
- L374: if [0]/2
- L394: if [0]/2

### src/layout/dot/classify.ts — 30/206 branch paths uncovered

Uncovered statement lines: 126, 373, 412

- L75: binary-expr [1]/2
- L91: binary-expr [1]/2
- L91: binary-expr [1]/2
- L96: binary-expr [1]/2
- L96: binary-expr [1]/2
- L100: binary-expr [1]/2
- L126: if [0]/2
- L167: binary-expr [1]/2
- L178: binary-expr [1]/2
- L179: binary-expr [1]/2
- L190: binary-expr [1]/2
- L204: binary-expr [1]/2
- L204: binary-expr [1]/2
- L207: binary-expr [1]/2
- L208: binary-expr [1]/2
- L220: binary-expr [1]/2
- L221: binary-expr [1]/2
- L222: binary-expr [1]/2
- L223: binary-expr [1]/2
- L238: binary-expr [1]/2
- L238: binary-expr [1]/2
- L242: binary-expr [1]/2
- L303: binary-expr [1]/2
- L303: binary-expr [1]/2
- L328: if [1]/2
- L335: binary-expr [1]/2
- L335: binary-expr [1]/2
- L373: if [0]/2
- L412: if [0]/2
- L461: binary-expr [1]/2

### src/layout/dot/cluster-path.ts — 28/86 branch paths uncovered

Uncovered statement lines: 74-82, 91, 135, 173, 182

- L32: binary-expr [1]/2
- L74: binary-expr [0,1]/2
- L80: binary-expr [0,1]/2
- L91: if [0]/2
- L107: binary-expr [3,4,6,7]/8
- L117: binary-expr [1]/2
- L117: binary-expr [1]/2
- L118: cond-expr [0]/2
- L118: binary-expr [1]/2
- L122: binary-expr [1]/2
- L133: binary-expr [1]/2
- L134: if [0]/2
- L140: binary-expr [1]/2
- L154: binary-expr [1]/2
- L154: binary-expr [1]/2
- L167: binary-expr [1]/2
- L167: binary-expr [1]/2
- L168: if [1]/2
- L172: if [0]/2
- L182: if [0]/2
- L183: binary-expr [1]/2
- L183: binary-expr [1]/2
- L184: binary-expr [1]/2

### src/layout/dot/mincross-flat.ts — 26/128 branch paths uncovered

Uncovered statement lines: 28, 39-40, 68, 115, 184, 206, 208

- L28: if [0]/2
- L30: if [1]/2
- L39: if [0]/2
- L39: binary-expr [1]/2
- L40: if [0]/2
- L44: cond-expr [0]/2
- L52: cond-expr [1]/2
- L53: cond-expr [1]/2
- L56: if [1]/2
- L61: cond-expr [1]/2
- L62: cond-expr [1]/2
- L68: if [0]/2
- L70: cond-expr [1]/2
- L115: if [0]/2
- L116: cond-expr [1]/2
- L117: cond-expr [1]/2
- L126: cond-expr [1]/2
- L160: cond-expr [1]/2
- L173: cond-expr [1]/2
- L184: if [0]/2
- L188: cond-expr [1]/2
- L192: if [1]/2
- L206: if [0]/2
- L208: if [0]/2
- L209: cond-expr [1]/2
- L210: cond-expr [1]/2

### src/layout/dot/cluster.ts — 23/129 branch paths uncovered

Uncovered statement lines: 210, 216, 233-234, 265, 397, 410

- L55: binary-expr [1]/2
- L55: binary-expr [1]/2
- L60: binary-expr [1]/2
- L60: binary-expr [1]/2
- L72: if [1]/2
- L157: binary-expr [1]/2
- L167: binary-expr [1]/2
- L210: if [0]/2
- L211: binary-expr [1]/2
- L216: if [0]/2
- L232: binary-expr [1]/2
- L336: binary-expr [1]/2
- L340: binary-expr [1]/2
- L342: binary-expr [1]/2
- L349: binary-expr [1]/2
- L350: binary-expr [1]/2
- L358: binary-expr [1]/2
- L358: binary-expr [1]/2
- L382: binary-expr [1]/2
- L397: if [0]/2
- L406: binary-expr [1]/2
- L407: binary-expr [1]/2
- L410: if [0]/2

### src/layout/dot/position-ycoords.ts — 23/92 branch paths uncovered

Uncovered statement lines: 137-144, 146, 151-154, 184, 186, 211-213, 219-227, 229-230, 232-233, 235-236, 251, 255

- L41: binary-expr [1]/2
- L49: binary-expr [1]/2
- L104: binary-expr [1]/2
- L105: binary-expr [1]/2
- L153: if [0,1]/2
- L177: if [1]/2
- L184: if [0]/2
- L186: if [0]/2
- L213: if [0,1]/2
- L225: if [0,1]/2
- L227: if [0,1]/2
- L230: if [0,1]/2
- L233: if [0,1]/2
- L250: binary-expr [1]/2
- L250: binary-expr [1]/2
- L251: if [0]/2
- L255: if [0]/2

### src/layout/dot/init.ts — 21/60 branch paths uncovered

Uncovered statement lines: 66-70, 110-112, 151-152, 218, 264-267, 269, 271

- L66: if [0,1]/2
- L66: binary-expr [0,1]/2
- L101: if [1]/2
- L102: if [1]/2
- L103: if [1]/2
- L104: if [1]/2
- L105: if [1]/2
- L110: if [0]/2
- L111: if [0]/2
- L112: if [0]/2
- L131: binary-expr [1]/2
- L150: if [1]/2
- L152: binary-expr [0,1]/2
- L218: if [0,1]/2
- L218: binary-expr [0,1]/2
- L260: if [1]/2

### src/layout/dot/pack-components.ts — 20/58 branch paths uncovered

Uncovered statement lines: 64-65, 260, 341, 381-383

- L63: if [1]/2
- L63: binary-expr [1]/2
- L64: if [0,1]/2
- L64: binary-expr [0,1,2,3]/4
- L260: if [0]/2
- L341: if [0]/2
- L357: if [1]/2
- L379: if [1]/2
- L380: if [0]/2
- L382: binary-expr [0,1]/2
- L383: cond-expr [0,1]/2
- L383: binary-expr [0,1]/2
- L388: if [1]/2

### src/layout/dot/fastgr.ts — 15/88 branch paths uncovered

Uncovered statement lines: 49-50, 218, 264-265, 328, 375

- L49: if [0,1]/2
- L70: if [1]/2
- L82: if [1]/2
- L83: if [1]/2
- L218: if [0]/2
- L234: if [1]/2
- L235: if [1]/2
- L259: if [1]/2
- L261: if [1]/2
- L265: if [0,1]/2
- L326: cond-expr [1]/2
- L328: if [0]/2
- L375: if [0]/2

