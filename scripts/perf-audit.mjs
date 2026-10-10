// Reads crit code for what costs per frame: work that grows faster than it
// should (a search inside a loop, nested loops over data), sorting, pixel
// reads, filters, gradients, layout reads and allocations in the code that runs
// every frame (draw*, tick*, render*, ... and the local functions they call).
//
//   node scripts/perf-audit.mjs <file or folder> ... [--json] [--min=low|med|high]
//
// crit-perf.mjs runs it on the crits it measures and marks findings in the
// functions that came up hot in their profiles.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const SEVERITY = { high: 3, med: 2, low: 1 };

// the functions that run every frame, by name
const PER_FRAME = /^(draw|tick|redraw|render|paint|frame|animate|step|update)/i;
// set-up functions: not per frame even when a draw calls them
const ONE_SHOT = /^(plan|arm|setup|init|start|launch|create|build|bake|make)/i;
// calls that return a new array
const ALLOCATING = new Set([
  "map",
  "filter",
  "slice",
  "concat",
  "flatMap",
  "from",
]);
const LINEAR = new Set([
  "indexOf",
  "lastIndexOf",
  "includes",
  "find",
  "findIndex",
  "findLast",
  "findLastIndex",
  "filter",
  "some",
  "every",
]);
const ITERATE = new Set([
  "forEach",
  "map",
  "filter",
  "flatMap",
  "reduce",
  "some",
  "every",
  "find",
  "findIndex",
]);
const ALLOCATE = new Set([
  "map",
  "filter",
  "slice",
  "concat",
  "flatMap",
  "toSorted",
  "toReversed",
  "split",
]);
const NEW_ALLOCS =
  /^(Map|Set|WeakMap|Array|Float32Array|Float64Array|Uint8Array|Uint16Array|Int32Array|Path2D|DOMMatrix|Image)$/;
const GRADIENTS = new Set([
  "createLinearGradient",
  "createRadialGradient",
  "createConicGradient",
  "createPattern",
]);
const READBACK = new Set([
  "getImageData",
  "putImageData",
  "toDataURL",
  "toBlob",
]);
const LAYOUT = new Set([
  "getBoundingClientRect",
  "getComputedStyle",
  "querySelector",
  "querySelectorAll",
  "getElementById",
]);
const CONSTANT = /^[A-Z][A-Z0-9_]*$/;
// functions that build and cache: what they make isn't made every frame
const BUILDER =
  /^(get|make|bake|build|create|ensure|prepare|load|warm|cache)[A-Z]/;

// a collection that can't grow with the game: a literal or a CONSTANT
function isFixed(node) {
  if (!node) return false;
  if (ts.isArrayLiteralExpression(node) || ts.isNumericLiteral(node))
    return true;
  if (ts.isIdentifier(node)) return CONSTANT.test(node.text);
  if (ts.isPropertyAccessExpression(node))
    return node.name.text === "length" && isFixed(node.expression);
  if (ts.isParenthesizedExpression(node)) return isFixed(node.expression);
  if (ts.isConditionalExpression(node))
    return isFixed(node.whenTrue) && isFixed(node.whenFalse);
  // a constant scaled by a share (SEGMENTS * grown) stays bounded
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.AsteriskToken
  )
    return isFixed(node.left) || isFixed(node.right);
  return false;
}

// whether a loop's size follows the game's data (bars, coins, hits...)
function loopsOverData(node) {
  if (ts.isForOfStatement(node) || ts.isForInStatement(node))
    return !isFixed(node.expression);
  if (ts.isForStatement(node)) {
    const c = node.condition;
    if (c && ts.isBinaryExpression(c)) return !isFixed(c.right);
    return true;
  }
  if (ts.isWhileStatement(node) || ts.isDoStatement(node)) return true;
  // xs.forEach(cb) and friends: the callback is the loop's body
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  )
    return !isFixed(node.expression.expression);
  return false;
}

const isLoop = (node) =>
  ts.isForStatement(node) ||
  ts.isForOfStatement(node) ||
  ts.isForInStatement(node) ||
  ts.isWhileStatement(node) ||
  ts.isDoStatement(node);

const iterationCall = (node) =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  ITERATE.has(node.expression.name.text) &&
  node.arguments.some(
    (a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a),
  );

