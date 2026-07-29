<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4d — render + ortho/maze + gvc + xdot remainder

Total uncovered branches in scope (files <90% br, >=8 uncovered): 331

Priority order (uncovered br, pct, file):

-   41   77.71  src/render/svg-helpers.ts
-   35   63.15  src/render/dot/xdot-ops.ts
-   29   67.41  src/ortho/maze.ts
-   26      60  src/render/dot/edge-draw.ts
-   23   67.14  src/render/svg-edge-ortho-radius.ts
-   19   85.27  src/render/dot.ts
-   18   68.96  src/render/svg-multicolor.ts
-   18   87.23  src/render/dot/agwrite.ts
-   16   84.15  src/gvc/device.ts
-   15   82.14  src/ortho/trap-segment.ts
-   11   67.64  src/gvc/emit-walk.ts
-   11   81.35  src/gvc/viewport.ts
-   11   63.33  src/render/svg-edge-split.ts
-   11   59.25  src/render/svg-parallel-edge.ts
-   11   87.91  src/render/dot/attrs.ts
-   10   68.75  src/gvc/edge-labels.ts
-    9   87.83  src/ortho/trap-query.ts
-    9   35.71  src/render/xdot-public.ts
-    8   82.97  src/render/svg-gradient.ts

## Uncovered appendix

### src/render/svg-helpers.ts — 41/184 branch paths uncovered

Uncovered statement lines: 121, 161, 255, 271, 303, 355, 442, 448, 495, 498, 537, 545-546, 559, 564, 568, 583-586, 588-595, 597, 612

- L119: cond-expr [1]/2
- L121: if [0]/2
- L161: if [0]/2
- L244: if [1]/2
- L254: if [0]/2
- L266: if [1]/2
- L303: if [0]/2
- L335: binary-expr [1]/2
- L355: if [0]/2
- L396: if [1]/2
- L442: if [0]/2
- L444: cond-expr [1]/2
- L448: if [0]/2
- L466: cond-expr [1]/2
- L467: cond-expr [1]/2
- L468: cond-expr [1]/2
- L491: cond-expr [1]/2
- L492: cond-expr [1]/2
- L493: cond-expr [1]/2
- L494: if [0]/2
- L497: if [0]/2
- L513: if [1]/2
- L517: if [1]/2
- L535: if [0]/2
- L541: binary-expr [1]/2
- L544: if [0]/2
- L545: cond-expr [0,1]/2
- L559: if [0]/2
- L561: cond-expr [1]/2
- L564: if [0]/2
- L567: if [0]/2
- L585: if [0,1]/2
- L590: if [0,1]/2
- L608: cond-expr [1]/2
- L609: cond-expr [1]/2
- L610: cond-expr [1]/2
- L612: if [0]/2
- L614: if [1]/2

### src/render/dot/xdot-ops.ts — 35/95 branch paths uncovered

Uncovered statement lines: 54, 160-161, 181, 341, 346-349, 392-393, 415, 427

- L54: if [0]/2
- L122: if [1]/2
- L128: cond-expr [0]/2
- L159: if [1]/2
- L160: if [0,1]/2
- L160: binary-expr [0,1]/2
- L181: if [0]/2
- L183: cond-expr [1]/2
- L184: cond-expr [1]/2
- L262: cond-expr [1]/2
- L263: cond-expr [1]/2
- L287: cond-expr [1]/2
- L341: if [0]/2
- L345: if [0]/2
- L347: if [0,1]/2
- L349: cond-expr [0,1]/2
- L351: if [1]/2
- L391: if [1]/2
- L393: binary-expr [0,1,2,3,4,5,6,7,8,9,10]/11
- L414: if [0]/2
- L427: if [0]/2

### src/ortho/maze.ts — 29/89 branch paths uncovered

Uncovered statement lines: 47, 81-87, 89-91, 96-100, 105-109, 114-115, 125, 215

- L81: if [0,1]/2
- L86: if [0,1]/2
- L87: cond-expr [0,1]/2
- L87: binary-expr [0,1]/2
- L89: if [0,1]/2
- L89: binary-expr [0,1]/2
- L98: if [0,1]/2
- L98: binary-expr [0,1]/2
- L99: if [0,1]/2
- L107: if [0,1]/2
- L107: binary-expr [0,1]/2
- L108: if [0,1]/2
- L114: if [0]/2
- L115: if [0]/2
- L125: if [0]/2
- L125: binary-expr [1]/2
- L215: if [0]/2

