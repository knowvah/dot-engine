<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4b — dot routing/position/cluster remainder

Total uncovered branches in scope (files <90% br, >=8 uncovered): 514

Priority order (uncovered br, pct, file):

-   75       0  src/layout/dot/compound-geom.ts
-   44       0  src/layout/dot/edge-route-poly.ts
-   29   82.31  src/layout/dot/edge-route.ts
-   27      70  src/layout/dot/compound.ts
-   26   78.15  src/layout/dot/splines-flat-labeled.ts
-   25   75.49  src/layout/dot/edge-route-chain.ts
-   22   80.86  src/layout/dot/splines-label.ts
-   17   83.96  src/layout/dot/edge-route-faithful.ts
-   17      50  src/layout/dot/edge-route-rank.ts
-   17      15  src/layout/dot/edge-route-routing.ts
-   17   80.89  src/layout/dot/position-cluster.ts
-   17    78.2  src/layout/dot/sameport.ts
-   17   88.74  src/layout/dot/splines-flat.ts
-   16   68.62  src/layout/dot/edge-route-helpers.ts
-   15   82.75  src/layout/dot/compound-clip.ts
-   15   31.81  src/layout/dot/edge-route-geom.ts
-   15   58.33  src/layout/dot/position.ts
-   13      75  src/layout/dot/mincross-utils.ts
-   13   89.34  src/layout/dot/ns-subtree.ts
-   11      78  src/layout/dot/label-order.ts
-   10      80  src/layout/dot/index.ts
-   10   68.75  src/layout/dot/self-loop.ts
-   10    83.6  src/layout/dot/splines-flat-multi.ts
-    9   59.09  src/layout/dot/edge-route-clip.ts
-    9   35.71  src/layout/dot/flat-utils.ts
-    9    77.5  src/layout/dot/ns-core.ts
-    9   89.53  src/layout/dot/ns-range.ts

## Uncovered appendix

### src/layout/dot/compound-geom.ts — 75/75 branch paths uncovered

Uncovered statement lines: 25-27, 36, 57-58, 78-82, 97-102, 104, 113-118, 120, 145-146, 151-152, 157, 175-179, 181-183, 196-199, 204, 219-222, 225, 234-237, 242-245, 250-253, 258-261, 275

- L25: if [0,1]/2
- L26: if [0,1]/2
- L36: binary-expr [0,1,2,3]/4
- L82: cond-expr [0,1]/2
- L98: cond-expr [0,1]/2
- L102: if [0,1]/2
- L102: binary-expr [0,1]/2
- L114: cond-expr [0,1]/2
- L118: if [0,1]/2
- L118: binary-expr [0,1]/2
- L145: cond-expr [0,1]/2
- L146: binary-expr [0,1]/2
- L151: cond-expr [0,1]/2
- L157: cond-expr [0,1]/2
- L175: if [0,1]/2
- L177: if [0,1]/2
- L178: if [0,1]/2
- L178: binary-expr [0,1]/2
- L179: cond-expr [0,1]/2
- L183: cond-expr [0,1]/2
- L196: if [0,1]/2
- L196: binary-expr [0,1]/2
- L234: if [0,1]/2
- L237: cond-expr [0,1]/2
- L237: binary-expr [0,1]/2
- L242: if [0,1]/2
- L245: cond-expr [0,1]/2
- L245: binary-expr [0,1]/2
- L250: if [0,1]/2
- L253: cond-expr [0,1]/2
- L253: binary-expr [0,1]/2
- L258: if [0,1]/2
- L261: cond-expr [0,1]/2
- L261: binary-expr [0,1]/2
- L276: binary-expr [0,1,2,3,4]/5

### src/layout/dot/edge-route-poly.ts — 44/44 branch paths uncovered

Uncovered statement lines: 28-31, 39-41, 43, 45-46, 56-58, 67-70, 75, 86-88, 90, 92-93, 95, 104-106, 120-124, 134-135, 156-159, 167-171

