   2df90:      	cbz	w3, 0x2e0f0 <_IMDS_given_dim+0x14e0>
   2df94:      	mov	x8, #0x0                ; =0
   2df98:      	mov	w24, w3
   2df9c:      	b	0x2dfac <_IMDS_given_dim+0x139c>
   2dfa0:      	add	x8, x8, #0x1
   2dfa4:      	cmp	x8, x24
   2dfa8:      	b.eq	0x2e008 <_IMDS_given_dim+0x13f8>
   2dfac:      	mov	x9, #0x0                ; =0
   2dfb0:      	ldr	d0, [x22, x8, lsl #3]
   2dfb4:      	str	xzr, [x20, x8, lsl #3]
   2dfb8:      	movi.2d	v1, #0000000000000000
   2dfbc:      	b	0x2dfcc <_IMDS_given_dim+0x13bc>
   2dfc0:      	add	x9, x9, #0x1
   2dfc4:      	cmp	x24, x9
   2dfc8:      	b.eq	0x2dfa0 <_IMDS_given_dim+0x1390>
   2dfcc:      	cmp	x8, x9
   2dfd0:      	b.eq	0x2dfc0 <_IMDS_given_dim+0x13b0>
   2dfd4:      	ldr	d2, [x22, x9, lsl #3]
   2dfd8:      	ldr	x10, [x21, x8, lsl #3]
   2dfdc:      	ldr	s3, [x10, x9, lsl #2]
   2dfe0:      	sshll.2d	v3, v3, #0x0
   2dfe4:      	scvtf	d3, d3
   2dfe8:      	ldr	x10, [x19, x8, lsl #3]
   2dfec:      	ldr	d4, [x10, x9, lsl #3]
   2dff0:      	fneg	d5, d4
   2dff4:      	fcmp	d0, d2
   2dff8:      	fcsel	d2, d4, d5, lt
   2dffc:      	fmadd	d1, d3, d2, d1
   2e000:      	str	d1, [x20, x8, lsl #3]
   2e004:      	b	0x2dfc0 <_IMDS_given_dim+0x13b0>
   2e008:      	mov	w26, #0x0               ; =0
   2e00c:      	fmov	d9, #1.00000000
   2e010:      	mov	x8, #0x68f1             ; =26865
   2e014:      	movk	x8, #0x88e3, lsl #16
   2e018:      	movk	x8, #0xf8b5, lsl #32
   2e01c:      	movk	x8, #0x3ee4, lsl #48
   2e020:      	fmov	d10, x8
   2e024:      	b	0x2e03c <_IMDS_given_dim+0x142c>
   2e028:      	cmp	w26, #0xc6
   2e02c:      	add	w26, w26, #0x1
   2e030:      	cset	w9, hi
   2e034:      	orr	w8, w9, w8
   2e038:      	tbnz	w8, #0x0, 0x2e210 <_IMDS_given_dim+0x1600>
   2e03c:      	mov	w25, #0x1               ; =1
   2e040:      	mov	x0, x19
   2e044:      	mov	x1, x22
   2e048:      	mov	x2, x20
   2e04c:      	mov.16b	v0, v8
   2e050:      	mov	x4, x3
   2e054:      	mov	w5, #0x1                ; =1
   2e058:      	bl	0x11974 <_conjugate_gradient_d>
   2e05c:      	tbnz	w0, #0x1f, 0x2e284 <_IMDS_given_dim+0x1674>
   2e060:      	mov	x9, #0x0                ; =0
   2e064:      	mov	w8, #0x1                ; =1
   2e068:      	ldur	x3, [x29, #-0x80]
   2e06c:      	b	0x2e07c <_IMDS_given_dim+0x146c>
   2e070:      	add	x9, x9, #0x1
   2e074:      	cmp	x9, x24
   2e078:      	b.eq	0x2e028 <_IMDS_given_dim+0x1418>
   2e07c:      	mov	x10, #0x0               ; =0
   2e080:      	ldr	d1, [x22, x9, lsl #3]
   2e084:      	movi.2d	v0, #0000000000000000
   2e088:      	b	0x2e09c <_IMDS_given_dim+0x148c>
   2e08c:      	fmadd	d0, d2, d3, d0
   2e090:      	add	x10, x10, #0x1
   2e094:      	cmp	x24, x10
   2e098:      	b.eq	0x2e0d0 <_IMDS_given_dim+0x14c0>
   2e09c:      	cmp	x9, x10
   2e0a0:      	b.eq	0x2e090 <_IMDS_given_dim+0x1480>
   2e0a4:      	ldr	d4, [x22, x10, lsl #3]
   2e0a8:      	ldr	x11, [x21, x9, lsl #3]
   2e0ac:      	ldr	s2, [x11, x10, lsl #2]
   2e0b0:      	sshll.2d	v2, v2, #0x0
   2e0b4:      	scvtf	d2, d2
   2e0b8:      	ldr	x11, [x19, x9, lsl #3]
   2e0bc:      	ldr	d3, [x11, x10, lsl #3]
   2e0c0:      	fcmp	d1, d4
   2e0c4:      	b.lt	0x2e08c <_IMDS_given_dim+0x147c>
   2e0c8:      	fmsub	d0, d2, d3, d0
   2e0cc:      	b	0x2e090 <_IMDS_given_dim+0x1480>
   2e0d0:      	ldr	d1, [x20, x9, lsl #3]
   2e0d4:      	fdiv	d1, d0, d1
   2e0d8:      	fabd	d1, d9, d1
   2e0dc:      	fcmp	d1, d10
   2e0e0:      	b.le	0x2e070 <_IMDS_given_dim+0x1460>
   2e0e4:      	mov	w8, #0x0                ; =0
   2e0e8:      	str	d0, [x20, x9, lsl #3]
   2e0ec:      	b	0x2e070 <_IMDS_given_dim+0x1460>
   2e0f0:      	mov	x0, x19
   2e0f4:      	mov	x1, x22
   2e0f8:      	mov	x2, x20