### src/render/dot/edge-draw.ts — 26/65 branch paths uncovered

Uncovered statement lines: 88, 103, 107-114, 133, 165

- L78: cond-expr [1]/2
- L87: if [0]/2
- L87: binary-expr [2,3]/4
- L88: cond-expr [0,1]/2
- L91: if [1]/2
- L98: cond-expr [0]/2
- L98: binary-expr [1]/2
- L99: if [1]/2
- L107: if [0,1]/2
- L109: binary-expr [0,1]/2
- L110: binary-expr [0,1]/2
- L130: binary-expr [1]/2
- L133: if [0]/2
- L157: cond-expr [1]/2
- L161: binary-expr [1]/2
- L165: if [0]/2
- L175: binary-expr [1]/2
- L176: binary-expr [1,2]/3
- L191: binary-expr [1]/2
- L192: binary-expr [1]/2

### src/render/svg-edge-ortho-radius.ts — 23/70 branch paths uncovered

Uncovered statement lines: 58-63, 65-66, 72-77, 79-80, 148

- L55: if [1]/2
- L58: if [0,1]/2
- L58: binary-expr [0,1]/2
- L61: if [0,1]/2
- L61: binary-expr [0,1]/2
- L69: if [1]/2
- L72: if [0,1]/2
- L72: binary-expr [0,1]/2
- L75: if [0,1]/2
- L75: binary-expr [0,1]/2
- L95: if [1]/2
- L184: if [1]/2
- L206: if [1]/2
- L209: cond-expr [1]/2
- L210: if [1]/2

### src/render/dot.ts — 19/129 branch paths uncovered

Uncovered statement lines: 143, 228, 283, 394, 415-416

- L129: if [1]/2
- L143: if [0]/2
- L149: cond-expr [0]/2
- L149: binary-expr [1]/2
- L170: cond-expr [0]/2
- L227: if [0]/2
- L283: if [0]/2
- L306: if [1]/2
- L319: cond-expr [1]/2
- L322: binary-expr [1]/2
- L323: binary-expr [1]/2
- L326: binary-expr [1]/2
- L369: binary-expr [1]/2
- L387: binary-expr [1]/2
- L394: if [0]/2
- L415: if [0]/2
- L416: if [0]/2
- L426: cond-expr [1]/2
- L447: if [1]/2

### src/render/svg-multicolor.ts — 18/58 branch paths uncovered

Uncovered statement lines: 181, 236, 250, 292, 306

- L87: cond-expr [0]/2
- L181: if [0]/2
- L181: binary-expr [1]/2
- L216: if [1]/2
- L236: if [0]/2
- L245: cond-expr [1]/2
- L246: if [1]/2
- L250: if [0]/2
- L251: if [1]/2
- L255: if [1]/2
- L270: if [1]/2
- L292: if [0]/2
- L294: cond-expr [1]/2
- L302: cond-expr [1]/2
- L303: if [1]/2
- L306: if [0]/2
- L307: if [1]/2
- L311: if [1]/2

### src/render/dot/agwrite.ts — 18/141 branch paths uncovered

Uncovered statement lines: 116, 120-121, 123-124, 126, 247, 281, 289-290

- L116: if [0]/2
- L118: if [1]/2
- L119: if [1]/2
- L121: if [0,1]/2
- L123: if [0,1]/2
- L206: cond-expr [1]/2
- L229: cond-expr [1]/2
- L246: if [0]/2
- L281: if [0]/2
- L288: if [0]/2
- L290: if [0,1]/2
- L331: if [0]/2
- L342: if [1]/2
- L373: binary-expr [1]/2
- L375: if [1]/2

### src/gvc/device.ts — 16/101 branch paths uncovered

Uncovered statement lines: 104-106, 217, 241, 291, 293, 300-301, 338, 342

- L174: binary-expr [1]/2
- L217: if [0]/2
- L241: if [0]/2
- L267: binary-expr [1]/2
- L291: if [0]/2
- L292: if [0]/2
- L300: if [0]/2
- L301: if [0]/2
- L329: if [1]/2
- L338: if [0]/2
- L342: if [0]/2
- L421: if [1]/2
- L423: binary-expr [1]/2
- L426: if [1]/2
- L463: if [1]/2
- L509: if [1]/2