- L29: cond-expr [0,1]/2
- L29: cond-expr [0,1]/2
- L30: cond-expr [0,1]/2
- L30: cond-expr [0,1]/2
- L39: if [0,1]/2
- L40: if [0,1]/2
- L40: binary-expr [0,1]/2
- L45: if [0,1]/2
- L68: cond-expr [0,1]/2
- L68: cond-expr [0,1]/2
- L69: cond-expr [0,1]/2
- L69: cond-expr [0,1]/2
- L86: if [0,1]/2
- L87: if [0,1]/2
- L87: binary-expr [0,1]/2
- L92: if [0,1]/2
- L120: if [0,1]/2
- L158: if [0,1]/2
- L168: if [0,1]/2
- L170: if [0,1]/2
- L170: binary-expr [0,1]/2
- L171: binary-expr [0,1]/2

### src/layout/dot/edge-route.ts — 29/164 branch paths uncovered

Uncovered statement lines: 104, 113, 180, 203-205, 224, 246-247, 283, 366-367, 395, 483-484

- L148: binary-expr [1]/2
- L148: binary-expr [1]/2
- L154: binary-expr [1]/2
- L154: binary-expr [1]/2
- L180: if [0]/2
- L202: if [1]/2
- L206: cond-expr [0,1]/2
- L207: cond-expr [0,1]/2
- L208: cond-expr [0,1]/2
- L209: cond-expr [0,1]/2
- L224: if [0]/2
- L246: if [0]/2
- L247: if [0]/2
- L249: if [1]/2
- L283: if [0]/2
- L298: binary-expr [1]/2
- L298: binary-expr [1]/2
- L324: binary-expr [1]/2
- L324: binary-expr [1]/2
- L366: if [0]/2
- L367: if [0]/2
- L395: if [0]/2
- L409: if [1]/2
- L483: if [0]/2
- L484: if [0]/2

### src/layout/dot/compound.ts — 27/90 branch paths uncovered

Uncovered statement lines: 82-90, 99-104, 106-107, 121, 133-134, 144, 164, 178, 182, 201, 227, 244, 272, 278

- L37: if [1]/2
- L68: binary-expr [1]/2
- L84: binary-expr [0,1]/2
- L86: if [0,1]/2
- L86: binary-expr [0,1]/2
- L106: cond-expr [0,1]/2
- L120: if [0]/2
- L120: binary-expr [1]/2
- L122: if [1]/2
- L132: if [0]/2
- L144: if [0]/2
- L164: if [0]/2
- L177: if [0]/2
- L177: binary-expr [1]/2
- L179: if [1]/2
- L182: if [0]/2
- L201: if [0]/2
- L212: binary-expr [1]/2
- L227: if [0]/2
- L243: cond-expr [0]/2
- L244: if [0]/2
- L272: if [0]/2
- L278: if [0]/2

### src/layout/dot/splines-flat-labeled.ts — 26/119 branch paths uncovered

Uncovered statement lines: 39-40, 152, 225-226, 236-237, 259, 270, 274-277, 316, 361, 402

- L39: if [0]/2
- L105: cond-expr [1]/2
- L133: if [1]/2
- L143: binary-expr [1]/2
- L143: binary-expr [1]/2
- L152: if [0]/2
- L186: cond-expr [1]/2
- L219: binary-expr [1]/2
- L219: binary-expr [1]/2
- L225: if [0]/2
- L225: cond-expr [0,1]/2
- L226: if [0]/2
- L228: if [0]/2
- L228: cond-expr [0,1]/2
- L236: if [0]/2
- L237: if [0]/2
- L268: if [1]/2
- L269: if [1]/2
- L270: if [0]/2
- L313: cond-expr [1]/2
- L316: if [0]/2
- L317: if [1]/2
- L358: if [1]/2
- L402: if [0]/2

### src/layout/dot/edge-route-chain.ts — 25/102 branch paths uncovered

Uncovered statement lines: 69, 163, 166, 179, 194, 221, 243, 257, 279, 405, 417

