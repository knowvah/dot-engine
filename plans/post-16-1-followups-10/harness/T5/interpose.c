// SPDX-License-Identifier: EPL-2.0
// DYLD interposer: logs agstrcanon's return value and agstrfree's effect on one UTF-8 label.
#include <cgraph.h>
#include <stdio.h>
#include <string.h>
#define INTERPOSE(r, o) __attribute__((used)) static struct { const void *r; const void *o; } _ip_##o __attribute__((section("__DATA,__interpose"))) = { (const void *)(unsigned long)&r, (const void *)(unsigned long)&o }
extern char *agstrcanon(char *, char *);
static int hit(const char *s) { if (!s) return 0; for (int i = 0; i < 24 && s[i]; i++) if ((unsigned char)s[i] == 0xc3) return 1; return 0; }
static void hex(const char *tag, const char *s) {
  fprintf(stderr, "%s", tag);
  for (int i = 0; i < 16; i++) fprintf(stderr, " %02x", (unsigned char)s[i]);
  fputc('\n', stderr);
}
static int render_no;
static char *my_agstrcanon(char *arg, char *buf) {
  int h = hit(arg);
  char *r = agstrcanon(arg, buf);
  if (h) { fprintf(stderr, "canon arg=%p buf=%p ret=%p ret==arg:%d ", (void *)arg, (void *)buf, (void *)r, r == arg); hex("bytes", arg); }
  return r;
}
static int my_agstrfree(Agraph_t *g, const char *s, _Bool is_html) {
  int h = hit(s);
  char sv[17]; if (h) memcpy(sv, s, 16);
  int rc = agstrfree(g, s, is_html);
  if (h) { fprintf(stderr, "free   s=%p rc=%d ", (void *)s, rc); hex("after", s); }
  return rc;
}
INTERPOSE(my_agstrcanon, agstrcanon);
INTERPOSE(my_agstrfree, agstrfree);
