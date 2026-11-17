
plugin/neato_layout/libgvplugin_neato_layout.8.0.16.dylib:	file format mach-o arm64

Disassembly of section __TEXT,__text:

000000000001ec44 <_mult_dense_mat_d>:
   1ec44:      	sub	sp, sp, #0x70
   1ec48:      	stp	x28, x27, [sp, #0x10]
   1ec4c:      	stp	x26, x25, [sp, #0x20]
   1ec50:      	stp	x24, x23, [sp, #0x30]
   1ec54:      	stp	x22, x21, [sp, #0x40]
   1ec58:      	stp	x20, x19, [sp, #0x50]
   1ec5c:      	stp	x29, x30, [sp, #0x60]
   1ec60:      	add	x29, sp, #0x60
   1ec64:      	mov	x24, x5
   1ec68:      	mov	x23, x4
   1ec6c:      	mov	x22, x3
   1ec70:      	mov	x25, x2
   1ec74:      	mov	x19, x1
   1ec78:      	mov	x20, x0
   1ec7c:      	mul	w8, w4, w2
   1ec80:      	cbz	w8, 0x1ed58 <_mult_dense_mat_d+0x114>
   1ec84:      	sxtw	x21, w8
   1ec88:      	tbnz	w21, #0x1f, 0x1edb8 <_mult_dense_mat_d+0x174>
   1ec8c:      	mov	x0, x21
   1ec90:      	mov	w1, #0x8                ; =8
   1ec94:      	bl	0x6a47c <_xdotBB+0x6a47c>
   1ec98:      	mov	x26, x0
   1ec9c:      	cbz	x0, 0x1eddc <_mult_dense_mat_d+0x198>
   1eca0:      	cbz	w25, 0x1ed6c <_mult_dense_mat_d+0x128>
   1eca4:      	sxtw	x27, w25
   1eca8:      	tbnz	w25, #0x1f, 0x1ee00 <_mult_dense_mat_d+0x1bc>
   1ecac:      	mov	x0, x27
   1ecb0:      	mov	w1, #0x8                ; =8
   1ecb4:      	bl	0x6a47c <_xdotBB+0x6a47c>
   1ecb8:      	cbz	x0, 0x1ee24 <_mult_dense_mat_d+0x1e0>
   1ecbc:      	mov	x21, x0
   1ecc0:      	str	x0, [x24]
   1ecc4:      	mov	w24, w25
   1ecc8:      	sbfiz	x8, x23, #3, #32
   1eccc:      	mov	x9, x0
   1ecd0:      	mov	x10, x24
   1ecd4:      	str	x26, [x9], #0x8
   1ecd8:      	add	x26, x26, x8
   1ecdc:      	subs	x10, x10, #0x1
   1ece0:      	b.ne	0x1ecd4 <_mult_dense_mat_d+0x90>
   1ece4:      	cmp	w23, #0x1
   1ece8:      	b.lt	0x1ed98 <_mult_dense_mat_d+0x154>
   1ecec:      	mov	w8, w23
   1ecf0:      	cmp	w22, #0x0
   1ecf4:      	b.le	0x1ed80 <_mult_dense_mat_d+0x13c>
   1ecf8:      	mov	x9, #0x0                ; =0
   1ecfc:      	mov	w10, w22
   1ed00:      	mov	x11, #0x0               ; =0
   1ed04:      	ldr	x12, [x21, x9, lsl #3]
   1ed08:      	ldr	x13, [x20, x9, lsl #3]
   1ed0c:      	movi.2d	v0, #0000000000000000
   1ed10:      	mov	x14, x13
   1ed14:      	mov	x15, x19
   1ed18:      	mov	x16, x10
   1ed1c:      	ldr	d1, [x14], #0x8
   1ed20:      	ldr	x17, [x15], #0x8
   1ed24:      	ldr	s2, [x17, x11, lsl #2]
   1ed28:      	fcvt	d2, s2
   1ed2c:      	fmadd	d0, d1, d2, d0
   1ed30:      	subs	x16, x16, #0x1
   1ed34:      	b.ne	0x1ed1c <_mult_dense_mat_d+0xd8>
   1ed38:      	str	d0, [x12, x11, lsl #3]
   1ed3c:      	add	x11, x11, #0x1
   1ed40:      	cmp	x11, x8
   1ed44:      	b.ne	0x1ed0c <_mult_dense_mat_d+0xc8>
   1ed48:      	add	x9, x9, #0x1
   1ed4c:      	cmp	x9, x24
   1ed50:      	b.ne	0x1ed00 <_mult_dense_mat_d+0xbc>
   1ed54:      	b	0x1ed98 <_mult_dense_mat_d+0x154>
   1ed58:      	mov	x0, #0x0                ; =0
   1ed5c:      	mov	w1, #0x8                ; =8
   1ed60:      	bl	0x6a47c <_xdotBB+0x6a47c>
   1ed64:      	mov	x26, x0
   1ed68:      	cbnz	w25, 0x1eca4 <_mult_dense_mat_d+0x60>
   1ed6c:      	mov	x0, #0x0                ; =0
   1ed70:      	mov	w1, #0x8                ; =8
   1ed74:      	bl	0x6a47c <_xdotBB+0x6a47c>
   1ed78:      	str	x0, [x24]
   1ed7c:      	b	0x1ed98 <_mult_dense_mat_d+0x154>
   1ed80:      	lsl	x19, x8, #3
   1ed84:      	ldr	x0, [x21], #0x8
   1ed88:      	mov	x1, x19
   1ed8c:      	bl	0x6a470 <_xdotBB+0x6a470>
   1ed90:      	subs	x24, x24, #0x1
   1ed94:      	b.ne	0x1ed84 <_mult_dense_mat_d+0x140>
   1ed98:      	ldp	x29, x30, [sp, #0x60]
   1ed9c:      	ldp	x20, x19, [sp, #0x50]
   1eda0:      	ldp	x22, x21, [sp, #0x40]
   1eda4:      	ldp	x24, x23, [sp, #0x30]
   1eda8:      	ldp	x26, x25, [sp, #0x20]
   1edac:      	ldp	x28, x27, [sp, #0x10]
   1edb0:      	add	sp, sp, #0x70
   1edb4:      	ret
   1edb8:      	adrp	x8, 0x70000 <_adjustMode>
   1edbc:      	ldr	x8, [x8, #0x308]
   1edc0:      	ldr	x0, [x8]
   1edc4:      	mov	w8, #0x8                ; =8
   1edc8:      	stp	x21, x8, [sp]
   1edcc:      	adrp	x1, 0x6b000 <_.str.2+0x34>
   1edd0:      	add	x1, x1, #0x9f5
   1edd4:      	bl	0x6a560 <_xdotBB+0x6a560>
   1edd8:      	bl	0x6a04c <_graphviz_exit>
   1eddc:      	adrp	x8, 0x70000 <_adjustMode>
   1ede0:      	ldr	x8, [x8, #0x308]
   1ede4:      	ldr	x0, [x8]
   1ede8:      	lsl	x8, x21, #3
   1edec:      	str	x8, [sp]
   1edf0:      	adrp	x1, 0x6b000 <_.str.2+0x34>
   1edf4:      	add	x1, x1, #0xa2f
   1edf8:      	bl	0x6a560 <_xdotBB+0x6a560>
   1edfc:      	bl	0x6a04c <_graphviz_exit>
   1ee00:      	adrp	x8, 0x70000 <_adjustMode>
   1ee04:      	ldr	x8, [x8, #0x308]
   1ee08:      	ldr	x0, [x8]
   1ee0c:      	mov	w8, #0x8                ; =8
   1ee10:      	stp	x27, x8, [sp]
   1ee14:      	adrp	x1, 0x6b000 <_.str.2+0x34>
   1ee18:      	add	x1, x1, #0x9f5
   1ee1c:      	bl	0x6a560 <_xdotBB+0x6a560>
   1ee20:      	bl	0x6a04c <_graphviz_exit>
   1ee24:      	adrp	x8, 0x70000 <_adjustMode>
   1ee28:      	ldr	x8, [x8, #0x308]
   1ee2c:      	ldr	x0, [x8]
   1ee30:      	lsl	x8, x27, #3
   1ee34:      	str	x8, [sp]
   1ee38:      	adrp	x1, 0x6b000 <_.str.2+0x34>
   1ee3c:      	add	x1, x1, #0xa2f
   1ee40:      	bl	0x6a560 <_xdotBB+0x6a560>
   1ee44:      	bl	0x6a04c <_graphviz_exit>