- L57: binary-expr [1]/2
- L73: cond-expr [1]/2
- L85: binary-expr [1]/2
- L94: binary-expr [1]/2
- L162: if [0]/2
- L166: if [0]/2
- L179: if [0]/2
- L194: if [0]/2
- L221: if [0]/2
- L229: cond-expr [1]/2
- L243: if [0]/2
- L257: if [0]/2
- L277: binary-expr [1]/2
- L279: if [0]/2
- L308: if [1]/2
- L328: binary-expr [1]/2
- L331: if [1]/2
- L368: binary-expr [1]/2
- L368: binary-expr [1]/2
- L369: cond-expr [1]/2
- L381: binary-expr [1]/2
- L382: binary-expr [1]/2
- L405: if [0]/2
- L417: if [0]/2
- L419: if [1]/2

### src/layout/dot/splines-label.ts — 22/115 branch paths uncovered

Uncovered statement lines: 41, 70, 72, 74, 87-92, 106-107, 224, 226-227, 235, 255, 366

- L38: if [1]/2
- L70: if [0]/2
- L72: if [0]/2
- L74: if [0]/2
- L88: if [0,1]/2
- L90: if [0,1]/2
- L105: if [0]/2
- L108: if [1]/2
- L112: if [1]/2
- L224: if [0]/2
- L226: if [0]/2
- L227: if [0]/2
- L234: if [1]/2
- L255: if [0]/2
- L272: binary-expr [1]/2
- L290: binary-expr [1]/2
- L337: binary-expr [1]/2
- L366: if [0]/2
- L415: if [1]/2
- L429: if [1]/2

### src/layout/dot/edge-route-faithful.ts — 17/106 branch paths uncovered

Uncovered statement lines: 111, 131, 193, 226, 262, 265, 291-293, 300-301, 306-307, 338, 400, 402

- L111: if [0]/2
- L131: if [0]/2
- L164: binary-expr [1]/2
- L180: binary-expr [1]/2
- L193: if [0]/2
- L226: if [0]/2
- L262: if [0]/2
- L262: binary-expr [1]/2
- L290: if [0]/2
- L300: if [0]/2
- L301: if [0]/2
- L306: if [0]/2
- L307: if [0]/2
- L338: if [0]/2
- L384: binary-expr [1]/2
- L400: if [0]/2
- L402: if [0]/2

### src/layout/dot/edge-route-rank.ts — 17/34 branch paths uncovered

Uncovered statement lines: 123-129

- L24: binary-expr [1]/2
- L25: binary-expr [1]/2
- L29: if [1]/2
- L39: binary-expr [1]/2
- L40: binary-expr [1]/2
- L44: cond-expr [1]/2
- L45: if [1]/2
- L53: cond-expr [1]/2
- L122: if [1]/2
- L125: if [0,1]/2
- L125: binary-expr [0,1]/2
- L128: if [0,1]/2
- L128: binary-expr [0,1]/2

### src/layout/dot/edge-route-routing.ts — 17/20 branch paths uncovered

Uncovered statement lines: 82-86, 91, 123-124, 151, 154, 157-160, 164, 183-186, 189-190

- L92: binary-expr [0,1]/2
- L93: binary-expr [0,1]/2
- L122: default-arg [0]/1
- L138: binary-expr [1]/2
- L148: default-arg [0]/1
- L149: default-arg [0]/1
- L151: cond-expr [0,1]/2
- L154: cond-expr [0,1]/2
- L180: default-arg [0]/1
- L183: cond-expr [0,1]/2
- L186: cond-expr [0,1]/2

### src/layout/dot/position-cluster.ts — 17/89 branch paths uncovered

Uncovered statement lines: 83, 90, 134, 137, 155, 168, 172, 188, 232, 282

- L31: binary-expr [1]/2
- L34: binary-expr [1]/2
- L48: binary-expr [1]/2
- L53: binary-expr [1]/2
- L83: if [0]/2
- L90: if [0]/2
- L119: binary-expr [1]/2
- L134: if [0]/2
- L137: if [0]/2
- L155: if [0]/2
- L168: if [0]/2
- L172: if [0]/2
- L188: if [0]/2
- L188: binary-expr [1]/2
- L232: if [0]/2
- L282: if [0]/2
- L284: cond-expr [0]/2