### src/ortho/trap-segment.ts — 15/84 branch paths uncovered

Uncovered statement lines: 45, 100-102, 104, 129-131, 133-134, 275, 280-281

- L45: if [0]/2
- L100: cond-expr [0,1]/2
- L101: if [0,1]/2
- L101: binary-expr [0,1]/2
- L130: if [0,1]/2
- L130: binary-expr [0,1]/2
- L274: if [0]/2
- L274: binary-expr [1]/2
- L279: if [0]/2
- L279: binary-expr [1]/2

### src/gvc/emit-walk.ts — 11/34 branch paths uncovered

Uncovered statement lines: 43, 66-69, 72-73, 88

- L43: if [0]/2
- L53: if [1]/2
- L57: if [1]/2
- L68: binary-expr [0,1]/2
- L69: if [0,1]/2
- L73: if [0,1]/2
- L88: if [0]/2
- L95: if [1]/2

### src/gvc/viewport.ts — 11/59 branch paths uncovered

Uncovered statement lines: 71-74, 76, 152, 199-200

- L66: if [1]/2
- L69: if [1]/2
- L72: if [0,1]/2
- L74: if [0,1]/2
- L151: if [1]/2
- L181: binary-expr [1,2]/3
- L199: if [0]/2
- L200: if [0]/2

### src/render/svg-edge-split.ts — 11/30 branch paths uncovered

Uncovered statement lines: 34, 39, 71-81, 95, 113, 122, 173, 176

- L70: if [1]/2
- L77: if [0,1]/2
- L94: if [0]/2
- L97: if [1]/2
- L113: if [0]/2
- L114: binary-expr [1]/2
- L122: if [0]/2
- L170: binary-expr [1]/2
- L173: if [0]/2
- L176: if [0]/2

### src/render/svg-parallel-edge.ts — 11/27 branch paths uncovered

Uncovered statement lines: 55, 62, 87-88, 99

- L50: if [1]/2
- L54: if [0]/2
- L57: if [1]/2
- L62: if [0]/2
- L86: if [0]/2
- L99: if [0]/2
- L112: binary-expr [1]/2
- L113: binary-expr [1]/2
- L120: binary-expr [1]/2
- L121: binary-expr [1,2]/3

### src/render/dot/attrs.ts — 11/91 branch paths uncovered

Uncovered statement lines: 211-213, 249, 278, 285, 320, 354-355, 410, 417

- L249: if [0]/2
- L278: if [0]/2
- L285: if [0]/2
- L319: if [1]/2
- L319: binary-expr [1]/2
- L353: if [1]/2
- L354: if [0,1]/2
- L399: cond-expr [1]/2
- L410: if [0]/2
- L417: if [0]/2

### src/gvc/edge-labels.ts — 10/32 branch paths uncovered

Uncovered statement lines: 34-40, 108-109

- L33: if [0]/2
- L35: if [0,1]/2
- L37: if [0,1]/2
- L42: binary-expr [1]/2
- L108: if [0]/2
- L109: if [0]/2
- L109: binary-expr [1]/2
- L115: binary-expr [1]/2

### src/ortho/trap-query.ts — 9/74 branch paths uncovered

Uncovered statement lines: 164

- L29: cond-expr [1]/2
- L33: cond-expr [0]/2
- L34: cond-expr [1]/2
- L146: binary-expr [3]/4
- L158: if [1]/2
- L160: if [1]/2
- L163: if [1]/2
- L164: if [0,1]/2

### src/render/xdot-public.ts — 9/14 branch paths uncovered

Uncovered statement lines: 80, 90-92, 121

- L81: binary-expr [0,1,2,3]/4
- L90: if [0,1]/2
- L91: cond-expr [0,1]/2
- L101: if [1]/2

### src/render/svg-gradient.ts — 8/47 branch paths uncovered

Uncovered statement lines: 94-98, 104, 157, 171, 174, 176-177

- L92: if [1]/2
- L94: if [0,1]/2
- L103: if [0]/2
- L103: binary-expr [1]/2
- L157: if [0]/2
- L171: if [0]/2
- L173: if [0]/2