function nameOf(fn) {
  if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
  if (fn.name && ts.isStringLiteral(fn.name)) return fn.name.text;
  const parent = fn.parent;
  if (
    parent &&
    ts.isVariableDeclaration(parent) &&
    ts.isIdentifier(parent.name)
  )
    return parent.name.text;
  if (parent && ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name))
    return parent.name.text;
  return null;
}

const isFunction = (node) =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node);

// the identifier an expression starts from: `m` of `m.sides[0]`
function rootOf(node) {
  while (
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node) ||
    ts.isCallExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isNonNullExpression(node)
  )
    node = node.expression;
  return ts.isIdentifier(node) ? node.text : null;
}

function namesIn(binding, into) {
  if (!binding) return into;
  if (ts.isIdentifier(binding)) into.push(binding.text);
  else if (
    ts.isObjectBindingPattern(binding) ||
    ts.isArrayBindingPattern(binding)
  )
    for (const element of binding.elements)
      if (!ts.isOmittedExpression(element)) namesIn(element.name, into);
  return into;
}

// the names a loop gives each item: `m` of `for (const m of mines)`, `s` of
// `shots.forEach((s) => ...)`
function itemNames(node) {
  if (
    (ts.isForOfStatement(node) || ts.isForInStatement(node)) &&
    ts.isVariableDeclarationList(node.initializer)
  )
    return node.initializer.declarations.flatMap((d) => namesIn(d.name, []));
  if (ts.isCallExpression(node)) {
    const callback = node.arguments.find(
      (a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a),
    );
    return callback?.parameters[0]
      ? namesIn(callback.parameters[0].name, [])
      : [];
  }
  return [];
}

// the collection a loop or search runs over
function collectionOf(node) {
  if (ts.isForOfStatement(node) || ts.isForInStatement(node))
    return node.expression;
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  )
    return node.expression.expression;
  return null;
}