### src/layout/dot/sameport.ts — 17/78 branch paths uncovered

Uncovered statement lines: 200, 246

- L49: if [1]/2
- L86: binary-expr [1]/2
- L86: binary-expr [1]/2
- L87: binary-expr [1]/2
- L112: if [1]/2
- L115: cond-expr [1]/2
- L127: binary-expr [1]/2
- L128: binary-expr [1]/2
- L129: cond-expr [1]/2
- L162: binary-expr [1]/2
- L175: cond-expr [0]/2
- L175: binary-expr [2]/3
- L177: binary-expr [0,1]/2
- L200: if [0]/2
- L246: if [0]/2
- L273: binary-expr [1]/2

### src/layout/dot/splines-flat.ts — 17/151 branch paths uncovered

Uncovered statement lines: 316, 370-371

- L255: binary-expr [1]/2
- L255: cond-expr [0,1]/2
- L256: if [1]/2
- L259: binary-expr [1]/2
- L272: if [1]/2
- L292: if [1]/2
- L316: if [0]/2
- L370: if [0]/2
- L371: if [0]/2
- L418: binary-expr [1]/2
- L520: binary-expr [1]/2
- L524: binary-expr [1]/2
- L556: binary-expr [1]/2
- L557: binary-expr [1]/2
- L589: binary-expr [1]/2
- L593: cond-expr [1]/2

### src/layout/dot/edge-route-helpers.ts — 16/51 branch paths uncovered

Uncovered statement lines: 54, 80-84, 163, 175

- L54: if [0]/2
- L72: if [1]/2
- L79: if [0]/2
- L79: binary-expr [1]/2
- L82: cond-expr [0,1]/2
- L83: cond-expr [0,1]/2
- L93: cond-expr [1]/2
- L94: cond-expr [1]/2
- L95: cond-expr [1]/2
- L134: binary-expr [1]/2
- L151: if [1]/2
- L163: if [0]/2
- L174: if [1]/2
- L186: cond-expr [0]/2

### src/layout/dot/compound-clip.ts — 15/87 branch paths uncovered

Uncovered statement lines: 125, 142, 197, 205-208

- L63: cond-expr [0]/2
- L125: if [0]/2
- L142: if [0]/2
- L184: cond-expr [1]/2
- L192: cond-expr [1]/2
- L197: if [0]/2
- L200: cond-expr [1]/2
- L205: if [0,1]/2
- L208: cond-expr [0,1]/2
- L208: binary-expr [0,1]/2
- L219: binary-expr [3,4]/5

### src/layout/dot/edge-route-geom.ts — 15/22 branch paths uncovered

Uncovered statement lines: 19, 37-39, 44-46, 75, 82, 86, 88-89

- L19: if [0]/2
- L37: if [0,1]/2
- L38: if [0,1]/2
- L44: if [0,1]/2
- L45: if [0,1]/2
- L75: if [0]/2
- L76: if [1]/2
- L82: if [0]/2
- L86: cond-expr [0,1]/2
- L88: if [0]/2

### src/layout/dot/position.ts — 15/36 branch paths uncovered

Uncovered statement lines: 79-80, 87-98, 135, 176-177

- L70: binary-expr [1]/2
- L70: binary-expr [1]/2
- L79: if [0]/2
- L80: if [0]/2
- L90: if [0,1]/2
- L90: binary-expr [0,1]/2
- L92: cond-expr [0,1]/2
- L93: if [0,1]/2
- L133: cond-expr [0]/2
- L135: if [0]/2
- L175: if [0]/2

### src/layout/dot/mincross-utils.ts — 13/52 branch paths uncovered

Uncovered statement lines: 51, 58, 65-69, 75-83, 156

- L51: if [0]/2
- L58: if [0]/2
- L67: if [0,1]/2
- L78: cond-expr [0,1]/2
- L89: cond-expr [1]/2
- L123: binary-expr [1]/2
- L138: cond-expr [1]/2
- L139: cond-expr [1]/2
- L155: binary-expr [1]/2
- L156: if [0]/2
- L157: binary-expr [1]/2

