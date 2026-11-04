// T7: std::sort driven directly, on a struct that holds a shared_ptr as Event does, so the
// instantiation is the one generate-constraints.cpp gets. Prints `<name> keys... | ids... | compares`,
// the sorted ids being the permutation and the compares the path taken. The inputs reach the paths tie-heavy events do not: lengths 0-5
// at the top, ninther, the partition-with-equals-on-left branch, __insertion_sort_incomplete, and
// the depth-limit heap fallback by way of McIlroy's "A Killer Adversary for Quicksort" (1999), run
// against this very std::sort.
#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <memory>
#include <string>
#include <vector>
using std::vector;

struct Item {
  int key;
  int id;
  std::shared_ptr<int> keep;
};
static long compares = 0;
static bool lt(const Item &a, const Item &b) {
  compares++;
  return a.key < b.key;
}

// The path selection: not arithmetic, so no branchless sort3-5 and no bitset partition.
static_assert(!std::__use_branchless_sort<bool (*)(const Item &, const Item &), Item *>);
static_assert(!std::is_trivially_copyable<Item>::value);

static vector<Item> items(const vector<int> &keys) {
  vector<Item> v;
  int id = 0;
  for (int k : keys) v.push_back({k, id++, nullptr});
  return v;
}

static void both(const std::string &name, const vector<int> &keys) {
  vector<Item> v = items(keys);
  compares = 0;
  std::sort(v.begin(), v.end(), lt);
  printf("%s", name.c_str());
  for (int k : keys) printf(" %d", k);
  printf(" |");
  for (const Item &i : v) printf(" %d", i.id);
  printf(" | %ld\n", compares);
}

// mulberry32, as gen.mjs and runs.mjs use.
struct Rng {
  uint32_t a;
  uint32_t next() {
    a += 0x6d2b79f5;
    uint32_t t = a;
    t = (t ^ (t >> 15)) * (t | 1);
    t ^= t + (t ^ (t >> 7)) * (t | 61);
    return t ^ (t >> 14);
  }
};

static vector<int> pattern(int kind, int n, Rng &rng) {
  vector<int> k(n);
  for (int i = 0; i < n; i++) {
    switch (kind) {
      case 0: k[i] = 7; break;                               // all equal
      case 1: k[i] = i / 3; break;                           // ascending with ties
      case 2: k[i] = (n - i) / 3; break;                     // descending with ties
      case 3: k[i] = (i < n / 2 ? i : n - i) / 2; break;     // organ pipe
      case 4: k[i] = i % 5; break;                           // sawtooth
      case 5: k[i] = rng.next() % 3; break;                  // three values
      case 6: k[i] = rng.next() % 16; break;                 // sixteen values
      default: k[i] = rng.next() % 100000; break;            // nearly distinct
    }
  }
  return k;
}

// McIlroy's adversary: comparing two unfrozen elements freezes one, so the pivot stays small and
// the depth limit runs out. Past `budget` frozen elements the rest keep the key gas + idx % ties,
// which leaves ties for the heap sort. A replay on the resulting keys sees the same comparisons.
static vector<int> killer(int n, int budget, int ties) {
  struct Cell { int idx; std::shared_ptr<int> keep; };
  const int gas = n;
  vector<int> val(n, -1);
  int frozen = 0, candidate = 0;
  const auto key = [&](int i) { return val[i] >= 0 ? val[i] : gas + i % ties; };
  vector<Cell> cells;
  for (int i = 0; i < n; i++) cells.push_back({i, nullptr});
  std::sort(cells.begin(), cells.end(), [&](const Cell &x, const Cell &y) {
    if (val[x.idx] < 0 && val[y.idx] < 0 && frozen < budget) val[x.idx == candidate ? x.idx : y.idx] = frozen++;
    if (val[x.idx] < 0) candidate = x.idx;
    else if (val[y.idx] < 0) candidate = y.idx;
    return key(x.idx) < key(y.idx);
  });
  vector<int> keys(n);
  for (int i = 0; i < n; i++) keys[i] = key(i);
  return keys;
}

int main() {
  Rng rng{0x7007};
  for (int n = 0; n <= 36; n++)
    for (int kind = 0; kind < 8; kind++) both("p" + std::to_string(kind) + "n" + std::to_string(n), pattern(kind, n, rng));
  for (int n : {48, 128, 129, 130, 257, 400})
    for (int kind = 0; kind < 8; kind++) both("p" + std::to_string(kind) + "n" + std::to_string(n), pattern(kind, n, rng));
  for (int kind : {5, 6}) both("p" + std::to_string(kind) + "n1000", pattern(kind, 1000, rng));
  for (int n : {64, 128, 256, 1000}) {
    both("killer" + std::to_string(n), killer(n, n, 1));
    for (int ties : {1, 3})
      for (int budget : {n / 8, n / 4}) {
        both("killer" + std::to_string(n) + "t" + std::to_string(ties) + "b" + std::to_string(budget), killer(n, budget, ties));
      }
  }
  return 0;
}