export function auditFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const rel = path.relative(process.cwd(), file).replaceAll("\\", "/");

  // named functions, and which local names each calls
  const calls = new Map();
  const collect = (node, owner) => {
    if (isFunction(node)) owner = nameOf(node) ?? owner;
    if (
      owner &&
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression)
    ) {
      if (!calls.has(owner)) calls.set(owner, new Set());
      calls.get(owner).add(node.expression.text);
    }
    ts.forEachChild(node, (child) => collect(child, owner));
  };
  collect(source, null);
  const declared = new Set();
  const declare = (node) => {
    if (isFunction(node)) {
      const name = nameOf(node);
      if (name) declared.add(name);
    }
    ts.forEachChild(node, declare);
  };
  declare(source);
  // per frame: the named ones (true), and the local functions they call,
  // transitively (false: maybe only once, behind a check)
  const perFrame = new Map();
  const visit = (name, direct) => {
    if (perFrame.has(name)) return;
    // planners run once when a crit starts, whoever calls them
    if (!direct && ONE_SHOT.test(name)) return;
    perFrame.set(name, direct);
    for (const callee of calls.get(name) ?? [])
      if (declared.has(callee)) visit(callee, false);
  };
  for (const name of declared) if (PER_FRAME.test(name)) visit(name, true);

  const findings = [];
  const seen = new Set();
  const LOWER = { high: "med", med: "low", low: "low" };
  const report = (node, severity, rule, fn) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const key = `${line}:${rule}`;
    if (seen.has(key)) return;
    seen.add(key);
    const reached = fn !== null && perFrame.get(fn) === false;
    findings.push({
      severity: reached ? LOWER[severity] : severity,
      rule: reached ? `${rule} (if it runs every frame)` : rule,
      file: rel,
      line,
      fn: fn ?? "(top level)",
      code: node.getText().split("\n")[0].slice(0, 90),
    });
  };

  // walks with the function it's in, whether that runs per frame, and how
  // many loops over data enclose it (within that function's frame)
  const walk = (node, ctx) => {
    if (isFunction(node)) {
      const name = nameOf(node);
      const frame = ctx.frame || (name !== null && perFrame.has(name));
      // a callback handed to an iteration call is that loop's body
      const isBody =
        node.parent &&
        iterationCall(node.parent) &&
        node.parent.arguments.includes(node);
      if (ctx.frame && ctx.dataLoops > 0 && !isBody)
        report(node, "low", "closure made per item per frame", ctx.fn);
      ctx = {
        fn: name ?? ctx.fn,
        frame,
        dataLoops: isBody ? ctx.dataLoops : 0,
        items: isBody ? ctx.items : new Set(),
        // a builder like getSprite() makes things once and caches them
        guarded: isBody ? ctx.guarded : name !== null && BUILDER.test(name),
      };
    }
    // anything behind a check (if, ??=, ||=, ??) is taken to run once and cache
    if (ts.isIfStatement(node)) {
      walk(node.expression, ctx);
      const guarded = { ...ctx, guarded: true };
      walk(node.thenStatement, guarded);
      if (node.elseStatement) walk(node.elseStatement, guarded);
      return;
    }
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.QuestionQuestionEqualsToken,
        ts.SyntaxKind.BarBarEqualsToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ].includes(node.operatorToken.kind)
    ) {
      walk(node.left, ctx);
      walk(node.right, { ...ctx, guarded: true });
      return;
    }
    const loop = isLoop(node) || iterationCall(node);
    // a loop over the enclosing item's own parts (`m.sides` in a loop over
    // mines) adds up to one pass over all the parts: not nested data
    const root = loop ? rootOf(collectionOf(node) ?? node) : null;
    const data =
      loop && loopsOverData(node) && !(root !== null && ctx.items.has(root));

    if (ts.isCallExpression(node)) checkCall(node, ctx);
    if (ts.isNewExpression(node) && ctx.frame && !ctx.guarded) {
      const callee = node.expression.getText();
      if (callee === "OffscreenCanvas")
        report(node, "med", "canvas made per frame", ctx.fn);
      else if (NEW_ALLOCS.test(callee) && ctx.dataLoops > 0)
        report(node, "med", `new ${callee} per item per frame`, ctx.fn);
      else if (NEW_ALLOCS.test(callee))
        report(node, "low", `new ${callee} per frame`, ctx.fn);
    }
    if (
      ctx.frame &&
      !ctx.guarded &&
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left)
    ) {
      const prop = node.left.name.text;
      const value = node.right.getText();
      if (prop === "filter" && !/^["'`]none["'`]$/.test(value))
        report(node, "high", "ctx.filter per frame", ctx.fn);
      if (prop === "shadowBlur" && value !== "0")
        report(node, "high", "shadowBlur per frame", ctx.fn);
    }
    if (
      ctx.frame &&
      ctx.dataLoops > 0 &&
      ts.isArrayLiteralExpression(node) &&
      node.elements.some(ts.isSpreadElement)
    )
      report(node, "med", "array spread per item per frame", ctx.fn);
    if (ctx.frame && data && ctx.dataLoops > 0)
      report(node, "med", "nested loops over data per frame: O(n*m)", ctx.fn);

    if (loop) {
      // the loop's own collection or bounds are outside it; its body inside
      const inner = {
        ...ctx,
        dataLoops: ctx.dataLoops + (data ? 1 : 0),
        items: new Set([...ctx.items, ...itemNames(node)]),
      };
      if (ts.isCallExpression(node)) {
        walk(node.expression, ctx);
        for (const arg of node.arguments) walk(arg, inner);
      } else {
        ts.forEachChild(node, (child) =>
          walk(child, child === node.statement ? inner : ctx),
        );
      }
      return;
    }
    ts.forEachChild(node, (child) => walk(child, ctx));
  };

  function checkCall(node, ctx) {
    const callee = node.expression;
    const method = ts.isPropertyAccessExpression(callee)
      ? callee.name.text
      : ts.isIdentifier(callee)
        ? callee.text
        : "";
    const receiver = ts.isPropertyAccessExpression(callee)
      ? callee.expression
      : null;
    const full = callee.getText();
    const ownParts = receiver !== null && ctx.items.has(rootOf(receiver));
    if (
      LINEAR.has(method) &&
      receiver &&
      !isFixed(receiver) &&
      !ownParts &&
      ctx.dataLoops > 0
    )
      report(
        node,
        ctx.frame ? "high" : "low",
        ctx.frame
          ? `.${method}() inside a loop: O(n²) per frame`
          : `.${method}() inside a loop: O(n²) at setup`,
        ctx.fn,
      );
    if (!ctx.frame) return;
    if (method === "sort" && receiver && !isFixed(receiver)) {
      // sorting a fresh copy allocates as well; a reused array sorted in
      // place (painter's order) only pays the sort
      const fresh =
        ts.isArrayLiteralExpression(receiver) ||
        (ts.isCallExpression(receiver) &&
          ts.isPropertyAccessExpression(receiver.expression) &&
          ALLOCATING.has(receiver.expression.name.text));
      if (fresh) report(node, "high", "sort of a fresh copy per frame", ctx.fn);
      else report(node, "med", "sort per frame (in place)", ctx.fn);
    }
    if (READBACK.has(method) && !ctx.guarded)
      report(node, "high", `${method} per frame (pixel readback)`, ctx.fn);
    if (LAYOUT.has(method))
      report(node, "high", `${method} per frame (DOM/layout)`, ctx.fn);
    if (/^(JSON\.(parse|stringify)|structuredClone|localStorage\.)/.test(full))
      report(node, "high", `${full} per frame`, ctx.fn);
    if (GRADIENTS.has(method) && !ctx.guarded)
      report(node, "med", `${method} per frame (cache it)`, ctx.fn);
    if (method === "measureText" && !ctx.guarded)
      report(node, "med", "measureText per frame", ctx.fn);
    if (full === "document.createElement" && !ctx.guarded)
      report(node, "med", "element made per frame", ctx.fn);
    if (full === "document.fonts.check" && !ctx.guarded)
      report(
        node,
        "med",
        "document.fonts.check per frame (slow: remember once a font is ready)",
        ctx.fn,
      );
    const allocates =
      (ALLOCATE.has(method) && receiver && !isFixed(receiver)) ||
      /^(Array\.from|Object\.(entries|keys|values|fromEntries))$/.test(full);
    if (allocates) {
      const what = ALLOCATE.has(method) ? `.${method}()` : `${full}()`;
      report(
        node,
        ctx.dataLoops > 0 ? "med" : "low",
        ctx.dataLoops > 0
          ? `${what} allocates per item per frame`
          : `${what} allocates per frame`,
        ctx.fn,
      );
    }
  }

  walk(source, {
    fn: null,
    frame: false,
    dataLoops: 0,
    items: new Set(),
    guarded: false,
  });
  return findings;
}