### src/layout/dot/ns-subtree.ts — 13/122 branch paths uncovered

Uncovered statement lines: 58, 72, 104, 107, 125, 138, 172, 302, 317, 329, 331, 342, 344

- L41: if [1]/2
- L72: if [0]/2
- L104: if [0]/2
- L107: if [0]/2
- L125: if [0]/2
- L138: if [0]/2
- L172: if [0]/2
- L302: if [0]/2
- L317: if [0]/2
- L329: if [0]/2
- L331: if [0]/2
- L342: if [0]/2
- L344: if [0]/2

### src/layout/dot/label-order.ts — 11/50 branch paths uncovered

Uncovered statement lines: 80, 116, 152, 157

- L38: if [1]/2
- L80: if [0]/2
- L83: if [1]/2
- L116: if [0]/2
- L129: binary-expr [1]/2
- L130: binary-expr [1]/2
- L132: binary-expr [1]/2
- L152: if [0]/2
- L153: binary-expr [1]/2
- L154: binary-expr [1]/2
- L157: if [0]/2

### src/layout/dot/index.ts — 10/50 branch paths uncovered

Uncovered statement lines: 92, 108-111, 238, 287, 300

- L92: if [0]/2
- L109: if [0,1]/2
- L109: binary-expr [0,1]/2
- L111: cond-expr [0,1]/2
- L238: if [0]/2
- L287: if [0]/2
- L295: if [1]/2

### src/layout/dot/self-loop.ts — 10/32 branch paths uncovered

Uncovered statement lines: (none)

- L61: binary-expr [1]/2
- L62: binary-expr [1]/2
- L79: binary-expr [1]/2
- L84: binary-expr [1]/2
- L85: binary-expr [1]/2
- L90: binary-expr [1]/2
- L95: binary-expr [1]/2
- L112: binary-expr [1]/2
- L113: binary-expr [1]/2
- L114: binary-expr [1]/2

### src/layout/dot/splines-flat-multi.ts — 10/61 branch paths uncovered

Uncovered statement lines: 59, 136, 157, 185

- L59: if [0]/2
- L94: binary-expr [1]/2
- L94: binary-expr [1]/2
- L131: cond-expr [0]/2
- L136: if [0]/2
- L156: if [0]/2
- L160: binary-expr [1]/2
- L160: binary-expr [1]/2
- L178: binary-expr [1]/2
- L185: if [0]/2

### src/layout/dot/edge-route-clip.ts — 9/22 branch paths uncovered

Uncovered statement lines: 112-113, 160, 250-252

- L84: cond-expr [1]/2
- L88: cond-expr [1]/2
- L104: cond-expr [1]/2
- L111: if [1]/2
- L113: cond-expr [0,1]/2
- L160: if [0]/2
- L250: if [0,1]/2

### src/layout/dot/flat-utils.ts — 9/14 branch paths uncovered

Uncovered statement lines: 19, 24, 28-29, 34, 39, 43-44, 51

- L18: if [1]/2
- L23: if [1]/2
- L28: if [0,1]/2
- L33: if [1]/2
- L38: if [1]/2
- L43: if [0,1]/2
- L50: if [1]/2

### src/layout/dot/ns-core.ts — 9/40 branch paths uncovered

Uncovered statement lines: 71, 118, 120

- L42: binary-expr [1]/2
- L62: if [1]/2
- L71: if [0]/2
- L90: binary-expr [1]/2
- L90: binary-expr [1]/2
- L95: binary-expr [1]/2
- L101: binary-expr [1]/2
- L118: if [0]/2
- L120: if [0]/2

### src/layout/dot/ns-range.ts — 9/86 branch paths uncovered

Uncovered statement lines: 98, 186

- L60: binary-expr [1]/2
- L73: binary-expr [1]/2
- L73: binary-expr [1]/2
- L73: binary-expr [1]/2
- L98: if [0]/2
- L186: if [0]/2
- L222: binary-expr [1]/2
- L222: binary-expr [1]/2
- L227: binary-expr [1]/2

