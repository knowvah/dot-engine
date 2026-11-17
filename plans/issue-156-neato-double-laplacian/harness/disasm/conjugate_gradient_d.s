
plugin/neato_layout/libgvplugin_neato_layout.8.0.16.dylib:	file format mach-o arm64

Disassembly of section __TEXT,__text:

0000000000011974 <_conjugate_gradient_d>:
   11974:      	sub	sp, sp, #0xa0
   11978:      	stp	d9, d8, [sp, #0x30]
   1197c:      	stp	x28, x27, [sp, #0x40]
   11980:      	stp	x26, x25, [sp, #0x50]
   11984:      	stp	x24, x23, [sp, #0x60]
   11988:      	stp	x22, x21, [sp, #0x70]
   1198c:      	stp	x20, x19, [sp, #0x80]
   11990:      	stp	x29, x30, [sp, #0x90]
   11994:      	add	x29, sp, #0x90
   11998:      	cbz	w3, 0x11d24 <_conjugate_gradient_d+0x3b0>
   1199c:      	mov	x26, x3
   119a0:      	str	w4, [sp, #0x24]
   119a4:      	sxtw	x24, w3
   119a8:      	tbnz	w3, #0x1f, 0x12528 <_conjugate_gradient_d+0xbb4>
   119ac:      	mov	x25, x5
   119b0:      	mov.16b	v8, v0
   119b4:      	mov	x23, x2
   119b8:      	mov	x27, x1
   119bc:      	mov	x28, x0
   119c0:      	mov	x0, x24
   119c4:      	mov	w1, #0x8                ; =8
   119c8:      	bl	0x6a47c <_xdotBB+0x6a47c>
   119cc:      	cbz	x0, 0x12504 <_conjugate_gradient_d+0xb90>
   119d0:      	mov	x19, x0
   119d4:      	mov	x0, x24
   119d8:      	mov	w1, #0x8                ; =8
   119dc:      	bl	0x6a47c <_xdotBB+0x6a47c>
   119e0:      	cbz	x0, 0x12504 <_conjugate_gradient_d+0xb90>
   119e4:      	mov	x20, x0
   119e8:      	mov	x0, x24
   119ec:      	mov	w1, #0x8                ; =8
   119f0:      	bl	0x6a47c <_xdotBB+0x6a47c>
   119f4:      	cbz	x0, 0x12504 <_conjugate_gradient_d+0xb90>
   119f8:      	mov	x21, x0
   119fc:      	mov	x0, x24
   11a00:      	mov	w1, #0x8                ; =8
   11a04:      	bl	0x6a47c <_xdotBB+0x6a47c>
   11a08:      	cbz	x0, 0x12504 <_conjugate_gradient_d+0xb90>
   11a0c:      	mov	x22, x0
   11a10:      	mov	x0, x24
   11a14:      	mov	w1, #0x8                ; =8
   11a18:      	bl	0x6a47c <_xdotBB+0x6a47c>
   11a1c:      	str	x0, [sp, #0x18]
   11a20:      	cbz	x0, 0x12504 <_conjugate_gradient_d+0xb90>
   11a24:      	mov	x0, x24
   11a28:      	mov	w1, #0x8                ; =8
   11a2c:      	bl	0x6a47c <_xdotBB+0x6a47c>
   11a30:      	cbz	x0, 0x12504 <_conjugate_gradient_d+0xb90>
   11a34:      	mov	w24, w26
   11a38:      	ubfiz	x8, x26, #3, #32
   11a3c:      	str	x0, [sp, #0x28]
   11a40:      	mov	x1, x23
   11a44:      	mov	x23, x8
   11a48:      	mov	x2, x8
   11a4c:      	bl	0x6a86c <_xdotBB+0x6a86c>
   11a50:      	ldr	x15, [sp, #0x28]
   11a54:      	cbz	w25, 0x11c3c <_conjugate_gradient_d+0x2c8>
   11a58:      	movi.2d	v1, #0000000000000000
   11a5c:      	mov	x8, x15
   11a60:      	mov	x9, x26
   11a64:      	cmp	w26, #0x8
   11a68:      	b.lo	0x11ac8 <_conjugate_gradient_d+0x154>
   11a6c:      	and	x10, x24, #0x7ffffff8
   11a70:      	add	x8, x15, x10, lsl #3
   11a74:      	sub	w9, w26, w10
   11a78:      	add	x11, x15, #0x20
   11a7c:      	mov	x12, x10
   11a80:      	ldp	q0, q2, [x11, #-0x20]
   11a84:      	mov	d3, v0[1]
   11a88:      	mov	d4, v2[1]
   11a8c:      	ldp	q5, q6, [x11], #0x40
   11a90:      	mov	d7, v5[1]
   11a94:      	mov	d16, v6[1]
   11a98:      	fadd	d0, d1, d0
   11a9c:      	fadd	d0, d0, d3
   11aa0:      	fadd	d0, d0, d2
   11aa4:      	fadd	d0, d0, d4
   11aa8:      	fadd	d0, d0, d5
   11aac:      	fadd	d0, d0, d7
   11ab0:      	fadd	d0, d0, d6
   11ab4:      	fadd	d1, d0, d16
   11ab8:      	subs	x12, x12, #0x8
   11abc:      	b.ne	0x11a80 <_conjugate_gradient_d+0x10c>
   11ac0:      	cmp	x10, x24
   11ac4:      	b.eq	0x11ad8 <_conjugate_gradient_d+0x164>
   11ac8:      	ldr	d0, [x8], #0x8
   11acc:      	fadd	d1, d1, d0
   11ad0:      	subs	w9, w9, #0x1
   11ad4:      	b.ne	0x11ac8 <_conjugate_gradient_d+0x154>
   11ad8:      	ucvtf	d0, w26
   11adc:      	fdiv	d1, d1, d0
   11ae0:      	mov	x8, x15
   11ae4:      	mov	x9, x26
   11ae8:      	cmp	w26, #0x8
   11aec:      	b.lo	0x11b38 <_conjugate_gradient_d+0x1c4>
   11af0:      	and	x10, x24, #0x7ffffff8
   11af4:      	add	x8, x15, x10, lsl #3
   11af8:      	sub	w9, w26, w10
   11afc:      	dup.2d	v2, v1[0]
   11b00:      	add	x11, x15, #0x20
   11b04:      	mov	x12, x10
   11b08:      	ldp	q3, q4, [x11, #-0x20]
   11b0c:      	ldp	q5, q6, [x11]
   11b10:      	fsub.2d	v3, v3, v2
   11b14:      	fsub.2d	v4, v4, v2
   11b18:      	fsub.2d	v5, v5, v2
   11b1c:      	fsub.2d	v6, v6, v2
   11b20:      	stp	q3, q4, [x11, #-0x20]
   11b24:      	stp	q5, q6, [x11], #0x40
   11b28:      	subs	x12, x12, #0x8
   11b2c:      	b.ne	0x11b08 <_conjugate_gradient_d+0x194>
   11b30:      	cmp	x10, x24
   11b34:      	b.eq	0x11b4c <_conjugate_gradient_d+0x1d8>
   11b38:      	ldr	d2, [x8]
   11b3c:      	fsub	d2, d2, d1
   11b40:      	str	d2, [x8], #0x8
   11b44:      	subs	w9, w9, #0x1
   11b48:      	b.ne	0x11b38 <_conjugate_gradient_d+0x1c4>
   11b4c:      	movi.2d	v1, #0000000000000000
   11b50:      	mov	x8, x27
   11b54:      	mov	x9, x26
   11b58:      	cmp	w26, #0x8
   11b5c:      	b.lo	0x11bbc <_conjugate_gradient_d+0x248>
   11b60:      	and	x10, x24, #0x7ffffff8
   11b64:      	add	x8, x27, x10, lsl #3
   11b68:      	sub	w9, w26, w10
   11b6c:      	add	x11, x27, #0x20
   11b70:      	mov	x12, x10
   11b74:      	ldp	q2, q3, [x11, #-0x20]
   11b78:      	mov	d4, v2[1]
   11b7c:      	mov	d5, v3[1]
   11b80:      	ldp	q6, q7, [x11], #0x40
   11b84:      	mov	d16, v6[1]
   11b88:      	mov	d17, v7[1]
   11b8c:      	fadd	d1, d1, d2
   11b90:      	fadd	d1, d1, d4
   11b94:      	fadd	d1, d1, d3
   11b98:      	fadd	d1, d1, d5
   11b9c:      	fadd	d1, d1, d6
   11ba0:      	fadd	d1, d1, d16
   11ba4:      	fadd	d1, d1, d7
   11ba8:      	fadd	d1, d1, d17
   11bac:      	subs	x12, x12, #0x8
   11bb0:      	b.ne	0x11b74 <_conjugate_gradient_d+0x200>
   11bb4:      	cmp	x10, x24
   11bb8:      	b.eq	0x11bcc <_conjugate_gradient_d+0x258>
   11bbc:      	ldr	d2, [x8], #0x8
   11bc0:      	fadd	d1, d1, d2
   11bc4:      	subs	w9, w9, #0x1
   11bc8:      	b.ne	0x11bbc <_conjugate_gradient_d+0x248>
   11bcc:      	mov	x8, x27
   11bd0:      	mov	x9, x26
   11bd4:      	fdiv	d0, d1, d0
   11bd8:      	cmp	w26, #0x8
   11bdc:      	b.lo	0x11c28 <_conjugate_gradient_d+0x2b4>
   11be0:      	and	x10, x24, #0x7ffffff8
   11be4:      	add	x8, x27, x10, lsl #3
   11be8:      	sub	w9, w26, w10
   11bec:      	dup.2d	v1, v0[0]
   11bf0:      	add	x11, x27, #0x20
   11bf4:      	mov	x12, x10
   11bf8:      	ldp	q2, q3, [x11, #-0x20]
   11bfc:      	ldp	q4, q5, [x11]
   11c00:      	fsub.2d	v2, v2, v1
   11c04:      	fsub.2d	v3, v3, v1
   11c08:      	fsub.2d	v4, v4, v1
   11c0c:      	fsub.2d	v5, v5, v1
   11c10:      	stp	q2, q3, [x11, #-0x20]
   11c14:      	stp	q4, q5, [x11], #0x40
   11c18:      	subs	x12, x12, #0x8
   11c1c:      	b.ne	0x11bf8 <_conjugate_gradient_d+0x284>
   11c20:      	cmp	x10, x24
   11c24:      	b.eq	0x11c3c <_conjugate_gradient_d+0x2c8>
   11c28:      	ldr	d1, [x8]
   11c2c:      	fsub	d1, d1, d0
   11c30:      	str	d1, [x8], #0x8
   11c34:      	subs	w9, w9, #0x1
   11c38:      	b.ne	0x11c28 <_conjugate_gradient_d+0x2b4>
   11c3c:      	mov	x8, #0x0                ; =0
   11c40:      	and	x9, x24, #0x7ffffff8
   11c44:      	add	x10, x27, #0x20
   11c48:      	ldr	x25, [sp, #0x18]
   11c4c:      	b	0x11c60 <_conjugate_gradient_d+0x2ec>
   11c50:      	str	d0, [x22, x8, lsl #3]
   11c54:      	add	x8, x8, #0x1
   11c58:      	cmp	x8, x24
   11c5c:      	b.eq	0x11d14 <_conjugate_gradient_d+0x3a0>
   11c60:      	ldr	x11, [x28, x8, lsl #3]
   11c64:      	cmp	w26, #0x8
   11c68:      	b.hs	0x11c78 <_conjugate_gradient_d+0x304>
   11c6c:      	mov	x13, #0x0               ; =0
   11c70:      	movi.2d	v0, #0000000000000000
   11c74:      	b	0x11cec <_conjugate_gradient_d+0x378>
   11c78:      	add	x12, x11, #0x20
   11c7c:      	movi.2d	v0, #0000000000000000
   11c80:      	mov	x13, x10
   11c84:      	mov	x14, x9
   11c88:      	ldp	q1, q2, [x12, #-0x20]
   11c8c:      	ldp	q3, q4, [x12], #0x40
   11c90:      	ldp	q5, q6, [x13, #-0x20]
   11c94:      	ldp	q7, q16, [x13], #0x40
   11c98:      	fmul.2d	v1, v1, v5
   11c9c:      	mov	d5, v1[1]
   11ca0:      	fmul.2d	v2, v2, v6
   11ca4:      	mov	d6, v2[1]
   11ca8:      	fmul.2d	v3, v3, v7
   11cac:      	mov	d7, v3[1]
   11cb0:      	fmul.2d	v4, v4, v16
   11cb4:      	mov	d16, v4[1]
   11cb8:      	fadd	d0, d0, d1
   11cbc:      	fadd	d0, d0, d5
   11cc0:      	fadd	d0, d0, d2
   11cc4:      	fadd	d0, d0, d6
   11cc8:      	fadd	d0, d0, d3
   11ccc:      	fadd	d0, d0, d7
   11cd0:      	fadd	d0, d0, d4
   11cd4:      	fadd	d0, d0, d16
   11cd8:      	subs	x14, x14, #0x8
   11cdc:      	b.ne	0x11c88 <_conjugate_gradient_d+0x314>
   11ce0:      	mov	x13, x9
   11ce4:      	cmp	x9, x24
   11ce8:      	b.eq	0x11c50 <_conjugate_gradient_d+0x2dc>
   11cec:      	sub	x12, x24, x13
   11cf0:      	lsl	x14, x13, #3
   11cf4:      	add	x13, x27, x14
   11cf8:      	add	x11, x11, x14
   11cfc:      	ldr	d1, [x11], #0x8
   11d00:      	ldr	d2, [x13], #0x8
   11d04:      	fmadd	d0, d1, d2, d0
   11d08:      	subs	x12, x12, #0x1
   11d0c:      	b.ne	0x11cfc <_conjugate_gradient_d+0x388>
   11d10:      	b	0x11c50 <_conjugate_gradient_d+0x2dc>
   11d14:      	cmp	w26, #0x8
   11d18:      	b.hs	0x11d8c <_conjugate_gradient_d+0x418>
   11d1c:      	mov	x8, #0x0                ; =0
   11d20:      	b	0x11dd8 <_conjugate_gradient_d+0x464>
   11d24:      	mov	x0, #0x0                ; =0
   11d28:      	mov	w1, #0x8                ; =8
   11d2c:      	bl	0x6a47c <_xdotBB+0x6a47c>
   11d30:      	mov	x19, x0
   11d34:      	mov	x0, #0x0                ; =0
   11d38:      	mov	w1, #0x8                ; =8
   11d3c:      	bl	0x6a47c <_xdotBB+0x6a47c>
   11d40:      	mov	x20, x0
   11d44:      	mov	x0, #0x0                ; =0
   11d48:      	mov	w1, #0x8                ; =8
   11d4c:      	bl	0x6a47c <_xdotBB+0x6a47c>
   11d50:      	mov	x21, x0
   11d54:      	mov	x0, #0x0                ; =0
   11d58:      	mov	w1, #0x8                ; =8
   11d5c:      	bl	0x6a47c <_xdotBB+0x6a47c>
   11d60:      	mov	x22, x0
   11d64:      	mov	x0, #0x0                ; =0
   11d68:      	mov	w1, #0x8                ; =8
   11d6c:      	bl	0x6a47c <_xdotBB+0x6a47c>
   11d70:      	mov	x25, x0
   11d74:      	mov	x0, #0x0                ; =0
   11d78:      	mov	w1, #0x8                ; =8
   11d7c:      	bl	0x6a47c <_xdotBB+0x6a47c>
   11d80:      	mov	x24, x0
   11d84:      	mov	w23, #0x0               ; =0
   11d88:      	b	0x12498 <_conjugate_gradient_d+0xb24>
   11d8c:      	and	x8, x24, #0x7ffffff8
   11d90:      	add	x9, x15, #0x20
   11d94:      	add	x10, x22, #0x20
   11d98:      	add	x11, x19, #0x20
   11d9c:      	mov	x12, x8
   11da0:      	ldp	q0, q1, [x9, #-0x20]
   11da4:      	ldp	q2, q3, [x9], #0x40
   11da8:      	ldp	q4, q5, [x10, #-0x20]
   11dac:      	ldp	q6, q7, [x10], #0x40
   11db0:      	fsub.2d	v0, v0, v4
   11db4:      	fsub.2d	v1, v1, v5
   11db8:      	fsub.2d	v2, v2, v6
   11dbc:      	fsub.2d	v3, v3, v7
   11dc0:      	stp	q0, q1, [x11, #-0x20]
   11dc4:      	stp	q2, q3, [x11], #0x40
   11dc8:      	subs	x12, x12, #0x8
   11dcc:      	b.ne	0x11da0 <_conjugate_gradient_d+0x42c>
   11dd0:      	cmp	x8, x24
   11dd4:      	b.eq	0x11e04 <_conjugate_gradient_d+0x490>
   11dd8:      	sub	x9, x24, x8
   11ddc:      	lsl	x11, x8, #3
   11de0:      	add	x8, x19, x11
   11de4:      	add	x10, x22, x11
   11de8:      	add	x11, x15, x11
   11dec:      	ldr	d0, [x11], #0x8
   11df0:      	ldr	d1, [x10], #0x8
   11df4:      	fsub	d0, d0, d1
   11df8:      	str	d0, [x8], #0x8
   11dfc:      	subs	x9, x9, #0x1
   11e00:      	b.ne	0x11dec <_conjugate_gradient_d+0x478>
   11e04:      	mov	x0, x20
   11e08:      	mov	x1, x19
   11e0c:      	mov	x2, x23
   11e10:      	bl	0x6a86c <_xdotBB+0x6a86c>
   11e14:      	cmp	w26, #0x4
   11e18:      	b.hs	0x11e2c <_conjugate_gradient_d+0x4b8>
   11e1c:      	mov	x8, #0x0                ; =0
   11e20:      	movi.2d	v2, #0000000000000000
   11e24:      	ldr	w4, [sp, #0x24]
   11e28:      	b	0x11e80 <_conjugate_gradient_d+0x50c>
   11e2c:      	and	x8, x24, #0x7ffffffc
   11e30:      	movi.2d	v2, #0000000000000000
   11e34:      	mov	x9, x8
   11e38:      	mov	x10, x19
   11e3c:      	ldr	w4, [sp, #0x24]
   11e40:      	ldr	d0, [x10]
   11e44:      	ldr	d1, [x10, #0x18]
   11e48:      	fmul	d0, d0, d0
   11e4c:      	ldur	q3, [x10, #0x8]
   11e50:      	fmul.2d	v3, v3, v3
   11e54:      	fmul	d1, d1, d1
   11e58:      	fadd	d0, d2, d0
   11e5c:      	fadd	d0, d0, d3
   11e60:      	mov	d2, v3[1]
   11e64:      	fadd	d0, d0, d2
   11e68:      	fadd	d2, d0, d1
   11e6c:      	add	x10, x10, #0x20
   11e70:      	subs	x9, x9, #0x4
   11e74:      	b.ne	0x11e40 <_conjugate_gradient_d+0x4cc>
   11e78:      	cmp	x8, x24
   11e7c:      	b.eq	0x11e98 <_conjugate_gradient_d+0x524>
   11e80:      	sub	x9, x24, x8
   11e84:      	add	x8, x19, x8, lsl #3
   11e88:      	ldr	d0, [x8], #0x8
   11e8c:      	fmadd	d2, d0, d0, d2
   11e90:      	subs	x9, x9, #0x1
   11e94:      	b.ne	0x11e88 <_conjugate_gradient_d+0x514>
   11e98:      	cmp	w4, #0x0
   11e9c:      	b.le	0x12490 <_conjugate_gradient_d+0xb1c>
   11ea0:      	mov	w8, #0x0                ; =0
   11ea4:      	sub	w9, w4, #0x1
   11ea8:      	and	x10, x24, #0x7ffffff8
   11eac:      	add	x11, x19, #0x20
   11eb0:      	add	x12, x20, #0x20
   11eb4:      	add	x13, x21, #0x20
   11eb8:      	add	x14, x25, #0x20
   11ebc:      	add	x15, x27, #0x20
   11ec0:      	mov	x16, #0x649a            ; =25754
   11ec4:      	movk	x16, #0xc57e, lsl #16
   11ec8:      	movk	x16, #0x1b0e, lsl #32
   11ecc:      	movk	x16, #0xca51, lsl #48
   11ed0:      	adrp	x17, 0x6a000 <_Multilevel_establish+0xa4c>
   11ed4:      	ldr	q0, [x17, #0xb10]
   11ed8:      	fmov	d1, x16
   11edc:      	b	0x11ef0 <_conjugate_gradient_d+0x57c>
   11ee0:      	mov.16b	v2, v3
   11ee4:      	add	w8, w8, #0x1
   11ee8:      	cmp	w8, w4
   11eec:      	b.eq	0x12490 <_conjugate_gradient_d+0xb1c>
   11ef0:      	cmp	w26, #0x8
   11ef4:      	b.hs	0x11f20 <_conjugate_gradient_d+0x5ac>
   11ef8:      	mov	x17, #0x0               ; =0
   11efc:      	mov.16b	v3, v1
   11f00:      	sub	x0, x24, x17
   11f04:      	add	x17, x19, x17, lsl #3
   11f08:      	ldr	d4, [x17], #0x8
   11f0c:      	fabs	d4, d4
   11f10:      	fmaxnm	d3, d3, d4
   11f14:      	subs	x0, x0, #0x1
   11f18:      	b.ne	0x11f08 <_conjugate_gradient_d+0x594>
   11f1c:      	b	0x1200c <_conjugate_gradient_d+0x698>
   11f20:      	mov	x17, x11
   11f24:      	dup.2d	v7, x16
   11f28:      	mov	w0, #0x8                ; =8
   11f2c:      	mov.16b	v16, v7
   11f30:      	mov.16b	v17, v7
   11f34:      	mov.16b	v18, v7
   11f38:      	mov.16b	v3, v18
   11f3c:      	mov.16b	v4, v17
   11f40:      	mov.16b	v5, v16
   11f44:      	mov.16b	v6, v7
   11f48:      	ldp	q19, q20, [x17, #-0x20]
   11f4c:      	ldp	q21, q22, [x17], #0x40
   11f50:      	fabs.2d	v7, v19
   11f54:      	fabs.2d	v16, v20
   11f58:      	fabs.2d	v17, v21
   11f5c:      	fabs.2d	v18, v22
   11f60:      	fmaxnm.2d	v7, v6, v7
   11f64:      	fmaxnm.2d	v16, v5, v16
   11f68:      	fmaxnm.2d	v17, v4, v17
   11f6c:      	fmaxnm.2d	v18, v3, v18
   11f70:      	fcmge.2d	v23, v19, v20
   11f74:      	fcmgt.2d	v19, v20, v19
   11f78:      	orr.16b	v19, v19, v23
   11f7c:      	mvn.16b	v19, v19
   11f80:      	fcmge.2d	v20, v22, v21
   11f84:      	fcmgt.2d	v21, v21, v22
   11f88:      	orr.16b	v20, v21, v20
   11f8c:      	orn.16b	v19, v19, v20
   11f90:      	xtn.2s	v20, v19
   11f94:      	umaxp.2s	v20, v20, v20
   11f98:      	fmov	w2, s20
   11f9c:      	sub	x1, x0, #0x8
   11fa0:      	tbnz	w2, #0x0, 0x11fb4 <_conjugate_gradient_d+0x640>
   11fa4:      	add	x2, x10, x0
   11fa8:      	mov	x0, x1
   11fac:      	cmp	x2, #0x10
   11fb0:      	b.ne	0x11f38 <_conjugate_gradient_d+0x5c4>
   11fb4:      	and.16b	v19, v19, v0
   11fb8:      	addp.2d	d19, v19
   11fbc:      	fmov	w0, s19
   11fc0:      	tst	w0, #0x3
   11fc4:      	cset	w17, ne
   11fc8:      	dup.2s	v19, w17
   11fcc:      	ushll.2d	v19, v19, #0x0
   11fd0:      	shl.2d	v19, v19, #0x3f
   11fd4:      	cmlt.2d	v19, v19, #0
   11fd8:      	bif.16b	v6, v7, v19
   11fdc:      	bif.16b	v5, v16, v19
   11fe0:      	bif.16b	v4, v17, v19
   11fe4:      	bif.16b	v3, v18, v19
   11fe8:      	csneg	x17, x10, x1, eq
   11fec:      	fmaxnm.2d	v5, v6, v5
   11ff0:      	fmaxnm.2d	v4, v5, v4
   11ff4:      	fmaxnm.2d	v3, v4, v3
   11ff8:      	fmaxnmp.2d	d3, v3
   11ffc:      	cmp	x10, x24
   12000:      	b.ne	0x11f00 <_conjugate_gradient_d+0x58c>
   12004:      	tst	w0, #0x3
   12008:      	b.ne	0x11f00 <_conjugate_gradient_d+0x58c>
   1200c:      	fcmp	d3, d8
   12010:      	b.le	0x12490 <_conjugate_gradient_d+0xb1c>
   12014:      	mov	x17, #0x0               ; =0
   12018:      	b	0x1202c <_conjugate_gradient_d+0x6b8>
   1201c:      	str	d3, [x21, x17, lsl #3]
   12020:      	add	x17, x17, #0x1
   12024:      	cmp	x17, x24
   12028:      	b.eq	0x120e0 <_conjugate_gradient_d+0x76c>
   1202c:      	ldr	x0, [x28, x17, lsl #3]
   12030:      	cmp	w26, #0x8
   12034:      	b.hs	0x12044 <_conjugate_gradient_d+0x6d0>
   12038:      	mov	x2, #0x0                ; =0
   1203c:      	movi.2d	v3, #0000000000000000
   12040:      	b	0x120b8 <_conjugate_gradient_d+0x744>
   12044:      	add	x1, x0, #0x20
   12048:      	movi.2d	v3, #0000000000000000
   1204c:      	mov	x2, x12
   12050:      	mov	x3, x10
   12054:      	ldp	q4, q5, [x1, #-0x20]
   12058:      	ldp	q6, q7, [x1], #0x40
   1205c:      	ldp	q16, q17, [x2, #-0x20]
   12060:      	ldp	q18, q19, [x2], #0x40
   12064:      	fmul.2d	v4, v4, v16
   12068:      	mov	d16, v4[1]
   1206c:      	fmul.2d	v5, v5, v17
   12070:      	mov	d17, v5[1]
   12074:      	fmul.2d	v6, v6, v18
   12078:      	mov	d18, v6[1]
   1207c:      	fmul.2d	v7, v7, v19
   12080:      	mov	d19, v7[1]
   12084:      	fadd	d3, d3, d4
   12088:      	fadd	d3, d3, d16
   1208c:      	fadd	d3, d3, d5
   12090:      	fadd	d3, d3, d17
   12094:      	fadd	d3, d3, d6
   12098:      	fadd	d3, d3, d18
   1209c:      	fadd	d3, d3, d7
   120a0:      	fadd	d3, d3, d19
   120a4:      	subs	x3, x3, #0x8
   120a8:      	b.ne	0x12054 <_conjugate_gradient_d+0x6e0>
   120ac:      	mov	x2, x10
   120b0:      	cmp	x10, x24
   120b4:      	b.eq	0x1201c <_conjugate_gradient_d+0x6a8>
   120b8:      	sub	x1, x24, x2
   120bc:      	lsl	x3, x2, #3
   120c0:      	add	x2, x20, x3
   120c4:      	add	x0, x0, x3
   120c8:      	ldr	d4, [x0], #0x8
   120cc:      	ldr	d5, [x2], #0x8
   120d0:      	fmadd	d3, d4, d5, d3
   120d4:      	subs	x1, x1, #0x1
   120d8:      	b.ne	0x120c8 <_conjugate_gradient_d+0x754>
   120dc:      	b	0x1201c <_conjugate_gradient_d+0x6a8>
   120e0:      	cmp	w26, #0x8
   120e4:      	b.hs	0x120f4 <_conjugate_gradient_d+0x780>
   120e8:      	mov	x0, #0x0                ; =0
   120ec:      	movi.2d	v3, #0000000000000000
   120f0:      	b	0x12168 <_conjugate_gradient_d+0x7f4>
   120f4:      	movi.2d	v3, #0000000000000000
   120f8:      	mov	x17, x13
   120fc:      	mov	x0, x12
   12100:      	mov	x1, x10
   12104:      	ldp	q4, q5, [x0, #-0x20]
   12108:      	ldp	q6, q7, [x0], #0x40
   1210c:      	ldp	q16, q17, [x17, #-0x20]
   12110:      	ldp	q18, q19, [x17], #0x40
   12114:      	fmul.2d	v4, v4, v16
   12118:      	mov	d16, v4[1]
   1211c:      	fmul.2d	v5, v5, v17
   12120:      	mov	d17, v5[1]
   12124:      	fmul.2d	v6, v6, v18
   12128:      	mov	d18, v6[1]
   1212c:      	fmul.2d	v7, v7, v19
   12130:      	mov	d19, v7[1]
   12134:      	fadd	d3, d3, d4
   12138:      	fadd	d3, d3, d16
   1213c:      	fadd	d3, d3, d5
   12140:      	fadd	d3, d3, d17
   12144:      	fadd	d3, d3, d6
   12148:      	fadd	d3, d3, d18
   1214c:      	fadd	d3, d3, d7
   12150:      	fadd	d3, d3, d19
   12154:      	subs	x1, x1, #0x8
   12158:      	b.ne	0x12104 <_conjugate_gradient_d+0x790>
   1215c:      	mov	x0, x10
   12160:      	cmp	x10, x24
   12164:      	b.eq	0x1218c <_conjugate_gradient_d+0x818>
   12168:      	sub	x17, x24, x0
   1216c:      	lsl	x1, x0, #3
   12170:      	add	x0, x21, x1
   12174:      	add	x1, x20, x1
   12178:      	ldr	d4, [x1], #0x8
   1217c:      	ldr	d5, [x0], #0x8
   12180:      	fmadd	d3, d4, d5, d3
   12184:      	subs	x17, x17, #0x1
   12188:      	b.ne	0x12178 <_conjugate_gradient_d+0x804>
   1218c:      	fcmp	d3, #0.0
   12190:      	b.eq	0x12490 <_conjugate_gradient_d+0xb1c>
   12194:      	fdiv	d3, d2, d3
   12198:      	cmp	w26, #0x8
   1219c:      	b.hs	0x121a8 <_conjugate_gradient_d+0x834>
   121a0:      	mov	x0, #0x0                ; =0
   121a4:      	b	0x121e8 <_conjugate_gradient_d+0x874>
   121a8:      	mov	x17, x14
   121ac:      	mov	x0, x12
   121b0:      	mov	x1, x10
   121b4:      	ldp	q4, q5, [x0, #-0x20]
   121b8:      	ldp	q6, q7, [x0], #0x40
   121bc:      	fmul.2d	v4, v4, v3[0]
   121c0:      	fmul.2d	v5, v5, v3[0]
   121c4:      	fmul.2d	v6, v6, v3[0]
   121c8:      	fmul.2d	v7, v7, v3[0]
   121cc:      	stp	q4, q5, [x17, #-0x20]
   121d0:      	stp	q6, q7, [x17], #0x40
   121d4:      	subs	x1, x1, #0x8
   121d8:      	b.ne	0x121b4 <_conjugate_gradient_d+0x840>
   121dc:      	mov	x0, x10
   121e0:      	cmp	x10, x24
   121e4:      	b.eq	0x1220c <_conjugate_gradient_d+0x898>
   121e8:      	sub	x17, x24, x0
   121ec:      	lsl	x1, x0, #3
   121f0:      	add	x0, x25, x1
   121f4:      	add	x1, x20, x1
   121f8:      	ldr	d4, [x1], #0x8
   121fc:      	fmul	d4, d3, d4
   12200:      	str	d4, [x0], #0x8
   12204:      	subs	x17, x17, #0x1
   12208:      	b.ne	0x121f8 <_conjugate_gradient_d+0x884>
   1220c:      	cmp	w26, #0x8
   12210:      	b.hs	0x1221c <_conjugate_gradient_d+0x8a8>
   12214:      	mov	x0, #0x0                ; =0
   12218:      	b	0x12264 <_conjugate_gradient_d+0x8f0>
   1221c:      	mov	x17, x14
   12220:      	mov	x0, x15
   12224:      	mov	x1, x10
   12228:      	ldp	q4, q5, [x0, #-0x20]
   1222c:      	ldp	q6, q7, [x0]
   12230:      	ldp	q16, q17, [x17, #-0x20]
   12234:      	ldp	q18, q19, [x17], #0x40
   12238:      	fadd.2d	v4, v4, v16
   1223c:      	fadd.2d	v5, v5, v17
   12240:      	fadd.2d	v6, v6, v18
   12244:      	fadd.2d	v7, v7, v19
   12248:      	stp	q4, q5, [x0, #-0x20]
   1224c:      	stp	q6, q7, [x0], #0x40
   12250:      	subs	x1, x1, #0x8
   12254:      	b.ne	0x12228 <_conjugate_gradient_d+0x8b4>
   12258:      	mov	x0, x10
   1225c:      	cmp	x10, x24
   12260:      	b.eq	0x1228c <_conjugate_gradient_d+0x918>
   12264:      	sub	x17, x24, x0
   12268:      	lsl	x1, x0, #3
   1226c:      	add	x0, x25, x1
   12270:      	add	x1, x27, x1
   12274:      	ldr	d4, [x1]
   12278:      	ldr	d5, [x0], #0x8
   1227c:      	fadd	d4, d4, d5
   12280:      	str	d4, [x1], #0x8
   12284:      	subs	x17, x17, #0x1
   12288:      	b.ne	0x12274 <_conjugate_gradient_d+0x900>
   1228c:      	cmp	w8, w9
   12290:      	b.ge	0x11ee4 <_conjugate_gradient_d+0x570>
   12294:      	cmp	w26, #0x8
   12298:      	b.hs	0x122a4 <_conjugate_gradient_d+0x930>
   1229c:      	mov	x0, #0x0                ; =0
   122a0:      	b	0x122e0 <_conjugate_gradient_d+0x96c>
   122a4:      	mov	x17, x13
   122a8:      	mov	x0, x10
   122ac:      	ldp	q4, q5, [x17, #-0x20]
   122b0:      	ldp	q6, q7, [x17]
   122b4:      	fmul.2d	v4, v4, v3[0]
   122b8:      	fmul.2d	v5, v5, v3[0]
   122bc:      	fmul.2d	v6, v6, v3[0]
   122c0:      	fmul.2d	v7, v7, v3[0]
   122c4:      	stp	q4, q5, [x17, #-0x20]
   122c8:      	stp	q6, q7, [x17], #0x40
   122cc:      	subs	x0, x0, #0x8
   122d0:      	b.ne	0x122ac <_conjugate_gradient_d+0x938>
   122d4:      	mov	x0, x10
   122d8:      	cmp	x10, x24
   122dc:      	b.eq	0x122fc <_conjugate_gradient_d+0x988>
   122e0:      	sub	x17, x24, x0
   122e4:      	add	x0, x21, x0, lsl #3
   122e8:      	ldr	d4, [x0]
   122ec:      	fmul	d4, d3, d4
   122f0:      	str	d4, [x0], #0x8
   122f4:      	subs	x17, x17, #0x1
   122f8:      	b.ne	0x122e8 <_conjugate_gradient_d+0x974>
   122fc:      	cmp	w26, #0x8
   12300:      	b.hs	0x1230c <_conjugate_gradient_d+0x998>
   12304:      	mov	x0, #0x0                ; =0
   12308:      	b	0x12354 <_conjugate_gradient_d+0x9e0>
   1230c:      	mov	x17, x13
   12310:      	mov	x0, x11
   12314:      	mov	x1, x10
   12318:      	ldp	q3, q4, [x0, #-0x20]
   1231c:      	ldp	q5, q6, [x0]
   12320:      	ldp	q7, q16, [x17, #-0x20]
   12324:      	ldp	q17, q18, [x17], #0x40
   12328:      	fsub.2d	v3, v3, v7
   1232c:      	fsub.2d	v4, v4, v16
   12330:      	fsub.2d	v5, v5, v17
   12334:      	fsub.2d	v6, v6, v18
   12338:      	stp	q3, q4, [x0, #-0x20]
   1233c:      	stp	q5, q6, [x0], #0x40
   12340:      	subs	x1, x1, #0x8
   12344:      	b.ne	0x12318 <_conjugate_gradient_d+0x9a4>
   12348:      	mov	x0, x10
   1234c:      	cmp	x10, x24
   12350:      	b.eq	0x1237c <_conjugate_gradient_d+0xa08>
   12354:      	sub	x17, x24, x0
   12358:      	lsl	x1, x0, #3
   1235c:      	add	x0, x21, x1
   12360:      	add	x1, x19, x1
   12364:      	ldr	d3, [x1]
   12368:      	ldr	d4, [x0], #0x8
   1236c:      	fsub	d3, d3, d4
   12370:      	str	d3, [x1], #0x8
   12374:      	subs	x17, x17, #0x1
   12378:      	b.ne	0x12364 <_conjugate_gradient_d+0x9f0>
   1237c:      	mov	x17, #0x0               ; =0
   12380:      	movi.2d	v3, #0000000000000000
   12384:      	ldr	d4, [x19, x17, lsl #3]
   12388:      	fmadd	d3, d4, d4, d3
   1238c:      	add	x17, x17, #0x1
   12390:      	cmp	x24, x17
   12394:      	b.ne	0x12384 <_conjugate_gradient_d+0xa10>
   12398:      	fcmp	d2, #0.0
   1239c:      	b.eq	0x124f0 <_conjugate_gradient_d+0xb7c>
   123a0:      	fdiv	d2, d3, d2
   123a4:      	cmp	w26, #0x8
   123a8:      	b.hs	0x123b4 <_conjugate_gradient_d+0xa40>
   123ac:      	mov	x0, #0x0                ; =0
   123b0:      	b	0x123f0 <_conjugate_gradient_d+0xa7c>
   123b4:      	mov	x17, x12
   123b8:      	mov	x0, x10
   123bc:      	ldp	q4, q5, [x17, #-0x20]
   123c0:      	ldp	q6, q7, [x17]
   123c4:      	fmul.2d	v4, v4, v2[0]
   123c8:      	fmul.2d	v5, v5, v2[0]
   123cc:      	fmul.2d	v6, v6, v2[0]
   123d0:      	fmul.2d	v7, v7, v2[0]
   123d4:      	stp	q4, q5, [x17, #-0x20]
   123d8:      	stp	q6, q7, [x17], #0x40
   123dc:      	subs	x0, x0, #0x8
   123e0:      	b.ne	0x123bc <_conjugate_gradient_d+0xa48>
   123e4:      	mov	x0, x10
   123e8:      	cmp	x10, x24
   123ec:      	b.eq	0x1240c <_conjugate_gradient_d+0xa98>
   123f0:      	sub	x17, x24, x0
   123f4:      	add	x0, x20, x0, lsl #3
   123f8:      	ldr	d4, [x0]
   123fc:      	fmul	d4, d2, d4
   12400:      	str	d4, [x0], #0x8
   12404:      	subs	x17, x17, #0x1
   12408:      	b.ne	0x123f8 <_conjugate_gradient_d+0xa84>
   1240c:      	cmp	w26, #0x8
   12410:      	b.hs	0x1241c <_conjugate_gradient_d+0xaa8>
   12414:      	mov	x0, #0x0                ; =0
   12418:      	b	0x12464 <_conjugate_gradient_d+0xaf0>
   1241c:      	mov	x17, x12
   12420:      	mov	x0, x11
   12424:      	mov	x1, x10
   12428:      	ldp	q2, q4, [x0, #-0x20]
   1242c:      	ldp	q5, q6, [x0], #0x40
   12430:      	ldp	q7, q16, [x17, #-0x20]
   12434:      	ldp	q17, q18, [x17]
   12438:      	fadd.2d	v2, v2, v7
   1243c:      	fadd.2d	v4, v4, v16
   12440:      	fadd.2d	v5, v5, v17
   12444:      	fadd.2d	v6, v6, v18
   12448:      	stp	q2, q4, [x17, #-0x20]
   1244c:      	stp	q5, q6, [x17], #0x40
   12450:      	subs	x1, x1, #0x8
   12454:      	b.ne	0x12428 <_conjugate_gradient_d+0xab4>
   12458:      	mov	x0, x10
   1245c:      	cmp	x10, x24
   12460:      	b.eq	0x11ee0 <_conjugate_gradient_d+0x56c>
   12464:      	sub	x17, x24, x0
   12468:      	lsl	x1, x0, #3
   1246c:      	add	x0, x20, x1
   12470:      	add	x1, x19, x1
   12474:      	ldr	d2, [x1], #0x8
   12478:      	ldr	d4, [x0]
   1247c:      	fadd	d2, d2, d4
   12480:      	str	d2, [x0], #0x8
   12484:      	subs	x17, x17, #0x1
   12488:      	b.ne	0x12474 <_conjugate_gradient_d+0xb00>
   1248c:      	b	0x11ee0 <_conjugate_gradient_d+0x56c>
   12490:      	mov	w23, #0x0               ; =0
   12494:      	ldr	x24, [sp, #0x28]
   12498:      	mov	x0, x19
   1249c:      	bl	0x6a584 <_xdotBB+0x6a584>
   124a0:      	mov	x0, x20
   124a4:      	bl	0x6a584 <_xdotBB+0x6a584>
   124a8:      	mov	x0, x21
   124ac:      	bl	0x6a584 <_xdotBB+0x6a584>
   124b0:      	mov	x0, x22
   124b4:      	bl	0x6a584 <_xdotBB+0x6a584>
   124b8:      	mov	x0, x25
   124bc:      	bl	0x6a584 <_xdotBB+0x6a584>
   124c0:      	mov	x0, x24
   124c4:      	bl	0x6a584 <_xdotBB+0x6a584>
   124c8:      	mov	x0, x23
   124cc:      	ldp	x29, x30, [sp, #0x90]
   124d0:      	ldp	x20, x19, [sp, #0x80]
   124d4:      	ldp	x22, x21, [sp, #0x70]
   124d8:      	ldp	x24, x23, [sp, #0x60]
   124dc:      	ldp	x26, x25, [sp, #0x50]
   124e0:      	ldp	x28, x27, [sp, #0x40]
   124e4:      	ldp	d9, d8, [sp, #0x30]
   124e8:      	add	sp, sp, #0xa0
   124ec:      	ret
   124f0:      	adrp	x0, 0x6b000 <_.str.2+0x34>
   124f4:      	add	x0, x0, #0x62b
   124f8:      	bl	0x6a2b4 <_xdotBB+0x6a2b4>
   124fc:      	mov	w23, #0x1               ; =1
   12500:      	b	0x12494 <_conjugate_gradient_d+0xb20>
   12504:      	adrp	x8, 0x70000 <_adjustMode>
   12508:      	ldr	x8, [x8, #0x308]
   1250c:      	ldr	x0, [x8]
   12510:      	lsl	x8, x24, #3
   12514:      	str	x8, [sp]
   12518:      	adrp	x1, 0x6a000 <_Multilevel_establish+0xa4c>
   1251c:      	add	x1, x1, #0xd40
   12520:      	bl	0x6a560 <_xdotBB+0x6a560>
   12524:      	bl	0x6a04c <_graphviz_exit>
   12528:      	adrp	x8, 0x70000 <_adjustMode>
   1252c:      	ldr	x8, [x8, #0x308]
   12530:      	ldr	x0, [x8]
   12534:      	mov	w8, #0x8                ; =8
   12538:      	stp	x24, x8, [sp]
   1253c:      	adrp	x1, 0x6a000 <_Multilevel_establish+0xa4c>
   12540:      	add	x1, x1, #0xdfe
   12544:      	bl	0x6a560 <_xdotBB+0x6a560>
   12548:      	bl	0x6a04c <_graphviz_exit>
