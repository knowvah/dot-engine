// SPDX-License-Identifier: EPL-2.0
// Native control for issue 37: layout, render, gvFreeLayout twice on one graph.
// usage: GVBINDIR=<full plugin dir> twice-native <file> <engine> <format> [print|nofree|<n>]
//   no 4th arg: prints SAME or DIFF, comparing render 1 with render 2.
//   print:      prints both renders, each after a "== render N" line.
//   nofree:     as print, with no gvFreeLayout between the layouts.
//   <n>:        as print, with n renders (a number, 1..9).
//   then:<e>:   as print, render 2 uses engine <e>.
//   fresh:      as print, render 2 runs on a new agmemread graph in the same process. A difference
//               here is process-global state, not the graph's records.
//   nobb:       as print, clears gvLayout's `bb` write-back before layout 2.
//   restore:    as print, puts every attribute back to its pre-layout value before layout 2, so the
//               records are the only difference from a fresh graph. Attributes the first cycle
//               declared stay declared, with an empty value.
//   keep:<a>:   as restore, except that attribute <a> keeps the value the first cycle wrote.
//   seq:<ops>:  comma-separated script on one graph: l = gvLayout, f = gvFreeLayout, r = srand(1) and
//               srand48(0), the state a new process starts with, so a difference that goes is
//               process-global state and not the graph's; anything else
//               is a format to render and print, e.g. seq:l,xdot,svg,f,l,plain,f.
//   transplant:<path>: one <fmt> cycle, then writes every attribute value to <path>, one per
//               line as kind index name length value.
//   graft:<path>: sets those values on a newly parsed graph, then one cycle in <fmt>. This is native's
//               second layout with the attributes and no process-global state: run it in a new process.
//   members:    prints each subgraph's node and edge counts before and after one cycle, then the
//               subgraphs the cycle added: what the object tables, not the records, carry over.
// Copy this file and twice-matrix.mjs to a scratch dir, because the runner writes its job file beside
// itself, then build there, with G=~/git/graphviz and B=$G/build:
//   clang -O1 -o twice-native twice.c -I$G/lib/gvc -I$G/lib/cgraph -I$G/lib/common -I$G/lib/pathplan \
//     -I$G/lib/cdt -I$G/lib -I$B -I$B/lib/common -I$B/lib/gvc -L$B/lib/gvc -L$B/lib/cgraph -L$B/lib/cdt \
//     -lgvc -lcgraph -lcdt -Wl,-rpath,$B/lib/gvc -Wl,-rpath,$B/lib/cgraph -Wl,-rpath,$B/lib/cdt \
//     -Wl,-rpath,$B/lib/pathplan -Wl,-rpath,$B/lib/xdot
#include <gvc.h>
#include <cgraph.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static char *slurp(const char *p) { FILE *f = fopen(p, "rb"); if (!f) return NULL; fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET); char *b = malloc((size_t)n + 1); fread(b, 1, (size_t)n, f); b[n] = 0; fclose(f); return b; }
// One value per object per symbol; a pre-layout snapshot of the attribute tables.
typedef struct { void *obj; int kind; char *name; char *value; } saved_t;
static saved_t *saved; static size_t nsaved;
static void save_obj(void *obj, int kind, Agraph_t *g) {
  for (Agsym_t *sym = agnxtattr(g, kind, NULL); sym; sym = agnxtattr(g, kind, sym)) {
    saved = realloc(saved, (nsaved + 1) * sizeof *saved);
    saved[nsaved++] = (saved_t){obj, kind, sym->name, strdup(agxget(obj, sym))};
  }
}
static void save_graph(Agraph_t *g, Agraph_t *root) {
  save_obj(g, AGRAPH, root);
  for (Agraph_t *s = agfstsubg(g); s; s = agnxtsubg(s)) save_graph(s, root);
}
static void save_all(Agraph_t *g) {
  save_graph(g, g);
  for (Agnode_t *n = agfstnode(g); n; n = agnxtnode(g, n)) {
    save_obj(n, AGNODE, g);
    for (Agedge_t *e = agfstout(g, n); e; e = agnxtout(g, e)) save_obj(e, AGEDGE, g);
  }
}
static const char *saved_value(void *obj, int kind, const char *name) {
  for (size_t i = 0; i < nsaved; i++)
    if (saved[i].obj == obj && saved[i].kind == kind && strcmp(saved[i].name, name) == 0) return saved[i].value;
  return "";
}
static void restore_obj(void *obj, int kind, Agraph_t *g, const char *keep) {
  for (Agsym_t *sym = agnxtattr(g, kind, NULL); sym; sym = agnxtattr(g, kind, sym)) {
    if (keep && strcmp(sym->name, keep) == 0) continue;
    agxset(obj, sym, saved_value(obj, kind, sym->name));
  }
}
static void restore_graph(Agraph_t *g, Agraph_t *root, const char *keep) {
  restore_obj(g, AGRAPH, root, keep);
  for (Agraph_t *s = agfstsubg(g); s; s = agnxtsubg(s)) restore_graph(s, root, keep);
}
static void restore_all(Agraph_t *g, const char *keep) {
  restore_graph(g, g, keep);
  for (Agnode_t *n = agfstnode(g); n; n = agnxtnode(g, n)) {
    restore_obj(n, AGNODE, g, keep);
    for (Agedge_t *e = agfstout(g, n); e; e = agnxtout(g, e)) restore_obj(e, AGEDGE, g, keep);
  }
}
typedef void (*visit_fn)(void *obj, int kind, int ix, Agraph_t *root, void *ctx);
static void visit_graphs(Agraph_t *g, Agraph_t *root, int *ix, visit_fn fn, void *ctx) {
  fn(g, AGRAPH, (*ix)++, root, ctx);
  for (Agraph_t *s = agfstsubg(g); s; s = agnxtsubg(s)) visit_graphs(s, root, ix, fn, ctx);
}
static void visit_all(Agraph_t *g, visit_fn fn, void *ctx) {
  int gi = 0, ni = 0, ei = 0;
  visit_graphs(g, g, &gi, fn, ctx);
  for (Agnode_t *n = agfstnode(g); n; n = agnxtnode(g, n)) {
    fn(n, AGNODE, ni++, g, ctx);
    for (Agedge_t *e = agfstout(g, n); e; e = agnxtout(g, e)) fn(e, AGEDGE, ei++, g, ctx);
  }
}
static void dump_obj(void *obj, int kind, int ix, Agraph_t *root, void *ctx) {
  for (Agsym_t *sym = agnxtattr(root, kind, NULL); sym; sym = agnxtattr(root, kind, sym)) {
    const char *v = agxget(obj, sym);
    fprintf(ctx, "%d %d %s %zu %s\n", kind, ix, sym->name, strlen(v), v);
  }
}
typedef struct { int kind, ix; const char *name, *value; } graft_t;
static void graft_obj(void *obj, int kind, int ix, Agraph_t *root, void *ctx) {
  (void)root;
  graft_t *t = ctx;
  if (t->kind == kind && t->ix == ix) agsafeset(obj, (char *)t->name, (char *)t->value, "");
}
static void graft_file(Agraph_t *g, const char *path) {
  FILE *f = fopen(path, "rb");
  graft_t t; char name[256]; size_t len;
  while (fscanf(f, "%d %d %255s %zu ", &t.kind, &t.ix, name, &len) == 4) {
    char *v = malloc(len + 1);
    if (fread(v, 1, len, f) != len) break;
    v[len] = 0;
    t.name = name; t.value = v;
    visit_all(g, graft_obj, &t);
    free(v);
  }
  fclose(f);
}
static void print_members(Agraph_t *g, const char *tag) {
  printf("%s %s %d %d\n", tag, agnameof(g), agnnodes(g), agnedges(g));
  for (Agraph_t *s = agfstsubg(g); s; s = agnxtsubg(s)) print_members(s, tag);
}
static int cycle(GVC_t *gvc, Agraph_t *g, const char *engine, const char *fmt, int dofree, char **out, size_t *len) {
  if (gvLayout(gvc, g, engine) != 0) return 1;
  gvRenderData(gvc, g, fmt, out, len);
  if (dofree) gvFreeLayout(gvc, g);
  return 0;
}
int main(int argc, char **argv) {
  const char *file = argv[1], *engine = argv[2], *fmt = argv[3];
  const char *mode = argc > 4 ? argv[4] : "";
  int nofree = strcmp(mode, "nofree") == 0;
  int then = strncmp(mode, "then:", 5) == 0;
  int count = mode[0] >= '1' && mode[0] <= '9' ? atoi(mode) : nofree ? 3 : 2;
  int fresh = strcmp(mode, "fresh") == 0, nobb = strcmp(mode, "nobb") == 0;
  int restore = strcmp(mode, "restore") == 0, keep = strncmp(mode, "keep:", 5) == 0;
  int print = mode[0] != 0;
  agseterr(AGMAX);
  GVC_t *gvc = gvContext();
  char *src = slurp(file);
  Agraph_t *g = agmemread(src);
  if (!g) { puts("NOPARSE"); return 0; }
  char *r[9] = {0}; size_t l[9] = {0};
  if (restore || keep) save_all(g);
  if (strncmp(mode, "seq:", 4) == 0) {
    int n = 0;
    for (char *tok = strtok(strdup(mode + 4), ","); tok; tok = strtok(NULL, ",")) {
      if (strcmp(tok, "l") == 0) { if (gvLayout(gvc, g, engine) != 0) { puts("LAYOUTFAIL"); return 0; } }
      else if (strcmp(tok, "f") == 0) gvFreeLayout(gvc, g);
      else if (strcmp(tok, "r") == 0) { srand(1); srand48(0); }
      else {
        char *o = NULL; size_t ol = 0;
        gvRenderData(gvc, g, tok, &o, &ol);
        printf("== render %d\n", ++n);
        fwrite(o, 1, ol, stdout);
      }
    }
    return 0;
  }
  if (strncmp(mode, "transplant:", 11) == 0) {
    char *o = NULL; size_t ol = 0;
    cycle(gvc, g, engine, fmt, 1, &o, &ol);
    FILE *f = fopen(mode + 11, "wb");
    visit_all(g, dump_obj, f);
    fclose(f);
    return 0;
  }
  if (strncmp(mode, "graft:", 6) == 0) {
    char *o = NULL; size_t ol = 0;
    graft_file(g, mode + 6);
    cycle(gvc, g, engine, fmt, 1, &o, &ol);
    fwrite(o, 1, ol, stdout);
    return 0;
  }
  if (strcmp(mode, "members") == 0) {
    char *o; size_t ol;
    print_members(g, "before");
    cycle(gvc, g, engine, fmt, 1, &o, &ol);
    print_members(g, "after");
    return 0;
  }
  for (int i = 0; i < count; i++) {
    const char *eng = then && i == 1 ? mode + 5 : engine;
    if (fresh && i == 1) { agclose(g); g = agmemread(src); }
    if (nobb && i == 1) agset(g, "bb", "");
    if ((restore || keep) && i == 1) restore_all(g, keep ? mode + 5 : NULL);
    if (cycle(gvc, g, eng, fmt, !nofree, &r[i], &l[i]) != 0) { printf("LAYOUTFAIL%d\n", i + 1); return 0; }
    if (print) { printf("== render %d\n", i + 1); fwrite(r[i], 1, l[i], stdout); }
  }
  if (!print) puts(l[0] == l[1] && memcmp(r[0], r[1], l[0]) == 0 ? "SAME" : "DIFF");
  return 0;
}