function filesUnder(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return /\.ts$/.test(target) ? [target] : [];
  return fs
    .readdirSync(target, { withFileTypes: true })
    .flatMap((entry) => filesUnder(path.join(target, entry.name)));
}

export function audit(targets) {
  return targets
    .flatMap(filesUnder)
    .flatMap(auditFile)
    .sort(
      (a, b) =>
        SEVERITY[b.severity] - SEVERITY[a.severity] ||
        a.file.localeCompare(b.file) ||
        a.line - b.line,
    );
}

export function formatFinding(f, hot = false) {
  return `${f.severity.toUpperCase().padEnd(4)} ${hot ? "HOT " : ""}${f.file}:${f.line} ${f.fn}: ${f.rule}\n       ${f.code}`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const min =
    SEVERITY[
      (args.find((a) => a.startsWith("--min=")) ?? "--min=low").slice(6)
    ] ?? 1;
  const targets = args.filter((a) => !a.startsWith("--"));
  if (targets.length === 0) {
    console.log(
      "usage: node scripts/perf-audit.mjs <file or folder> ... [--json] [--min=low|med|high]",
    );
    process.exit(1);
  }
  const findings = audit(targets).filter((f) => SEVERITY[f.severity] >= min);
  if (json) console.log(JSON.stringify(findings, null, 2));
  else {
    for (const f of findings) console.log(formatFinding(f));
    const counts = Object.fromEntries(
      Object.keys(SEVERITY).map((s) => [
        s,
        findings.filter((f) => f.severity === s).length,
      ]),
    );
    console.log(
      `\n${findings.length} findings: ${counts.high} high, ${counts.med} med, ${counts.low} low`,
    );
  }
}
