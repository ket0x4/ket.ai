var Cg = (l) => {
	throw TypeError(l);
};
var jg = (l, i, r) => i.has(l) || Cg("Cannot " + r);
var zt = (l, i, r) => (
		jg(l, i, "read from private field"), r ? r.call(l) : i.get(l)
	),
	Tg = (l, i, r) =>
		i.has(l)
			? Cg("Cannot add the same private member more than once")
			: i instanceof WeakSet
				? i.add(l)
				: i.set(l, r),
	cf = (l, i, r, o) => (
		jg(l, i, "write to private field"), o ? o.call(l, r) : i.set(l, r), r
	);
function C1(l, i) {
	for (var r = 0; r < i.length; r++) {
		const o = i[r];
		if (typeof o != "string" && !Array.isArray(o)) {
			for (const f in o)
				if (f !== "default" && !(f in l)) {
					const d = Object.getOwnPropertyDescriptor(o, f);
					d &&
						Object.defineProperty(
							l,
							f,
							d.get ? d : { enumerable: !0, get: () => o[f] },
						);
				}
		}
	}
	return Object.freeze(
		Object.defineProperty(l, Symbol.toStringTag, { value: "Module" }),
	);
}
(() => {
	const i = document.createElement("link").relList;
	if (i && i.supports && i.supports("modulepreload")) return;
	for (const f of document.querySelectorAll('link[rel="modulepreload"]')) o(f);
	new MutationObserver((f) => {
		for (const d of f)
			if (d.type === "childList")
				for (const m of d.addedNodes)
					m.tagName === "LINK" && m.rel === "modulepreload" && o(m);
	}).observe(document, { childList: !0, subtree: !0 });
	function r(f) {
		const d = {};
		return (
			f.integrity && (d.integrity = f.integrity),
			f.referrerPolicy && (d.referrerPolicy = f.referrerPolicy),
			f.crossOrigin === "use-credentials"
				? (d.credentials = "include")
				: f.crossOrigin === "anonymous"
					? (d.credentials = "omit")
					: (d.credentials = "same-origin"),
			d
		);
	}
	function o(f) {
		if (f.ep) return;
		f.ep = !0;
		const d = r(f);
		fetch(f.href, d);
	}
})();
function Kf(l) {
	return l && l.__esModule && Object.hasOwn(l, "default") ? l.default : l;
}
var uf = { exports: {} },
	Lr = {}; /**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var _g;
function j1() {
	if (_g) return Lr;
	_g = 1;
	var l = Symbol.for("react.transitional.element"),
		i = Symbol.for("react.fragment");
	function r(o, f, d) {
		var m = null;
		if (
			(d !== void 0 && (m = "" + d),
			f.key !== void 0 && (m = "" + f.key),
			"key" in f)
		) {
			d = {};
			for (var v in f) v !== "key" && (d[v] = f[v]);
		} else d = f;
		return (
			(f = d.ref),
			{ $$typeof: l, type: o, key: m, ref: f !== void 0 ? f : null, props: d }
		);
	}
	return (Lr.Fragment = i), (Lr.jsx = r), (Lr.jsxs = r), Lr;
}
var Ag;
function T1() {
	return Ag || ((Ag = 1), (uf.exports = j1())), uf.exports;
}
var u = T1(),
	ff = { exports: {} },
	Se = {}; /**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Rg;
function _1() {
	if (Rg) return Se;
	Rg = 1;
	var l = Symbol.for("react.transitional.element"),
		i = Symbol.for("react.portal"),
		r = Symbol.for("react.fragment"),
		o = Symbol.for("react.strict_mode"),
		f = Symbol.for("react.profiler"),
		d = Symbol.for("react.consumer"),
		m = Symbol.for("react.context"),
		v = Symbol.for("react.forward_ref"),
		y = Symbol.for("react.suspense"),
		g = Symbol.for("react.memo"),
		S = Symbol.for("react.lazy"),
		h = Symbol.for("react.activity"),
		w = Symbol.iterator;
	function E(A) {
		return A === null || typeof A != "object"
			? null
			: ((A = (w && A[w]) || A["@@iterator"]),
				typeof A == "function" ? A : null);
	}
	var C = {
			isMounted: () => !1,
			enqueueForceUpdate: () => {},
			enqueueReplaceState: () => {},
			enqueueSetState: () => {},
		},
		j = Object.assign,
		N = {};
	function T(A, G, W) {
		(this.props = A),
			(this.context = G),
			(this.refs = N),
			(this.updater = W || C);
	}
	(T.prototype.isReactComponent = {}),
		(T.prototype.setState = function (A, G) {
			if (typeof A != "object" && typeof A != "function" && A != null)
				throw Error(
					"takes an object of state variables to update or a function which returns an object of state variables.",
				);
			this.updater.enqueueSetState(this, A, G, "setState");
		}),
		(T.prototype.forceUpdate = function (A) {
			this.updater.enqueueForceUpdate(this, A, "forceUpdate");
		});
	function z() {}
	z.prototype = T.prototype;
	function R(A, G, W) {
		(this.props = A),
			(this.context = G),
			(this.refs = N),
			(this.updater = W || C);
	}
	var O = (R.prototype = new z());
	(O.constructor = R), j(O, T.prototype), (O.isPureReactComponent = !0);
	var L = Array.isArray;
	function Y() {}
	var X = { H: null, A: null, T: null, S: null },
		q = Object.prototype.hasOwnProperty;
	function J(A, G, W) {
		var $ = W.ref;
		return {
			$$typeof: l,
			type: A,
			key: G,
			ref: $ !== void 0 ? $ : null,
			props: W,
		};
	}
	function ee(A, G) {
		return J(A.type, G, A.props);
	}
	function ce(A) {
		return typeof A == "object" && A !== null && A.$$typeof === l;
	}
	function te(A) {
		var G = { "=": "=0", ":": "=2" };
		return "$" + A.replace(/[=:]/g, (W) => G[W]);
	}
	var se = /\/+/g;
	function le(A, G) {
		return typeof A == "object" && A !== null && A.key != null
			? te("" + A.key)
			: G.toString(36);
	}
	function ue(A) {
		switch (A.status) {
			case "fulfilled":
				return A.value;
			case "rejected":
				throw A.reason;
			default:
				switch (
					(typeof A.status == "string"
						? A.then(Y, Y)
						: ((A.status = "pending"),
							A.then(
								(G) => {
									A.status === "pending" &&
										((A.status = "fulfilled"), (A.value = G));
								},
								(G) => {
									A.status === "pending" &&
										((A.status = "rejected"), (A.reason = G));
								},
							)),
					A.status)
				) {
					case "fulfilled":
						return A.value;
					case "rejected":
						throw A.reason;
				}
		}
		throw A;
	}
	function M(A, G, W, $, ne) {
		var oe = typeof A;
		(oe === "undefined" || oe === "boolean") && (A = null);
		var ge = !1;
		if (A === null) ge = !0;
		else
			switch (oe) {
				case "bigint":
				case "string":
				case "number":
					ge = !0;
					break;
				case "object":
					switch (A.$$typeof) {
						case l:
						case i:
							ge = !0;
							break;
						case S:
							return (ge = A._init), M(ge(A._payload), G, W, $, ne);
					}
			}
		if (ge)
			return (
				(ne = ne(A)),
				(ge = $ === "" ? "." + le(A, 0) : $),
				L(ne)
					? ((W = ""),
						ge != null && (W = ge.replace(se, "$&/") + "/"),
						M(ne, G, W, "", (Ve) => Ve))
					: ne != null &&
						(ce(ne) &&
							(ne = ee(
								ne,
								W +
									(ne.key == null || (A && A.key === ne.key)
										? ""
										: ("" + ne.key).replace(se, "$&/") + "/") +
									ge,
							)),
						G.push(ne)),
				1
			);
		ge = 0;
		var fe = $ === "" ? "." : $ + ":";
		if (L(A))
			for (var ae = 0; ae < A.length; ae++)
				($ = A[ae]), (oe = fe + le($, ae)), (ge += M($, G, W, oe, ne));
		else if (((ae = E(A)), typeof ae == "function"))
			for (A = ae.call(A), ae = 0; !($ = A.next()).done; )
				($ = $.value), (oe = fe + le($, ae++)), (ge += M($, G, W, oe, ne));
		else if (oe === "object") {
			if (typeof A.then == "function") return M(ue(A), G, W, $, ne);
			throw (
				((G = String(A)),
				Error(
					"Objects are not valid as a React child (found: " +
						(G === "[object Object]"
							? "object with keys {" + Object.keys(A).join(", ") + "}"
							: G) +
						"). If you meant to render a collection of children, use an array instead.",
				))
			);
		}
		return ge;
	}
	function H(A, G, W) {
		if (A == null) return A;
		var $ = [],
			ne = 0;
		return M(A, $, "", "", (oe) => G.call(W, oe, ne++)), $;
	}
	function Z(A) {
		if (A._status === -1) {
			var G = A._result;
			(G = G()),
				G.then(
					(W) => {
						(A._status === 0 || A._status === -1) &&
							((A._status = 1), (A._result = W));
					},
					(W) => {
						(A._status === 0 || A._status === -1) &&
							((A._status = 2), (A._result = W));
					},
				),
				A._status === -1 && ((A._status = 0), (A._result = G));
		}
		if (A._status === 1) return A._result.default;
		throw A._result;
	}
	var re =
			typeof reportError == "function"
				? reportError
				: (A) => {
						if (
							typeof window == "object" &&
							typeof window.ErrorEvent == "function"
						) {
							var G = new window.ErrorEvent("error", {
								bubbles: !0,
								cancelable: !0,
								message:
									typeof A == "object" &&
									A !== null &&
									typeof A.message == "string"
										? String(A.message)
										: String(A),
								error: A,
							});
							if (!window.dispatchEvent(G)) return;
						} else if (
							typeof process == "object" &&
							typeof process.emit == "function"
						) {
							process.emit("uncaughtException", A);
							return;
						}
						console.error(A);
					},
		F = {
			map: H,
			forEach: (A, G, W) => {
				H(
					A,
					function () {
						G.apply(this, arguments);
					},
					W,
				);
			},
			count: (A) => {
				var G = 0;
				return (
					H(A, () => {
						G++;
					}),
					G
				);
			},
			toArray: (A) => H(A, (G) => G) || [],
			only: (A) => {
				if (!ce(A))
					throw Error(
						"React.Children.only expected to receive a single React element child.",
					);
				return A;
			},
		};
	return (
		(Se.Activity = h),
		(Se.Children = F),
		(Se.Component = T),
		(Se.Fragment = r),
		(Se.Profiler = f),
		(Se.PureComponent = R),
		(Se.StrictMode = o),
		(Se.Suspense = y),
		(Se.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = X),
		(Se.__COMPILER_RUNTIME = {
			__proto__: null,
			c: (A) => X.H.useMemoCache(A),
		}),
		(Se.cache = (A) =>
			function () {
				return A.apply(null, arguments);
			}),
		(Se.cacheSignal = () => null),
		(Se.cloneElement = function (A, G, W) {
			if (A == null)
				throw Error(
					"The argument must be a React element, but you passed " + A + ".",
				);
			var $ = j({}, A.props),
				ne = A.key;
			if (G != null)
				for (oe in (G.key !== void 0 && (ne = "" + G.key), G))
					!q.call(G, oe) ||
						oe === "key" ||
						oe === "__self" ||
						oe === "__source" ||
						(oe === "ref" && G.ref === void 0) ||
						($[oe] = G[oe]);
			var oe = arguments.length - 2;
			if (oe === 1) $.children = W;
			else if (1 < oe) {
				for (var ge = Array(oe), fe = 0; fe < oe; fe++)
					ge[fe] = arguments[fe + 2];
				$.children = ge;
			}
			return J(A.type, ne, $);
		}),
		(Se.createContext = (A) => (
			(A = {
				$$typeof: m,
				_currentValue: A,
				_currentValue2: A,
				_threadCount: 0,
				Provider: null,
				Consumer: null,
			}),
			(A.Provider = A),
			(A.Consumer = { $$typeof: d, _context: A }),
			A
		)),
		(Se.createElement = function (A, G, W) {
			var $,
				ne = {},
				oe = null;
			if (G != null)
				for ($ in (G.key !== void 0 && (oe = "" + G.key), G))
					q.call(G, $) &&
						$ !== "key" &&
						$ !== "__self" &&
						$ !== "__source" &&
						(ne[$] = G[$]);
			var ge = arguments.length - 2;
			if (ge === 1) ne.children = W;
			else if (1 < ge) {
				for (var fe = Array(ge), ae = 0; ae < ge; ae++)
					fe[ae] = arguments[ae + 2];
				ne.children = fe;
			}
			if (A && A.defaultProps)
				for ($ in ((ge = A.defaultProps), ge))
					ne[$] === void 0 && (ne[$] = ge[$]);
			return J(A, oe, ne);
		}),
		(Se.createRef = () => ({ current: null })),
		(Se.forwardRef = (A) => ({ $$typeof: v, render: A })),
		(Se.isValidElement = ce),
		(Se.lazy = (A) => ({
			$$typeof: S,
			_payload: { _status: -1, _result: A },
			_init: Z,
		})),
		(Se.memo = (A, G) => ({
			$$typeof: g,
			type: A,
			compare: G === void 0 ? null : G,
		})),
		(Se.startTransition = (A) => {
			var G = X.T,
				W = {};
			X.T = W;
			try {
				var $ = A(),
					ne = X.S;
				ne !== null && ne(W, $),
					typeof $ == "object" &&
						$ !== null &&
						typeof $.then == "function" &&
						$.then(Y, re);
			} catch (oe) {
				re(oe);
			} finally {
				G !== null && W.types !== null && (G.types = W.types), (X.T = G);
			}
		}),
		(Se.unstable_useCacheRefresh = () => X.H.useCacheRefresh()),
		(Se.use = (A) => X.H.use(A)),
		(Se.useActionState = (A, G, W) => X.H.useActionState(A, G, W)),
		(Se.useCallback = (A, G) => X.H.useCallback(A, G)),
		(Se.useContext = (A) => X.H.useContext(A)),
		(Se.useDebugValue = () => {}),
		(Se.useDeferredValue = (A, G) => X.H.useDeferredValue(A, G)),
		(Se.useEffect = (A, G) => X.H.useEffect(A, G)),
		(Se.useEffectEvent = (A) => X.H.useEffectEvent(A)),
		(Se.useId = () => X.H.useId()),
		(Se.useImperativeHandle = (A, G, W) => X.H.useImperativeHandle(A, G, W)),
		(Se.useInsertionEffect = (A, G) => X.H.useInsertionEffect(A, G)),
		(Se.useLayoutEffect = (A, G) => X.H.useLayoutEffect(A, G)),
		(Se.useMemo = (A, G) => X.H.useMemo(A, G)),
		(Se.useOptimistic = (A, G) => X.H.useOptimistic(A, G)),
		(Se.useReducer = (A, G, W) => X.H.useReducer(A, G, W)),
		(Se.useRef = (A) => X.H.useRef(A)),
		(Se.useState = (A) => X.H.useState(A)),
		(Se.useSyncExternalStore = (A, G, W) => X.H.useSyncExternalStore(A, G, W)),
		(Se.useTransition = () => X.H.useTransition()),
		(Se.version = "19.2.8"),
		Se
	);
}
var Mg;
function Zf() {
	return Mg || ((Mg = 1), (ff.exports = _1())), ff.exports;
}
var x = Zf();
const ie = Kf(x),
	Yi = C1({ __proto__: null, default: ie }, [x]);
var df = { exports: {} },
	Br = {},
	mf = { exports: {} },
	hf = {}; /**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Og;
function A1() {
	return (
		Og ||
			((Og = 1),
			((l) => {
				function i(M, H) {
					var Z = M.length;
					M.push(H);
					for (; 0 < Z; ) {
						var re = (Z - 1) >>> 1,
							F = M[re];
						if (0 < f(F, H)) (M[re] = H), (M[Z] = F), (Z = re);
						else break;
					}
				}
				function r(M) {
					return M.length === 0 ? null : M[0];
				}
				function o(M) {
					if (M.length === 0) return null;
					var H = M[0],
						Z = M.pop();
					if (Z !== H) {
						M[0] = Z;
						for (var re = 0, F = M.length, A = F >>> 1; re < A; ) {
							var G = 2 * (re + 1) - 1,
								W = M[G],
								$ = G + 1,
								ne = M[$];
							if (0 > f(W, Z))
								$ < F && 0 > f(ne, W)
									? ((M[re] = ne), (M[$] = Z), (re = $))
									: ((M[re] = W), (M[G] = Z), (re = G));
							else if ($ < F && 0 > f(ne, Z))
								(M[re] = ne), (M[$] = Z), (re = $);
							else break;
						}
					}
					return H;
				}
				function f(M, H) {
					var Z = M.sortIndex - H.sortIndex;
					return Z !== 0 ? Z : M.id - H.id;
				}
				if (
					((l.unstable_now = void 0),
					typeof performance == "object" &&
						typeof performance.now == "function")
				) {
					var d = performance;
					l.unstable_now = () => d.now();
				} else {
					var m = Date,
						v = m.now();
					l.unstable_now = () => m.now() - v;
				}
				var y = [],
					g = [],
					S = 1,
					h = null,
					w = 3,
					E = !1,
					C = !1,
					j = !1,
					N = !1,
					T = typeof setTimeout == "function" ? setTimeout : null,
					z = typeof clearTimeout == "function" ? clearTimeout : null,
					R = typeof setImmediate < "u" ? setImmediate : null;
				function O(M) {
					for (var H = r(g); H !== null; ) {
						if (H.callback === null) o(g);
						else if (H.startTime <= M)
							o(g), (H.sortIndex = H.expirationTime), i(y, H);
						else break;
						H = r(g);
					}
				}
				function L(M) {
					if (((j = !1), O(M), !C))
						if (r(y) !== null) (C = !0), Y || ((Y = !0), te());
						else {
							var H = r(g);
							H !== null && ue(L, H.startTime - M);
						}
				}
				var Y = !1,
					X = -1,
					q = 5,
					J = -1;
				function ee() {
					return N ? !0 : !(l.unstable_now() - J < q);
				}
				function ce() {
					if (((N = !1), Y)) {
						var M = l.unstable_now();
						J = M;
						var H = !0;
						try {
							e: {
								(C = !1), j && ((j = !1), z(X), (X = -1)), (E = !0);
								var Z = w;
								try {
									t: {
										for (
											O(M), h = r(y);
											h !== null && !(h.expirationTime > M && ee());
										) {
											var re = h.callback;
											if (typeof re == "function") {
												(h.callback = null), (w = h.priorityLevel);
												var F = re(h.expirationTime <= M);
												if (((M = l.unstable_now()), typeof F == "function")) {
													(h.callback = F), O(M), (H = !0);
													break t;
												}
												h === r(y) && o(y), O(M);
											} else o(y);
											h = r(y);
										}
										if (h !== null) H = !0;
										else {
											var A = r(g);
											A !== null && ue(L, A.startTime - M), (H = !1);
										}
									}
									break e;
								} finally {
									(h = null), (w = Z), (E = !1);
								}
								H = void 0;
							}
						} finally {
							H ? te() : (Y = !1);
						}
					}
				}
				var te;
				if (typeof R == "function")
					te = () => {
						R(ce);
					};
				else if (typeof MessageChannel < "u") {
					var se = new MessageChannel(),
						le = se.port2;
					(se.port1.onmessage = ce),
						(te = () => {
							le.postMessage(null);
						});
				} else
					te = () => {
						T(ce, 0);
					};
				function ue(M, H) {
					X = T(() => {
						M(l.unstable_now());
					}, H);
				}
				(l.unstable_IdlePriority = 5),
					(l.unstable_ImmediatePriority = 1),
					(l.unstable_LowPriority = 4),
					(l.unstable_NormalPriority = 3),
					(l.unstable_Profiling = null),
					(l.unstable_UserBlockingPriority = 2),
					(l.unstable_cancelCallback = (M) => {
						M.callback = null;
					}),
					(l.unstable_forceFrameRate = (M) => {
						0 > M || 125 < M
							? console.error(
									"forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported",
								)
							: (q = 0 < M ? Math.floor(1e3 / M) : 5);
					}),
					(l.unstable_getCurrentPriorityLevel = () => w),
					(l.unstable_next = (M) => {
						switch (w) {
							case 1:
							case 2:
							case 3: {
								var H = 3;
								break;
							}
							default:
								H = w;
						}
						var Z = w;
						w = H;
						try {
							return M();
						} finally {
							w = Z;
						}
					}),
					(l.unstable_requestPaint = () => {
						N = !0;
					}),
					(l.unstable_runWithPriority = (M, H) => {
						switch (M) {
							case 1:
							case 2:
							case 3:
							case 4:
							case 5:
								break;
							default:
								M = 3;
						}
						var Z = w;
						w = M;
						try {
							return H();
						} finally {
							w = Z;
						}
					}),
					(l.unstable_scheduleCallback = (M, H, Z) => {
						var re = l.unstable_now();
						switch (
							(typeof Z == "object" && Z !== null
								? ((Z = Z.delay),
									(Z = typeof Z == "number" && 0 < Z ? re + Z : re))
								: (Z = re),
							M)
						) {
							case 1: {
								var F = -1;
								break;
							}
							case 2:
								F = 250;
								break;
							case 5:
								F = 1073741823;
								break;
							case 4:
								F = 1e4;
								break;
							default:
								F = 5e3;
						}
						return (
							(F = Z + F),
							(M = {
								id: S++,
								callback: H,
								priorityLevel: M,
								startTime: Z,
								expirationTime: F,
								sortIndex: -1,
							}),
							Z > re
								? ((M.sortIndex = Z),
									i(g, M),
									r(y) === null &&
										M === r(g) &&
										(j ? (z(X), (X = -1)) : (j = !0), ue(L, Z - re)))
								: ((M.sortIndex = F),
									i(y, M),
									C || E || ((C = !0), Y || ((Y = !0), te()))),
							M
						);
					}),
					(l.unstable_shouldYield = ee),
					(l.unstable_wrapCallback = (M) => {
						var H = w;
						return function () {
							var Z = w;
							w = H;
							try {
								return M.apply(this, arguments);
							} finally {
								w = Z;
							}
						};
					});
			})(hf)),
		hf
	);
}
var Dg;
function R1() {
	return Dg || ((Dg = 1), (mf.exports = A1())), mf.exports;
}
var pf = { exports: {} },
	kt = {}; /**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var zg;
function M1() {
	if (zg) return kt;
	zg = 1;
	var l = Zf();
	function i(y) {
		var g = "https://react.dev/errors/" + y;
		if (1 < arguments.length) {
			g += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var S = 2; S < arguments.length; S++)
				g += "&args[]=" + encodeURIComponent(arguments[S]);
		}
		return (
			"Minified React error #" +
			y +
			"; visit " +
			g +
			" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
		);
	}
	function r() {}
	var o = {
			d: {
				f: r,
				r: () => {
					throw Error(i(522));
				},
				D: r,
				C: r,
				L: r,
				m: r,
				X: r,
				S: r,
				M: r,
			},
			p: 0,
			findDOMNode: null,
		},
		f = Symbol.for("react.portal");
	function d(y, g, S) {
		var h =
			3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
		return {
			$$typeof: f,
			key: h == null ? null : "" + h,
			children: y,
			containerInfo: g,
			implementation: S,
		};
	}
	var m = l.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function v(y, g) {
		if (y === "font") return "";
		if (typeof g == "string") return g === "use-credentials" ? g : "";
	}
	return (
		(kt.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = o),
		(kt.createPortal = function (y, g) {
			var S =
				2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
			if (!g || (g.nodeType !== 1 && g.nodeType !== 9 && g.nodeType !== 11))
				throw Error(i(299));
			return d(y, g, null, S);
		}),
		(kt.flushSync = (y) => {
			var g = m.T,
				S = o.p;
			try {
				if (((m.T = null), (o.p = 2), y)) return y();
			} finally {
				(m.T = g), (o.p = S), o.d.f();
			}
		}),
		(kt.preconnect = (y, g) => {
			typeof y == "string" &&
				(g
					? ((g = g.crossOrigin),
						(g =
							typeof g == "string"
								? g === "use-credentials"
									? g
									: ""
								: void 0))
					: (g = null),
				o.d.C(y, g));
		}),
		(kt.prefetchDNS = (y) => {
			typeof y == "string" && o.d.D(y);
		}),
		(kt.preinit = (y, g) => {
			if (typeof y == "string" && g && typeof g.as == "string") {
				var S = g.as,
					h = v(S, g.crossOrigin),
					w = typeof g.integrity == "string" ? g.integrity : void 0,
					E = typeof g.fetchPriority == "string" ? g.fetchPriority : void 0;
				S === "style"
					? o.d.S(y, typeof g.precedence == "string" ? g.precedence : void 0, {
							crossOrigin: h,
							integrity: w,
							fetchPriority: E,
						})
					: S === "script" &&
						o.d.X(y, {
							crossOrigin: h,
							integrity: w,
							fetchPriority: E,
							nonce: typeof g.nonce == "string" ? g.nonce : void 0,
						});
			}
		}),
		(kt.preinitModule = (y, g) => {
			if (typeof y == "string")
				if (typeof g == "object" && g !== null) {
					if (g.as == null || g.as === "script") {
						var S = v(g.as, g.crossOrigin);
						o.d.M(y, {
							crossOrigin: S,
							integrity: typeof g.integrity == "string" ? g.integrity : void 0,
							nonce: typeof g.nonce == "string" ? g.nonce : void 0,
						});
					}
				} else g == null && o.d.M(y);
		}),
		(kt.preload = (y, g) => {
			if (
				typeof y == "string" &&
				typeof g == "object" &&
				g !== null &&
				typeof g.as == "string"
			) {
				var S = g.as,
					h = v(S, g.crossOrigin);
				o.d.L(y, S, {
					crossOrigin: h,
					integrity: typeof g.integrity == "string" ? g.integrity : void 0,
					nonce: typeof g.nonce == "string" ? g.nonce : void 0,
					type: typeof g.type == "string" ? g.type : void 0,
					fetchPriority:
						typeof g.fetchPriority == "string" ? g.fetchPriority : void 0,
					referrerPolicy:
						typeof g.referrerPolicy == "string" ? g.referrerPolicy : void 0,
					imageSrcSet:
						typeof g.imageSrcSet == "string" ? g.imageSrcSet : void 0,
					imageSizes: typeof g.imageSizes == "string" ? g.imageSizes : void 0,
					media: typeof g.media == "string" ? g.media : void 0,
				});
			}
		}),
		(kt.preloadModule = (y, g) => {
			if (typeof y == "string")
				if (g) {
					var S = v(g.as, g.crossOrigin);
					o.d.m(y, {
						as: typeof g.as == "string" && g.as !== "script" ? g.as : void 0,
						crossOrigin: S,
						integrity: typeof g.integrity == "string" ? g.integrity : void 0,
					});
				} else o.d.m(y);
		}),
		(kt.requestFormReset = (y) => {
			o.d.r(y);
		}),
		(kt.unstable_batchedUpdates = (y, g) => y(g)),
		(kt.useFormState = (y, g, S) => m.H.useFormState(y, g, S)),
		(kt.useFormStatus = () => m.H.useHostTransitionStatus()),
		(kt.version = "19.2.8"),
		kt
	);
}
var kg;
function Cv() {
	if (kg) return pf.exports;
	kg = 1;
	function l() {
		if (
			!(
				typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" ||
				typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"
			)
		)
			try {
				__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(l);
			} catch (i) {
				console.error(i);
			}
	}
	return l(), (pf.exports = M1()), pf.exports;
} /**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Lg;
function O1() {
	if (Lg) return Br;
	Lg = 1;
	var l = R1(),
		i = Zf(),
		r = Cv();
	function o(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++)
				t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return (
			"Minified React error #" +
			e +
			"; visit " +
			t +
			" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
		);
	}
	function f(e) {
		return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
	}
	function d(e) {
		var t = e,
			n = e;
		if (e.alternate) for (; t.return; ) t = t.return;
		else {
			e = t;
			do (t = e), (t.flags & 4098) !== 0 && (n = t.return), (e = t.return);
			while (e);
		}
		return t.tag === 3 ? n : null;
	}
	function m(e) {
		if (e.tag === 13) {
			var t = e.memoizedState;
			if (
				(t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)),
				t !== null)
			)
				return t.dehydrated;
		}
		return null;
	}
	function v(e) {
		if (e.tag === 31) {
			var t = e.memoizedState;
			if (
				(t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)),
				t !== null)
			)
				return t.dehydrated;
		}
		return null;
	}
	function y(e) {
		if (d(e) !== e) throw Error(o(188));
	}
	function g(e) {
		var t = e.alternate;
		if (!t) {
			if (((t = d(e)), t === null)) throw Error(o(188));
			return t !== e ? null : e;
		}
		for (var n = e, a = t; ; ) {
			var s = n.return;
			if (s === null) break;
			var c = s.alternate;
			if (c === null) {
				if (((a = s.return), a !== null)) {
					n = a;
					continue;
				}
				break;
			}
			if (s.child === c.child) {
				for (c = s.child; c; ) {
					if (c === n) return y(s), e;
					if (c === a) return y(s), t;
					c = c.sibling;
				}
				throw Error(o(188));
			}
			if (n.return !== a.return) (n = s), (a = c);
			else {
				for (var p = !1, b = s.child; b; ) {
					if (b === n) {
						(p = !0), (n = s), (a = c);
						break;
					}
					if (b === a) {
						(p = !0), (a = s), (n = c);
						break;
					}
					b = b.sibling;
				}
				if (!p) {
					for (b = c.child; b; ) {
						if (b === n) {
							(p = !0), (n = c), (a = s);
							break;
						}
						if (b === a) {
							(p = !0), (a = c), (n = s);
							break;
						}
						b = b.sibling;
					}
					if (!p) throw Error(o(189));
				}
			}
			if (n.alternate !== a) throw Error(o(190));
		}
		if (n.tag !== 3) throw Error(o(188));
		return n.stateNode.current === n ? e : t;
	}
	function S(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e;
		for (e = e.child; e !== null; ) {
			if (((t = S(e)), t !== null)) return t;
			e = e.sibling;
		}
		return null;
	}
	var h = Object.assign,
		w = Symbol.for("react.element"),
		E = Symbol.for("react.transitional.element"),
		C = Symbol.for("react.portal"),
		j = Symbol.for("react.fragment"),
		N = Symbol.for("react.strict_mode"),
		T = Symbol.for("react.profiler"),
		z = Symbol.for("react.consumer"),
		R = Symbol.for("react.context"),
		O = Symbol.for("react.forward_ref"),
		L = Symbol.for("react.suspense"),
		Y = Symbol.for("react.suspense_list"),
		X = Symbol.for("react.memo"),
		q = Symbol.for("react.lazy"),
		J = Symbol.for("react.activity"),
		ee = Symbol.for("react.memo_cache_sentinel"),
		ce = Symbol.iterator;
	function te(e) {
		return e === null || typeof e != "object"
			? null
			: ((e = (ce && e[ce]) || e["@@iterator"]),
				typeof e == "function" ? e : null);
	}
	var se = Symbol.for("react.client.reference");
	function le(e) {
		if (e == null) return null;
		if (typeof e == "function")
			return e.$$typeof === se ? null : e.displayName || e.name || null;
		if (typeof e == "string") return e;
		switch (e) {
			case j:
				return "Fragment";
			case T:
				return "Profiler";
			case N:
				return "StrictMode";
			case L:
				return "Suspense";
			case Y:
				return "SuspenseList";
			case J:
				return "Activity";
		}
		if (typeof e == "object")
			switch (e.$$typeof) {
				case C:
					return "Portal";
				case R:
					return e.displayName || "Context";
				case z:
					return (e._context.displayName || "Context") + ".Consumer";
				case O: {
					var t = e.render;
					return (
						(e = e.displayName),
						e ||
							((e = t.displayName || t.name || ""),
							(e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef")),
						e
					);
				}
				case X:
					return (
						(t = e.displayName || null), t !== null ? t : le(e.type) || "Memo"
					);
				case q:
					(t = e._payload), (e = e._init);
					try {
						return le(e(t));
					} catch {}
			}
		return null;
	}
	var ue = Array.isArray,
		M = i.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
		H = r.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
		Z = { pending: !1, data: null, method: null, action: null },
		re = [],
		F = -1;
	function A(e) {
		return { current: e };
	}
	function G(e) {
		0 > F || ((e.current = re[F]), (re[F] = null), F--);
	}
	function W(e, t) {
		F++, (re[F] = e.current), (e.current = t);
	}
	var $ = A(null),
		ne = A(null),
		oe = A(null),
		ge = A(null);
	function fe(e, t) {
		switch ((W(oe, t), W(ne, e), W($, null), t.nodeType)) {
			case 9:
			case 11:
				e = (e = t.documentElement) && (e = e.namespaceURI) ? Kp(e) : 0;
				break;
			default:
				if (((e = t.tagName), (t = t.namespaceURI)))
					(t = Kp(t)), (e = Zp(t, e));
				else
					switch (e) {
						case "svg":
							e = 1;
							break;
						case "math":
							e = 2;
							break;
						default:
							e = 0;
					}
		}
		G($), W($, e);
	}
	function ae() {
		G($), G(ne), G(oe);
	}
	function Ve(e) {
		e.memoizedState !== null && W(ge, e);
		var t = $.current,
			n = Zp(t, e.type);
		t !== n && (W(ne, e), W($, n));
	}
	function Ce(e) {
		ne.current === e && (G($), G(ne)),
			ge.current === e && (G(ge), (Or._currentValue = Z));
	}
	var xe, je;
	function Ke(e) {
		if (xe === void 0)
			try {
				throw Error();
			} catch (n) {
				var t = n.stack.trim().match(/\n( *(at )?)/);
				(xe = (t && t[1]) || ""),
					(je =
						-1 <
						n.stack.indexOf(`
    at`)
							? " (<anonymous>)"
							: -1 < n.stack.indexOf("@")
								? "@unknown:0:0"
								: "");
			}
		return (
			`
` +
			xe +
			e +
			je
		);
	}
	var Ot = !1;
	function Yt(e, t) {
		if (!e || Ot) return "";
		Ot = !0;
		var n = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			var a = {
				DetermineComponentFrameRoot: () => {
					try {
						if (t) {
							var K = () => {
								throw Error();
							};
							if (
								(Object.defineProperty(K.prototype, "props", {
									set: () => {
										throw Error();
									},
								}),
								typeof Reflect == "object" && Reflect.construct)
							) {
								try {
									Reflect.construct(K, []);
								} catch (Q) {
									var V = Q;
								}
								Reflect.construct(e, [], K);
							} else {
								try {
									K.call();
								} catch (Q) {
									V = Q;
								}
								e.call(K.prototype);
							}
						} else {
							try {
								throw Error();
							} catch (Q) {
								V = Q;
							}
							(K = e()) && typeof K.catch == "function" && K.catch(() => {});
						}
					} catch (Q) {
						if (Q && V && typeof Q.stack == "string") return [Q.stack, V.stack];
					}
					return [null, null];
				},
			};
			a.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
			var s = Object.getOwnPropertyDescriptor(
				a.DetermineComponentFrameRoot,
				"name",
			);
			s &&
				s.configurable &&
				Object.defineProperty(a.DetermineComponentFrameRoot, "name", {
					value: "DetermineComponentFrameRoot",
				});
			var c = a.DetermineComponentFrameRoot(),
				p = c[0],
				b = c[1];
			if (p && b) {
				var _ = p.split(`
`),
					U = b.split(`
`);
				for (
					s = a = 0;
					a < _.length && !_[a].includes("DetermineComponentFrameRoot");
				)
					a++;
				for (; s < U.length && !U[s].includes("DetermineComponentFrameRoot"); )
					s++;
				if (a === _.length || s === U.length)
					for (
						a = _.length - 1, s = U.length - 1;
						1 <= a && 0 <= s && _[a] !== U[s];
					)
						s--;
				for (; 1 <= a && 0 <= s; a--, s--)
					if (_[a] !== U[s]) {
						if (a !== 1 || s !== 1)
							do
								if ((a--, s--, 0 > s || _[a] !== U[s])) {
									var P =
										`
` + _[a].replace(" at new ", " at ");
									return (
										e.displayName &&
											P.includes("<anonymous>") &&
											(P = P.replace("<anonymous>", e.displayName)),
										P
									);
								}
							while (1 <= a && 0 <= s);
						break;
					}
			}
		} finally {
			(Ot = !1), (Error.prepareStackTrace = n);
		}
		return (n = e ? e.displayName || e.name : "") ? Ke(n) : "";
	}
	function Gt(e, t) {
		switch (e.tag) {
			case 26:
			case 27:
			case 5:
				return Ke(e.type);
			case 16:
				return Ke("Lazy");
			case 13:
				return e.child !== t && t !== null
					? Ke("Suspense Fallback")
					: Ke("Suspense");
			case 19:
				return Ke("SuspenseList");
			case 0:
			case 15:
				return Yt(e.type, !1);
			case 11:
				return Yt(e.type.render, !1);
			case 1:
				return Yt(e.type, !0);
			case 31:
				return Ke("Activity");
			default:
				return "";
		}
	}
	function Nn(e) {
		try {
			var t = "",
				n = null;
			do (t += Gt(e, n)), (n = e), (e = e.return);
			while (e);
			return t;
		} catch (a) {
			return (
				`
Error generating stack: ` +
				a.message +
				`
` +
				a.stack
			);
		}
	}
	var Lt = Object.prototype.hasOwnProperty,
		cl = l.unstable_scheduleCallback,
		ul = l.unstable_cancelCallback,
		nt = l.unstable_shouldYield,
		Wr = l.unstable_requestPaint,
		ct = l.unstable_now,
		Fs = l.unstable_getCurrentPriorityLevel,
		eo = l.unstable_ImmediatePriority,
		fl = l.unstable_UserBlockingPriority,
		Xl = l.unstable_NormalPriority,
		to = l.unstable_LowPriority,
		Ql = l.unstable_IdlePriority,
		wa = l.log,
		no = l.unstable_setDisableYieldValue,
		un = null,
		Bt = null;
	function Mn(e) {
		if (
			(typeof wa == "function" && no(e),
			Bt && typeof Bt.setStrictMode == "function")
		)
			try {
				Bt.setStrictMode(un, e);
			} catch {}
	}
	var Dt = Math.clz32 ? Math.clz32 : Js,
		ao = Math.log,
		fn = Math.LN2;
	function Js(e) {
		return (e >>>= 0), e === 0 ? 32 : (31 - ((ao(e) / fn) | 0)) | 0;
	}
	var Ea = 256,
		Wt = 262144,
		dl = 4194304;
	function Qn(e) {
		var t = e & 42;
		if (t !== 0) return t;
		switch (e & -e) {
			case 1:
				return 1;
			case 2:
				return 2;
			case 4:
				return 4;
			case 8:
				return 8;
			case 16:
				return 16;
			case 32:
				return 32;
			case 64:
				return 64;
			case 128:
				return 128;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
				return e & 261888;
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
				return e & 3932160;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				return e & 62914560;
			case 67108864:
				return 67108864;
			case 134217728:
				return 134217728;
			case 268435456:
				return 268435456;
			case 536870912:
				return 536870912;
			case 1073741824:
				return 0;
			default:
				return e;
		}
	}
	function ml(e, t, n) {
		var a = e.pendingLanes;
		if (a === 0) return 0;
		var s = 0,
			c = e.suspendedLanes,
			p = e.pingedLanes;
		e = e.warmLanes;
		var b = a & 134217727;
		return (
			b !== 0
				? ((a = b & ~c),
					a !== 0
						? (s = Qn(a))
						: ((p &= b),
							p !== 0
								? (s = Qn(p))
								: n || ((n = b & ~e), n !== 0 && (s = Qn(n)))))
				: ((b = a & ~c),
					b !== 0
						? (s = Qn(b))
						: p !== 0
							? (s = Qn(p))
							: n || ((n = a & ~e), n !== 0 && (s = Qn(n)))),
			s === 0
				? 0
				: t !== 0 &&
						t !== s &&
						(t & c) === 0 &&
						((c = s & -s),
						(n = t & -t),
						c >= n || (c === 32 && (n & 4194048) !== 0))
					? t
					: s
		);
	}
	function Na(e, t) {
		return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
	}
	function be(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 4:
			case 8:
			case 64:
				return t + 250;
			case 16:
			case 32:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
				return t + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				return -1;
			case 67108864:
			case 134217728:
			case 268435456:
			case 536870912:
			case 1073741824:
				return -1;
			default:
				return -1;
		}
	}
	function it() {
		var e = dl;
		return (dl <<= 1), (dl & 62914560) === 0 && (dl = 4194304), e;
	}
	function ut(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function ft(e, t) {
		(e.pendingLanes |= t),
			t !== 268435456 &&
				((e.suspendedLanes = 0), (e.pingedLanes = 0), (e.warmLanes = 0));
	}
	function hl(e, t, n, a, s, c) {
		var p = e.pendingLanes;
		(e.pendingLanes = n),
			(e.suspendedLanes = 0),
			(e.pingedLanes = 0),
			(e.warmLanes = 0),
			(e.expiredLanes &= n),
			(e.entangledLanes &= n),
			(e.errorRecoveryDisabledLanes &= n),
			(e.shellSuspendCounter = 0);
		var b = e.entanglements,
			_ = e.expirationTimes,
			U = e.hiddenUpdates;
		for (n = p & ~n; 0 < n; ) {
			var P = 31 - Dt(n),
				K = 1 << P;
			(b[P] = 0), (_[P] = -1);
			var V = U[P];
			if (V !== null)
				for (U[P] = null, P = 0; P < V.length; P++) {
					var Q = V[P];
					Q !== null && (Q.lane &= -536870913);
				}
			n &= ~K;
		}
		a !== 0 && dt(e, a, 0),
			c !== 0 && s === 0 && e.tag !== 0 && (e.suspendedLanes |= c & ~(p & ~t));
	}
	function dt(e, t, n) {
		(e.pendingLanes |= t), (e.suspendedLanes &= ~t);
		var a = 31 - Dt(t);
		(e.entangledLanes |= t),
			(e.entanglements[a] = e.entanglements[a] | 1073741824 | (n & 261930));
	}
	function Ut(e, t) {
		var n = (e.entangledLanes |= t);
		for (e = e.entanglements; n; ) {
			var a = 31 - Dt(n),
				s = 1 << a;
			(s & t) | (e[a] & t) && (e[a] |= t), (n &= ~s);
		}
	}
	function en(e, t) {
		var n = t & -t;
		return (
			(n = (n & 42) !== 0 ? 1 : pl(n)),
			(n & (e.suspendedLanes | t)) !== 0 ? 0 : n
		);
	}
	function pl(e) {
		switch (e) {
			case 2:
				e = 1;
				break;
			case 8:
				e = 4;
				break;
			case 32:
				e = 16;
				break;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				e = 128;
				break;
			case 268435456:
				e = 134217728;
				break;
			default:
				e = 0;
		}
		return e;
	}
	function qt(e) {
		return (
			(e &= -e),
			2 < e ? (8 < e ? ((e & 134217727) !== 0 ? 32 : 268435456) : 8) : 2
		);
	}
	function Pl() {
		var e = H.p;
		return e !== 0 ? e : ((e = window.event), e === void 0 ? 32 : yg(e.type));
	}
	function zd(e, t) {
		var n = H.p;
		try {
			return (H.p = e), t();
		} finally {
			H.p = n;
		}
	}
	var Ca = Math.random().toString(36).slice(2),
		Tt = "__reactFiber$" + Ca,
		Xt = "__reactProps$" + Ca,
		Il = "__reactContainer$" + Ca,
		Ws = "__reactEvents$" + Ca,
		hx = "__reactListeners$" + Ca,
		px = "__reactHandles$" + Ca,
		kd = "__reactResources$" + Ca,
		Ii = "__reactMarker$" + Ca;
	function ec(e) {
		delete e[Tt], delete e[Xt], delete e[Ws], delete e[hx], delete e[px];
	}
	function Kl(e) {
		var t = e[Tt];
		if (t) return t;
		for (var n = e.parentNode; n; ) {
			if ((t = n[Il] || n[Tt])) {
				if (
					((n = t.alternate),
					t.child !== null || (n !== null && n.child !== null))
				)
					for (e = ng(e); e !== null; ) {
						if ((n = e[Tt])) return n;
						e = ng(e);
					}
				return t;
			}
			(e = n), (n = e.parentNode);
		}
		return null;
	}
	function Zl(e) {
		if ((e = e[Tt] || e[Il])) {
			var t = e.tag;
			if (
				t === 5 ||
				t === 6 ||
				t === 13 ||
				t === 31 ||
				t === 26 ||
				t === 27 ||
				t === 3
			)
				return e;
		}
		return null;
	}
	function Ki(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
		throw Error(o(33));
	}
	function $l(e) {
		var t = e[kd];
		return (
			t ||
				(t = e[kd] =
					{ hoistableStyles: new Map(), hoistableScripts: new Map() }),
			t
		);
	}
	function wt(e) {
		e[Ii] = !0;
	}
	var Ld = new Set(),
		Bd = {};
	function gl(e, t) {
		Fl(e, t), Fl(e + "Capture", t);
	}
	function Fl(e, t) {
		for (Bd[e] = t, e = 0; e < t.length; e++) Ld.add(t[e]);
	}
	var gx =
			/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
		Ud = {},
		Hd = {};
	function vx(e) {
		return Lt.call(Hd, e)
			? !0
			: Lt.call(Ud, e)
				? !1
				: gx.test(e)
					? (Hd[e] = !0)
					: ((Ud[e] = !0), !1);
	}
	function lo(e, t, n) {
		if (vx(t))
			if (n === null) e.removeAttribute(t);
			else {
				switch (typeof n) {
					case "undefined":
					case "function":
					case "symbol":
						e.removeAttribute(t);
						return;
					case "boolean": {
						var a = t.toLowerCase().slice(0, 5);
						if (a !== "data-" && a !== "aria-") {
							e.removeAttribute(t);
							return;
						}
					}
				}
				e.setAttribute(t, "" + n);
			}
	}
	function io(e, t, n) {
		if (n === null) e.removeAttribute(t);
		else {
			switch (typeof n) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(t);
					return;
			}
			e.setAttribute(t, "" + n);
		}
	}
	function Pn(e, t, n, a) {
		if (a === null) e.removeAttribute(n);
		else {
			switch (typeof a) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(n);
					return;
			}
			e.setAttributeNS(t, n, "" + a);
		}
	}
	function dn(e) {
		switch (typeof e) {
			case "bigint":
			case "boolean":
			case "number":
			case "string":
			case "undefined":
				return e;
			case "object":
				return e;
			default:
				return "";
		}
	}
	function Vd(e) {
		var t = e.type;
		return (
			(e = e.nodeName) &&
			e.toLowerCase() === "input" &&
			(t === "checkbox" || t === "radio")
		);
	}
	function yx(e, t, n) {
		var a = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
		if (
			!Object.hasOwn(e, t) &&
			typeof a < "u" &&
			typeof a.get == "function" &&
			typeof a.set == "function"
		) {
			var s = a.get,
				c = a.set;
			return (
				Object.defineProperty(e, t, {
					configurable: !0,
					get: function () {
						return s.call(this);
					},
					set: function (p) {
						(n = "" + p), c.call(this, p);
					},
				}),
				Object.defineProperty(e, t, { enumerable: a.enumerable }),
				{
					getValue: () => n,
					setValue: (p) => {
						n = "" + p;
					},
					stopTracking: () => {
						(e._valueTracker = null), delete e[t];
					},
				}
			);
		}
	}
	function tc(e) {
		if (!e._valueTracker) {
			var t = Vd(e) ? "checked" : "value";
			e._valueTracker = yx(e, t, "" + e[t]);
		}
	}
	function Yd(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(),
			a = "";
		return (
			e && (a = Vd(e) ? (e.checked ? "true" : "false") : e.value),
			(e = a),
			e !== n ? (t.setValue(e), !0) : !1
		);
	}
	function ro(e) {
		if (
			((e = e || (typeof document < "u" ? document : void 0)), typeof e > "u")
		)
			return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	var xx = /[\n"\\]/g;
	function mn(e) {
		return e.replace(xx, (t) => "\\" + t.charCodeAt(0).toString(16) + " ");
	}
	function nc(e, t, n, a, s, c, p, b) {
		(e.name = ""),
			p != null &&
			typeof p != "function" &&
			typeof p != "symbol" &&
			typeof p != "boolean"
				? (e.type = p)
				: e.removeAttribute("type"),
			t != null
				? p === "number"
					? ((t === 0 && e.value === "") || e.value != t) &&
						(e.value = "" + dn(t))
					: e.value !== "" + dn(t) && (e.value = "" + dn(t))
				: (p !== "submit" && p !== "reset") || e.removeAttribute("value"),
			t != null
				? ac(e, p, dn(t))
				: n != null
					? ac(e, p, dn(n))
					: a != null && e.removeAttribute("value"),
			s == null && c != null && (e.defaultChecked = !!c),
			s != null &&
				(e.checked = s && typeof s != "function" && typeof s != "symbol"),
			b != null &&
			typeof b != "function" &&
			typeof b != "symbol" &&
			typeof b != "boolean"
				? (e.name = "" + dn(b))
				: e.removeAttribute("name");
	}
	function Gd(e, t, n, a, s, c, p, b) {
		if (
			(c != null &&
				typeof c != "function" &&
				typeof c != "symbol" &&
				typeof c != "boolean" &&
				(e.type = c),
			t != null || n != null)
		) {
			if (!((c !== "submit" && c !== "reset") || t != null)) {
				tc(e);
				return;
			}
			(n = n != null ? "" + dn(n) : ""),
				(t = t != null ? "" + dn(t) : n),
				b || t === e.value || (e.value = t),
				(e.defaultValue = t);
		}
		(a = a ?? s),
			(a = typeof a != "function" && typeof a != "symbol" && !!a),
			(e.checked = b ? e.checked : !!a),
			(e.defaultChecked = !!a),
			p != null &&
				typeof p != "function" &&
				typeof p != "symbol" &&
				typeof p != "boolean" &&
				(e.name = p),
			tc(e);
	}
	function ac(e, t, n) {
		(t === "number" && ro(e.ownerDocument) === e) ||
			e.defaultValue === "" + n ||
			(e.defaultValue = "" + n);
	}
	function Jl(e, t, n, a) {
		if (((e = e.options), t)) {
			t = {};
			for (var s = 0; s < n.length; s++) t["$" + n[s]] = !0;
			for (n = 0; n < e.length; n++)
				(s = Object.hasOwn(t, "$" + e[n].value)),
					e[n].selected !== s && (e[n].selected = s),
					s && a && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + dn(n), t = null, s = 0; s < e.length; s++) {
				if (e[s].value === n) {
					(e[s].selected = !0), a && (e[s].defaultSelected = !0);
					return;
				}
				t !== null || e[s].disabled || (t = e[s]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function qd(e, t, n) {
		if (
			t != null &&
			((t = "" + dn(t)), t !== e.value && (e.value = t), n == null)
		) {
			e.defaultValue !== t && (e.defaultValue = t);
			return;
		}
		e.defaultValue = n != null ? "" + dn(n) : "";
	}
	function Xd(e, t, n, a) {
		if (t == null) {
			if (a != null) {
				if (n != null) throw Error(o(92));
				if (ue(a)) {
					if (1 < a.length) throw Error(o(93));
					a = a[0];
				}
				n = a;
			}
			n == null && (n = ""), (t = n);
		}
		(n = dn(t)),
			(e.defaultValue = n),
			(a = e.textContent),
			a === n && a !== "" && a !== null && (e.value = a),
			tc(e);
	}
	function Wl(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var bx = new Set(
		"animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
			" ",
		),
	);
	function Qd(e, t, n) {
		var a = t.indexOf("--") === 0;
		n == null || typeof n == "boolean" || n === ""
			? a
				? e.setProperty(t, "")
				: t === "float"
					? (e.cssFloat = "")
					: (e[t] = "")
			: a
				? e.setProperty(t, n)
				: typeof n != "number" || n === 0 || bx.has(t)
					? t === "float"
						? (e.cssFloat = n)
						: (e[t] = ("" + n).trim())
					: (e[t] = n + "px");
	}
	function Pd(e, t, n) {
		if (t != null && typeof t != "object") throw Error(o(62));
		if (((e = e.style), n != null)) {
			for (var a in n)
				!Object.hasOwn(n, a) ||
					(t != null && Object.hasOwn(t, a)) ||
					(a.indexOf("--") === 0
						? e.setProperty(a, "")
						: a === "float"
							? (e.cssFloat = "")
							: (e[a] = ""));
			for (var s in t)
				(a = t[s]), Object.hasOwn(t, s) && n[s] !== a && Qd(e, s, a);
		} else for (var c in t) Object.hasOwn(t, c) && Qd(e, c, t[c]);
	}
	function lc(e) {
		if (e.indexOf("-") === -1) return !1;
		switch (e) {
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph":
				return !1;
			default:
				return !0;
		}
	}
	var Sx = new Map([
			["acceptCharset", "accept-charset"],
			["htmlFor", "for"],
			["httpEquiv", "http-equiv"],
			["crossOrigin", "crossorigin"],
			["accentHeight", "accent-height"],
			["alignmentBaseline", "alignment-baseline"],
			["arabicForm", "arabic-form"],
			["baselineShift", "baseline-shift"],
			["capHeight", "cap-height"],
			["clipPath", "clip-path"],
			["clipRule", "clip-rule"],
			["colorInterpolation", "color-interpolation"],
			["colorInterpolationFilters", "color-interpolation-filters"],
			["colorProfile", "color-profile"],
			["colorRendering", "color-rendering"],
			["dominantBaseline", "dominant-baseline"],
			["enableBackground", "enable-background"],
			["fillOpacity", "fill-opacity"],
			["fillRule", "fill-rule"],
			["floodColor", "flood-color"],
			["floodOpacity", "flood-opacity"],
			["fontFamily", "font-family"],
			["fontSize", "font-size"],
			["fontSizeAdjust", "font-size-adjust"],
			["fontStretch", "font-stretch"],
			["fontStyle", "font-style"],
			["fontVariant", "font-variant"],
			["fontWeight", "font-weight"],
			["glyphName", "glyph-name"],
			["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
			["glyphOrientationVertical", "glyph-orientation-vertical"],
			["horizAdvX", "horiz-adv-x"],
			["horizOriginX", "horiz-origin-x"],
			["imageRendering", "image-rendering"],
			["letterSpacing", "letter-spacing"],
			["lightingColor", "lighting-color"],
			["markerEnd", "marker-end"],
			["markerMid", "marker-mid"],
			["markerStart", "marker-start"],
			["overlinePosition", "overline-position"],
			["overlineThickness", "overline-thickness"],
			["paintOrder", "paint-order"],
			["panose-1", "panose-1"],
			["pointerEvents", "pointer-events"],
			["renderingIntent", "rendering-intent"],
			["shapeRendering", "shape-rendering"],
			["stopColor", "stop-color"],
			["stopOpacity", "stop-opacity"],
			["strikethroughPosition", "strikethrough-position"],
			["strikethroughThickness", "strikethrough-thickness"],
			["strokeDasharray", "stroke-dasharray"],
			["strokeDashoffset", "stroke-dashoffset"],
			["strokeLinecap", "stroke-linecap"],
			["strokeLinejoin", "stroke-linejoin"],
			["strokeMiterlimit", "stroke-miterlimit"],
			["strokeOpacity", "stroke-opacity"],
			["strokeWidth", "stroke-width"],
			["textAnchor", "text-anchor"],
			["textDecoration", "text-decoration"],
			["textRendering", "text-rendering"],
			["transformOrigin", "transform-origin"],
			["underlinePosition", "underline-position"],
			["underlineThickness", "underline-thickness"],
			["unicodeBidi", "unicode-bidi"],
			["unicodeRange", "unicode-range"],
			["unitsPerEm", "units-per-em"],
			["vAlphabetic", "v-alphabetic"],
			["vHanging", "v-hanging"],
			["vIdeographic", "v-ideographic"],
			["vMathematical", "v-mathematical"],
			["vectorEffect", "vector-effect"],
			["vertAdvY", "vert-adv-y"],
			["vertOriginX", "vert-origin-x"],
			["vertOriginY", "vert-origin-y"],
			["wordSpacing", "word-spacing"],
			["writingMode", "writing-mode"],
			["xmlnsXlink", "xmlns:xlink"],
			["xHeight", "x-height"],
		]),
		wx =
			/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
	function oo(e) {
		return wx.test("" + e)
			? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
			: e;
	}
	function In() {}
	var ic = null;
	function rc(e) {
		return (
			(e = e.target || e.srcElement || window),
			e.correspondingUseElement && (e = e.correspondingUseElement),
			e.nodeType === 3 ? e.parentNode : e
		);
	}
	var ei = null,
		ti = null;
	function Id(e) {
		var t = Zl(e);
		if (t && (e = t.stateNode)) {
			var n = e[Xt] || null;
			switch (((e = t.stateNode), t.type)) {
				case "input":
					if (
						(nc(
							e,
							n.value,
							n.defaultValue,
							n.defaultValue,
							n.checked,
							n.defaultChecked,
							n.type,
							n.name,
						),
						(t = n.name),
						n.type === "radio" && t != null)
					) {
						for (n = e; n.parentNode; ) n = n.parentNode;
						for (
							n = n.querySelectorAll(
								'input[name="' + mn("" + t) + '"][type="radio"]',
							),
								t = 0;
							t < n.length;
							t++
						) {
							var a = n[t];
							if (a !== e && a.form === e.form) {
								var s = a[Xt] || null;
								if (!s) throw Error(o(90));
								nc(
									a,
									s.value,
									s.defaultValue,
									s.defaultValue,
									s.checked,
									s.defaultChecked,
									s.type,
									s.name,
								);
							}
						}
						for (t = 0; t < n.length; t++)
							(a = n[t]), a.form === e.form && Yd(a);
					}
					break;
				case "textarea":
					qd(e, n.value, n.defaultValue);
					break;
				case "select":
					(t = n.value), t != null && Jl(e, !!n.multiple, t, !1);
			}
		}
	}
	var oc = !1;
	function Kd(e, t, n) {
		if (oc) return e(t, n);
		oc = !0;
		try {
			var a = e(t);
			return a;
		} finally {
			if (
				((oc = !1),
				(ei !== null || ti !== null) &&
					(Zo(), ei && ((t = ei), (e = ti), (ti = ei = null), Id(t), e)))
			)
				for (t = 0; t < e.length; t++) Id(e[t]);
		}
	}
	function Zi(e, t) {
		var n = e.stateNode;
		if (n === null) return null;
		var a = n[Xt] || null;
		if (a === null) return null;
		n = a[t];
		switch (t) {
			case "onClick":
			case "onClickCapture":
			case "onDoubleClick":
			case "onDoubleClickCapture":
			case "onMouseDown":
			case "onMouseDownCapture":
			case "onMouseMove":
			case "onMouseMoveCapture":
			case "onMouseUp":
			case "onMouseUpCapture":
			case "onMouseEnter":
				(a = !a.disabled) ||
					((e = e.type),
					(a = !(
						e === "button" ||
						e === "input" ||
						e === "select" ||
						e === "textarea"
					))),
					(e = !a);
				break;
			default:
				e = !1;
		}
		if (e) return null;
		if (n && typeof n != "function") throw Error(o(231, t, typeof n));
		return n;
	}
	var Kn = !(
			typeof window > "u" ||
			typeof window.document > "u" ||
			typeof window.document.createElement > "u"
		),
		sc = !1;
	if (Kn)
		try {
			var $i = {};
			Object.defineProperty($i, "passive", {
				get: () => {
					sc = !0;
				},
			}),
				window.addEventListener("test", $i, $i),
				window.removeEventListener("test", $i, $i);
		} catch {
			sc = !1;
		}
	var ja = null,
		cc = null,
		so = null;
	function Zd() {
		if (so) return so;
		var e,
			t = cc,
			n = t.length,
			a,
			s = "value" in ja ? ja.value : ja.textContent,
			c = s.length;
		for (e = 0; e < n && t[e] === s[e]; e++);
		var p = n - e;
		for (a = 1; a <= p && t[n - a] === s[c - a]; a++);
		return (so = s.slice(e, 1 < a ? 1 - a : void 0));
	}
	function co(e) {
		var t = e.keyCode;
		return (
			"charCode" in e
				? ((e = e.charCode), e === 0 && t === 13 && (e = 13))
				: (e = t),
			e === 10 && (e = 13),
			32 <= e || e === 13 ? e : 0
		);
	}
	function uo() {
		return !0;
	}
	function $d() {
		return !1;
	}
	function Qt(e) {
		function t(n, a, s, c, p) {
			(this._reactName = n),
				(this._targetInst = s),
				(this.type = a),
				(this.nativeEvent = c),
				(this.target = p),
				(this.currentTarget = null);
			for (var b in e)
				Object.hasOwn(e, b) && ((n = e[b]), (this[b] = n ? n(c) : c[b]));
			return (
				(this.isDefaultPrevented = (
					c.defaultPrevented != null
						? c.defaultPrevented
						: c.returnValue === !1
				)
					? uo
					: $d),
				(this.isPropagationStopped = $d),
				this
			);
		}
		return (
			h(t.prototype, {
				preventDefault: function () {
					this.defaultPrevented = !0;
					var n = this.nativeEvent;
					n &&
						(n.preventDefault
							? n.preventDefault()
							: typeof n.returnValue != "unknown" && (n.returnValue = !1),
						(this.isDefaultPrevented = uo));
				},
				stopPropagation: function () {
					var n = this.nativeEvent;
					n &&
						(n.stopPropagation
							? n.stopPropagation()
							: typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0),
						(this.isPropagationStopped = uo));
				},
				persist: () => {},
				isPersistent: uo,
			}),
			t
		);
	}
	var vl = {
			eventPhase: 0,
			bubbles: 0,
			cancelable: 0,
			timeStamp: (e) => e.timeStamp || Date.now(),
			defaultPrevented: 0,
			isTrusted: 0,
		},
		fo = Qt(vl),
		Fi = h({}, vl, { view: 0, detail: 0 }),
		Ex = Qt(Fi),
		uc,
		fc,
		Ji,
		mo = h({}, Fi, {
			screenX: 0,
			screenY: 0,
			clientX: 0,
			clientY: 0,
			pageX: 0,
			pageY: 0,
			ctrlKey: 0,
			shiftKey: 0,
			altKey: 0,
			metaKey: 0,
			getModifierState: mc,
			button: 0,
			buttons: 0,
			relatedTarget: (e) =>
				e.relatedTarget === void 0
					? e.fromElement === e.srcElement
						? e.toElement
						: e.fromElement
					: e.relatedTarget,
			movementX: (e) =>
				"movementX" in e
					? e.movementX
					: (e !== Ji &&
							(Ji && e.type === "mousemove"
								? ((uc = e.screenX - Ji.screenX), (fc = e.screenY - Ji.screenY))
								: (fc = uc = 0),
							(Ji = e)),
						uc),
			movementY: (e) => ("movementY" in e ? e.movementY : fc),
		}),
		Fd = Qt(mo),
		Nx = h({}, mo, { dataTransfer: 0 }),
		Cx = Qt(Nx),
		jx = h({}, Fi, { relatedTarget: 0 }),
		dc = Qt(jx),
		Tx = h({}, vl, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
		_x = Qt(Tx),
		Ax = h({}, vl, {
			clipboardData: (e) =>
				"clipboardData" in e ? e.clipboardData : window.clipboardData,
		}),
		Rx = Qt(Ax),
		Mx = h({}, vl, { data: 0 }),
		Jd = Qt(Mx),
		Ox = {
			Esc: "Escape",
			Spacebar: " ",
			Left: "ArrowLeft",
			Up: "ArrowUp",
			Right: "ArrowRight",
			Down: "ArrowDown",
			Del: "Delete",
			Win: "OS",
			Menu: "ContextMenu",
			Apps: "ContextMenu",
			Scroll: "ScrollLock",
			MozPrintableKey: "Unidentified",
		},
		Dx = {
			8: "Backspace",
			9: "Tab",
			12: "Clear",
			13: "Enter",
			16: "Shift",
			17: "Control",
			18: "Alt",
			19: "Pause",
			20: "CapsLock",
			27: "Escape",
			32: " ",
			33: "PageUp",
			34: "PageDown",
			35: "End",
			36: "Home",
			37: "ArrowLeft",
			38: "ArrowUp",
			39: "ArrowRight",
			40: "ArrowDown",
			45: "Insert",
			46: "Delete",
			112: "F1",
			113: "F2",
			114: "F3",
			115: "F4",
			116: "F5",
			117: "F6",
			118: "F7",
			119: "F8",
			120: "F9",
			121: "F10",
			122: "F11",
			123: "F12",
			144: "NumLock",
			145: "ScrollLock",
			224: "Meta",
		},
		zx = {
			Alt: "altKey",
			Control: "ctrlKey",
			Meta: "metaKey",
			Shift: "shiftKey",
		};
	function kx(e) {
		var t = this.nativeEvent;
		return t.getModifierState
			? t.getModifierState(e)
			: (e = zx[e])
				? !!t[e]
				: !1;
	}
	function mc() {
		return kx;
	}
	var Lx = h({}, Fi, {
			key: (e) => {
				if (e.key) {
					var t = Ox[e.key] || e.key;
					if (t !== "Unidentified") return t;
				}
				return e.type === "keypress"
					? ((e = co(e)), e === 13 ? "Enter" : String.fromCharCode(e))
					: e.type === "keydown" || e.type === "keyup"
						? Dx[e.keyCode] || "Unidentified"
						: "";
			},
			code: 0,
			location: 0,
			ctrlKey: 0,
			shiftKey: 0,
			altKey: 0,
			metaKey: 0,
			repeat: 0,
			locale: 0,
			getModifierState: mc,
			charCode: (e) => (e.type === "keypress" ? co(e) : 0),
			keyCode: (e) =>
				e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0,
			which: (e) =>
				e.type === "keypress"
					? co(e)
					: e.type === "keydown" || e.type === "keyup"
						? e.keyCode
						: 0,
		}),
		Bx = Qt(Lx),
		Ux = h({}, mo, {
			pointerId: 0,
			width: 0,
			height: 0,
			pressure: 0,
			tangentialPressure: 0,
			tiltX: 0,
			tiltY: 0,
			twist: 0,
			pointerType: 0,
			isPrimary: 0,
		}),
		Wd = Qt(Ux),
		Hx = h({}, Fi, {
			touches: 0,
			targetTouches: 0,
			changedTouches: 0,
			altKey: 0,
			metaKey: 0,
			ctrlKey: 0,
			shiftKey: 0,
			getModifierState: mc,
		}),
		Vx = Qt(Hx),
		Yx = h({}, vl, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
		Gx = Qt(Yx),
		qx = h({}, mo, {
			deltaX: (e) =>
				"deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0,
			deltaY: (e) =>
				"deltaY" in e
					? e.deltaY
					: "wheelDeltaY" in e
						? -e.wheelDeltaY
						: "wheelDelta" in e
							? -e.wheelDelta
							: 0,
			deltaZ: 0,
			deltaMode: 0,
		}),
		Xx = Qt(qx),
		Qx = h({}, vl, { newState: 0, oldState: 0 }),
		Px = Qt(Qx),
		Ix = [9, 13, 27, 32],
		hc = Kn && "CompositionEvent" in window,
		Wi = null;
	Kn && "documentMode" in document && (Wi = document.documentMode);
	var Kx = Kn && "TextEvent" in window && !Wi,
		em = Kn && (!hc || (Wi && 8 < Wi && 11 >= Wi)),
		tm = " ",
		nm = !1;
	function am(e, t) {
		switch (e) {
			case "keyup":
				return Ix.indexOf(t.keyCode) !== -1;
			case "keydown":
				return t.keyCode !== 229;
			case "keypress":
			case "mousedown":
			case "focusout":
				return !0;
			default:
				return !1;
		}
	}
	function lm(e) {
		return (e = e.detail), typeof e == "object" && "data" in e ? e.data : null;
	}
	var ni = !1;
	function Zx(e, t) {
		switch (e) {
			case "compositionend":
				return lm(t);
			case "keypress":
				return t.which !== 32 ? null : ((nm = !0), tm);
			case "textInput":
				return (e = t.data), e === tm && nm ? null : e;
			default:
				return null;
		}
	}
	function $x(e, t) {
		if (ni)
			return e === "compositionend" || (!hc && am(e, t))
				? ((e = Zd()), (so = cc = ja = null), (ni = !1), e)
				: null;
		switch (e) {
			case "paste":
				return null;
			case "keypress":
				if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
					if (t.char && 1 < t.char.length) return t.char;
					if (t.which) return String.fromCharCode(t.which);
				}
				return null;
			case "compositionend":
				return em && t.locale !== "ko" ? null : t.data;
			default:
				return null;
		}
	}
	var Fx = {
		color: !0,
		date: !0,
		datetime: !0,
		"datetime-local": !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0,
	};
	function im(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!Fx[e.type] : t === "textarea";
	}
	function rm(e, t, n, a) {
		ei ? (ti ? ti.push(a) : (ti = [a])) : (ei = a),
			(t = ns(t, "onChange")),
			0 < t.length &&
				((n = new fo("onChange", "change", null, n, a)),
				e.push({ event: n, listeners: t }));
	}
	var er = null,
		tr = null;
	function Jx(e) {
		Gp(e, 0);
	}
	function ho(e) {
		var t = Ki(e);
		if (Yd(t)) return e;
	}
	function om(e, t) {
		if (e === "change") return t;
	}
	var sm = !1;
	if (Kn) {
		var pc;
		if (Kn) {
			var gc = "oninput" in document;
			if (!gc) {
				var cm = document.createElement("div");
				cm.setAttribute("oninput", "return;"),
					(gc = typeof cm.oninput == "function");
			}
			pc = gc;
		} else pc = !1;
		sm = pc && (!document.documentMode || 9 < document.documentMode);
	}
	function um() {
		er && (er.detachEvent("onpropertychange", fm), (tr = er = null));
	}
	function fm(e) {
		if (e.propertyName === "value" && ho(tr)) {
			var t = [];
			rm(t, tr, e, rc(e)), Kd(Jx, t);
		}
	}
	function Wx(e, t, n) {
		e === "focusin"
			? (um(), (er = t), (tr = n), er.attachEvent("onpropertychange", fm))
			: e === "focusout" && um();
	}
	function eb(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown")
			return ho(tr);
	}
	function tb(e, t) {
		if (e === "click") return ho(t);
	}
	function nb(e, t) {
		if (e === "input" || e === "change") return ho(t);
	}
	function ab(e, t) {
		return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
	}
	var tn = typeof Object.is == "function" ? Object.is : ab;
	function nr(e, t) {
		if (tn(e, t)) return !0;
		if (
			typeof e != "object" ||
			e === null ||
			typeof t != "object" ||
			t === null
		)
			return !1;
		var n = Object.keys(e),
			a = Object.keys(t);
		if (n.length !== a.length) return !1;
		for (a = 0; a < n.length; a++) {
			var s = n[a];
			if (!Lt.call(t, s) || !tn(e[s], t[s])) return !1;
		}
		return !0;
	}
	function dm(e) {
		for (; e && e.firstChild; ) e = e.firstChild;
		return e;
	}
	function mm(e, t) {
		var n = dm(e);
		e = 0;
		for (var a; n; ) {
			if (n.nodeType === 3) {
				if (((a = e + n.textContent.length), e <= t && a >= t))
					return { node: n, offset: t - e };
				e = a;
			}
			e: {
				for (; n; ) {
					if (n.nextSibling) {
						n = n.nextSibling;
						break e;
					}
					n = n.parentNode;
				}
				n = void 0;
			}
			n = dm(n);
		}
	}
	function hm(e, t) {
		return e && t
			? e === t
				? !0
				: e && e.nodeType === 3
					? !1
					: t && t.nodeType === 3
						? hm(e, t.parentNode)
						: "contains" in e
							? e.contains(t)
							: e.compareDocumentPosition
								? !!(e.compareDocumentPosition(t) & 16)
								: !1
			: !1;
	}
	function pm(e) {
		e =
			e != null &&
			e.ownerDocument != null &&
			e.ownerDocument.defaultView != null
				? e.ownerDocument.defaultView
				: window;
		for (var t = ro(e.document); t instanceof e.HTMLIFrameElement; ) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = ro(e.document);
		}
		return t;
	}
	function vc(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return (
			t &&
			((t === "input" &&
				(e.type === "text" ||
					e.type === "search" ||
					e.type === "tel" ||
					e.type === "url" ||
					e.type === "password")) ||
				t === "textarea" ||
				e.contentEditable === "true")
		);
	}
	var lb = Kn && "documentMode" in document && 11 >= document.documentMode,
		ai = null,
		yc = null,
		ar = null,
		xc = !1;
	function gm(e, t, n) {
		var a =
			n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		xc ||
			ai == null ||
			ai !== ro(a) ||
			((a = ai),
			"selectionStart" in a && vc(a)
				? (a = { start: a.selectionStart, end: a.selectionEnd })
				: ((a = (
						(a.ownerDocument && a.ownerDocument.defaultView) ||
						window
					).getSelection()),
					(a = {
						anchorNode: a.anchorNode,
						anchorOffset: a.anchorOffset,
						focusNode: a.focusNode,
						focusOffset: a.focusOffset,
					})),
			(ar && nr(ar, a)) ||
				((ar = a),
				(a = ns(yc, "onSelect")),
				0 < a.length &&
					((t = new fo("onSelect", "select", null, t, n)),
					e.push({ event: t, listeners: a }),
					(t.target = ai))));
	}
	function yl(e, t) {
		var n = {};
		return (
			(n[e.toLowerCase()] = t.toLowerCase()),
			(n["Webkit" + e] = "webkit" + t),
			(n["Moz" + e] = "moz" + t),
			n
		);
	}
	var li = {
			animationend: yl("Animation", "AnimationEnd"),
			animationiteration: yl("Animation", "AnimationIteration"),
			animationstart: yl("Animation", "AnimationStart"),
			transitionrun: yl("Transition", "TransitionRun"),
			transitionstart: yl("Transition", "TransitionStart"),
			transitioncancel: yl("Transition", "TransitionCancel"),
			transitionend: yl("Transition", "TransitionEnd"),
		},
		bc = {},
		vm = {};
	Kn &&
		((vm = document.createElement("div").style),
		"AnimationEvent" in window ||
			(delete li.animationend.animation,
			delete li.animationiteration.animation,
			delete li.animationstart.animation),
		"TransitionEvent" in window || delete li.transitionend.transition);
	function xl(e) {
		if (bc[e]) return bc[e];
		if (!li[e]) return e;
		var t = li[e],
			n;
		for (n in t) if (Object.hasOwn(t, n) && n in vm) return (bc[e] = t[n]);
		return e;
	}
	var ym = xl("animationend"),
		xm = xl("animationiteration"),
		bm = xl("animationstart"),
		ib = xl("transitionrun"),
		rb = xl("transitionstart"),
		ob = xl("transitioncancel"),
		Sm = xl("transitionend"),
		wm = new Map(),
		Sc =
			"abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
				" ",
			);
	Sc.push("scrollEnd");
	function Cn(e, t) {
		wm.set(e, t), gl(t, [e]);
	}
	var po =
			typeof reportError == "function"
				? reportError
				: (e) => {
						if (
							typeof window == "object" &&
							typeof window.ErrorEvent == "function"
						) {
							var t = new window.ErrorEvent("error", {
								bubbles: !0,
								cancelable: !0,
								message:
									typeof e == "object" &&
									e !== null &&
									typeof e.message == "string"
										? String(e.message)
										: String(e),
								error: e,
							});
							if (!window.dispatchEvent(t)) return;
						} else if (
							typeof process == "object" &&
							typeof process.emit == "function"
						) {
							process.emit("uncaughtException", e);
							return;
						}
						console.error(e);
					},
		hn = [],
		ii = 0,
		wc = 0;
	function go() {
		for (var e = ii, t = (wc = ii = 0); t < e; ) {
			var n = hn[t];
			hn[t++] = null;
			var a = hn[t];
			hn[t++] = null;
			var s = hn[t];
			hn[t++] = null;
			var c = hn[t];
			if (((hn[t++] = null), a !== null && s !== null)) {
				var p = a.pending;
				p === null ? (s.next = s) : ((s.next = p.next), (p.next = s)),
					(a.pending = s);
			}
			c !== 0 && Em(n, s, c);
		}
	}
	function vo(e, t, n, a) {
		(hn[ii++] = e),
			(hn[ii++] = t),
			(hn[ii++] = n),
			(hn[ii++] = a),
			(wc |= a),
			(e.lanes |= a),
			(e = e.alternate),
			e !== null && (e.lanes |= a);
	}
	function Ec(e, t, n, a) {
		return vo(e, t, n, a), yo(e);
	}
	function bl(e, t) {
		return vo(e, null, null, t), yo(e);
	}
	function Em(e, t, n) {
		e.lanes |= n;
		var a = e.alternate;
		a !== null && (a.lanes |= n);
		for (var s = !1, c = e.return; c !== null; )
			(c.childLanes |= n),
				(a = c.alternate),
				a !== null && (a.childLanes |= n),
				c.tag === 22 &&
					((e = c.stateNode), e === null || e._visibility & 1 || (s = !0)),
				(e = c),
				(c = c.return);
		return e.tag === 3
			? ((c = e.stateNode),
				s &&
					t !== null &&
					((s = 31 - Dt(n)),
					(e = c.hiddenUpdates),
					(a = e[s]),
					a === null ? (e[s] = [t]) : a.push(t),
					(t.lane = n | 536870912)),
				c)
			: null;
	}
	function yo(e) {
		if (50 < Cr) throw ((Cr = 0), (Ou = null), Error(o(185)));
		for (var t = e.return; t !== null; ) (e = t), (t = e.return);
		return e.tag === 3 ? e.stateNode : null;
	}
	var ri = {};
	function sb(e, t, n, a) {
		(this.tag = e),
			(this.key = n),
			(this.sibling =
				this.child =
				this.return =
				this.stateNode =
				this.type =
				this.elementType =
					null),
			(this.index = 0),
			(this.refCleanup = this.ref = null),
			(this.pendingProps = t),
			(this.dependencies =
				this.memoizedState =
				this.updateQueue =
				this.memoizedProps =
					null),
			(this.mode = a),
			(this.subtreeFlags = this.flags = 0),
			(this.deletions = null),
			(this.childLanes = this.lanes = 0),
			(this.alternate = null);
	}
	function nn(e, t, n, a) {
		return new sb(e, t, n, a);
	}
	function Nc(e) {
		return (e = e.prototype), !(!e || !e.isReactComponent);
	}
	function Zn(e, t) {
		var n = e.alternate;
		return (
			n === null
				? ((n = nn(e.tag, t, e.key, e.mode)),
					(n.elementType = e.elementType),
					(n.type = e.type),
					(n.stateNode = e.stateNode),
					(n.alternate = e),
					(e.alternate = n))
				: ((n.pendingProps = t),
					(n.type = e.type),
					(n.flags = 0),
					(n.subtreeFlags = 0),
					(n.deletions = null)),
			(n.flags = e.flags & 65011712),
			(n.childLanes = e.childLanes),
			(n.lanes = e.lanes),
			(n.child = e.child),
			(n.memoizedProps = e.memoizedProps),
			(n.memoizedState = e.memoizedState),
			(n.updateQueue = e.updateQueue),
			(t = e.dependencies),
			(n.dependencies =
				t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
			(n.sibling = e.sibling),
			(n.index = e.index),
			(n.ref = e.ref),
			(n.refCleanup = e.refCleanup),
			n
		);
	}
	function Nm(e, t) {
		e.flags &= 65011714;
		var n = e.alternate;
		return (
			n === null
				? ((e.childLanes = 0),
					(e.lanes = t),
					(e.child = null),
					(e.subtreeFlags = 0),
					(e.memoizedProps = null),
					(e.memoizedState = null),
					(e.updateQueue = null),
					(e.dependencies = null),
					(e.stateNode = null))
				: ((e.childLanes = n.childLanes),
					(e.lanes = n.lanes),
					(e.child = n.child),
					(e.subtreeFlags = 0),
					(e.deletions = null),
					(e.memoizedProps = n.memoizedProps),
					(e.memoizedState = n.memoizedState),
					(e.updateQueue = n.updateQueue),
					(e.type = n.type),
					(t = n.dependencies),
					(e.dependencies =
						t === null
							? null
							: { lanes: t.lanes, firstContext: t.firstContext })),
			e
		);
	}
	function xo(e, t, n, a, s, c) {
		var p = 0;
		if (((a = e), typeof e == "function")) Nc(e) && (p = 1);
		else if (typeof e == "string")
			p = m1(e, n, $.current)
				? 26
				: e === "html" || e === "head" || e === "body"
					? 27
					: 5;
		else
			e: switch (e) {
				case J:
					return (e = nn(31, n, t, s)), (e.elementType = J), (e.lanes = c), e;
				case j:
					return Sl(n.children, s, c, t);
				case N:
					(p = 8), (s |= 24);
					break;
				case T:
					return (
						(e = nn(12, n, t, s | 2)), (e.elementType = T), (e.lanes = c), e
					);
				case L:
					return (e = nn(13, n, t, s)), (e.elementType = L), (e.lanes = c), e;
				case Y:
					return (e = nn(19, n, t, s)), (e.elementType = Y), (e.lanes = c), e;
				default:
					if (typeof e == "object" && e !== null)
						switch (e.$$typeof) {
							case R:
								p = 10;
								break e;
							case z:
								p = 9;
								break e;
							case O:
								p = 11;
								break e;
							case X:
								p = 14;
								break e;
							case q:
								(p = 16), (a = null);
								break e;
						}
					(p = 29),
						(n = Error(o(130, e === null ? "null" : typeof e, ""))),
						(a = null);
			}
		return (
			(t = nn(p, n, t, s)), (t.elementType = e), (t.type = a), (t.lanes = c), t
		);
	}
	function Sl(e, t, n, a) {
		return (e = nn(7, e, a, t)), (e.lanes = n), e;
	}
	function Cc(e, t, n) {
		return (e = nn(6, e, null, t)), (e.lanes = n), e;
	}
	function Cm(e) {
		var t = nn(18, null, null, 0);
		return (t.stateNode = e), t;
	}
	function jc(e, t, n) {
		return (
			(t = nn(4, e.children !== null ? e.children : [], e.key, t)),
			(t.lanes = n),
			(t.stateNode = {
				containerInfo: e.containerInfo,
				pendingChildren: null,
				implementation: e.implementation,
			}),
			t
		);
	}
	var jm = new WeakMap();
	function pn(e, t) {
		if (typeof e == "object" && e !== null) {
			var n = jm.get(e);
			return n !== void 0
				? n
				: ((t = { value: e, source: t, stack: Nn(t) }), jm.set(e, t), t);
		}
		return { value: e, source: t, stack: Nn(t) };
	}
	var oi = [],
		si = 0,
		bo = null,
		lr = 0,
		gn = [],
		vn = 0,
		Ta = null,
		On = 1,
		Dn = "";
	function $n(e, t) {
		(oi[si++] = lr), (oi[si++] = bo), (bo = e), (lr = t);
	}
	function Tm(e, t, n) {
		(gn[vn++] = On), (gn[vn++] = Dn), (gn[vn++] = Ta), (Ta = e);
		var a = On;
		e = Dn;
		var s = 32 - Dt(a) - 1;
		(a &= ~(1 << s)), (n += 1);
		var c = 32 - Dt(t) + s;
		if (30 < c) {
			var p = s - (s % 5);
			(c = (a & ((1 << p) - 1)).toString(32)),
				(a >>= p),
				(s -= p),
				(On = (1 << (32 - Dt(t) + s)) | (n << s) | a),
				(Dn = c + e);
		} else (On = (1 << c) | (n << s) | a), (Dn = e);
	}
	function Tc(e) {
		e.return !== null && ($n(e, 1), Tm(e, 1, 0));
	}
	function _c(e) {
		for (; e === bo; )
			(bo = oi[--si]), (oi[si] = null), (lr = oi[--si]), (oi[si] = null);
		for (; e === Ta; )
			(Ta = gn[--vn]),
				(gn[vn] = null),
				(Dn = gn[--vn]),
				(gn[vn] = null),
				(On = gn[--vn]),
				(gn[vn] = null);
	}
	function _m(e, t) {
		(gn[vn++] = On),
			(gn[vn++] = Dn),
			(gn[vn++] = Ta),
			(On = t.id),
			(Dn = t.overflow),
			(Ta = e);
	}
	var _t = null,
		Fe = null,
		De = !1,
		_a = null,
		yn = !1,
		Ac = Error(o(519));
	function Aa(e) {
		var t = Error(
			o(
				418,
				1 < arguments.length && arguments[1] !== void 0 && arguments[1]
					? "text"
					: "HTML",
				"",
			),
		);
		throw (ir(pn(t, e)), Ac);
	}
	function Am(e) {
		var t = e.stateNode,
			n = e.type,
			a = e.memoizedProps;
		switch (((t[Tt] = e), (t[Xt] = a), n)) {
			case "dialog":
				Re("cancel", t), Re("close", t);
				break;
			case "iframe":
			case "object":
			case "embed":
				Re("load", t);
				break;
			case "video":
			case "audio":
				for (n = 0; n < Tr.length; n++) Re(Tr[n], t);
				break;
			case "source":
				Re("error", t);
				break;
			case "img":
			case "image":
			case "link":
				Re("error", t), Re("load", t);
				break;
			case "details":
				Re("toggle", t);
				break;
			case "input":
				Re("invalid", t),
					Gd(
						t,
						a.value,
						a.defaultValue,
						a.checked,
						a.defaultChecked,
						a.type,
						a.name,
						!0,
					);
				break;
			case "select":
				Re("invalid", t);
				break;
			case "textarea":
				Re("invalid", t), Xd(t, a.value, a.defaultValue, a.children);
		}
		(n = a.children),
			(typeof n != "string" && typeof n != "number" && typeof n != "bigint") ||
			t.textContent === "" + n ||
			a.suppressHydrationWarning === !0 ||
			Pp(t.textContent, n)
				? (a.popover != null && (Re("beforetoggle", t), Re("toggle", t)),
					a.onScroll != null && Re("scroll", t),
					a.onScrollEnd != null && Re("scrollend", t),
					a.onClick != null && (t.onclick = In),
					(t = !0))
				: (t = !1),
			t || Aa(e, !0);
	}
	function Rm(e) {
		for (_t = e.return; _t; )
			switch (_t.tag) {
				case 5:
				case 31:
				case 13:
					yn = !1;
					return;
				case 27:
				case 3:
					yn = !0;
					return;
				default:
					_t = _t.return;
			}
	}
	function ci(e) {
		if (e !== _t) return !1;
		if (!De) return Rm(e), (De = !0), !1;
		var t = e.tag,
			n;
		if (
			((n = t !== 3 && t !== 27) &&
				((n = t === 5) &&
					((n = e.type),
					(n =
						!(n !== "form" && n !== "button") || Iu(e.type, e.memoizedProps))),
				(n = !n)),
			n && Fe && Aa(e),
			Rm(e),
			t === 13)
		) {
			if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
				throw Error(o(317));
			Fe = tg(e);
		} else if (t === 31) {
			if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
				throw Error(o(317));
			Fe = tg(e);
		} else
			t === 27
				? ((t = Fe), qa(e.type) ? ((e = Ju), (Ju = null), (Fe = e)) : (Fe = t))
				: (Fe = _t ? bn(e.stateNode.nextSibling) : null);
		return !0;
	}
	function wl() {
		(Fe = _t = null), (De = !1);
	}
	function Rc() {
		var e = _a;
		return (
			e !== null &&
				(Zt === null ? (Zt = e) : Zt.push.apply(Zt, e), (_a = null)),
			e
		);
	}
	function ir(e) {
		_a === null ? (_a = [e]) : _a.push(e);
	}
	var Mc = A(null),
		El = null,
		Fn = null;
	function Ra(e, t, n) {
		W(Mc, t._currentValue), (t._currentValue = n);
	}
	function Jn(e) {
		(e._currentValue = Mc.current), G(Mc);
	}
	function Oc(e, t, n) {
		for (; e !== null; ) {
			var a = e.alternate;
			if (
				((e.childLanes & t) !== t
					? ((e.childLanes |= t), a !== null && (a.childLanes |= t))
					: a !== null && (a.childLanes & t) !== t && (a.childLanes |= t),
				e === n)
			)
				break;
			e = e.return;
		}
	}
	function Dc(e, t, n, a) {
		var s = e.child;
		for (s !== null && (s.return = e); s !== null; ) {
			var c = s.dependencies;
			if (c !== null) {
				var p = s.child;
				c = c.firstContext;
				e: for (; c !== null; ) {
					var b = c;
					c = s;
					for (var _ = 0; _ < t.length; _++)
						if (b.context === t[_]) {
							(c.lanes |= n),
								(b = c.alternate),
								b !== null && (b.lanes |= n),
								Oc(c.return, n, e),
								a || (p = null);
							break e;
						}
					c = b.next;
				}
			} else if (s.tag === 18) {
				if (((p = s.return), p === null)) throw Error(o(341));
				(p.lanes |= n),
					(c = p.alternate),
					c !== null && (c.lanes |= n),
					Oc(p, n, e),
					(p = null);
			} else p = s.child;
			if (p !== null) p.return = s;
			else
				for (p = s; p !== null; ) {
					if (p === e) {
						p = null;
						break;
					}
					if (((s = p.sibling), s !== null)) {
						(s.return = p.return), (p = s);
						break;
					}
					p = p.return;
				}
			s = p;
		}
	}
	function ui(e, t, n, a) {
		e = null;
		for (var s = t, c = !1; s !== null; ) {
			if (!c) {
				if ((s.flags & 524288) !== 0) c = !0;
				else if ((s.flags & 262144) !== 0) break;
			}
			if (s.tag === 10) {
				var p = s.alternate;
				if (p === null) throw Error(o(387));
				if (((p = p.memoizedProps), p !== null)) {
					var b = s.type;
					tn(s.pendingProps.value, p.value) ||
						(e !== null ? e.push(b) : (e = [b]));
				}
			} else if (s === ge.current) {
				if (((p = s.alternate), p === null)) throw Error(o(387));
				p.memoizedState.memoizedState !== s.memoizedState.memoizedState &&
					(e !== null ? e.push(Or) : (e = [Or]));
			}
			s = s.return;
		}
		e !== null && Dc(t, e, n, a), (t.flags |= 262144);
	}
	function So(e) {
		for (e = e.firstContext; e !== null; ) {
			if (!tn(e.context._currentValue, e.memoizedValue)) return !0;
			e = e.next;
		}
		return !1;
	}
	function Nl(e) {
		(El = e),
			(Fn = null),
			(e = e.dependencies),
			e !== null && (e.firstContext = null);
	}
	function At(e) {
		return Mm(El, e);
	}
	function wo(e, t) {
		return El === null && Nl(e), Mm(e, t);
	}
	function Mm(e, t) {
		var n = t._currentValue;
		if (((t = { context: t, memoizedValue: n, next: null }), Fn === null)) {
			if (e === null) throw Error(o(308));
			(Fn = t),
				(e.dependencies = { lanes: 0, firstContext: t }),
				(e.flags |= 524288);
		} else Fn = Fn.next = t;
		return n;
	}
	var cb =
			typeof AbortController < "u"
				? AbortController
				: function () {
						var e = [],
							t = (this.signal = {
								aborted: !1,
								addEventListener: (n, a) => {
									e.push(a);
								},
							});
						this.abort = () => {
							(t.aborted = !0), e.forEach((n) => n());
						};
					},
		ub = l.unstable_scheduleCallback,
		fb = l.unstable_NormalPriority,
		mt = {
			$$typeof: R,
			Consumer: null,
			Provider: null,
			_currentValue: null,
			_currentValue2: null,
			_threadCount: 0,
		};
	function zc() {
		return { controller: new cb(), data: new Map(), refCount: 0 };
	}
	function rr(e) {
		e.refCount--,
			e.refCount === 0 &&
				ub(fb, () => {
					e.controller.abort();
				});
	}
	var or = null,
		kc = 0,
		fi = 0,
		di = null;
	function db(e, t) {
		if (or === null) {
			var n = (or = []);
			(kc = 0),
				(fi = Uu()),
				(di = {
					status: "pending",
					value: void 0,
					then: (a) => {
						n.push(a);
					},
				});
		}
		return kc++, t.then(Om, Om), t;
	}
	function Om() {
		if (--kc === 0 && or !== null) {
			di !== null && (di.status = "fulfilled");
			var e = or;
			(or = null), (fi = 0), (di = null);
			for (var t = 0; t < e.length; t++) (0, e[t])();
		}
	}
	function mb(e, t) {
		var n = [],
			a = {
				status: "pending",
				value: null,
				reason: null,
				then: (s) => {
					n.push(s);
				},
			};
		return (
			e.then(
				() => {
					(a.status = "fulfilled"), (a.value = t);
					for (var s = 0; s < n.length; s++) (0, n[s])(t);
				},
				(s) => {
					for (a.status = "rejected", a.reason = s, s = 0; s < n.length; s++)
						(0, n[s])(void 0);
				},
			),
			a
		);
	}
	var Dm = M.S;
	M.S = (e, t) => {
		(gp = ct()),
			typeof t == "object" &&
				t !== null &&
				typeof t.then == "function" &&
				db(e, t),
			Dm !== null && Dm(e, t);
	};
	var Cl = A(null);
	function Lc() {
		var e = Cl.current;
		return e !== null ? e : Ze.pooledCache;
	}
	function Eo(e, t) {
		t === null ? W(Cl, Cl.current) : W(Cl, t.pool);
	}
	function zm() {
		var e = Lc();
		return e === null ? null : { parent: mt._currentValue, pool: e };
	}
	var mi = Error(o(460)),
		Bc = Error(o(474)),
		No = Error(o(542)),
		Co = { then: () => {} };
	function km(e) {
		return (e = e.status), e === "fulfilled" || e === "rejected";
	}
	function Lm(e, t, n) {
		switch (
			((n = e[n]),
			n === void 0 ? e.push(t) : n !== t && (t.then(In, In), (t = n)),
			t.status)
		) {
			case "fulfilled":
				return t.value;
			case "rejected":
				throw ((e = t.reason), Um(e), e);
			default:
				if (typeof t.status == "string") t.then(In, In);
				else {
					if (((e = Ze), e !== null && 100 < e.shellSuspendCounter))
						throw Error(o(482));
					(e = t),
						(e.status = "pending"),
						e.then(
							(a) => {
								if (t.status === "pending") {
									var s = t;
									(s.status = "fulfilled"), (s.value = a);
								}
							},
							(a) => {
								if (t.status === "pending") {
									var s = t;
									(s.status = "rejected"), (s.reason = a);
								}
							},
						);
				}
				switch (t.status) {
					case "fulfilled":
						return t.value;
					case "rejected":
						throw ((e = t.reason), Um(e), e);
				}
				throw ((Tl = t), mi);
		}
	}
	function jl(e) {
		try {
			var t = e._init;
			return t(e._payload);
		} catch (n) {
			throw n !== null && typeof n == "object" && typeof n.then == "function"
				? ((Tl = n), mi)
				: n;
		}
	}
	var Tl = null;
	function Bm() {
		if (Tl === null) throw Error(o(459));
		var e = Tl;
		return (Tl = null), e;
	}
	function Um(e) {
		if (e === mi || e === No) throw Error(o(483));
	}
	var hi = null,
		sr = 0;
	function jo(e) {
		var t = sr;
		return (sr += 1), hi === null && (hi = []), Lm(hi, e, t);
	}
	function cr(e, t) {
		(t = t.props.ref), (e.ref = t !== void 0 ? t : null);
	}
	function To(e, t) {
		throw t.$$typeof === w
			? Error(o(525))
			: ((e = Object.prototype.toString.call(t)),
				Error(
					o(
						31,
						e === "[object Object]"
							? "object with keys {" + Object.keys(t).join(", ") + "}"
							: e,
					),
				));
	}
	function Hm(e) {
		function t(k, D) {
			if (e) {
				var B = k.deletions;
				B === null ? ((k.deletions = [D]), (k.flags |= 16)) : B.push(D);
			}
		}
		function n(k, D) {
			if (!e) return null;
			for (; D !== null; ) t(k, D), (D = D.sibling);
			return null;
		}
		function a(k) {
			for (var D = new Map(); k !== null; )
				k.key !== null ? D.set(k.key, k) : D.set(k.index, k), (k = k.sibling);
			return D;
		}
		function s(k, D) {
			return (k = Zn(k, D)), (k.index = 0), (k.sibling = null), k;
		}
		function c(k, D, B) {
			return (
				(k.index = B),
				e
					? ((B = k.alternate),
						B !== null
							? ((B = B.index), B < D ? ((k.flags |= 67108866), D) : B)
							: ((k.flags |= 67108866), D))
					: ((k.flags |= 1048576), D)
			);
		}
		function p(k) {
			return e && k.alternate === null && (k.flags |= 67108866), k;
		}
		function b(k, D, B, I) {
			return D === null || D.tag !== 6
				? ((D = Cc(B, k.mode, I)), (D.return = k), D)
				: ((D = s(D, B)), (D.return = k), D);
		}
		function _(k, D, B, I) {
			var ve = B.type;
			return ve === j
				? P(k, D, B.props.children, I, B.key)
				: D !== null &&
						(D.elementType === ve ||
							(typeof ve == "object" &&
								ve !== null &&
								ve.$$typeof === q &&
								jl(ve) === D.type))
					? ((D = s(D, B.props)), cr(D, B), (D.return = k), D)
					: ((D = xo(B.type, B.key, B.props, null, k.mode, I)),
						cr(D, B),
						(D.return = k),
						D);
		}
		function U(k, D, B, I) {
			return D === null ||
				D.tag !== 4 ||
				D.stateNode.containerInfo !== B.containerInfo ||
				D.stateNode.implementation !== B.implementation
				? ((D = jc(B, k.mode, I)), (D.return = k), D)
				: ((D = s(D, B.children || [])), (D.return = k), D);
		}
		function P(k, D, B, I, ve) {
			return D === null || D.tag !== 7
				? ((D = Sl(B, k.mode, I, ve)), (D.return = k), D)
				: ((D = s(D, B)), (D.return = k), D);
		}
		function K(k, D, B) {
			if (
				(typeof D == "string" && D !== "") ||
				typeof D == "number" ||
				typeof D == "bigint"
			)
				return (D = Cc("" + D, k.mode, B)), (D.return = k), D;
			if (typeof D == "object" && D !== null) {
				switch (D.$$typeof) {
					case E:
						return (
							(B = xo(D.type, D.key, D.props, null, k.mode, B)),
							cr(B, D),
							(B.return = k),
							B
						);
					case C:
						return (D = jc(D, k.mode, B)), (D.return = k), D;
					case q:
						return (D = jl(D)), K(k, D, B);
				}
				if (ue(D) || te(D))
					return (D = Sl(D, k.mode, B, null)), (D.return = k), D;
				if (typeof D.then == "function") return K(k, jo(D), B);
				if (D.$$typeof === R) return K(k, wo(k, D), B);
				To(k, D);
			}
			return null;
		}
		function V(k, D, B, I) {
			var ve = D !== null ? D.key : null;
			if (
				(typeof B == "string" && B !== "") ||
				typeof B == "number" ||
				typeof B == "bigint"
			)
				return ve !== null ? null : b(k, D, "" + B, I);
			if (typeof B == "object" && B !== null) {
				switch (B.$$typeof) {
					case E:
						return B.key === ve ? _(k, D, B, I) : null;
					case C:
						return B.key === ve ? U(k, D, B, I) : null;
					case q:
						return (B = jl(B)), V(k, D, B, I);
				}
				if (ue(B) || te(B)) return ve !== null ? null : P(k, D, B, I, null);
				if (typeof B.then == "function") return V(k, D, jo(B), I);
				if (B.$$typeof === R) return V(k, D, wo(k, B), I);
				To(k, B);
			}
			return null;
		}
		function Q(k, D, B, I, ve) {
			if (
				(typeof I == "string" && I !== "") ||
				typeof I == "number" ||
				typeof I == "bigint"
			)
				return (k = k.get(B) || null), b(D, k, "" + I, ve);
			if (typeof I == "object" && I !== null) {
				switch (I.$$typeof) {
					case E:
						return (
							(k = k.get(I.key === null ? B : I.key) || null), _(D, k, I, ve)
						);
					case C:
						return (
							(k = k.get(I.key === null ? B : I.key) || null), U(D, k, I, ve)
						);
					case q:
						return (I = jl(I)), Q(k, D, B, I, ve);
				}
				if (ue(I) || te(I)) return (k = k.get(B) || null), P(D, k, I, ve, null);
				if (typeof I.then == "function") return Q(k, D, B, jo(I), ve);
				if (I.$$typeof === R) return Q(k, D, B, wo(D, I), ve);
				To(D, I);
			}
			return null;
		}
		function he(k, D, B, I) {
			for (
				var ve = null, Le = null, pe = D, Te = (D = 0), Oe = null;
				pe !== null && Te < B.length;
				Te++
			) {
				pe.index > Te ? ((Oe = pe), (pe = null)) : (Oe = pe.sibling);
				var Be = V(k, pe, B[Te], I);
				if (Be === null) {
					pe === null && (pe = Oe);
					break;
				}
				e && pe && Be.alternate === null && t(k, pe),
					(D = c(Be, D, Te)),
					Le === null ? (ve = Be) : (Le.sibling = Be),
					(Le = Be),
					(pe = Oe);
			}
			if (Te === B.length) return n(k, pe), De && $n(k, Te), ve;
			if (pe === null) {
				for (; Te < B.length; Te++)
					(pe = K(k, B[Te], I)),
						pe !== null &&
							((D = c(pe, D, Te)),
							Le === null ? (ve = pe) : (Le.sibling = pe),
							(Le = pe));
				return De && $n(k, Te), ve;
			}
			for (pe = a(pe); Te < B.length; Te++)
				(Oe = Q(pe, k, Te, B[Te], I)),
					Oe !== null &&
						(e &&
							Oe.alternate !== null &&
							pe.delete(Oe.key === null ? Te : Oe.key),
						(D = c(Oe, D, Te)),
						Le === null ? (ve = Oe) : (Le.sibling = Oe),
						(Le = Oe));
			return e && pe.forEach((Ka) => t(k, Ka)), De && $n(k, Te), ve;
		}
		function ye(k, D, B, I) {
			if (B == null) throw Error(o(151));
			for (
				var ve = null,
					Le = null,
					pe = D,
					Te = (D = 0),
					Oe = null,
					Be = B.next();
				pe !== null && !Be.done;
				Te++, Be = B.next()
			) {
				pe.index > Te ? ((Oe = pe), (pe = null)) : (Oe = pe.sibling);
				var Ka = V(k, pe, Be.value, I);
				if (Ka === null) {
					pe === null && (pe = Oe);
					break;
				}
				e && pe && Ka.alternate === null && t(k, pe),
					(D = c(Ka, D, Te)),
					Le === null ? (ve = Ka) : (Le.sibling = Ka),
					(Le = Ka),
					(pe = Oe);
			}
			if (Be.done) return n(k, pe), De && $n(k, Te), ve;
			if (pe === null) {
				for (; !Be.done; Te++, Be = B.next())
					(Be = K(k, Be.value, I)),
						Be !== null &&
							((D = c(Be, D, Te)),
							Le === null ? (ve = Be) : (Le.sibling = Be),
							(Le = Be));
				return De && $n(k, Te), ve;
			}
			for (pe = a(pe); !Be.done; Te++, Be = B.next())
				(Be = Q(pe, k, Te, Be.value, I)),
					Be !== null &&
						(e &&
							Be.alternate !== null &&
							pe.delete(Be.key === null ? Te : Be.key),
						(D = c(Be, D, Te)),
						Le === null ? (ve = Be) : (Le.sibling = Be),
						(Le = Be));
			return e && pe.forEach((N1) => t(k, N1)), De && $n(k, Te), ve;
		}
		function Ie(k, D, B, I) {
			if (
				(typeof B == "object" &&
					B !== null &&
					B.type === j &&
					B.key === null &&
					(B = B.props.children),
				typeof B == "object" && B !== null)
			) {
				switch (B.$$typeof) {
					case E:
						e: {
							for (var ve = B.key; D !== null; ) {
								if (D.key === ve) {
									if (((ve = B.type), ve === j)) {
										if (D.tag === 7) {
											n(k, D.sibling),
												(I = s(D, B.props.children)),
												(I.return = k),
												(k = I);
											break e;
										}
									} else if (
										D.elementType === ve ||
										(typeof ve == "object" &&
											ve !== null &&
											ve.$$typeof === q &&
											jl(ve) === D.type)
									) {
										n(k, D.sibling),
											(I = s(D, B.props)),
											cr(I, B),
											(I.return = k),
											(k = I);
										break e;
									}
									n(k, D);
									break;
								} else t(k, D);
								D = D.sibling;
							}
							B.type === j
								? ((I = Sl(B.props.children, k.mode, I, B.key)),
									(I.return = k),
									(k = I))
								: ((I = xo(B.type, B.key, B.props, null, k.mode, I)),
									cr(I, B),
									(I.return = k),
									(k = I));
						}
						return p(k);
					case C:
						e: {
							for (ve = B.key; D !== null; ) {
								if (D.key === ve)
									if (
										D.tag === 4 &&
										D.stateNode.containerInfo === B.containerInfo &&
										D.stateNode.implementation === B.implementation
									) {
										n(k, D.sibling),
											(I = s(D, B.children || [])),
											(I.return = k),
											(k = I);
										break e;
									} else {
										n(k, D);
										break;
									}
								else t(k, D);
								D = D.sibling;
							}
							(I = jc(B, k.mode, I)), (I.return = k), (k = I);
						}
						return p(k);
					case q:
						return (B = jl(B)), Ie(k, D, B, I);
				}
				if (ue(B)) return he(k, D, B, I);
				if (te(B)) {
					if (((ve = te(B)), typeof ve != "function")) throw Error(o(150));
					return (B = ve.call(B)), ye(k, D, B, I);
				}
				if (typeof B.then == "function") return Ie(k, D, jo(B), I);
				if (B.$$typeof === R) return Ie(k, D, wo(k, B), I);
				To(k, B);
			}
			return (typeof B == "string" && B !== "") ||
				typeof B == "number" ||
				typeof B == "bigint"
				? ((B = "" + B),
					D !== null && D.tag === 6
						? (n(k, D.sibling), (I = s(D, B)), (I.return = k), (k = I))
						: (n(k, D), (I = Cc(B, k.mode, I)), (I.return = k), (k = I)),
					p(k))
				: n(k, D);
		}
		return (k, D, B, I) => {
			try {
				sr = 0;
				var ve = Ie(k, D, B, I);
				return (hi = null), ve;
			} catch (pe) {
				if (pe === mi || pe === No) throw pe;
				var Le = nn(29, pe, null, k.mode);
				return (Le.lanes = I), (Le.return = k), Le;
			} finally {
			}
		};
	}
	var _l = Hm(!0),
		Vm = Hm(!1),
		Ma = !1;
	function Uc(e) {
		e.updateQueue = {
			baseState: e.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: { pending: null, lanes: 0, hiddenCallbacks: null },
			callbacks: null,
		};
	}
	function Hc(e, t) {
		(e = e.updateQueue),
			t.updateQueue === e &&
				(t.updateQueue = {
					baseState: e.baseState,
					firstBaseUpdate: e.firstBaseUpdate,
					lastBaseUpdate: e.lastBaseUpdate,
					shared: e.shared,
					callbacks: null,
				});
	}
	function Oa(e) {
		return { lane: e, tag: 0, payload: null, callback: null, next: null };
	}
	function Da(e, t, n) {
		var a = e.updateQueue;
		if (a === null) return null;
		if (((a = a.shared), (Ye & 2) !== 0)) {
			var s = a.pending;
			return (
				s === null ? (t.next = t) : ((t.next = s.next), (s.next = t)),
				(a.pending = t),
				(t = yo(e)),
				Em(e, null, n),
				t
			);
		}
		return vo(e, a, t, n), yo(e);
	}
	function ur(e, t, n) {
		if (
			((t = t.updateQueue), t !== null && ((t = t.shared), (n & 4194048) !== 0))
		) {
			var a = t.lanes;
			(a &= e.pendingLanes), (n |= a), (t.lanes = n), Ut(e, n);
		}
	}
	function Vc(e, t) {
		var n = e.updateQueue,
			a = e.alternate;
		if (a !== null && ((a = a.updateQueue), n === a)) {
			var s = null,
				c = null;
			if (((n = n.firstBaseUpdate), n !== null)) {
				do {
					var p = {
						lane: n.lane,
						tag: n.tag,
						payload: n.payload,
						callback: null,
						next: null,
					};
					c === null ? (s = c = p) : (c = c.next = p), (n = n.next);
				} while (n !== null);
				c === null ? (s = c = t) : (c = c.next = t);
			} else s = c = t;
			(n = {
				baseState: a.baseState,
				firstBaseUpdate: s,
				lastBaseUpdate: c,
				shared: a.shared,
				callbacks: a.callbacks,
			}),
				(e.updateQueue = n);
			return;
		}
		(e = n.lastBaseUpdate),
			e === null ? (n.firstBaseUpdate = t) : (e.next = t),
			(n.lastBaseUpdate = t);
	}
	var Yc = !1;
	function fr() {
		if (Yc) {
			var e = di;
			if (e !== null) throw e;
		}
	}
	function dr(e, t, n, a) {
		Yc = !1;
		var s = e.updateQueue;
		Ma = !1;
		var c = s.firstBaseUpdate,
			p = s.lastBaseUpdate,
			b = s.shared.pending;
		if (b !== null) {
			s.shared.pending = null;
			var _ = b,
				U = _.next;
			(_.next = null), p === null ? (c = U) : (p.next = U), (p = _);
			var P = e.alternate;
			P !== null &&
				((P = P.updateQueue),
				(b = P.lastBaseUpdate),
				b !== p &&
					(b === null ? (P.firstBaseUpdate = U) : (b.next = U),
					(P.lastBaseUpdate = _)));
		}
		if (c !== null) {
			var K = s.baseState;
			(p = 0), (P = U = _ = null), (b = c);
			do {
				var V = b.lane & -536870913,
					Q = V !== b.lane;
				if (Q ? (Me & V) === V : (a & V) === V) {
					V !== 0 && V === fi && (Yc = !0),
						P !== null &&
							(P = P.next =
								{
									lane: 0,
									tag: b.tag,
									payload: b.payload,
									callback: null,
									next: null,
								});
					e: {
						var he = e,
							ye = b;
						V = t;
						var Ie = n;
						switch (ye.tag) {
							case 1:
								if (((he = ye.payload), typeof he == "function")) {
									K = he.call(Ie, K, V);
									break e;
								}
								K = he;
								break e;
							case 3:
								he.flags = (he.flags & -65537) | 128;
							case 0:
								if (
									((he = ye.payload),
									(V = typeof he == "function" ? he.call(Ie, K, V) : he),
									V == null)
								)
									break e;
								K = h({}, K, V);
								break e;
							case 2:
								Ma = !0;
						}
					}
					(V = b.callback),
						V !== null &&
							((e.flags |= 64),
							Q && (e.flags |= 8192),
							(Q = s.callbacks),
							Q === null ? (s.callbacks = [V]) : Q.push(V));
				} else
					(Q = {
						lane: V,
						tag: b.tag,
						payload: b.payload,
						callback: b.callback,
						next: null,
					}),
						P === null ? ((U = P = Q), (_ = K)) : (P = P.next = Q),
						(p |= V);
				if (((b = b.next), b === null)) {
					if (((b = s.shared.pending), b === null)) break;
					(Q = b),
						(b = Q.next),
						(Q.next = null),
						(s.lastBaseUpdate = Q),
						(s.shared.pending = null);
				}
			} while (!0);
			P === null && (_ = K),
				(s.baseState = _),
				(s.firstBaseUpdate = U),
				(s.lastBaseUpdate = P),
				c === null && (s.shared.lanes = 0),
				(Ua |= p),
				(e.lanes = p),
				(e.memoizedState = K);
		}
	}
	function Ym(e, t) {
		if (typeof e != "function") throw Error(o(191, e));
		e.call(t);
	}
	function Gm(e, t) {
		var n = e.callbacks;
		if (n !== null)
			for (e.callbacks = null, e = 0; e < n.length; e++) Ym(n[e], t);
	}
	var pi = A(null),
		_o = A(0);
	function qm(e, t) {
		(e = oa), W(_o, e), W(pi, t), (oa = e | t.baseLanes);
	}
	function Gc() {
		W(_o, oa), W(pi, pi.current);
	}
	function qc() {
		(oa = _o.current), G(pi), G(_o);
	}
	var an = A(null),
		xn = null;
	function za(e) {
		var t = e.alternate;
		W(rt, rt.current & 1),
			W(an, e),
			xn === null &&
				(t === null || pi.current !== null || t.memoizedState !== null) &&
				(xn = e);
	}
	function Xc(e) {
		W(rt, rt.current), W(an, e), xn === null && (xn = e);
	}
	function Xm(e) {
		e.tag === 22
			? (W(rt, rt.current), W(an, e), xn === null && (xn = e))
			: ka();
	}
	function ka() {
		W(rt, rt.current), W(an, an.current);
	}
	function ln(e) {
		G(an), xn === e && (xn = null), G(rt);
	}
	var rt = A(0);
	function Ao(e) {
		for (var t = e; t !== null; ) {
			if (t.tag === 13) {
				var n = t.memoizedState;
				if (n !== null && ((n = n.dehydrated), n === null || $u(n) || Fu(n)))
					return t;
			} else if (
				t.tag === 19 &&
				(t.memoizedProps.revealOrder === "forwards" ||
					t.memoizedProps.revealOrder === "backwards" ||
					t.memoizedProps.revealOrder === "unstable_legacy-backwards" ||
					t.memoizedProps.revealOrder === "together")
			) {
				if ((t.flags & 128) !== 0) return t;
			} else if (t.child !== null) {
				(t.child.return = t), (t = t.child);
				continue;
			}
			if (t === e) break;
			for (; t.sibling === null; ) {
				if (t.return === null || t.return === e) return null;
				t = t.return;
			}
			(t.sibling.return = t.return), (t = t.sibling);
		}
		return null;
	}
	var Wn = 0,
		Ee = null,
		Qe = null,
		ht = null,
		Ro = !1,
		gi = !1,
		Al = !1,
		Mo = 0,
		mr = 0,
		vi = null,
		hb = 0;
	function at() {
		throw Error(o(321));
	}
	function Qc(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++)
			if (!tn(e[n], t[n])) return !1;
		return !0;
	}
	function Pc(e, t, n, a, s, c) {
		return (
			(Wn = c),
			(Ee = t),
			(t.memoizedState = null),
			(t.updateQueue = null),
			(t.lanes = 0),
			(M.H = e === null || e.memoizedState === null ? Th : ou),
			(Al = !1),
			(c = n(a, s)),
			(Al = !1),
			gi && (c = Pm(t, n, a, s)),
			Qm(e),
			c
		);
	}
	function Qm(e) {
		M.H = gr;
		var t = Qe !== null && Qe.next !== null;
		if (((Wn = 0), (ht = Qe = Ee = null), (Ro = !1), (mr = 0), (vi = null), t))
			throw Error(o(300));
		e === null ||
			pt ||
			((e = e.dependencies), e !== null && So(e) && (pt = !0));
	}
	function Pm(e, t, n, a) {
		Ee = e;
		var s = 0;
		do {
			if ((gi && (vi = null), (mr = 0), (gi = !1), 25 <= s))
				throw Error(o(301));
			if (((s += 1), (ht = Qe = null), e.updateQueue != null)) {
				var c = e.updateQueue;
				(c.lastEffect = null),
					(c.events = null),
					(c.stores = null),
					c.memoCache != null && (c.memoCache.index = 0);
			}
			(M.H = _h), (c = t(n, a));
		} while (gi);
		return c;
	}
	function pb() {
		var e = M.H,
			t = e.useState()[0];
		return (
			(t = typeof t.then == "function" ? hr(t) : t),
			(e = e.useState()[0]),
			(Qe !== null ? Qe.memoizedState : null) !== e && (Ee.flags |= 1024),
			t
		);
	}
	function Ic() {
		var e = Mo !== 0;
		return (Mo = 0), e;
	}
	function Kc(e, t, n) {
		(t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~n);
	}
	function Zc(e) {
		if (Ro) {
			for (e = e.memoizedState; e !== null; ) {
				var t = e.queue;
				t !== null && (t.pending = null), (e = e.next);
			}
			Ro = !1;
		}
		(Wn = 0), (ht = Qe = Ee = null), (gi = !1), (mr = Mo = 0), (vi = null);
	}
	function Ht() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null,
		};
		return ht === null ? (Ee.memoizedState = ht = e) : (ht = ht.next = e), ht;
	}
	function ot() {
		if (Qe === null) {
			var e = Ee.alternate;
			e = e !== null ? e.memoizedState : null;
		} else e = Qe.next;
		var t = ht === null ? Ee.memoizedState : ht.next;
		if (t !== null) (ht = t), (Qe = e);
		else {
			if (e === null)
				throw Ee.alternate === null ? Error(o(467)) : Error(o(310));
			(Qe = e),
				(e = {
					memoizedState: Qe.memoizedState,
					baseState: Qe.baseState,
					baseQueue: Qe.baseQueue,
					queue: Qe.queue,
					next: null,
				}),
				ht === null ? (Ee.memoizedState = ht = e) : (ht = ht.next = e);
		}
		return ht;
	}
	function Oo() {
		return { lastEffect: null, events: null, stores: null, memoCache: null };
	}
	function hr(e) {
		var t = mr;
		return (
			(mr += 1),
			vi === null && (vi = []),
			(e = Lm(vi, e, t)),
			(t = Ee),
			(ht === null ? t.memoizedState : ht.next) === null &&
				((t = t.alternate),
				(M.H = t === null || t.memoizedState === null ? Th : ou)),
			e
		);
	}
	function Do(e) {
		if (e !== null && typeof e == "object") {
			if (typeof e.then == "function") return hr(e);
			if (e.$$typeof === R) return At(e);
		}
		throw Error(o(438, String(e)));
	}
	function $c(e) {
		var t = null,
			n = Ee.updateQueue;
		if ((n !== null && (t = n.memoCache), t == null)) {
			var a = Ee.alternate;
			a !== null &&
				((a = a.updateQueue),
				a !== null &&
					((a = a.memoCache),
					a != null && (t = { data: a.data.map((s) => s.slice()), index: 0 })));
		}
		if (
			(t == null && (t = { data: [], index: 0 }),
			n === null && ((n = Oo()), (Ee.updateQueue = n)),
			(n.memoCache = t),
			(n = t.data[t.index]),
			n === void 0)
		)
			for (n = t.data[t.index] = Array(e), a = 0; a < e; a++) n[a] = ee;
		return t.index++, n;
	}
	function ea(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function zo(e) {
		var t = ot();
		return Fc(t, Qe, e);
	}
	function Fc(e, t, n) {
		var a = e.queue;
		if (a === null) throw Error(o(311));
		a.lastRenderedReducer = n;
		var s = e.baseQueue,
			c = a.pending;
		if (c !== null) {
			if (s !== null) {
				var p = s.next;
				(s.next = c.next), (c.next = p);
			}
			(t.baseQueue = s = c), (a.pending = null);
		}
		if (((c = e.baseState), s === null)) e.memoizedState = c;
		else {
			t = s.next;
			var b = (p = null),
				_ = null,
				U = t,
				P = !1;
			do {
				var K = U.lane & -536870913;
				if (K !== U.lane ? (Me & K) === K : (Wn & K) === K) {
					var V = U.revertLane;
					if (V === 0)
						_ !== null &&
							(_ = _.next =
								{
									lane: 0,
									revertLane: 0,
									gesture: null,
									action: U.action,
									hasEagerState: U.hasEagerState,
									eagerState: U.eagerState,
									next: null,
								}),
							K === fi && (P = !0);
					else if ((Wn & V) === V) {
						(U = U.next), V === fi && (P = !0);
						continue;
					} else
						(K = {
							lane: 0,
							revertLane: U.revertLane,
							gesture: null,
							action: U.action,
							hasEagerState: U.hasEagerState,
							eagerState: U.eagerState,
							next: null,
						}),
							_ === null ? ((b = _ = K), (p = c)) : (_ = _.next = K),
							(Ee.lanes |= V),
							(Ua |= V);
					(K = U.action),
						Al && n(c, K),
						(c = U.hasEagerState ? U.eagerState : n(c, K));
				} else
					(V = {
						lane: K,
						revertLane: U.revertLane,
						gesture: U.gesture,
						action: U.action,
						hasEagerState: U.hasEagerState,
						eagerState: U.eagerState,
						next: null,
					}),
						_ === null ? ((b = _ = V), (p = c)) : (_ = _.next = V),
						(Ee.lanes |= K),
						(Ua |= K);
				U = U.next;
			} while (U !== null && U !== t);
			if (
				(_ === null ? (p = c) : (_.next = b),
				!tn(c, e.memoizedState) && ((pt = !0), P && ((n = di), n !== null)))
			)
				throw n;
			(e.memoizedState = c),
				(e.baseState = p),
				(e.baseQueue = _),
				(a.lastRenderedState = c);
		}
		return s === null && (a.lanes = 0), [e.memoizedState, a.dispatch];
	}
	function Jc(e) {
		var t = ot(),
			n = t.queue;
		if (n === null) throw Error(o(311));
		n.lastRenderedReducer = e;
		var a = n.dispatch,
			s = n.pending,
			c = t.memoizedState;
		if (s !== null) {
			n.pending = null;
			var p = (s = s.next);
			do (c = e(c, p.action)), (p = p.next);
			while (p !== s);
			tn(c, t.memoizedState) || (pt = !0),
				(t.memoizedState = c),
				t.baseQueue === null && (t.baseState = c),
				(n.lastRenderedState = c);
		}
		return [c, a];
	}
	function Im(e, t, n) {
		var a = Ee,
			s = ot(),
			c = De;
		if (c) {
			if (n === void 0) throw Error(o(407));
			n = n();
		} else n = t();
		var p = !tn((Qe || s).memoizedState, n);
		if (
			(p && ((s.memoizedState = n), (pt = !0)),
			(s = s.queue),
			tu($m.bind(null, a, s, e), [e]),
			s.getSnapshot !== t || p || (ht !== null && ht.memoizedState.tag & 1))
		) {
			if (
				((a.flags |= 2048),
				yi(9, { destroy: void 0 }, Zm.bind(null, a, s, n, t), null),
				Ze === null)
			)
				throw Error(o(349));
			c || (Wn & 127) !== 0 || Km(a, t, n);
		}
		return n;
	}
	function Km(e, t, n) {
		(e.flags |= 16384),
			(e = { getSnapshot: t, value: n }),
			(t = Ee.updateQueue),
			t === null
				? ((t = Oo()), (Ee.updateQueue = t), (t.stores = [e]))
				: ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e));
	}
	function Zm(e, t, n, a) {
		(t.value = n), (t.getSnapshot = a), Fm(t) && Jm(e);
	}
	function $m(e, t, n) {
		return n(() => {
			Fm(t) && Jm(e);
		});
	}
	function Fm(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !tn(e, n);
		} catch {
			return !0;
		}
	}
	function Jm(e) {
		var t = bl(e, 2);
		t !== null && $t(t, e, 2);
	}
	function Wc(e) {
		var t = Ht();
		if (typeof e == "function") {
			var n = e;
			if (((e = n()), Al)) {
				Mn(!0);
				try {
					n();
				} finally {
					Mn(!1);
				}
			}
		}
		return (
			(t.memoizedState = t.baseState = e),
			(t.queue = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: ea,
				lastRenderedState: e,
			}),
			t
		);
	}
	function Wm(e, t, n, a) {
		return (e.baseState = n), Fc(e, Qe, typeof a == "function" ? a : ea);
	}
	function gb(e, t, n, a, s) {
		if (Bo(e)) throw Error(o(485));
		if (((e = t.action), e !== null)) {
			var c = {
				payload: s,
				action: e,
				next: null,
				isTransition: !0,
				status: "pending",
				value: null,
				reason: null,
				listeners: [],
				then: (p) => {
					c.listeners.push(p);
				},
			};
			M.T !== null ? n(!0) : (c.isTransition = !1),
				a(c),
				(n = t.pending),
				n === null
					? ((c.next = t.pending = c), eh(t, c))
					: ((c.next = n.next), (t.pending = n.next = c));
		}
	}
	function eh(e, t) {
		var n = t.action,
			a = t.payload,
			s = e.state;
		if (t.isTransition) {
			var c = M.T,
				p = {};
			M.T = p;
			try {
				var b = n(s, a),
					_ = M.S;
				_ !== null && _(p, b), th(e, t, b);
			} catch (U) {
				eu(e, t, U);
			} finally {
				c !== null && p.types !== null && (c.types = p.types), (M.T = c);
			}
		} else
			try {
				(c = n(s, a)), th(e, t, c);
			} catch (U) {
				eu(e, t, U);
			}
	}
	function th(e, t, n) {
		n !== null && typeof n == "object" && typeof n.then == "function"
			? n.then(
					(a) => {
						nh(e, t, a);
					},
					(a) => eu(e, t, a),
				)
			: nh(e, t, n);
	}
	function nh(e, t, n) {
		(t.status = "fulfilled"),
			(t.value = n),
			ah(t),
			(e.state = n),
			(t = e.pending),
			t !== null &&
				((n = t.next),
				n === t ? (e.pending = null) : ((n = n.next), (t.next = n), eh(e, n)));
	}
	function eu(e, t, n) {
		var a = e.pending;
		if (((e.pending = null), a !== null)) {
			a = a.next;
			do (t.status = "rejected"), (t.reason = n), ah(t), (t = t.next);
			while (t !== a);
		}
		e.action = null;
	}
	function ah(e) {
		e = e.listeners;
		for (var t = 0; t < e.length; t++) (0, e[t])();
	}
	function lh(e, t) {
		return t;
	}
	function ih(e, t) {
		if (De) {
			var n = Ze.formState;
			if (n !== null) {
				e: {
					var a = Ee;
					if (De) {
						if (Fe) {
							t: {
								for (var s = Fe, c = yn; s.nodeType !== 8; ) {
									if (!c) {
										s = null;
										break t;
									}
									if (((s = bn(s.nextSibling)), s === null)) {
										s = null;
										break t;
									}
								}
								(c = s.data), (s = c === "F!" || c === "F" ? s : null);
							}
							if (s) {
								(Fe = bn(s.nextSibling)), (a = s.data === "F!");
								break e;
							}
						}
						Aa(a);
					}
					a = !1;
				}
				a && (t = n[0]);
			}
		}
		return (
			(n = Ht()),
			(n.memoizedState = n.baseState = t),
			(a = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: lh,
				lastRenderedState: t,
			}),
			(n.queue = a),
			(n = Nh.bind(null, Ee, a)),
			(a.dispatch = n),
			(a = Wc(!1)),
			(c = ru.bind(null, Ee, !1, a.queue)),
			(a = Ht()),
			(s = { state: t, dispatch: null, action: e, pending: null }),
			(a.queue = s),
			(n = gb.bind(null, Ee, s, c, n)),
			(s.dispatch = n),
			(a.memoizedState = e),
			[t, n, !1]
		);
	}
	function rh(e) {
		var t = ot();
		return oh(t, Qe, e);
	}
	function oh(e, t, n) {
		if (
			((t = Fc(e, t, lh)[0]),
			(e = zo(ea)[0]),
			typeof t == "object" && t !== null && typeof t.then == "function")
		)
			try {
				var a = hr(t);
			} catch (p) {
				throw p === mi ? No : p;
			}
		else a = t;
		t = ot();
		var s = t.queue,
			c = s.dispatch;
		return (
			n !== t.memoizedState &&
				((Ee.flags |= 2048),
				yi(9, { destroy: void 0 }, vb.bind(null, s, n), null)),
			[a, c, e]
		);
	}
	function vb(e, t) {
		e.action = t;
	}
	function sh(e) {
		var t = ot(),
			n = Qe;
		if (n !== null) return oh(t, n, e);
		ot(), (t = t.memoizedState), (n = ot());
		var a = n.queue.dispatch;
		return (n.memoizedState = e), [t, a, !1];
	}
	function yi(e, t, n, a) {
		return (
			(e = { tag: e, create: n, deps: a, inst: t, next: null }),
			(t = Ee.updateQueue),
			t === null && ((t = Oo()), (Ee.updateQueue = t)),
			(n = t.lastEffect),
			n === null
				? (t.lastEffect = e.next = e)
				: ((a = n.next), (n.next = e), (e.next = a), (t.lastEffect = e)),
			e
		);
	}
	function ch() {
		return ot().memoizedState;
	}
	function ko(e, t, n, a) {
		var s = Ht();
		(Ee.flags |= e),
			(s.memoizedState = yi(
				1 | t,
				{ destroy: void 0 },
				n,
				a === void 0 ? null : a,
			));
	}
	function Lo(e, t, n, a) {
		var s = ot();
		a = a === void 0 ? null : a;
		var c = s.memoizedState.inst;
		Qe !== null && a !== null && Qc(a, Qe.memoizedState.deps)
			? (s.memoizedState = yi(t, c, n, a))
			: ((Ee.flags |= e), (s.memoizedState = yi(1 | t, c, n, a)));
	}
	function uh(e, t) {
		ko(8390656, 8, e, t);
	}
	function tu(e, t) {
		Lo(2048, 8, e, t);
	}
	function yb(e) {
		Ee.flags |= 4;
		var t = Ee.updateQueue;
		if (t === null) (t = Oo()), (Ee.updateQueue = t), (t.events = [e]);
		else {
			var n = t.events;
			n === null ? (t.events = [e]) : n.push(e);
		}
	}
	function fh(e) {
		var t = ot().memoizedState;
		return (
			yb({ ref: t, nextImpl: e }),
			function () {
				if ((Ye & 2) !== 0) throw Error(o(440));
				return t.impl.apply(void 0, arguments);
			}
		);
	}
	function dh(e, t) {
		return Lo(4, 2, e, t);
	}
	function mh(e, t) {
		return Lo(4, 4, e, t);
	}
	function hh(e, t) {
		if (typeof t == "function") {
			e = e();
			var n = t(e);
			return () => {
				typeof n == "function" ? n() : t(null);
			};
		}
		if (t != null)
			return (
				(e = e()),
				(t.current = e),
				() => {
					t.current = null;
				}
			);
	}
	function ph(e, t, n) {
		(n = n != null ? n.concat([e]) : null), Lo(4, 4, hh.bind(null, t, e), n);
	}
	function nu() {}
	function gh(e, t) {
		var n = ot();
		t = t === void 0 ? null : t;
		var a = n.memoizedState;
		return t !== null && Qc(t, a[1]) ? a[0] : ((n.memoizedState = [e, t]), e);
	}
	function vh(e, t) {
		var n = ot();
		t = t === void 0 ? null : t;
		var a = n.memoizedState;
		if (t !== null && Qc(t, a[1])) return a[0];
		if (((a = e()), Al)) {
			Mn(!0);
			try {
				e();
			} finally {
				Mn(!1);
			}
		}
		return (n.memoizedState = [a, t]), a;
	}
	function au(e, t, n) {
		return n === void 0 || ((Wn & 1073741824) !== 0 && (Me & 261930) === 0)
			? (e.memoizedState = t)
			: ((e.memoizedState = n), (e = yp()), (Ee.lanes |= e), (Ua |= e), n);
	}
	function yh(e, t, n, a) {
		return tn(n, t)
			? n
			: pi.current !== null
				? ((e = au(e, n, a)), tn(e, t) || (pt = !0), e)
				: (Wn & 42) === 0 || ((Wn & 1073741824) !== 0 && (Me & 261930) === 0)
					? ((pt = !0), (e.memoizedState = n))
					: ((e = yp()), (Ee.lanes |= e), (Ua |= e), t);
	}
	function xh(e, t, n, a, s) {
		var c = H.p;
		H.p = c !== 0 && 8 > c ? c : 8;
		var p = M.T,
			b = {};
		(M.T = b), ru(e, !1, t, n);
		try {
			var _ = s(),
				U = M.S;
			if (
				(U !== null && U(b, _),
				_ !== null && typeof _ == "object" && typeof _.then == "function")
			) {
				var P = mb(_, a);
				pr(e, t, P, sn(e));
			} else pr(e, t, a, sn(e));
		} catch (K) {
			pr(e, t, { then: () => {}, status: "rejected", reason: K }, sn());
		} finally {
			(H.p = c),
				p !== null && b.types !== null && (p.types = b.types),
				(M.T = p);
		}
	}
	function xb() {}
	function lu(e, t, n, a) {
		if (e.tag !== 5) throw Error(o(476));
		var s = bh(e).queue;
		xh(e, s, t, Z, n === null ? xb : () => (Sh(e), n(a)));
	}
	function bh(e) {
		var t = e.memoizedState;
		if (t !== null) return t;
		t = {
			memoizedState: Z,
			baseState: Z,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: ea,
				lastRenderedState: Z,
			},
			next: null,
		};
		var n = {};
		return (
			(t.next = {
				memoizedState: n,
				baseState: n,
				baseQueue: null,
				queue: {
					pending: null,
					lanes: 0,
					dispatch: null,
					lastRenderedReducer: ea,
					lastRenderedState: n,
				},
				next: null,
			}),
			(e.memoizedState = t),
			(e = e.alternate),
			e !== null && (e.memoizedState = t),
			t
		);
	}
	function Sh(e) {
		var t = bh(e);
		t.next === null && (t = e.alternate.memoizedState),
			pr(e, t.next.queue, {}, sn());
	}
	function iu() {
		return At(Or);
	}
	function wh() {
		return ot().memoizedState;
	}
	function Eh() {
		return ot().memoizedState;
	}
	function bb(e) {
		for (var t = e.return; t !== null; ) {
			switch (t.tag) {
				case 24:
				case 3: {
					var n = sn();
					e = Oa(n);
					var a = Da(t, e, n);
					a !== null && ($t(a, t, n), ur(a, t, n)),
						(t = { cache: zc() }),
						(e.payload = t);
					return;
				}
			}
			t = t.return;
		}
	}
	function Sb(e, t, n) {
		var a = sn();
		(n = {
			lane: a,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null,
		}),
			Bo(e)
				? Ch(t, n)
				: ((n = Ec(e, t, n, a)), n !== null && ($t(n, e, a), jh(n, t, a)));
	}
	function Nh(e, t, n) {
		var a = sn();
		pr(e, t, n, a);
	}
	function pr(e, t, n, a) {
		var s = {
			lane: a,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null,
		};
		if (Bo(e)) Ch(t, s);
		else {
			var c = e.alternate;
			if (
				e.lanes === 0 &&
				(c === null || c.lanes === 0) &&
				((c = t.lastRenderedReducer), c !== null)
			)
				try {
					var p = t.lastRenderedState,
						b = c(p, n);
					if (((s.hasEagerState = !0), (s.eagerState = b), tn(b, p)))
						return vo(e, t, s, 0), Ze === null && go(), !1;
				} catch {
				} finally {
				}
			if (((n = Ec(e, t, s, a)), n !== null))
				return $t(n, e, a), jh(n, t, a), !0;
		}
		return !1;
	}
	function ru(e, t, n, a) {
		if (
			((a = {
				lane: 2,
				revertLane: Uu(),
				gesture: null,
				action: a,
				hasEagerState: !1,
				eagerState: null,
				next: null,
			}),
			Bo(e))
		) {
			if (t) throw Error(o(479));
		} else (t = Ec(e, n, a, 2)), t !== null && $t(t, e, 2);
	}
	function Bo(e) {
		var t = e.alternate;
		return e === Ee || (t !== null && t === Ee);
	}
	function Ch(e, t) {
		gi = Ro = !0;
		var n = e.pending;
		n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)),
			(e.pending = t);
	}
	function jh(e, t, n) {
		if ((n & 4194048) !== 0) {
			var a = t.lanes;
			(a &= e.pendingLanes), (n |= a), (t.lanes = n), Ut(e, n);
		}
	}
	var gr = {
		readContext: At,
		use: Do,
		useCallback: at,
		useContext: at,
		useEffect: at,
		useImperativeHandle: at,
		useLayoutEffect: at,
		useInsertionEffect: at,
		useMemo: at,
		useReducer: at,
		useRef: at,
		useState: at,
		useDebugValue: at,
		useDeferredValue: at,
		useTransition: at,
		useSyncExternalStore: at,
		useId: at,
		useHostTransitionStatus: at,
		useFormState: at,
		useActionState: at,
		useOptimistic: at,
		useMemoCache: at,
		useCacheRefresh: at,
	};
	gr.useEffectEvent = at;
	var Th = {
			readContext: At,
			use: Do,
			useCallback: (e, t) => (
				(Ht().memoizedState = [e, t === void 0 ? null : t]), e
			),
			useContext: At,
			useEffect: uh,
			useImperativeHandle: (e, t, n) => {
				(n = n != null ? n.concat([e]) : null),
					ko(4194308, 4, hh.bind(null, t, e), n);
			},
			useLayoutEffect: (e, t) => ko(4194308, 4, e, t),
			useInsertionEffect: (e, t) => {
				ko(4, 2, e, t);
			},
			useMemo: (e, t) => {
				var n = Ht();
				t = t === void 0 ? null : t;
				var a = e();
				if (Al) {
					Mn(!0);
					try {
						e();
					} finally {
						Mn(!1);
					}
				}
				return (n.memoizedState = [a, t]), a;
			},
			useReducer: (e, t, n) => {
				var a = Ht();
				if (n !== void 0) {
					var s = n(t);
					if (Al) {
						Mn(!0);
						try {
							n(t);
						} finally {
							Mn(!1);
						}
					}
				} else s = t;
				return (
					(a.memoizedState = a.baseState = s),
					(e = {
						pending: null,
						lanes: 0,
						dispatch: null,
						lastRenderedReducer: e,
						lastRenderedState: s,
					}),
					(a.queue = e),
					(e = e.dispatch = Sb.bind(null, Ee, e)),
					[a.memoizedState, e]
				);
			},
			useRef: (e) => {
				var t = Ht();
				return (e = { current: e }), (t.memoizedState = e);
			},
			useState: (e) => {
				e = Wc(e);
				var t = e.queue,
					n = Nh.bind(null, Ee, t);
				return (t.dispatch = n), [e.memoizedState, n];
			},
			useDebugValue: nu,
			useDeferredValue: (e, t) => {
				var n = Ht();
				return au(n, e, t);
			},
			useTransition: () => {
				var e = Wc(!1);
				return (
					(e = xh.bind(null, Ee, e.queue, !0, !1)),
					(Ht().memoizedState = e),
					[!1, e]
				);
			},
			useSyncExternalStore: (e, t, n) => {
				var a = Ee,
					s = Ht();
				if (De) {
					if (n === void 0) throw Error(o(407));
					n = n();
				} else {
					if (((n = t()), Ze === null)) throw Error(o(349));
					(Me & 127) !== 0 || Km(a, t, n);
				}
				s.memoizedState = n;
				var c = { value: n, getSnapshot: t };
				return (
					(s.queue = c),
					uh($m.bind(null, a, c, e), [e]),
					(a.flags |= 2048),
					yi(9, { destroy: void 0 }, Zm.bind(null, a, c, n, t), null),
					n
				);
			},
			useId: () => {
				var e = Ht(),
					t = Ze.identifierPrefix;
				if (De) {
					var n = Dn,
						a = On;
					(n = (a & ~(1 << (32 - Dt(a) - 1))).toString(32) + n),
						(t = "_" + t + "R_" + n),
						(n = Mo++),
						0 < n && (t += "H" + n.toString(32)),
						(t += "_");
				} else (n = hb++), (t = "_" + t + "r_" + n.toString(32) + "_");
				return (e.memoizedState = t);
			},
			useHostTransitionStatus: iu,
			useFormState: ih,
			useActionState: ih,
			useOptimistic: (e) => {
				var t = Ht();
				t.memoizedState = t.baseState = e;
				var n = {
					pending: null,
					lanes: 0,
					dispatch: null,
					lastRenderedReducer: null,
					lastRenderedState: null,
				};
				return (
					(t.queue = n),
					(t = ru.bind(null, Ee, !0, n)),
					(n.dispatch = t),
					[e, t]
				);
			},
			useMemoCache: $c,
			useCacheRefresh: () => (Ht().memoizedState = bb.bind(null, Ee)),
			useEffectEvent: (e) => {
				var t = Ht(),
					n = { impl: e };
				return (
					(t.memoizedState = n),
					function () {
						if ((Ye & 2) !== 0) throw Error(o(440));
						return n.impl.apply(void 0, arguments);
					}
				);
			},
		},
		ou = {
			readContext: At,
			use: Do,
			useCallback: gh,
			useContext: At,
			useEffect: tu,
			useImperativeHandle: ph,
			useInsertionEffect: dh,
			useLayoutEffect: mh,
			useMemo: vh,
			useReducer: zo,
			useRef: ch,
			useState: () => zo(ea),
			useDebugValue: nu,
			useDeferredValue: (e, t) => {
				var n = ot();
				return yh(n, Qe.memoizedState, e, t);
			},
			useTransition: () => {
				var e = zo(ea)[0],
					t = ot().memoizedState;
				return [typeof e == "boolean" ? e : hr(e), t];
			},
			useSyncExternalStore: Im,
			useId: wh,
			useHostTransitionStatus: iu,
			useFormState: rh,
			useActionState: rh,
			useOptimistic: (e, t) => {
				var n = ot();
				return Wm(n, Qe, e, t);
			},
			useMemoCache: $c,
			useCacheRefresh: Eh,
		};
	ou.useEffectEvent = fh;
	var _h = {
		readContext: At,
		use: Do,
		useCallback: gh,
		useContext: At,
		useEffect: tu,
		useImperativeHandle: ph,
		useInsertionEffect: dh,
		useLayoutEffect: mh,
		useMemo: vh,
		useReducer: Jc,
		useRef: ch,
		useState: () => Jc(ea),
		useDebugValue: nu,
		useDeferredValue: (e, t) => {
			var n = ot();
			return Qe === null ? au(n, e, t) : yh(n, Qe.memoizedState, e, t);
		},
		useTransition: () => {
			var e = Jc(ea)[0],
				t = ot().memoizedState;
			return [typeof e == "boolean" ? e : hr(e), t];
		},
		useSyncExternalStore: Im,
		useId: wh,
		useHostTransitionStatus: iu,
		useFormState: sh,
		useActionState: sh,
		useOptimistic: (e, t) => {
			var n = ot();
			return Qe !== null
				? Wm(n, Qe, e, t)
				: ((n.baseState = e), [e, n.queue.dispatch]);
		},
		useMemoCache: $c,
		useCacheRefresh: Eh,
	};
	_h.useEffectEvent = fh;
	function su(e, t, n, a) {
		(t = e.memoizedState),
			(n = n(a, t)),
			(n = n == null ? t : h({}, t, n)),
			(e.memoizedState = n),
			e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var cu = {
		enqueueSetState: (e, t, n) => {
			e = e._reactInternals;
			var a = sn(),
				s = Oa(a);
			(s.payload = t),
				n != null && (s.callback = n),
				(t = Da(e, s, a)),
				t !== null && ($t(t, e, a), ur(t, e, a));
		},
		enqueueReplaceState: (e, t, n) => {
			e = e._reactInternals;
			var a = sn(),
				s = Oa(a);
			(s.tag = 1),
				(s.payload = t),
				n != null && (s.callback = n),
				(t = Da(e, s, a)),
				t !== null && ($t(t, e, a), ur(t, e, a));
		},
		enqueueForceUpdate: (e, t) => {
			e = e._reactInternals;
			var n = sn(),
				a = Oa(n);
			(a.tag = 2),
				t != null && (a.callback = t),
				(t = Da(e, a, n)),
				t !== null && ($t(t, e, n), ur(t, e, n));
		},
	};
	function Ah(e, t, n, a, s, c, p) {
		return (
			(e = e.stateNode),
			typeof e.shouldComponentUpdate == "function"
				? e.shouldComponentUpdate(a, c, p)
				: t.prototype && t.prototype.isPureReactComponent
					? !nr(n, a) || !nr(s, c)
					: !0
		);
	}
	function Rh(e, t, n, a) {
		(e = t.state),
			typeof t.componentWillReceiveProps == "function" &&
				t.componentWillReceiveProps(n, a),
			typeof t.UNSAFE_componentWillReceiveProps == "function" &&
				t.UNSAFE_componentWillReceiveProps(n, a),
			t.state !== e && cu.enqueueReplaceState(t, t.state, null);
	}
	function Rl(e, t) {
		var n = t;
		if ("ref" in t) {
			n = {};
			for (var a in t) a !== "ref" && (n[a] = t[a]);
		}
		if ((e = e.defaultProps)) {
			n === t && (n = h({}, n));
			for (var s in e) n[s] === void 0 && (n[s] = e[s]);
		}
		return n;
	}
	function Mh(e) {
		po(e);
	}
	function Oh(e) {
		console.error(e);
	}
	function Dh(e) {
		po(e);
	}
	function Uo(e, t) {
		try {
			var n = e.onUncaughtError;
			n(t.value, { componentStack: t.stack });
		} catch (a) {
			setTimeout(() => {
				throw a;
			});
		}
	}
	function zh(e, t, n) {
		try {
			var a = e.onCaughtError;
			a(n.value, {
				componentStack: n.stack,
				errorBoundary: t.tag === 1 ? t.stateNode : null,
			});
		} catch (s) {
			setTimeout(() => {
				throw s;
			});
		}
	}
	function uu(e, t, n) {
		return (
			(n = Oa(n)),
			(n.tag = 3),
			(n.payload = { element: null }),
			(n.callback = () => {
				Uo(e, t);
			}),
			n
		);
	}
	function kh(e) {
		return (e = Oa(e)), (e.tag = 3), e;
	}
	function Lh(e, t, n, a) {
		var s = n.type.getDerivedStateFromError;
		if (typeof s == "function") {
			var c = a.value;
			(e.payload = () => s(c)),
				(e.callback = () => {
					zh(t, n, a);
				});
		}
		var p = n.stateNode;
		p !== null &&
			typeof p.componentDidCatch == "function" &&
			(e.callback = function () {
				zh(t, n, a),
					typeof s != "function" &&
						(Ha === null ? (Ha = new Set([this])) : Ha.add(this));
				var b = a.stack;
				this.componentDidCatch(a.value, {
					componentStack: b !== null ? b : "",
				});
			});
	}
	function wb(e, t, n, a, s) {
		if (
			((n.flags |= 32768),
			a !== null && typeof a == "object" && typeof a.then == "function")
		) {
			if (
				((t = n.alternate),
				t !== null && ui(t, n, s, !0),
				(n = an.current),
				n !== null)
			) {
				switch (n.tag) {
					case 31:
					case 13:
						return (
							xn === null ? $o() : n.alternate === null && lt === 0 && (lt = 3),
							(n.flags &= -257),
							(n.flags |= 65536),
							(n.lanes = s),
							a === Co
								? (n.flags |= 16384)
								: ((t = n.updateQueue),
									t === null ? (n.updateQueue = new Set([a])) : t.add(a),
									ku(e, a, s)),
							!1
						);
					case 22:
						return (
							(n.flags |= 65536),
							a === Co
								? (n.flags |= 16384)
								: ((t = n.updateQueue),
									t === null
										? ((t = {
												transitions: null,
												markerInstances: null,
												retryQueue: new Set([a]),
											}),
											(n.updateQueue = t))
										: ((n = t.retryQueue),
											n === null ? (t.retryQueue = new Set([a])) : n.add(a)),
									ku(e, a, s)),
							!1
						);
				}
				throw Error(o(435, n.tag));
			}
			return ku(e, a, s), $o(), !1;
		}
		if (De)
			return (
				(t = an.current),
				t !== null
					? ((t.flags & 65536) === 0 && (t.flags |= 256),
						(t.flags |= 65536),
						(t.lanes = s),
						a !== Ac && ((e = Error(o(422), { cause: a })), ir(pn(e, n))))
					: (a !== Ac && ((t = Error(o(423), { cause: a })), ir(pn(t, n))),
						(e = e.current.alternate),
						(e.flags |= 65536),
						(s &= -s),
						(e.lanes |= s),
						(a = pn(a, n)),
						(s = uu(e.stateNode, a, s)),
						Vc(e, s),
						lt !== 4 && (lt = 2)),
				!1
			);
		var c = Error(o(520), { cause: a });
		if (
			((c = pn(c, n)),
			Nr === null ? (Nr = [c]) : Nr.push(c),
			lt !== 4 && (lt = 2),
			t === null)
		)
			return !0;
		(a = pn(a, n)), (n = t);
		do {
			switch (n.tag) {
				case 3:
					return (
						(n.flags |= 65536),
						(e = s & -s),
						(n.lanes |= e),
						(e = uu(n.stateNode, a, e)),
						Vc(n, e),
						!1
					);
				case 1:
					if (
						((t = n.type),
						(c = n.stateNode),
						(n.flags & 128) === 0 &&
							(typeof t.getDerivedStateFromError == "function" ||
								(c !== null &&
									typeof c.componentDidCatch == "function" &&
									(Ha === null || !Ha.has(c)))))
					)
						return (
							(n.flags |= 65536),
							(s &= -s),
							(n.lanes |= s),
							(s = kh(s)),
							Lh(s, e, n, a),
							Vc(n, s),
							!1
						);
			}
			n = n.return;
		} while (n !== null);
		return !1;
	}
	var fu = Error(o(461)),
		pt = !1;
	function Rt(e, t, n, a) {
		t.child = e === null ? Vm(t, null, n, a) : _l(t, e.child, n, a);
	}
	function Bh(e, t, n, a, s) {
		n = n.render;
		var c = t.ref;
		if ("ref" in a) {
			var p = {};
			for (var b in a) b !== "ref" && (p[b] = a[b]);
		} else p = a;
		return (
			Nl(t),
			(a = Pc(e, t, n, p, c, s)),
			(b = Ic()),
			e !== null && !pt
				? (Kc(e, t, s), ta(e, t, s))
				: (De && b && Tc(t), (t.flags |= 1), Rt(e, t, a, s), t.child)
		);
	}
	function Uh(e, t, n, a, s) {
		if (e === null) {
			var c = n.type;
			return typeof c == "function" &&
				!Nc(c) &&
				c.defaultProps === void 0 &&
				n.compare === null
				? ((t.tag = 15), (t.type = c), Hh(e, t, c, a, s))
				: ((e = xo(n.type, null, a, t, t.mode, s)),
					(e.ref = t.ref),
					(e.return = t),
					(t.child = e));
		}
		if (((c = e.child), !xu(e, s))) {
			var p = c.memoizedProps;
			if (
				((n = n.compare), (n = n !== null ? n : nr), n(p, a) && e.ref === t.ref)
			)
				return ta(e, t, s);
		}
		return (
			(t.flags |= 1),
			(e = Zn(c, a)),
			(e.ref = t.ref),
			(e.return = t),
			(t.child = e)
		);
	}
	function Hh(e, t, n, a, s) {
		if (e !== null) {
			var c = e.memoizedProps;
			if (nr(c, a) && e.ref === t.ref)
				if (((pt = !1), (t.pendingProps = a = c), xu(e, s)))
					(e.flags & 131072) !== 0 && (pt = !0);
				else return (t.lanes = e.lanes), ta(e, t, s);
		}
		return du(e, t, n, a, s);
	}
	function Vh(e, t, n, a) {
		var s = a.children,
			c = e !== null ? e.memoizedState : null;
		if (
			(e === null &&
				t.stateNode === null &&
				(t.stateNode = {
					_visibility: 1,
					_pendingMarkers: null,
					_retryCache: null,
					_transitions: null,
				}),
			a.mode === "hidden")
		) {
			if ((t.flags & 128) !== 0) {
				if (((c = c !== null ? c.baseLanes | n : n), e !== null)) {
					for (a = t.child = e.child, s = 0; a !== null; )
						(s = s | a.lanes | a.childLanes), (a = a.sibling);
					a = s & ~c;
				} else (a = 0), (t.child = null);
				return Yh(e, t, c, n, a);
			}
			if ((n & 536870912) !== 0)
				(t.memoizedState = { baseLanes: 0, cachePool: null }),
					e !== null && Eo(t, c !== null ? c.cachePool : null),
					c !== null ? qm(t, c) : Gc(),
					Xm(t);
			else
				return (
					(a = t.lanes = 536870912),
					Yh(e, t, c !== null ? c.baseLanes | n : n, n, a)
				);
		} else
			c !== null
				? (Eo(t, c.cachePool), qm(t, c), ka(), (t.memoizedState = null))
				: (e !== null && Eo(t, null), Gc(), ka());
		return Rt(e, t, s, n), t.child;
	}
	function vr(e, t) {
		return (
			(e !== null && e.tag === 22) ||
				t.stateNode !== null ||
				(t.stateNode = {
					_visibility: 1,
					_pendingMarkers: null,
					_retryCache: null,
					_transitions: null,
				}),
			t.sibling
		);
	}
	function Yh(e, t, n, a, s) {
		var c = Lc();
		return (
			(c = c === null ? null : { parent: mt._currentValue, pool: c }),
			(t.memoizedState = { baseLanes: n, cachePool: c }),
			e !== null && Eo(t, null),
			Gc(),
			Xm(t),
			e !== null && ui(e, t, a, !0),
			(t.childLanes = s),
			null
		);
	}
	function Ho(e, t) {
		return (
			(t = Yo({ mode: t.mode, children: t.children }, e.mode)),
			(t.ref = e.ref),
			(e.child = t),
			(t.return = e),
			t
		);
	}
	function Gh(e, t, n) {
		return (
			_l(t, e.child, null, n),
			(e = Ho(t, t.pendingProps)),
			(e.flags |= 2),
			ln(t),
			(t.memoizedState = null),
			e
		);
	}
	function Eb(e, t, n) {
		var a = t.pendingProps,
			s = (t.flags & 128) !== 0;
		if (((t.flags &= -129), e === null)) {
			if (De) {
				if (a.mode === "hidden")
					return (e = Ho(t, a)), (t.lanes = 536870912), vr(null, e);
				if (
					(Xc(t),
					(e = Fe)
						? ((e = eg(e, yn)),
							(e = e !== null && e.data === "&" ? e : null),
							e !== null &&
								((t.memoizedState = {
									dehydrated: e,
									treeContext: Ta !== null ? { id: On, overflow: Dn } : null,
									retryLane: 536870912,
									hydrationErrors: null,
								}),
								(n = Cm(e)),
								(n.return = t),
								(t.child = n),
								(_t = t),
								(Fe = null)))
						: (e = null),
					e === null)
				)
					throw Aa(t);
				return (t.lanes = 536870912), null;
			}
			return Ho(t, a);
		}
		var c = e.memoizedState;
		if (c !== null) {
			var p = c.dehydrated;
			if ((Xc(t), s))
				if (t.flags & 256) (t.flags &= -257), (t = Gh(e, t, n));
				else if (t.memoizedState !== null)
					(t.child = e.child), (t.flags |= 128), (t = null);
				else throw Error(o(558));
			else if (
				(pt || ui(e, t, n, !1), (s = (n & e.childLanes) !== 0), pt || s)
			) {
				if (
					((a = Ze),
					a !== null && ((p = en(a, n)), p !== 0 && p !== c.retryLane))
				)
					throw ((c.retryLane = p), bl(e, p), $t(a, e, p), fu);
				$o(), (t = Gh(e, t, n));
			} else
				(e = c.treeContext),
					(Fe = bn(p.nextSibling)),
					(_t = t),
					(De = !0),
					(_a = null),
					(yn = !1),
					e !== null && _m(t, e),
					(t = Ho(t, a)),
					(t.flags |= 4096);
			return t;
		}
		return (
			(e = Zn(e.child, { mode: a.mode, children: a.children })),
			(e.ref = t.ref),
			(t.child = e),
			(e.return = t),
			e
		);
	}
	function Vo(e, t) {
		var n = t.ref;
		if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
		else {
			if (typeof n != "function" && typeof n != "object") throw Error(o(284));
			(e === null || e.ref !== n) && (t.flags |= 4194816);
		}
	}
	function du(e, t, n, a, s) {
		return (
			Nl(t),
			(n = Pc(e, t, n, a, void 0, s)),
			(a = Ic()),
			e !== null && !pt
				? (Kc(e, t, s), ta(e, t, s))
				: (De && a && Tc(t), (t.flags |= 1), Rt(e, t, n, s), t.child)
		);
	}
	function qh(e, t, n, a, s, c) {
		return (
			Nl(t),
			(t.updateQueue = null),
			(n = Pm(t, a, n, s)),
			Qm(e),
			(a = Ic()),
			e !== null && !pt
				? (Kc(e, t, c), ta(e, t, c))
				: (De && a && Tc(t), (t.flags |= 1), Rt(e, t, n, c), t.child)
		);
	}
	function Xh(e, t, n, a, s) {
		if ((Nl(t), t.stateNode === null)) {
			var c = ri,
				p = n.contextType;
			typeof p == "object" && p !== null && (c = At(p)),
				(c = new n(a, c)),
				(t.memoizedState =
					c.state !== null && c.state !== void 0 ? c.state : null),
				(c.updater = cu),
				(t.stateNode = c),
				(c._reactInternals = t),
				(c = t.stateNode),
				(c.props = a),
				(c.state = t.memoizedState),
				(c.refs = {}),
				Uc(t),
				(p = n.contextType),
				(c.context = typeof p == "object" && p !== null ? At(p) : ri),
				(c.state = t.memoizedState),
				(p = n.getDerivedStateFromProps),
				typeof p == "function" && (su(t, n, p, a), (c.state = t.memoizedState)),
				typeof n.getDerivedStateFromProps == "function" ||
					typeof c.getSnapshotBeforeUpdate == "function" ||
					(typeof c.UNSAFE_componentWillMount != "function" &&
						typeof c.componentWillMount != "function") ||
					((p = c.state),
					typeof c.componentWillMount == "function" && c.componentWillMount(),
					typeof c.UNSAFE_componentWillMount == "function" &&
						c.UNSAFE_componentWillMount(),
					p !== c.state && cu.enqueueReplaceState(c, c.state, null),
					dr(t, a, c, s),
					fr(),
					(c.state = t.memoizedState)),
				typeof c.componentDidMount == "function" && (t.flags |= 4194308),
				(a = !0);
		} else if (e === null) {
			c = t.stateNode;
			var b = t.memoizedProps,
				_ = Rl(n, b);
			c.props = _;
			var U = c.context,
				P = n.contextType;
			(p = ri), typeof P == "object" && P !== null && (p = At(P));
			var K = n.getDerivedStateFromProps;
			(P =
				typeof K == "function" ||
				typeof c.getSnapshotBeforeUpdate == "function"),
				(b = t.pendingProps !== b),
				P ||
					(typeof c.UNSAFE_componentWillReceiveProps != "function" &&
						typeof c.componentWillReceiveProps != "function") ||
					((b || U !== p) && Rh(t, c, a, p)),
				(Ma = !1);
			var V = t.memoizedState;
			(c.state = V),
				dr(t, a, c, s),
				fr(),
				(U = t.memoizedState),
				b || V !== U || Ma
					? (typeof K == "function" && (su(t, n, K, a), (U = t.memoizedState)),
						(_ = Ma || Ah(t, n, _, a, V, U, p))
							? (P ||
									(typeof c.UNSAFE_componentWillMount != "function" &&
										typeof c.componentWillMount != "function") ||
									(typeof c.componentWillMount == "function" &&
										c.componentWillMount(),
									typeof c.UNSAFE_componentWillMount == "function" &&
										c.UNSAFE_componentWillMount()),
								typeof c.componentDidMount == "function" &&
									(t.flags |= 4194308))
							: (typeof c.componentDidMount == "function" &&
									(t.flags |= 4194308),
								(t.memoizedProps = a),
								(t.memoizedState = U)),
						(c.props = a),
						(c.state = U),
						(c.context = p),
						(a = _))
					: (typeof c.componentDidMount == "function" && (t.flags |= 4194308),
						(a = !1));
		} else {
			(c = t.stateNode),
				Hc(e, t),
				(p = t.memoizedProps),
				(P = Rl(n, p)),
				(c.props = P),
				(K = t.pendingProps),
				(V = c.context),
				(U = n.contextType),
				(_ = ri),
				typeof U == "object" && U !== null && (_ = At(U)),
				(b = n.getDerivedStateFromProps),
				(U =
					typeof b == "function" ||
					typeof c.getSnapshotBeforeUpdate == "function") ||
					(typeof c.UNSAFE_componentWillReceiveProps != "function" &&
						typeof c.componentWillReceiveProps != "function") ||
					((p !== K || V !== _) && Rh(t, c, a, _)),
				(Ma = !1),
				(V = t.memoizedState),
				(c.state = V),
				dr(t, a, c, s),
				fr();
			var Q = t.memoizedState;
			p !== K ||
			V !== Q ||
			Ma ||
			(e !== null && e.dependencies !== null && So(e.dependencies))
				? (typeof b == "function" && (su(t, n, b, a), (Q = t.memoizedState)),
					(P =
						Ma ||
						Ah(t, n, P, a, V, Q, _) ||
						(e !== null && e.dependencies !== null && So(e.dependencies)))
						? (U ||
								(typeof c.UNSAFE_componentWillUpdate != "function" &&
									typeof c.componentWillUpdate != "function") ||
								(typeof c.componentWillUpdate == "function" &&
									c.componentWillUpdate(a, Q, _),
								typeof c.UNSAFE_componentWillUpdate == "function" &&
									c.UNSAFE_componentWillUpdate(a, Q, _)),
							typeof c.componentDidUpdate == "function" && (t.flags |= 4),
							typeof c.getSnapshotBeforeUpdate == "function" &&
								(t.flags |= 1024))
						: (typeof c.componentDidUpdate != "function" ||
								(p === e.memoizedProps && V === e.memoizedState) ||
								(t.flags |= 4),
							typeof c.getSnapshotBeforeUpdate != "function" ||
								(p === e.memoizedProps && V === e.memoizedState) ||
								(t.flags |= 1024),
							(t.memoizedProps = a),
							(t.memoizedState = Q)),
					(c.props = a),
					(c.state = Q),
					(c.context = _),
					(a = P))
				: (typeof c.componentDidUpdate != "function" ||
						(p === e.memoizedProps && V === e.memoizedState) ||
						(t.flags |= 4),
					typeof c.getSnapshotBeforeUpdate != "function" ||
						(p === e.memoizedProps && V === e.memoizedState) ||
						(t.flags |= 1024),
					(a = !1));
		}
		return (
			(c = a),
			Vo(e, t),
			(a = (t.flags & 128) !== 0),
			c || a
				? ((c = t.stateNode),
					(n =
						a && typeof n.getDerivedStateFromError != "function"
							? null
							: c.render()),
					(t.flags |= 1),
					e !== null && a
						? ((t.child = _l(t, e.child, null, s)),
							(t.child = _l(t, null, n, s)))
						: Rt(e, t, n, s),
					(t.memoizedState = c.state),
					(e = t.child))
				: (e = ta(e, t, s)),
			e
		);
	}
	function Qh(e, t, n, a) {
		return wl(), (t.flags |= 256), Rt(e, t, n, a), t.child;
	}
	var mu = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0,
		hydrationErrors: null,
	};
	function hu(e) {
		return { baseLanes: e, cachePool: zm() };
	}
	function pu(e, t, n) {
		return (e = e !== null ? e.childLanes & ~n : 0), t && (e |= on), e;
	}
	function Ph(e, t, n) {
		var a = t.pendingProps,
			s = !1,
			c = (t.flags & 128) !== 0,
			p;
		if (
			((p = c) ||
				(p =
					e !== null && e.memoizedState === null ? !1 : (rt.current & 2) !== 0),
			p && ((s = !0), (t.flags &= -129)),
			(p = (t.flags & 32) !== 0),
			(t.flags &= -33),
			e === null)
		) {
			if (De) {
				if (
					(s ? za(t) : ka(),
					(e = Fe)
						? ((e = eg(e, yn)),
							(e = e !== null && e.data !== "&" ? e : null),
							e !== null &&
								((t.memoizedState = {
									dehydrated: e,
									treeContext: Ta !== null ? { id: On, overflow: Dn } : null,
									retryLane: 536870912,
									hydrationErrors: null,
								}),
								(n = Cm(e)),
								(n.return = t),
								(t.child = n),
								(_t = t),
								(Fe = null)))
						: (e = null),
					e === null)
				)
					throw Aa(t);
				return Fu(e) ? (t.lanes = 32) : (t.lanes = 536870912), null;
			}
			var b = a.children;
			return (
				(a = a.fallback),
				s
					? (ka(),
						(s = t.mode),
						(b = Yo({ mode: "hidden", children: b }, s)),
						(a = Sl(a, s, n, null)),
						(b.return = t),
						(a.return = t),
						(b.sibling = a),
						(t.child = b),
						(a = t.child),
						(a.memoizedState = hu(n)),
						(a.childLanes = pu(e, p, n)),
						(t.memoizedState = mu),
						vr(null, a))
					: (za(t), gu(t, b))
			);
		}
		var _ = e.memoizedState;
		if (_ !== null && ((b = _.dehydrated), b !== null)) {
			if (c)
				t.flags & 256
					? (za(t), (t.flags &= -257), (t = vu(e, t, n)))
					: t.memoizedState !== null
						? (ka(), (t.child = e.child), (t.flags |= 128), (t = null))
						: (ka(),
							(b = a.fallback),
							(s = t.mode),
							(a = Yo({ mode: "visible", children: a.children }, s)),
							(b = Sl(b, s, n, null)),
							(b.flags |= 2),
							(a.return = t),
							(b.return = t),
							(a.sibling = b),
							(t.child = a),
							_l(t, e.child, null, n),
							(a = t.child),
							(a.memoizedState = hu(n)),
							(a.childLanes = pu(e, p, n)),
							(t.memoizedState = mu),
							(t = vr(null, a)));
			else if ((za(t), Fu(b))) {
				if (((p = b.nextSibling && b.nextSibling.dataset), p)) var U = p.dgst;
				(p = U),
					(a = Error(o(419))),
					(a.stack = ""),
					(a.digest = p),
					ir({ value: a, source: null, stack: null }),
					(t = vu(e, t, n));
			} else if (
				(pt || ui(e, t, n, !1), (p = (n & e.childLanes) !== 0), pt || p)
			) {
				if (
					((p = Ze),
					p !== null && ((a = en(p, n)), a !== 0 && a !== _.retryLane))
				)
					throw ((_.retryLane = a), bl(e, a), $t(p, e, a), fu);
				$u(b) || $o(), (t = vu(e, t, n));
			} else
				$u(b)
					? ((t.flags |= 192), (t.child = e.child), (t = null))
					: ((e = _.treeContext),
						(Fe = bn(b.nextSibling)),
						(_t = t),
						(De = !0),
						(_a = null),
						(yn = !1),
						e !== null && _m(t, e),
						(t = gu(t, a.children)),
						(t.flags |= 4096));
			return t;
		}
		return s
			? (ka(),
				(b = a.fallback),
				(s = t.mode),
				(_ = e.child),
				(U = _.sibling),
				(a = Zn(_, { mode: "hidden", children: a.children })),
				(a.subtreeFlags = _.subtreeFlags & 65011712),
				U !== null ? (b = Zn(U, b)) : ((b = Sl(b, s, n, null)), (b.flags |= 2)),
				(b.return = t),
				(a.return = t),
				(a.sibling = b),
				(t.child = a),
				vr(null, a),
				(a = t.child),
				(b = e.child.memoizedState),
				b === null
					? (b = hu(n))
					: ((s = b.cachePool),
						s !== null
							? ((_ = mt._currentValue),
								(s = s.parent !== _ ? { parent: _, pool: _ } : s))
							: (s = zm()),
						(b = { baseLanes: b.baseLanes | n, cachePool: s })),
				(a.memoizedState = b),
				(a.childLanes = pu(e, p, n)),
				(t.memoizedState = mu),
				vr(e.child, a))
			: (za(t),
				(n = e.child),
				(e = n.sibling),
				(n = Zn(n, { mode: "visible", children: a.children })),
				(n.return = t),
				(n.sibling = null),
				e !== null &&
					((p = t.deletions),
					p === null ? ((t.deletions = [e]), (t.flags |= 16)) : p.push(e)),
				(t.child = n),
				(t.memoizedState = null),
				n);
	}
	function gu(e, t) {
		return (
			(t = Yo({ mode: "visible", children: t }, e.mode)),
			(t.return = e),
			(e.child = t)
		);
	}
	function Yo(e, t) {
		return (e = nn(22, e, null, t)), (e.lanes = 0), e;
	}
	function vu(e, t, n) {
		return (
			_l(t, e.child, null, n),
			(e = gu(t, t.pendingProps.children)),
			(e.flags |= 2),
			(t.memoizedState = null),
			e
		);
	}
	function Ih(e, t, n) {
		e.lanes |= t;
		var a = e.alternate;
		a !== null && (a.lanes |= t), Oc(e.return, t, n);
	}
	function yu(e, t, n, a, s, c) {
		var p = e.memoizedState;
		p === null
			? (e.memoizedState = {
					isBackwards: t,
					rendering: null,
					renderingStartTime: 0,
					last: a,
					tail: n,
					tailMode: s,
					treeForkCount: c,
				})
			: ((p.isBackwards = t),
				(p.rendering = null),
				(p.renderingStartTime = 0),
				(p.last = a),
				(p.tail = n),
				(p.tailMode = s),
				(p.treeForkCount = c));
	}
	function Kh(e, t, n) {
		var a = t.pendingProps,
			s = a.revealOrder,
			c = a.tail;
		a = a.children;
		var p = rt.current,
			b = (p & 2) !== 0;
		if (
			(b ? ((p = (p & 1) | 2), (t.flags |= 128)) : (p &= 1),
			W(rt, p),
			Rt(e, t, a, n),
			(a = De ? lr : 0),
			!b && e !== null && (e.flags & 128) !== 0)
		)
			e: for (e = t.child; e !== null; ) {
				if (e.tag === 13) e.memoizedState !== null && Ih(e, n, t);
				else if (e.tag === 19) Ih(e, n, t);
				else if (e.child !== null) {
					(e.child.return = e), (e = e.child);
					continue;
				}
				if (e === t) break;
				for (; e.sibling === null; ) {
					if (e.return === null || e.return === t) break e;
					e = e.return;
				}
				(e.sibling.return = e.return), (e = e.sibling);
			}
		switch (s) {
			case "forwards":
				for (n = t.child, s = null; n !== null; )
					(e = n.alternate),
						e !== null && Ao(e) === null && (s = n),
						(n = n.sibling);
				(n = s),
					n === null
						? ((s = t.child), (t.child = null))
						: ((s = n.sibling), (n.sibling = null)),
					yu(t, !1, s, n, c, a);
				break;
			case "backwards":
			case "unstable_legacy-backwards":
				for (n = null, s = t.child, t.child = null; s !== null; ) {
					if (((e = s.alternate), e !== null && Ao(e) === null)) {
						t.child = s;
						break;
					}
					(e = s.sibling), (s.sibling = n), (n = s), (s = e);
				}
				yu(t, !0, n, null, c, a);
				break;
			case "together":
				yu(t, !1, null, null, void 0, a);
				break;
			default:
				t.memoizedState = null;
		}
		return t.child;
	}
	function ta(e, t, n) {
		if (
			(e !== null && (t.dependencies = e.dependencies),
			(Ua |= t.lanes),
			(n & t.childLanes) === 0)
		)
			if (e !== null) {
				if ((ui(e, t, n, !1), (n & t.childLanes) === 0)) return null;
			} else return null;
		if (e !== null && t.child !== e.child) throw Error(o(153));
		if (t.child !== null) {
			for (
				e = t.child, n = Zn(e, e.pendingProps), t.child = n, n.return = t;
				e.sibling !== null;
			)
				(e = e.sibling),
					(n = n.sibling = Zn(e, e.pendingProps)),
					(n.return = t);
			n.sibling = null;
		}
		return t.child;
	}
	function xu(e, t) {
		return (e.lanes & t) !== 0
			? !0
			: ((e = e.dependencies), !!(e !== null && So(e)));
	}
	function Nb(e, t, n) {
		switch (t.tag) {
			case 3:
				fe(t, t.stateNode.containerInfo),
					Ra(t, mt, e.memoizedState.cache),
					wl();
				break;
			case 27:
			case 5:
				Ve(t);
				break;
			case 4:
				fe(t, t.stateNode.containerInfo);
				break;
			case 10:
				Ra(t, t.type, t.memoizedProps.value);
				break;
			case 31:
				if (t.memoizedState !== null) return (t.flags |= 128), Xc(t), null;
				break;
			case 13: {
				var a = t.memoizedState;
				if (a !== null)
					return a.dehydrated !== null
						? (za(t), (t.flags |= 128), null)
						: (n & t.child.childLanes) !== 0
							? Ph(e, t, n)
							: (za(t), (e = ta(e, t, n)), e !== null ? e.sibling : null);
				za(t);
				break;
			}
			case 19: {
				var s = (e.flags & 128) !== 0;
				if (
					((a = (n & t.childLanes) !== 0),
					a || (ui(e, t, n, !1), (a = (n & t.childLanes) !== 0)),
					s)
				) {
					if (a) return Kh(e, t, n);
					t.flags |= 128;
				}
				if (
					((s = t.memoizedState),
					s !== null &&
						((s.rendering = null), (s.tail = null), (s.lastEffect = null)),
					W(rt, rt.current),
					a)
				)
					break;
				return null;
			}
			case 22:
				return (t.lanes = 0), Vh(e, t, n, t.pendingProps);
			case 24:
				Ra(t, mt, e.memoizedState.cache);
		}
		return ta(e, t, n);
	}
	function Zh(e, t, n) {
		if (e !== null)
			if (e.memoizedProps !== t.pendingProps) pt = !0;
			else {
				if (!xu(e, n) && (t.flags & 128) === 0) return (pt = !1), Nb(e, t, n);
				pt = (e.flags & 131072) !== 0;
			}
		else (pt = !1), De && (t.flags & 1048576) !== 0 && Tm(t, lr, t.index);
		switch (((t.lanes = 0), t.tag)) {
			case 16:
				e: {
					var a = t.pendingProps;
					if (((e = jl(t.elementType)), (t.type = e), typeof e == "function"))
						Nc(e)
							? ((a = Rl(e, a)), (t.tag = 1), (t = Xh(null, t, e, a, n)))
							: ((t.tag = 0), (t = du(null, t, e, a, n)));
					else {
						if (e != null) {
							var s = e.$$typeof;
							if (s === O) {
								(t.tag = 11), (t = Bh(null, t, e, a, n));
								break e;
							} else if (s === X) {
								(t.tag = 14), (t = Uh(null, t, e, a, n));
								break e;
							}
						}
						throw ((t = le(e) || e), Error(o(306, t, "")));
					}
				}
				return t;
			case 0:
				return du(e, t, t.type, t.pendingProps, n);
			case 1:
				return (a = t.type), (s = Rl(a, t.pendingProps)), Xh(e, t, a, s, n);
			case 3:
				e: {
					if ((fe(t, t.stateNode.containerInfo), e === null))
						throw Error(o(387));
					a = t.pendingProps;
					var c = t.memoizedState;
					(s = c.element), Hc(e, t), dr(t, a, null, n);
					var p = t.memoizedState;
					if (
						((a = p.cache),
						Ra(t, mt, a),
						a !== c.cache && Dc(t, [mt], n, !0),
						fr(),
						(a = p.element),
						c.isDehydrated)
					)
						if (
							((c = { element: a, isDehydrated: !1, cache: p.cache }),
							(t.updateQueue.baseState = c),
							(t.memoizedState = c),
							t.flags & 256)
						) {
							t = Qh(e, t, a, n);
							break e;
						} else if (a !== s) {
							(s = pn(Error(o(424)), t)), ir(s), (t = Qh(e, t, a, n));
							break e;
						} else {
							switch (((e = t.stateNode.containerInfo), e.nodeType)) {
								case 9:
									e = e.body;
									break;
								default:
									e = e.nodeName === "HTML" ? e.ownerDocument.body : e;
							}
							for (
								Fe = bn(e.firstChild),
									_t = t,
									De = !0,
									_a = null,
									yn = !0,
									n = Vm(t, null, a, n),
									t.child = n;
								n;
							)
								(n.flags = (n.flags & -3) | 4096), (n = n.sibling);
						}
					else {
						if ((wl(), a === s)) {
							t = ta(e, t, n);
							break e;
						}
						Rt(e, t, a, n);
					}
					t = t.child;
				}
				return t;
			case 26:
				return (
					Vo(e, t),
					e === null
						? (n = rg(t.type, null, t.pendingProps, null))
							? (t.memoizedState = n)
							: De ||
								((n = t.type),
								(e = t.pendingProps),
								(a = as(oe.current).createElement(n)),
								(a[Tt] = t),
								(a[Xt] = e),
								Mt(a, n, e),
								wt(a),
								(t.stateNode = a))
						: (t.memoizedState = rg(
								t.type,
								e.memoizedProps,
								t.pendingProps,
								e.memoizedState,
							)),
					null
				);
			case 27:
				return (
					Ve(t),
					e === null &&
						De &&
						((a = t.stateNode = ag(t.type, t.pendingProps, oe.current)),
						(_t = t),
						(yn = !0),
						(s = Fe),
						qa(t.type) ? ((Ju = s), (Fe = bn(a.firstChild))) : (Fe = s)),
					Rt(e, t, t.pendingProps.children, n),
					Vo(e, t),
					e === null && (t.flags |= 4194304),
					t.child
				);
			case 5:
				return (
					e === null &&
						De &&
						((s = a = Fe) &&
							((a = e1(a, t.type, t.pendingProps, yn)),
							a !== null
								? ((t.stateNode = a),
									(_t = t),
									(Fe = bn(a.firstChild)),
									(yn = !1),
									(s = !0))
								: (s = !1)),
						s || Aa(t)),
					Ve(t),
					(s = t.type),
					(c = t.pendingProps),
					(p = e !== null ? e.memoizedProps : null),
					(a = c.children),
					Iu(s, c) ? (a = null) : p !== null && Iu(s, p) && (t.flags |= 32),
					t.memoizedState !== null &&
						((s = Pc(e, t, pb, null, null, n)), (Or._currentValue = s)),
					Vo(e, t),
					Rt(e, t, a, n),
					t.child
				);
			case 6:
				return (
					e === null &&
						De &&
						((e = n = Fe) &&
							((n = t1(n, t.pendingProps, yn)),
							n !== null
								? ((t.stateNode = n), (_t = t), (Fe = null), (e = !0))
								: (e = !1)),
						e || Aa(t)),
					null
				);
			case 13:
				return Ph(e, t, n);
			case 4:
				return (
					fe(t, t.stateNode.containerInfo),
					(a = t.pendingProps),
					e === null ? (t.child = _l(t, null, a, n)) : Rt(e, t, a, n),
					t.child
				);
			case 11:
				return Bh(e, t, t.type, t.pendingProps, n);
			case 7:
				return Rt(e, t, t.pendingProps, n), t.child;
			case 8:
				return Rt(e, t, t.pendingProps.children, n), t.child;
			case 12:
				return Rt(e, t, t.pendingProps.children, n), t.child;
			case 10:
				return (
					(a = t.pendingProps),
					Ra(t, t.type, a.value),
					Rt(e, t, a.children, n),
					t.child
				);
			case 9:
				return (
					(s = t.type._context),
					(a = t.pendingProps.children),
					Nl(t),
					(s = At(s)),
					(a = a(s)),
					(t.flags |= 1),
					Rt(e, t, a, n),
					t.child
				);
			case 14:
				return Uh(e, t, t.type, t.pendingProps, n);
			case 15:
				return Hh(e, t, t.type, t.pendingProps, n);
			case 19:
				return Kh(e, t, n);
			case 31:
				return Eb(e, t, n);
			case 22:
				return Vh(e, t, n, t.pendingProps);
			case 24:
				return (
					Nl(t),
					(a = At(mt)),
					e === null
						? ((s = Lc()),
							s === null &&
								((s = Ze),
								(c = zc()),
								(s.pooledCache = c),
								c.refCount++,
								c !== null && (s.pooledCacheLanes |= n),
								(s = c)),
							(t.memoizedState = { parent: a, cache: s }),
							Uc(t),
							Ra(t, mt, s))
						: ((e.lanes & n) !== 0 && (Hc(e, t), dr(t, null, null, n), fr()),
							(s = e.memoizedState),
							(c = t.memoizedState),
							s.parent !== a
								? ((s = { parent: a, cache: a }),
									(t.memoizedState = s),
									t.lanes === 0 &&
										(t.memoizedState = t.updateQueue.baseState = s),
									Ra(t, mt, a))
								: ((a = c.cache),
									Ra(t, mt, a),
									a !== s.cache && Dc(t, [mt], n, !0))),
					Rt(e, t, t.pendingProps.children, n),
					t.child
				);
			case 29:
				throw t.pendingProps;
		}
		throw Error(o(156, t.tag));
	}
	function na(e) {
		e.flags |= 4;
	}
	function bu(e, t, n, a, s) {
		if (((t = (e.mode & 32) !== 0) && (t = !1), t)) {
			if (((e.flags |= 16777216), (s & 335544128) === s))
				if (e.stateNode.complete) e.flags |= 8192;
				else if (wp()) e.flags |= 8192;
				else throw ((Tl = Co), Bc);
		} else e.flags &= -16777217;
	}
	function $h(e, t) {
		if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
			e.flags &= -16777217;
		else if (((e.flags |= 16777216), !fg(t)))
			if (wp()) e.flags |= 8192;
			else throw ((Tl = Co), Bc);
	}
	function Go(e, t) {
		t !== null && (e.flags |= 4),
			e.flags & 16384 &&
				((t = e.tag !== 22 ? it() : 536870912), (e.lanes |= t), (wi |= t));
	}
	function yr(e, t) {
		if (!De)
			switch (e.tailMode) {
				case "hidden":
					t = e.tail;
					for (var n = null; t !== null; )
						t.alternate !== null && (n = t), (t = t.sibling);
					n === null ? (e.tail = null) : (n.sibling = null);
					break;
				case "collapsed":
					n = e.tail;
					for (var a = null; n !== null; )
						n.alternate !== null && (a = n), (n = n.sibling);
					a === null
						? t || e.tail === null
							? (e.tail = null)
							: (e.tail.sibling = null)
						: (a.sibling = null);
			}
	}
	function Je(e) {
		var t = e.alternate !== null && e.alternate.child === e.child,
			n = 0,
			a = 0;
		if (t)
			for (var s = e.child; s !== null; )
				(n |= s.lanes | s.childLanes),
					(a |= s.subtreeFlags & 65011712),
					(a |= s.flags & 65011712),
					(s.return = e),
					(s = s.sibling);
		else
			for (s = e.child; s !== null; )
				(n |= s.lanes | s.childLanes),
					(a |= s.subtreeFlags),
					(a |= s.flags),
					(s.return = e),
					(s = s.sibling);
		return (e.subtreeFlags |= a), (e.childLanes = n), t;
	}
	function Cb(e, t, n) {
		var a = t.pendingProps;
		switch ((_c(t), t.tag)) {
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14:
				return Je(t), null;
			case 1:
				return Je(t), null;
			case 3:
				return (
					(n = t.stateNode),
					(a = null),
					e !== null && (a = e.memoizedState.cache),
					t.memoizedState.cache !== a && (t.flags |= 2048),
					Jn(mt),
					ae(),
					n.pendingContext &&
						((n.context = n.pendingContext), (n.pendingContext = null)),
					(e === null || e.child === null) &&
						(ci(t)
							? na(t)
							: e === null ||
								(e.memoizedState.isDehydrated && (t.flags & 256) === 0) ||
								((t.flags |= 1024), Rc())),
					Je(t),
					null
				);
			case 26: {
				var s = t.type,
					c = t.memoizedState;
				return (
					e === null
						? (na(t),
							c !== null ? (Je(t), $h(t, c)) : (Je(t), bu(t, s, null, a, n)))
						: c
							? c !== e.memoizedState
								? (na(t), Je(t), $h(t, c))
								: (Je(t), (t.flags &= -16777217))
							: ((e = e.memoizedProps),
								e !== a && na(t),
								Je(t),
								bu(t, s, e, a, n)),
					null
				);
			}
			case 27:
				if (
					(Ce(t),
					(n = oe.current),
					(s = t.type),
					e !== null && t.stateNode != null)
				)
					e.memoizedProps !== a && na(t);
				else {
					if (!a) {
						if (t.stateNode === null) throw Error(o(166));
						return Je(t), null;
					}
					(e = $.current),
						ci(t) ? Am(t) : ((e = ag(s, a, n)), (t.stateNode = e), na(t));
				}
				return Je(t), null;
			case 5:
				if ((Ce(t), (s = t.type), e !== null && t.stateNode != null))
					e.memoizedProps !== a && na(t);
				else {
					if (!a) {
						if (t.stateNode === null) throw Error(o(166));
						return Je(t), null;
					}
					if (((c = $.current), ci(t))) Am(t);
					else {
						var p = as(oe.current);
						switch (c) {
							case 1:
								c = p.createElementNS("http://www.w3.org/2000/svg", s);
								break;
							case 2:
								c = p.createElementNS("http://www.w3.org/1998/Math/MathML", s);
								break;
							default:
								switch (s) {
									case "svg":
										c = p.createElementNS("http://www.w3.org/2000/svg", s);
										break;
									case "math":
										c = p.createElementNS(
											"http://www.w3.org/1998/Math/MathML",
											s,
										);
										break;
									case "script":
										(c = p.createElement("div")),
											(c.innerHTML = "<script></script>"),
											(c = c.removeChild(c.firstChild));
										break;
									case "select":
										(c =
											typeof a.is == "string"
												? p.createElement("select", { is: a.is })
												: p.createElement("select")),
											a.multiple
												? (c.multiple = !0)
												: a.size && (c.size = a.size);
										break;
									default:
										c =
											typeof a.is == "string"
												? p.createElement(s, { is: a.is })
												: p.createElement(s);
								}
						}
						(c[Tt] = t), (c[Xt] = a);
						e: for (p = t.child; p !== null; ) {
							if (p.tag === 5 || p.tag === 6) c.appendChild(p.stateNode);
							else if (p.tag !== 4 && p.tag !== 27 && p.child !== null) {
								(p.child.return = p), (p = p.child);
								continue;
							}
							if (p === t) break;
							for (; p.sibling === null; ) {
								if (p.return === null || p.return === t) break e;
								p = p.return;
							}
							(p.sibling.return = p.return), (p = p.sibling);
						}
						t.stateNode = c;
						switch ((Mt(c, s, a), s)) {
							case "button":
							case "input":
							case "select":
							case "textarea":
								a = !!a.autoFocus;
								break;
							case "img":
								a = !0;
								break;
							default:
								a = !1;
						}
						a && na(t);
					}
				}
				return (
					Je(t),
					bu(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n),
					null
				);
			case 6:
				if (e && t.stateNode != null) e.memoizedProps !== a && na(t);
				else {
					if (typeof a != "string" && t.stateNode === null) throw Error(o(166));
					if (((e = oe.current), ci(t))) {
						if (
							((e = t.stateNode),
							(n = t.memoizedProps),
							(a = null),
							(s = _t),
							s !== null)
						)
							switch (s.tag) {
								case 27:
								case 5:
									a = s.memoizedProps;
							}
						(e[Tt] = t),
							(e = !!(
								e.nodeValue === n ||
								(a !== null && a.suppressHydrationWarning === !0) ||
								Pp(e.nodeValue, n)
							)),
							e || Aa(t, !0);
					} else (e = as(e).createTextNode(a)), (e[Tt] = t), (t.stateNode = e);
				}
				return Je(t), null;
			case 31:
				if (((n = t.memoizedState), e === null || e.memoizedState !== null)) {
					if (((a = ci(t)), n !== null)) {
						if (e === null) {
							if (!a) throw Error(o(318));
							if (
								((e = t.memoizedState),
								(e = e !== null ? e.dehydrated : null),
								!e)
							)
								throw Error(o(557));
							e[Tt] = t;
						} else
							wl(),
								(t.flags & 128) === 0 && (t.memoizedState = null),
								(t.flags |= 4);
						Je(t), (e = !1);
					} else
						(n = Rc()),
							e !== null &&
								e.memoizedState !== null &&
								(e.memoizedState.hydrationErrors = n),
							(e = !0);
					if (!e) return t.flags & 256 ? (ln(t), t) : (ln(t), null);
					if ((t.flags & 128) !== 0) throw Error(o(558));
				}
				return Je(t), null;
			case 13:
				if (
					((a = t.memoizedState),
					e === null ||
						(e.memoizedState !== null && e.memoizedState.dehydrated !== null))
				) {
					if (((s = ci(t)), a !== null && a.dehydrated !== null)) {
						if (e === null) {
							if (!s) throw Error(o(318));
							if (
								((s = t.memoizedState),
								(s = s !== null ? s.dehydrated : null),
								!s)
							)
								throw Error(o(317));
							s[Tt] = t;
						} else
							wl(),
								(t.flags & 128) === 0 && (t.memoizedState = null),
								(t.flags |= 4);
						Je(t), (s = !1);
					} else
						(s = Rc()),
							e !== null &&
								e.memoizedState !== null &&
								(e.memoizedState.hydrationErrors = s),
							(s = !0);
					if (!s) return t.flags & 256 ? (ln(t), t) : (ln(t), null);
				}
				return (
					ln(t),
					(t.flags & 128) !== 0
						? ((t.lanes = n), t)
						: ((n = a !== null),
							(e = e !== null && e.memoizedState !== null),
							n &&
								((a = t.child),
								(s = null),
								a.alternate !== null &&
									a.alternate.memoizedState !== null &&
									a.alternate.memoizedState.cachePool !== null &&
									(s = a.alternate.memoizedState.cachePool.pool),
								(c = null),
								a.memoizedState !== null &&
									a.memoizedState.cachePool !== null &&
									(c = a.memoizedState.cachePool.pool),
								c !== s && (a.flags |= 2048)),
							n !== e && n && (t.child.flags |= 8192),
							Go(t, t.updateQueue),
							Je(t),
							null)
				);
			case 4:
				return ae(), e === null && Gu(t.stateNode.containerInfo), Je(t), null;
			case 10:
				return Jn(t.type), Je(t), null;
			case 19:
				if ((G(rt), (a = t.memoizedState), a === null)) return Je(t), null;
				if (((s = (t.flags & 128) !== 0), (c = a.rendering), c === null))
					if (s) yr(a, !1);
					else {
						if (lt !== 0 || (e !== null && (e.flags & 128) !== 0))
							for (e = t.child; e !== null; ) {
								if (((c = Ao(e)), c !== null)) {
									for (
										t.flags |= 128,
											yr(a, !1),
											e = c.updateQueue,
											t.updateQueue = e,
											Go(t, e),
											t.subtreeFlags = 0,
											e = n,
											n = t.child;
										n !== null;
									)
										Nm(n, e), (n = n.sibling);
									return (
										W(rt, (rt.current & 1) | 2),
										De && $n(t, a.treeForkCount),
										t.child
									);
								}
								e = e.sibling;
							}
						a.tail !== null &&
							ct() > Io &&
							((t.flags |= 128), (s = !0), yr(a, !1), (t.lanes = 4194304));
					}
				else {
					if (!s)
						if (((e = Ao(c)), e !== null)) {
							if (
								((t.flags |= 128),
								(s = !0),
								(e = e.updateQueue),
								(t.updateQueue = e),
								Go(t, e),
								yr(a, !0),
								a.tail === null &&
									a.tailMode === "hidden" &&
									!c.alternate &&
									!De)
							)
								return Je(t), null;
						} else
							2 * ct() - a.renderingStartTime > Io &&
								n !== 536870912 &&
								((t.flags |= 128), (s = !0), yr(a, !1), (t.lanes = 4194304));
					a.isBackwards
						? ((c.sibling = t.child), (t.child = c))
						: ((e = a.last),
							e !== null ? (e.sibling = c) : (t.child = c),
							(a.last = c));
				}
				return a.tail !== null
					? ((e = a.tail),
						(a.rendering = e),
						(a.tail = e.sibling),
						(a.renderingStartTime = ct()),
						(e.sibling = null),
						(n = rt.current),
						W(rt, s ? (n & 1) | 2 : n & 1),
						De && $n(t, a.treeForkCount),
						e)
					: (Je(t), null);
			case 22:
			case 23:
				return (
					ln(t),
					qc(),
					(a = t.memoizedState !== null),
					e !== null
						? (e.memoizedState !== null) !== a && (t.flags |= 8192)
						: a && (t.flags |= 8192),
					a
						? (n & 536870912) !== 0 &&
							(t.flags & 128) === 0 &&
							(Je(t), t.subtreeFlags & 6 && (t.flags |= 8192))
						: Je(t),
					(n = t.updateQueue),
					n !== null && Go(t, n.retryQueue),
					(n = null),
					e !== null &&
						e.memoizedState !== null &&
						e.memoizedState.cachePool !== null &&
						(n = e.memoizedState.cachePool.pool),
					(a = null),
					t.memoizedState !== null &&
						t.memoizedState.cachePool !== null &&
						(a = t.memoizedState.cachePool.pool),
					a !== n && (t.flags |= 2048),
					e !== null && G(Cl),
					null
				);
			case 24:
				return (
					(n = null),
					e !== null && (n = e.memoizedState.cache),
					t.memoizedState.cache !== n && (t.flags |= 2048),
					Jn(mt),
					Je(t),
					null
				);
			case 25:
				return null;
			case 30:
				return null;
		}
		throw Error(o(156, t.tag));
	}
	function jb(e, t) {
		switch ((_c(t), t.tag)) {
			case 1:
				return (
					(e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
				);
			case 3:
				return (
					Jn(mt),
					ae(),
					(e = t.flags),
					(e & 65536) !== 0 && (e & 128) === 0
						? ((t.flags = (e & -65537) | 128), t)
						: null
				);
			case 26:
			case 27:
			case 5:
				return Ce(t), null;
			case 31:
				if (t.memoizedState !== null) {
					if ((ln(t), t.alternate === null)) throw Error(o(340));
					wl();
				}
				return (
					(e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
				);
			case 13:
				if (
					(ln(t), (e = t.memoizedState), e !== null && e.dehydrated !== null)
				) {
					if (t.alternate === null) throw Error(o(340));
					wl();
				}
				return (
					(e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
				);
			case 19:
				return G(rt), null;
			case 4:
				return ae(), null;
			case 10:
				return Jn(t.type), null;
			case 22:
			case 23:
				return (
					ln(t),
					qc(),
					e !== null && G(Cl),
					(e = t.flags),
					e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
				);
			case 24:
				return Jn(mt), null;
			case 25:
				return null;
			default:
				return null;
		}
	}
	function Fh(e, t) {
		switch ((_c(t), t.tag)) {
			case 3:
				Jn(mt), ae();
				break;
			case 26:
			case 27:
			case 5:
				Ce(t);
				break;
			case 4:
				ae();
				break;
			case 31:
				t.memoizedState !== null && ln(t);
				break;
			case 13:
				ln(t);
				break;
			case 19:
				G(rt);
				break;
			case 10:
				Jn(t.type);
				break;
			case 22:
			case 23:
				ln(t), qc(), e !== null && G(Cl);
				break;
			case 24:
				Jn(mt);
		}
	}
	function xr(e, t) {
		try {
			var n = t.updateQueue,
				a = n !== null ? n.lastEffect : null;
			if (a !== null) {
				var s = a.next;
				n = s;
				do {
					if ((n.tag & e) === e) {
						a = void 0;
						var c = n.create,
							p = n.inst;
						(a = c()), (p.destroy = a);
					}
					n = n.next;
				} while (n !== s);
			}
		} catch (b) {
			Xe(t, t.return, b);
		}
	}
	function La(e, t, n) {
		try {
			var a = t.updateQueue,
				s = a !== null ? a.lastEffect : null;
			if (s !== null) {
				var c = s.next;
				a = c;
				do {
					if ((a.tag & e) === e) {
						var p = a.inst,
							b = p.destroy;
						if (b !== void 0) {
							(p.destroy = void 0), (s = t);
							var _ = n,
								U = b;
							try {
								U();
							} catch (P) {
								Xe(s, _, P);
							}
						}
					}
					a = a.next;
				} while (a !== c);
			}
		} catch (P) {
			Xe(t, t.return, P);
		}
	}
	function Jh(e) {
		var t = e.updateQueue;
		if (t !== null) {
			var n = e.stateNode;
			try {
				Gm(t, n);
			} catch (a) {
				Xe(e, e.return, a);
			}
		}
	}
	function Wh(e, t, n) {
		(n.props = Rl(e.type, e.memoizedProps)), (n.state = e.memoizedState);
		try {
			n.componentWillUnmount();
		} catch (a) {
			Xe(e, t, a);
		}
	}
	function br(e, t) {
		try {
			var n = e.ref;
			if (n !== null) {
				switch (e.tag) {
					case 26:
					case 27:
					case 5: {
						var a = e.stateNode;
						break;
					}
					case 30:
						a = e.stateNode;
						break;
					default:
						a = e.stateNode;
				}
				typeof n == "function" ? (e.refCleanup = n(a)) : (n.current = a);
			}
		} catch (s) {
			Xe(e, t, s);
		}
	}
	function zn(e, t) {
		var n = e.ref,
			a = e.refCleanup;
		if (n !== null)
			if (typeof a == "function")
				try {
					a();
				} catch (s) {
					Xe(e, t, s);
				} finally {
					(e.refCleanup = null),
						(e = e.alternate),
						e != null && (e.refCleanup = null);
				}
			else if (typeof n == "function")
				try {
					n(null);
				} catch (s) {
					Xe(e, t, s);
				}
			else n.current = null;
	}
	function ep(e) {
		var t = e.type,
			n = e.memoizedProps,
			a = e.stateNode;
		try {
			switch (t) {
				case "button":
				case "input":
				case "select":
				case "textarea":
					n.autoFocus && a.focus();
					break;
				case "img":
					n.src ? (a.src = n.src) : n.srcSet && (a.srcset = n.srcSet);
			}
		} catch (s) {
			Xe(e, e.return, s);
		}
	}
	function Su(e, t, n) {
		try {
			var a = e.stateNode;
			Kb(a, e.type, n, t), (a[Xt] = t);
		} catch (s) {
			Xe(e, e.return, s);
		}
	}
	function tp(e) {
		return (
			e.tag === 5 ||
			e.tag === 3 ||
			e.tag === 26 ||
			(e.tag === 27 && qa(e.type)) ||
			e.tag === 4
		);
	}
	function wu(e) {
		e: for (;;) {
			for (; e.sibling === null; ) {
				if (e.return === null || tp(e.return)) return null;
				e = e.return;
			}
			for (
				e.sibling.return = e.return, e = e.sibling;
				e.tag !== 5 && e.tag !== 6 && e.tag !== 18;
			) {
				if (
					(e.tag === 27 && qa(e.type)) ||
					e.flags & 2 ||
					e.child === null ||
					e.tag === 4
				)
					continue e;
				(e.child.return = e), (e = e.child);
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function Eu(e, t, n) {
		var a = e.tag;
		if (a === 5 || a === 6)
			(e = e.stateNode),
				t
					? (n.nodeType === 9
							? n.body
							: n.nodeName === "HTML"
								? n.ownerDocument.body
								: n
						).insertBefore(e, t)
					: ((t =
							n.nodeType === 9
								? n.body
								: n.nodeName === "HTML"
									? n.ownerDocument.body
									: n),
						t.appendChild(e),
						(n = n._reactRootContainer),
						n != null || t.onclick !== null || (t.onclick = In));
		else if (
			a !== 4 &&
			(a === 27 && qa(e.type) && ((n = e.stateNode), (t = null)),
			(e = e.child),
			e !== null)
		)
			for (Eu(e, t, n), e = e.sibling; e !== null; )
				Eu(e, t, n), (e = e.sibling);
	}
	function qo(e, t, n) {
		var a = e.tag;
		if (a === 5 || a === 6)
			(e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e);
		else if (
			a !== 4 &&
			(a === 27 && qa(e.type) && (n = e.stateNode), (e = e.child), e !== null)
		)
			for (qo(e, t, n), e = e.sibling; e !== null; )
				qo(e, t, n), (e = e.sibling);
	}
	function np(e) {
		var t = e.stateNode,
			n = e.memoizedProps;
		try {
			for (var a = e.type, s = t.attributes; s.length; )
				t.removeAttributeNode(s[0]);
			Mt(t, a, n), (t[Tt] = e), (t[Xt] = n);
		} catch (c) {
			Xe(e, e.return, c);
		}
	}
	var aa = !1,
		gt = !1,
		Nu = !1,
		ap = typeof WeakSet == "function" ? WeakSet : Set,
		Et = null;
	function Tb(e, t) {
		if (((e = e.containerInfo), (Qu = us), (e = pm(e)), vc(e))) {
			if ("selectionStart" in e)
				var n = { start: e.selectionStart, end: e.selectionEnd };
			else
				e: {
					n = ((n = e.ownerDocument) && n.defaultView) || window;
					var a = n.getSelection && n.getSelection();
					if (a && a.rangeCount !== 0) {
						n = a.anchorNode;
						var s = a.anchorOffset,
							c = a.focusNode;
						a = a.focusOffset;
						try {
							n.nodeType, c.nodeType;
						} catch {
							n = null;
							break e;
						}
						var p = 0,
							b = -1,
							_ = -1,
							U = 0,
							P = 0,
							K = e,
							V = null;
						t: for (;;) {
							for (
								var Q;
								K !== n || (s !== 0 && K.nodeType !== 3) || (b = p + s),
									K !== c || (a !== 0 && K.nodeType !== 3) || (_ = p + a),
									K.nodeType === 3 && (p += K.nodeValue.length),
									(Q = K.firstChild) !== null;
							)
								(V = K), (K = Q);
							for (;;) {
								if (K === e) break t;
								if (
									(V === n && ++U === s && (b = p),
									V === c && ++P === a && (_ = p),
									(Q = K.nextSibling) !== null)
								)
									break;
								(K = V), (V = K.parentNode);
							}
							K = Q;
						}
						n = b === -1 || _ === -1 ? null : { start: b, end: _ };
					} else n = null;
				}
			n = n || { start: 0, end: 0 };
		} else n = null;
		for (
			Pu = { focusedElem: e, selectionRange: n }, us = !1, Et = t;
			Et !== null;
		)
			if (
				((t = Et), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null)
			)
				(e.return = t), (Et = e);
			else
				for (; Et !== null; ) {
					switch (((t = Et), (c = t.alternate), (e = t.flags), t.tag)) {
						case 0:
							if (
								(e & 4) !== 0 &&
								((e = t.updateQueue),
								(e = e !== null ? e.events : null),
								e !== null)
							)
								for (n = 0; n < e.length; n++)
									(s = e[n]), (s.ref.impl = s.nextImpl);
							break;
						case 11:
						case 15:
							break;
						case 1:
							if ((e & 1024) !== 0 && c !== null) {
								(e = void 0),
									(n = t),
									(s = c.memoizedProps),
									(c = c.memoizedState),
									(a = n.stateNode);
								try {
									var he = Rl(n.type, s);
									(e = a.getSnapshotBeforeUpdate(he, c)),
										(a.__reactInternalSnapshotBeforeUpdate = e);
								} catch (ye) {
									Xe(n, n.return, ye);
								}
							}
							break;
						case 3:
							if ((e & 1024) !== 0) {
								if (
									((e = t.stateNode.containerInfo), (n = e.nodeType), n === 9)
								)
									Zu(e);
								else if (n === 1)
									switch (e.nodeName) {
										case "HEAD":
										case "HTML":
										case "BODY":
											Zu(e);
											break;
										default:
											e.textContent = "";
									}
							}
							break;
						case 5:
						case 26:
						case 27:
						case 6:
						case 4:
						case 17:
							break;
						default:
							if ((e & 1024) !== 0) throw Error(o(163));
					}
					if (((e = t.sibling), e !== null)) {
						(e.return = t.return), (Et = e);
						break;
					}
					Et = t.return;
				}
	}
	function lp(e, t, n) {
		var a = n.flags;
		switch (n.tag) {
			case 0:
			case 11:
			case 15:
				ia(e, n), a & 4 && xr(5, n);
				break;
			case 1:
				if ((ia(e, n), a & 4))
					if (((e = n.stateNode), t === null))
						try {
							e.componentDidMount();
						} catch (p) {
							Xe(n, n.return, p);
						}
					else {
						var s = Rl(n.type, t.memoizedProps);
						t = t.memoizedState;
						try {
							e.componentDidUpdate(s, t, e.__reactInternalSnapshotBeforeUpdate);
						} catch (p) {
							Xe(n, n.return, p);
						}
					}
				a & 64 && Jh(n), a & 512 && br(n, n.return);
				break;
			case 3:
				if ((ia(e, n), a & 64 && ((e = n.updateQueue), e !== null))) {
					if (((t = null), n.child !== null))
						switch (n.child.tag) {
							case 27:
							case 5:
								t = n.child.stateNode;
								break;
							case 1:
								t = n.child.stateNode;
						}
					try {
						Gm(e, t);
					} catch (p) {
						Xe(n, n.return, p);
					}
				}
				break;
			case 27:
				t === null && a & 4 && np(n);
			case 26:
			case 5:
				ia(e, n), t === null && a & 4 && ep(n), a & 512 && br(n, n.return);
				break;
			case 12:
				ia(e, n);
				break;
			case 31:
				ia(e, n), a & 4 && op(e, n);
				break;
			case 13:
				ia(e, n),
					a & 4 && sp(e, n),
					a & 64 &&
						((e = n.memoizedState),
						e !== null &&
							((e = e.dehydrated),
							e !== null && ((n = Lb.bind(null, n)), n1(e, n))));
				break;
			case 22:
				if (((a = n.memoizedState !== null || aa), !a)) {
					(t = (t !== null && t.memoizedState !== null) || gt), (s = aa);
					var c = gt;
					(aa = a),
						(gt = t) && !c ? ra(e, n, (n.subtreeFlags & 8772) !== 0) : ia(e, n),
						(aa = s),
						(gt = c);
				}
				break;
			case 30:
				break;
			default:
				ia(e, n);
		}
	}
	function ip(e) {
		var t = e.alternate;
		t !== null && ((e.alternate = null), ip(t)),
			(e.child = null),
			(e.deletions = null),
			(e.sibling = null),
			e.tag === 5 && ((t = e.stateNode), t !== null && ec(t)),
			(e.stateNode = null),
			(e.return = null),
			(e.dependencies = null),
			(e.memoizedProps = null),
			(e.memoizedState = null),
			(e.pendingProps = null),
			(e.stateNode = null),
			(e.updateQueue = null);
	}
	var We = null,
		Pt = !1;
	function la(e, t, n) {
		for (n = n.child; n !== null; ) rp(e, t, n), (n = n.sibling);
	}
	function rp(e, t, n) {
		if (Bt && typeof Bt.onCommitFiberUnmount == "function")
			try {
				Bt.onCommitFiberUnmount(un, n);
			} catch {}
		switch (n.tag) {
			case 26:
				gt || zn(n, t),
					la(e, t, n),
					n.memoizedState
						? n.memoizedState.count--
						: n.stateNode && ((n = n.stateNode), n.parentNode.removeChild(n));
				break;
			case 27: {
				gt || zn(n, t);
				var a = We,
					s = Pt;
				qa(n.type) && ((We = n.stateNode), (Pt = !1)),
					la(e, t, n),
					Ar(n.stateNode),
					(We = a),
					(Pt = s);
				break;
			}
			case 5:
				gt || zn(n, t);
			case 6:
				if (
					((a = We),
					(s = Pt),
					(We = null),
					la(e, t, n),
					(We = a),
					(Pt = s),
					We !== null)
				)
					if (Pt)
						try {
							(We.nodeType === 9
								? We.body
								: We.nodeName === "HTML"
									? We.ownerDocument.body
									: We
							).removeChild(n.stateNode);
						} catch (c) {
							Xe(n, t, c);
						}
					else
						try {
							We.removeChild(n.stateNode);
						} catch (c) {
							Xe(n, t, c);
						}
				break;
			case 18:
				We !== null &&
					(Pt
						? ((e = We),
							Jp(
								e.nodeType === 9
									? e.body
									: e.nodeName === "HTML"
										? e.ownerDocument.body
										: e,
								n.stateNode,
							),
							Ri(e))
						: Jp(We, n.stateNode));
				break;
			case 4:
				(a = We),
					(s = Pt),
					(We = n.stateNode.containerInfo),
					(Pt = !0),
					la(e, t, n),
					(We = a),
					(Pt = s);
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				La(2, n, t), gt || La(4, n, t), la(e, t, n);
				break;
			case 1:
				gt ||
					(zn(n, t),
					(a = n.stateNode),
					typeof a.componentWillUnmount == "function" && Wh(n, t, a)),
					la(e, t, n);
				break;
			case 21:
				la(e, t, n);
				break;
			case 22:
				(gt = (a = gt) || n.memoizedState !== null), la(e, t, n), (gt = a);
				break;
			default:
				la(e, t, n);
		}
	}
	function op(e, t) {
		if (
			t.memoizedState === null &&
			((e = t.alternate), e !== null && ((e = e.memoizedState), e !== null))
		) {
			e = e.dehydrated;
			try {
				Ri(e);
			} catch (n) {
				Xe(t, t.return, n);
			}
		}
	}
	function sp(e, t) {
		if (
			t.memoizedState === null &&
			((e = t.alternate),
			e !== null &&
				((e = e.memoizedState), e !== null && ((e = e.dehydrated), e !== null)))
		)
			try {
				Ri(e);
			} catch (n) {
				Xe(t, t.return, n);
			}
	}
	function _b(e) {
		switch (e.tag) {
			case 31:
			case 13:
			case 19: {
				var t = e.stateNode;
				return t === null && (t = e.stateNode = new ap()), t;
			}
			case 22:
				return (
					(e = e.stateNode),
					(t = e._retryCache),
					t === null && (t = e._retryCache = new ap()),
					t
				);
			default:
				throw Error(o(435, e.tag));
		}
	}
	function Xo(e, t) {
		var n = _b(e);
		t.forEach((a) => {
			if (!n.has(a)) {
				n.add(a);
				var s = Bb.bind(null, e, a);
				a.then(s, s);
			}
		});
	}
	function It(e, t) {
		var n = t.deletions;
		if (n !== null)
			for (var a = 0; a < n.length; a++) {
				var s = n[a],
					c = e,
					p = t,
					b = p;
				e: for (; b !== null; ) {
					switch (b.tag) {
						case 27:
							if (qa(b.type)) {
								(We = b.stateNode), (Pt = !1);
								break e;
							}
							break;
						case 5:
							(We = b.stateNode), (Pt = !1);
							break e;
						case 3:
						case 4:
							(We = b.stateNode.containerInfo), (Pt = !0);
							break e;
					}
					b = b.return;
				}
				if (We === null) throw Error(o(160));
				rp(c, p, s),
					(We = null),
					(Pt = !1),
					(c = s.alternate),
					c !== null && (c.return = null),
					(s.return = null);
			}
		if (t.subtreeFlags & 13886)
			for (t = t.child; t !== null; ) cp(t, e), (t = t.sibling);
	}
	var jn = null;
	function cp(e, t) {
		var n = e.alternate,
			a = e.flags;
		switch (e.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				It(t, e),
					Kt(e),
					a & 4 && (La(3, e, e.return), xr(3, e), La(5, e, e.return));
				break;
			case 1:
				It(t, e),
					Kt(e),
					a & 512 && (gt || n === null || zn(n, n.return)),
					a & 64 &&
						aa &&
						((e = e.updateQueue),
						e !== null &&
							((a = e.callbacks),
							a !== null &&
								((n = e.shared.hiddenCallbacks),
								(e.shared.hiddenCallbacks = n === null ? a : n.concat(a)))));
				break;
			case 26: {
				var s = jn;
				if (
					(It(t, e),
					Kt(e),
					a & 512 && (gt || n === null || zn(n, n.return)),
					a & 4)
				) {
					var c = n !== null ? n.memoizedState : null;
					if (((a = e.memoizedState), n === null))
						if (a === null)
							if (e.stateNode === null) {
								e: {
									(a = e.type),
										(n = e.memoizedProps),
										(s = s.ownerDocument || s);
									t: switch (a) {
										case "title":
											(c = s.getElementsByTagName("title")[0]),
												(!c ||
													c[Ii] ||
													c[Tt] ||
													c.namespaceURI === "http://www.w3.org/2000/svg" ||
													c.hasAttribute("itemprop")) &&
													((c = s.createElement(a)),
													s.head.insertBefore(
														c,
														s.querySelector("head > title"),
													)),
												Mt(c, a, n),
												(c[Tt] = e),
												wt(c),
												(a = c);
											break e;
										case "link": {
											var p = cg("link", "href", s).get(a + (n.href || ""));
											if (p) {
												for (var b = 0; b < p.length; b++)
													if (
														((c = p[b]),
														c.getAttribute("href") ===
															(n.href == null || n.href === ""
																? null
																: n.href) &&
															c.getAttribute("rel") ===
																(n.rel == null ? null : n.rel) &&
															c.getAttribute("title") ===
																(n.title == null ? null : n.title) &&
															c.getAttribute("crossorigin") ===
																(n.crossOrigin == null ? null : n.crossOrigin))
													) {
														p.splice(b, 1);
														break t;
													}
											}
											(c = s.createElement(a)),
												Mt(c, a, n),
												s.head.appendChild(c);
											break;
										}
										case "meta":
											if (
												(p = cg("meta", "content", s).get(
													a + (n.content || ""),
												))
											) {
												for (b = 0; b < p.length; b++)
													if (
														((c = p[b]),
														c.getAttribute("content") ===
															(n.content == null ? null : "" + n.content) &&
															c.getAttribute("name") ===
																(n.name == null ? null : n.name) &&
															c.getAttribute("property") ===
																(n.property == null ? null : n.property) &&
															c.getAttribute("http-equiv") ===
																(n.httpEquiv == null ? null : n.httpEquiv) &&
															c.getAttribute("charset") ===
																(n.charSet == null ? null : n.charSet))
													) {
														p.splice(b, 1);
														break t;
													}
											}
											(c = s.createElement(a)),
												Mt(c, a, n),
												s.head.appendChild(c);
											break;
										default:
											throw Error(o(468, a));
									}
									(c[Tt] = e), wt(c), (a = c);
								}
								e.stateNode = a;
							} else ug(s, e.type, e.stateNode);
						else e.stateNode = sg(s, a, e.memoizedProps);
					else
						c !== a
							? (c === null
									? n.stateNode !== null &&
										((n = n.stateNode), n.parentNode.removeChild(n))
									: c.count--,
								a === null
									? ug(s, e.type, e.stateNode)
									: sg(s, a, e.memoizedProps))
							: a === null &&
								e.stateNode !== null &&
								Su(e, e.memoizedProps, n.memoizedProps);
				}
				break;
			}
			case 27:
				It(t, e),
					Kt(e),
					a & 512 && (gt || n === null || zn(n, n.return)),
					n !== null && a & 4 && Su(e, e.memoizedProps, n.memoizedProps);
				break;
			case 5:
				if (
					(It(t, e),
					Kt(e),
					a & 512 && (gt || n === null || zn(n, n.return)),
					e.flags & 32)
				) {
					s = e.stateNode;
					try {
						Wl(s, "");
					} catch (he) {
						Xe(e, e.return, he);
					}
				}
				a & 4 &&
					e.stateNode != null &&
					((s = e.memoizedProps), Su(e, s, n !== null ? n.memoizedProps : s)),
					a & 1024 && (Nu = !0);
				break;
			case 6:
				if ((It(t, e), Kt(e), a & 4)) {
					if (e.stateNode === null) throw Error(o(162));
					(a = e.memoizedProps), (n = e.stateNode);
					try {
						n.nodeValue = a;
					} catch (he) {
						Xe(e, e.return, he);
					}
				}
				break;
			case 3:
				if (
					((rs = null),
					(s = jn),
					(jn = ls(t.containerInfo)),
					It(t, e),
					(jn = s),
					Kt(e),
					a & 4 && n !== null && n.memoizedState.isDehydrated)
				)
					try {
						Ri(t.containerInfo);
					} catch (he) {
						Xe(e, e.return, he);
					}
				Nu && ((Nu = !1), up(e));
				break;
			case 4:
				(a = jn),
					(jn = ls(e.stateNode.containerInfo)),
					It(t, e),
					Kt(e),
					(jn = a);
				break;
			case 12:
				It(t, e), Kt(e);
				break;
			case 31:
				It(t, e),
					Kt(e),
					a & 4 &&
						((a = e.updateQueue),
						a !== null && ((e.updateQueue = null), Xo(e, a)));
				break;
			case 13:
				It(t, e),
					Kt(e),
					e.child.flags & 8192 &&
						(e.memoizedState !== null) !=
							(n !== null && n.memoizedState !== null) &&
						(Po = ct()),
					a & 4 &&
						((a = e.updateQueue),
						a !== null && ((e.updateQueue = null), Xo(e, a)));
				break;
			case 22: {
				s = e.memoizedState !== null;
				var _ = n !== null && n.memoizedState !== null,
					U = aa,
					P = gt;
				if (
					((aa = U || s),
					(gt = P || _),
					It(t, e),
					(gt = P),
					(aa = U),
					Kt(e),
					a & 8192)
				)
					e: for (
						t = e.stateNode,
							t._visibility = s ? t._visibility & -2 : t._visibility | 1,
							s && (n === null || _ || aa || gt || Ml(e)),
							n = null,
							t = e;
						;
					) {
						if (t.tag === 5 || t.tag === 26) {
							if (n === null) {
								_ = n = t;
								try {
									if (((c = _.stateNode), s))
										(p = c.style),
											typeof p.setProperty == "function"
												? p.setProperty("display", "none", "important")
												: (p.display = "none");
									else {
										b = _.stateNode;
										var K = _.memoizedProps.style,
											V =
												K != null && Object.hasOwn(K, "display")
													? K.display
													: null;
										b.style.display =
											V == null || typeof V == "boolean" ? "" : ("" + V).trim();
									}
								} catch (he) {
									Xe(_, _.return, he);
								}
							}
						} else if (t.tag === 6) {
							if (n === null) {
								_ = t;
								try {
									_.stateNode.nodeValue = s ? "" : _.memoizedProps;
								} catch (he) {
									Xe(_, _.return, he);
								}
							}
						} else if (t.tag === 18) {
							if (n === null) {
								_ = t;
								try {
									var Q = _.stateNode;
									s ? Wp(Q, !0) : Wp(_.stateNode, !1);
								} catch (he) {
									Xe(_, _.return, he);
								}
							}
						} else if (
							((t.tag !== 22 && t.tag !== 23) ||
								t.memoizedState === null ||
								t === e) &&
							t.child !== null
						) {
							(t.child.return = t), (t = t.child);
							continue;
						}
						if (t === e) break;
						for (; t.sibling === null; ) {
							if (t.return === null || t.return === e) break e;
							n === t && (n = null), (t = t.return);
						}
						n === t && (n = null),
							(t.sibling.return = t.return),
							(t = t.sibling);
					}
				a & 4 &&
					((a = e.updateQueue),
					a !== null &&
						((n = a.retryQueue),
						n !== null && ((a.retryQueue = null), Xo(e, n))));
				break;
			}
			case 19:
				It(t, e),
					Kt(e),
					a & 4 &&
						((a = e.updateQueue),
						a !== null && ((e.updateQueue = null), Xo(e, a)));
				break;
			case 30:
				break;
			case 21:
				break;
			default:
				It(t, e), Kt(e);
		}
	}
	function Kt(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				for (var n, a = e.return; a !== null; ) {
					if (tp(a)) {
						n = a;
						break;
					}
					a = a.return;
				}
				if (n == null) throw Error(o(160));
				switch (n.tag) {
					case 27: {
						var s = n.stateNode,
							c = wu(e);
						qo(e, c, s);
						break;
					}
					case 5: {
						var p = n.stateNode;
						n.flags & 32 && (Wl(p, ""), (n.flags &= -33));
						var b = wu(e);
						qo(e, b, p);
						break;
					}
					case 3:
					case 4: {
						var _ = n.stateNode.containerInfo,
							U = wu(e);
						Eu(e, U, _);
						break;
					}
					default:
						throw Error(o(161));
				}
			} catch (P) {
				Xe(e, e.return, P);
			}
			e.flags &= -3;
		}
		t & 4096 && (e.flags &= -4097);
	}
	function up(e) {
		if (e.subtreeFlags & 1024)
			for (e = e.child; e !== null; ) {
				var t = e;
				up(t),
					t.tag === 5 && t.flags & 1024 && t.stateNode.reset(),
					(e = e.sibling);
			}
	}
	function ia(e, t) {
		if (t.subtreeFlags & 8772)
			for (t = t.child; t !== null; ) lp(e, t.alternate, t), (t = t.sibling);
	}
	function Ml(e) {
		for (e = e.child; e !== null; ) {
			var t = e;
			switch (t.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					La(4, t, t.return), Ml(t);
					break;
				case 1: {
					zn(t, t.return);
					var n = t.stateNode;
					typeof n.componentWillUnmount == "function" && Wh(t, t.return, n),
						Ml(t);
					break;
				}
				case 27:
					Ar(t.stateNode);
				case 26:
				case 5:
					zn(t, t.return), Ml(t);
					break;
				case 22:
					t.memoizedState === null && Ml(t);
					break;
				case 30:
					Ml(t);
					break;
				default:
					Ml(t);
			}
			e = e.sibling;
		}
	}
	function ra(e, t, n) {
		for (n = n && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
			var a = t.alternate,
				s = e,
				c = t,
				p = c.flags;
			switch (c.tag) {
				case 0:
				case 11:
				case 15:
					ra(s, c, n), xr(4, c);
					break;
				case 1:
					if (
						(ra(s, c, n),
						(a = c),
						(s = a.stateNode),
						typeof s.componentDidMount == "function")
					)
						try {
							s.componentDidMount();
						} catch (U) {
							Xe(a, a.return, U);
						}
					if (((a = c), (s = a.updateQueue), s !== null)) {
						var b = a.stateNode;
						try {
							var _ = s.shared.hiddenCallbacks;
							if (_ !== null)
								for (s.shared.hiddenCallbacks = null, s = 0; s < _.length; s++)
									Ym(_[s], b);
						} catch (U) {
							Xe(a, a.return, U);
						}
					}
					n && p & 64 && Jh(c), br(c, c.return);
					break;
				case 27:
					np(c);
				case 26:
				case 5:
					ra(s, c, n), n && a === null && p & 4 && ep(c), br(c, c.return);
					break;
				case 12:
					ra(s, c, n);
					break;
				case 31:
					ra(s, c, n), n && p & 4 && op(s, c);
					break;
				case 13:
					ra(s, c, n), n && p & 4 && sp(s, c);
					break;
				case 22:
					c.memoizedState === null && ra(s, c, n), br(c, c.return);
					break;
				case 30:
					break;
				default:
					ra(s, c, n);
			}
			t = t.sibling;
		}
	}
	function Cu(e, t) {
		var n = null;
		e !== null &&
			e.memoizedState !== null &&
			e.memoizedState.cachePool !== null &&
			(n = e.memoizedState.cachePool.pool),
			(e = null),
			t.memoizedState !== null &&
				t.memoizedState.cachePool !== null &&
				(e = t.memoizedState.cachePool.pool),
			e !== n && (e != null && e.refCount++, n != null && rr(n));
	}
	function ju(e, t) {
		(e = null),
			t.alternate !== null && (e = t.alternate.memoizedState.cache),
			(t = t.memoizedState.cache),
			t !== e && (t.refCount++, e != null && rr(e));
	}
	function Tn(e, t, n, a) {
		if (t.subtreeFlags & 10256)
			for (t = t.child; t !== null; ) fp(e, t, n, a), (t = t.sibling);
	}
	function fp(e, t, n, a) {
		var s = t.flags;
		switch (t.tag) {
			case 0:
			case 11:
			case 15:
				Tn(e, t, n, a), s & 2048 && xr(9, t);
				break;
			case 1:
				Tn(e, t, n, a);
				break;
			case 3:
				Tn(e, t, n, a),
					s & 2048 &&
						((e = null),
						t.alternate !== null && (e = t.alternate.memoizedState.cache),
						(t = t.memoizedState.cache),
						t !== e && (t.refCount++, e != null && rr(e)));
				break;
			case 12:
				if (s & 2048) {
					Tn(e, t, n, a), (e = t.stateNode);
					try {
						var c = t.memoizedProps,
							p = c.id,
							b = c.onPostCommit;
						typeof b == "function" &&
							b(
								p,
								t.alternate === null ? "mount" : "update",
								e.passiveEffectDuration,
								-0,
							);
					} catch (_) {
						Xe(t, t.return, _);
					}
				} else Tn(e, t, n, a);
				break;
			case 31:
				Tn(e, t, n, a);
				break;
			case 13:
				Tn(e, t, n, a);
				break;
			case 23:
				break;
			case 22:
				(c = t.stateNode),
					(p = t.alternate),
					t.memoizedState !== null
						? c._visibility & 2
							? Tn(e, t, n, a)
							: Sr(e, t)
						: c._visibility & 2
							? Tn(e, t, n, a)
							: ((c._visibility |= 2),
								xi(e, t, n, a, (t.subtreeFlags & 10256) !== 0 || !1)),
					s & 2048 && Cu(p, t);
				break;
			case 24:
				Tn(e, t, n, a), s & 2048 && ju(t.alternate, t);
				break;
			default:
				Tn(e, t, n, a);
		}
	}
	function xi(e, t, n, a, s) {
		for (
			s = s && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child;
			t !== null;
		) {
			var c = e,
				p = t,
				b = n,
				_ = a,
				U = p.flags;
			switch (p.tag) {
				case 0:
				case 11:
				case 15:
					xi(c, p, b, _, s), xr(8, p);
					break;
				case 23:
					break;
				case 22: {
					var P = p.stateNode;
					p.memoizedState !== null
						? P._visibility & 2
							? xi(c, p, b, _, s)
							: Sr(c, p)
						: ((P._visibility |= 2), xi(c, p, b, _, s)),
						s && U & 2048 && Cu(p.alternate, p);
					break;
				}
				case 24:
					xi(c, p, b, _, s), s && U & 2048 && ju(p.alternate, p);
					break;
				default:
					xi(c, p, b, _, s);
			}
			t = t.sibling;
		}
	}
	function Sr(e, t) {
		if (t.subtreeFlags & 10256)
			for (t = t.child; t !== null; ) {
				var n = e,
					a = t,
					s = a.flags;
				switch (a.tag) {
					case 22:
						Sr(n, a), s & 2048 && Cu(a.alternate, a);
						break;
					case 24:
						Sr(n, a), s & 2048 && ju(a.alternate, a);
						break;
					default:
						Sr(n, a);
				}
				t = t.sibling;
			}
	}
	var wr = 8192;
	function bi(e, t, n) {
		if (e.subtreeFlags & wr)
			for (e = e.child; e !== null; ) dp(e, t, n), (e = e.sibling);
	}
	function dp(e, t, n) {
		switch (e.tag) {
			case 26:
				bi(e, t, n),
					e.flags & wr &&
						e.memoizedState !== null &&
						h1(n, jn, e.memoizedState, e.memoizedProps);
				break;
			case 5:
				bi(e, t, n);
				break;
			case 3:
			case 4: {
				var a = jn;
				(jn = ls(e.stateNode.containerInfo)), bi(e, t, n), (jn = a);
				break;
			}
			case 22:
				e.memoizedState === null &&
					((a = e.alternate),
					a !== null && a.memoizedState !== null
						? ((a = wr), (wr = 16777216), bi(e, t, n), (wr = a))
						: bi(e, t, n));
				break;
			default:
				bi(e, t, n);
		}
	}
	function mp(e) {
		var t = e.alternate;
		if (t !== null && ((e = t.child), e !== null)) {
			t.child = null;
			do (t = e.sibling), (e.sibling = null), (e = t);
			while (e !== null);
		}
	}
	function Er(e) {
		var t = e.deletions;
		if ((e.flags & 16) !== 0) {
			if (t !== null)
				for (var n = 0; n < t.length; n++) {
					var a = t[n];
					(Et = a), pp(a, e);
				}
			mp(e);
		}
		if (e.subtreeFlags & 10256)
			for (e = e.child; e !== null; ) hp(e), (e = e.sibling);
	}
	function hp(e) {
		switch (e.tag) {
			case 0:
			case 11:
			case 15:
				Er(e), e.flags & 2048 && La(9, e, e.return);
				break;
			case 3:
				Er(e);
				break;
			case 12:
				Er(e);
				break;
			case 22: {
				var t = e.stateNode;
				e.memoizedState !== null &&
				t._visibility & 2 &&
				(e.return === null || e.return.tag !== 13)
					? ((t._visibility &= -3), Qo(e))
					: Er(e);
				break;
			}
			default:
				Er(e);
		}
	}
	function Qo(e) {
		var t = e.deletions;
		if ((e.flags & 16) !== 0) {
			if (t !== null)
				for (var n = 0; n < t.length; n++) {
					var a = t[n];
					(Et = a), pp(a, e);
				}
			mp(e);
		}
		for (e = e.child; e !== null; ) {
			switch (((t = e), t.tag)) {
				case 0:
				case 11:
				case 15:
					La(8, t, t.return), Qo(t);
					break;
				case 22:
					(n = t.stateNode),
						n._visibility & 2 && ((n._visibility &= -3), Qo(t));
					break;
				default:
					Qo(t);
			}
			e = e.sibling;
		}
	}
	function pp(e, t) {
		for (; Et !== null; ) {
			var n = Et;
			switch (n.tag) {
				case 0:
				case 11:
				case 15:
					La(8, n, t);
					break;
				case 23:
				case 22:
					if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
						var a = n.memoizedState.cachePool.pool;
						a != null && a.refCount++;
					}
					break;
				case 24:
					rr(n.memoizedState.cache);
			}
			if (((a = n.child), a !== null)) (a.return = n), (Et = a);
			else
				for (n = e; Et !== null; ) {
					a = Et;
					var s = a.sibling,
						c = a.return;
					if ((ip(a), a === n)) {
						Et = null;
						break;
					}
					if (s !== null) {
						(s.return = c), (Et = s);
						break;
					}
					Et = c;
				}
		}
	}
	var Ab = {
			getCacheForType: (e) => {
				var t = At(mt),
					n = t.data.get(e);
				return n === void 0 && ((n = e()), t.data.set(e, n)), n;
			},
			cacheSignal: () => At(mt).controller.signal,
		},
		Rb = typeof WeakMap == "function" ? WeakMap : Map,
		Ye = 0,
		Ze = null,
		Ae = null,
		Me = 0,
		qe = 0,
		rn = null,
		Ba = !1,
		Si = !1,
		Tu = !1,
		oa = 0,
		lt = 0,
		Ua = 0,
		Ol = 0,
		_u = 0,
		on = 0,
		wi = 0,
		Nr = null,
		Zt = null,
		Au = !1,
		Po = 0,
		gp = 0,
		Io = 1 / 0,
		Ko = null,
		Ha = null,
		xt = 0,
		Va = null,
		Ei = null,
		sa = 0,
		Ru = 0,
		Mu = null,
		vp = null,
		Cr = 0,
		Ou = null;
	function sn() {
		return (Ye & 2) !== 0 && Me !== 0 ? Me & -Me : M.T !== null ? Uu() : Pl();
	}
	function yp() {
		if (on === 0)
			if ((Me & 536870912) === 0 || De) {
				var e = Wt;
				(Wt <<= 1), (Wt & 3932160) === 0 && (Wt = 262144), (on = e);
			} else on = 536870912;
		return (e = an.current), e !== null && (e.flags |= 32), on;
	}
	function $t(e, t, n) {
		((e === Ze && (qe === 2 || qe === 9)) || e.cancelPendingCommit !== null) &&
			(Ni(e, 0), Ya(e, Me, on, !1)),
			ft(e, n),
			((Ye & 2) === 0 || e !== Ze) &&
				(e === Ze &&
					((Ye & 2) === 0 && (Ol |= n), lt === 4 && Ya(e, Me, on, !1)),
				kn(e));
	}
	function xp(e, t, n) {
		if ((Ye & 6) !== 0) throw Error(o(327));
		var a = (!n && (t & 127) === 0 && (t & e.expiredLanes) === 0) || Na(e, t),
			s = a ? Db(e, t) : zu(e, t, !0),
			c = a;
		do {
			if (s === 0) {
				Si && !a && Ya(e, t, 0, !1);
				break;
			} else {
				if (((n = e.current.alternate), c && !Mb(n))) {
					(s = zu(e, t, !1)), (c = !1);
					continue;
				}
				if (s === 2) {
					if (((c = t), e.errorRecoveryDisabledLanes & c)) var p = 0;
					else
						(p = e.pendingLanes & -536870913),
							(p = p !== 0 ? p : p & 536870912 ? 536870912 : 0);
					if (p !== 0) {
						t = p;
						e: {
							var b = e;
							s = Nr;
							var _ = b.current.memoizedState.isDehydrated;
							if ((_ && (Ni(b, p).flags |= 256), (p = zu(b, p, !1)), p !== 2)) {
								if (Tu && !_) {
									(b.errorRecoveryDisabledLanes |= c), (Ol |= c), (s = 4);
									break e;
								}
								(c = Zt),
									(Zt = s),
									c !== null && (Zt === null ? (Zt = c) : Zt.push.apply(Zt, c));
							}
							s = p;
						}
						if (((c = !1), s !== 2)) continue;
					}
				}
				if (s === 1) {
					Ni(e, 0), Ya(e, t, 0, !0);
					break;
				}
				e: {
					switch (((a = e), (c = s), c)) {
						case 0:
						case 1:
							throw Error(o(345));
						case 4:
							if ((t & 4194048) !== t) break;
						case 6:
							Ya(a, t, on, !Ba);
							break e;
						case 2:
							Zt = null;
							break;
						case 3:
						case 5:
							break;
						default:
							throw Error(o(329));
					}
					if ((t & 62914560) === t && ((s = Po + 300 - ct()), 10 < s)) {
						if ((Ya(a, t, on, !Ba), ml(a, 0, !0) !== 0)) break e;
						(sa = t),
							(a.timeoutHandle = $p(
								bp.bind(
									null,
									a,
									n,
									Zt,
									Ko,
									Au,
									t,
									on,
									Ol,
									wi,
									Ba,
									c,
									"Throttled",
									-0,
									0,
								),
								s,
							));
						break e;
					}
					bp(a, n, Zt, Ko, Au, t, on, Ol, wi, Ba, c, null, -0, 0);
				}
			}
			break;
		} while (!0);
		kn(e);
	}
	function bp(e, t, n, a, s, c, p, b, _, U, P, K, V, Q) {
		if (
			((e.timeoutHandle = -1),
			(K = t.subtreeFlags),
			K & 8192 || (K & 16785408) === 16785408)
		) {
			(K = {
				stylesheets: null,
				count: 0,
				imgCount: 0,
				imgBytes: 0,
				suspenseyImages: [],
				waitingForImages: !0,
				waitingForViewTransition: !1,
				unsuspend: In,
			}),
				dp(t, c, K);
			var he =
				(c & 62914560) === c ? Po - ct() : (c & 4194048) === c ? gp - ct() : 0;
			if (((he = p1(K, he)), he !== null)) {
				(sa = c),
					(e.cancelPendingCommit = he(
						_p.bind(null, e, t, c, n, a, s, p, b, _, P, K, null, V, Q),
					)),
					Ya(e, c, p, !U);
				return;
			}
		}
		_p(e, t, c, n, a, s, p, b, _);
	}
	function Mb(e) {
		for (var t = e; ; ) {
			var n = t.tag;
			if (
				(n === 0 || n === 11 || n === 15) &&
				t.flags & 16384 &&
				((n = t.updateQueue), n !== null && ((n = n.stores), n !== null))
			)
				for (var a = 0; a < n.length; a++) {
					var s = n[a],
						c = s.getSnapshot;
					s = s.value;
					try {
						if (!tn(c(), s)) return !1;
					} catch {
						return !1;
					}
				}
			if (((n = t.child), t.subtreeFlags & 16384 && n !== null))
				(n.return = t), (t = n);
			else {
				if (t === e) break;
				for (; t.sibling === null; ) {
					if (t.return === null || t.return === e) return !0;
					t = t.return;
				}
				(t.sibling.return = t.return), (t = t.sibling);
			}
		}
		return !0;
	}
	function Ya(e, t, n, a) {
		(t &= ~_u),
			(t &= ~Ol),
			(e.suspendedLanes |= t),
			(e.pingedLanes &= ~t),
			a && (e.warmLanes |= t),
			(a = e.expirationTimes);
		for (var s = t; 0 < s; ) {
			var c = 31 - Dt(s),
				p = 1 << c;
			(a[c] = -1), (s &= ~p);
		}
		n !== 0 && dt(e, n, t);
	}
	function Zo() {
		return (Ye & 6) === 0 ? (jr(0), !1) : !0;
	}
	function Du() {
		if (Ae !== null) {
			if (qe === 0) var e = Ae.return;
			else (e = Ae), (Fn = El = null), Zc(e), (hi = null), (sr = 0), (e = Ae);
			for (; e !== null; ) Fh(e.alternate, e), (e = e.return);
			Ae = null;
		}
	}
	function Ni(e, t) {
		var n = e.timeoutHandle;
		n !== -1 && ((e.timeoutHandle = -1), Fb(n)),
			(n = e.cancelPendingCommit),
			n !== null && ((e.cancelPendingCommit = null), n()),
			(sa = 0),
			Du(),
			(Ze = e),
			(Ae = n = Zn(e.current, null)),
			(Me = t),
			(qe = 0),
			(rn = null),
			(Ba = !1),
			(Si = Na(e, t)),
			(Tu = !1),
			(wi = on = _u = Ol = Ua = lt = 0),
			(Zt = Nr = null),
			(Au = !1),
			(t & 8) !== 0 && (t |= t & 32);
		var a = e.entangledLanes;
		if (a !== 0)
			for (e = e.entanglements, a &= t; 0 < a; ) {
				var s = 31 - Dt(a),
					c = 1 << s;
				(t |= e[s]), (a &= ~c);
			}
		return (oa = t), go(), n;
	}
	function Sp(e, t) {
		(Ee = null),
			(M.H = gr),
			t === mi || t === No
				? ((t = Bm()), (qe = 3))
				: t === Bc
					? ((t = Bm()), (qe = 4))
					: (qe =
							t === fu
								? 8
								: t !== null &&
										typeof t == "object" &&
										typeof t.then == "function"
									? 6
									: 1),
			(rn = t),
			Ae === null && ((lt = 1), Uo(e, pn(t, e.current)));
	}
	function wp() {
		var e = an.current;
		return e === null
			? !0
			: (Me & 4194048) === Me
				? xn === null
				: (Me & 62914560) === Me || (Me & 536870912) !== 0
					? e === xn
					: !1;
	}
	function Ep() {
		var e = M.H;
		return (M.H = gr), e === null ? gr : e;
	}
	function Np() {
		var e = M.A;
		return (M.A = Ab), e;
	}
	function $o() {
		(lt = 4),
			Ba || ((Me & 4194048) !== Me && an.current !== null) || (Si = !0),
			((Ua & 134217727) === 0 && (Ol & 134217727) === 0) ||
				Ze === null ||
				Ya(Ze, Me, on, !1);
	}
	function zu(e, t, n) {
		var a = Ye;
		Ye |= 2;
		var s = Ep(),
			c = Np();
		(Ze !== e || Me !== t) && ((Ko = null), Ni(e, t)), (t = !1);
		var p = lt;
		e: do
			try {
				if (qe !== 0 && Ae !== null) {
					var b = Ae,
						_ = rn;
					switch (qe) {
						case 8:
							Du(), (p = 6);
							break e;
						case 3:
						case 2:
						case 9:
						case 6: {
							an.current === null && (t = !0);
							var U = qe;
							if (((qe = 0), (rn = null), Ci(e, b, _, U), n && Si)) {
								p = 0;
								break e;
							}
							break;
						}
						default:
							(U = qe), (qe = 0), (rn = null), Ci(e, b, _, U);
					}
				}
				Ob(), (p = lt);
				break;
			} catch (P) {
				Sp(e, P);
			}
		while (!0);
		return (
			t && e.shellSuspendCounter++,
			(Fn = El = null),
			(Ye = a),
			(M.H = s),
			(M.A = c),
			Ae === null && ((Ze = null), (Me = 0), go()),
			p
		);
	}
	function Ob() {
		for (; Ae !== null; ) Cp(Ae);
	}
	function Db(e, t) {
		var n = Ye;
		Ye |= 2;
		var a = Ep(),
			s = Np();
		Ze !== e || Me !== t
			? ((Ko = null), (Io = ct() + 500), Ni(e, t))
			: (Si = Na(e, t));
		e: do
			try {
				if (qe !== 0 && Ae !== null) {
					t = Ae;
					var c = rn;
					t: switch (qe) {
						case 1:
							(qe = 0), (rn = null), Ci(e, t, c, 1);
							break;
						case 2:
						case 9:
							if (km(c)) {
								(qe = 0), (rn = null), jp(t);
								break;
							}
							(t = () => {
								(qe !== 2 && qe !== 9) || Ze !== e || (qe = 7), kn(e);
							}),
								c.then(t, t);
							break e;
						case 3:
							qe = 7;
							break e;
						case 4:
							qe = 5;
							break e;
						case 7:
							km(c)
								? ((qe = 0), (rn = null), jp(t))
								: ((qe = 0), (rn = null), Ci(e, t, c, 7));
							break;
						case 5: {
							var p = null;
							switch (Ae.tag) {
								case 26:
									p = Ae.memoizedState;
								case 5:
								case 27: {
									var b = Ae;
									if (p ? fg(p) : b.stateNode.complete) {
										(qe = 0), (rn = null);
										var _ = b.sibling;
										if (_ !== null) Ae = _;
										else {
											var U = b.return;
											U !== null ? ((Ae = U), Fo(U)) : (Ae = null);
										}
										break t;
									}
								}
							}
							(qe = 0), (rn = null), Ci(e, t, c, 5);
							break;
						}
						case 6:
							(qe = 0), (rn = null), Ci(e, t, c, 6);
							break;
						case 8:
							Du(), (lt = 6);
							break e;
						default:
							throw Error(o(462));
					}
				}
				zb();
				break;
			} catch (P) {
				Sp(e, P);
			}
		while (!0);
		return (
			(Fn = El = null),
			(M.H = a),
			(M.A = s),
			(Ye = n),
			Ae !== null ? 0 : ((Ze = null), (Me = 0), go(), lt)
		);
	}
	function zb() {
		for (; Ae !== null && !nt(); ) Cp(Ae);
	}
	function Cp(e) {
		var t = Zh(e.alternate, e, oa);
		(e.memoizedProps = e.pendingProps), t === null ? Fo(e) : (Ae = t);
	}
	function jp(e) {
		var t = e,
			n = t.alternate;
		switch (t.tag) {
			case 15:
			case 0:
				t = qh(n, t, t.pendingProps, t.type, void 0, Me);
				break;
			case 11:
				t = qh(n, t, t.pendingProps, t.type.render, t.ref, Me);
				break;
			case 5:
				Zc(t);
			default:
				Fh(n, t), (t = Ae = Nm(t, oa)), (t = Zh(n, t, oa));
		}
		(e.memoizedProps = e.pendingProps), t === null ? Fo(e) : (Ae = t);
	}
	function Ci(e, t, n, a) {
		(Fn = El = null), Zc(t), (hi = null), (sr = 0);
		var s = t.return;
		try {
			if (wb(e, s, t, n, Me)) {
				(lt = 1), Uo(e, pn(n, e.current)), (Ae = null);
				return;
			}
		} catch (c) {
			if (s !== null) throw ((Ae = s), c);
			(lt = 1), Uo(e, pn(n, e.current)), (Ae = null);
			return;
		}
		t.flags & 32768
			? (De || a === 1
					? (e = !0)
					: Si || (Me & 536870912) !== 0
						? (e = !1)
						: ((Ba = e = !0),
							(a === 2 || a === 9 || a === 3 || a === 6) &&
								((a = an.current),
								a !== null && a.tag === 13 && (a.flags |= 16384))),
				Tp(t, e))
			: Fo(t);
	}
	function Fo(e) {
		var t = e;
		do {
			if ((t.flags & 32768) !== 0) {
				Tp(t, Ba);
				return;
			}
			e = t.return;
			var n = Cb(t.alternate, t, oa);
			if (n !== null) {
				Ae = n;
				return;
			}
			if (((t = t.sibling), t !== null)) {
				Ae = t;
				return;
			}
			Ae = t = e;
		} while (t !== null);
		lt === 0 && (lt = 5);
	}
	function Tp(e, t) {
		do {
			var n = jb(e.alternate, e);
			if (n !== null) {
				(n.flags &= 32767), (Ae = n);
				return;
			}
			if (
				((n = e.return),
				n !== null &&
					((n.flags |= 32768), (n.subtreeFlags = 0), (n.deletions = null)),
				!t && ((e = e.sibling), e !== null))
			) {
				Ae = e;
				return;
			}
			Ae = e = n;
		} while (e !== null);
		(lt = 6), (Ae = null);
	}
	function _p(e, t, n, a, s, c, p, b, _) {
		e.cancelPendingCommit = null;
		do Jo();
		while (xt !== 0);
		if ((Ye & 6) !== 0) throw Error(o(327));
		if (t !== null) {
			if (t === e.current) throw Error(o(177));
			if (
				((c = t.lanes | t.childLanes),
				(c |= wc),
				hl(e, n, c, p, b, _),
				e === Ze && ((Ae = Ze = null), (Me = 0)),
				(Ei = t),
				(Va = e),
				(sa = n),
				(Ru = c),
				(Mu = s),
				(vp = a),
				(t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
					? ((e.callbackNode = null),
						(e.callbackPriority = 0),
						Ub(Xl, () => (Dp(), null)))
					: ((e.callbackNode = null), (e.callbackPriority = 0)),
				(a = (t.flags & 13878) !== 0),
				(t.subtreeFlags & 13878) !== 0 || a)
			) {
				(a = M.T), (M.T = null), (s = H.p), (H.p = 2), (p = Ye), (Ye |= 4);
				try {
					Tb(e, t, n);
				} finally {
					(Ye = p), (H.p = s), (M.T = a);
				}
			}
			(xt = 1), Ap(), Rp(), Mp();
		}
	}
	function Ap() {
		if (xt === 1) {
			xt = 0;
			var e = Va,
				t = Ei,
				n = (t.flags & 13878) !== 0;
			if ((t.subtreeFlags & 13878) !== 0 || n) {
				(n = M.T), (M.T = null);
				var a = H.p;
				H.p = 2;
				var s = Ye;
				Ye |= 4;
				try {
					cp(t, e);
					var c = Pu,
						p = pm(e.containerInfo),
						b = c.focusedElem,
						_ = c.selectionRange;
					if (
						p !== b &&
						b &&
						b.ownerDocument &&
						hm(b.ownerDocument.documentElement, b)
					) {
						if (_ !== null && vc(b)) {
							var U = _.start,
								P = _.end;
							if ((P === void 0 && (P = U), "selectionStart" in b))
								(b.selectionStart = U),
									(b.selectionEnd = Math.min(P, b.value.length));
							else {
								var K = b.ownerDocument || document,
									V = (K && K.defaultView) || window;
								if (V.getSelection) {
									var Q = V.getSelection(),
										he = b.textContent.length,
										ye = Math.min(_.start, he),
										Ie = _.end === void 0 ? ye : Math.min(_.end, he);
									!Q.extend && ye > Ie && ((p = Ie), (Ie = ye), (ye = p));
									var k = mm(b, ye),
										D = mm(b, Ie);
									if (
										k &&
										D &&
										(Q.rangeCount !== 1 ||
											Q.anchorNode !== k.node ||
											Q.anchorOffset !== k.offset ||
											Q.focusNode !== D.node ||
											Q.focusOffset !== D.offset)
									) {
										var B = K.createRange();
										B.setStart(k.node, k.offset),
											Q.removeAllRanges(),
											ye > Ie
												? (Q.addRange(B), Q.extend(D.node, D.offset))
												: (B.setEnd(D.node, D.offset), Q.addRange(B));
									}
								}
							}
						}
						for (K = [], Q = b; (Q = Q.parentNode); )
							Q.nodeType === 1 &&
								K.push({ element: Q, left: Q.scrollLeft, top: Q.scrollTop });
						for (
							typeof b.focus == "function" && b.focus(), b = 0;
							b < K.length;
							b++
						) {
							var I = K[b];
							(I.element.scrollLeft = I.left), (I.element.scrollTop = I.top);
						}
					}
					(us = !!Qu), (Pu = Qu = null);
				} finally {
					(Ye = s), (H.p = a), (M.T = n);
				}
			}
			(e.current = t), (xt = 2);
		}
	}
	function Rp() {
		if (xt === 2) {
			xt = 0;
			var e = Va,
				t = Ei,
				n = (t.flags & 8772) !== 0;
			if ((t.subtreeFlags & 8772) !== 0 || n) {
				(n = M.T), (M.T = null);
				var a = H.p;
				H.p = 2;
				var s = Ye;
				Ye |= 4;
				try {
					lp(e, t.alternate, t);
				} finally {
					(Ye = s), (H.p = a), (M.T = n);
				}
			}
			xt = 3;
		}
	}
	function Mp() {
		if (xt === 4 || xt === 3) {
			(xt = 0), Wr();
			var e = Va,
				t = Ei,
				n = sa,
				a = vp;
			(t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
				? (xt = 5)
				: ((xt = 0), (Ei = Va = null), Op(e, e.pendingLanes));
			var s = e.pendingLanes;
			if (
				(s === 0 && (Ha = null),
				qt(n),
				(t = t.stateNode),
				Bt && typeof Bt.onCommitFiberRoot == "function")
			)
				try {
					Bt.onCommitFiberRoot(un, t, void 0, (t.current.flags & 128) === 128);
				} catch {}
			if (a !== null) {
				(t = M.T), (s = H.p), (H.p = 2), (M.T = null);
				try {
					for (var c = e.onRecoverableError, p = 0; p < a.length; p++) {
						var b = a[p];
						c(b.value, { componentStack: b.stack });
					}
				} finally {
					(M.T = t), (H.p = s);
				}
			}
			(sa & 3) !== 0 && Jo(),
				kn(e),
				(s = e.pendingLanes),
				(n & 261930) !== 0 && (s & 42) !== 0
					? e === Ou
						? Cr++
						: ((Cr = 0), (Ou = e))
					: (Cr = 0),
				jr(0);
		}
	}
	function Op(e, t) {
		(e.pooledCacheLanes &= t) === 0 &&
			((t = e.pooledCache), t != null && ((e.pooledCache = null), rr(t)));
	}
	function Jo() {
		return Ap(), Rp(), Mp(), Dp();
	}
	function Dp() {
		if (xt !== 5) return !1;
		var e = Va,
			t = Ru;
		Ru = 0;
		var n = qt(sa),
			a = M.T,
			s = H.p;
		try {
			(H.p = 32 > n ? 32 : n), (M.T = null), (n = Mu), (Mu = null);
			var c = Va,
				p = sa;
			if (((xt = 0), (Ei = Va = null), (sa = 0), (Ye & 6) !== 0))
				throw Error(o(331));
			var b = Ye;
			if (
				((Ye |= 4),
				hp(c.current),
				fp(c, c.current, p, n),
				(Ye = b),
				jr(0, !1),
				Bt && typeof Bt.onPostCommitFiberRoot == "function")
			)
				try {
					Bt.onPostCommitFiberRoot(un, c);
				} catch {}
			return !0;
		} finally {
			(H.p = s), (M.T = a), Op(e, t);
		}
	}
	function zp(e, t, n) {
		(t = pn(n, t)),
			(t = uu(e.stateNode, t, 2)),
			(e = Da(e, t, 2)),
			e !== null && (ft(e, 2), kn(e));
	}
	function Xe(e, t, n) {
		if (e.tag === 3) zp(e, e, n);
		else
			for (; t !== null; ) {
				if (t.tag === 3) {
					zp(t, e, n);
					break;
				} else if (t.tag === 1) {
					var a = t.stateNode;
					if (
						typeof t.type.getDerivedStateFromError == "function" ||
						(typeof a.componentDidCatch == "function" &&
							(Ha === null || !Ha.has(a)))
					) {
						(e = pn(n, e)),
							(n = kh(2)),
							(a = Da(t, n, 2)),
							a !== null && (Lh(n, a, t, e), ft(a, 2), kn(a));
						break;
					}
				}
				t = t.return;
			}
	}
	function ku(e, t, n) {
		var a = e.pingCache;
		if (a === null) {
			a = e.pingCache = new Rb();
			var s = new Set();
			a.set(t, s);
		} else (s = a.get(t)), s === void 0 && ((s = new Set()), a.set(t, s));
		s.has(n) ||
			((Tu = !0), s.add(n), (e = kb.bind(null, e, t, n)), t.then(e, e));
	}
	function kb(e, t, n) {
		var a = e.pingCache;
		a !== null && a.delete(t),
			(e.pingedLanes |= e.suspendedLanes & n),
			(e.warmLanes &= ~n),
			Ze === e &&
				(Me & n) === n &&
				(lt === 4 || (lt === 3 && (Me & 62914560) === Me && 300 > ct() - Po)
					? (Ye & 2) === 0 && Ni(e, 0)
					: (_u |= n),
				wi === Me && (wi = 0)),
			kn(e);
	}
	function kp(e, t) {
		t === 0 && (t = it()), (e = bl(e, t)), e !== null && (ft(e, t), kn(e));
	}
	function Lb(e) {
		var t = e.memoizedState,
			n = 0;
		t !== null && (n = t.retryLane), kp(e, n);
	}
	function Bb(e, t) {
		var n = 0;
		switch (e.tag) {
			case 31:
			case 13: {
				var a = e.stateNode,
					s = e.memoizedState;
				s !== null && (n = s.retryLane);
				break;
			}
			case 19:
				a = e.stateNode;
				break;
			case 22:
				a = e.stateNode._retryCache;
				break;
			default:
				throw Error(o(314));
		}
		a !== null && a.delete(t), kp(e, n);
	}
	function Ub(e, t) {
		return cl(e, t);
	}
	var Wo = null,
		ji = null,
		Lu = !1,
		es = !1,
		Bu = !1,
		Ga = 0;
	function kn(e) {
		e !== ji &&
			e.next === null &&
			(ji === null ? (Wo = ji = e) : (ji = ji.next = e)),
			(es = !0),
			Lu || ((Lu = !0), Vb());
	}
	function jr(e, t) {
		if (!Bu && es) {
			Bu = !0;
			do
				for (var n = !1, a = Wo; a !== null; ) {
					if (e !== 0) {
						var s = a.pendingLanes;
						if (s === 0) var c = 0;
						else {
							var p = a.suspendedLanes,
								b = a.pingedLanes;
							(c = (1 << (31 - Dt(42 | e) + 1)) - 1),
								(c &= s & ~(p & ~b)),
								(c = c & 201326741 ? (c & 201326741) | 1 : c ? c | 2 : 0);
						}
						c !== 0 && ((n = !0), Hp(a, c));
					} else
						(c = Me),
							(c = ml(
								a,
								a === Ze ? c : 0,
								a.cancelPendingCommit !== null || a.timeoutHandle !== -1,
							)),
							(c & 3) === 0 || Na(a, c) || ((n = !0), Hp(a, c));
					a = a.next;
				}
			while (n);
			Bu = !1;
		}
	}
	function Hb() {
		Lp();
	}
	function Lp() {
		es = Lu = !1;
		var e = 0;
		Ga !== 0 && $b() && (e = Ga);
		for (var t = ct(), n = null, a = Wo; a !== null; ) {
			var s = a.next,
				c = Bp(a, t);
			c === 0
				? ((a.next = null),
					n === null ? (Wo = s) : (n.next = s),
					s === null && (ji = n))
				: ((n = a), (e !== 0 || (c & 3) !== 0) && (es = !0)),
				(a = s);
		}
		(xt !== 0 && xt !== 5) || jr(e), Ga !== 0 && (Ga = 0);
	}
	function Bp(e, t) {
		for (
			var n = e.suspendedLanes,
				a = e.pingedLanes,
				s = e.expirationTimes,
				c = e.pendingLanes & -62914561;
			0 < c;
		) {
			var p = 31 - Dt(c),
				b = 1 << p,
				_ = s[p];
			_ === -1
				? ((b & n) === 0 || (b & a) !== 0) && (s[p] = be(b, t))
				: _ <= t && (e.expiredLanes |= b),
				(c &= ~b);
		}
		if (
			((t = Ze),
			(n = Me),
			(n = ml(
				e,
				e === t ? n : 0,
				e.cancelPendingCommit !== null || e.timeoutHandle !== -1,
			)),
			(a = e.callbackNode),
			n === 0 ||
				(e === t && (qe === 2 || qe === 9)) ||
				e.cancelPendingCommit !== null)
		)
			return (
				a !== null && a !== null && ul(a),
				(e.callbackNode = null),
				(e.callbackPriority = 0)
			);
		if ((n & 3) === 0 || Na(e, n)) {
			if (((t = n & -n), t === e.callbackPriority)) return t;
			switch ((a !== null && ul(a), qt(n))) {
				case 2:
				case 8:
					n = fl;
					break;
				case 32:
					n = Xl;
					break;
				case 268435456:
					n = Ql;
					break;
				default:
					n = Xl;
			}
			return (
				(a = Up.bind(null, e)),
				(n = cl(n, a)),
				(e.callbackPriority = t),
				(e.callbackNode = n),
				t
			);
		}
		return (
			a !== null && a !== null && ul(a),
			(e.callbackPriority = 2),
			(e.callbackNode = null),
			2
		);
	}
	function Up(e, t) {
		if (xt !== 0 && xt !== 5)
			return (e.callbackNode = null), (e.callbackPriority = 0), null;
		var n = e.callbackNode;
		if (Jo() && e.callbackNode !== n) return null;
		var a = Me;
		return (
			(a = ml(
				e,
				e === Ze ? a : 0,
				e.cancelPendingCommit !== null || e.timeoutHandle !== -1,
			)),
			a === 0
				? null
				: (xp(e, a, t),
					Bp(e, ct()),
					e.callbackNode != null && e.callbackNode === n
						? Up.bind(null, e)
						: null)
		);
	}
	function Hp(e, t) {
		if (Jo()) return null;
		xp(e, t, !0);
	}
	function Vb() {
		Jb(() => {
			(Ye & 6) !== 0 ? cl(eo, Hb) : Lp();
		});
	}
	function Uu() {
		if (Ga === 0) {
			var e = fi;
			e === 0 && ((e = Ea), (Ea <<= 1), (Ea & 261888) === 0 && (Ea = 256)),
				(Ga = e);
		}
		return Ga;
	}
	function Vp(e) {
		return e == null || typeof e == "symbol" || typeof e == "boolean"
			? null
			: typeof e == "function"
				? e
				: oo("" + e);
	}
	function Yp(e, t) {
		var n = t.ownerDocument.createElement("input");
		return (
			(n.name = t.name),
			(n.value = t.value),
			e.id && n.setAttribute("form", e.id),
			t.parentNode.insertBefore(n, t),
			(e = new FormData(e)),
			n.parentNode.removeChild(n),
			e
		);
	}
	function Yb(e, t, n, a, s) {
		if (t === "submit" && n && n.stateNode === s) {
			var c = Vp((s[Xt] || null).action),
				p = a.submitter;
			p &&
				((t = (t = p[Xt] || null)
					? Vp(t.formAction)
					: p.getAttribute("formAction")),
				t !== null && ((c = t), (p = null)));
			var b = new fo("action", "action", null, a, s);
			e.push({
				event: b,
				listeners: [
					{
						instance: null,
						listener: () => {
							if (a.defaultPrevented) {
								if (Ga !== 0) {
									var _ = p ? Yp(s, p) : new FormData(s);
									lu(
										n,
										{ pending: !0, data: _, method: s.method, action: c },
										null,
										_,
									);
								}
							} else
								typeof c == "function" &&
									(b.preventDefault(),
									(_ = p ? Yp(s, p) : new FormData(s)),
									lu(
										n,
										{ pending: !0, data: _, method: s.method, action: c },
										c,
										_,
									));
						},
						currentTarget: s,
					},
				],
			});
		}
	}
	for (var Hu = 0; Hu < Sc.length; Hu++) {
		var Vu = Sc[Hu],
			Gb = Vu.toLowerCase(),
			qb = Vu[0].toUpperCase() + Vu.slice(1);
		Cn(Gb, "on" + qb);
	}
	Cn(ym, "onAnimationEnd"),
		Cn(xm, "onAnimationIteration"),
		Cn(bm, "onAnimationStart"),
		Cn("dblclick", "onDoubleClick"),
		Cn("focusin", "onFocus"),
		Cn("focusout", "onBlur"),
		Cn(ib, "onTransitionRun"),
		Cn(rb, "onTransitionStart"),
		Cn(ob, "onTransitionCancel"),
		Cn(Sm, "onTransitionEnd"),
		Fl("onMouseEnter", ["mouseout", "mouseover"]),
		Fl("onMouseLeave", ["mouseout", "mouseover"]),
		Fl("onPointerEnter", ["pointerout", "pointerover"]),
		Fl("onPointerLeave", ["pointerout", "pointerover"]),
		gl(
			"onChange",
			"change click focusin focusout input keydown keyup selectionchange".split(
				" ",
			),
		),
		gl(
			"onSelect",
			"focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
				" ",
			),
		),
		gl("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]),
		gl(
			"onCompositionEnd",
			"compositionend focusout keydown keypress keyup mousedown".split(" "),
		),
		gl(
			"onCompositionStart",
			"compositionstart focusout keydown keypress keyup mousedown".split(" "),
		),
		gl(
			"onCompositionUpdate",
			"compositionupdate focusout keydown keypress keyup mousedown".split(" "),
		);
	var Tr =
			"abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
				" ",
			),
		Xb = new Set(
			"beforetoggle cancel close invalid load scroll scrollend toggle"
				.split(" ")
				.concat(Tr),
		);
	function Gp(e, t) {
		t = (t & 4) !== 0;
		for (var n = 0; n < e.length; n++) {
			var a = e[n],
				s = a.event;
			a = a.listeners;
			e: {
				var c = void 0;
				if (t)
					for (var p = a.length - 1; 0 <= p; p--) {
						var b = a[p],
							_ = b.instance,
							U = b.currentTarget;
						if (((b = b.listener), _ !== c && s.isPropagationStopped()))
							break e;
						(c = b), (s.currentTarget = U);
						try {
							c(s);
						} catch (P) {
							po(P);
						}
						(s.currentTarget = null), (c = _);
					}
				else
					for (p = 0; p < a.length; p++) {
						if (
							((b = a[p]),
							(_ = b.instance),
							(U = b.currentTarget),
							(b = b.listener),
							_ !== c && s.isPropagationStopped())
						)
							break e;
						(c = b), (s.currentTarget = U);
						try {
							c(s);
						} catch (P) {
							po(P);
						}
						(s.currentTarget = null), (c = _);
					}
			}
		}
	}
	function Re(e, t) {
		var n = t[Ws];
		n === void 0 && (n = t[Ws] = new Set());
		var a = e + "__bubble";
		n.has(a) || (qp(t, e, 2, !1), n.add(a));
	}
	function Yu(e, t, n) {
		var a = 0;
		t && (a |= 4), qp(n, e, a, t);
	}
	var ts = "_reactListening" + Math.random().toString(36).slice(2);
	function Gu(e) {
		if (!e[ts]) {
			(e[ts] = !0),
				Ld.forEach((n) => {
					n !== "selectionchange" && (Xb.has(n) || Yu(n, !1, e), Yu(n, !0, e));
				});
			var t = e.nodeType === 9 ? e : e.ownerDocument;
			t === null || t[ts] || ((t[ts] = !0), Yu("selectionchange", !1, t));
		}
	}
	function qp(e, t, n, a) {
		switch (yg(t)) {
			case 2: {
				var s = y1;
				break;
			}
			case 8:
				s = x1;
				break;
			default:
				s = af;
		}
		(n = s.bind(null, t, n, e)),
			(s = void 0),
			!sc ||
				(t !== "touchstart" && t !== "touchmove" && t !== "wheel") ||
				(s = !0),
			a
				? s !== void 0
					? e.addEventListener(t, n, { capture: !0, passive: s })
					: e.addEventListener(t, n, !0)
				: s !== void 0
					? e.addEventListener(t, n, { passive: s })
					: e.addEventListener(t, n, !1);
	}
	function qu(e, t, n, a, s) {
		var c = a;
		if ((t & 1) === 0 && (t & 2) === 0 && a !== null)
			e: for (;;) {
				if (a === null) return;
				var p = a.tag;
				if (p === 3 || p === 4) {
					var b = a.stateNode.containerInfo;
					if (b === s) break;
					if (p === 4)
						for (p = a.return; p !== null; ) {
							var _ = p.tag;
							if ((_ === 3 || _ === 4) && p.stateNode.containerInfo === s)
								return;
							p = p.return;
						}
					for (; b !== null; ) {
						if (((p = Kl(b)), p === null)) return;
						if (((_ = p.tag), _ === 5 || _ === 6 || _ === 26 || _ === 27)) {
							a = c = p;
							continue e;
						}
						b = b.parentNode;
					}
				}
				a = a.return;
			}
		Kd(() => {
			var U = c,
				P = rc(n),
				K = [];
			e: {
				var V = wm.get(e);
				if (V !== void 0) {
					var Q = fo,
						he = e;
					switch (e) {
						case "keypress":
							if (co(n) === 0) break e;
						case "keydown":
						case "keyup":
							Q = Bx;
							break;
						case "focusin":
							(he = "focus"), (Q = dc);
							break;
						case "focusout":
							(he = "blur"), (Q = dc);
							break;
						case "beforeblur":
						case "afterblur":
							Q = dc;
							break;
						case "click":
							if (n.button === 2) break e;
						case "auxclick":
						case "dblclick":
						case "mousedown":
						case "mousemove":
						case "mouseup":
						case "mouseout":
						case "mouseover":
						case "contextmenu":
							Q = Fd;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							Q = Cx;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							Q = Vx;
							break;
						case ym:
						case xm:
						case bm:
							Q = _x;
							break;
						case Sm:
							Q = Gx;
							break;
						case "scroll":
						case "scrollend":
							Q = Ex;
							break;
						case "wheel":
							Q = Xx;
							break;
						case "copy":
						case "cut":
						case "paste":
							Q = Rx;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup":
							Q = Wd;
							break;
						case "toggle":
						case "beforetoggle":
							Q = Px;
					}
					var ye = (t & 4) !== 0,
						Ie = !ye && (e === "scroll" || e === "scrollend"),
						k = ye ? (V !== null ? V + "Capture" : null) : V;
					ye = [];
					for (var D = U, B; D !== null; ) {
						var I = D;
						if (
							((B = I.stateNode),
							(I = I.tag),
							(I !== 5 && I !== 26 && I !== 27) ||
								B === null ||
								k === null ||
								((I = Zi(D, k)), I != null && ye.push(_r(D, I, B))),
							Ie)
						)
							break;
						D = D.return;
					}
					0 < ye.length &&
						((V = new Q(V, he, null, n, P)),
						K.push({ event: V, listeners: ye }));
				}
			}
			if ((t & 7) === 0) {
				e: {
					if (
						((V = e === "mouseover" || e === "pointerover"),
						(Q = e === "mouseout" || e === "pointerout"),
						V &&
							n !== ic &&
							(he = n.relatedTarget || n.fromElement) &&
							(Kl(he) || he[Il]))
					)
						break e;
					if (
						(Q || V) &&
						((V =
							P.window === P
								? P
								: (V = P.ownerDocument)
									? V.defaultView || V.parentWindow
									: window),
						Q
							? ((he = n.relatedTarget || n.toElement),
								(Q = U),
								(he = he ? Kl(he) : null),
								he !== null &&
									((Ie = d(he)),
									(ye = he.tag),
									he !== Ie || (ye !== 5 && ye !== 27 && ye !== 6)) &&
									(he = null))
							: ((Q = null), (he = U)),
						Q !== he)
					) {
						if (
							((ye = Fd),
							(I = "onMouseLeave"),
							(k = "onMouseEnter"),
							(D = "mouse"),
							(e === "pointerout" || e === "pointerover") &&
								((ye = Wd),
								(I = "onPointerLeave"),
								(k = "onPointerEnter"),
								(D = "pointer")),
							(Ie = Q == null ? V : Ki(Q)),
							(B = he == null ? V : Ki(he)),
							(V = new ye(I, D + "leave", Q, n, P)),
							(V.target = Ie),
							(V.relatedTarget = B),
							(I = null),
							Kl(P) === U &&
								((ye = new ye(k, D + "enter", he, n, P)),
								(ye.target = B),
								(ye.relatedTarget = Ie),
								(I = ye)),
							(Ie = I),
							Q && he)
						)
							t: {
								for (ye = Qb, k = Q, D = he, B = 0, I = k; I; I = ye(I)) B++;
								I = 0;
								for (var ve = D; ve; ve = ye(ve)) I++;
								for (; 0 < B - I; ) (k = ye(k)), B--;
								for (; 0 < I - B; ) (D = ye(D)), I--;
								for (; B--; ) {
									if (k === D || (D !== null && k === D.alternate)) {
										ye = k;
										break t;
									}
									(k = ye(k)), (D = ye(D));
								}
								ye = null;
							}
						else ye = null;
						Q !== null && Xp(K, V, Q, ye, !1),
							he !== null && Ie !== null && Xp(K, Ie, he, ye, !0);
					}
				}
				e: {
					if (
						((V = U ? Ki(U) : window),
						(Q = V.nodeName && V.nodeName.toLowerCase()),
						Q === "select" || (Q === "input" && V.type === "file"))
					)
						var Le = om;
					else if (im(V))
						if (sm) Le = nb;
						else {
							Le = eb;
							var pe = Wx;
						}
					else
						(Q = V.nodeName),
							!Q ||
							Q.toLowerCase() !== "input" ||
							(V.type !== "checkbox" && V.type !== "radio")
								? U && lc(U.elementType) && (Le = om)
								: (Le = tb);
					if (Le && (Le = Le(e, U))) {
						rm(K, Le, n, P);
						break e;
					}
					pe && pe(e, V, U),
						e === "focusout" &&
							U &&
							V.type === "number" &&
							U.memoizedProps.value != null &&
							ac(V, "number", V.value);
				}
				switch (((pe = U ? Ki(U) : window), e)) {
					case "focusin":
						(im(pe) || pe.contentEditable === "true") &&
							((ai = pe), (yc = U), (ar = null));
						break;
					case "focusout":
						ar = yc = ai = null;
						break;
					case "mousedown":
						xc = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						(xc = !1), gm(K, n, P);
						break;
					case "selectionchange":
						if (lb) break;
					case "keydown":
					case "keyup":
						gm(K, n, P);
				}
				var Te;
				if (hc)
					e: {
						switch (e) {
							case "compositionstart": {
								var Oe = "onCompositionStart";
								break e;
							}
							case "compositionend":
								Oe = "onCompositionEnd";
								break e;
							case "compositionupdate":
								Oe = "onCompositionUpdate";
								break e;
						}
						Oe = void 0;
					}
				else
					ni
						? am(e, n) && (Oe = "onCompositionEnd")
						: e === "keydown" &&
							n.keyCode === 229 &&
							(Oe = "onCompositionStart");
				Oe &&
					(em &&
						n.locale !== "ko" &&
						(ni || Oe !== "onCompositionStart"
							? Oe === "onCompositionEnd" && ni && (Te = Zd())
							: ((ja = P),
								(cc = "value" in ja ? ja.value : ja.textContent),
								(ni = !0))),
					(pe = ns(U, Oe)),
					0 < pe.length &&
						((Oe = new Jd(Oe, e, null, n, P)),
						K.push({ event: Oe, listeners: pe }),
						Te
							? (Oe.data = Te)
							: ((Te = lm(n)), Te !== null && (Oe.data = Te)))),
					(Te = Kx ? Zx(e, n) : $x(e, n)) &&
						((Oe = ns(U, "onBeforeInput")),
						0 < Oe.length &&
							((pe = new Jd("onBeforeInput", "beforeinput", null, n, P)),
							K.push({ event: pe, listeners: Oe }),
							(pe.data = Te))),
					Yb(K, e, U, n, P);
			}
			Gp(K, t);
		});
	}
	function _r(e, t, n) {
		return { instance: e, listener: t, currentTarget: n };
	}
	function ns(e, t) {
		for (var n = t + "Capture", a = []; e !== null; ) {
			var s = e,
				c = s.stateNode;
			if (
				((s = s.tag),
				(s !== 5 && s !== 26 && s !== 27) ||
					c === null ||
					((s = Zi(e, n)),
					s != null && a.unshift(_r(e, s, c)),
					(s = Zi(e, t)),
					s != null && a.push(_r(e, s, c))),
				e.tag === 3)
			)
				return a;
			e = e.return;
		}
		return [];
	}
	function Qb(e) {
		if (e === null) return null;
		do e = e.return;
		while (e && e.tag !== 5 && e.tag !== 27);
		return e || null;
	}
	function Xp(e, t, n, a, s) {
		for (var c = t._reactName, p = []; n !== null && n !== a; ) {
			var b = n,
				_ = b.alternate,
				U = b.stateNode;
			if (((b = b.tag), _ !== null && _ === a)) break;
			(b !== 5 && b !== 26 && b !== 27) ||
				U === null ||
				((_ = U),
				s
					? ((U = Zi(n, c)), U != null && p.unshift(_r(n, U, _)))
					: s || ((U = Zi(n, c)), U != null && p.push(_r(n, U, _)))),
				(n = n.return);
		}
		p.length !== 0 && e.push({ event: t, listeners: p });
	}
	var Pb = /\r\n?/g,
		Ib = /\u0000|\uFFFD/g;
	function Qp(e) {
		return (typeof e == "string" ? e : "" + e)
			.replace(
				Pb,
				`
`,
			)
			.replace(Ib, "");
	}
	function Pp(e, t) {
		return (t = Qp(t)), Qp(e) === t;
	}
	function Pe(e, t, n, a, s, c) {
		switch (n) {
			case "children":
				typeof a == "string"
					? t === "body" || (t === "textarea" && a === "") || Wl(e, a)
					: (typeof a == "number" || typeof a == "bigint") &&
						t !== "body" &&
						Wl(e, "" + a);
				break;
			case "className":
				io(e, "class", a);
				break;
			case "tabIndex":
				io(e, "tabindex", a);
				break;
			case "dir":
			case "role":
			case "viewBox":
			case "width":
			case "height":
				io(e, n, a);
				break;
			case "style":
				Pd(e, a, c);
				break;
			case "data":
				if (t !== "object") {
					io(e, "data", a);
					break;
				}
			case "src":
			case "href":
				if (a === "" && (t !== "a" || n !== "href")) {
					e.removeAttribute(n);
					break;
				}
				if (
					a == null ||
					typeof a == "function" ||
					typeof a == "symbol" ||
					typeof a == "boolean"
				) {
					e.removeAttribute(n);
					break;
				}
				(a = oo("" + a)), e.setAttribute(n, a);
				break;
			case "action":
			case "formAction":
				if (typeof a == "function") {
					e.setAttribute(
						n,
						"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')",
					);
					break;
				} else
					typeof c == "function" &&
						(n === "formAction"
							? (t !== "input" && Pe(e, t, "name", s.name, s, null),
								Pe(e, t, "formEncType", s.formEncType, s, null),
								Pe(e, t, "formMethod", s.formMethod, s, null),
								Pe(e, t, "formTarget", s.formTarget, s, null))
							: (Pe(e, t, "encType", s.encType, s, null),
								Pe(e, t, "method", s.method, s, null),
								Pe(e, t, "target", s.target, s, null)));
				if (a == null || typeof a == "symbol" || typeof a == "boolean") {
					e.removeAttribute(n);
					break;
				}
				(a = oo("" + a)), e.setAttribute(n, a);
				break;
			case "onClick":
				a != null && (e.onclick = In);
				break;
			case "onScroll":
				a != null && Re("scroll", e);
				break;
			case "onScrollEnd":
				a != null && Re("scrollend", e);
				break;
			case "dangerouslySetInnerHTML":
				if (a != null) {
					if (typeof a != "object" || !("__html" in a)) throw Error(o(61));
					if (((n = a.__html), n != null)) {
						if (s.children != null) throw Error(o(60));
						e.innerHTML = n;
					}
				}
				break;
			case "multiple":
				e.multiple = a && typeof a != "function" && typeof a != "symbol";
				break;
			case "muted":
				e.muted = a && typeof a != "function" && typeof a != "symbol";
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "ref":
				break;
			case "autoFocus":
				break;
			case "xlinkHref":
				if (
					a == null ||
					typeof a == "function" ||
					typeof a == "boolean" ||
					typeof a == "symbol"
				) {
					e.removeAttribute("xlink:href");
					break;
				}
				(n = oo("" + a)),
					e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", n);
				break;
			case "contentEditable":
			case "spellCheck":
			case "draggable":
			case "value":
			case "autoReverse":
			case "externalResourcesRequired":
			case "focusable":
			case "preserveAlpha":
				a != null && typeof a != "function" && typeof a != "symbol"
					? e.setAttribute(n, "" + a)
					: e.removeAttribute(n);
				break;
			case "inert":
			case "allowFullScreen":
			case "async":
			case "autoPlay":
			case "controls":
			case "default":
			case "defer":
			case "disabled":
			case "disablePictureInPicture":
			case "disableRemotePlayback":
			case "formNoValidate":
			case "hidden":
			case "loop":
			case "noModule":
			case "noValidate":
			case "open":
			case "playsInline":
			case "readOnly":
			case "required":
			case "reversed":
			case "scoped":
			case "seamless":
			case "itemScope":
				a && typeof a != "function" && typeof a != "symbol"
					? e.setAttribute(n, "")
					: e.removeAttribute(n);
				break;
			case "capture":
			case "download":
				a === !0
					? e.setAttribute(n, "")
					: a !== !1 &&
							a != null &&
							typeof a != "function" &&
							typeof a != "symbol"
						? e.setAttribute(n, a)
						: e.removeAttribute(n);
				break;
			case "cols":
			case "rows":
			case "size":
			case "span":
				a != null &&
				typeof a != "function" &&
				typeof a != "symbol" &&
				!isNaN(a) &&
				1 <= a
					? e.setAttribute(n, a)
					: e.removeAttribute(n);
				break;
			case "rowSpan":
			case "start":
				a == null || typeof a == "function" || typeof a == "symbol" || isNaN(a)
					? e.removeAttribute(n)
					: e.setAttribute(n, a);
				break;
			case "popover":
				Re("beforetoggle", e), Re("toggle", e), lo(e, "popover", a);
				break;
			case "xlinkActuate":
				Pn(e, "http://www.w3.org/1999/xlink", "xlink:actuate", a);
				break;
			case "xlinkArcrole":
				Pn(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", a);
				break;
			case "xlinkRole":
				Pn(e, "http://www.w3.org/1999/xlink", "xlink:role", a);
				break;
			case "xlinkShow":
				Pn(e, "http://www.w3.org/1999/xlink", "xlink:show", a);
				break;
			case "xlinkTitle":
				Pn(e, "http://www.w3.org/1999/xlink", "xlink:title", a);
				break;
			case "xlinkType":
				Pn(e, "http://www.w3.org/1999/xlink", "xlink:type", a);
				break;
			case "xmlBase":
				Pn(e, "http://www.w3.org/XML/1998/namespace", "xml:base", a);
				break;
			case "xmlLang":
				Pn(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", a);
				break;
			case "xmlSpace":
				Pn(e, "http://www.w3.org/XML/1998/namespace", "xml:space", a);
				break;
			case "is":
				lo(e, "is", a);
				break;
			case "innerText":
			case "textContent":
				break;
			default:
				(!(2 < n.length) ||
					(n[0] !== "o" && n[0] !== "O") ||
					(n[1] !== "n" && n[1] !== "N")) &&
					((n = Sx.get(n) || n), lo(e, n, a));
		}
	}
	function Xu(e, t, n, a, s, c) {
		switch (n) {
			case "style":
				Pd(e, a, c);
				break;
			case "dangerouslySetInnerHTML":
				if (a != null) {
					if (typeof a != "object" || !("__html" in a)) throw Error(o(61));
					if (((n = a.__html), n != null)) {
						if (s.children != null) throw Error(o(60));
						e.innerHTML = n;
					}
				}
				break;
			case "children":
				typeof a == "string"
					? Wl(e, a)
					: (typeof a == "number" || typeof a == "bigint") && Wl(e, "" + a);
				break;
			case "onScroll":
				a != null && Re("scroll", e);
				break;
			case "onScrollEnd":
				a != null && Re("scrollend", e);
				break;
			case "onClick":
				a != null && (e.onclick = In);
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "innerHTML":
			case "ref":
				break;
			case "innerText":
			case "textContent":
				break;
			default:
				if (!Object.hasOwn(Bd, n))
					e: {
						if (
							n[0] === "o" &&
							n[1] === "n" &&
							((s = n.endsWith("Capture")),
							(t = n.slice(2, s ? n.length - 7 : void 0)),
							(c = e[Xt] || null),
							(c = c != null ? c[n] : null),
							typeof c == "function" && e.removeEventListener(t, c, s),
							typeof a == "function")
						) {
							typeof c != "function" &&
								c !== null &&
								(n in e
									? (e[n] = null)
									: e.hasAttribute(n) && e.removeAttribute(n)),
								e.addEventListener(t, a, s);
							break e;
						}
						n in e
							? (e[n] = a)
							: a === !0
								? e.setAttribute(n, "")
								: lo(e, n, a);
					}
		}
	}
	function Mt(e, t, n) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li":
				break;
			case "img": {
				Re("error", e), Re("load", e);
				var a = !1,
					s = !1,
					c;
				for (c in n)
					if (Object.hasOwn(n, c)) {
						var p = n[c];
						if (p != null)
							switch (c) {
								case "src":
									a = !0;
									break;
								case "srcSet":
									s = !0;
									break;
								case "children":
								case "dangerouslySetInnerHTML":
									throw Error(o(137, t));
								default:
									Pe(e, t, c, p, n, null);
							}
					}
				s && Pe(e, t, "srcSet", n.srcSet, n, null),
					a && Pe(e, t, "src", n.src, n, null);
				return;
			}
			case "input": {
				Re("invalid", e);
				var b = (c = p = s = null),
					_ = null,
					U = null;
				for (a in n)
					if (Object.hasOwn(n, a)) {
						var P = n[a];
						if (P != null)
							switch (a) {
								case "name":
									s = P;
									break;
								case "type":
									p = P;
									break;
								case "checked":
									_ = P;
									break;
								case "defaultChecked":
									U = P;
									break;
								case "value":
									c = P;
									break;
								case "defaultValue":
									b = P;
									break;
								case "children":
								case "dangerouslySetInnerHTML":
									if (P != null) throw Error(o(137, t));
									break;
								default:
									Pe(e, t, a, P, n, null);
							}
					}
				Gd(e, c, b, _, U, p, s, !1);
				return;
			}
			case "select":
				Re("invalid", e), (a = p = c = null);
				for (s in n)
					if (Object.hasOwn(n, s) && ((b = n[s]), b != null))
						switch (s) {
							case "value":
								c = b;
								break;
							case "defaultValue":
								p = b;
								break;
							case "multiple":
								a = b;
							default:
								Pe(e, t, s, b, n, null);
						}
				(t = c),
					(n = p),
					(e.multiple = !!a),
					t != null ? Jl(e, !!a, t, !1) : n != null && Jl(e, !!a, n, !0);
				return;
			case "textarea":
				Re("invalid", e), (c = s = a = null);
				for (p in n)
					if (Object.hasOwn(n, p) && ((b = n[p]), b != null))
						switch (p) {
							case "value":
								a = b;
								break;
							case "defaultValue":
								s = b;
								break;
							case "children":
								c = b;
								break;
							case "dangerouslySetInnerHTML":
								if (b != null) throw Error(o(91));
								break;
							default:
								Pe(e, t, p, b, n, null);
						}
				Xd(e, a, s, c);
				return;
			case "option":
				for (_ in n)
					if (Object.hasOwn(n, _) && ((a = n[_]), a != null))
						switch (_) {
							case "selected":
								e.selected =
									a && typeof a != "function" && typeof a != "symbol";
								break;
							default:
								Pe(e, t, _, a, n, null);
						}
				return;
			case "dialog":
				Re("beforetoggle", e), Re("toggle", e), Re("cancel", e), Re("close", e);
				break;
			case "iframe":
			case "object":
				Re("load", e);
				break;
			case "video":
			case "audio":
				for (a = 0; a < Tr.length; a++) Re(Tr[a], e);
				break;
			case "image":
				Re("error", e), Re("load", e);
				break;
			case "details":
				Re("toggle", e);
				break;
			case "embed":
			case "source":
			case "link":
				Re("error", e), Re("load", e);
			case "area":
			case "base":
			case "br":
			case "col":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "track":
			case "wbr":
			case "menuitem":
				for (U in n)
					if (Object.hasOwn(n, U) && ((a = n[U]), a != null))
						switch (U) {
							case "children":
							case "dangerouslySetInnerHTML":
								throw Error(o(137, t));
							default:
								Pe(e, t, U, a, n, null);
						}
				return;
			default:
				if (lc(t)) {
					for (P in n)
						Object.hasOwn(n, P) &&
							((a = n[P]), a !== void 0 && Xu(e, t, P, a, n, void 0));
					return;
				}
		}
		for (b in n)
			Object.hasOwn(n, b) && ((a = n[b]), a != null && Pe(e, t, b, a, n, null));
	}
	function Kb(e, t, n, a) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li":
				break;
			case "input": {
				var s = null,
					c = null,
					p = null,
					b = null,
					_ = null,
					U = null,
					P = null;
				for (Q in n) {
					var K = n[Q];
					if (Object.hasOwn(n, Q) && K != null)
						switch (Q) {
							case "checked":
								break;
							case "value":
								break;
							case "defaultValue":
								_ = K;
							default:
								Object.hasOwn(a, Q) || Pe(e, t, Q, null, a, K);
						}
				}
				for (var V in a) {
					var Q = a[V];
					if (((K = n[V]), Object.hasOwn(a, V) && (Q != null || K != null)))
						switch (V) {
							case "type":
								c = Q;
								break;
							case "name":
								s = Q;
								break;
							case "checked":
								U = Q;
								break;
							case "defaultChecked":
								P = Q;
								break;
							case "value":
								p = Q;
								break;
							case "defaultValue":
								b = Q;
								break;
							case "children":
							case "dangerouslySetInnerHTML":
								if (Q != null) throw Error(o(137, t));
								break;
							default:
								Q !== K && Pe(e, t, V, Q, a, K);
						}
				}
				nc(e, p, b, _, U, P, c, s);
				return;
			}
			case "select":
				Q = p = b = V = null;
				for (c in n)
					if (((_ = n[c]), Object.hasOwn(n, c) && _ != null))
						switch (c) {
							case "value":
								break;
							case "multiple":
								Q = _;
							default:
								Object.hasOwn(a, c) || Pe(e, t, c, null, a, _);
						}
				for (s in a)
					if (
						((c = a[s]),
						(_ = n[s]),
						Object.hasOwn(a, s) && (c != null || _ != null))
					)
						switch (s) {
							case "value":
								V = c;
								break;
							case "defaultValue":
								b = c;
								break;
							case "multiple":
								p = c;
							default:
								c !== _ && Pe(e, t, s, c, a, _);
						}
				(t = b),
					(n = p),
					(a = Q),
					V != null
						? Jl(e, !!n, V, !1)
						: !!a != !!n &&
							(t != null ? Jl(e, !!n, t, !0) : Jl(e, !!n, n ? [] : "", !1));
				return;
			case "textarea":
				Q = V = null;
				for (b in n)
					if (
						((s = n[b]),
						Object.hasOwn(n, b) && s != null && !Object.hasOwn(a, b))
					)
						switch (b) {
							case "value":
								break;
							case "children":
								break;
							default:
								Pe(e, t, b, null, a, s);
						}
				for (p in a)
					if (
						((s = a[p]),
						(c = n[p]),
						Object.hasOwn(a, p) && (s != null || c != null))
					)
						switch (p) {
							case "value":
								V = s;
								break;
							case "defaultValue":
								Q = s;
								break;
							case "children":
								break;
							case "dangerouslySetInnerHTML":
								if (s != null) throw Error(o(91));
								break;
							default:
								s !== c && Pe(e, t, p, s, a, c);
						}
				qd(e, V, Q);
				return;
			case "option":
				for (var he in n)
					if (
						((V = n[he]),
						Object.hasOwn(n, he) && V != null && !Object.hasOwn(a, he))
					)
						switch (he) {
							case "selected":
								e.selected = !1;
								break;
							default:
								Pe(e, t, he, null, a, V);
						}
				for (_ in a)
					if (
						((V = a[_]),
						(Q = n[_]),
						Object.hasOwn(a, _) && V !== Q && (V != null || Q != null))
					)
						switch (_) {
							case "selected":
								e.selected =
									V && typeof V != "function" && typeof V != "symbol";
								break;
							default:
								Pe(e, t, _, V, a, Q);
						}
				return;
			case "img":
			case "link":
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
			case "menuitem":
				for (var ye in n)
					(V = n[ye]),
						Object.hasOwn(n, ye) &&
							V != null &&
							!Object.hasOwn(a, ye) &&
							Pe(e, t, ye, null, a, V);
				for (U in a)
					if (
						((V = a[U]),
						(Q = n[U]),
						Object.hasOwn(a, U) && V !== Q && (V != null || Q != null))
					)
						switch (U) {
							case "children":
							case "dangerouslySetInnerHTML":
								if (V != null) throw Error(o(137, t));
								break;
							default:
								Pe(e, t, U, V, a, Q);
						}
				return;
			default:
				if (lc(t)) {
					for (var Ie in n)
						(V = n[Ie]),
							Object.hasOwn(n, Ie) &&
								V !== void 0 &&
								!Object.hasOwn(a, Ie) &&
								Xu(e, t, Ie, void 0, a, V);
					for (P in a)
						(V = a[P]),
							(Q = n[P]),
							!Object.hasOwn(a, P) ||
								V === Q ||
								(V === void 0 && Q === void 0) ||
								Xu(e, t, P, V, a, Q);
					return;
				}
		}
		for (var k in n)
			(V = n[k]),
				Object.hasOwn(n, k) &&
					V != null &&
					!Object.hasOwn(a, k) &&
					Pe(e, t, k, null, a, V);
		for (K in a)
			(V = a[K]),
				(Q = n[K]),
				!Object.hasOwn(a, K) ||
					V === Q ||
					(V == null && Q == null) ||
					Pe(e, t, K, V, a, Q);
	}
	function Ip(e) {
		switch (e) {
			case "css":
			case "script":
			case "font":
			case "img":
			case "image":
			case "input":
			case "link":
				return !0;
			default:
				return !1;
		}
	}
	function Zb() {
		if (typeof performance.getEntriesByType == "function") {
			for (
				var e = 0, t = 0, n = performance.getEntriesByType("resource"), a = 0;
				a < n.length;
				a++
			) {
				var s = n[a],
					c = s.transferSize,
					p = s.initiatorType,
					b = s.duration;
				if (c && b && Ip(p)) {
					for (p = 0, b = s.responseEnd, a += 1; a < n.length; a++) {
						var _ = n[a],
							U = _.startTime;
						if (U > b) break;
						var P = _.transferSize,
							K = _.initiatorType;
						P &&
							Ip(K) &&
							((_ = _.responseEnd), (p += P * (_ < b ? 1 : (b - U) / (_ - U))));
					}
					if ((--a, (t += (8 * (c + p)) / (s.duration / 1e3)), e++, 10 < e))
						break;
				}
			}
			if (0 < e) return t / e / 1e6;
		}
		return navigator.connection &&
			((e = navigator.connection.downlink), typeof e == "number")
			? e
			: 5;
	}
	var Qu = null,
		Pu = null;
	function as(e) {
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	function Kp(e) {
		switch (e) {
			case "http://www.w3.org/2000/svg":
				return 1;
			case "http://www.w3.org/1998/Math/MathML":
				return 2;
			default:
				return 0;
		}
	}
	function Zp(e, t) {
		if (e === 0)
			switch (t) {
				case "svg":
					return 1;
				case "math":
					return 2;
				default:
					return 0;
			}
		return e === 1 && t === "foreignObject" ? 0 : e;
	}
	function Iu(e, t) {
		return (
			e === "textarea" ||
			e === "noscript" ||
			typeof t.children == "string" ||
			typeof t.children == "number" ||
			typeof t.children == "bigint" ||
			(typeof t.dangerouslySetInnerHTML == "object" &&
				t.dangerouslySetInnerHTML !== null &&
				t.dangerouslySetInnerHTML.__html != null)
		);
	}
	var Ku = null;
	function $b() {
		var e = window.event;
		return e && e.type === "popstate"
			? e === Ku
				? !1
				: ((Ku = e), !0)
			: ((Ku = null), !1);
	}
	var $p = typeof setTimeout == "function" ? setTimeout : void 0,
		Fb = typeof clearTimeout == "function" ? clearTimeout : void 0,
		Fp = typeof Promise == "function" ? Promise : void 0,
		Jb =
			typeof queueMicrotask == "function"
				? queueMicrotask
				: typeof Fp < "u"
					? (e) => Fp.resolve(null).then(e).catch(Wb)
					: $p;
	function Wb(e) {
		setTimeout(() => {
			throw e;
		});
	}
	function qa(e) {
		return e === "head";
	}
	function Jp(e, t) {
		var n = t,
			a = 0;
		do {
			var s = n.nextSibling;
			if ((e.removeChild(n), s && s.nodeType === 8))
				if (((n = s.data), n === "/$" || n === "/&")) {
					if (a === 0) {
						e.removeChild(s), Ri(t);
						return;
					}
					a--;
				} else if (
					n === "$" ||
					n === "$?" ||
					n === "$~" ||
					n === "$!" ||
					n === "&"
				)
					a++;
				else if (n === "html") Ar(e.ownerDocument.documentElement);
				else if (n === "head") {
					(n = e.ownerDocument.head), Ar(n);
					for (var c = n.firstChild; c; ) {
						var p = c.nextSibling,
							b = c.nodeName;
						c[Ii] ||
							b === "SCRIPT" ||
							b === "STYLE" ||
							(b === "LINK" && c.rel.toLowerCase() === "stylesheet") ||
							n.removeChild(c),
							(c = p);
					}
				} else n === "body" && Ar(e.ownerDocument.body);
			n = s;
		} while (n);
		Ri(t);
	}
	function Wp(e, t) {
		var n = e;
		e = 0;
		do {
			var a = n.nextSibling;
			if (
				(n.nodeType === 1
					? t
						? ((n._stashedDisplay = n.style.display),
							(n.style.display = "none"))
						: ((n.style.display = n._stashedDisplay || ""),
							n.getAttribute("style") === "" && n.removeAttribute("style"))
					: n.nodeType === 3 &&
						(t
							? ((n._stashedText = n.nodeValue), (n.nodeValue = ""))
							: (n.nodeValue = n._stashedText || "")),
				a && a.nodeType === 8)
			)
				if (((n = a.data), n === "/$")) {
					if (e === 0) break;
					e--;
				} else (n !== "$" && n !== "$?" && n !== "$~" && n !== "$!") || e++;
			n = a;
		} while (n);
	}
	function Zu(e) {
		var t = e.firstChild;
		for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
			var n = t;
			switch (((t = t.nextSibling), n.nodeName)) {
				case "HTML":
				case "HEAD":
				case "BODY":
					Zu(n), ec(n);
					continue;
				case "SCRIPT":
				case "STYLE":
					continue;
				case "LINK":
					if (n.rel.toLowerCase() === "stylesheet") continue;
			}
			e.removeChild(n);
		}
	}
	function e1(e, t, n, a) {
		for (; e.nodeType === 1; ) {
			var s = n;
			if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
				if (!a && (e.nodeName !== "INPUT" || e.type !== "hidden")) break;
			} else if (a) {
				if (!e[Ii])
					switch (t) {
						case "meta":
							if (!e.hasAttribute("itemprop")) break;
							return e;
						case "link":
							if (
								((c = e.getAttribute("rel")),
								c === "stylesheet" && e.hasAttribute("data-precedence"))
							)
								break;
							if (
								c !== s.rel ||
								e.getAttribute("href") !==
									(s.href == null || s.href === "" ? null : s.href) ||
								e.getAttribute("crossorigin") !==
									(s.crossOrigin == null ? null : s.crossOrigin) ||
								e.getAttribute("title") !== (s.title == null ? null : s.title)
							)
								break;
							return e;
						case "style":
							if (e.hasAttribute("data-precedence")) break;
							return e;
						case "script":
							if (
								((c = e.getAttribute("src")),
								(c !== (s.src == null ? null : s.src) ||
									e.getAttribute("type") !== (s.type == null ? null : s.type) ||
									e.getAttribute("crossorigin") !==
										(s.crossOrigin == null ? null : s.crossOrigin)) &&
									c &&
									e.hasAttribute("async") &&
									!e.hasAttribute("itemprop"))
							)
								break;
							return e;
						default:
							return e;
					}
			} else if (t === "input" && e.type === "hidden") {
				var c = s.name == null ? null : "" + s.name;
				if (s.type === "hidden" && e.getAttribute("name") === c) return e;
			} else return e;
			if (((e = bn(e.nextSibling)), e === null)) break;
		}
		return null;
	}
	function t1(e, t, n) {
		if (t === "") return null;
		for (; e.nodeType !== 3; )
			if (
				((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") &&
					!n) ||
				((e = bn(e.nextSibling)), e === null)
			)
				return null;
		return e;
	}
	function eg(e, t) {
		for (; e.nodeType !== 8; )
			if (
				((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") &&
					!t) ||
				((e = bn(e.nextSibling)), e === null)
			)
				return null;
		return e;
	}
	function $u(e) {
		return e.data === "$?" || e.data === "$~";
	}
	function Fu(e) {
		return (
			e.data === "$!" ||
			(e.data === "$?" && e.ownerDocument.readyState !== "loading")
		);
	}
	function n1(e, t) {
		var n = e.ownerDocument;
		if (e.data === "$~") e._reactRetry = t;
		else if (e.data !== "$?" || n.readyState !== "loading") t();
		else {
			var a = () => {
				t(), n.removeEventListener("DOMContentLoaded", a);
			};
			n.addEventListener("DOMContentLoaded", a), (e._reactRetry = a);
		}
	}
	function bn(e) {
		for (; e != null; e = e.nextSibling) {
			var t = e.nodeType;
			if (t === 1 || t === 3) break;
			if (t === 8) {
				if (
					((t = e.data),
					t === "$" ||
						t === "$!" ||
						t === "$?" ||
						t === "$~" ||
						t === "&" ||
						t === "F!" ||
						t === "F")
				)
					break;
				if (t === "/$" || t === "/&") return null;
			}
		}
		return e;
	}
	var Ju = null;
	function tg(e) {
		e = e.nextSibling;
		for (var t = 0; e; ) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "/$" || n === "/&") {
					if (t === 0) return bn(e.nextSibling);
					t--;
				} else
					(n !== "$" && n !== "$!" && n !== "$?" && n !== "$~" && n !== "&") ||
						t++;
			}
			e = e.nextSibling;
		}
		return null;
	}
	function ng(e) {
		e = e.previousSibling;
		for (var t = 0; e; ) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&") {
					if (t === 0) return e;
					t--;
				} else (n !== "/$" && n !== "/&") || t++;
			}
			e = e.previousSibling;
		}
		return null;
	}
	function ag(e, t, n) {
		switch (((t = as(n)), e)) {
			case "html":
				if (((e = t.documentElement), !e)) throw Error(o(452));
				return e;
			case "head":
				if (((e = t.head), !e)) throw Error(o(453));
				return e;
			case "body":
				if (((e = t.body), !e)) throw Error(o(454));
				return e;
			default:
				throw Error(o(451));
		}
	}
	function Ar(e) {
		for (var t = e.attributes; t.length; ) e.removeAttributeNode(t[0]);
		ec(e);
	}
	var Sn = new Map(),
		lg = new Set();
	function ls(e) {
		return typeof e.getRootNode == "function"
			? e.getRootNode()
			: e.nodeType === 9
				? e
				: e.ownerDocument;
	}
	var ca = H.d;
	H.d = { f: a1, r: l1, D: i1, C: r1, L: o1, m: s1, X: u1, S: c1, M: f1 };
	function a1() {
		var e = ca.f(),
			t = Zo();
		return e || t;
	}
	function l1(e) {
		var t = Zl(e);
		t !== null && t.tag === 5 && t.type === "form" ? Sh(t) : ca.r(e);
	}
	var Ti = typeof document > "u" ? null : document;
	function ig(e, t, n) {
		var a = Ti;
		if (a && typeof t == "string" && t) {
			var s = mn(t);
			(s = 'link[rel="' + e + '"][href="' + s + '"]'),
				typeof n == "string" && (s += '[crossorigin="' + n + '"]'),
				lg.has(s) ||
					(lg.add(s),
					(e = { rel: e, crossOrigin: n, href: t }),
					a.querySelector(s) === null &&
						((t = a.createElement("link")),
						Mt(t, "link", e),
						wt(t),
						a.head.appendChild(t)));
		}
	}
	function i1(e) {
		ca.D(e), ig("dns-prefetch", e, null);
	}
	function r1(e, t) {
		ca.C(e, t), ig("preconnect", e, t);
	}
	function o1(e, t, n) {
		ca.L(e, t, n);
		var a = Ti;
		if (a && e && t) {
			var s = 'link[rel="preload"][as="' + mn(t) + '"]';
			t === "image" && n && n.imageSrcSet
				? ((s += '[imagesrcset="' + mn(n.imageSrcSet) + '"]'),
					typeof n.imageSizes == "string" &&
						(s += '[imagesizes="' + mn(n.imageSizes) + '"]'))
				: (s += '[href="' + mn(e) + '"]');
			var c = s;
			switch (t) {
				case "style":
					c = _i(e);
					break;
				case "script":
					c = Ai(e);
			}
			Sn.has(c) ||
				((e = h(
					{
						rel: "preload",
						href: t === "image" && n && n.imageSrcSet ? void 0 : e,
						as: t,
					},
					n,
				)),
				Sn.set(c, e),
				a.querySelector(s) !== null ||
					(t === "style" && a.querySelector(Rr(c))) ||
					(t === "script" && a.querySelector(Mr(c))) ||
					((t = a.createElement("link")),
					Mt(t, "link", e),
					wt(t),
					a.head.appendChild(t)));
		}
	}
	function s1(e, t) {
		ca.m(e, t);
		var n = Ti;
		if (n && e) {
			var a = t && typeof t.as == "string" ? t.as : "script",
				s =
					'link[rel="modulepreload"][as="' + mn(a) + '"][href="' + mn(e) + '"]',
				c = s;
			switch (a) {
				case "audioworklet":
				case "paintworklet":
				case "serviceworker":
				case "sharedworker":
				case "worker":
				case "script":
					c = Ai(e);
			}
			if (
				!Sn.has(c) &&
				((e = h({ rel: "modulepreload", href: e }, t)),
				Sn.set(c, e),
				n.querySelector(s) === null)
			) {
				switch (a) {
					case "audioworklet":
					case "paintworklet":
					case "serviceworker":
					case "sharedworker":
					case "worker":
					case "script":
						if (n.querySelector(Mr(c))) return;
				}
				(a = n.createElement("link")),
					Mt(a, "link", e),
					wt(a),
					n.head.appendChild(a);
			}
		}
	}
	function c1(e, t, n) {
		ca.S(e, t, n);
		var a = Ti;
		if (a && e) {
			var s = $l(a).hoistableStyles,
				c = _i(e);
			t = t || "default";
			var p = s.get(c);
			if (!p) {
				var b = { loading: 0, preload: null };
				if ((p = a.querySelector(Rr(c)))) b.loading = 5;
				else {
					(e = h({ rel: "stylesheet", href: e, "data-precedence": t }, n)),
						(n = Sn.get(c)) && Wu(e, n);
					var _ = (p = a.createElement("link"));
					wt(_),
						Mt(_, "link", e),
						(_._p = new Promise((U, P) => {
							(_.onload = U), (_.onerror = P);
						})),
						_.addEventListener("load", () => {
							b.loading |= 1;
						}),
						_.addEventListener("error", () => {
							b.loading |= 2;
						}),
						(b.loading |= 4),
						is(p, t, a);
				}
				(p = { type: "stylesheet", instance: p, count: 1, state: b }),
					s.set(c, p);
			}
		}
	}
	function u1(e, t) {
		ca.X(e, t);
		var n = Ti;
		if (n && e) {
			var a = $l(n).hoistableScripts,
				s = Ai(e),
				c = a.get(s);
			c ||
				((c = n.querySelector(Mr(s))),
				c ||
					((e = h({ src: e, async: !0 }, t)),
					(t = Sn.get(s)) && ef(e, t),
					(c = n.createElement("script")),
					wt(c),
					Mt(c, "link", e),
					n.head.appendChild(c)),
				(c = { type: "script", instance: c, count: 1, state: null }),
				a.set(s, c));
		}
	}
	function f1(e, t) {
		ca.M(e, t);
		var n = Ti;
		if (n && e) {
			var a = $l(n).hoistableScripts,
				s = Ai(e),
				c = a.get(s);
			c ||
				((c = n.querySelector(Mr(s))),
				c ||
					((e = h({ src: e, async: !0, type: "module" }, t)),
					(t = Sn.get(s)) && ef(e, t),
					(c = n.createElement("script")),
					wt(c),
					Mt(c, "link", e),
					n.head.appendChild(c)),
				(c = { type: "script", instance: c, count: 1, state: null }),
				a.set(s, c));
		}
	}
	function rg(e, t, n, a) {
		var s = (s = oe.current) ? ls(s) : null;
		if (!s) throw Error(o(446));
		switch (e) {
			case "meta":
			case "title":
				return null;
			case "style":
				return typeof n.precedence == "string" && typeof n.href == "string"
					? ((t = _i(n.href)),
						(n = $l(s).hoistableStyles),
						(a = n.get(t)),
						a ||
							((a = { type: "style", instance: null, count: 0, state: null }),
							n.set(t, a)),
						a)
					: { type: "void", instance: null, count: 0, state: null };
			case "link":
				if (
					n.rel === "stylesheet" &&
					typeof n.href == "string" &&
					typeof n.precedence == "string"
				) {
					e = _i(n.href);
					var c = $l(s).hoistableStyles,
						p = c.get(e);
					if (
						(p ||
							((s = s.ownerDocument || s),
							(p = {
								type: "stylesheet",
								instance: null,
								count: 0,
								state: { loading: 0, preload: null },
							}),
							c.set(e, p),
							(c = s.querySelector(Rr(e))) &&
								!c._p &&
								((p.instance = c), (p.state.loading = 5)),
							Sn.has(e) ||
								((n = {
									rel: "preload",
									as: "style",
									href: n.href,
									crossOrigin: n.crossOrigin,
									integrity: n.integrity,
									media: n.media,
									hrefLang: n.hrefLang,
									referrerPolicy: n.referrerPolicy,
								}),
								Sn.set(e, n),
								c || d1(s, e, n, p.state))),
						t && a === null)
					)
						throw Error(o(528, ""));
					return p;
				}
				if (t && a !== null) throw Error(o(529, ""));
				return null;
			case "script":
				return (
					(t = n.async),
					(n = n.src),
					typeof n == "string" &&
					t &&
					typeof t != "function" &&
					typeof t != "symbol"
						? ((t = Ai(n)),
							(n = $l(s).hoistableScripts),
							(a = n.get(t)),
							a ||
								((a = {
									type: "script",
									instance: null,
									count: 0,
									state: null,
								}),
								n.set(t, a)),
							a)
						: { type: "void", instance: null, count: 0, state: null }
				);
			default:
				throw Error(o(444, e));
		}
	}
	function _i(e) {
		return 'href="' + mn(e) + '"';
	}
	function Rr(e) {
		return 'link[rel="stylesheet"][' + e + "]";
	}
	function og(e) {
		return h({}, e, { "data-precedence": e.precedence, precedence: null });
	}
	function d1(e, t, n, a) {
		e.querySelector('link[rel="preload"][as="style"][' + t + "]")
			? (a.loading = 1)
			: ((t = e.createElement("link")),
				(a.preload = t),
				t.addEventListener("load", () => (a.loading |= 1)),
				t.addEventListener("error", () => (a.loading |= 2)),
				Mt(t, "link", n),
				wt(t),
				e.head.appendChild(t));
	}
	function Ai(e) {
		return '[src="' + mn(e) + '"]';
	}
	function Mr(e) {
		return "script[async]" + e;
	}
	function sg(e, t, n) {
		if ((t.count++, t.instance === null))
			switch (t.type) {
				case "style": {
					var a = e.querySelector('style[data-href~="' + mn(n.href) + '"]');
					if (a) return (t.instance = a), wt(a), a;
					var s = h({}, n, {
						"data-href": n.href,
						"data-precedence": n.precedence,
						href: null,
						precedence: null,
					});
					return (
						(a = (e.ownerDocument || e).createElement("style")),
						wt(a),
						Mt(a, "style", s),
						is(a, n.precedence, e),
						(t.instance = a)
					);
				}
				case "stylesheet": {
					s = _i(n.href);
					var c = e.querySelector(Rr(s));
					if (c) return (t.state.loading |= 4), (t.instance = c), wt(c), c;
					(a = og(n)),
						(s = Sn.get(s)) && Wu(a, s),
						(c = (e.ownerDocument || e).createElement("link")),
						wt(c);
					var p = c;
					return (
						(p._p = new Promise((b, _) => {
							(p.onload = b), (p.onerror = _);
						})),
						Mt(c, "link", a),
						(t.state.loading |= 4),
						is(c, n.precedence, e),
						(t.instance = c)
					);
				}
				case "script":
					return (
						(c = Ai(n.src)),
						(s = e.querySelector(Mr(c)))
							? ((t.instance = s), wt(s), s)
							: ((a = n),
								(s = Sn.get(c)) && ((a = h({}, n)), ef(a, s)),
								(e = e.ownerDocument || e),
								(s = e.createElement("script")),
								wt(s),
								Mt(s, "link", a),
								e.head.appendChild(s),
								(t.instance = s))
					);
				case "void":
					return null;
				default:
					throw Error(o(443, t.type));
			}
		else
			t.type === "stylesheet" &&
				(t.state.loading & 4) === 0 &&
				((a = t.instance), (t.state.loading |= 4), is(a, n.precedence, e));
		return t.instance;
	}
	function is(e, t, n) {
		for (
			var a = n.querySelectorAll(
					'link[rel="stylesheet"][data-precedence],style[data-precedence]',
				),
				s = a.length ? a[a.length - 1] : null,
				c = s,
				p = 0;
			p < a.length;
			p++
		) {
			var b = a[p];
			if (b.dataset.precedence === t) c = b;
			else if (c !== s) break;
		}
		c
			? c.parentNode.insertBefore(e, c.nextSibling)
			: ((t = n.nodeType === 9 ? n.head : n), t.insertBefore(e, t.firstChild));
	}
	function Wu(e, t) {
		e.crossOrigin == null && (e.crossOrigin = t.crossOrigin),
			e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy),
			e.title == null && (e.title = t.title);
	}
	function ef(e, t) {
		e.crossOrigin == null && (e.crossOrigin = t.crossOrigin),
			e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy),
			e.integrity == null && (e.integrity = t.integrity);
	}
	var rs = null;
	function cg(e, t, n) {
		if (rs === null) {
			var a = new Map(),
				s = (rs = new Map());
			s.set(n, a);
		} else (s = rs), (a = s.get(n)), a || ((a = new Map()), s.set(n, a));
		if (a.has(e)) return a;
		for (
			a.set(e, null), n = n.getElementsByTagName(e), s = 0;
			s < n.length;
			s++
		) {
			var c = n[s];
			if (
				!(
					c[Ii] ||
					c[Tt] ||
					(e === "link" && c.getAttribute("rel") === "stylesheet")
				) &&
				c.namespaceURI !== "http://www.w3.org/2000/svg"
			) {
				var p = c.getAttribute(t) || "";
				p = e + p;
				var b = a.get(p);
				b ? b.push(c) : a.set(p, [c]);
			}
		}
		return a;
	}
	function ug(e, t, n) {
		(e = e.ownerDocument || e),
			e.head.insertBefore(
				n,
				t === "title" ? e.querySelector("head > title") : null,
			);
	}
	function m1(e, t, n) {
		if (n === 1 || t.itemProp != null) return !1;
		switch (e) {
			case "meta":
			case "title":
				return !0;
			case "style":
				if (
					typeof t.precedence != "string" ||
					typeof t.href != "string" ||
					t.href === ""
				)
					break;
				return !0;
			case "link":
				if (
					typeof t.rel != "string" ||
					typeof t.href != "string" ||
					t.href === "" ||
					t.onLoad ||
					t.onError
				)
					break;
				switch (t.rel) {
					case "stylesheet":
						return (
							(e = t.disabled), typeof t.precedence == "string" && e == null
						);
					default:
						return !0;
				}
			case "script":
				if (
					t.async &&
					typeof t.async != "function" &&
					typeof t.async != "symbol" &&
					!t.onLoad &&
					!t.onError &&
					t.src &&
					typeof t.src == "string"
				)
					return !0;
		}
		return !1;
	}
	function fg(e) {
		return !(e.type === "stylesheet" && (e.state.loading & 3) === 0);
	}
	function h1(e, t, n, a) {
		if (
			n.type === "stylesheet" &&
			(typeof a.media != "string" || matchMedia(a.media).matches !== !1) &&
			(n.state.loading & 4) === 0
		) {
			if (n.instance === null) {
				var s = _i(a.href),
					c = t.querySelector(Rr(s));
				if (c) {
					(t = c._p),
						t !== null &&
							typeof t == "object" &&
							typeof t.then == "function" &&
							(e.count++, (e = os.bind(e)), t.then(e, e)),
						(n.state.loading |= 4),
						(n.instance = c),
						wt(c);
					return;
				}
				(c = t.ownerDocument || t),
					(a = og(a)),
					(s = Sn.get(s)) && Wu(a, s),
					(c = c.createElement("link")),
					wt(c);
				var p = c;
				(p._p = new Promise((b, _) => {
					(p.onload = b), (p.onerror = _);
				})),
					Mt(c, "link", a),
					(n.instance = c);
			}
			e.stylesheets === null && (e.stylesheets = new Map()),
				e.stylesheets.set(n, t),
				(t = n.state.preload) &&
					(n.state.loading & 3) === 0 &&
					(e.count++,
					(n = os.bind(e)),
					t.addEventListener("load", n),
					t.addEventListener("error", n));
		}
	}
	var tf = 0;
	function p1(e, t) {
		return (
			e.stylesheets && e.count === 0 && cs(e, e.stylesheets),
			0 < e.count || 0 < e.imgCount
				? (n) => {
						var a = setTimeout(() => {
							if ((e.stylesheets && cs(e, e.stylesheets), e.unsuspend)) {
								var c = e.unsuspend;
								(e.unsuspend = null), c();
							}
						}, 6e4 + t);
						0 < e.imgBytes && tf === 0 && (tf = 62500 * Zb());
						var s = setTimeout(
							() => {
								if (
									((e.waitingForImages = !1),
									e.count === 0 &&
										(e.stylesheets && cs(e, e.stylesheets), e.unsuspend))
								) {
									var c = e.unsuspend;
									(e.unsuspend = null), c();
								}
							},
							(e.imgBytes > tf ? 50 : 800) + t,
						);
						return (
							(e.unsuspend = n),
							() => {
								(e.unsuspend = null), clearTimeout(a), clearTimeout(s);
							}
						);
					}
				: null
		);
	}
	function os() {
		if (
			(this.count--,
			this.count === 0 && (this.imgCount === 0 || !this.waitingForImages))
		) {
			if (this.stylesheets) cs(this, this.stylesheets);
			else if (this.unsuspend) {
				var e = this.unsuspend;
				(this.unsuspend = null), e();
			}
		}
	}
	var ss = null;
	function cs(e, t) {
		(e.stylesheets = null),
			e.unsuspend !== null &&
				(e.count++,
				(ss = new Map()),
				t.forEach(g1, e),
				(ss = null),
				os.call(e));
	}
	function g1(e, t) {
		if (!(t.state.loading & 4)) {
			var n = ss.get(e);
			if (n) var a = n.get(null);
			else {
				(n = new Map()), ss.set(e, n);
				for (
					var s = e.querySelectorAll(
							"link[data-precedence],style[data-precedence]",
						),
						c = 0;
					c < s.length;
					c++
				) {
					var p = s[c];
					(p.nodeName === "LINK" || p.getAttribute("media") !== "not all") &&
						(n.set(p.dataset.precedence, p), (a = p));
				}
				a && n.set(null, a);
			}
			(s = t.instance),
				(p = s.getAttribute("data-precedence")),
				(c = n.get(p) || a),
				c === a && n.set(null, s),
				n.set(p, s),
				this.count++,
				(a = os.bind(this)),
				s.addEventListener("load", a),
				s.addEventListener("error", a),
				c
					? c.parentNode.insertBefore(s, c.nextSibling)
					: ((e = e.nodeType === 9 ? e.head : e),
						e.insertBefore(s, e.firstChild)),
				(t.state.loading |= 4);
		}
	}
	var Or = {
		$$typeof: R,
		Provider: null,
		Consumer: null,
		_currentValue: Z,
		_currentValue2: Z,
		_threadCount: 0,
	};
	function v1(e, t, n, a, s, c, p, b, _) {
		(this.tag = 1),
			(this.containerInfo = e),
			(this.pingCache = this.current = this.pendingChildren = null),
			(this.timeoutHandle = -1),
			(this.callbackNode =
				this.next =
				this.pendingContext =
				this.context =
				this.cancelPendingCommit =
					null),
			(this.callbackPriority = 0),
			(this.expirationTimes = ut(-1)),
			(this.entangledLanes =
				this.shellSuspendCounter =
				this.errorRecoveryDisabledLanes =
				this.expiredLanes =
				this.warmLanes =
				this.pingedLanes =
				this.suspendedLanes =
				this.pendingLanes =
					0),
			(this.entanglements = ut(0)),
			(this.hiddenUpdates = ut(null)),
			(this.identifierPrefix = a),
			(this.onUncaughtError = s),
			(this.onCaughtError = c),
			(this.onRecoverableError = p),
			(this.pooledCache = null),
			(this.pooledCacheLanes = 0),
			(this.formState = _),
			(this.incompleteTransitions = new Map());
	}
	function dg(e, t, n, a, s, c, p, b, _, U, P, K) {
		return (
			(e = new v1(e, t, n, p, _, U, P, K, b)),
			(t = 1),
			c === !0 && (t |= 24),
			(c = nn(3, null, null, t)),
			(e.current = c),
			(c.stateNode = e),
			(t = zc()),
			t.refCount++,
			(e.pooledCache = t),
			t.refCount++,
			(c.memoizedState = { element: a, isDehydrated: n, cache: t }),
			Uc(c),
			e
		);
	}
	function mg(e) {
		return e ? ((e = ri), e) : ri;
	}
	function hg(e, t, n, a, s, c) {
		(s = mg(s)),
			a.context === null ? (a.context = s) : (a.pendingContext = s),
			(a = Oa(t)),
			(a.payload = { element: n }),
			(c = c === void 0 ? null : c),
			c !== null && (a.callback = c),
			(n = Da(e, a, t)),
			n !== null && ($t(n, e, t), ur(n, e, t));
	}
	function pg(e, t) {
		if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
			var n = e.retryLane;
			e.retryLane = n !== 0 && n < t ? n : t;
		}
	}
	function nf(e, t) {
		pg(e, t), (e = e.alternate) && pg(e, t);
	}
	function gg(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = bl(e, 67108864);
			t !== null && $t(t, e, 67108864), nf(e, 67108864);
		}
	}
	function vg(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = sn();
			t = pl(t);
			var n = bl(e, t);
			n !== null && $t(n, e, t), nf(e, t);
		}
	}
	var us = !0;
	function y1(e, t, n, a) {
		var s = M.T;
		M.T = null;
		var c = H.p;
		try {
			(H.p = 2), af(e, t, n, a);
		} finally {
			(H.p = c), (M.T = s);
		}
	}
	function x1(e, t, n, a) {
		var s = M.T;
		M.T = null;
		var c = H.p;
		try {
			(H.p = 8), af(e, t, n, a);
		} finally {
			(H.p = c), (M.T = s);
		}
	}
	function af(e, t, n, a) {
		if (us) {
			var s = lf(a);
			if (s === null) qu(e, t, a, fs, n), xg(e, a);
			else if (S1(s, e, t, n, a)) a.stopPropagation();
			else if ((xg(e, a), t & 4 && -1 < b1.indexOf(e))) {
				for (; s !== null; ) {
					var c = Zl(s);
					if (c !== null)
						switch (c.tag) {
							case 3:
								if (((c = c.stateNode), c.current.memoizedState.isDehydrated)) {
									var p = Qn(c.pendingLanes);
									if (p !== 0) {
										var b = c;
										for (b.pendingLanes |= 2, b.entangledLanes |= 2; p; ) {
											var _ = 1 << (31 - Dt(p));
											(b.entanglements[1] |= _), (p &= ~_);
										}
										kn(c), (Ye & 6) === 0 && ((Io = ct() + 500), jr(0));
									}
								}
								break;
							case 31:
							case 13:
								(b = bl(c, 2)), b !== null && $t(b, c, 2), Zo(), nf(c, 2);
						}
					if (((c = lf(a)), c === null && qu(e, t, a, fs, n), c === s)) break;
					s = c;
				}
				s !== null && a.stopPropagation();
			} else qu(e, t, a, null, n);
		}
	}
	function lf(e) {
		return (e = rc(e)), rf(e);
	}
	var fs = null;
	function rf(e) {
		if (((fs = null), (e = Kl(e)), e !== null)) {
			var t = d(e);
			if (t === null) e = null;
			else {
				var n = t.tag;
				if (n === 13) {
					if (((e = m(t)), e !== null)) return e;
					e = null;
				} else if (n === 31) {
					if (((e = v(t)), e !== null)) return e;
					e = null;
				} else if (n === 3) {
					if (t.stateNode.current.memoizedState.isDehydrated)
						return t.tag === 3 ? t.stateNode.containerInfo : null;
					e = null;
				} else t !== e && (e = null);
			}
		}
		return (fs = e), null;
	}
	function yg(e) {
		switch (e) {
			case "beforetoggle":
			case "cancel":
			case "click":
			case "close":
			case "contextmenu":
			case "copy":
			case "cut":
			case "auxclick":
			case "dblclick":
			case "dragend":
			case "dragstart":
			case "drop":
			case "focusin":
			case "focusout":
			case "input":
			case "invalid":
			case "keydown":
			case "keypress":
			case "keyup":
			case "mousedown":
			case "mouseup":
			case "paste":
			case "pause":
			case "play":
			case "pointercancel":
			case "pointerdown":
			case "pointerup":
			case "ratechange":
			case "reset":
			case "resize":
			case "seeked":
			case "submit":
			case "toggle":
			case "touchcancel":
			case "touchend":
			case "touchstart":
			case "volumechange":
			case "change":
			case "selectionchange":
			case "textInput":
			case "compositionstart":
			case "compositionend":
			case "compositionupdate":
			case "beforeblur":
			case "afterblur":
			case "beforeinput":
			case "blur":
			case "fullscreenchange":
			case "focus":
			case "hashchange":
			case "popstate":
			case "select":
			case "selectstart":
				return 2;
			case "drag":
			case "dragenter":
			case "dragexit":
			case "dragleave":
			case "dragover":
			case "mousemove":
			case "mouseout":
			case "mouseover":
			case "pointermove":
			case "pointerout":
			case "pointerover":
			case "scroll":
			case "touchmove":
			case "wheel":
			case "mouseenter":
			case "mouseleave":
			case "pointerenter":
			case "pointerleave":
				return 8;
			case "message":
				switch (Fs()) {
					case eo:
						return 2;
					case fl:
						return 8;
					case Xl:
					case to:
						return 32;
					case Ql:
						return 268435456;
					default:
						return 32;
				}
			default:
				return 32;
		}
	}
	var of = !1,
		Xa = null,
		Qa = null,
		Pa = null,
		Dr = new Map(),
		zr = new Map(),
		Ia = [],
		b1 =
			"mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
				" ",
			);
	function xg(e, t) {
		switch (e) {
			case "focusin":
			case "focusout":
				Xa = null;
				break;
			case "dragenter":
			case "dragleave":
				Qa = null;
				break;
			case "mouseover":
			case "mouseout":
				Pa = null;
				break;
			case "pointerover":
			case "pointerout":
				Dr.delete(t.pointerId);
				break;
			case "gotpointercapture":
			case "lostpointercapture":
				zr.delete(t.pointerId);
		}
	}
	function kr(e, t, n, a, s, c) {
		return e === null || e.nativeEvent !== c
			? ((e = {
					blockedOn: t,
					domEventName: n,
					eventSystemFlags: a,
					nativeEvent: c,
					targetContainers: [s],
				}),
				t !== null && ((t = Zl(t)), t !== null && gg(t)),
				e)
			: ((e.eventSystemFlags |= a),
				(t = e.targetContainers),
				s !== null && t.indexOf(s) === -1 && t.push(s),
				e);
	}
	function S1(e, t, n, a, s) {
		switch (t) {
			case "focusin":
				return (Xa = kr(Xa, e, t, n, a, s)), !0;
			case "dragenter":
				return (Qa = kr(Qa, e, t, n, a, s)), !0;
			case "mouseover":
				return (Pa = kr(Pa, e, t, n, a, s)), !0;
			case "pointerover": {
				var c = s.pointerId;
				return Dr.set(c, kr(Dr.get(c) || null, e, t, n, a, s)), !0;
			}
			case "gotpointercapture":
				return (
					(c = s.pointerId), zr.set(c, kr(zr.get(c) || null, e, t, n, a, s)), !0
				);
		}
		return !1;
	}
	function bg(e) {
		var t = Kl(e.target);
		if (t !== null) {
			var n = d(t);
			if (n !== null) {
				if (((t = n.tag), t === 13)) {
					if (((t = m(n)), t !== null)) {
						(e.blockedOn = t),
							zd(e.priority, () => {
								vg(n);
							});
						return;
					}
				} else if (t === 31) {
					if (((t = v(n)), t !== null)) {
						(e.blockedOn = t),
							zd(e.priority, () => {
								vg(n);
							});
						return;
					}
				} else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
					e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
					return;
				}
			}
		}
		e.blockedOn = null;
	}
	function ds(e) {
		if (e.blockedOn !== null) return !1;
		for (var t = e.targetContainers; 0 < t.length; ) {
			var n = lf(e.nativeEvent);
			if (n === null) {
				n = e.nativeEvent;
				var a = new n.constructor(n.type, n);
				(ic = a), n.target.dispatchEvent(a), (ic = null);
			} else return (t = Zl(n)), t !== null && gg(t), (e.blockedOn = n), !1;
			t.shift();
		}
		return !0;
	}
	function Sg(e, t, n) {
		ds(e) && n.delete(t);
	}
	function w1() {
		(of = !1),
			Xa !== null && ds(Xa) && (Xa = null),
			Qa !== null && ds(Qa) && (Qa = null),
			Pa !== null && ds(Pa) && (Pa = null),
			Dr.forEach(Sg),
			zr.forEach(Sg);
	}
	function ms(e, t) {
		e.blockedOn === t &&
			((e.blockedOn = null),
			of ||
				((of = !0),
				l.unstable_scheduleCallback(l.unstable_NormalPriority, w1)));
	}
	var hs = null;
	function wg(e) {
		hs !== e &&
			((hs = e),
			l.unstable_scheduleCallback(l.unstable_NormalPriority, () => {
				hs === e && (hs = null);
				for (var t = 0; t < e.length; t += 3) {
					var n = e[t],
						a = e[t + 1],
						s = e[t + 2];
					if (typeof a != "function") {
						if (rf(a || n) === null) continue;
						break;
					}
					var c = Zl(n);
					c !== null &&
						(e.splice(t, 3),
						(t -= 3),
						lu(c, { pending: !0, data: s, method: n.method, action: a }, a, s));
				}
			}));
	}
	function Ri(e) {
		function t(_) {
			return ms(_, e);
		}
		Xa !== null && ms(Xa, e),
			Qa !== null && ms(Qa, e),
			Pa !== null && ms(Pa, e),
			Dr.forEach(t),
			zr.forEach(t);
		for (var n = 0; n < Ia.length; n++) {
			var a = Ia[n];
			a.blockedOn === e && (a.blockedOn = null);
		}
		for (; 0 < Ia.length && ((n = Ia[0]), n.blockedOn === null); )
			bg(n), n.blockedOn === null && Ia.shift();
		if (((n = (e.ownerDocument || e).$$reactFormReplay), n != null))
			for (a = 0; a < n.length; a += 3) {
				var s = n[a],
					c = n[a + 1],
					p = s[Xt] || null;
				if (typeof c == "function") p || wg(n);
				else if (p) {
					var b = null;
					if (c && c.hasAttribute("formAction")) {
						if (((s = c), (p = c[Xt] || null))) b = p.formAction;
						else if (rf(s) !== null) continue;
					} else b = p.action;
					typeof b == "function" ? (n[a + 1] = b) : (n.splice(a, 3), (a -= 3)),
						wg(n);
				}
			}
	}
	function Eg() {
		function e(c) {
			c.canIntercept &&
				c.info === "react-transition" &&
				c.intercept({
					handler: () => new Promise((p) => (s = p)),
					focusReset: "manual",
					scroll: "manual",
				});
		}
		function t() {
			s !== null && (s(), (s = null)), a || setTimeout(n, 20);
		}
		function n() {
			if (!a && !navigation.transition) {
				var c = navigation.currentEntry;
				c &&
					c.url != null &&
					navigation.navigate(c.url, {
						state: c.getState(),
						info: "react-transition",
						history: "replace",
					});
			}
		}
		if (typeof navigation == "object") {
			var a = !1,
				s = null;
			return (
				navigation.addEventListener("navigate", e),
				navigation.addEventListener("navigatesuccess", t),
				navigation.addEventListener("navigateerror", t),
				setTimeout(n, 100),
				() => {
					(a = !0),
						navigation.removeEventListener("navigate", e),
						navigation.removeEventListener("navigatesuccess", t),
						navigation.removeEventListener("navigateerror", t),
						s !== null && (s(), (s = null));
				}
			);
		}
	}
	function sf(e) {
		this._internalRoot = e;
	}
	(ps.prototype.render = sf.prototype.render =
		function (e) {
			var t = this._internalRoot;
			if (t === null) throw Error(o(409));
			var n = t.current,
				a = sn();
			hg(n, a, e, t, null, null);
		}),
		(ps.prototype.unmount = sf.prototype.unmount =
			function () {
				var e = this._internalRoot;
				if (e !== null) {
					this._internalRoot = null;
					var t = e.containerInfo;
					hg(e.current, 2, null, e, null, null), Zo(), (t[Il] = null);
				}
			});
	function ps(e) {
		this._internalRoot = e;
	}
	ps.prototype.unstable_scheduleHydration = (e) => {
		if (e) {
			var t = Pl();
			e = { blockedOn: null, target: e, priority: t };
			for (var n = 0; n < Ia.length && t !== 0 && t < Ia[n].priority; n++);
			Ia.splice(n, 0, e), n === 0 && bg(e);
		}
	};
	var Ng = i.version;
	if (Ng !== "19.2.8") throw Error(o(527, Ng, "19.2.8"));
	H.findDOMNode = (e) => {
		var t = e._reactInternals;
		if (t === void 0)
			throw typeof e.render == "function"
				? Error(o(188))
				: ((e = Object.keys(e).join(",")), Error(o(268, e)));
		return (
			(e = g(t)),
			(e = e !== null ? S(e) : null),
			(e = e === null ? null : e.stateNode),
			e
		);
	};
	var E1 = {
		bundleType: 0,
		version: "19.2.8",
		rendererPackageName: "react-dom",
		currentDispatcherRef: M,
		reconcilerVersion: "19.2.8",
	};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
		var gs = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!gs.isDisabled && gs.supportsFiber)
			try {
				(un = gs.inject(E1)), (Bt = gs);
			} catch {}
	}
	return (
		(Br.createRoot = (e, t) => {
			if (!f(e)) throw Error(o(299));
			var n = !1,
				a = "",
				s = Mh,
				c = Oh,
				p = Dh;
			return (
				t != null &&
					(t.unstable_strictMode === !0 && (n = !0),
					t.identifierPrefix !== void 0 && (a = t.identifierPrefix),
					t.onUncaughtError !== void 0 && (s = t.onUncaughtError),
					t.onCaughtError !== void 0 && (c = t.onCaughtError),
					t.onRecoverableError !== void 0 && (p = t.onRecoverableError)),
				(t = dg(e, 1, !1, null, null, n, a, null, s, c, p, Eg)),
				(e[Il] = t.current),
				Gu(e),
				new sf(t)
			);
		}),
		(Br.hydrateRoot = (e, t, n) => {
			if (!f(e)) throw Error(o(299));
			var a = !1,
				s = "",
				c = Mh,
				p = Oh,
				b = Dh,
				_ = null;
			return (
				n != null &&
					(n.unstable_strictMode === !0 && (a = !0),
					n.identifierPrefix !== void 0 && (s = n.identifierPrefix),
					n.onUncaughtError !== void 0 && (c = n.onUncaughtError),
					n.onCaughtError !== void 0 && (p = n.onCaughtError),
					n.onRecoverableError !== void 0 && (b = n.onRecoverableError),
					n.formState !== void 0 && (_ = n.formState)),
				(t = dg(e, 1, !0, t, n ?? null, a, s, _, c, p, b, Eg)),
				(t.context = mg(null)),
				(n = t.current),
				(a = sn()),
				(a = pl(a)),
				(s = Oa(a)),
				(s.callback = null),
				Da(n, s, a),
				(n = a),
				(t.current.lanes = n),
				ft(t, n),
				kn(t),
				(e[Il] = t.current),
				Gu(e),
				new ps(t)
			);
		}),
		(Br.version = "19.2.8"),
		Br
	);
}
var Bg;
function D1() {
	if (Bg) return df.exports;
	Bg = 1;
	function l() {
		if (
			!(
				typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" ||
				typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"
			)
		)
			try {
				__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(l);
			} catch (i) {
				console.error(i);
			}
	}
	return l(), (df.exports = O1()), df.exports;
}
var z1 = D1();
const k1 = Kf(z1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const L1 = (l) => l.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
	jv = (...l) =>
		l
			.filter((i, r, o) => !!i && i.trim() !== "" && o.indexOf(i) === r)
			.join(" ")
			.trim(); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var B1 = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
}; /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const U1 = x.forwardRef(
	(
		{
			color: l = "currentColor",
			size: i = 24,
			strokeWidth: r = 2,
			absoluteStrokeWidth: o,
			className: f = "",
			children: d,
			iconNode: m,
			...v
		},
		y,
	) =>
		x.createElement(
			"svg",
			{
				ref: y,
				...B1,
				width: i,
				height: i,
				stroke: l,
				strokeWidth: o ? (Number(r) * 24) / Number(i) : r,
				className: jv("lucide", f),
				...v,
			},
			[
				...m.map(([g, S]) => x.createElement(g, S)),
				...(Array.isArray(d) ? d : [d]),
			],
		),
); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const we = (l, i) => {
	const r = x.forwardRef(({ className: o, ...f }, d) =>
		x.createElement(U1, {
			ref: d,
			iconNode: i,
			className: jv(`lucide-${L1(l)}`, o),
			...f,
		}),
	);
	return (r.displayName = `${l}`), r;
}; /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const H1 = [
		[
			"path",
			{
				d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
				key: "169zse",
			},
		],
	],
	Tv = we("Activity", H1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const V1 = [
		["path", { d: "M5 12h14", key: "1ays0h" }],
		["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }],
	],
	Y1 = we("ArrowRight", V1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const G1 = [
		["path", { d: "M7 7h10v10", key: "1tivn9" }],
		["path", { d: "M7 17 17 7", key: "1vkiza" }],
	],
	q1 = we("ArrowUpRight", G1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const X1 = [
		["path", { d: "M12 8V4H8", key: "hb8ula" }],
		[
			"rect",
			{ width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" },
		],
		["path", { d: "M2 14h2", key: "vft8re" }],
		["path", { d: "M20 14h2", key: "4cs60a" }],
		["path", { d: "M15 13v2", key: "1xurst" }],
		["path", { d: "M9 13v2", key: "rq6x2g" }],
	],
	_v = we("Bot", X1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Q1 = [
		[
			"path",
			{
				d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",
				key: "l5xja",
			},
		],
		[
			"path",
			{
				d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z",
				key: "ep3f8r",
			},
		],
		[
			"path",
			{ d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4", key: "1p4c4q" },
		],
		["path", { d: "M17.599 6.5a3 3 0 0 0 .399-1.375", key: "tmeiqw" }],
		["path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5", key: "105sqy" }],
		["path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396", key: "ql3yin" }],
		["path", { d: "M19.938 10.5a4 4 0 0 1 .585.396", key: "1qfode" }],
		["path", { d: "M6 18a4 4 0 0 1-1.967-.516", key: "2e4loj" }],
		["path", { d: "M19.967 17.484A4 4 0 0 1 18 18", key: "159ez6" }],
	],
	Qr = we("Brain", Q1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const P1 = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]],
	$f = we("Check", P1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const I1 = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]],
	Av = we("ChevronDown", I1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const K1 = [["path", { d: "m18 15-6-6-6 6", key: "153udz" }]],
	Z1 = we("ChevronUp", K1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const $1 = [
		["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
		["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
	],
	F1 = we("CircleCheck", $1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const J1 = [
		["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
		["path", { d: "M8 12h8", key: "1wcyev" }],
		["path", { d: "M12 8v8", key: "napkw2" }],
	],
	W1 = we("CirclePlus", J1); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const eS = [
		["path", { d: "m18 16 4-4-4-4", key: "1inbqp" }],
		["path", { d: "m6 8-4 4 4 4", key: "15zrgr" }],
		["path", { d: "m14.5 4-5 16", key: "e7oirm" }],
	],
	tS = we("CodeXml", eS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const nS = [
		[
			"rect",
			{
				width: "14",
				height: "14",
				x: "8",
				y: "8",
				rx: "2",
				ry: "2",
				key: "17jyea",
			},
		],
		[
			"path",
			{
				d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
				key: "zix9uf",
			},
		],
	],
	Rv = we("Copy", nS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const aS = [
		[
			"rect",
			{ width: "16", height: "16", x: "4", y: "4", rx: "2", key: "14l7u7" },
		],
		[
			"rect",
			{ width: "6", height: "6", x: "9", y: "9", rx: "1", key: "5aljv4" },
		],
		["path", { d: "M15 2v2", key: "13l42r" }],
		["path", { d: "M15 20v2", key: "15mkzm" }],
		["path", { d: "M2 15h2", key: "1gxd5l" }],
		["path", { d: "M2 9h2", key: "1bbxkp" }],
		["path", { d: "M20 15h2", key: "19e6y8" }],
		["path", { d: "M20 9h2", key: "19tzq7" }],
		["path", { d: "M9 2v2", key: "165o2o" }],
		["path", { d: "M9 20v2", key: "i2bqo8" }],
	],
	Mv = we("Cpu", aS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lS = [
		[
			"path",
			{
				d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
				key: "1vdc57",
			},
		],
		["path", { d: "M5 21h14", key: "11awu3" }],
	],
	iS = we("Crown", lS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rS = [
		["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
		["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
		["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }],
	],
	oS = we("Database", rS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const sS = [
		["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
		["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
		["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }],
	],
	cS = we("Download", sS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const uS = [
		[
			"path",
			{
				d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
				key: "1rqfz7",
			},
		],
		["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
		["path", { d: "M10 9H8", key: "b1mrlr" }],
		["path", { d: "M16 13H8", key: "t4e002" }],
		["path", { d: "M16 17H8", key: "z1uh3a" }],
	],
	fS = we("FileText", uS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const dS = [
		["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
		[
			"path",
			{ d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" },
		],
		["path", { d: "M2 12h20", key: "9i4pu4" }],
	],
	mS = we("Globe", dS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hS = [
		[
			"polyline",
			{ points: "22 12 16 12 14 15 10 15 8 12 2 12", key: "o97t9d" },
		],
		[
			"path",
			{
				d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
				key: "oot6mr",
			},
		],
	],
	pS = we("Inbox", hS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const gS = [
		[
			"path",
			{
				d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
				key: "zw3jo",
			},
		],
		[
			"path",
			{
				d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
				key: "1wduqc",
			},
		],
		[
			"path",
			{
				d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
				key: "kqbvx6",
			},
		],
	],
	vS = we("Layers", gS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const yS = [
		[
			"rect",
			{ width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" },
		],
		[
			"rect",
			{ width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" },
		],
		[
			"rect",
			{ width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" },
		],
		[
			"rect",
			{ width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" },
		],
	],
	xS = we("LayoutDashboard", yS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const bS = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]],
	SS = we("LoaderCircle", bS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wS = [
		[
			"path",
			{
				d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
				key: "1lielz",
			},
		],
	],
	Pr = we("MessageSquare", wS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ES = [
		["path", { d: "M12 20h9", key: "t2du7b" }],
		[
			"path",
			{
				d: "M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",
				key: "1ykcvy",
			},
		],
	],
	NS = we("PenLine", ES); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CS = [
		[
			"path",
			{
				d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
				key: "1a8usu",
			},
		],
	],
	jS = we("Pen", CS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const TS = [
		["line", { x1: "19", x2: "5", y1: "5", y2: "19", key: "1x9vlm" }],
		["circle", { cx: "6.5", cy: "6.5", r: "2.5", key: "4mh3h7" }],
		["circle", { cx: "17.5", cy: "17.5", r: "2.5", key: "1mdrzq" }],
	],
	_S = we("Percent", TS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const AS = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]],
	RS = we("Play", AS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const MS = [
		["path", { d: "M5 12h14", key: "1ays0h" }],
		["path", { d: "M12 5v14", key: "s699le" }],
	],
	Ug = we("Plus", MS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const OS = [
		[
			"path",
			{
				d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
				key: "v9h5vc",
			},
		],
		["path", { d: "M21 3v5h-5", key: "1q7to0" }],
		[
			"path",
			{
				d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
				key: "3uifl3",
			},
		],
		["path", { d: "M8 16H3v5", key: "1cv678" }],
	],
	Vr = we("RefreshCw", OS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const DS = [
		["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
		["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }],
	],
	Ov = we("Search", DS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const zS = [
		[
			"rect",
			{
				width: "20",
				height: "8",
				x: "2",
				y: "2",
				rx: "2",
				ry: "2",
				key: "ngkwjq",
			},
		],
		[
			"rect",
			{
				width: "20",
				height: "8",
				x: "2",
				y: "14",
				rx: "2",
				ry: "2",
				key: "iecqi9",
			},
		],
		["line", { x1: "6", x2: "6.01", y1: "6", y2: "6", key: "16zg32" }],
		["line", { x1: "6", x2: "6.01", y1: "18", y2: "18", key: "nzw8ys" }],
	],
	kS = we("Server", zS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LS = [
		[
			"path",
			{
				d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
				key: "1qme2f",
			},
		],
		["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }],
	],
	Dv = we("Settings", LS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const BS = [
		[
			"path",
			{
				d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
				key: "oel41y",
			},
		],
		["path", { d: "M12 8v4", key: "1got3b" }],
		["path", { d: "M12 16h.01", key: "1drbdi" }],
	],
	zv = we("ShieldAlert", BS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const US = [
		[
			"path",
			{
				d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
				key: "oel41y",
			},
		],
		["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
	],
	HS = we("ShieldCheck", US); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const VS = [
		["line", { x1: "4", x2: "4", y1: "21", y2: "14", key: "1p332r" }],
		["line", { x1: "4", x2: "4", y1: "10", y2: "3", key: "gb41h5" }],
		["line", { x1: "12", x2: "12", y1: "21", y2: "12", key: "hf2csr" }],
		["line", { x1: "12", x2: "12", y1: "8", y2: "3", key: "1kfi7u" }],
		["line", { x1: "20", x2: "20", y1: "21", y2: "16", key: "1lhrwl" }],
		["line", { x1: "20", x2: "20", y1: "12", y2: "3", key: "16vvfq" }],
		["line", { x1: "2", x2: "6", y1: "14", y2: "14", key: "1uebub" }],
		["line", { x1: "10", x2: "14", y1: "8", y2: "8", key: "1yglbp" }],
		["line", { x1: "18", x2: "22", y1: "16", y2: "16", key: "1jxqpz" }],
	],
	YS = we("SlidersVertical", VS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GS = [
		[
			"path",
			{
				d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
				key: "4pj2yx",
			},
		],
		["path", { d: "M20 3v4", key: "1olli1" }],
		["path", { d: "M22 5h-4", key: "1gvqau" }],
		["path", { d: "M4 17v2", key: "vumght" }],
		["path", { d: "M5 18H3", key: "zchphs" }],
	],
	kl = we("Sparkles", GS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qS = [
		["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
		["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }],
	],
	kv = we("Terminal", qS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const XS = [
		["line", { x1: "10", x2: "14", y1: "2", y2: "2", key: "14vaq8" }],
		["line", { x1: "12", x2: "15", y1: "14", y2: "11", key: "17fdiu" }],
		["circle", { cx: "12", cy: "14", r: "8", key: "1e1u0o" }],
	],
	QS = we("Timer", XS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const PS = [
		["path", { d: "M3 6h18", key: "d0wm0j" }],
		["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
		["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
		["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
		["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }],
	],
	Ff = we("Trash2", PS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const IS = [
		["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
		["polyline", { points: "17 8 12 3 7 8", key: "t8dd8p" }],
		["line", { x1: "12", x2: "12", y1: "3", y2: "15", key: "widbto" }],
	],
	KS = we("Upload", IS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ZS = [
		["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
		["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }],
	],
	$S = we("User", ZS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const FS = [
		["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
		["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
		["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
		["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }],
	],
	Hl = we("Users", FS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const JS = [
		[
			"path",
			{
				d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
				key: "cbrjhi",
			},
		],
	],
	WS = we("Wrench", JS); /**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const e2 = [
		["path", { d: "M18 6 6 18", key: "1bl5f8" }],
		["path", { d: "m6 6 12 12", key: "d8bk6v" }],
	],
	t2 = we("X", e2);
var Gi = Cv();
const n2 = Kf(Gi);
function a2(l) {
	if (typeof document > "u") return;
	const i = document.head || document.getElementsByTagName("head")[0],
		r = document.createElement("style");
	(r.type = "text/css"),
		i.appendChild(r),
		r.styleSheet
			? (r.styleSheet.cssText = l)
			: r.appendChild(document.createTextNode(l));
}
const l2 = (l) => {
		switch (l) {
			case "success":
				return o2;
			case "info":
				return c2;
			case "warning":
				return s2;
			case "error":
				return u2;
			default:
				return null;
		}
	},
	i2 = Array(12).fill(0),
	r2 = ({ visible: l, className: i }) =>
		ie.createElement(
			"div",
			{
				className: ["sonner-loading-wrapper", i].filter(Boolean).join(" "),
				"data-visible": l,
			},
			ie.createElement(
				"div",
				{ className: "sonner-spinner" },
				i2.map((r, o) =>
					ie.createElement("div", {
						className: "sonner-loading-bar",
						key: `spinner-bar-${o}`,
					}),
				),
			),
		),
	o2 = ie.createElement(
		"svg",
		{
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 20 20",
			fill: "currentColor",
			height: "20",
			width: "20",
			"aria-hidden": "true",
		},
		ie.createElement("path", {
			fillRule: "evenodd",
			d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
			clipRule: "evenodd",
		}),
	),
	s2 = ie.createElement(
		"svg",
		{
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "currentColor",
			height: "20",
			width: "20",
			"aria-hidden": "true",
		},
		ie.createElement("path", {
			fillRule: "evenodd",
			d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
			clipRule: "evenodd",
		}),
	),
	c2 = ie.createElement(
		"svg",
		{
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 20 20",
			fill: "currentColor",
			height: "20",
			width: "20",
			"aria-hidden": "true",
		},
		ie.createElement("path", {
			fillRule: "evenodd",
			d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
			clipRule: "evenodd",
		}),
	),
	u2 = ie.createElement(
		"svg",
		{
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 20 20",
			fill: "currentColor",
			height: "20",
			width: "20",
			"aria-hidden": "true",
		},
		ie.createElement("path", {
			fillRule: "evenodd",
			d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
			clipRule: "evenodd",
		}),
	),
	f2 = ie.createElement(
		"svg",
		{
			xmlns: "http://www.w3.org/2000/svg",
			width: "12",
			height: "12",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.5",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
		},
		ie.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
		ie.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
	),
	d2 = () => {
		const [l, i] = ie.useState(document.hidden);
		return (
			ie.useEffect(() => {
				const r = () => {
					i(document.hidden);
				};
				return (
					document.addEventListener("visibilitychange", r),
					() => document.removeEventListener("visibilitychange", r)
				);
			}, []),
			l
		);
	};
let m2 = 1;
const h2 = 100,
	Hg = (l) => {
		var i;
		return typeof (l == null ? void 0 : l.id) == "number" ||
			(l == null || (i = l.id) == null ? void 0 : i.length) > 0
			? l.id
			: m2++;
	};
class p2 {
	constructor() {
		(this.subscribe = (i) => (
			this.subscribers.push(i),
			this.getActiveToasts().forEach((r) => i(r)),
			() => {
				const r = this.subscribers.indexOf(i);
				this.subscribers.splice(r, 1);
			}
		)),
			(this.publish = (i) => {
				this.subscribers.forEach((r) => r(i));
			}),
			(this.addToast = (i) => {
				this.publish(i),
					(this.toasts = [...this.toasts, i]),
					this.trimHistory();
			}),
			(this.trimHistory = () => {
				let i = this.toasts.length - h2;
				i <= 0 ||
					(this.toasts = this.toasts.filter((r) =>
						i > 0 && this.dismissedToasts.has(r.id)
							? (this.dismissedToasts.delete(r.id), i--, !1)
							: !0,
					));
			}),
			(this.create = (i) => {
				const { message: r, ...o } = i,
					f = Hg(i),
					d = this.pendingDismissals.get(f);
				d !== void 0 &&
					(cancelAnimationFrame(d),
					this.pendingDismissals.delete(f),
					this.dismissedToasts.delete(f));
				const m = this.dismissedToasts.has(f),
					v = i.dismissible === void 0 ? !0 : i.dismissible;
				return (
					m &&
						(this.dismissedToasts.delete(f),
						(this.toasts = this.toasts.filter((g) => g.id !== f))),
					(m ? void 0 : this.toasts.find((g) => g.id === f))
						? (this.toasts = this.toasts.map((g) =>
								g.id === f
									? (this.publish({ ...g, ...i, id: f, title: r }),
										{ ...g, ...i, id: f, dismissible: v, title: r })
									: g,
							))
						: this.addToast({ title: r, ...o, dismissible: v, id: f }),
					f
				);
			}),
			(this.dismiss = (i) => {
				if (i == null)
					return (
						this.getActiveToasts().forEach((o) => {
							this.dismissedToasts.add(o.id),
								this.subscribers.forEach((f) => f({ id: o.id, dismiss: !0 }));
						}),
						i
					);
				this.dismissedToasts.add(i);
				const r = this.pendingDismissals.get(i);
				return (
					r !== void 0 && cancelAnimationFrame(r),
					this.pendingDismissals.set(
						i,
						requestAnimationFrame(() => {
							this.pendingDismissals.delete(i),
								this.subscribers.forEach((o) => o({ id: i, dismiss: !0 }));
						}),
					),
					i
				);
			}),
			(this.message = (i, r) =>
				this.create({ ...r, message: i, type: void 0 })),
			(this.error = (i, r) => this.create({ ...r, message: i, type: "error" })),
			(this.success = (i, r) =>
				this.create({ ...r, type: "success", message: i })),
			(this.info = (i, r) => this.create({ ...r, type: "info", message: i })),
			(this.warning = (i, r) =>
				this.create({ ...r, type: "warning", message: i })),
			(this.loading = (i, r) =>
				this.create({ ...r, type: "loading", message: i })),
			(this.promise = (i, r) => {
				if (!r) return;
				let o;
				r.loading !== void 0 &&
					(o = this.create({
						...r,
						promise: i,
						type: "loading",
						message: r.loading,
						description:
							typeof r.description != "function" ? r.description : void 0,
					}));
				const f = Promise.resolve(i instanceof Function ? i() : i);
				let d = o !== void 0,
					m;
				const v = f
						.then(async (g) => {
							if (((m = ["resolve", g]), ie.isValidElement(g)))
								(d = !1), this.create({ id: o, type: "default", message: g });
							else if (v2(g) && !g.ok) {
								d = !1;
								const h =
										typeof r.error == "function"
											? await r.error(`HTTP error! status: ${g.status}`)
											: r.error,
									w =
										typeof r.description == "function"
											? await r.description(`HTTP error! status: ${g.status}`)
											: r.description,
									C =
										typeof h == "object" && !ie.isValidElement(h)
											? h
											: { message: h };
								this.create({ id: o, type: "error", description: w, ...C });
							} else if (g instanceof Error) {
								d = !1;
								const h =
										typeof r.error == "function" ? await r.error(g) : r.error,
									w =
										typeof r.description == "function"
											? await r.description(g)
											: r.description,
									C =
										typeof h == "object" && !ie.isValidElement(h)
											? h
											: { message: h };
								this.create({ id: o, type: "error", description: w, ...C });
							} else if (r.success !== void 0) {
								d = !1;
								const h =
										typeof r.success == "function"
											? await r.success(g)
											: r.success,
									w =
										typeof r.description == "function"
											? await r.description(g)
											: r.description,
									C =
										typeof h == "object" && !ie.isValidElement(h)
											? h
											: { message: h };
								this.create({ id: o, type: "success", description: w, ...C });
							}
						})
						.catch(async (g) => {
							if (((m = ["reject", g]), r.error !== void 0)) {
								d = !1;
								const S =
										typeof r.error == "function" ? await r.error(g) : r.error,
									h =
										typeof r.description == "function"
											? await r.description(g)
											: r.description,
									E =
										typeof S == "object" && !ie.isValidElement(S)
											? S
											: { message: S };
								this.create({ id: o, type: "error", description: h, ...E });
							}
						})
						.finally(() => {
							d && (this.dismiss(o), (o = void 0)),
								r.finally == null || r.finally.call(r);
						}),
					y = () =>
						new Promise((g, S) =>
							v.then(() => (m[0] === "reject" ? S(m[1]) : g(m[1]))).catch(S),
						);
				return typeof o != "string" && typeof o != "number"
					? { unwrap: y }
					: Object.assign(o, { unwrap: y });
			}),
			(this.custom = (i, r) => {
				const o = Hg(r);
				return this.create({ ...r, jsx: i(o), id: o, type: void 0 }), o;
			}),
			(this.getActiveToasts = () =>
				this.toasts.filter((i) => !this.dismissedToasts.has(i.id))),
			(this.subscribers = []),
			(this.toasts = []),
			(this.dismissedToasts = new Set()),
			(this.pendingDismissals = new Map());
	}
}
const Ft = new p2(),
	g2 = (l, i) => Ft.message(l, i),
	v2 = (l) =>
		l &&
		typeof l == "object" &&
		"ok" in l &&
		typeof l.ok == "boolean" &&
		"status" in l &&
		typeof l.status == "number",
	y2 = g2,
	x2 = () => Ft.toasts,
	b2 = () => Ft.getActiveToasts(),
	Ge = Object.assign(
		y2,
		{
			success: Ft.success,
			info: Ft.info,
			warning: Ft.warning,
			error: Ft.error,
			custom: Ft.custom,
			message: Ft.message,
			promise: Ft.promise,
			dismiss: Ft.dismiss,
			loading: Ft.loading,
		},
		{ getHistory: x2, getToasts: b2 },
	);
a2(
	"[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--normal-text);background:var(--normal-bg);border:1px solid var(--normal-border);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{-webkit-user-select:none;user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}",
);
function vs(l) {
	return l.label !== void 0;
}
const S2 = 3,
	w2 = "24px",
	E2 = "16px",
	Vg = 4e3,
	N2 = 356,
	C2 = 14,
	j2 = 45,
	T2 = 200;
function Ln(...l) {
	return l.filter(Boolean).join(" ");
}
function _2(l) {
	const [i, r] = l.split("-"),
		o = [];
	return i && o.push(i), r && o.push(r), o;
}
const A2 = (l) => {
	var i, r, o, f, d, m, v, y, g;
	const {
			invert: S,
			toast: h,
			unstyled: w,
			interacting: E,
			setHeights: C,
			visibleToasts: j,
			heights: N,
			index: T,
			toasts: z,
			expanded: R,
			removeToast: O,
			defaultRichColors: L,
			closeButton: Y,
			style: X,
			cancelButtonStyle: q,
			actionButtonStyle: J,
			className: ee = "",
			descriptionClassName: ce = "",
			duration: te,
			position: se,
			gap: le,
			expandByDefault: ue,
			classNames: M,
			icons: H,
			closeButtonAriaLabel: Z = "Close toast",
		} = l,
		[re, F] = ie.useState(null),
		[A, G] = ie.useState(null),
		[W, $] = ie.useState(!1),
		[ne, oe] = ie.useState(!1),
		[ge, fe] = ie.useState(!1),
		[ae, Ve] = ie.useState(!1),
		[Ce, xe] = ie.useState(!1),
		[je, Ke] = ie.useState(0),
		[Ot, Yt] = ie.useState(0),
		Gt = ie.useRef(h.duration || te || Vg),
		Nn = ie.useRef(null),
		Lt = ie.useRef(null),
		cl = T === 0,
		ul = T + 1 <= j,
		nt = h.type,
		Wr = nt ?? "default",
		ct = h.dismissible !== !1,
		Fs = h.className || "",
		eo = h.descriptionClassName || "",
		fl = ie.useMemo(
			() => N.findIndex((be) => be.toastId === h.id) || 0,
			[N, h.id],
		),
		Xl = ie.useMemo(() => {
			var be;
			return (be = h.closeButton) != null ? be : Y;
		}, [h.closeButton, Y]),
		to = ie.useMemo(() => h.duration || te || Vg, [h.duration, te]),
		Ql = ie.useRef(0),
		wa = ie.useRef(0),
		no = ie.useRef(0),
		un = ie.useRef(null),
		[Bt, Mn] = se.split("-"),
		Dt = ie.useMemo(
			() => N.reduce((be, it, ut) => (ut >= fl ? be : be + it.height), 0),
			[N, fl],
		),
		ao = d2(),
		fn = ie.useMemo(() => {
			var be;
			return (be = l.swipeDirections) != null ? be : _2(se);
		}, [l.swipeDirections, se]),
		Js = h.invert || S,
		Ea = nt === "loading";
	(wa.current = ie.useMemo(() => fl * le + Dt, [fl, Dt])),
		ie.useEffect(() => {
			Gt.current = to;
		}, [to]),
		ie.useEffect(() => {
			$(!0);
		}, []),
		ie.useEffect(() => {
			const be = Lt.current;
			if (be) {
				const it = be.getBoundingClientRect().height;
				return (
					Yt(it),
					C((ut) => [
						{ toastId: h.id, height: it, position: h.position },
						...ut,
					]),
					() => C((ut) => ut.filter((ft) => ft.toastId !== h.id))
				);
			}
		}, [C, h.id]),
		ie.useLayoutEffect(() => {
			if (!W) return;
			const be = Lt.current,
				it = be.style.height;
			be.style.height = "auto";
			const ut = be.getBoundingClientRect().height;
			(be.style.height = it),
				Yt(ut),
				C((ft) =>
					ft.find((dt) => dt.toastId === h.id)
						? ft.map((dt) => (dt.toastId === h.id ? { ...dt, height: ut } : dt))
						: [{ toastId: h.id, height: ut, position: h.position }, ...ft],
				);
		}, [W, h.title, h.description, C, h.id, h.jsx, h.action, h.cancel]);
	const Wt = ie.useCallback(() => {
		oe(!0),
			Ke(wa.current),
			C((be) => be.filter((it) => it.toastId !== h.id)),
			setTimeout(() => {
				O(h);
			}, T2);
	}, [h, O, C, wa]);
	ie.useEffect(() => {
		if (
			(h.promise && nt === "loading") ||
			h.duration === 1 / 0 ||
			h.type === "loading"
		)
			return;
		let be;
		return (
			R || E || ao
				? (() => {
						if (no.current < Ql.current) {
							const ft = new Date().getTime() - Ql.current;
							Gt.current = Gt.current - ft;
						}
						no.current = new Date().getTime();
					})()
				: (() => {
						Gt.current !== 1 / 0 &&
							((Ql.current = new Date().getTime()),
							(be = setTimeout(() => {
								h.onAutoClose == null || h.onAutoClose.call(h, h), Wt();
							}, Gt.current)));
					})(),
			() => clearTimeout(be)
		);
	}, [R, E, h, nt, ao, Wt]),
		ie.useEffect(() => {
			h.delete && (Wt(), h.onDismiss == null || h.onDismiss.call(h, h));
		}, [Wt, h.delete]);
	function dl() {
		var be;
		if (H != null && H.loading) {
			var it;
			return ie.createElement(
				"div",
				{
					className: Ln(
						M == null ? void 0 : M.loader,
						h == null || (it = h.classNames) == null ? void 0 : it.loader,
						"sonner-loader",
					),
					"data-visible": nt === "loading",
				},
				H.loading,
			);
		}
		return ie.createElement(r2, {
			className: Ln(
				M == null ? void 0 : M.loader,
				h == null || (be = h.classNames) == null ? void 0 : be.loader,
			),
			visible: nt === "loading",
		});
	}
	const Qn = h.icon || (H == null ? void 0 : H[nt]) || l2(nt);
	var ml, Na;
	return ie.createElement(
		"li",
		{
			tabIndex: 0,
			ref: Lt,
			className: Ln(
				ee,
				Fs,
				M == null ? void 0 : M.toast,
				h == null || (i = h.classNames) == null ? void 0 : i.toast,
				M == null ? void 0 : M[Wr],
				h == null || (r = h.classNames) == null ? void 0 : r[Wr],
			),
			"data-sonner-toast": "",
			"data-rich-colors": (ml = h.richColors) != null ? ml : L,
			"data-styled": !(h.jsx || h.unstyled || w),
			"data-mounted": W,
			"data-promise": !!h.promise,
			"data-swiped": Ce,
			"data-removed": ne,
			"data-visible": ul,
			"data-y-position": Bt,
			"data-x-position": Mn,
			"data-index": T,
			"data-front": cl,
			"data-swiping": ge,
			"data-dismissible": ct,
			"data-type": nt,
			"data-invert": Js,
			"data-swipe-out": ae,
			"data-swipe-direction": A,
			"data-expanded": !!(R || (ue && W)),
			"data-testid": h.testId,
			style: {
				"--index": T,
				"--toasts-before": T,
				"--z-index": z.length - T,
				"--offset": `${ne ? je : wa.current}px`,
				"--initial-height": ue ? "auto" : `${Ot}px`,
				...X,
				...h.style,
			},
			onDragEnd: () => {
				fe(!1), F(null), (un.current = null);
			},
			onPointerDown: (be) => {
				be.button !== 2 &&
					(Ea ||
						!ct ||
						((Nn.current = new Date()),
						Ke(wa.current),
						be.target.setPointerCapture(be.pointerId),
						be.target.tagName !== "BUTTON" &&
							(fe(!0), (un.current = { x: be.clientX, y: be.clientY }))));
			},
			onPointerUp: () => {
				var be, it, ut;
				if (ae || !ct) return;
				un.current = null;
				const ft = Number(
						((be = Lt.current) == null
							? void 0
							: be.style
									.getPropertyValue("--swipe-amount-x")
									.replace("px", "")) || 0,
					),
					hl = Number(
						((it = Lt.current) == null
							? void 0
							: it.style
									.getPropertyValue("--swipe-amount-y")
									.replace("px", "")) || 0,
					),
					dt =
						new Date().getTime() -
						((ut = Nn.current) == null ? void 0 : ut.getTime()),
					Ut = re === "x" ? ft : hl,
					en = Math.abs(Ut) / dt;
				if (
					(re === "x"
						? fn.includes(ft > 0 ? "right" : "left")
						: fn.includes(hl > 0 ? "bottom" : "top")) &&
					(Math.abs(Ut) >= j2 || en > 0.11)
				) {
					Ke(wa.current),
						h.onDismiss == null || h.onDismiss.call(h, h),
						G(
							re === "x" ? (ft > 0 ? "right" : "left") : hl > 0 ? "down" : "up",
						),
						Wt(),
						Ve(!0);
					return;
				} else {
					var qt, Pl;
					(qt = Lt.current) == null ||
						qt.style.setProperty("--swipe-amount-x", "0px"),
						(Pl = Lt.current) == null ||
							Pl.style.setProperty("--swipe-amount-y", "0px");
				}
				xe(!1), fe(!1), F(null);
			},
			onPointerMove: (be) => {
				var it, ut, ft;
				if (
					!un.current ||
					!ct ||
					((it = window.getSelection()) == null
						? void 0
						: it.toString().length) > 0
				)
					return;
				const dt = be.clientY - un.current.y,
					Ut = be.clientX - un.current.x;
				!re &&
					(Math.abs(Ut) > 1 || Math.abs(dt) > 1) &&
					F(Math.abs(Ut) > Math.abs(dt) ? "x" : "y");
				const en = { x: 0, y: 0 };
				const pl = (qt) => 1 / (1.5 + Math.abs(qt) / 20);
				if (re === "y") {
					if (fn.includes("top") || fn.includes("bottom"))
						if (
							(fn.includes("top") && dt < 0) ||
							(fn.includes("bottom") && dt > 0)
						)
							en.y = dt;
						else {
							const qt = dt * pl(dt);
							en.y = Math.abs(qt) < Math.abs(dt) ? qt : dt;
						}
				} else if (re === "x" && (fn.includes("left") || fn.includes("right")))
					if (
						(fn.includes("left") && Ut < 0) ||
						(fn.includes("right") && Ut > 0)
					)
						en.x = Ut;
					else {
						const qt = Ut * pl(Ut);
						en.x = Math.abs(qt) < Math.abs(Ut) ? qt : Ut;
					}
				(Math.abs(en.x) > 0 || Math.abs(en.y) > 0) && xe(!0),
					(ut = Lt.current) == null ||
						ut.style.setProperty("--swipe-amount-x", `${en.x}px`),
					(ft = Lt.current) == null ||
						ft.style.setProperty("--swipe-amount-y", `${en.y}px`);
			},
		},
		Xl && !h.jsx && nt !== "loading"
			? ie.createElement(
					"button",
					{
						"aria-label": Z,
						"data-disabled": Ea,
						"data-close-button": !0,
						onClick:
							Ea || !ct
								? () => {}
								: () => {
										Wt(), h.onDismiss == null || h.onDismiss.call(h, h);
									},
						className: Ln(
							M == null ? void 0 : M.closeButton,
							h == null || (o = h.classNames) == null ? void 0 : o.closeButton,
						),
					},
					(Na = H == null ? void 0 : H.close) != null ? Na : f2,
				)
			: null,
		(nt || h.icon || h.promise) &&
			h.icon !== null &&
			((H == null ? void 0 : H[nt]) !== null || h.icon)
			? ie.createElement(
					"div",
					{
						"data-icon": "",
						className: Ln(
							M == null ? void 0 : M.icon,
							h == null || (f = h.classNames) == null ? void 0 : f.icon,
						),
					},
					nt === "loading" ? h.icon || dl() : h.promise ? dl() : null,
					nt !== "loading" ? Qn : null,
				)
			: null,
		ie.createElement(
			"div",
			{
				"data-content": "",
				className: Ln(
					M == null ? void 0 : M.content,
					h == null || (d = h.classNames) == null ? void 0 : d.content,
				),
			},
			ie.createElement(
				"div",
				{
					"data-title": "",
					className: Ln(
						M == null ? void 0 : M.title,
						h == null || (m = h.classNames) == null ? void 0 : m.title,
					),
				},
				h.jsx ? h.jsx : typeof h.title == "function" ? h.title() : h.title,
			),
			h.description
				? ie.createElement(
						"div",
						{
							"data-description": "",
							className: Ln(
								ce,
								eo,
								M == null ? void 0 : M.description,
								h == null || (v = h.classNames) == null
									? void 0
									: v.description,
							),
						},
						typeof h.description == "function"
							? h.description()
							: h.description,
					)
				: null,
		),
		ie.isValidElement(h.cancel)
			? h.cancel
			: h.cancel && vs(h.cancel)
				? ie.createElement(
						"button",
						{
							"data-button": !0,
							"data-cancel": !0,
							style: h.cancelButtonStyle || q,
							onClick: (be) => {
								vs(h.cancel) &&
									ct &&
									(h.cancel.onClick == null ||
										h.cancel.onClick.call(h.cancel, be),
									Wt());
							},
							className: Ln(
								M == null ? void 0 : M.cancelButton,
								h == null || (y = h.classNames) == null
									? void 0
									: y.cancelButton,
							),
						},
						h.cancel.label,
					)
				: null,
		ie.isValidElement(h.action)
			? h.action
			: h.action && vs(h.action)
				? ie.createElement(
						"button",
						{
							"data-button": !0,
							"data-action": !0,
							style: h.actionButtonStyle || J,
							onClick: (be) => {
								vs(h.action) &&
									(h.action.onClick == null ||
										h.action.onClick.call(h.action, be),
									!be.defaultPrevented && Wt());
							},
							className: Ln(
								M == null ? void 0 : M.actionButton,
								h == null || (g = h.classNames) == null
									? void 0
									: g.actionButton,
							),
						},
						h.action.label,
					)
				: null,
	);
};
function Yg() {
	if (typeof window > "u" || typeof document > "u") return "ltr";
	const l = document.documentElement.getAttribute("dir");
	return l === "auto" || !l
		? window.getComputedStyle(document.documentElement).direction
		: l;
}
function R2(l, i) {
	const r = {};
	return (
		[l, i].forEach((o, f) => {
			const d = f === 1,
				m = d ? "--mobile-offset" : "--offset",
				v = d ? E2 : w2;
			function y(g) {
				["top", "right", "bottom", "left"].forEach((S) => {
					r[`${m}-${S}`] = typeof g == "number" ? `${g}px` : g;
				});
			}
			typeof o == "number" || typeof o == "string"
				? y(o)
				: typeof o == "object"
					? ["top", "right", "bottom", "left"].forEach((g) => {
							o[g] === void 0
								? (r[`${m}-${g}`] = v)
								: (r[`${m}-${g}`] =
										typeof o[g] == "number" ? `${o[g]}px` : o[g]);
						})
					: y(v);
		}),
		r
	);
}
const M2 = ie.forwardRef((i, r) => {
	const {
			id: o,
			invert: f,
			position: d = "bottom-right",
			hotkey: m = ["altKey", "KeyT"],
			expand: v,
			closeButton: y,
			className: g,
			offset: S,
			mobileOffset: h,
			theme: w = "light",
			richColors: E,
			duration: C,
			style: j,
			visibleToasts: N = S2,
			toastOptions: T,
			dir: z = Yg(),
			gap: R = C2,
			icons: O,
			customAriaLabel: L,
			containerAriaLabel: Y = "Notifications",
		} = i,
		[X, q] = ie.useState([]),
		J = ie.useMemo(
			() =>
				o ? X.filter(($) => $.toasterId === o) : X.filter(($) => !$.toasterId),
			[X, o],
		),
		ee = ie.useMemo(
			() =>
				Array.from(
					new Set(
						[d].concat(J.filter(($) => $.position).map(($) => $.position)),
					),
				),
			[J, d],
		),
		[ce, te] = ie.useState([]),
		[se, le] = ie.useState(!1),
		[ue, M] = ie.useState(!1),
		[H, Z] = ie.useState(
			w !== "system"
				? w
				: typeof window < "u" &&
						window.matchMedia &&
						window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light",
		),
		re = ie.useRef(null),
		F = m.join("+").replace(/Key/g, "").replace(/Digit/g, ""),
		A = ie.useRef(null),
		G = ie.useRef(!1),
		W = ie.useCallback(($) => {
			q((ne) => {
				var oe;
				return (
					((oe = ne.find((ge) => ge.id === $.id)) != null && oe.delete) ||
						Ft.dismiss($.id),
					ne.filter(({ id: ge }) => ge !== $.id)
				);
			});
		}, []);
	return (
		ie.useEffect(
			() =>
				Ft.subscribe(($) => {
					if ($.dismiss) {
						requestAnimationFrame(() => {
							q((ne) =>
								ne.map((oe) => (oe.id === $.id ? { ...oe, delete: !0 } : oe)),
							);
						});
						return;
					}
					setTimeout(() => {
						n2.flushSync(() => {
							q((ne) => {
								const oe = ne.findIndex((ge) => ge.id === $.id);
								return oe !== -1
									? [
											...ne.slice(0, oe),
											{ ...ne[oe], ...$ },
											...ne.slice(oe + 1),
										]
									: [$, ...ne];
							});
						});
					});
				}),
			[],
		),
		ie.useEffect(() => {
			if (w !== "system") {
				Z(w);
				return;
			}
			if (
				(w === "system" &&
					(window.matchMedia &&
					window.matchMedia("(prefers-color-scheme: dark)").matches
						? Z("dark")
						: Z("light")),
				typeof window > "u")
			)
				return;
			const $ = window.matchMedia("(prefers-color-scheme: dark)");
			try {
				$.addEventListener("change", ({ matches: ne }) => {
					Z(ne ? "dark" : "light");
				});
			} catch {
				$.addListener(({ matches: oe }) => {
					try {
						Z(oe ? "dark" : "light");
					} catch (ge) {
						console.error(ge);
					}
				});
			}
		}, [w]),
		ie.useEffect(() => {
			X.length <= 1 && le(!1);
		}, [X]),
		ie.useEffect(() => {
			const $ = (ne) => {
				var oe;
				if (m.length > 0 && m.every((ae) => ne[ae] || ne.code === ae)) {
					var fe;
					le(!0), (fe = re.current) == null || fe.focus();
				}
				ne.code === "Escape" &&
					(document.activeElement === re.current ||
						((oe = re.current) != null &&
							oe.contains(document.activeElement))) &&
					le(!1);
			};
			return (
				document.addEventListener("keydown", $),
				() => document.removeEventListener("keydown", $)
			);
		}, [m]),
		ie.useEffect(() => {
			if (re.current)
				return () => {
					A.current &&
						(A.current.focus({ preventScroll: !0 }),
						(A.current = null),
						(G.current = !1));
				};
		}, [re.current]),
		ie.createElement(
			"section",
			{
				ref: r,
				"aria-label": L ?? `${Y} ${F}`,
				tabIndex: -1,
				"aria-live": "polite",
				"aria-relevant": "additions text",
				"aria-atomic": "false",
				suppressHydrationWarning: !0,
				"data-react-aria-top-layer": !0,
			},
			ee.map(($, ne) => {
				var oe;
				const [ge, fe] = $.split("-");
				return J.length
					? ie.createElement(
							"ol",
							{
								key: $,
								dir: z === "auto" ? Yg() : z,
								tabIndex: -1,
								ref: re,
								className: g,
								"data-sonner-toaster": !0,
								"data-sonner-theme": H,
								"data-y-position": ge,
								"data-x-position": fe,
								style: {
									"--front-toast-height": `${((oe = ce[0]) == null ? void 0 : oe.height) || 0}px`,
									"--width": `${N2}px`,
									"--gap": `${R}px`,
									...j,
									...R2(S, h),
								},
								onBlur: (ae) => {
									G.current &&
										!ae.currentTarget.contains(ae.relatedTarget) &&
										((G.current = !1),
										A.current &&
											(A.current.focus({ preventScroll: !0 }),
											(A.current = null)));
								},
								onFocus: (ae) => {
									(ae.target instanceof HTMLElement &&
										ae.target.dataset.dismissible === "false") ||
										G.current ||
										((G.current = !0), (A.current = ae.relatedTarget));
								},
								onMouseEnter: () => le(!0),
								onMouseMove: () => le(!0),
								onMouseLeave: () => {
									ue || le(!1);
								},
								onDragEnd: () => le(!1),
								onPointerDown: (ae) => {
									(ae.target instanceof HTMLElement &&
										ae.target.dataset.dismissible === "false") ||
										M(!0);
								},
								onPointerUp: () => M(!1),
							},
							J.filter(
								(ae) => (!ae.position && ne === 0) || ae.position === $,
							).map((ae, Ve) => {
								var Ce, xe;
								return ie.createElement(A2, {
									key: ae.id,
									icons: O,
									index: Ve,
									toast: ae,
									defaultRichColors: E,
									duration:
										(Ce = T == null ? void 0 : T.duration) != null ? Ce : C,
									className: T == null ? void 0 : T.className,
									descriptionClassName:
										T == null ? void 0 : T.descriptionClassName,
									invert: f,
									visibleToasts: N,
									closeButton:
										(xe = T == null ? void 0 : T.closeButton) != null ? xe : y,
									interacting: ue,
									position: $,
									style: T == null ? void 0 : T.style,
									unstyled: T == null ? void 0 : T.unstyled,
									classNames: T == null ? void 0 : T.classNames,
									cancelButtonStyle: T == null ? void 0 : T.cancelButtonStyle,
									actionButtonStyle: T == null ? void 0 : T.actionButtonStyle,
									closeButtonAriaLabel:
										T == null ? void 0 : T.closeButtonAriaLabel,
									removeToast: W,
									toasts: J.filter((je) => je.position == ae.position),
									heights: ce.filter((je) => je.position == ae.position),
									setHeights: te,
									expandByDefault: v,
									gap: R,
									expanded: se,
									swipeDirections: i.swipeDirections,
								});
							}),
						)
					: null;
			}),
		)
	);
});
var O2 = Object.defineProperty,
	Jf = (l, i) => O2(l, "name", { value: i, configurable: !0 });
function Rf(l, i) {
	if (typeof l == "function") return l(i);
	l != null && (l.current = i);
}
Jf(Rf, "setRef");
function Lv(...l) {
	return (i) => {
		let r = !1;
		const o = l.map((f) => {
			const d = Rf(f, i);
			return !r && typeof d == "function" && (r = !0), d;
		});
		if (r)
			return () => {
				for (let f = 0; f < o.length; f++) {
					const d = o[f];
					typeof d == "function" ? d() : Rf(l[f], null);
				}
			};
	};
}
Jf(Lv, "composeRefs");
function He(...l) {
	return x.useCallback(Lv(...l), l);
}
Jf(He, "useComposedRefs");
var D2 = Object.defineProperty,
	Rn = (l, i) => D2(l, "name", { value: i, configurable: !0 });
function ga(l) {
	const i = x.forwardRef((r, o) => {
		let { children: f, ...d } = r,
			m = null,
			v = !1;
		const y = [];
		Mf(f) && typeof ys == "function" && (f = ys(f._payload)),
			x.Children.forEach(f, (w) => {
				var E;
				if (Vv(w)) {
					v = !0;
					const C = w;
					let j = "child" in C.props ? C.props.child : C.props.children;
					Mf(j) && typeof ys == "function" && (j = ys(j._payload)),
						(m = L2(C, j)),
						y.push(
							(E = m == null ? void 0 : m.props) == null ? void 0 : E.children,
						);
				} else y.push(w);
			}),
			m
				? (m = x.cloneElement(m, void 0, y))
				: !v && x.Children.count(f) === 1 && x.isValidElement(f) && (m = f);
		const g = m ? Hv(m) : void 0,
			S = He(o, g);
		if (!m) {
			if (f || f === 0) throw new Error(v ? H2(l) : U2(l));
			return f;
		}
		const h = Uv(d, m.props ?? {});
		return m.type !== x.Fragment && (h.ref = o ? S : g), x.cloneElement(m, h);
	});
	return (i.displayName = `${l}.Slot`), i;
}
Rn(ga, "createSlot");
var z2 = ga("Slot"),
	Bv = Symbol.for("radix.slottable");
function k2(l) {
	const i = Rn(
		(r) => ("child" in r ? r.children(r.child) : r.children),
		"Slottable",
	);
	return (i.displayName = `${l}.Slottable`), (i.__radixId = Bv), i;
}
Rn(k2, "createSlottable");
var L2 = Rn((l, i) => {
	if ("child" in l.props) {
		const r = l.props.child;
		return x.isValidElement(r)
			? x.cloneElement(r, void 0, l.props.children(r.props.children))
			: null;
	}
	return x.isValidElement(i) ? i : null;
}, "getSlottableElementFromSlottable");
function Uv(l, i) {
	const r = { ...i };
	for (const o in i) {
		const f = l[o],
			d = i[o];
		/^on[A-Z]/.test(o)
			? f && d
				? (r[o] = (...v) => {
						const y = d(...v);
						return f(...v), y;
					})
				: f && (r[o] = f)
			: o === "style"
				? (r[o] = { ...f, ...d })
				: o === "className" && (r[o] = [f, d].filter(Boolean).join(" "));
	}
	return { ...l, ...r };
}
Rn(Uv, "mergeProps");
function Hv(l) {
	var o, f;
	let i =
			(o = Object.getOwnPropertyDescriptor(l.props, "ref")) == null
				? void 0
				: o.get,
		r = i && "isReactWarning" in i && i.isReactWarning;
	return r
		? l.ref
		: ((i =
				(f = Object.getOwnPropertyDescriptor(l, "ref")) == null
					? void 0
					: f.get),
			(r = i && "isReactWarning" in i && i.isReactWarning),
			r ? l.props.ref : l.props.ref || l.ref);
}
Rn(Hv, "getElementRef");
function Vv(l) {
	return (
		x.isValidElement(l) &&
		typeof l.type == "function" &&
		"__radixId" in l.type &&
		l.type.__radixId === Bv
	);
}
Rn(Vv, "isSlottable");
var B2 = Symbol.for("react.lazy");
function Mf(l) {
	return (
		l != null &&
		typeof l == "object" &&
		"$$typeof" in l &&
		l.$$typeof === B2 &&
		"_payload" in l &&
		Yv(l._payload)
	);
}
Rn(Mf, "isLazyComponent");
function Yv(l) {
	return typeof l == "object" && l !== null && "then" in l;
}
Rn(Yv, "isPromiseLike");
var U2 = Rn(
		(l) =>
			`${l} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`,
		"createSlotError",
	),
	H2 = Rn(
		(l) =>
			`${l} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`,
		"createSlottableError",
	),
	ys = Yi[" use ".trim().toString()];
function Gv(l) {
	var i,
		r,
		o = "";
	if (typeof l == "string" || typeof l == "number") o += l;
	else if (typeof l == "object")
		if (Array.isArray(l)) {
			var f = l.length;
			for (i = 0; i < f; i++)
				l[i] && (r = Gv(l[i])) && (o && (o += " "), (o += r));
		} else for (r in l) l[r] && (o && (o += " "), (o += r));
	return o;
}
function qv() {
	for (var l, i, r = 0, o = "", f = arguments.length; r < f; r++)
		(l = arguments[r]) && (i = Gv(l)) && (o && (o += " "), (o += i));
	return o;
}
const Gg = (l) => (typeof l == "boolean" ? `${l}` : l === 0 ? "0" : l),
	qg = qv,
	Xv = (l, i) => (r) => {
		var o;
		if ((i == null ? void 0 : i.variants) == null)
			return qg(
				l,
				r == null ? void 0 : r.class,
				r == null ? void 0 : r.className,
			);
		const { variants: f, defaultVariants: d } = i,
			m = Object.keys(f).map((g) => {
				const S = r == null ? void 0 : r[g],
					h = d == null ? void 0 : d[g];
				if (S === null) return null;
				const w = Gg(S) || Gg(h);
				return f[g][w];
			}),
			v =
				r &&
				Object.entries(r).reduce((g, S) => {
					const [h, w] = S;
					return w === void 0 || (g[h] = w), g;
				}, {}),
			y =
				i == null || (o = i.compoundVariants) === null || o === void 0
					? void 0
					: o.reduce((g, S) => {
							const { class: h, className: w, ...E } = S;
							return Object.entries(E).every((C) => {
								const [j, N] = C;
								return Array.isArray(N)
									? N.includes({ ...d, ...v }[j])
									: { ...d, ...v }[j] === N;
							})
								? [...g, h, w]
								: g;
						}, []);
		return qg(
			l,
			m,
			y,
			r == null ? void 0 : r.class,
			r == null ? void 0 : r.className,
		);
	},
	V2 = (l, i) => {
		const r = new Array(l.length + i.length);
		for (let o = 0; o < l.length; o++) r[o] = l[o];
		for (let o = 0; o < i.length; o++) r[l.length + o] = i[o];
		return r;
	},
	Y2 = (l, i) => ({ classGroupId: l, validator: i }),
	Qv = (l = new Map(), i = null, r) => ({
		nextPart: l,
		validators: i,
		classGroupId: r,
	}),
	Os = "-",
	Xg = [],
	G2 = "arbitrary..",
	q2 = (l) => {
		const i = Q2(l),
			{ conflictingClassGroups: r, conflictingClassGroupModifiers: o } = l;
		return {
			getClassGroupId: (m) => {
				if (m.startsWith("[") && m.endsWith("]")) return X2(m);
				const v = m.split(Os),
					y = v[0] === "" && v.length > 1 ? 1 : 0;
				return Pv(v, y, i);
			},
			getConflictingClassGroupIds: (m, v) => {
				if (v) {
					const y = o[m],
						g = r[m];
					return y ? (g ? V2(g, y) : y) : g || Xg;
				}
				return r[m] || Xg;
			},
		};
	},
	Pv = (l, i, r) => {
		if (l.length - i === 0) return r.classGroupId;
		const f = l[i],
			d = r.nextPart.get(f);
		if (d) {
			const g = Pv(l, i + 1, d);
			if (g) return g;
		}
		const m = r.validators;
		if (m === null) return;
		const v = i === 0 ? l.join(Os) : l.slice(i).join(Os),
			y = m.length;
		for (let g = 0; g < y; g++) {
			const S = m[g];
			if (S.validator(v)) return S.classGroupId;
		}
	},
	X2 = (l) =>
		l.slice(1, -1).indexOf(":") === -1
			? void 0
			: (() => {
					const i = l.slice(1, -1),
						r = i.indexOf(":"),
						o = i.slice(0, r);
					return o ? G2 + o : void 0;
				})(),
	Q2 = (l) => {
		const { theme: i, classGroups: r } = l;
		return P2(r, i);
	},
	P2 = (l, i) => {
		const r = Qv();
		for (const o in l) {
			const f = l[o];
			Wf(f, r, o, i);
		}
		return r;
	},
	Wf = (l, i, r, o) => {
		const f = l.length;
		for (let d = 0; d < f; d++) {
			const m = l[d];
			I2(m, i, r, o);
		}
	},
	I2 = (l, i, r, o) => {
		if (typeof l == "string") {
			K2(l, i, r);
			return;
		}
		if (typeof l == "function") {
			Z2(l, i, r, o);
			return;
		}
		$2(l, i, r, o);
	},
	K2 = (l, i, r) => {
		const o = l === "" ? i : Iv(i, l);
		o.classGroupId = r;
	},
	Z2 = (l, i, r, o) => {
		if (F2(l)) {
			Wf(l(o), i, r, o);
			return;
		}
		i.validators === null && (i.validators = []), i.validators.push(Y2(r, l));
	},
	$2 = (l, i, r, o) => {
		const f = Object.entries(l),
			d = f.length;
		for (let m = 0; m < d; m++) {
			const [v, y] = f[m];
			Wf(y, Iv(i, v), r, o);
		}
	},
	Iv = (l, i) => {
		let r = l;
		const o = i.split(Os),
			f = o.length;
		for (let d = 0; d < f; d++) {
			const m = o[d];
			let v = r.nextPart.get(m);
			v || ((v = Qv()), r.nextPart.set(m, v)), (r = v);
		}
		return r;
	},
	F2 = (l) => "isThemeGetter" in l && l.isThemeGetter === !0,
	J2 = (l) => {
		if (l < 1) return { get: () => {}, set: () => {} };
		let i = 0,
			r = Object.create(null),
			o = Object.create(null);
		const f = (d, m) => {
			(r[d] = m), i++, i > l && ((i = 0), (o = r), (r = Object.create(null)));
		};
		return {
			get(d) {
				let m = r[d];
				if (m !== void 0) return m;
				if ((m = o[d]) !== void 0) return f(d, m), m;
			},
			set(d, m) {
				d in r ? (r[d] = m) : f(d, m);
			},
		};
	},
	Of = "!",
	Qg = ":",
	W2 = [],
	Pg = (l, i, r, o, f) => ({
		modifiers: l,
		hasImportantModifier: i,
		baseClassName: r,
		maybePostfixModifierPosition: o,
		isExternal: f,
	}),
	ew = (l) => {
		const { prefix: i, experimentalParseClassName: r } = l;
		let o = (f) => {
			const d = [];
			let m = 0,
				v = 0,
				y = 0,
				g;
			const S = f.length;
			for (let j = 0; j < S; j++) {
				const N = f[j];
				if (m === 0 && v === 0) {
					if (N === Qg) {
						d.push(f.slice(y, j)), (y = j + 1);
						continue;
					}
					if (N === "/") {
						g = j;
						continue;
					}
				}
				N === "[" ? m++ : N === "]" ? m-- : N === "(" ? v++ : N === ")" && v--;
			}
			const h = d.length === 0 ? f : f.slice(y);
			let w = h,
				E = !1;
			h.endsWith(Of)
				? ((w = h.slice(0, -1)), (E = !0))
				: h.startsWith(Of) && ((w = h.slice(1)), (E = !0));
			const C = g && g > y ? g - y : void 0;
			return Pg(d, E, w, C);
		};
		if (i) {
			const f = i + Qg,
				d = o;
			o = (m) =>
				m.startsWith(f) ? d(m.slice(f.length)) : Pg(W2, !1, m, void 0, !0);
		}
		if (r) {
			const f = o;
			o = (d) => r({ className: d, parseClassName: f });
		}
		return o;
	},
	tw = (l) => {
		const i = new Map();
		return (
			l.orderSensitiveModifiers.forEach((r, o) => {
				i.set(r, 1e6 + o);
			}),
			(r) => {
				const o = [];
				let f = [];
				for (let d = 0; d < r.length; d++) {
					const m = r[d],
						v = m[0] === "[",
						y = i.has(m);
					v || y
						? (f.length > 0 && (f.sort(), o.push(...f), (f = [])), o.push(m))
						: f.push(m);
				}
				return f.length > 0 && (f.sort(), o.push(...f)), o;
			}
		);
	},
	nw = (l) => ({
		cache: J2(l.cacheSize),
		parseClassName: ew(l),
		sortModifiers: tw(l),
		postfixLookupClassGroupIds: aw(l),
		...q2(l),
	}),
	aw = (l) => {
		const i = Object.create(null),
			r = l.postfixLookupClassGroups;
		if (r) for (let o = 0; o < r.length; o++) i[r[o]] = !0;
		return i;
	},
	lw = /\s+/,
	iw = (l, i) => {
		const {
				parseClassName: r,
				getClassGroupId: o,
				getConflictingClassGroupIds: f,
				sortModifiers: d,
				postfixLookupClassGroupIds: m,
			} = i,
			v = [],
			y = l.trim().split(lw);
		let g = "";
		for (let S = y.length - 1; S >= 0; S -= 1) {
			const h = y[S],
				{
					isExternal: w,
					modifiers: E,
					hasImportantModifier: C,
					baseClassName: j,
					maybePostfixModifierPosition: N,
				} = r(h);
			if (w) {
				g = h + (g.length > 0 ? " " + g : g);
				continue;
			}
			let T = !!N,
				z;
			if (T) {
				const X = j.substring(0, N);
				z = o(X);
				const q = z && m[z] ? o(j) : void 0;
				q && q !== z && ((z = q), (T = !1));
			} else z = o(j);
			if (!z) {
				if (!T) {
					g = h + (g.length > 0 ? " " + g : g);
					continue;
				}
				if (((z = o(j)), !z)) {
					g = h + (g.length > 0 ? " " + g : g);
					continue;
				}
				T = !1;
			}
			const R = E.length === 0 ? "" : E.length === 1 ? E[0] : d(E).join(":"),
				O = C ? R + Of : R,
				L = O + z;
			if (v.indexOf(L) > -1) continue;
			v.push(L);
			const Y = f(z, T);
			for (let X = 0; X < Y.length; ++X) {
				const q = Y[X];
				v.push(O + q);
			}
			g = h + (g.length > 0 ? " " + g : g);
		}
		return g;
	},
	rw = (...l) => {
		let i = 0,
			r,
			o,
			f = "";
		for (; i < l.length; )
			(r = l[i++]) && (o = Kv(r)) && (f && (f += " "), (f += o));
		return f;
	},
	Kv = (l) => {
		if (typeof l == "string") return l;
		let i,
			r = "";
		for (let o = 0; o < l.length; o++)
			l[o] && (i = Kv(l[o])) && (r && (r += " "), (r += i));
		return r;
	},
	ow = (l, ...i) => {
		let r, o, f, d;
		const m = (y) => {
				const g = i.reduce((S, h) => h(S), l());
				return (r = nw(g)), (o = r.cache.get), (f = r.cache.set), (d = v), v(y);
			},
			v = (y) => {
				const g = o(y);
				if (g) return g;
				const S = iw(y, r);
				return f(y, S), S;
			};
		return (d = m), (...y) => d(rw(...y));
	},
	sw = [],
	bt = (l) => {
		const i = (r) => r[l] || sw;
		return (i.isThemeGetter = !0), i;
	},
	Zv = /^\[(?:(\w[\w-]*):)?(.+)\]$/i,
	$v = /^\((?:(\w[\w-]*):)?(.+)\)$/i,
	cw = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/,
	uw = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
	fw =
		/\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
	dw = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,
	mw = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
	hw =
		/^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
	Za = (l) => cw.test(l),
	_e = (l) => !!l && !Number.isNaN(Number(l)),
	Bn = (l) => !!l && Number.isInteger(Number(l)),
	gf = (l) => l.endsWith("%") && _e(l.slice(0, -1)),
	ua = (l) => uw.test(l),
	Fv = () => !0,
	pw = (l) => fw.test(l) && !dw.test(l),
	ed = () => !1,
	gw = (l) => mw.test(l),
	vw = (l) => hw.test(l),
	yw = (l) => !de(l) && !me(l),
	xw = (l) =>
		l.startsWith("@container") &&
		((l[10] === "/" && l[11] !== void 0) ||
			(l[11] === "s" && l[16] !== void 0 && l.startsWith("-size/", 10)) ||
			(l[11] === "n" && l[18] !== void 0 && l.startsWith("-normal/", 10))),
	bw = (l) => rl(l, e0, ed),
	de = (l) => Zv.test(l),
	Dl = (l) => rl(l, t0, pw),
	Ig = (l) => rl(l, _w, _e),
	Sw = (l) => rl(l, a0, Fv),
	ww = (l) => rl(l, n0, ed),
	Kg = (l) => rl(l, Jv, ed),
	Ew = (l) => rl(l, Wv, vw),
	xs = (l) => rl(l, l0, gw),
	me = (l) => $v.test(l),
	Ur = (l) => Vl(l, t0),
	Nw = (l) => Vl(l, n0),
	Zg = (l) => Vl(l, Jv),
	Cw = (l) => Vl(l, e0),
	jw = (l) => Vl(l, Wv),
	bs = (l) => Vl(l, l0, !0),
	Tw = (l) => Vl(l, a0, !0),
	rl = (l, i, r) => {
		const o = Zv.exec(l);
		return o ? (o[1] ? i(o[1]) : r(o[2])) : !1;
	},
	Vl = (l, i, r = !1) => {
		const o = $v.exec(l);
		return o ? (o[1] ? i(o[1]) : r) : !1;
	},
	Jv = (l) => l === "position" || l === "percentage",
	Wv = (l) => l === "image" || l === "url",
	e0 = (l) => l === "length" || l === "size" || l === "bg-size",
	t0 = (l) => l === "length",
	_w = (l) => l === "number",
	n0 = (l) => l === "family-name",
	a0 = (l) => l === "number" || l === "weight",
	l0 = (l) => l === "shadow",
	Aw = () => {
		const l = bt("color"),
			i = bt("font"),
			r = bt("text"),
			o = bt("font-weight"),
			f = bt("tracking"),
			d = bt("leading"),
			m = bt("breakpoint"),
			v = bt("container"),
			y = bt("spacing"),
			g = bt("radius"),
			S = bt("shadow"),
			h = bt("inset-shadow"),
			w = bt("text-shadow"),
			E = bt("drop-shadow"),
			C = bt("blur"),
			j = bt("perspective"),
			N = bt("aspect"),
			T = bt("ease"),
			z = bt("animate"),
			R = () => [
				"auto",
				"avoid",
				"all",
				"avoid-page",
				"page",
				"left",
				"right",
				"column",
			],
			O = () => [
				"center",
				"top",
				"bottom",
				"left",
				"right",
				"top-left",
				"left-top",
				"top-right",
				"right-top",
				"bottom-right",
				"right-bottom",
				"bottom-left",
				"left-bottom",
			],
			L = () => [...O(), me, de],
			Y = () => ["auto", "hidden", "clip", "visible", "scroll"],
			X = () => ["auto", "contain", "none"],
			q = () => [me, de, y],
			J = () => [Za, "full", "auto", ...q()],
			ee = () => [Bn, "none", "subgrid", me, de],
			ce = () => ["auto", { span: ["full", Bn, me, de] }, Bn, me, de],
			te = () => [Bn, "auto", me, de],
			se = () => ["auto", "min", "max", "fr", me, de],
			le = () => [
				"start",
				"end",
				"center",
				"between",
				"around",
				"evenly",
				"stretch",
				"baseline",
				"center-safe",
				"end-safe",
			],
			ue = () => [
				"start",
				"end",
				"center",
				"stretch",
				"center-safe",
				"end-safe",
			],
			M = () => ["auto", ...q()],
			H = () => [
				Za,
				"auto",
				"full",
				"dvw",
				"dvh",
				"lvw",
				"lvh",
				"svw",
				"svh",
				"min",
				"max",
				"fit",
				...q(),
			],
			Z = () => [
				Za,
				"screen",
				"full",
				"dvw",
				"lvw",
				"svw",
				"min",
				"max",
				"fit",
				...q(),
			],
			re = () => [
				Za,
				"screen",
				"full",
				"lh",
				"dvh",
				"lvh",
				"svh",
				"min",
				"max",
				"fit",
				...q(),
			],
			F = () => [l, me, de],
			A = () => [...O(), Zg, Kg, { position: [me, de] }],
			G = () => ["no-repeat", { repeat: ["", "x", "y", "space", "round"] }],
			W = () => ["auto", "cover", "contain", Cw, bw, { size: [me, de] }],
			$ = () => [gf, Ur, Dl],
			ne = () => ["", "none", "full", g, me, de],
			oe = () => ["", _e, Ur, Dl],
			ge = () => ["solid", "dashed", "dotted", "double"],
			fe = () => [
				"normal",
				"multiply",
				"screen",
				"overlay",
				"darken",
				"lighten",
				"color-dodge",
				"color-burn",
				"hard-light",
				"soft-light",
				"difference",
				"exclusion",
				"hue",
				"saturation",
				"color",
				"luminosity",
			],
			ae = () => [_e, gf, Zg, Kg],
			Ve = () => ["", "none", C, me, de],
			Ce = () => ["none", _e, me, de],
			xe = () => ["none", _e, me, de],
			je = () => [_e, me, de],
			Ke = () => [Za, "full", ...q()];
		return {
			cacheSize: 500,
			theme: {
				animate: ["spin", "ping", "pulse", "bounce"],
				aspect: ["video"],
				blur: [ua],
				breakpoint: [ua],
				color: [Fv],
				container: [ua],
				"drop-shadow": [ua],
				ease: ["in", "out", "in-out"],
				font: [yw],
				"font-weight": [
					"thin",
					"extralight",
					"light",
					"normal",
					"medium",
					"semibold",
					"bold",
					"extrabold",
					"black",
				],
				"inset-shadow": [ua],
				leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
				perspective: [
					"dramatic",
					"near",
					"normal",
					"midrange",
					"distant",
					"none",
				],
				radius: [ua],
				shadow: [ua],
				spacing: ["px", _e],
				text: [ua],
				"text-shadow": [ua],
				tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"],
			},
			classGroups: {
				aspect: [{ aspect: ["auto", "square", Za, de, me, N] }],
				container: ["container"],
				"container-type": [{ "@container": ["", "normal", "size", me, de] }],
				"container-named": [xw],
				columns: [{ columns: [_e, de, me, v] }],
				"break-after": [{ "break-after": R() }],
				"break-before": [{ "break-before": R() }],
				"break-inside": [
					{ "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"] },
				],
				"box-decoration": [{ "box-decoration": ["slice", "clone"] }],
				box: [{ box: ["border", "content"] }],
				display: [
					"block",
					"inline-block",
					"inline",
					"flex",
					"inline-flex",
					"table",
					"inline-table",
					"table-caption",
					"table-cell",
					"table-column",
					"table-column-group",
					"table-footer-group",
					"table-header-group",
					"table-row-group",
					"table-row",
					"flow-root",
					"grid",
					"inline-grid",
					"contents",
					"list-item",
					"hidden",
				],
				sr: ["sr-only", "not-sr-only"],
				float: [{ float: ["right", "left", "none", "start", "end"] }],
				clear: [{ clear: ["left", "right", "both", "none", "start", "end"] }],
				isolation: ["isolate", "isolation-auto"],
				"object-fit": [
					{ object: ["contain", "cover", "fill", "none", "scale-down"] },
				],
				"object-position": [{ object: L() }],
				overflow: [{ overflow: Y() }],
				"overflow-x": [{ "overflow-x": Y() }],
				"overflow-y": [{ "overflow-y": Y() }],
				overscroll: [{ overscroll: X() }],
				"overscroll-x": [{ "overscroll-x": X() }],
				"overscroll-y": [{ "overscroll-y": X() }],
				position: ["static", "fixed", "absolute", "relative", "sticky"],
				inset: [{ inset: J() }],
				"inset-x": [{ "inset-x": J() }],
				"inset-y": [{ "inset-y": J() }],
				start: [{ "inset-s": J(), start: J() }],
				end: [{ "inset-e": J(), end: J() }],
				"inset-bs": [{ "inset-bs": J() }],
				"inset-be": [{ "inset-be": J() }],
				top: [{ top: J() }],
				right: [{ right: J() }],
				bottom: [{ bottom: J() }],
				left: [{ left: J() }],
				visibility: ["visible", "invisible", "collapse"],
				z: [{ z: [Bn, "auto", me, de] }],
				basis: [{ basis: [Za, "full", "auto", v, ...q()] }],
				"flex-direction": [
					{ flex: ["row", "row-reverse", "col", "col-reverse"] },
				],
				"flex-wrap": [{ flex: ["nowrap", "wrap", "wrap-reverse"] }],
				flex: [{ flex: [_e, Za, "auto", "initial", "none", de] }],
				grow: [{ grow: ["", _e, me, de] }],
				shrink: [{ shrink: ["", _e, me, de] }],
				order: [{ order: [Bn, "first", "last", "none", me, de] }],
				"grid-cols": [{ "grid-cols": ee() }],
				"col-start-end": [{ col: ce() }],
				"col-start": [{ "col-start": te() }],
				"col-end": [{ "col-end": te() }],
				"grid-rows": [{ "grid-rows": ee() }],
				"row-start-end": [{ row: ce() }],
				"row-start": [{ "row-start": te() }],
				"row-end": [{ "row-end": te() }],
				"grid-flow": [
					{ "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"] },
				],
				"auto-cols": [{ "auto-cols": se() }],
				"auto-rows": [{ "auto-rows": se() }],
				gap: [{ gap: q() }],
				"gap-x": [{ "gap-x": q() }],
				"gap-y": [{ "gap-y": q() }],
				"justify-content": [{ justify: [...le(), "normal"] }],
				"justify-items": [{ "justify-items": [...ue(), "normal"] }],
				"justify-self": [{ "justify-self": ["auto", ...ue()] }],
				"align-content": [{ content: ["normal", ...le()] }],
				"align-items": [{ items: [...ue(), { baseline: ["", "last"] }] }],
				"align-self": [{ self: ["auto", ...ue(), { baseline: ["", "last"] }] }],
				"place-content": [{ "place-content": le() }],
				"place-items": [{ "place-items": [...ue(), "baseline"] }],
				"place-self": [{ "place-self": ["auto", ...ue()] }],
				p: [{ p: q() }],
				px: [{ px: q() }],
				py: [{ py: q() }],
				ps: [{ ps: q() }],
				pe: [{ pe: q() }],
				pbs: [{ pbs: q() }],
				pbe: [{ pbe: q() }],
				pt: [{ pt: q() }],
				pr: [{ pr: q() }],
				pb: [{ pb: q() }],
				pl: [{ pl: q() }],
				m: [{ m: M() }],
				mx: [{ mx: M() }],
				my: [{ my: M() }],
				ms: [{ ms: M() }],
				me: [{ me: M() }],
				mbs: [{ mbs: M() }],
				mbe: [{ mbe: M() }],
				mt: [{ mt: M() }],
				mr: [{ mr: M() }],
				mb: [{ mb: M() }],
				ml: [{ ml: M() }],
				"space-x": [{ "space-x": q() }],
				"space-x-reverse": ["space-x-reverse"],
				"space-y": [{ "space-y": q() }],
				"space-y-reverse": ["space-y-reverse"],
				size: [{ size: H() }],
				"inline-size": [{ inline: ["auto", ...Z()] }],
				"min-inline-size": [{ "min-inline": ["auto", ...Z()] }],
				"max-inline-size": [{ "max-inline": ["none", ...Z()] }],
				"block-size": [{ block: ["auto", ...re()] }],
				"min-block-size": [{ "min-block": ["auto", ...re()] }],
				"max-block-size": [{ "max-block": ["none", ...re()] }],
				w: [{ w: [v, "screen", ...H()] }],
				"min-w": [{ "min-w": [v, "screen", "none", ...H()] }],
				"max-w": [
					{ "max-w": [v, "screen", "none", "prose", { screen: [m] }, ...H()] },
				],
				h: [{ h: ["screen", "lh", ...H()] }],
				"min-h": [{ "min-h": ["screen", "lh", "none", ...H()] }],
				"max-h": [{ "max-h": ["screen", "lh", ...H()] }],
				"font-size": [{ text: ["base", r, Ur, Dl] }],
				"font-smoothing": ["antialiased", "subpixel-antialiased"],
				"font-style": ["italic", "not-italic"],
				"font-weight": [{ font: [o, Tw, Sw] }],
				"font-stretch": [
					{
						"font-stretch": [
							"ultra-condensed",
							"extra-condensed",
							"condensed",
							"semi-condensed",
							"normal",
							"semi-expanded",
							"expanded",
							"extra-expanded",
							"ultra-expanded",
							gf,
							de,
						],
					},
				],
				"font-family": [{ font: [Nw, ww, i] }],
				"font-features": [{ "font-features": [de] }],
				"fvn-normal": ["normal-nums"],
				"fvn-ordinal": ["ordinal"],
				"fvn-slashed-zero": ["slashed-zero"],
				"fvn-figure": ["lining-nums", "oldstyle-nums"],
				"fvn-spacing": ["proportional-nums", "tabular-nums"],
				"fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
				tracking: [{ tracking: [f, me, de] }],
				"line-clamp": [{ "line-clamp": [_e, "none", me, Ig] }],
				leading: [{ leading: [d, ...q()] }],
				"list-image": [{ "list-image": ["none", me, de] }],
				"list-style-position": [{ list: ["inside", "outside"] }],
				"list-style-type": [{ list: ["disc", "decimal", "none", me, de] }],
				"text-alignment": [
					{ text: ["left", "center", "right", "justify", "start", "end"] },
				],
				"placeholder-color": [{ placeholder: F() }],
				"text-color": [{ text: F() }],
				"text-decoration": [
					"underline",
					"overline",
					"line-through",
					"no-underline",
				],
				"text-decoration-style": [{ decoration: [...ge(), "wavy"] }],
				"text-decoration-thickness": [
					{ decoration: [_e, "from-font", "auto", me, Dl] },
				],
				"text-decoration-color": [{ decoration: F() }],
				"underline-offset": [{ "underline-offset": [_e, "auto", me, de] }],
				"text-transform": [
					"uppercase",
					"lowercase",
					"capitalize",
					"normal-case",
				],
				"text-overflow": ["truncate", "text-ellipsis", "text-clip"],
				"text-wrap": [{ text: ["wrap", "nowrap", "balance", "pretty"] }],
				indent: [{ indent: q() }],
				"tab-size": [{ tab: [Bn, me, de] }],
				"vertical-align": [
					{
						align: [
							"baseline",
							"top",
							"middle",
							"bottom",
							"text-top",
							"text-bottom",
							"sub",
							"super",
							me,
							de,
						],
					},
				],
				whitespace: [
					{
						whitespace: [
							"normal",
							"nowrap",
							"pre",
							"pre-line",
							"pre-wrap",
							"break-spaces",
						],
					},
				],
				break: [{ break: ["normal", "words", "all", "keep"] }],
				wrap: [{ wrap: ["break-word", "anywhere", "normal"] }],
				hyphens: [{ hyphens: ["none", "manual", "auto"] }],
				content: [{ content: ["none", me, de] }],
				"bg-attachment": [{ bg: ["fixed", "local", "scroll"] }],
				"bg-clip": [{ "bg-clip": ["border", "padding", "content", "text"] }],
				"bg-origin": [{ "bg-origin": ["border", "padding", "content"] }],
				"bg-position": [{ bg: A() }],
				"bg-repeat": [{ bg: G() }],
				"bg-size": [{ bg: W() }],
				"bg-image": [
					{
						bg: [
							"none",
							{
								linear: [
									{ to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"] },
									Bn,
									me,
									de,
								],
								radial: ["", me, de],
								conic: [Bn, me, de],
							},
							jw,
							Ew,
						],
					},
				],
				"bg-color": [{ bg: F() }],
				"gradient-from-pos": [{ from: $() }],
				"gradient-via-pos": [{ via: $() }],
				"gradient-to-pos": [{ to: $() }],
				"gradient-from": [{ from: F() }],
				"gradient-via": [{ via: F() }],
				"gradient-to": [{ to: F() }],
				rounded: [{ rounded: ne() }],
				"rounded-s": [{ "rounded-s": ne() }],
				"rounded-e": [{ "rounded-e": ne() }],
				"rounded-t": [{ "rounded-t": ne() }],
				"rounded-r": [{ "rounded-r": ne() }],
				"rounded-b": [{ "rounded-b": ne() }],
				"rounded-l": [{ "rounded-l": ne() }],
				"rounded-ss": [{ "rounded-ss": ne() }],
				"rounded-se": [{ "rounded-se": ne() }],
				"rounded-ee": [{ "rounded-ee": ne() }],
				"rounded-es": [{ "rounded-es": ne() }],
				"rounded-tl": [{ "rounded-tl": ne() }],
				"rounded-tr": [{ "rounded-tr": ne() }],
				"rounded-br": [{ "rounded-br": ne() }],
				"rounded-bl": [{ "rounded-bl": ne() }],
				"border-w": [{ border: oe() }],
				"border-w-x": [{ "border-x": oe() }],
				"border-w-y": [{ "border-y": oe() }],
				"border-w-s": [{ "border-s": oe() }],
				"border-w-e": [{ "border-e": oe() }],
				"border-w-bs": [{ "border-bs": oe() }],
				"border-w-be": [{ "border-be": oe() }],
				"border-w-t": [{ "border-t": oe() }],
				"border-w-r": [{ "border-r": oe() }],
				"border-w-b": [{ "border-b": oe() }],
				"border-w-l": [{ "border-l": oe() }],
				"divide-x": [{ "divide-x": oe() }],
				"divide-x-reverse": ["divide-x-reverse"],
				"divide-y": [{ "divide-y": oe() }],
				"divide-y-reverse": ["divide-y-reverse"],
				"border-style": [{ border: [...ge(), "hidden", "none"] }],
				"divide-style": [{ divide: [...ge(), "hidden", "none"] }],
				"border-color": [{ border: F() }],
				"border-color-x": [{ "border-x": F() }],
				"border-color-y": [{ "border-y": F() }],
				"border-color-s": [{ "border-s": F() }],
				"border-color-e": [{ "border-e": F() }],
				"border-color-bs": [{ "border-bs": F() }],
				"border-color-be": [{ "border-be": F() }],
				"border-color-t": [{ "border-t": F() }],
				"border-color-r": [{ "border-r": F() }],
				"border-color-b": [{ "border-b": F() }],
				"border-color-l": [{ "border-l": F() }],
				"divide-color": [{ divide: F() }],
				"outline-style": [{ outline: [...ge(), "none", "hidden"] }],
				"outline-offset": [{ "outline-offset": [_e, me, de] }],
				"outline-w": [{ outline: ["", _e, Ur, Dl] }],
				"outline-color": [{ outline: F() }],
				shadow: [{ shadow: ["", "none", S, bs, xs] }],
				"shadow-color": [{ shadow: F() }],
				"inset-shadow": [{ "inset-shadow": ["none", h, bs, xs] }],
				"inset-shadow-color": [{ "inset-shadow": F() }],
				"ring-w": [{ ring: oe() }],
				"ring-w-inset": ["ring-inset"],
				"ring-color": [{ ring: F() }],
				"ring-offset-w": [{ "ring-offset": [_e, Dl] }],
				"ring-offset-color": [{ "ring-offset": F() }],
				"inset-ring-w": [{ "inset-ring": oe() }],
				"inset-ring-color": [{ "inset-ring": F() }],
				"text-shadow": [{ "text-shadow": ["none", w, bs, xs] }],
				"text-shadow-color": [{ "text-shadow": F() }],
				opacity: [{ opacity: [_e, me, de] }],
				"mix-blend": [
					{ "mix-blend": [...fe(), "plus-darker", "plus-lighter"] },
				],
				"bg-blend": [{ "bg-blend": fe() }],
				"mask-clip": [
					{
						"mask-clip": [
							"border",
							"padding",
							"content",
							"fill",
							"stroke",
							"view",
						],
					},
					"mask-no-clip",
				],
				"mask-composite": [
					{ mask: ["add", "subtract", "intersect", "exclude"] },
				],
				"mask-image-linear-pos": [{ "mask-linear": [_e] }],
				"mask-image-linear-from-pos": [{ "mask-linear-from": ae() }],
				"mask-image-linear-to-pos": [{ "mask-linear-to": ae() }],
				"mask-image-linear-from-color": [{ "mask-linear-from": F() }],
				"mask-image-linear-to-color": [{ "mask-linear-to": F() }],
				"mask-image-t-from-pos": [{ "mask-t-from": ae() }],
				"mask-image-t-to-pos": [{ "mask-t-to": ae() }],
				"mask-image-t-from-color": [{ "mask-t-from": F() }],
				"mask-image-t-to-color": [{ "mask-t-to": F() }],
				"mask-image-r-from-pos": [{ "mask-r-from": ae() }],
				"mask-image-r-to-pos": [{ "mask-r-to": ae() }],
				"mask-image-r-from-color": [{ "mask-r-from": F() }],
				"mask-image-r-to-color": [{ "mask-r-to": F() }],
				"mask-image-b-from-pos": [{ "mask-b-from": ae() }],
				"mask-image-b-to-pos": [{ "mask-b-to": ae() }],
				"mask-image-b-from-color": [{ "mask-b-from": F() }],
				"mask-image-b-to-color": [{ "mask-b-to": F() }],
				"mask-image-l-from-pos": [{ "mask-l-from": ae() }],
				"mask-image-l-to-pos": [{ "mask-l-to": ae() }],
				"mask-image-l-from-color": [{ "mask-l-from": F() }],
				"mask-image-l-to-color": [{ "mask-l-to": F() }],
				"mask-image-x-from-pos": [{ "mask-x-from": ae() }],
				"mask-image-x-to-pos": [{ "mask-x-to": ae() }],
				"mask-image-x-from-color": [{ "mask-x-from": F() }],
				"mask-image-x-to-color": [{ "mask-x-to": F() }],
				"mask-image-y-from-pos": [{ "mask-y-from": ae() }],
				"mask-image-y-to-pos": [{ "mask-y-to": ae() }],
				"mask-image-y-from-color": [{ "mask-y-from": F() }],
				"mask-image-y-to-color": [{ "mask-y-to": F() }],
				"mask-image-radial": [{ "mask-radial": [me, de] }],
				"mask-image-radial-from-pos": [{ "mask-radial-from": ae() }],
				"mask-image-radial-to-pos": [{ "mask-radial-to": ae() }],
				"mask-image-radial-from-color": [{ "mask-radial-from": F() }],
				"mask-image-radial-to-color": [{ "mask-radial-to": F() }],
				"mask-image-radial-shape": [{ "mask-radial": ["circle", "ellipse"] }],
				"mask-image-radial-size": [
					{
						"mask-radial": [
							{ closest: ["side", "corner"], farthest: ["side", "corner"] },
						],
					},
				],
				"mask-image-radial-pos": [{ "mask-radial-at": O() }],
				"mask-image-conic-pos": [{ "mask-conic": [_e] }],
				"mask-image-conic-from-pos": [{ "mask-conic-from": ae() }],
				"mask-image-conic-to-pos": [{ "mask-conic-to": ae() }],
				"mask-image-conic-from-color": [{ "mask-conic-from": F() }],
				"mask-image-conic-to-color": [{ "mask-conic-to": F() }],
				"mask-mode": [{ mask: ["alpha", "luminance", "match"] }],
				"mask-origin": [
					{
						"mask-origin": [
							"border",
							"padding",
							"content",
							"fill",
							"stroke",
							"view",
						],
					},
				],
				"mask-position": [{ mask: A() }],
				"mask-repeat": [{ mask: G() }],
				"mask-size": [{ mask: W() }],
				"mask-type": [{ "mask-type": ["alpha", "luminance"] }],
				"mask-image": [{ mask: ["none", me, de] }],
				filter: [{ filter: ["", "none", me, de] }],
				blur: [{ blur: Ve() }],
				brightness: [{ brightness: [_e, me, de] }],
				contrast: [{ contrast: [_e, me, de] }],
				"drop-shadow": [{ "drop-shadow": ["", "none", E, bs, xs] }],
				"drop-shadow-color": [{ "drop-shadow": F() }],
				grayscale: [{ grayscale: ["", _e, me, de] }],
				"hue-rotate": [{ "hue-rotate": [_e, me, de] }],
				invert: [{ invert: ["", _e, me, de] }],
				saturate: [{ saturate: [_e, me, de] }],
				sepia: [{ sepia: ["", _e, me, de] }],
				"backdrop-filter": [{ "backdrop-filter": ["", "none", me, de] }],
				"backdrop-blur": [{ "backdrop-blur": Ve() }],
				"backdrop-brightness": [{ "backdrop-brightness": [_e, me, de] }],
				"backdrop-contrast": [{ "backdrop-contrast": [_e, me, de] }],
				"backdrop-grayscale": [{ "backdrop-grayscale": ["", _e, me, de] }],
				"backdrop-hue-rotate": [{ "backdrop-hue-rotate": [_e, me, de] }],
				"backdrop-invert": [{ "backdrop-invert": ["", _e, me, de] }],
				"backdrop-opacity": [{ "backdrop-opacity": [_e, me, de] }],
				"backdrop-saturate": [{ "backdrop-saturate": [_e, me, de] }],
				"backdrop-sepia": [{ "backdrop-sepia": ["", _e, me, de] }],
				"border-collapse": [{ border: ["collapse", "separate"] }],
				"border-spacing": [{ "border-spacing": q() }],
				"border-spacing-x": [{ "border-spacing-x": q() }],
				"border-spacing-y": [{ "border-spacing-y": q() }],
				"table-layout": [{ table: ["auto", "fixed"] }],
				caption: [{ caption: ["top", "bottom"] }],
				transition: [
					{
						transition: [
							"",
							"all",
							"colors",
							"opacity",
							"shadow",
							"transform",
							"none",
							me,
							de,
						],
					},
				],
				"transition-behavior": [{ transition: ["normal", "discrete"] }],
				duration: [{ duration: [_e, "initial", me, de] }],
				ease: [{ ease: ["linear", "initial", T, me, de] }],
				delay: [{ delay: [_e, me, de] }],
				animate: [{ animate: ["none", z, me, de] }],
				backface: [{ backface: ["hidden", "visible"] }],
				perspective: [{ perspective: [j, me, de] }],
				"perspective-origin": [{ "perspective-origin": L() }],
				rotate: [{ rotate: Ce() }],
				"rotate-x": [{ "rotate-x": Ce() }],
				"rotate-y": [{ "rotate-y": Ce() }],
				"rotate-z": [{ "rotate-z": Ce() }],
				scale: [{ scale: xe() }],
				"scale-x": [{ "scale-x": xe() }],
				"scale-y": [{ "scale-y": xe() }],
				"scale-z": [{ "scale-z": xe() }],
				"scale-3d": ["scale-3d"],
				skew: [{ skew: je() }],
				"skew-x": [{ "skew-x": je() }],
				"skew-y": [{ "skew-y": je() }],
				transform: [{ transform: [me, de, "", "none", "gpu", "cpu"] }],
				"transform-origin": [{ origin: L() }],
				"transform-style": [{ transform: ["3d", "flat"] }],
				translate: [{ translate: Ke() }],
				"translate-x": [{ "translate-x": Ke() }],
				"translate-y": [{ "translate-y": Ke() }],
				"translate-z": [{ "translate-z": Ke() }],
				"translate-none": ["translate-none"],
				zoom: [{ zoom: [Bn, me, de] }],
				accent: [{ accent: F() }],
				appearance: [{ appearance: ["none", "auto"] }],
				"caret-color": [{ caret: F() }],
				"color-scheme": [
					{
						scheme: [
							"normal",
							"dark",
							"light",
							"light-dark",
							"only-dark",
							"only-light",
						],
					},
				],
				cursor: [
					{
						cursor: [
							"auto",
							"default",
							"pointer",
							"wait",
							"text",
							"move",
							"help",
							"not-allowed",
							"none",
							"context-menu",
							"progress",
							"cell",
							"crosshair",
							"vertical-text",
							"alias",
							"copy",
							"no-drop",
							"grab",
							"grabbing",
							"all-scroll",
							"col-resize",
							"row-resize",
							"n-resize",
							"e-resize",
							"s-resize",
							"w-resize",
							"ne-resize",
							"nw-resize",
							"se-resize",
							"sw-resize",
							"ew-resize",
							"ns-resize",
							"nesw-resize",
							"nwse-resize",
							"zoom-in",
							"zoom-out",
							me,
							de,
						],
					},
				],
				"field-sizing": [{ "field-sizing": ["fixed", "content"] }],
				"pointer-events": [{ "pointer-events": ["auto", "none"] }],
				resize: [{ resize: ["none", "", "y", "x"] }],
				"scroll-behavior": [{ scroll: ["auto", "smooth"] }],
				"scrollbar-thumb-color": [{ "scrollbar-thumb": F() }],
				"scrollbar-track-color": [{ "scrollbar-track": F() }],
				"scrollbar-gutter": [
					{ "scrollbar-gutter": ["auto", "stable", "both"] },
				],
				"scrollbar-w": [{ scrollbar: ["auto", "thin", "none"] }],
				"scroll-m": [{ "scroll-m": q() }],
				"scroll-mx": [{ "scroll-mx": q() }],
				"scroll-my": [{ "scroll-my": q() }],
				"scroll-ms": [{ "scroll-ms": q() }],
				"scroll-me": [{ "scroll-me": q() }],
				"scroll-mbs": [{ "scroll-mbs": q() }],
				"scroll-mbe": [{ "scroll-mbe": q() }],
				"scroll-mt": [{ "scroll-mt": q() }],
				"scroll-mr": [{ "scroll-mr": q() }],
				"scroll-mb": [{ "scroll-mb": q() }],
				"scroll-ml": [{ "scroll-ml": q() }],
				"scroll-p": [{ "scroll-p": q() }],
				"scroll-px": [{ "scroll-px": q() }],
				"scroll-py": [{ "scroll-py": q() }],
				"scroll-ps": [{ "scroll-ps": q() }],
				"scroll-pe": [{ "scroll-pe": q() }],
				"scroll-pbs": [{ "scroll-pbs": q() }],
				"scroll-pbe": [{ "scroll-pbe": q() }],
				"scroll-pt": [{ "scroll-pt": q() }],
				"scroll-pr": [{ "scroll-pr": q() }],
				"scroll-pb": [{ "scroll-pb": q() }],
				"scroll-pl": [{ "scroll-pl": q() }],
				"snap-align": [{ snap: ["start", "end", "center", "align-none"] }],
				"snap-stop": [{ snap: ["normal", "always"] }],
				"snap-type": [{ snap: ["none", "x", "y", "both"] }],
				"snap-strictness": [{ snap: ["mandatory", "proximity"] }],
				touch: [{ touch: ["auto", "none", "manipulation"] }],
				"touch-x": [{ "touch-pan": ["x", "left", "right"] }],
				"touch-y": [{ "touch-pan": ["y", "up", "down"] }],
				"touch-pz": ["touch-pinch-zoom"],
				select: [{ select: ["none", "text", "all", "auto"] }],
				"will-change": [
					{
						"will-change": ["auto", "scroll", "contents", "transform", me, de],
					},
				],
				fill: [{ fill: ["none", ...F()] }],
				"stroke-w": [{ stroke: [_e, Ur, Dl, Ig] }],
				stroke: [{ stroke: ["none", ...F()] }],
				"forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }],
			},
			conflictingClassGroups: {
				"container-named": ["container-type"],
				overflow: ["overflow-x", "overflow-y"],
				overscroll: ["overscroll-x", "overscroll-y"],
				inset: [
					"inset-x",
					"inset-y",
					"inset-bs",
					"inset-be",
					"start",
					"end",
					"top",
					"right",
					"bottom",
					"left",
				],
				"inset-x": ["right", "left"],
				"inset-y": ["top", "bottom"],
				flex: ["basis", "grow", "shrink"],
				gap: ["gap-x", "gap-y"],
				p: ["px", "py", "ps", "pe", "pbs", "pbe", "pt", "pr", "pb", "pl"],
				px: ["pr", "pl"],
				py: ["pt", "pb"],
				m: ["mx", "my", "ms", "me", "mbs", "mbe", "mt", "mr", "mb", "ml"],
				mx: ["mr", "ml"],
				my: ["mt", "mb"],
				size: ["w", "h"],
				"font-size": ["leading"],
				"fvn-normal": [
					"fvn-ordinal",
					"fvn-slashed-zero",
					"fvn-figure",
					"fvn-spacing",
					"fvn-fraction",
				],
				"fvn-ordinal": ["fvn-normal"],
				"fvn-slashed-zero": ["fvn-normal"],
				"fvn-figure": ["fvn-normal"],
				"fvn-spacing": ["fvn-normal"],
				"fvn-fraction": ["fvn-normal"],
				"line-clamp": ["display", "overflow"],
				rounded: [
					"rounded-s",
					"rounded-e",
					"rounded-t",
					"rounded-r",
					"rounded-b",
					"rounded-l",
					"rounded-ss",
					"rounded-se",
					"rounded-ee",
					"rounded-es",
					"rounded-tl",
					"rounded-tr",
					"rounded-br",
					"rounded-bl",
				],
				"rounded-s": ["rounded-ss", "rounded-es"],
				"rounded-e": ["rounded-se", "rounded-ee"],
				"rounded-t": ["rounded-tl", "rounded-tr"],
				"rounded-r": ["rounded-tr", "rounded-br"],
				"rounded-b": ["rounded-br", "rounded-bl"],
				"rounded-l": ["rounded-tl", "rounded-bl"],
				"border-spacing": ["border-spacing-x", "border-spacing-y"],
				"border-w": [
					"border-w-x",
					"border-w-y",
					"border-w-s",
					"border-w-e",
					"border-w-bs",
					"border-w-be",
					"border-w-t",
					"border-w-r",
					"border-w-b",
					"border-w-l",
				],
				"border-w-x": ["border-w-r", "border-w-l"],
				"border-w-y": ["border-w-t", "border-w-b"],
				"border-color": [
					"border-color-x",
					"border-color-y",
					"border-color-s",
					"border-color-e",
					"border-color-bs",
					"border-color-be",
					"border-color-t",
					"border-color-r",
					"border-color-b",
					"border-color-l",
				],
				"border-color-x": ["border-color-r", "border-color-l"],
				"border-color-y": ["border-color-t", "border-color-b"],
				translate: ["translate-x", "translate-y", "translate-none"],
				"translate-none": [
					"translate",
					"translate-x",
					"translate-y",
					"translate-z",
				],
				"scroll-m": [
					"scroll-mx",
					"scroll-my",
					"scroll-ms",
					"scroll-me",
					"scroll-mbs",
					"scroll-mbe",
					"scroll-mt",
					"scroll-mr",
					"scroll-mb",
					"scroll-ml",
				],
				"scroll-mx": ["scroll-mr", "scroll-ml"],
				"scroll-my": ["scroll-mt", "scroll-mb"],
				"scroll-p": [
					"scroll-px",
					"scroll-py",
					"scroll-ps",
					"scroll-pe",
					"scroll-pbs",
					"scroll-pbe",
					"scroll-pt",
					"scroll-pr",
					"scroll-pb",
					"scroll-pl",
				],
				"scroll-px": ["scroll-pr", "scroll-pl"],
				"scroll-py": ["scroll-pt", "scroll-pb"],
				touch: ["touch-x", "touch-y", "touch-pz"],
				"touch-x": ["touch"],
				"touch-y": ["touch"],
				"touch-pz": ["touch"],
			},
			conflictingClassGroupModifiers: { "font-size": ["leading"] },
			postfixLookupClassGroups: ["container-type"],
			orderSensitiveModifiers: [
				"*",
				"**",
				"after",
				"backdrop",
				"before",
				"details-content",
				"file",
				"first-letter",
				"first-line",
				"marker",
				"placeholder",
				"selection",
			],
		};
	},
	Rw = ow(Aw);
function $e(...l) {
	return Rw(qv(l));
}
function Mw(l = 0) {
	const i = Math.floor(l / 86400),
		r = Math.floor((l % 86400) / 3600),
		o = Math.floor((l % 3600) / 60);
	return i > 0 ? `${i}d ${r}h` : r > 0 ? `${r}h ${o}m` : `${o}m`;
}
function Ow(l = 0) {
	return l < 1024
		? `${l} B`
		: l < 1024 * 1024
			? `${Math.round(l / 1024)} KB`
			: `${(l / (1024 * 1024)).toFixed(1)} MB`;
}
function Dw(l) {
	return new Date(l * 1e3).toLocaleDateString(void 0, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
const zw = Xv(
		"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
		{
			variants: {
				variant: {
					default:
						"bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20",
					destructive:
						"bg-destructive/80 text-destructive-foreground shadow-sm hover:bg-destructive hover:shadow-md hover:shadow-destructive/20",
					outline:
						"border border-input bg-background/50 backdrop-blur-sm shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent",
					secondary:
						"bg-secondary/80 text-secondary-foreground shadow-sm hover:bg-secondary hover:text-white",
					ghost: "hover:bg-accent/60 hover:text-accent-foreground",
					link: "text-primary underline-offset-4 hover:underline",
					glass:
						"bg-white/5 border border-white/10 backdrop-blur-md text-foreground hover:bg-white/10 hover:border-white/20 shadow-sm",
				},
				size: {
					default: "h-9 px-4 py-2",
					sm: "h-8 rounded-md px-3 text-xs",
					lg: "h-10 rounded-lg px-6",
					icon: "h-8 w-8 rounded-md",
				},
			},
			defaultVariants: { variant: "default", size: "default" },
		},
	),
	tt = x.forwardRef(
		({ className: l, variant: i, size: r, asChild: o = !1, ...f }, d) => {
			const m = o ? z2 : "button";
			return u.jsx(m, {
				className: $e(zw({ variant: i, size: r, className: l })),
				ref: d,
				...f,
			});
		},
	);
tt.displayName = "Button";
const Hi = x.forwardRef(({ className: l, type: i, ...r }, o) =>
	u.jsx("input", {
		type: i,
		className: $e(
			"flex h-9 w-full rounded-lg border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
			l,
		),
		ref: o,
		...r,
	}),
);
Hi.displayName = "Input";
const kw = ({
		title: l = "Telegram Access Required",
		message:
			i = "This console is cryptographically protected and is designed to run securely inside Telegram Mini Apps.",
		onRetry: r,
	}) => {
		const [o, f] = x.useState(""),
			[d, m] = x.useState(!1),
			v = () => {
				o.trim() && (localStorage.setItem("ket_dev_init_data", o.trim()), r());
			};
		return u.jsx("div", {
			className:
				"min-h-screen flex items-center justify-center p-4 bg-background selection:bg-primary/20",
			children: u.jsxs("div", {
				className:
					"w-full max-w-md rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300",
				children: [
					u.jsx("div", {
						className:
							"mx-auto w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive",
						children: u.jsx(zv, { className: "w-8 h-8" }),
					}),
					u.jsxs("div", {
						className: "space-y-2",
						children: [
							u.jsx("h2", {
								className:
									"text-xl sm:text-2xl font-bold tracking-tight text-foreground",
								children: l,
							}),
							u.jsx("p", {
								className:
									"text-xs sm:text-sm text-muted-foreground leading-relaxed",
								children: i,
							}),
						],
					}),
					u.jsxs("div", {
						className:
							"rounded-xl border border-border/60 bg-background/50 p-4 text-left space-y-2 text-xs",
						children: [
							u.jsxs("div", {
								className:
									"font-semibold text-foreground flex items-center gap-1.5",
								children: [
									u.jsx("span", {
										className: "w-1.5 h-1.5 rounded-full bg-blue-500",
									}),
									"How to open securely:",
								],
							}),
							u.jsxs("ol", {
								className:
									"list-decimal list-inside space-y-1.5 text-muted-foreground",
								children: [
									u.jsxs("li", {
										children: [
											"Open Telegram and start chat with your ",
											u.jsx("strong", { children: "ket.ai" }),
											" ",
											"bot.",
										],
									}),
									u.jsxs("li", {
										children: [
											"Tap the ",
											u.jsx("strong", { children: "Console" }),
											" menu button or send",
											" ",
											u.jsx("code", { children: "/app" }),
											".",
										],
									}),
									u.jsx("li", {
										children:
											"Your session token will be automatically verified.",
									}),
								],
							}),
						],
					}),
					u.jsxs("div", {
						className: "flex flex-col gap-2",
						children: [
							u.jsxs(tt, {
								onClick: r,
								className: "w-full flex items-center gap-2",
								children: [
									u.jsx(Vr, { className: "w-4 h-4" }),
									u.jsx("span", { children: "Retry Connection" }),
								],
							}),
							u.jsxs(tt, {
								variant: "ghost",
								size: "sm",
								onClick: () => m(!d),
								className:
									"text-xs text-muted-foreground hover:text-foreground",
								children: [
									u.jsx(kv, { className: "w-3.5 h-3.5 mr-1" }),
									d ? "Hide Developer Options" : "Developer Test Session",
								],
							}),
						],
					}),
					d &&
						u.jsxs("div", {
							className:
								"pt-2 border-t border-border/50 text-left space-y-2 animate-in fade-in duration-200",
							children: [
								u.jsx("label", {
									htmlFor: "dev-init-data",
									className: "text-[11px] font-medium text-muted-foreground",
									children:
										"Provide Telegram initData string for local debugging:",
								}),
								u.jsxs("div", {
									className: "flex gap-2",
									children: [
										u.jsx(Hi, {
											id: "dev-init-data",
											placeholder: "query_id=...&user=...",
											value: o,
											onChange: (y) => f(y.target.value),
											className: "text-xs font-mono",
										}),
										u.jsx(tt, {
											size: "sm",
											onClick: v,
											children: u.jsx(Y1, { className: "w-4 h-4" }),
										}),
									],
								}),
							],
						}),
				],
			}),
		});
	},
	Lw = Xv(
		"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
		{
			variants: {
				variant: {
					default:
						"border-transparent bg-primary/20 text-primary hover:bg-primary/30 border-primary/30",
					secondary:
						"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
					destructive:
						"border-transparent bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30",
					outline: "text-foreground border-border",
					success:
						"border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
					warning:
						"border-amber-500/30 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
					profile: "border-blue-500/30 bg-blue-500/15 text-blue-400",
					dynamic: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
					temporary: "border-amber-500/30 bg-amber-500/15 text-amber-400",
					owner:
						"border-purple-500/30 bg-purple-500/15 text-purple-300 font-bold",
					admin:
						"border-blue-500/30 bg-blue-500/15 text-blue-300 font-semibold",
					user: "border-zinc-700 bg-zinc-800 text-zinc-300",
				},
			},
			defaultVariants: { variant: "default" },
		},
	);
function $a({ className: l, variant: i, ...r }) {
	return u.jsx("div", { className: $e(Lw({ variant: i }), l), ...r });
}
const Bw = ({ user: l, role: i, isOnline: r = !0 }) => {
	const o = (d) => {
			switch (d) {
				case "owner":
					return u.jsxs($a, {
						variant: "owner",
						className: "flex items-center gap-1",
						children: [
							u.jsx(iS, { className: "w-3 h-3 text-purple-400" }),
							u.jsx("span", { children: "Owner" }),
						],
					});
				case "admin":
					return u.jsxs($a, {
						variant: "admin",
						className: "flex items-center gap-1",
						children: [
							u.jsx(HS, { className: "w-3 h-3 text-blue-400" }),
							u.jsx("span", { children: "Admin" }),
						],
					});
				default:
					return u.jsxs($a, {
						variant: "user",
						className: "flex items-center gap-1",
						children: [
							u.jsx($S, { className: "w-3 h-3 text-zinc-400" }),
							u.jsx("span", { children: "User" }),
						],
					});
			}
		},
		f = l
			? l.first_name + (l.last_name ? ` ${l.last_name}` : "")
			: "Guest User";
	return u.jsx("header", {
		className: "sticky top-0 z-40 w-full glass-header py-3 px-4 sm:px-6",
		children: u.jsxs("div", {
			className: "max-w-6xl mx-auto flex items-center justify-between",
			children: [
				u.jsxs("div", {
					className: "flex items-center gap-3",
					children: [
						u.jsxs("div", {
							className:
								"relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 shadow-md shadow-blue-500/20 text-white",
							children: [
								u.jsx(_v, { className: "w-5 h-5" }),
								u.jsx("span", {
									className:
										"absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse",
								}),
							],
						}),
						u.jsxs("div", {
							children: [
								u.jsxs("div", {
									className: "flex items-center gap-2",
									children: [
										u.jsx("span", {
											className:
												"font-bold text-base tracking-tight text-white",
											children: "ket.ai",
										}),
										u.jsx("span", {
											className:
												"text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20",
											children: "v7.4",
										}),
									],
								}),
								u.jsxs("div", {
									className:
										"flex items-center gap-1.5 text-[11px] text-muted-foreground",
									children: [
										u.jsx("span", {
											className:
												"inline-block w-1.5 h-1.5 rounded-full bg-emerald-500",
										}),
										u.jsx("span", {
											children: r ? "Server Online" : "Connecting...",
										}),
									],
								}),
							],
						}),
					],
				}),
				u.jsxs("div", {
					className:
						"flex items-center gap-2.5 sm:gap-3 bg-white/5 border border-white/10 rounded-full pl-3 pr-2 py-1 backdrop-blur-md",
					children: [
						u.jsxs("div", {
							className: "flex flex-col items-end",
							children: [
								u.jsx("span", {
									className:
										"text-xs font-semibold text-foreground max-w-[120px] sm:max-w-[160px] truncate",
									children: f,
								}),
								(l == null ? void 0 : l.username) &&
									u.jsxs("span", {
										className: "text-[10px] text-muted-foreground font-mono",
										children: ["@", l.username],
									}),
							],
						}),
						o(i),
					],
				}),
			],
		}),
	});
};
var Uw = Object.defineProperty,
	qi = (l, i) => Uw(l, "name", { value: i, configurable: !0 }),
	i0 = !!(
		typeof window < "u" &&
		window.document &&
		window.document.createElement
	);
function Ne(l, i, { checkForDefaultPrevented: r = !0 } = {}) {
	return qi((f) => {
		if ((l == null || l(f), r === !1 || !f || !f.defaultPrevented))
			return i == null ? void 0 : i(f);
	}, "handleEvent");
}
qi(Ne, "composeEventHandlers");
function Hw(l) {
	var i;
	if (!i0) throw new Error("Cannot access window outside of the DOM");
	return (
		((i = l == null ? void 0 : l.ownerDocument) == null
			? void 0
			: i.defaultView) ?? window
	);
}
qi(Hw, "getOwnerWindow");
function Df(l) {
	if (!i0) throw new Error("Cannot access document outside of the DOM");
	return (l == null ? void 0 : l.ownerDocument) ?? document;
}
qi(Df, "getOwnerDocument");
function r0(l, i = !1) {
	const { activeElement: r } = Df(l);
	if (!(r != null && r.nodeName)) return null;
	if (o0(r) && r.contentDocument) return r0(r.contentDocument.body, i);
	if (i) {
		const o = r.getAttribute("aria-activedescendant");
		if (o) {
			const f = Df(r).getElementById(o);
			if (f) return f;
		}
	}
	return r;
}
qi(r0, "getActiveElement");
function o0(l) {
	return l.tagName === "IFRAME";
}
qi(o0, "isFrame");
var Vw = Object.defineProperty,
	wn = (l, i) => Vw(l, "name", { value: i, configurable: !0 });
function Yw(l, i) {
	const r = x.createContext(i);
	r.displayName = l + "Context";
	const o = wn((d) => {
		const { children: m, ...v } = d,
			y = x.useMemo(() => v, Object.values(v));
		return u.jsx(r.Provider, { value: y, children: m });
	}, "Provider");
	o.displayName = l + "Provider";
	function f(d, m = {}) {
		const { optional: v = !1 } = m,
			y = x.useContext(r);
		if (y) return y;
		if (i !== void 0) return i;
		if (!v) throw new Error(`\`${d}\` must be used within \`${l}\``);
	}
	return wn(f, "useContext"), [o, f];
}
wn(Yw, "createContext");
function qn(l, i = []) {
	let r = [];
	function o(d, m) {
		const v = x.createContext(m);
		v.displayName = d + "Context";
		const y = r.length;
		r = [...r, m];
		const g = wn((h) => {
			var T;
			const { scope: w, children: E, ...C } = h,
				j = ((T = w == null ? void 0 : w[l]) == null ? void 0 : T[y]) || v,
				N = x.useMemo(() => C, Object.values(C));
			return u.jsx(j.Provider, { value: N, children: E });
		}, "Provider");
		g.displayName = d + "Provider";
		function S(h, w, E = {}) {
			var T;
			const { optional: C = !1 } = E,
				j = ((T = w == null ? void 0 : w[l]) == null ? void 0 : T[y]) || v,
				N = x.useContext(j);
			if (N) return N;
			if (m !== void 0) return m;
			if (!C) throw new Error(`\`${h}\` must be used within \`${d}\``);
		}
		return wn(S, "useContext"), [g, S];
	}
	wn(o, "createContext");
	const f = wn(() => {
		const d = r.map((m) => x.createContext(m));
		return wn((v) => {
			const y = (v == null ? void 0 : v[l]) || d;
			return x.useMemo(() => ({ [`__scope${l}`]: { ...v, [l]: y } }), [v, y]);
		}, "useScope");
	}, "createScope");
	return (f.scopeName = l), [o, s0(f, ...i)];
}
wn(qn, "createContextScope");
function s0(...l) {
	const i = l[0];
	if (l.length === 1) return i;
	const r = wn(() => {
		const o = l.map((f) => ({ useScope: f(), scopeName: f.scopeName }));
		return wn((d) => {
			const m = o.reduce((v, { useScope: y, scopeName: g }) => {
				const h = y(d)[`__scope${g}`];
				return { ...v, ...h };
			}, {});
			return x.useMemo(() => ({ [`__scope${i.scopeName}`]: m }), [m]);
		}, "useComposedScopes");
	}, "createScope");
	return (r.scopeName = i.scopeName), r;
}
wn(s0, "composeContextScopes");
var st =
		globalThis != null && globalThis.document ? x.useLayoutEffect : () => {},
	Gw = Object.defineProperty,
	qw = (l, i) => Gw(l, "name", { value: i, configurable: !0 }),
	Xw = Yi[" useId ".trim().toString()] || (() => {}),
	Qw = 0;
function Fa(l) {
	const [i, r] = x.useState(Xw());
	return (
		st(() => {
			l || r((o) => o ?? String(Qw++));
		}, [l]),
		l || (i ? `radix-${i}` : "")
	);
}
qw(Fa, "useId");
var Pw = Object.defineProperty,
	Iw = (l, i) => Pw(l, "name", { value: i, configurable: !0 }),
	$g = Yi[" useEffectEvent ".trim().toString()],
	Fg = Yi[" useInsertionEffect ".trim().toString()];
function c0(l) {
	if (typeof $g == "function") return $g(l);
	const i = x.useRef(() => {
		throw new Error("Cannot call an event handler while rendering.");
	});
	return (
		typeof Fg == "function"
			? Fg(() => {
					i.current = l;
				})
			: st(() => {
					i.current = l;
				}),
		x.useMemo(
			() =>
				(...r) => {
					var o;
					return (o = i.current) == null ? void 0 : o.call(i, ...r);
				},
			[],
		)
	);
}
Iw(c0, "useEffectEvent");
var Kw = Object.defineProperty,
	Ir = (l, i) => Kw(l, "name", { value: i, configurable: !0 }),
	Zw = Yi[" useInsertionEffect ".trim().toString()] || st;
function tl({
	prop: l,
	defaultProp: i,
	onChange: r = Ir(() => {}, "onChange"),
	caller: o,
}) {
	const [f, d, m] = u0({ defaultProp: i, onChange: r }),
		v = l !== void 0,
		y = v ? l : f,
		g = x.useCallback(
			(S) => {
				var h;
				if (v) {
					const w = f0(S) ? S(l) : S;
					w !== l && ((h = m.current) == null || h.call(m, w));
				} else d(S);
			},
			[v, l, d, m],
		);
	return [y, g];
}
Ir(tl, "useControllableState");
function u0({ defaultProp: l, onChange: i }) {
	const [r, o] = x.useState(l),
		f = x.useRef(r),
		d = x.useRef(i);
	return (
		Zw(() => {
			d.current = i;
		}, [i]),
		x.useEffect(() => {
			var m;
			f.current !== r &&
				((m = d.current) == null || m.call(d, r), (f.current = r));
		}, [r, f]),
		[r, o, d]
	);
}
Ir(u0, "useUncontrolledState");
function f0(l) {
	return typeof l == "function";
}
Ir(f0, "isFunction");
var Jg = Symbol("RADIX:SYNC_STATE");
function $w(l, i, r, o) {
	const { prop: f, defaultProp: d, onChange: m, caller: v } = i,
		y = f !== void 0,
		g = c0(m),
		S = [{ ...r, state: d }];
	o && S.push(o);
	const [h, w] = x.useReducer(
			(N, T) => {
				if (T.type === Jg) return { ...N, state: T.state };
				const z = l(N, T);
				return y && !Object.is(z.state, N.state) && g(z.state), z;
			},
			...S,
		),
		E = h.state,
		C = x.useRef(E);
	x.useEffect(() => {
		C.current !== E && ((C.current = E), y || g(E));
	}, [E, C, y]);
	const j = x.useMemo(() => (f !== void 0 ? { ...h, state: f } : h), [h, f]);
	return (
		x.useEffect(() => {
			y && !Object.is(f, h.state) && w({ type: Jg, state: f });
		}, [f, h.state, y]),
		[j, w]
	);
}
Ir($w, "useControllableStateReducer");
var Fw = Object.defineProperty,
	Jw = (l, i) => Fw(l, "name", { value: i, configurable: !0 }),
	Ww = [
		"a",
		"button",
		"div",
		"form",
		"h2",
		"h3",
		"img",
		"input",
		"label",
		"li",
		"nav",
		"ol",
		"p",
		"select",
		"span",
		"svg",
		"ul",
	],
	ke = Ww.reduce((l, i) => {
		const r = ga(`Primitive.${i}`),
			o = x.forwardRef((f, d) => {
				const { asChild: m, ...v } = f,
					y = m ? r : i;
				return (
					typeof window < "u" && (window[Symbol.for("radix-ui")] = !0),
					u.jsx(y, { ...v, ref: d })
				);
			});
		return (o.displayName = `Primitive.${i}`), { ...l, [i]: o };
	}, {});
function d0(l, i) {
	l && Gi.flushSync(() => l.dispatchEvent(i));
}
Jw(d0, "dispatchDiscreteCustomEvent");
var eE = Object.defineProperty,
	tE = (l, i) => eE(l, "name", { value: i, configurable: !0 });
function An(l) {
	const i = x.useRef(l);
	return (
		x.useEffect(() => {
			i.current = l;
		}),
		x.useMemo(
			() =>
				(...r) => {
					var o;
					return (o = i.current) == null ? void 0 : o.call(i, ...r);
				},
			[],
		)
	);
}
tE(An, "useCallbackRef");
var nE = Object.defineProperty,
	Nt = (l, i) => nE(l, "name", { value: i, configurable: !0 }),
	zf = "dismissableLayer.update",
	aE = "dismissableLayer.pointerDownOutside",
	lE = "dismissableLayer.focusOutside",
	Wg,
	m0 = x.createContext({
		layers: new Set(),
		layersWithOutsidePointerEventsDisabled: new Set(),
		branches: new Set(),
		dismissableSurfaces: new Set(),
	}),
	h0 = x.forwardRef(
		Nt((i, r) => {
			const {
					disableOutsidePointerEvents: o = !1,
					deferPointerDownOutside: f = !1,
					onEscapeKeyDown: d,
					onPointerDownOutside: m,
					onFocusOutside: v,
					onInteractOutside: y,
					onDismiss: g,
					...S
				} = i,
				h = x.useContext(m0),
				[w, E] = x.useState(null),
				C =
					(w == null ? void 0 : w.ownerDocument) ??
					(globalThis == null ? void 0 : globalThis.document),
				[, j] = x.useState({}),
				N = He(r, E),
				T = Array.from(h.layers),
				[z] = [...h.layersWithOutsidePointerEventsDisabled].slice(-1),
				R = z ? T.indexOf(z) : -1,
				O = w ? T.indexOf(w) : -1,
				L = h.layersWithOutsidePointerEventsDisabled.size > 0,
				Y = O >= R,
				X = x.useRef(!1),
				q = g0(
					(te) => {
						m == null || m(te),
							y == null || y(te),
							te.defaultPrevented || g == null || g();
					},
					{
						ownerDocument: C,
						deferPointerDownOutside: f,
						isDeferredPointerDownOutsideRef: X,
						dismissableSurfaces: h.dismissableSurfaces,
						shouldHandlePointerDownOutside: x.useCallback(
							(te) => {
								if (!(te instanceof Node)) return !1;
								const se = [...h.branches].some((le) => le.contains(te));
								return Y && !se;
							},
							[h.branches, Y],
						),
					},
				),
				J = v0((te) => {
					if (f && X.current) return;
					const se = te.target;
					[...h.branches].some((ue) => ue.contains(se)) ||
						(v == null || v(te),
						y == null || y(te),
						te.defaultPrevented || g == null || g());
				}, C),
				ee = w ? O === T.length - 1 : !1,
				ce = An((te) => {
					te.key === "Escape" &&
						(d == null || d(te),
						!te.defaultPrevented && g && (te.preventDefault(), g()));
				});
			return (
				x.useEffect(() => {
					if (ee)
						return (
							C.addEventListener("keydown", ce, { capture: !0 }),
							() => C.removeEventListener("keydown", ce, { capture: !0 })
						);
				}, [C, ee, ce]),
				x.useEffect(() => {
					if (w)
						return (
							o &&
								(h.layersWithOutsidePointerEventsDisabled.size === 0 &&
									((Wg = C.body.style.pointerEvents),
									(C.body.style.pointerEvents = "none")),
								h.layersWithOutsidePointerEventsDisabled.add(w)),
							h.layers.add(w),
							kf(),
							() => {
								o &&
									(h.layersWithOutsidePointerEventsDisabled.delete(w),
									h.layersWithOutsidePointerEventsDisabled.size === 0 &&
										(C.body.style.pointerEvents = Wg));
							}
						);
				}, [w, C, o, h]),
				x.useEffect(
					() => () => {
						w &&
							(h.layers.delete(w),
							h.layersWithOutsidePointerEventsDisabled.delete(w),
							kf());
					},
					[w, h],
				),
				x.useEffect(() => {
					const te = Nt(() => j({}), "handleUpdate");
					return (
						document.addEventListener(zf, te),
						() => document.removeEventListener(zf, te)
					);
				}, []),
				u.jsx(ke.div, {
					...S,
					ref: N,
					style: {
						pointerEvents: L ? (Y ? "auto" : "none") : void 0,
						...i.style,
					},
					onFocusCapture: Ne(i.onFocusCapture, J.onFocusCapture),
					onBlurCapture: Ne(i.onBlurCapture, J.onBlurCapture),
					onPointerDownCapture: Ne(
						i.onPointerDownCapture,
						q.onPointerDownCapture,
					),
				})
			);
		}, "DismissableLayer"),
	);
function p0() {
	const l = x.useContext(m0),
		[i, r] = x.useState(null);
	return (
		x.useEffect(() => {
			if (i)
				return (
					l.dismissableSurfaces.add(i),
					() => {
						l.dismissableSurfaces.delete(i);
					}
				);
		}, [i, l.dismissableSurfaces]),
		r
	);
}
Nt(p0, "useDismissableLayerSurface");
var iE = Nt(() => !0, "IS_TRUE");
function g0(l, i) {
	const {
			ownerDocument: r = globalThis == null ? void 0 : globalThis.document,
			deferPointerDownOutside: o = !1,
			isDeferredPointerDownOutsideRef: f,
			dismissableSurfaces: d,
			shouldHandlePointerDownOutside: m = iE,
		} = i,
		v = An(l),
		y = x.useRef(!1),
		g = x.useRef(!1),
		S = x.useRef(new Map()),
		h = x.useRef(() => {});
	return (
		x.useEffect(() => {
			function w() {
				(g.current = !1), (f.current = !1), S.current.clear();
			}
			Nt(w, "resetOutsideInteraction");
			function E() {
				return Array.from(S.current.values()).some(Boolean);
			}
			Nt(E, "isOutsideInteractionIntercepted");
			function C(R) {
				if (!g.current) return;
				const O = R.target;
				(O instanceof Node && [...d].some((Y) => Y.contains(O))) ||
					S.current.set(R.type, !0),
					R.type === "click" &&
						window.setTimeout(() => {
							g.current && h.current();
						}, 0);
			}
			Nt(C, "handleInteractionCapture");
			function j(R) {
				g.current && S.current.set(R.type, !1);
			}
			Nt(j, "handleInteractionBubble");
			const N = Nt((R) => {
					if (R.target && !y.current) {
						const O = () => {
							r.removeEventListener("click", h.current);
							const Y = E();
							w(), Y || td(aE, v, L, { discrete: !0 });
						};
						if (
							(Nt(O, "handleAndDispatchPointerDownOutsideEvent"), !m(R.target))
						) {
							r.removeEventListener("click", h.current), w(), (y.current = !1);
							return;
						}
						const L = { originalEvent: R };
						(g.current = !0),
							(f.current = o && R.button === 0),
							S.current.clear(),
							!o || R.button !== 0
								? O()
								: (r.removeEventListener("click", h.current),
									(h.current = O),
									r.addEventListener("click", h.current, { once: !0 }));
					} else r.removeEventListener("click", h.current), w();
					y.current = !1;
				}, "handlePointerDown"),
				T = [
					"pointerup",
					"mousedown",
					"mouseup",
					"touchstart",
					"touchend",
					"click",
				];
			for (const R of T) r.addEventListener(R, C, !0), r.addEventListener(R, j);
			const z = window.setTimeout(() => {
				r.addEventListener("pointerdown", N);
			}, 0);
			return () => {
				window.clearTimeout(z),
					r.removeEventListener("pointerdown", N),
					r.removeEventListener("click", h.current);
				for (const R of T)
					r.removeEventListener(R, C, !0), r.removeEventListener(R, j);
			};
		}, [r, v, o, f, d, m]),
		{ onPointerDownCapture: Nt(() => (y.current = !0), "onPointerDownCapture") }
	);
}
Nt(g0, "usePointerDownOutside");
function v0(l, i = globalThis == null ? void 0 : globalThis.document) {
	const r = An(l),
		o = x.useRef(!1);
	return (
		x.useEffect(() => {
			const f = Nt((d) => {
				d.target &&
					!o.current &&
					td(lE, r, { originalEvent: d }, { discrete: !1 });
			}, "handleFocus");
			return (
				i.addEventListener("focusin", f),
				() => i.removeEventListener("focusin", f)
			);
		}, [i, r]),
		{
			onFocusCapture: Nt(() => (o.current = !0), "onFocusCapture"),
			onBlurCapture: Nt(() => (o.current = !1), "onBlurCapture"),
		}
	);
}
Nt(v0, "useFocusOutside");
function kf() {
	const l = new CustomEvent(zf);
	document.dispatchEvent(l);
}
Nt(kf, "dispatchUpdate");
function td(l, i, r, { discrete: o }) {
	const f = r.originalEvent.target,
		d = new CustomEvent(l, { bubbles: !1, cancelable: !0, detail: r });
	i && f.addEventListener(l, i, { once: !0 }),
		o ? d0(f, d) : f.dispatchEvent(d);
}
Nt(td, "handleAndDispatchCustomEvent");
var rE = Object.defineProperty,
	Vt = (l, i) => rE(l, "name", { value: i, configurable: !0 }),
	vf = "focusScope.autoFocusOnMount",
	yf = "focusScope.autoFocusOnUnmount",
	ev = { bubbles: !1, cancelable: !0 },
	y0 = x.forwardRef(
		Vt((i, r) => {
			const {
					loop: o = !1,
					trapped: f = !1,
					onMountAutoFocus: d,
					onUnmountAutoFocus: m,
					...v
				} = i,
				[y, g] = x.useState(null),
				S = An(d),
				h = An(m),
				w = x.useRef(null),
				E = He(r, g),
				C = x.useRef({
					paused: !1,
					pause() {
						this.paused = !0;
					},
					resume() {
						this.paused = !1;
					},
				}).current;
			x.useEffect(() => {
				if (f) {
					const N = (O) => {
							if (C.paused || !y) return;
							const L = O.target;
							y.contains(L) ? (w.current = L) : fa(w.current, { select: !0 });
						},
						T = (O) => {
							if (C.paused || !y) return;
							const L = O.relatedTarget;
							L !== null && (y.contains(L) || fa(w.current, { select: !0 }));
						},
						z = (O) => {
							if (document.activeElement === document.body)
								for (const Y of O) Y.removedNodes.length > 0 && fa(y);
						};
					Vt(N, "handleFocusIn"),
						Vt(T, "handleFocusOut"),
						Vt(z, "handleMutations"),
						document.addEventListener("focusin", N),
						document.addEventListener("focusout", T);
					const R = new MutationObserver(z);
					return (
						y && R.observe(y, { childList: !0, subtree: !0 }),
						() => {
							document.removeEventListener("focusin", N),
								document.removeEventListener("focusout", T),
								R.disconnect();
						}
					);
				}
			}, [f, y, C.paused]),
				x.useEffect(() => {
					if (y) {
						tv.add(C);
						const N = document.activeElement;
						if (!y.contains(N)) {
							const z = new CustomEvent(vf, ev);
							y.addEventListener(vf, S),
								y.dispatchEvent(z),
								z.defaultPrevented ||
									(x0(N0(nd(y)), { select: !0 }),
									document.activeElement === N && fa(y));
						}
						return () => {
							y.removeEventListener(vf, S),
								setTimeout(() => {
									const z = new CustomEvent(yf, ev);
									y.addEventListener(yf, h),
										y.dispatchEvent(z),
										z.defaultPrevented ||
											fa(N ?? document.body, { select: !0 }),
										y.removeEventListener(yf, h),
										tv.remove(C);
								}, 0);
						};
					}
				}, [y, S, h, C]);
			const j = x.useCallback(
				(N) => {
					if ((!o && !f) || C.paused) return;
					const T = N.key === "Tab" && !N.altKey && !N.ctrlKey && !N.metaKey,
						z = document.activeElement;
					if (T && z) {
						const R = N.currentTarget,
							[O, L] = b0(R);
						O && L
							? !N.shiftKey && z === L
								? (N.preventDefault(), o && fa(O, { select: !0 }))
								: N.shiftKey &&
									z === O &&
									(N.preventDefault(), o && fa(L, { select: !0 }))
							: z === R && N.preventDefault();
					}
				},
				[o, f, C.paused],
			);
			return u.jsx(ke.div, { tabIndex: -1, ...v, ref: E, onKeyDown: j });
		}, "FocusScope"),
	);
function x0(l, { select: i = !1 } = {}) {
	const r = document.activeElement;
	for (const o of l)
		if ((fa(o, { select: i }), document.activeElement !== r)) return;
}
Vt(x0, "focusFirst");
function b0(l) {
	const i = nd(l),
		r = Lf(i, l),
		o = Lf(i.reverse(), l);
	return [r, o];
}
Vt(b0, "getTabbableEdges");
function nd(l) {
	const i = [],
		r = document.createTreeWalker(l, NodeFilter.SHOW_ELEMENT, {
			acceptNode: Vt((o) => {
				const f = o.tagName === "INPUT" && o.type === "hidden";
				return o.disabled || o.hidden || f
					? NodeFilter.FILTER_SKIP
					: o.tabIndex >= 0
						? NodeFilter.FILTER_ACCEPT
						: NodeFilter.FILTER_SKIP;
			}, "acceptNode"),
		});
	for (; r.nextNode(); ) i.push(r.currentNode);
	return i;
}
Vt(nd, "getTabbableCandidates");
function Lf(l, i) {
	const r =
		typeof i.checkVisibility == "function" &&
		i.checkVisibility({ checkVisibilityCSS: !0 });
	for (const o of l)
		if (
			!(r ? !o.checkVisibility({ checkVisibilityCSS: !0 }) : S0(o, { upTo: i }))
		)
			return o;
}
Vt(Lf, "findVisible");
function S0(l, { upTo: i }) {
	if (getComputedStyle(l).visibility === "hidden") return !0;
	for (; l; ) {
		if (i !== void 0 && l === i) return !1;
		if (getComputedStyle(l).display === "none") return !0;
		l = l.parentElement;
	}
	return !1;
}
Vt(S0, "isHidden");
function w0(l) {
	return l instanceof HTMLInputElement && "select" in l;
}
Vt(w0, "isSelectableInput");
function fa(l, { select: i = !1 } = {}) {
	if (l && l.focus) {
		const r = document.activeElement;
		l.focus({ preventScroll: !0 }), l !== r && w0(l) && i && l.select();
	}
}
Vt(fa, "focus");
var tv = E0();
function E0() {
	let l = [];
	return {
		add(i) {
			const r = l[0];
			i !== r && (r == null || r.pause()), (l = Bf(l, i)), l.unshift(i);
		},
		remove(i) {
			var r;
			(l = Bf(l, i)), (r = l[0]) == null || r.resume();
		},
	};
}
Vt(E0, "createFocusScopesStack");
function Bf(l, i) {
	const r = [...l],
		o = r.indexOf(i);
	return o !== -1 && r.splice(o, 1), r;
}
Vt(Bf, "arrayRemove");
function N0(l) {
	return l.filter((i) => i.tagName !== "A");
}
Vt(N0, "removeLinks");
var oE = Object.defineProperty,
	sE = (l, i) => oE(l, "name", { value: i, configurable: !0 }),
	C0 = x.forwardRef(
		sE((i, r) => {
			var y;
			const { container: o, ...f } = i,
				[d, m] = x.useState(!1);
			st(() => m(!0), []);
			const v =
				o ||
				(d &&
					((y = globalThis == null ? void 0 : globalThis.document) == null
						? void 0
						: y.body));
			return v ? Gi.createPortal(u.jsx(ke.div, { ...f, ref: r }), v) : null;
		}, "Portal"),
	),
	cE = Object.defineProperty,
	va = (l, i) => cE(l, "name", { value: i, configurable: !0 });
function j0(l, i) {
	return x.useReducer((r, o) => i[r][o] ?? r, l);
}
va(j0, "useStateMachine");
var Kr = va((l) => {
	const { present: i, children: r } = l,
		o = T0(i),
		f =
			typeof r == "function" ? r({ present: o.isPresent }) : x.Children.only(r),
		d = _0(o.ref, A0(f));
	return typeof r == "function" || o.isPresent
		? x.cloneElement(f, { ref: d })
		: null;
}, "Presence");
function T0(l) {
	const [i, r] = x.useState(),
		o = x.useRef(null),
		f = x.useRef(l),
		d = x.useRef("none"),
		m = x.useRef(void 0),
		v = l ? "mounted" : "unmounted",
		[y, g] = j0(v, {
			mounted: { UNMOUNT: "unmounted", ANIMATION_OUT: "unmountSuspended" },
			unmountSuspended: { MOUNT: "mounted", ANIMATION_END: "unmounted" },
			unmounted: { MOUNT: "mounted" },
		});
	return (
		x.useEffect(() => {
			y === "mounted"
				? ((d.current = m.current ?? zi(o.current)), (m.current = void 0))
				: (d.current = "none");
		}, [y]),
		st(() => {
			const S = o.current,
				h = f.current;
			if (h !== l) {
				const E = d.current,
					C = zi(S);
				l
					? ((m.current = C), g("MOUNT"))
					: C === "none" || (S == null ? void 0 : S.display) === "none"
						? g("UNMOUNT")
						: g(h && E !== C ? "ANIMATION_OUT" : "UNMOUNT"),
					(f.current = l);
			}
		}, [l, g]),
		st(() => {
			if (i) {
				let S;
				const h = i.ownerDocument.defaultView ?? window,
					w = va((C) => {
						const N = zi(o.current).includes(CSS.escape(C.animationName));
						if (C.target === i && N && (g("ANIMATION_END"), !f.current)) {
							const T = i.style.animationFillMode;
							(i.style.animationFillMode = "forwards"),
								(S = h.setTimeout(() => {
									i.style.animationFillMode === "forwards" &&
										(i.style.animationFillMode = T);
								}));
						}
					}, "handleAnimationEnd"),
					E = va((C) => {
						C.target === i && (d.current = zi(o.current));
					}, "handleAnimationStart");
				return (
					i.addEventListener("animationstart", E),
					i.addEventListener("animationcancel", w),
					i.addEventListener("animationend", w),
					() => {
						h.clearTimeout(S),
							i.removeEventListener("animationstart", E),
							i.removeEventListener("animationcancel", w),
							i.removeEventListener("animationend", w);
					}
				);
			} else g("ANIMATION_END");
		}, [i, g]),
		{
			isPresent: ["mounted", "unmountSuspended"].includes(y),
			ref: x.useCallback((S) => {
				if (S) {
					const h = getComputedStyle(S);
					(o.current = h), (m.current = zi(h));
				} else o.current = null;
				r(S);
			}, []),
		}
	);
}
va(T0, "usePresence");
function Uf(l, i) {
	if (typeof l == "function") return l(i);
	l != null && (l.current = i);
}
va(Uf, "setRef");
function _0(...l) {
	const i = x.useRef(l);
	return (
		(i.current = l),
		x.useCallback((r) => {
			const o = i.current;
			let f = !1;
			const d = o.map((m) => {
				const v = Uf(m, r);
				return !f && typeof v == "function" && (f = !0), v;
			});
			if (f)
				return () => {
					for (let m = 0; m < d.length; m++) {
						const v = d[m];
						typeof v == "function" ? v() : Uf(o[m], null);
					}
				};
		}, [])
	);
}
va(_0, "useStableComposedRefs");
function zi(l) {
	return (l == null ? void 0 : l.animationName) || "none";
}
va(zi, "getAnimationName");
function A0(l) {
	var o, f;
	let i =
			(o = Object.getOwnPropertyDescriptor(l.props, "ref")) == null
				? void 0
				: o.get,
		r = i && "isReactWarning" in i && i.isReactWarning;
	return r
		? l.ref
		: ((i =
				(f = Object.getOwnPropertyDescriptor(l, "ref")) == null
					? void 0
					: f.get),
			(r = i && "isReactWarning" in i && i.isReactWarning),
			r ? l.props.ref : l.props.ref || l.ref);
}
va(A0, "getElementRef");
var uE = Object.defineProperty,
	ad = (l, i) => uE(l, "name", { value: i, configurable: !0 }),
	Ss = 0,
	Un = null;
function fE(l) {
	return Bs(), l.children;
}
ad(fE, "FocusGuards");
function Bs() {
	x.useEffect(() => {
		Un || (Un = { start: Hf(), end: Hf() });
		const { start: l, end: i } = Un;
		return (
			document.body.firstElementChild !== l &&
				document.body.insertAdjacentElement("afterbegin", l),
			document.body.lastElementChild !== i &&
				document.body.insertAdjacentElement("beforeend", i),
			Ss++,
			() => {
				Ss === 1 &&
					(Un == null || Un.start.remove(),
					Un == null || Un.end.remove(),
					(Un = null)),
					(Ss = Math.max(0, Ss - 1));
			}
		);
	}, []);
}
ad(Bs, "useFocusGuards");
function Hf() {
	const l = document.createElement("span");
	return (
		l.setAttribute("data-radix-focus-guard", ""),
		(l.tabIndex = 0),
		(l.style.outline = "none"),
		(l.style.opacity = "0"),
		(l.style.position = "fixed"),
		(l.style.pointerEvents = "none"),
		l
	);
}
ad(Hf, "createFocusGuard");
var Hn = function () {
	return (
		(Hn =
			Object.assign ||
			function (i) {
				for (var r, o = 1, f = arguments.length; o < f; o++) {
					r = arguments[o];
					for (var d in r) Object.hasOwn(r, d) && (i[d] = r[d]);
				}
				return i;
			}),
		Hn.apply(this, arguments)
	);
};
function R0(l, i) {
	var r = {};
	for (var o in l) Object.hasOwn(l, o) && i.indexOf(o) < 0 && (r[o] = l[o]);
	if (l != null && typeof Object.getOwnPropertySymbols == "function")
		for (var f = 0, o = Object.getOwnPropertySymbols(l); f < o.length; f++)
			i.indexOf(o[f]) < 0 &&
				Object.prototype.propertyIsEnumerable.call(l, o[f]) &&
				(r[o[f]] = l[o[f]]);
	return r;
}
function dE(l, i, r) {
	if (r || arguments.length === 2)
		for (var o = 0, f = i.length, d; o < f; o++)
			(d || !(o in i)) &&
				(d || (d = Array.prototype.slice.call(i, 0, o)), (d[o] = i[o]));
	return l.concat(d || Array.prototype.slice.call(i));
}
var _s = "right-scroll-bar-position",
	As = "width-before-scroll-bar",
	mE = "with-scroll-bars-hidden",
	hE = "--removed-body-scroll-bar-size";
function xf(l, i) {
	return typeof l == "function" ? l(i) : l && (l.current = i), l;
}
function pE(l, i) {
	var r = x.useState(() => ({
		value: l,
		callback: i,
		facade: {
			get current() {
				return r.value;
			},
			set current(o) {
				var f = r.value;
				f !== o && ((r.value = o), r.callback(o, f));
			},
		},
	}))[0];
	return (r.callback = i), r.facade;
}
var gE = typeof window < "u" ? x.useLayoutEffect : x.useEffect,
	nv = new WeakMap();
function vE(l, i) {
	var r = pE(null, (o) => l.forEach((f) => xf(f, o)));
	return (
		gE(() => {
			var o = nv.get(r);
			if (o) {
				var f = new Set(o),
					d = new Set(l),
					m = r.current;
				f.forEach((v) => {
					d.has(v) || xf(v, null);
				}),
					d.forEach((v) => {
						f.has(v) || xf(v, m);
					});
			}
			nv.set(r, l);
		}, [l]),
		r
	);
}
function yE(l) {
	return l;
}
function xE(l, i) {
	i === void 0 && (i = yE);
	var r = [],
		o = !1,
		f = {
			read: () => {
				if (o)
					throw new Error(
						"Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.",
					);
				return r.length ? r[r.length - 1] : l;
			},
			useMedium: (d) => {
				var m = i(d, o);
				return (
					r.push(m),
					() => {
						r = r.filter((v) => v !== m);
					}
				);
			},
			assignSyncMedium: (d) => {
				for (o = !0; r.length; ) {
					var m = r;
					(r = []), m.forEach(d);
				}
				r = { push: (v) => d(v), filter: () => r };
			},
			assignMedium: (d) => {
				o = !0;
				var m = [];
				if (r.length) {
					var v = r;
					(r = []), v.forEach(d), (m = r);
				}
				var y = () => {
						var S = m;
						(m = []), S.forEach(d);
					},
					g = () => Promise.resolve().then(y);
				g(),
					(r = {
						push: (S) => {
							m.push(S), g();
						},
						filter: (S) => ((m = m.filter(S)), r),
					});
			},
		};
	return f;
}
function bE(l) {
	l === void 0 && (l = {});
	var i = xE(null);
	return (i.options = Hn({ async: !0, ssr: !1 }, l)), i;
}
var M0 = (l) => {
	var i = l.sideCar,
		r = R0(l, ["sideCar"]);
	if (!i)
		throw new Error(
			"Sidecar: please provide `sideCar` property to import the right car",
		);
	var o = i.read();
	if (!o) throw new Error("Sidecar medium not found");
	return x.createElement(o, Hn({}, r));
};
M0.isSideCarExport = !0;
function SE(l, i) {
	return l.useMedium(i), M0;
}
var O0 = bE(),
	bf = () => {},
	Us = x.forwardRef((l, i) => {
		var r = x.useRef(null),
			o = x.useState({
				onScrollCapture: bf,
				onWheelCapture: bf,
				onTouchMoveCapture: bf,
			}),
			f = o[0],
			d = o[1],
			m = l.forwardProps,
			v = l.children,
			y = l.className,
			g = l.removeScrollBar,
			S = l.enabled,
			h = l.shards,
			w = l.sideCar,
			E = l.noRelative,
			C = l.noIsolation,
			j = l.inert,
			N = l.allowPinchZoom,
			T = l.as,
			z = T === void 0 ? "div" : T,
			R = l.gapMode,
			O = R0(l, [
				"forwardProps",
				"children",
				"className",
				"removeScrollBar",
				"enabled",
				"shards",
				"sideCar",
				"noRelative",
				"noIsolation",
				"inert",
				"allowPinchZoom",
				"as",
				"gapMode",
			]),
			L = w,
			Y = vE([r, i]),
			X = Hn(Hn({}, O), f);
		return x.createElement(
			x.Fragment,
			null,
			S &&
				x.createElement(L, {
					sideCar: O0,
					removeScrollBar: g,
					shards: h,
					noRelative: E,
					noIsolation: C,
					inert: j,
					setCallbacks: d,
					allowPinchZoom: !!N,
					lockRef: r,
					gapMode: R,
				}),
			m
				? x.cloneElement(x.Children.only(v), Hn(Hn({}, X), { ref: Y }))
				: x.createElement(z, Hn({}, X, { className: y, ref: Y }), v),
		);
	});
Us.defaultProps = { enabled: !0, removeScrollBar: !0, inert: !1 };
Us.classNames = { fullWidth: As, zeroRight: _s };
var wE = () => {
	if (typeof __webpack_nonce__ < "u") return __webpack_nonce__;
};
function EE() {
	if (!document) return null;
	var l = document.createElement("style");
	l.type = "text/css";
	var i = wE();
	return i && l.setAttribute("nonce", i), l;
}
function NE(l, i) {
	l.styleSheet
		? (l.styleSheet.cssText = i)
		: l.appendChild(document.createTextNode(i));
}
function CE(l) {
	var i = document.head || document.getElementsByTagName("head")[0];
	i.appendChild(l);
}
var jE = () => {
		var l = 0,
			i = null;
		return {
			add: (r) => {
				l == 0 && (i = EE()) && (NE(i, r), CE(i)), l++;
			},
			remove: () => {
				l--,
					!l && i && (i.parentNode && i.parentNode.removeChild(i), (i = null));
			},
		};
	},
	TE = () => {
		var l = jE();
		return (i, r) => {
			x.useEffect(
				() => (
					l.add(i),
					() => {
						l.remove();
					}
				),
				[i && r],
			);
		};
	},
	D0 = () => {
		var l = TE(),
			i = (r) => {
				var o = r.styles,
					f = r.dynamic;
				return l(o, f), null;
			};
		return i;
	},
	_E = { left: 0, top: 0, right: 0, gap: 0 },
	Sf = (l) => parseInt(l || "", 10) || 0,
	AE = (l) => {
		var i = window.getComputedStyle(document.body),
			r = i[l === "padding" ? "paddingLeft" : "marginLeft"],
			o = i[l === "padding" ? "paddingTop" : "marginTop"],
			f = i[l === "padding" ? "paddingRight" : "marginRight"];
		return [Sf(r), Sf(o), Sf(f)];
	},
	RE = (l) => {
		if ((l === void 0 && (l = "margin"), typeof window > "u")) return _E;
		var i = AE(l),
			r = document.documentElement.clientWidth,
			o = window.innerWidth;
		return {
			left: i[0],
			top: i[1],
			right: i[2],
			gap: Math.max(0, o - r + i[2] - i[0]),
		};
	},
	ME = D0(),
	Bi = "data-scroll-locked",
	OE = (l, i, r, o) => {
		var f = l.left,
			d = l.top,
			m = l.right,
			v = l.gap;
		return (
			r === void 0 && (r = "margin"),
			`
  .`
				.concat(
					mE,
					` {
   overflow: hidden `,
				)
				.concat(
					o,
					`;
   padding-right: `,
				)
				.concat(v, "px ")
				.concat(
					o,
					`;
  }
  body[`,
				)
				.concat(
					Bi,
					`] {
    overflow: hidden `,
				)
				.concat(
					o,
					`;
    overscroll-behavior: contain;
    `,
				)
				.concat(
					[
						i && "position: relative ".concat(o, ";"),
						r === "margin" &&
							`
    padding-left: `
								.concat(
									f,
									`px;
    padding-top: `,
								)
								.concat(
									d,
									`px;
    padding-right: `,
								)
								.concat(
									m,
									`px;
    margin-left:0;
    margin-top:0;
    margin-right: `,
								)
								.concat(v, "px ")
								.concat(
									o,
									`;
    `,
								),
						r === "padding" &&
							"padding-right: ".concat(v, "px ").concat(o, ";"),
					]
						.filter(Boolean)
						.join(""),
					`
  }
  
  .`,
				)
				.concat(
					_s,
					` {
    right: `,
				)
				.concat(v, "px ")
				.concat(
					o,
					`;
  }
  
  .`,
				)
				.concat(
					As,
					` {
    margin-right: `,
				)
				.concat(v, "px ")
				.concat(
					o,
					`;
  }
  
  .`,
				)
				.concat(_s, " .")
				.concat(
					_s,
					` {
    right: 0 `,
				)
				.concat(
					o,
					`;
  }
  
  .`,
				)
				.concat(As, " .")
				.concat(
					As,
					` {
    margin-right: 0 `,
				)
				.concat(
					o,
					`;
  }
  
  body[`,
				)
				.concat(
					Bi,
					`] {
    `,
				)
				.concat(hE, ": ")
				.concat(
					v,
					`px;
  }
`,
				)
		);
	},
	av = () => {
		var l = parseInt(document.body.getAttribute(Bi) || "0", 10);
		return isFinite(l) ? l : 0;
	},
	DE = () => {
		x.useEffect(
			() => (
				document.body.setAttribute(Bi, (av() + 1).toString()),
				() => {
					var l = av() - 1;
					l <= 0
						? document.body.removeAttribute(Bi)
						: document.body.setAttribute(Bi, l.toString());
				}
			),
			[],
		);
	},
	zE = (l) => {
		var i = l.noRelative,
			r = l.noImportant,
			o = l.gapMode,
			f = o === void 0 ? "margin" : o;
		DE();
		var d = x.useMemo(() => RE(f), [f]);
		return x.createElement(ME, { styles: OE(d, !i, f, r ? "" : "!important") });
	},
	Vf = !1;
if (typeof window < "u")
	try {
		var ws = Object.defineProperty({}, "passive", {
			get: () => ((Vf = !0), !0),
		});
		window.addEventListener("test", ws, ws),
			window.removeEventListener("test", ws, ws);
	} catch {
		Vf = !1;
	}
var Mi = Vf ? { passive: !1 } : !1,
	kE = (l) => l.tagName === "TEXTAREA",
	z0 = (l, i) => {
		if (!(l instanceof Element)) return !1;
		var r = window.getComputedStyle(l);
		return (
			r[i] !== "hidden" &&
			!(r.overflowY === r.overflowX && !kE(l) && r[i] === "visible")
		);
	},
	LE = (l) => z0(l, "overflowY"),
	BE = (l) => z0(l, "overflowX"),
	lv = (l, i) => {
		var r = i.ownerDocument,
			o = i;
		do {
			typeof ShadowRoot < "u" && o instanceof ShadowRoot && (o = o.host);
			var f = k0(l, o);
			if (f) {
				var d = L0(l, o),
					m = d[1],
					v = d[2];
				if (m > v) return !0;
			}
			o = o.parentNode;
		} while (o && o !== r.body);
		return !1;
	},
	UE = (l) => {
		var i = l.scrollTop,
			r = l.scrollHeight,
			o = l.clientHeight;
		return [i, r, o];
	},
	HE = (l) => {
		var i = l.scrollLeft,
			r = l.scrollWidth,
			o = l.clientWidth;
		return [i, r, o];
	},
	k0 = (l, i) => (l === "v" ? LE(i) : BE(i)),
	L0 = (l, i) => (l === "v" ? UE(i) : HE(i)),
	VE = (l, i) => (l === "h" && i === "rtl" ? -1 : 1),
	YE = (l, i, r, o, f) => {
		var d = VE(l, window.getComputedStyle(i).direction),
			m = d * o,
			v = r.target,
			y = i.contains(v),
			g = !1,
			S = m > 0,
			h = 0,
			w = 0;
		do {
			if (!v) break;
			var E = L0(l, v),
				C = E[0],
				j = E[1],
				N = E[2],
				T = j - N - d * C;
			(C || T) && k0(l, v) && ((h += T), (w += C));
			var z = v.parentNode;
			v = z && z.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? z.host : z;
		} while ((!y && v !== document.body) || (y && (i.contains(v) || i === v)));
		return ((S && Math.abs(h) < 1) || (!S && Math.abs(w) < 1)) && (g = !0), g;
	},
	Es = (l) =>
		"changedTouches" in l
			? [l.changedTouches[0].clientX, l.changedTouches[0].clientY]
			: [0, 0],
	iv = (l) => [l.deltaX, l.deltaY],
	rv = (l) => (l && "current" in l ? l.current : l),
	GE = (l, i) => l[0] === i[0] && l[1] === i[1],
	qE = (l) =>
		`
  .block-interactivity-`
			.concat(
				l,
				` {pointer-events: none;}
  .allow-interactivity-`,
			)
			.concat(
				l,
				` {pointer-events: all;}
`,
			),
	XE = 0,
	Oi = [];
function QE(l) {
	var i = x.useRef([]),
		r = x.useRef([0, 0]),
		o = x.useRef(),
		f = x.useState(XE++)[0],
		d = x.useState(D0)[0],
		m = x.useRef(l);
	x.useEffect(() => {
		m.current = l;
	}, [l]),
		x.useEffect(() => {
			if (l.inert) {
				document.body.classList.add("block-interactivity-".concat(f));
				var j = dE([l.lockRef.current], (l.shards || []).map(rv), !0).filter(
					Boolean,
				);
				return (
					j.forEach((N) => N.classList.add("allow-interactivity-".concat(f))),
					() => {
						document.body.classList.remove("block-interactivity-".concat(f)),
							j.forEach((N) =>
								N.classList.remove("allow-interactivity-".concat(f)),
							);
					}
				);
			}
		}, [l.inert, l.lockRef.current, l.shards]);
	var v = x.useCallback((j, N) => {
			if (
				("touches" in j && j.touches.length === 2) ||
				(j.type === "wheel" && j.ctrlKey)
			)
				return !m.current.allowPinchZoom;
			var T = Es(j),
				z = r.current,
				R = "deltaX" in j ? j.deltaX : z[0] - T[0],
				O = "deltaY" in j ? j.deltaY : z[1] - T[1],
				L,
				Y = j.target,
				X = Math.abs(R) > Math.abs(O) ? "h" : "v";
			if ("touches" in j && X === "h" && Y.type === "range") return !1;
			var q = window.getSelection(),
				J = q && q.anchorNode,
				ee = J ? J === Y || J.contains(Y) : !1;
			if (ee) return !1;
			var ce = lv(X, Y);
			if (!ce) return !0;
			if ((ce ? (L = X) : ((L = X === "v" ? "h" : "v"), (ce = lv(X, Y))), !ce))
				return !1;
			if (
				(!o.current && "changedTouches" in j && (R || O) && (o.current = L), !L)
			)
				return !0;
			var te = o.current || L;
			return YE(te, N, j, te === "h" ? R : O);
		}, []),
		y = x.useCallback((j) => {
			var N = j;
			if (!(!Oi.length || Oi[Oi.length - 1] !== d)) {
				var T = "deltaY" in N ? iv(N) : Es(N),
					z = i.current.filter(
						(L) =>
							L.name === N.type &&
							(L.target === N.target || N.target === L.shadowParent) &&
							GE(L.delta, T),
					)[0];
				if (z && z.should) {
					N.cancelable && N.preventDefault();
					return;
				}
				if (!z) {
					var R = (m.current.shards || [])
							.map(rv)
							.filter(Boolean)
							.filter((L) => L.contains(N.target)),
						O = R.length > 0 ? v(N, R[0]) : !m.current.noIsolation;
					O && N.cancelable && N.preventDefault();
				}
			}
		}, []),
		g = x.useCallback((j, N, T, z) => {
			var R = { name: j, delta: N, target: T, should: z, shadowParent: PE(T) };
			i.current.push(R),
				setTimeout(() => {
					i.current = i.current.filter((O) => O !== R);
				}, 1);
		}, []),
		S = x.useCallback((j) => {
			(r.current = Es(j)), (o.current = void 0);
		}, []),
		h = x.useCallback((j) => {
			g(j.type, iv(j), j.target, v(j, l.lockRef.current));
		}, []),
		w = x.useCallback((j) => {
			g(j.type, Es(j), j.target, v(j, l.lockRef.current));
		}, []);
	x.useEffect(
		() => (
			Oi.push(d),
			l.setCallbacks({
				onScrollCapture: h,
				onWheelCapture: h,
				onTouchMoveCapture: w,
			}),
			document.addEventListener("wheel", y, Mi),
			document.addEventListener("touchmove", y, Mi),
			document.addEventListener("touchstart", S, Mi),
			() => {
				(Oi = Oi.filter((j) => j !== d)),
					document.removeEventListener("wheel", y, Mi),
					document.removeEventListener("touchmove", y, Mi),
					document.removeEventListener("touchstart", S, Mi);
			}
		),
		[],
	);
	var E = l.removeScrollBar,
		C = l.inert;
	return x.createElement(
		x.Fragment,
		null,
		C ? x.createElement(d, { styles: qE(f) }) : null,
		E
			? x.createElement(zE, { noRelative: l.noRelative, gapMode: l.gapMode })
			: null,
	);
}
function PE(l) {
	for (var i = null; l !== null; )
		l instanceof ShadowRoot && ((i = l.host), (l = l.host)), (l = l.parentNode);
	return i;
}
const IE = SE(O0, QE);
var ld = x.forwardRef((l, i) =>
	x.createElement(Us, Hn({}, l, { ref: i, sideCar: IE })),
);
ld.classNames = Us.classNames;
var KE = (l) => {
		if (typeof document > "u") return null;
		var i = Array.isArray(l) ? l[0] : l;
		return i.ownerDocument.body;
	},
	Di = new WeakMap(),
	Ns = new WeakMap(),
	Cs = {},
	wf = 0,
	B0 = (l) => l && (l.host || B0(l.parentNode)),
	ZE = (l, i) =>
		i
			.map((r) => {
				if (l.contains(r)) return r;
				var o = B0(r);
				return o && l.contains(o)
					? o
					: (console.error(
							"aria-hidden",
							r,
							"in not contained inside",
							l,
							". Doing nothing",
						),
						null);
			})
			.filter((r) => !!r),
	$E = (l, i, r, o) => {
		var f = ZE(i, Array.isArray(l) ? l : [l]);
		Cs[r] || (Cs[r] = new WeakMap());
		var d = Cs[r],
			m = [],
			v = new Set(),
			y = new Set(f),
			g = (h) => {
				!h || v.has(h) || (v.add(h), g(h.parentNode));
			};
		f.forEach(g);
		var S = (h) => {
			!h ||
				y.has(h) ||
				Array.prototype.forEach.call(h.children, (w) => {
					if (v.has(w)) S(w);
					else
						try {
							var E = w.getAttribute(o),
								C = E !== null && E !== "false",
								j = (Di.get(w) || 0) + 1,
								N = (d.get(w) || 0) + 1;
							Di.set(w, j),
								d.set(w, N),
								m.push(w),
								j === 1 && C && Ns.set(w, !0),
								N === 1 && w.setAttribute(r, "true"),
								C || w.setAttribute(o, "true");
						} catch (T) {
							console.error("aria-hidden: cannot operate on ", w, T);
						}
				});
		};
		return (
			S(i),
			v.clear(),
			wf++,
			() => {
				m.forEach((h) => {
					var w = Di.get(h) - 1,
						E = d.get(h) - 1;
					Di.set(h, w),
						d.set(h, E),
						w || (Ns.has(h) || h.removeAttribute(o), Ns.delete(h)),
						E || h.removeAttribute(r);
				}),
					wf--,
					wf ||
						((Di = new WeakMap()),
						(Di = new WeakMap()),
						(Ns = new WeakMap()),
						(Cs = {}));
			}
		);
	},
	U0 = (l, i, r) => {
		r === void 0 && (r = "data-aria-hidden");
		var o = Array.from(Array.isArray(l) ? l : [l]),
			f = KE(l);
		return f
			? (o.push.apply(o, Array.from(f.querySelectorAll("[aria-live], script"))),
				$E(o, f, r, "aria-hidden"))
			: () => null;
	},
	FE = Object.defineProperty,
	En = (l, i) => FE(l, "name", { value: i, configurable: !0 }),
	id = "Dialog",
	[H0, zT] = qn(id),
	[JE, Xn] = H0(id),
	WE = En((l) => {
		const {
				__scopeDialog: i,
				children: r,
				open: o,
				defaultOpen: f,
				onOpenChange: d,
				modal: m = !0,
			} = l,
			v = x.useRef(null),
			y = x.useRef(null),
			[g, S] = tl({ prop: o, defaultProp: f ?? !1, onChange: d, caller: id }),
			[h, w] = x.useState(0),
			[E, C] = x.useState(0);
		return u.jsx(JE, {
			scope: i,
			triggerRef: v,
			contentRef: y,
			contentId: Fa(),
			titleId: Fa(),
			descriptionId: Fa(),
			titlePresent: h > 0,
			descriptionPresent: E > 0,
			setTitleCount: w,
			setDescriptionCount: C,
			open: g,
			onOpenChange: S,
			onOpenToggle: x.useCallback(() => S((j) => !j), [S]),
			modal: m,
			children: r,
		});
	}, "Dialog"),
	V0 = "DialogPortal",
	[eN, Y0] = H0(V0, { forceMount: void 0 }),
	tN = En((l) => {
		const { __scopeDialog: i, forceMount: r, children: o, container: f } = l,
			d = Xn(V0, i);
		return u.jsx(eN, {
			scope: i,
			forceMount: r,
			children: x.Children.map(o, (m) =>
				u.jsx(Kr, {
					present: r || d.open,
					children: u.jsx(C0, { asChild: !0, container: f, children: m }),
				}),
			),
		});
	}, "DialogPortal"),
	Yf = "DialogOverlay",
	G0 = x.forwardRef(
		En((i, r) => {
			const o = Y0(Yf, i.__scopeDialog),
				{ forceMount: f = o.forceMount, ...d } = i,
				m = Xn(Yf, i.__scopeDialog);
			return m.modal
				? u.jsx(Kr, {
						present: f || m.open,
						children: u.jsx(aN, { ...d, ref: r }),
					})
				: null;
		}, "DialogOverlay"),
	),
	nN = ga("DialogOverlay.RemoveScroll"),
	aN = x.forwardRef(
		En((i, r) => {
			const { __scopeDialog: o, ...f } = i,
				d = Xn(Yf, o),
				m = p0(),
				v = He(r, m);
			return u.jsx(ld, {
				as: nN,
				allowPinchZoom: !0,
				shards: [d.contentRef],
				children: u.jsx(ke.div, {
					"data-state": rd(d.open),
					...f,
					ref: v,
					style: { pointerEvents: "auto", ...f.style },
				}),
			});
		}, "DialogOverlayImpl"),
	),
	Yr = "DialogContent",
	q0 = x.forwardRef(
		En((i, r) => {
			const o = Y0(Yr, i.__scopeDialog),
				{ forceMount: f = o.forceMount, ...d } = i,
				m = Xn(Yr, i.__scopeDialog);
			return u.jsx(Kr, {
				present: f || m.open,
				children: m.modal
					? u.jsx(lN, { ...d, ref: r })
					: u.jsx(iN, { ...d, ref: r }),
			});
		}, "DialogContent"),
	),
	lN = x.forwardRef(
		En((i, r) => {
			const o = Xn(Yr, i.__scopeDialog),
				f = x.useRef(null),
				d = He(r, o.contentRef, f);
			return (
				x.useEffect(() => {
					const m = f.current;
					if (m) return U0(m);
				}, []),
				u.jsx(X0, {
					...i,
					ref: d,
					trapFocus: o.open,
					disableOutsidePointerEvents: o.open,
					onCloseAutoFocus: Ne(i.onCloseAutoFocus, (m) => {
						var v;
						m.preventDefault(), (v = o.triggerRef.current) == null || v.focus();
					}),
					onPointerDownOutside: Ne(i.onPointerDownOutside, (m) => {
						const v = m.detail.originalEvent,
							y = v.button === 0 && v.ctrlKey === !0;
						(v.button === 2 || y) && m.preventDefault();
					}),
					onFocusOutside: Ne(i.onFocusOutside, (m) => m.preventDefault()),
				})
			);
		}, "DialogContentModal"),
	),
	iN = x.forwardRef(
		En((i, r) => {
			const o = Xn(Yr, i.__scopeDialog),
				f = x.useRef(!1),
				d = x.useRef(!1);
			return u.jsx(X0, {
				...i,
				ref: r,
				trapFocus: !1,
				disableOutsidePointerEvents: !1,
				onCloseAutoFocus: (m) => {
					var v, y;
					(v = i.onCloseAutoFocus) == null || v.call(i, m),
						m.defaultPrevented ||
							(f.current || (y = o.triggerRef.current) == null || y.focus(),
							m.preventDefault()),
						(f.current = !1),
						(d.current = !1);
				},
				onInteractOutside: (m) => {
					var g, S;
					(g = i.onInteractOutside) == null || g.call(i, m),
						m.defaultPrevented ||
							((f.current = !0),
							m.detail.originalEvent.type === "pointerdown" &&
								(d.current = !0));
					const v = m.target;
					((S = o.triggerRef.current) == null ? void 0 : S.contains(v)) &&
						m.preventDefault(),
						m.detail.originalEvent.type === "focusin" &&
							d.current &&
							m.preventDefault();
				},
			});
		}, "DialogContentNonModal"),
	),
	X0 = x.forwardRef(
		En((i, r) => {
			const {
					__scopeDialog: o,
					trapFocus: f,
					onOpenAutoFocus: d,
					onCloseAutoFocus: m,
					...v
				} = i,
				y = Xn(Yr, o);
			return (
				Bs(),
				u.jsx(u.Fragment, {
					children: u.jsx(y0, {
						asChild: !0,
						loop: !0,
						trapped: f,
						onMountAutoFocus: d,
						onUnmountAutoFocus: m,
						children: u.jsx(h0, {
							role: "dialog",
							id: y.contentId,
							"aria-describedby": y.descriptionPresent
								? y.descriptionId
								: void 0,
							"aria-labelledby": y.titlePresent ? y.titleId : void 0,
							"data-state": rd(y.open),
							...v,
							ref: r,
							deferPointerDownOutside: !0,
							onDismiss: () => y.onOpenChange(!1),
						}),
					}),
				})
			);
		}, "DialogContentImpl"),
	),
	rN = "DialogTitle",
	Q0 = x.forwardRef(
		En((i, r) => {
			const { __scopeDialog: o, ...f } = i,
				d = Xn(rN, o),
				{ setTitleCount: m } = d;
			return (
				st(() => (m((v) => v + 1), () => m((v) => v - 1)), [m]),
				u.jsx(ke.h2, { id: d.titleId, ...f, ref: r })
			);
		}, "DialogTitle"),
	),
	oN = "DialogDescription",
	P0 = x.forwardRef(
		En((i, r) => {
			const { __scopeDialog: o, ...f } = i,
				d = Xn(oN, o),
				{ setDescriptionCount: m } = d;
			return (
				st(() => (m((v) => v + 1), () => m((v) => v - 1)), [m]),
				u.jsx(ke.p, { id: d.descriptionId, ...f, ref: r })
			);
		}, "DialogDescription"),
	),
	sN = "DialogClose",
	cN = x.forwardRef(
		En((i, r) => {
			const { __scopeDialog: o, ...f } = i,
				d = Xn(sN, o);
			return u.jsx(ke.button, {
				type: "button",
				...f,
				ref: r,
				onClick: Ne(i.onClick, () => d.onOpenChange(!1)),
			});
		}, "DialogClose"),
	);
function rd(l) {
	return l ? "open" : "closed";
}
En(rd, "getState");
const uN = WE,
	fN = tN,
	I0 = x.forwardRef(({ className: l, ...i }, r) =>
		u.jsx(G0, {
			ref: r,
			className: $e(
				"fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
				l,
			),
			...i,
		}),
	);
I0.displayName = G0.displayName;
const K0 = x.forwardRef(({ className: l, children: i, ...r }, o) =>
	u.jsxs(fN, {
		children: [
			u.jsx(I0, {}),
			u.jsxs(q0, {
				ref: o,
				className: $e(
					"fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-2xl",
					l,
				),
				...r,
				children: [
					i,
					u.jsxs(cN, {
						className:
							"absolute right-4 top-4 rounded-full p-1.5 opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
						children: [
							u.jsx(t2, { className: "h-4 w-4" }),
							u.jsx("span", { className: "sr-only", children: "Close" }),
						],
					}),
				],
			}),
		],
	}),
);
K0.displayName = q0.displayName;
const Z0 = ({ className: l, ...i }) =>
	u.jsx("div", {
		className: $e("flex flex-col space-y-1.5 text-center sm:text-left", l),
		...i,
	});
Z0.displayName = "DialogHeader";
const $0 = ({ className: l, ...i }) =>
	u.jsx("div", {
		className: $e(
			"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2",
			l,
		),
		...i,
	});
$0.displayName = "DialogFooter";
const F0 = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx(Q0, {
		ref: r,
		className: $e(
			"text-lg font-semibold leading-none tracking-tight text-foreground",
			l,
		),
		...i,
	}),
);
F0.displayName = Q0.displayName;
const J0 = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx(P0, {
		ref: r,
		className: $e("text-sm text-muted-foreground", l),
		...i,
	}),
);
J0.displayName = P0.displayName;
var dN = Object.defineProperty,
	mN = (l, i) => dN(l, "name", { value: i, configurable: !0 });
function Gr(l, [i, r]) {
	return Math.min(r, Math.max(i, l));
}
mN(Gr, "clamp");
var hN = Object.defineProperty,
	Ct = (l, i) => hN(l, "name", { value: i, configurable: !0 });
function Hs(l) {
	const i = l + "CollectionProvider",
		[r, o] = qn(i),
		[f, d] = r(i, { collectionRef: { current: null }, itemMap: new Map() }),
		m = Ct((j) => {
			const { scope: N, children: T } = j,
				z = x.useRef(null),
				R = x.useRef(new Map()).current;
			return u.jsx(f, { scope: N, itemMap: R, collectionRef: z, children: T });
		}, "CollectionProvider");
	m.displayName = i;
	const v = l + "CollectionSlot",
		y = ga(v),
		g = x.forwardRef((j, N) => {
			const { scope: T, children: z } = j,
				R = d(v, T),
				O = He(N, R.collectionRef);
			return u.jsx(y, { ref: O, children: z });
		});
	g.displayName = v;
	const S = l + "CollectionItemSlot",
		h = "data-radix-collection-item",
		w = ga(S),
		E = x.forwardRef((j, N) => {
			const { scope: T, children: z, ...R } = j,
				O = x.useRef(null),
				L = He(N, O),
				Y = d(S, T);
			return (
				x.useEffect(
					() => (
						Y.itemMap.set(O, { ref: O, ...R }), () => void Y.itemMap.delete(O)
					),
				),
				u.jsx(w, { [h]: "", ref: L, children: z })
			);
		});
	E.displayName = S;
	function C(j) {
		const N = d(l + "CollectionConsumer", j);
		return x.useCallback(() => {
			const z = N.collectionRef.current;
			if (!z) return [];
			const R = Array.from(z.querySelectorAll(`[${h}]`));
			return Array.from(N.itemMap.values()).sort(
				(Y, X) => R.indexOf(Y.ref.current) - R.indexOf(X.ref.current),
			);
		}, [N.collectionRef, N.itemMap]);
	}
	return Ct(C, "useCollection"), [{ Provider: m, Slot: g, ItemSlot: E }, C, o];
}
Ct(Hs, "createCollection");
var ov = new WeakMap(),
	vt,
	cn,
	Ef =
		((cn = class extends Map {
			constructor(r) {
				super(r);
				Tg(this, vt);
				cf(this, vt, [...super.keys()]), ov.set(this, !0);
			}
			set(r, o) {
				return (
					ov.get(this) &&
						(this.has(r)
							? (zt(this, vt)[zt(this, vt).indexOf(r)] = r)
							: zt(this, vt).push(r)),
					super.set(r, o),
					this
				);
			}
			insert(r, o, f) {
				const d = this.has(o),
					m = zt(this, vt).length,
					v = od(r);
				let y = v >= 0 ? v : m + v;
				const g = y < 0 || y >= m ? -1 : y;
				if (g === this.size || (d && g === this.size - 1) || g === -1)
					return this.set(o, f), this;
				const S = this.size + (d ? 0 : 1);
				v < 0 && y++;
				const h = [...zt(this, vt)];
				let w,
					E = !1;
				for (let C = y; C < S; C++)
					if (y === C) {
						let j = h[C];
						h[C] === o && (j = h[C + 1]),
							d && this.delete(o),
							(w = this.get(j)),
							this.set(o, f);
					} else {
						!E && h[C - 1] === o && (E = !0);
						const j = h[E ? C : C - 1],
							N = w;
						(w = this.get(j)), this.delete(j), this.set(j, N);
					}
				return this;
			}
			with(r, o, f) {
				const d = new cn(this);
				return d.insert(r, o, f), d;
			}
			before(r) {
				const o = zt(this, vt).indexOf(r) - 1;
				if (!(o < 0)) return this.entryAt(o);
			}
			setBefore(r, o, f) {
				const d = zt(this, vt).indexOf(r);
				return d === -1 ? this : this.insert(d, o, f);
			}
			after(r) {
				let o = zt(this, vt).indexOf(r);
				if (((o = o === -1 || o === this.size - 1 ? -1 : o + 1), o !== -1))
					return this.entryAt(o);
			}
			setAfter(r, o, f) {
				const d = zt(this, vt).indexOf(r);
				return d === -1 ? this : this.insert(d + 1, o, f);
			}
			first() {
				return this.entryAt(0);
			}
			last() {
				return this.entryAt(-1);
			}
			clear() {
				return cf(this, vt, []), super.clear();
			}
			delete(r) {
				const o = super.delete(r);
				return o && zt(this, vt).splice(zt(this, vt).indexOf(r), 1), o;
			}
			deleteAt(r) {
				const o = this.keyAt(r);
				return o !== void 0 ? this.delete(o) : !1;
			}
			at(r) {
				const o = Rs(zt(this, vt), r);
				if (o !== void 0) return this.get(o);
			}
			entryAt(r) {
				const o = Rs(zt(this, vt), r);
				if (o !== void 0) return [o, this.get(o)];
			}
			indexOf(r) {
				return zt(this, vt).indexOf(r);
			}
			keyAt(r) {
				return Rs(zt(this, vt), r);
			}
			from(r, o) {
				const f = this.indexOf(r);
				if (f === -1) return;
				let d = f + o;
				return (
					d < 0 && (d = 0), d >= this.size && (d = this.size - 1), this.at(d)
				);
			}
			keyFrom(r, o) {
				const f = this.indexOf(r);
				if (f === -1) return;
				let d = f + o;
				return (
					d < 0 && (d = 0), d >= this.size && (d = this.size - 1), this.keyAt(d)
				);
			}
			find(r, o) {
				let f = 0;
				for (const d of this) {
					if (Reflect.apply(r, o, [d, f, this])) return d;
					f++;
				}
			}
			findIndex(r, o) {
				let f = 0;
				for (const d of this) {
					if (Reflect.apply(r, o, [d, f, this])) return f;
					f++;
				}
				return -1;
			}
			filter(r, o) {
				const f = [];
				let d = 0;
				for (const m of this)
					Reflect.apply(r, o, [m, d, this]) && f.push(m), d++;
				return new cn(f);
			}
			map(r, o) {
				const f = [];
				let d = 0;
				for (const m of this)
					f.push([m[0], Reflect.apply(r, o, [m, d, this])]), d++;
				return new cn(f);
			}
			reduce(...r) {
				const [o, f] = r;
				let d = 0,
					m = f ?? this.at(0);
				for (const v of this)
					d === 0 && r.length === 1
						? (m = v)
						: (m = Reflect.apply(o, this, [m, v, d, this])),
						d++;
				return m;
			}
			reduceRight(...r) {
				const [o, f] = r;
				let d = f ?? this.at(-1);
				for (let m = this.size - 1; m >= 0; m--) {
					const v = this.at(m);
					m === this.size - 1 && r.length === 1
						? (d = v)
						: (d = Reflect.apply(o, this, [d, v, m, this]));
				}
				return d;
			}
			toSorted(r) {
				const o = [...this.entries()].sort(r);
				return new cn(o);
			}
			toReversed() {
				const r = new cn();
				for (let o = this.size - 1; o >= 0; o--) {
					const f = this.keyAt(o),
						d = this.get(f);
					r.set(f, d);
				}
				return r;
			}
			toSpliced(...r) {
				const o = [...this.entries()];
				return o.splice(...r), new cn(o);
			}
			slice(r, o) {
				const f = new cn();
				let d = this.size - 1;
				if (r === void 0) return f;
				r < 0 && (r = r + this.size), o !== void 0 && o > 0 && (d = o - 1);
				for (let m = r; m <= d; m++) {
					const v = this.keyAt(m),
						y = this.get(v);
					f.set(v, y);
				}
				return f;
			}
			every(r, o) {
				let f = 0;
				for (const d of this) {
					if (!Reflect.apply(r, o, [d, f, this])) return !1;
					f++;
				}
				return !0;
			}
			some(r, o) {
				let f = 0;
				for (const d of this) {
					if (Reflect.apply(r, o, [d, f, this])) return !0;
					f++;
				}
				return !1;
			}
		}),
		(vt = new WeakMap()),
		Ct(cn, "OrderedDict"),
		cn);
function Rs(l, i) {
	if ("at" in Array.prototype) return Array.prototype.at.call(l, i);
	const r = W0(l, i);
	return r === -1 ? void 0 : l[r];
}
Ct(Rs, "at");
function W0(l, i) {
	const r = l.length,
		o = od(i),
		f = o >= 0 ? o : r + o;
	return f < 0 || f >= r ? -1 : f;
}
Ct(W0, "toSafeIndex");
function od(l) {
	return l !== l || l === 0 ? 0 : Math.trunc(l);
}
Ct(od, "toSafeInteger");
function pN(l) {
	const i = l + "CollectionProvider",
		[r, o] = qn(i),
		[f, d] = r(i, {
			collectionElement: null,
			collectionRef: { current: null },
			collectionRefObject: { current: null },
			itemMap: new Ef(),
			setItemMap: Ct(() => {}, "setItemMap"),
		}),
		m = Ct(
			({ state: R, ...O }) =>
				R ? u.jsx(y, { ...O, state: R }) : u.jsx(v, { ...O }),
			"CollectionProvider",
		);
	m.displayName = i;
	const v = Ct((R) => {
		const O = N();
		return u.jsx(y, { ...R, state: O });
	}, "CollectionInit");
	v.displayName = i + "Init";
	const y = Ct((R) => {
		const { scope: O, children: L, state: Y } = R,
			X = x.useRef(null),
			[q, J] = x.useState(null),
			ee = He(X, J),
			[ce, te] = Y;
		return (
			x.useEffect(() => {
				if (!q) return;
				const se = ny(() => {});
				return (
					se.observe(q, { childList: !0, subtree: !0 }),
					() => {
						se.disconnect();
					}
				);
			}, [q]),
			u.jsx(f, {
				scope: O,
				itemMap: ce,
				setItemMap: te,
				collectionRef: ee,
				collectionRefObject: X,
				collectionElement: q,
				children: L,
			})
		);
	}, "CollectionProviderImpl");
	y.displayName = i + "Impl";
	const g = l + "CollectionSlot",
		S = ga(g),
		h = x.forwardRef((R, O) => {
			const { scope: L, children: Y } = R,
				X = d(g, L),
				q = He(O, X.collectionRef);
			return u.jsx(S, { ref: q, children: Y });
		});
	h.displayName = g;
	const w = l + "CollectionItemSlot",
		E = "data-radix-collection-item",
		C = ga(w),
		j = x.forwardRef((R, O) => {
			const { scope: L, children: Y, ...X } = R,
				q = x.useRef(null),
				[J, ee] = x.useState(null),
				ce = He(O, q, ee),
				te = d(w, L),
				{ setItemMap: se } = te,
				le = x.useRef(X);
			ey(le.current, X) || (le.current = X);
			const ue = le.current;
			return (
				x.useEffect(() => {
					const M = ue;
					return (
						se((H) =>
							J
								? H.has(J)
									? H.set(J, { ...M, element: J }).toSorted(Gf)
									: (H.set(J, { ...M, element: J }), H.toSorted(Gf))
								: H,
						),
						() => {
							se((H) => (!J || !H.has(J) ? H : (H.delete(J), new Ef(H))));
						}
					);
				}, [J, ue, se]),
				u.jsx(C, { [E]: "", ref: ce, children: Y })
			);
		});
	j.displayName = w;
	function N() {
		return x.useState(new Ef());
	}
	Ct(N, "useInitCollection");
	function T(R) {
		const { itemMap: O } = d(l + "CollectionConsumer", R);
		return O;
	}
	return (
		Ct(T, "useCollection"),
		[
			{ Provider: m, Slot: h, ItemSlot: j },
			{ createCollectionScope: o, useCollection: T, useInitCollection: N },
		]
	);
}
Ct(pN, "createCollection");
function ey(l, i) {
	if (l === i) return !0;
	if (typeof l != "object" || typeof i != "object" || l == null || i == null)
		return !1;
	const r = Object.keys(l),
		o = Object.keys(i);
	if (r.length !== o.length) return !1;
	for (const f of r) if (!Object.hasOwn(i, f) || l[f] !== i[f]) return !1;
	return !0;
}
Ct(ey, "shallowEqual");
function ty(l, i) {
	return !!(i.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_PRECEDING);
}
Ct(ty, "isElementPreceding");
function Gf(l, i) {
	return !l[1].element || !i[1].element
		? 0
		: ty(l[1].element, i[1].element)
			? -1
			: 1;
}
Ct(Gf, "sortByDocumentPosition");
function ny(l) {
	return new MutationObserver((r) => {
		for (const o of r)
			if (o.type === "childList") {
				l();
				return;
			}
	});
}
Ct(ny, "getChildListObserver");
var gN = Object.defineProperty,
	vN = (l, i) => gN(l, "name", { value: i, configurable: !0 }),
	yN = x.createContext(void 0);
function Zr(l) {
	const i = x.useContext(yN);
	return l || i || "ltr";
}
vN(Zr, "useDirection");
const xN = ["top", "right", "bottom", "left"],
	nl = Math.min,
	da = Math.max,
	Ds = Math.round,
	js = Math.floor,
	ma = (l) => ({ x: l, y: l }),
	bN = { left: "right", right: "left", bottom: "top", top: "bottom" };
function ay(l, i, r) {
	return da(l, nl(i, r));
}
function ya(l, i) {
	return typeof l == "function" ? l(i) : l;
}
function al(l) {
	return l.split("-")[0];
}
function Xi(l) {
	return l.split("-")[1];
}
function sd(l) {
	return l === "x" ? "y" : "x";
}
function cd(l) {
	return l === "y" ? "height" : "width";
}
function Vn(l) {
	const i = l[0];
	return i === "t" || i === "b" ? "y" : "x";
}
function ud(l) {
	return sd(Vn(l));
}
function SN(l, i, r) {
	r === void 0 && (r = !1);
	const o = Xi(l),
		f = ud(l),
		d = cd(f);
	let m =
		f === "x"
			? o === (r ? "end" : "start")
				? "right"
				: "left"
			: o === "start"
				? "bottom"
				: "top";
	return i.reference[d] > i.floating[d] && (m = zs(m)), [m, zs(m)];
}
function wN(l) {
	const i = zs(l);
	return [qf(l), i, qf(i)];
}
function qf(l) {
	return l.includes("start")
		? l.replace("start", "end")
		: l.replace("end", "start");
}
const sv = ["left", "right"],
	cv = ["right", "left"],
	EN = ["top", "bottom"],
	NN = ["bottom", "top"];
function CN(l, i, r) {
	switch (l) {
		case "top":
		case "bottom":
			return r ? (i ? cv : sv) : i ? sv : cv;
		case "left":
		case "right":
			return i ? EN : NN;
		default:
			return [];
	}
}
function jN(l, i, r, o) {
	const f = Xi(l);
	let d = CN(al(l), r === "start", o);
	return (
		f && ((d = d.map((m) => m + "-" + f)), i && (d = d.concat(d.map(qf)))), d
	);
}
function zs(l) {
	const i = al(l);
	return bN[i] + l.slice(i.length);
}
function TN(l) {
	var i, r, o, f;
	return {
		top: (i = l.top) != null ? i : 0,
		right: (r = l.right) != null ? r : 0,
		bottom: (o = l.bottom) != null ? o : 0,
		left: (f = l.left) != null ? f : 0,
	};
}
function ly(l) {
	return typeof l != "number"
		? TN(l)
		: { top: l, right: l, bottom: l, left: l };
}
function ks(l) {
	const { x: i, y: r, width: o, height: f } = l;
	return {
		width: o,
		height: f,
		top: r,
		left: i,
		right: i + o,
		bottom: r + f,
		x: i,
		y: r,
	};
}
function uv(l, i, r) {
	const { reference: o, floating: f } = l;
	const d = Vn(i),
		m = ud(i),
		v = cd(m),
		y = al(i),
		g = d === "y",
		S = o.x + o.width / 2 - f.width / 2,
		h = o.y + o.height / 2 - f.height / 2,
		w = o[v] / 2 - f[v] / 2;
	let E;
	switch (y) {
		case "top":
			E = { x: S, y: o.y - f.height };
			break;
		case "bottom":
			E = { x: S, y: o.y + o.height };
			break;
		case "right":
			E = { x: o.x + o.width, y: h };
			break;
		case "left":
			E = { x: o.x - f.width, y: h };
			break;
		default:
			E = { x: o.x, y: o.y };
	}
	const C = Xi(i);
	return C && (E[m] += w * (C === "end" ? 1 : -1) * (r && g ? -1 : 1)), E;
}
async function _N(l, i) {
	var r;
	i === void 0 && (i = {});
	const { x: o, y: f, platform: d, rects: m, elements: v, strategy: y } = l,
		{
			boundary: g = "clippingAncestors",
			rootBoundary: S = "viewport",
			elementContext: h = "floating",
			altBoundary: w = !1,
			padding: E = 0,
		} = ya(i, l),
		C = ly(E),
		N = v[w ? (h === "floating" ? "reference" : "floating") : h],
		T = ks(
			await d.getClippingRect({
				element:
					(r = await (d.isElement == null ? void 0 : d.isElement(N))) == null ||
					r
						? N
						: N.contextElement ||
							(await (d.getDocumentElement == null
								? void 0
								: d.getDocumentElement(v.floating))),
				boundary: g,
				rootBoundary: S,
				strategy: y,
			}),
		),
		z =
			h === "floating"
				? { x: o, y: f, width: m.floating.width, height: m.floating.height }
				: m.reference,
		R = await (d.getOffsetParent == null
			? void 0
			: d.getOffsetParent(v.floating)),
		O = ((await (d.isElement == null ? void 0 : d.isElement(R))) &&
			(await (d.getScale == null ? void 0 : d.getScale(R)))) || { x: 1, y: 1 },
		L = ks(
			d.convertOffsetParentRelativeRectToViewportRelativeRect
				? await d.convertOffsetParentRelativeRectToViewportRelativeRect({
						elements: v,
						rect: z,
						offsetParent: R,
						strategy: y,
					})
				: z,
		);
	return {
		top: (T.top - L.top + C.top) / O.y,
		bottom: (L.bottom - T.bottom + C.bottom) / O.y,
		left: (T.left - L.left + C.left) / O.x,
		right: (L.right - T.right + C.right) / O.x,
	};
}
const AN = 50,
	RN = async (l, i, r) => {
		const {
				placement: o = "bottom",
				strategy: f = "absolute",
				middleware: d = [],
				platform: m,
			} = r,
			v = m.detectOverflow ? m : { ...m, detectOverflow: _N },
			y = await (m.isRTL == null ? void 0 : m.isRTL(i));
		let g = await m.getElementRects({ reference: l, floating: i, strategy: f }),
			{ x: S, y: h } = uv(g, o, y),
			w = o,
			E = 0;
		const C = {};
		for (let j = 0; j < d.length; j++) {
			const N = d[j];
			if (!N) continue;
			const { name: T, fn: z } = N,
				{
					x: R,
					y: O,
					data: L,
					reset: Y,
				} = await z({
					x: S,
					y: h,
					initialPlacement: o,
					placement: w,
					strategy: f,
					middlewareData: C,
					rects: g,
					platform: v,
					elements: { reference: l, floating: i },
				});
			(S = R ?? S),
				(h = O ?? h),
				(C[T] = { ...C[T], ...L }),
				Y &&
					E < AN &&
					(E++,
					typeof Y == "object" &&
						(Y.placement && (w = Y.placement),
						Y.rects &&
							(g =
								Y.rects === !0
									? await m.getElementRects({
											reference: l,
											floating: i,
											strategy: f,
										})
									: Y.rects),
						({ x: S, y: h } = uv(g, w, y))),
					(j = -1));
		}
		return { x: S, y: h, placement: w, strategy: f, middlewareData: C };
	},
	MN = (l) => ({
		name: "arrow",
		options: l,
		async fn(i) {
			const {
					x: r,
					y: o,
					placement: f,
					rects: d,
					platform: m,
					elements: v,
					middlewareData: y,
				} = i,
				{ element: g, padding: S = 0 } = ya(l, i) || {};
			if (g == null) return {};
			const h = ly(S),
				w = { x: r, y: o },
				E = ud(f),
				C = cd(E),
				j = await m.getDimensions(g),
				N = E === "y",
				T = N ? "top" : "left",
				z = N ? "bottom" : "right",
				R = N ? "clientHeight" : "clientWidth",
				O = d.reference[C] + d.reference[E] - w[E] - d.floating[C],
				L = w[E] - d.reference[E],
				Y = await (m.getOffsetParent == null ? void 0 : m.getOffsetParent(g));
			let X = Y ? Y[R] : 0;
			(!X || !(await (m.isElement == null ? void 0 : m.isElement(Y)))) &&
				(X = v.floating[R] || d.floating[C]);
			const q = O / 2 - L / 2,
				J = X / 2 - j[C] / 2 - 1,
				ee = nl(h[T], J),
				ce = nl(h[z], J),
				te = X - j[C] - ce,
				se = X / 2 - j[C] / 2 + q,
				le = ay(ee, se, te),
				ue =
					!y.arrow &&
					Xi(f) != null &&
					se !== le &&
					d.reference[C] / 2 - (se < ee ? ee : ce) - j[C] / 2 < 0,
				M = ue ? (se < ee ? se - ee : se - te) : 0;
			return {
				[E]: w[E] + M,
				data: {
					[E]: le,
					centerOffset: se - le - M,
					...(ue && { alignmentOffset: M }),
				},
				reset: ue,
			};
		},
	}),
	ON = (l) => (
		l === void 0 && (l = {}),
		{
			name: "flip",
			options: l,
			async fn(i) {
				var r, o;
				const {
						placement: f,
						middlewareData: d,
						rects: m,
						initialPlacement: v,
						platform: y,
						elements: g,
					} = i,
					{
						mainAxis: S = !0,
						crossAxis: h = !0,
						fallbackPlacements: w,
						fallbackStrategy: E = "bestFit",
						fallbackAxisSideDirection: C = "none",
						flipAlignment: j = !0,
						...N
					} = ya(l, i);
				if ((r = d.arrow) != null && r.alignmentOffset) return {};
				const T = al(f),
					z = Vn(v),
					R = al(v) === v,
					O = await (y.isRTL == null ? void 0 : y.isRTL(g.floating)),
					L = w || (R || !j ? [zs(v)] : wN(v)),
					Y = C !== "none";
				!w && Y && L.push(...jN(v, j, C, O));
				const X = [v, ...L],
					q = await y.detectOverflow(i, N),
					J = [];
				let ee = ((o = d.flip) == null ? void 0 : o.overflows) || [];
				if ((S && J.push(q[T]), h)) {
					const le = SN(f, m, O);
					J.push(q[le[0]], q[le[1]]);
				}
				if (
					((ee = [...ee, { placement: f, overflows: J }]),
					!J.every((le) => le <= 0))
				) {
					var ce, te;
					const le = (((ce = d.flip) == null ? void 0 : ce.index) || 0) + 1,
						ue = X[le];
					if (
						ue &&
						(!(h === "alignment" ? z !== Vn(ue) : !1) ||
							ee.every((Z) =>
								Vn(Z.placement) === z ? Z.overflows[0] > 0 : !0,
							))
					)
						return {
							data: { index: le, overflows: ee },
							reset: { placement: ue },
						};
					let M =
						(te = ee
							.filter((H) => H.overflows[0] <= 0)
							.sort((H, Z) => H.overflows[1] - Z.overflows[1])[0]) == null
							? void 0
							: te.placement;
					if (!M)
						switch (E) {
							case "bestFit": {
								var se;
								const H =
									(se = ee
										.filter((Z) => {
											if (Y) {
												const re = Vn(Z.placement);
												return re === z || re === "y";
											}
											return !0;
										})
										.map((Z) => [
											Z.placement,
											Z.overflows
												.filter((re) => re > 0)
												.reduce((re, F) => re + F, 0),
										])
										.sort((Z, re) => Z[1] - re[1])[0]) == null
										? void 0
										: se[0];
								H && (M = H);
								break;
							}
							case "initialPlacement":
								M = v;
								break;
						}
					if (f !== M) return { reset: { placement: M } };
				}
				return {};
			},
		}
	);
function fv(l, i) {
	return {
		top: l.top - i.height,
		right: l.right - i.width,
		bottom: l.bottom - i.height,
		left: l.left - i.width,
	};
}
function dv(l) {
	return xN.some((i) => l[i] >= 0);
}
const DN = (l) => (
		l === void 0 && (l = {}),
		{
			name: "hide",
			options: l,
			async fn(i) {
				const { rects: r, platform: o } = i,
					{ strategy: f = "referenceHidden", ...d } = ya(l, i);
				switch (f) {
					case "referenceHidden": {
						const m = await o.detectOverflow(i, {
								...d,
								elementContext: "reference",
							}),
							v = fv(m, r.reference);
						return {
							data: { referenceHiddenOffsets: v, referenceHidden: dv(v) },
						};
					}
					case "escaped": {
						const m = await o.detectOverflow(i, { ...d, altBoundary: !0 }),
							v = fv(m, r.floating);
						return { data: { escapedOffsets: v, escaped: dv(v) } };
					}
					default:
						return {};
				}
			},
		}
	),
	iy = new Set(["left", "top"]);
async function zN(l, i) {
	const { placement: r, platform: o, elements: f } = l,
		d = await (o.isRTL == null ? void 0 : o.isRTL(f.floating)),
		m = al(r),
		v = Xi(r),
		y = Vn(r) === "y",
		g = iy.has(m) ? -1 : 1,
		S = d && y ? -1 : 1,
		h = ya(i, l);
	let {
		mainAxis: w,
		crossAxis: E,
		alignmentAxis: C,
	} = typeof h == "number"
		? { mainAxis: h, crossAxis: 0, alignmentAxis: null }
		: {
				mainAxis: h.mainAxis || 0,
				crossAxis: h.crossAxis || 0,
				alignmentAxis: h.alignmentAxis,
			};
	return (
		v && typeof C == "number" && (E = v === "end" ? C * -1 : C),
		y ? { x: E * S, y: w * g } : { x: w * g, y: E * S }
	);
}
const kN = (l) => (
		l === void 0 && (l = 0),
		{
			name: "offset",
			options: l,
			async fn(i) {
				var r, o;
				const { x: f, y: d, placement: m, middlewareData: v } = i,
					y = await zN(i, l);
				return m === ((r = v.offset) == null ? void 0 : r.placement) &&
					(o = v.arrow) != null &&
					o.alignmentOffset
					? {}
					: { x: f + y.x, y: d + y.y, data: { ...y, placement: m } };
			},
		}
	),
	LN = (l) => (
		l === void 0 && (l = {}),
		{
			name: "shift",
			options: l,
			async fn(i) {
				const { x: r, y: o, placement: f, platform: d } = i,
					{
						mainAxis: m = !0,
						crossAxis: v = !1,
						limiter: y = {
							fn: (z) => {
								const { x: R, y: O } = z;
								return { x: R, y: O };
							},
						},
						...g
					} = ya(l, i),
					S = { x: r, y: o },
					h = await d.detectOverflow(i, g),
					w = Vn(f),
					E = sd(w);
				let C = S[E],
					j = S[w];
				const N = (z, R) =>
					ay(
						R + h[z === "y" ? "top" : "left"],
						R,
						R - h[z === "y" ? "bottom" : "right"],
					);
				m && (C = N(E, C)), v && (j = N(w, j));
				const T = y.fn({ ...i, [E]: C, [w]: j });
				return {
					...T,
					data: { x: T.x - r, y: T.y - o, enabled: { [E]: m, [w]: v } },
				};
			},
		}
	),
	BN = (l) => (
		l === void 0 && (l = {}),
		{
			options: l,
			fn(i) {
				var r, o;
				const { x: f, y: d, placement: m, rects: v, middlewareData: y } = i,
					{ offset: g = 0, mainAxis: S = !0, crossAxis: h = !0 } = ya(l, i),
					w = { x: f, y: d },
					E = Vn(m),
					C = sd(E);
				let j = w[C],
					N = w[E];
				const T = ya(g, i),
					z =
						typeof T == "number"
							? { mainAxis: T, crossAxis: 0 }
							: {
									mainAxis: (r = T.mainAxis) != null ? r : 0,
									crossAxis: (o = T.crossAxis) != null ? o : 0,
								};
				if (S) {
					const L = C === "y" ? "height" : "width",
						Y = v.reference[C] - v.floating[L] + z.mainAxis,
						X = v.reference[C] + v.reference[L] - z.mainAxis;
					j < Y ? (j = Y) : j > X && (j = X);
				}
				if (h) {
					var R, O;
					const L = C === "y" ? "width" : "height",
						Y = iy.has(al(m)),
						X =
							v.reference[E] -
							v.floating[L] +
							((Y && ((R = y.offset) == null ? void 0 : R[E])) || 0) +
							(Y ? 0 : z.crossAxis),
						q =
							v.reference[E] +
							v.reference[L] +
							(Y ? 0 : ((O = y.offset) == null ? void 0 : O[E]) || 0) -
							(Y ? z.crossAxis : 0);
					N < X ? (N = X) : N > q && (N = q);
				}
				return { [C]: j, [E]: N };
			},
		}
	),
	UN = (l) => (
		l === void 0 && (l = {}),
		{
			name: "size",
			options: l,
			async fn(i) {
				const { placement: r, rects: o, platform: f, elements: d } = i,
					{ apply: m = () => {}, ...v } = ya(l, i),
					y = await f.detectOverflow(i, v),
					g = al(r),
					S = Xi(r),
					h = Vn(r) === "y",
					{ width: w, height: E } = o.floating;
				let C, j;
				g === "top" || g === "bottom"
					? ((C = g),
						(j =
							S ===
							((await (f.isRTL == null ? void 0 : f.isRTL(d.floating)))
								? "start"
								: "end")
								? "left"
								: "right"))
					: ((j = g), (C = S === "end" ? "top" : "bottom"));
				const N = E - y.top - y.bottom,
					T = w - y.left - y.right,
					z = nl(E - y[C], N),
					R = nl(w - y[j], T),
					O = i.middlewareData.shift,
					L = !O;
				let Y = z,
					X = R;
				O != null && O.enabled.x && (X = T),
					O != null && O.enabled.y && (Y = N),
					L &&
						!S &&
						(h
							? (X = w - 2 * da(y.left, y.right))
							: (Y = E - 2 * da(y.top, y.bottom))),
					await m({ ...i, availableWidth: X, availableHeight: Y });
				const q = await f.getDimensions(d.floating);
				return w !== q.width || E !== q.height ? { reset: { rects: !0 } } : {};
			},
		}
	);
function Vs() {
	return typeof window < "u";
}
function Qi(l) {
	return ry(l) ? (l.nodeName || "").toLowerCase() : "#document";
}
function Jt(l) {
	var i;
	return (
		(l == null || (i = l.ownerDocument) == null ? void 0 : i.defaultView) ||
		window
	);
}
function Sa(l) {
	var i;
	return (i = (ry(l) ? l.ownerDocument : l.document) || window.document) == null
		? void 0
		: i.documentElement;
}
function ry(l) {
	return Vs() ? l instanceof Node || l instanceof Jt(l).Node : !1;
}
function Yn(l) {
	return Vs() ? l instanceof Element || l instanceof Jt(l).Element : !1;
}
function ol(l) {
	return Vs() ? l instanceof HTMLElement || l instanceof Jt(l).HTMLElement : !1;
}
function mv(l) {
	return !Vs() || typeof ShadowRoot > "u"
		? !1
		: l instanceof ShadowRoot || l instanceof Jt(l).ShadowRoot;
}
function Ys(l) {
	const { overflow: i, overflowX: r, overflowY: o, display: f } = Gn(l);
	return (
		/auto|scroll|overlay|hidden|clip/.test(i + o + r) &&
		f !== "inline" &&
		f !== "contents"
	);
}
function HN(l) {
	return /^(table|td|th)$/.test(Qi(l));
}
function Gs(l) {
	try {
		if (l.matches(":popover-open")) return !0;
	} catch {}
	try {
		return l.matches(":modal");
	} catch {
		return !1;
	}
}
const VN = /transform|translate|scale|rotate|perspective|filter/,
	YN = /paint|layout|strict|content/,
	zl = (l) => !!l && l !== "none";
let Nf;
function fd(l) {
	const i = Yn(l) ? Gn(l) : l;
	return (
		zl(i.transform) ||
		zl(i.translate) ||
		zl(i.scale) ||
		zl(i.rotate) ||
		zl(i.perspective) ||
		(!dd() && (zl(i.backdropFilter) || zl(i.filter))) ||
		VN.test(i.willChange || "") ||
		YN.test(i.contain || "")
	);
}
function GN(l) {
	let i = Ll(l);
	for (; ol(i) && !qr(i); ) {
		if (fd(i)) return i;
		if (Gs(i)) return null;
		i = Ll(i);
	}
	return null;
}
function dd() {
	return (
		Nf == null &&
			(Nf =
				typeof CSS < "u" &&
				CSS.supports &&
				CSS.supports("-webkit-backdrop-filter", "none")),
		Nf
	);
}
function qr(l) {
	return /^(html|body|#document)$/.test(Qi(l));
}
function Gn(l) {
	return Jt(l).getComputedStyle(l);
}
function qs(l) {
	return Yn(l)
		? { scrollLeft: l.scrollLeft, scrollTop: l.scrollTop }
		: { scrollLeft: l.scrollX, scrollTop: l.scrollY };
}
function Ll(l) {
	if (Qi(l) === "html") return l;
	const i = l.assignedSlot || l.parentNode || (mv(l) && l.host) || Sa(l);
	return mv(i) ? i.host : i;
}
function oy(l) {
	const i = Ll(l);
	return qr(i) ? (l.ownerDocument || l).body : ol(i) && Ys(i) ? i : oy(i);
}
function Xr(l, i, r) {
	var o;
	i === void 0 && (i = []), r === void 0 && (r = !0);
	const f = oy(l),
		d = f === ((o = l.ownerDocument) == null ? void 0 : o.body),
		m = Jt(f);
	if (d) {
		const v = Xf(m);
		return i.concat(
			m,
			m.visualViewport || [],
			Ys(f) ? f : [],
			v && r ? Xr(v) : [],
		);
	} else return i.concat(f, Xr(f, [], r));
}
function Xf(l) {
	return l.parent && Object.getPrototypeOf(l.parent) ? l.frameElement : null;
}
function sy(l) {
	const i = Gn(l);
	let r = parseFloat(i.width) || 0,
		o = parseFloat(i.height) || 0;
	const f = ol(l),
		d = f ? l.offsetWidth : r,
		m = f ? l.offsetHeight : o,
		v = Ds(r) !== d || Ds(o) !== m;
	return v && ((r = d), (o = m)), { width: r, height: o, $: v };
}
function md(l) {
	return Yn(l) ? l : l.contextElement;
}
function Ui(l) {
	const i = md(l);
	if (!ol(i)) return ma(1);
	const r = i.getBoundingClientRect(),
		{ width: o, height: f, $: d } = sy(i);
	let m = (d ? Ds(r.width) : r.width) / o,
		v = (d ? Ds(r.height) : r.height) / f;
	return (
		(!m || !Number.isFinite(m)) && (m = 1),
		(!v || !Number.isFinite(v)) && (v = 1),
		{ x: m, y: v }
	);
}
const qN = ma(0);
function cy(l) {
	const i = Jt(l);
	return !dd() || !i.visualViewport
		? qN
		: { x: i.visualViewport.offsetLeft, y: i.visualViewport.offsetTop };
}
function XN(l, i, r) {
	return i === void 0 && (i = !1), !!r && i && r === Jt(l);
}
function Bl(l, i, r, o) {
	i === void 0 && (i = !1), r === void 0 && (r = !1);
	const f = l.getBoundingClientRect(),
		d = md(l);
	let m = ma(1);
	i && (o ? Yn(o) && (m = Ui(o)) : (m = Ui(l)));
	const v = XN(d, r, o) ? cy(d) : ma(0);
	let y = (f.left + v.x) / m.x,
		g = (f.top + v.y) / m.y,
		S = f.width / m.x,
		h = f.height / m.y;
	if (d && o) {
		const w = Jt(d),
			E = Yn(o) ? Jt(o) : o;
		let C = w,
			j = Xf(C);
		for (; j && E !== C; ) {
			const N = Ui(j),
				T = j.getBoundingClientRect(),
				z = Gn(j),
				R = T.left + (j.clientLeft + parseFloat(z.paddingLeft)) * N.x,
				O = T.top + (j.clientTop + parseFloat(z.paddingTop)) * N.y;
			(y *= N.x),
				(g *= N.y),
				(S *= N.x),
				(h *= N.y),
				(y += R),
				(g += O),
				(C = Jt(j)),
				(j = Xf(C));
		}
	}
	return ks({ width: S, height: h, x: y, y: g });
}
function Xs(l, i) {
	const r = qs(l).scrollLeft;
	return i ? i.left + r : Bl(Sa(l)).left + r;
}
function uy(l, i) {
	const r = l.getBoundingClientRect(),
		o = r.left + i.scrollLeft - Xs(l, r),
		f = r.top + i.scrollTop;
	return { x: o, y: f };
}
function QN(l) {
	const { elements: i, rect: r, offsetParent: o, strategy: f } = l;
	const d = f === "fixed",
		m = Sa(o),
		v = i ? Gs(i.floating) : !1;
	if (o === m || (v && d)) return r;
	let y = { scrollLeft: 0, scrollTop: 0 },
		g = ma(1);
	const S = ma(0),
		h = ol(o);
	if ((h || !d) && ((Qi(o) !== "body" || Ys(m)) && (y = qs(o)), h)) {
		const E = Bl(o);
		(g = Ui(o)), (S.x = E.x + o.clientLeft), (S.y = E.y + o.clientTop);
	}
	const w = m && !h && !d ? uy(m, y) : ma(0);
	return {
		width: r.width * g.x,
		height: r.height * g.y,
		x: r.x * g.x - y.scrollLeft * g.x + S.x + w.x,
		y: r.y * g.y - y.scrollTop * g.y + S.y + w.y,
	};
}
function PN(l) {
	return l.getClientRects ? Array.from(l.getClientRects()) : [];
}
function IN(l) {
	const i = qs(l),
		r = l.ownerDocument.body,
		o = da(l.scrollWidth, l.clientWidth, r.scrollWidth, r.clientWidth),
		f = da(l.scrollHeight, l.clientHeight, r.scrollHeight, r.clientHeight);
	let d = -i.scrollLeft + Xs(l);
	const m = -i.scrollTop;
	return (
		Gn(r).direction === "rtl" && (d += da(l.clientWidth, r.clientWidth) - o),
		{ width: o, height: f, x: d, y: m }
	);
}
const KN = 25;
function ZN(l, i, r) {
	r === void 0 && (r = "viewport");
	const o = r === "layoutViewport",
		f = Jt(l),
		d = Sa(l),
		m = f.visualViewport;
	let v = d.clientWidth,
		y = d.clientHeight,
		g = 0,
		S = 0;
	if (m) {
		const w = !dd() || i === "fixed";
		o
			? w || ((g = -m.offsetLeft), (S = -m.offsetTop))
			: ((v = m.width),
				(y = m.height),
				w && ((g = m.offsetLeft), (S = m.offsetTop)));
	}
	if (Xs(d) <= 0) {
		const w = d.ownerDocument,
			E = w.body,
			C = getComputedStyle(E),
			j =
				(w.compatMode === "CSS1Compat" &&
					parseFloat(C.marginLeft) + parseFloat(C.marginRight)) ||
				0,
			N = Math.abs(d.clientWidth - E.clientWidth - j),
			T =
				getComputedStyle(d).scrollbarGutter === "stable both-edges" ? N / 2 : N;
		T <= KN && (v -= T);
	}
	return { width: v, height: y, x: g, y: S };
}
function $N(l, i) {
	const r = Bl(l, !0, i === "fixed"),
		o = r.top + l.clientTop,
		f = r.left + l.clientLeft,
		d = Ui(l),
		m = l.clientWidth * d.x,
		v = l.clientHeight * d.y,
		y = f * d.x,
		g = o * d.y;
	return { width: m, height: v, x: y, y: g };
}
function hv(l, i, r) {
	let o;
	if (i === "viewport" || i === "layoutViewport") o = ZN(l, r, i);
	else if (i === "document") o = IN(Sa(l));
	else if (Yn(i)) o = $N(i, r);
	else {
		const f = cy(l);
		o = { x: i.x - f.x, y: i.y - f.y, width: i.width, height: i.height };
	}
	return ks(o);
}
function FN(l, i) {
	const r = i.get(l);
	if (r) return r;
	let o = Xr(l, [], !1).filter((v) => Yn(v) && Qi(v) !== "body"),
		f = null;
	const d = Gn(l).position === "fixed";
	let m = d ? Ll(l) : l;
	for (; Yn(m) && !qr(m); ) {
		const v = Gn(m),
			y = fd(m),
			g = f ? f.position : d ? "fixed" : "";
		!y && (g === "fixed" || (g === "absolute" && v.position === "static"))
			? (o = o.filter((h) => h !== m))
			: (f = v),
			(m = Ll(m));
	}
	return i.set(l, o), o;
}
function JN(l) {
	const { element: i, boundary: r, rootBoundary: o, strategy: f } = l;
	const m = [
			...(r === "clippingAncestors"
				? Gs(i)
					? []
					: FN(i, this._c)
				: [].concat(r)),
			o,
		],
		v = hv(i, m[0], f);
	let y = v.top,
		g = v.right,
		S = v.bottom,
		h = v.left;
	for (let w = 1; w < m.length; w++) {
		const E = hv(i, m[w], f);
		(y = da(E.top, y)),
			(g = nl(E.right, g)),
			(S = nl(E.bottom, S)),
			(h = da(E.left, h));
	}
	return { width: g - h, height: S - y, x: h, y };
}
function WN(l) {
	const { width: i, height: r } = sy(l);
	return { width: i, height: r };
}
function eC(l, i, r) {
	const o = ol(i),
		f = Sa(i),
		d = r === "fixed",
		m = Bl(l, !0, d, i);
	let v = { scrollLeft: 0, scrollTop: 0 };
	const y = ma(0);
	if ((o || !d) && ((Qi(i) !== "body" || Ys(f)) && (v = qs(i)), o)) {
		const w = Bl(i, !0, d, i);
		(y.x = w.x + i.clientLeft), (y.y = w.y + i.clientTop);
	}
	!o && f && (y.x = Xs(f));
	const g = f && !o && !d ? uy(f, v) : ma(0),
		S = m.left + v.scrollLeft - y.x - g.x,
		h = m.top + v.scrollTop - y.y - g.y;
	return { x: S, y: h, width: m.width, height: m.height };
}
function Cf(l) {
	return Gn(l).position === "static";
}
function pv(l, i) {
	if (!ol(l) || Gn(l).position === "fixed") return null;
	if (i) return i(l);
	let r = l.offsetParent;
	return Sa(l) === r && (r = r.ownerDocument.body), r;
}
function fy(l, i) {
	const r = Jt(l);
	if (Gs(l)) return r;
	if (!ol(l)) {
		let f = Ll(l);
		for (; f && !qr(f); ) {
			if (Yn(f) && !Cf(f)) return f;
			f = Ll(f);
		}
		return r;
	}
	let o = pv(l, i);
	for (; o && HN(o) && Cf(o); ) o = pv(o, i);
	return o && qr(o) && Cf(o) && !fd(o) ? r : o || GN(l) || r;
}
const tC = async function (l) {
	const i = this.getOffsetParent || fy,
		r = this.getDimensions,
		o = await r(l.floating);
	return {
		reference: eC(l.reference, await i(l.floating), l.strategy),
		floating: { x: 0, y: 0, width: o.width, height: o.height },
	};
};
function nC(l) {
	return Gn(l).direction === "rtl";
}
const aC = {
	convertOffsetParentRelativeRectToViewportRelativeRect: QN,
	getDocumentElement: Sa,
	getClippingRect: JN,
	getOffsetParent: fy,
	getElementRects: tC,
	getClientRects: PN,
	getDimensions: WN,
	getScale: Ui,
	isElement: Yn,
	isRTL: nC,
};
function dy(l, i) {
	return (
		l.x === i.x && l.y === i.y && l.width === i.width && l.height === i.height
	);
}
function lC(l, i, r) {
	let o = null,
		f;
	const d = Sa(l);
	function m() {
		var S;
		clearTimeout(f), (S = o) == null || S.disconnect(), (o = null);
	}
	function v(S, h) {
		S === void 0 && (S = !1), h === void 0 && (h = 1), m();
		const w = l.getBoundingClientRect(),
			{ left: E, top: C, width: j, height: N } = w;
		if ((S || i(), !j || !N)) return;
		const T = js(C),
			z = js(d.clientWidth - (E + j)),
			R = js(d.clientHeight - (C + N)),
			O = js(E),
			Y = {
				rootMargin: -T + "px " + -z + "px " + -R + "px " + -O + "px",
				threshold: da(0, nl(1, h)) || 1,
			};
		let X = !0;
		function q(J) {
			const ee = J[0].intersectionRatio;
			if (!dy(w, l.getBoundingClientRect())) return v();
			if (ee !== h) {
				if (!X) return v();
				ee
					? v(!1, ee)
					: (f = setTimeout(() => {
							v(!1, 1e-7);
						}, 1e3));
			}
			X = !1;
		}
		try {
			o = new IntersectionObserver(q, { ...Y, root: d.ownerDocument });
		} catch {
			o = new IntersectionObserver(q, Y);
		}
		o.observe(l);
	}
	const y = Jt(l),
		g = () => v(r);
	return (
		y.addEventListener("resize", g),
		v(!0),
		() => {
			y.removeEventListener("resize", g), m();
		}
	);
}
function iC(l, i, r, o) {
	o === void 0 && (o = {});
	const {
			ancestorScroll: f = !0,
			ancestorResize: d = !0,
			elementResize: m = typeof ResizeObserver == "function",
			layoutShift: v = typeof IntersectionObserver == "function",
			animationFrame: y = !1,
		} = o,
		g = md(l),
		S = f || d ? [...(g ? Xr(g) : []), ...(i ? Xr(i) : [])] : [];
	S.forEach((T) => {
		f && T.addEventListener("scroll", r), d && T.addEventListener("resize", r);
	});
	const h = g && v ? lC(g, r, d) : null;
	let w = -1,
		E = null;
	m &&
		((E = new ResizeObserver((T) => {
			const [z] = T;
			z &&
				z.target === g &&
				E &&
				i &&
				(E.unobserve(i),
				cancelAnimationFrame(w),
				(w = requestAnimationFrame(() => {
					var R;
					(R = E) == null || R.observe(i);
				}))),
				r();
		})),
		g && !y && E.observe(g),
		i && E.observe(i));
	let C,
		j = y ? Bl(l) : null;
	y && N();
	function N() {
		const T = Bl(l);
		j && !dy(j, T) && r(), (j = T), (C = requestAnimationFrame(N));
	}
	return (
		r(),
		() => {
			var T;
			S.forEach((z) => {
				f && z.removeEventListener("scroll", r),
					d && z.removeEventListener("resize", r);
			}),
				h == null || h(),
				(T = E) == null || T.disconnect(),
				(E = null),
				y && cancelAnimationFrame(C);
		}
	);
}
const rC = kN,
	oC = LN,
	sC = ON,
	cC = UN,
	uC = DN,
	gv = MN,
	fC = BN,
	dC = (l, i, r) => {
		const o = new Map(),
			f = r ?? {},
			d = { ...aC, ...f.platform, _c: o };
		return RN(l, i, { ...f, platform: d });
	};
var mC = typeof document < "u",
	hC = () => {},
	Ms = mC ? x.useLayoutEffect : hC;
function Ls(l, i) {
	if (l === i) return !0;
	if (typeof l != typeof i) return !1;
	if (typeof l == "function" && l.toString() === i.toString()) return !0;
	let r, o, f;
	if (l && i && typeof l == "object") {
		if (Array.isArray(l)) {
			if (((r = l.length), r !== i.length)) return !1;
			for (o = r; o-- !== 0; ) if (!Ls(l[o], i[o])) return !1;
			return !0;
		}
		if (((f = Object.keys(l)), (r = f.length), r !== Object.keys(i).length))
			return !1;
		for (o = r; o-- !== 0; ) if (!Object.hasOwn(i, f[o])) return !1;
		for (o = r; o-- !== 0; ) {
			const d = f[o];
			if (!(d === "_owner" && l.$$typeof) && !Ls(l[d], i[d])) return !1;
		}
		return !0;
	}
	return l !== l && i !== i;
}
function my(l) {
	return typeof window > "u"
		? 1
		: (l.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function vv(l, i) {
	const r = my(l);
	return Math.round(i * r) / r;
}
function jf(l) {
	const i = x.useRef(l);
	return (
		Ms(() => {
			i.current = l;
		}),
		i
	);
}
function pC(l) {
	l === void 0 && (l = {});
	const {
			placement: i = "bottom",
			strategy: r = "absolute",
			middleware: o = [],
			platform: f,
			elements: { reference: d, floating: m } = {},
			transform: v = !0,
			whileElementsMounted: y,
			open: g,
		} = l,
		[S, h] = x.useState({
			x: 0,
			y: 0,
			strategy: r,
			placement: i,
			middlewareData: {},
			isPositioned: !1,
		}),
		[w, E] = x.useState(o);
	Ls(w, o) || E(o);
	const [C, j] = x.useState(null),
		[N, T] = x.useState(null),
		z = x.useCallback((Z) => {
			Z !== Y.current && ((Y.current = Z), j(Z));
		}, []),
		R = x.useCallback((Z) => {
			Z !== X.current && ((X.current = Z), T(Z));
		}, []),
		O = d || C,
		L = m || N,
		Y = x.useRef(null),
		X = x.useRef(null),
		q = x.useRef(S),
		J = y != null,
		ee = jf(y),
		ce = jf(f),
		te = jf(g),
		se = x.useCallback(() => {
			if (!Y.current || !X.current) return;
			const Z = { placement: i, strategy: r, middleware: w };
			ce.current && (Z.platform = ce.current),
				dC(Y.current, X.current, Z).then((re) => {
					const F = { ...re, isPositioned: te.current !== !1 };
					le.current &&
						!Ls(q.current, F) &&
						((q.current = F),
						Gi.flushSync(() => {
							h(F);
						}));
				});
		}, [w, i, r, ce, te]);
	Ms(() => {
		g === !1 &&
			q.current.isPositioned &&
			((q.current.isPositioned = !1), h((Z) => ({ ...Z, isPositioned: !1 })));
	}, [g]);
	const le = x.useRef(!1);
	Ms(
		() => (
			(le.current = !0),
			() => {
				le.current = !1;
			}
		),
		[],
	),
		Ms(() => {
			if ((O && (Y.current = O), L && (X.current = L), O && L)) {
				if (ee.current) return ee.current(O, L, se);
				se();
			}
		}, [O, L, se, ee, J]);
	const ue = x.useMemo(
			() => ({ reference: Y, floating: X, setReference: z, setFloating: R }),
			[z, R],
		),
		M = x.useMemo(() => ({ reference: O, floating: L }), [O, L]),
		H = x.useMemo(() => {
			const Z = { position: r, left: 0, top: 0 };
			if (!M.floating) return Z;
			const re = vv(M.floating, S.x),
				F = vv(M.floating, S.y);
			return v
				? {
						...Z,
						transform: "translate(" + re + "px, " + F + "px)",
						...(my(M.floating) >= 1.5 && { willChange: "transform" }),
					}
				: { position: r, left: re, top: F };
		}, [r, v, M.floating, S.x, S.y]);
	return x.useMemo(
		() => ({ ...S, update: se, refs: ue, elements: M, floatingStyles: H }),
		[S, se, ue, M, H],
	);
}
const gC = (l) => {
		function i(r) {
			return Object.hasOwn(r, "current");
		}
		return {
			name: "arrow",
			options: l,
			fn(r) {
				const { element: o, padding: f } = typeof l == "function" ? l(r) : l;
				return o && i(o)
					? o.current != null
						? gv({ element: o.current, padding: f }).fn(r)
						: {}
					: o
						? gv({ element: o, padding: f }).fn(r)
						: {};
			},
		};
	},
	vC = (l, i) => {
		const r = rC(l);
		return { name: r.name, fn: r.fn, options: [l, i] };
	},
	yC = (l, i) => {
		const r = oC(l);
		return { name: r.name, fn: r.fn, options: [l, i] };
	},
	xC = (l, i) => ({ fn: fC(l).fn, options: [l, i] }),
	bC = (l, i) => {
		const r = sC(l);
		return { name: r.name, fn: r.fn, options: [l, i] };
	},
	SC = (l, i) => {
		const r = cC(l);
		return { name: r.name, fn: r.fn, options: [l, i] };
	},
	wC = (l, i) => {
		const r = uC(l);
		return { name: r.name, fn: r.fn, options: [l, i] };
	},
	EC = (l, i) => {
		const r = gC(l);
		return { name: r.name, fn: r.fn, options: [l, i] };
	};
var NC = Object.defineProperty,
	CC = (l, i) => NC(l, "name", { value: i, configurable: !0 });
function Qs(l) {
	const [i, r] = x.useState(void 0);
	return (
		st(() => {
			if (l) {
				r({ width: l.offsetWidth, height: l.offsetHeight });
				const o = new ResizeObserver((f) => {
					if (!Array.isArray(f) || !f.length) return;
					const d = f[0];
					let m, v;
					if ("borderBoxSize" in d) {
						const y = d.borderBoxSize,
							g = Array.isArray(y) ? y[0] : y;
						(m = g.inlineSize), (v = g.blockSize);
					} else (m = l.offsetWidth), (v = l.offsetHeight);
					r({ width: m, height: v });
				});
				return o.observe(l, { box: "border-box" }), () => o.unobserve(l);
			} else r(void 0);
		}, [l]),
		i
	);
}
CC(Qs, "useSize");
var jC = Object.defineProperty,
	Ja = (l, i) => jC(l, "name", { value: i, configurable: !0 }),
	hy = "Popper",
	[py, gy] = qn(hy),
	[TC, vy] = py(hy),
	_C = Ja((l) => {
		const { __scopePopper: i, children: r } = l,
			[o, f] = x.useState(null),
			[d, m] = x.useState(void 0);
		return u.jsx(TC, {
			scope: i,
			anchor: o,
			onAnchorChange: f,
			placementState: d,
			setPlacementState: m,
			children: r,
		});
	}, "Popper"),
	AC = "PopperAnchor",
	RC = x.forwardRef(
		Ja((i, r) => {
			const { __scopePopper: o, virtualRef: f, ...d } = i,
				m = vy(AC, o),
				v = x.useRef(null),
				y = m.onAnchorChange,
				g = x.useCallback(
					(j) => {
						(v.current = j), j && y(j);
					},
					[y],
				),
				S = He(r, g),
				h = x.useRef(null);
			x.useEffect(() => {
				if (!f) return;
				const j = h.current;
				(h.current = f.current), j !== h.current && y(h.current);
			});
			const w = m.placementState && Ps(m.placementState),
				E = w == null ? void 0 : w[0],
				C = w == null ? void 0 : w[1];
			return f
				? null
				: u.jsx(ke.div, {
						"data-radix-popper-side": E,
						"data-radix-popper-align": C,
						...d,
						ref: S,
					});
		}, "PopperAnchor"),
	),
	yy = "PopperContent",
	[MC, kT] = py(yy),
	OC = x.forwardRef(
		Ja((i, r) => {
			var ae, Ve, Ce, xe, je, Ke, Ot;
			const {
					__scopePopper: o,
					side: f = "bottom",
					sideOffset: d = 0,
					align: m = "center",
					alignOffset: v = 0,
					arrowPadding: y = 0,
					avoidCollisions: g = !0,
					collisionBoundary: S = [],
					collisionPadding: h = 0,
					sticky: w = "partial",
					hideWhenDetached: E = !1,
					updatePositionStrategy: C = "optimized",
					onPlaced: j,
					...N
				} = i,
				T = vy(yy, o),
				[z, R] = x.useState(null),
				O = He(r, R),
				[L, Y] = x.useState(null),
				X = Qs(L),
				q = (X == null ? void 0 : X.width) ?? 0,
				J = (X == null ? void 0 : X.height) ?? 0,
				ee = f + (m !== "center" ? "-" + m : ""),
				ce =
					typeof h == "number"
						? h
						: { top: 0, right: 0, bottom: 0, left: 0, ...h },
				te = Array.isArray(S) ? S : [S],
				se = te.length > 0,
				le = { padding: ce, boundary: te.filter(xy), altBoundary: se },
				{
					refs: ue,
					floatingStyles: M,
					placement: H,
					isPositioned: Z,
					middlewareData: re,
				} = pC({
					strategy: "fixed",
					placement: ee,
					whileElementsMounted: Ja(
						(...Yt) => iC(...Yt, { animationFrame: C === "always" }),
						"whileElementsMounted",
					),
					elements: { reference: T.anchor },
					middleware: [
						vC({ mainAxis: d + J, alignmentAxis: v }),
						g &&
							yC({
								mainAxis: !0,
								crossAxis: !1,
								limiter: w === "partial" ? xC() : void 0,
								...le,
							}),
						g && bC({ ...le }),
						SC({
							...le,
							apply: Ja(
								({
									elements: Yt,
									rects: Gt,
									availableWidth: Nn,
									availableHeight: Lt,
								}) => {
									const { width: cl, height: ul } = Gt.reference,
										nt = Yt.floating.style;
									nt.setProperty("--radix-popper-available-width", `${Nn}px`),
										nt.setProperty(
											"--radix-popper-available-height",
											`${Lt}px`,
										),
										nt.setProperty("--radix-popper-anchor-width", `${cl}px`),
										nt.setProperty("--radix-popper-anchor-height", `${ul}px`);
								},
								"apply",
							),
						}),
						L && EC({ element: L, padding: y }),
						DC({ arrowWidth: q, arrowHeight: J }),
						E &&
							wC({
								strategy: "referenceHidden",
								...le,
								boundary: se ? le.boundary : void 0,
							}),
					],
				}),
				F = T.setPlacementState;
			st(
				() => (
					F(H),
					() => {
						F(void 0);
					}
				),
				[H, F],
			);
			const [A, G] = Ps(H),
				W = An(j);
			st(() => {
				Z && (W == null || W());
			}, [Z, W]);
			const $ = (ae = re.arrow) == null ? void 0 : ae.x,
				ne = (Ve = re.arrow) == null ? void 0 : Ve.y,
				oe = ((Ce = re.arrow) == null ? void 0 : Ce.centerOffset) !== 0,
				[ge, fe] = x.useState();
			return (
				st(() => {
					z && fe(window.getComputedStyle(z).zIndex);
				}, [z]),
				u.jsx("div", {
					ref: ue.setFloating,
					"data-radix-popper-content-wrapper": "",
					style: {
						...M,
						transform: Z ? M.transform : "translate(0, -200%)",
						minWidth: "max-content",
						zIndex: ge,
						"--radix-popper-transform-origin": [
							(xe = re.transformOrigin) == null ? void 0 : xe.x,
							(je = re.transformOrigin) == null ? void 0 : je.y,
						].join(" "),
						...(((Ke = re.hide) == null ? void 0 : Ke.referenceHidden) && {
							visibility: "hidden",
							pointerEvents: "none",
						}),
					},
					dir: i.dir,
					children: u.jsx(MC, {
						scope: o,
						placedSide: A,
						placedAlign: G,
						onArrowChange: Y,
						arrowX: $,
						arrowY: ne,
						shouldHideArrow: oe,
						children: u.jsx(ke.div, {
							"data-side": A,
							"data-align": G,
							...N,
							ref: O,
							style: {
								...N.style,
								animation: Z
									? (Ot = N.style) == null
										? void 0
										: Ot.animation
									: "none",
							},
						}),
					}),
				})
			);
		}, "PopperContent"),
	);
function xy(l) {
	return l !== null;
}
Ja(xy, "isNotNull");
var DC = Ja(
	(l) => ({
		name: "transformOrigin",
		options: l,
		fn(i) {
			var N, T, z;
			const { placement: r, rects: o, middlewareData: f } = i,
				m = ((N = f.arrow) == null ? void 0 : N.centerOffset) !== 0,
				v = m ? 0 : l.arrowWidth,
				y = m ? 0 : l.arrowHeight,
				[g, S] = Ps(r),
				h = { start: "0%", center: "50%", end: "100%" }[S],
				w = (((T = f.arrow) == null ? void 0 : T.x) ?? 0) + v / 2,
				E = (((z = f.arrow) == null ? void 0 : z.y) ?? 0) + y / 2;
			let C = "",
				j = "";
			return (
				g === "bottom"
					? ((C = m ? h : `${w}px`), (j = `${-y}px`))
					: g === "top"
						? ((C = m ? h : `${w}px`), (j = `${o.floating.height + y}px`))
						: g === "right"
							? ((C = `${-y}px`), (j = m ? h : `${E}px`))
							: g === "left" &&
								((C = `${o.floating.width + y}px`), (j = m ? h : `${E}px`)),
				{ data: { x: C, y: j } }
			);
		},
	}),
	"transformOrigin",
);
function Ps(l) {
	const [i, r = "center"] = l.split("-");
	return [i, r];
}
Ja(Ps, "getSideAndAlignFromPlacement");
var zC = _C,
	kC = RC,
	LC = OC,
	BC = Object.defineProperty,
	UC = (l, i) => BC(l, "name", { value: i, configurable: !0 });
function hd(l) {
	const i = x.useRef({ value: l, previous: l });
	return x.useMemo(
		() => (
			i.current.value !== l &&
				((i.current.previous = i.current.value), (i.current.value = l)),
			i.current.previous
		),
		[l],
	);
}
UC(hd, "usePrevious");
var HC = Object.freeze({
		position: "absolute",
		border: 0,
		width: 1,
		height: 1,
		padding: 0,
		margin: -1,
		overflow: "hidden",
		clip: "rect(0, 0, 0, 0)",
		whiteSpace: "nowrap",
		wordWrap: "normal",
	}),
	VC = Object.defineProperty,
	ze = (l, i) => VC(l, "name", { value: i, configurable: !0 }),
	YC = [" ", "Enter", "ArrowUp", "ArrowDown"],
	GC = [" ", "Enter"],
	Vi = "Select",
	[Is, Ks, qC] = Hs(Vi),
	[Yl, LT] = qn(Vi, [qC, gy]),
	pd = gy(),
	[XC, sl] = Yl(Vi),
	[QC, PC] = Yl(Vi);
function by(l) {
	const {
			__scopeSelect: i,
			children: r,
			open: o,
			defaultOpen: f,
			onOpenChange: d,
			value: m,
			defaultValue: v,
			onValueChange: y,
			dir: g,
			name: S,
			autoComplete: h,
			disabled: w,
			required: E,
			form: C,
			internal_do_not_use_render: j,
		} = l,
		N = pd(i),
		[T, z] = x.useState(null),
		[R, O] = x.useState(null),
		[L, Y] = x.useState(!1),
		X = Zr(g),
		[q, J] = tl({ prop: o, defaultProp: f ?? !1, onChange: d, caller: Vi }),
		[ee, ce] = tl({ prop: m, defaultProp: v, onChange: y, caller: Vi }),
		te = x.useRef(null),
		se = x.useRef(ee);
	x.useEffect(() => {
		const G = C
			? T == null
				? void 0
				: T.ownerDocument.getElementById(C)
			: T == null
				? void 0
				: T.form;
		if (G instanceof HTMLFormElement) {
			const W = ze(() => ce(se.current), "reset");
			return (
				G.addEventListener("reset", W), () => G.removeEventListener("reset", W)
			);
		}
	}, [C, T, ce]);
	const le = T ? !!C || !!T.closest("form") : !0,
		[ue, M] = x.useState(new Set()),
		H = Fa(),
		Z = Array.from(ue)
			.map((G) => G.props.value)
			.join(";"),
		re = x.useCallback((G) => {
			M((W) => new Set(W).add(G));
		}, []),
		F = x.useCallback((G) => {
			M((W) => {
				const $ = new Set(W);
				return $.delete(G), $;
			});
		}, []),
		A = {
			required: E,
			trigger: T,
			onTriggerChange: z,
			valueNode: R,
			onValueNodeChange: O,
			valueNodeHasChildren: L,
			onValueNodeHasChildrenChange: Y,
			contentId: H,
			value: ee,
			onValueChange: ce,
			open: q,
			onOpenChange: J,
			dir: X,
			triggerPointerDownPosRef: te,
			disabled: w,
			name: S,
			autoComplete: h,
			form: C,
			nativeOptions: ue,
			nativeSelectKey: Z,
			isFormControl: le,
		};
	return u.jsx(zC, {
		...N,
		children: u.jsx(XC, {
			scope: i,
			...A,
			children: u.jsx(Is.Provider, {
				scope: i,
				children: u.jsx(QC, {
					scope: i,
					onNativeOptionAdd: re,
					onNativeOptionRemove: F,
					children: Ay(j) ? j(A) : r,
				}),
			}),
		}),
	});
}
ze(by, "SelectProvider");
var IC = ze((l) => {
		const { __scopeSelect: i, children: r, ...o } = l;
		return u.jsx(by, {
			__scopeSelect: i,
			...o,
			internal_do_not_use_render: ({ isFormControl: f }) =>
				u.jsxs(u.Fragment, {
					children: [r, f ? u.jsx(hj, { __scopeSelect: i }) : null],
				}),
		});
	}, "Select"),
	KC = "SelectTrigger",
	Sy = x.forwardRef(
		ze((i, r) => {
			const { __scopeSelect: o, disabled: f = !1, ...d } = i,
				m = pd(o),
				v = sl(KC, o),
				y = v.disabled || f,
				g = He(r, v.onTriggerChange),
				S = Ks(o),
				h = x.useRef("touch"),
				[w, E, C] = vd((N) => {
					const T = S().filter((O) => !O.disabled),
						z = T.find((O) => O.value === v.value),
						R = yd(T, N, z);
					R !== void 0 && v.onValueChange(R.value);
				}),
				j = ze((N) => {
					y || (v.onOpenChange(!0), C()),
						N &&
							(v.triggerPointerDownPosRef.current = {
								x: Math.round(N.pageX),
								y: Math.round(N.pageY),
							});
				}, "handleOpen");
			return u.jsx(kC, {
				asChild: !0,
				...m,
				children: u.jsx(ke.button, {
					type: "button",
					role: "combobox",
					"aria-controls": v.open ? v.contentId : void 0,
					"aria-expanded": v.open,
					"aria-required": v.required,
					"aria-autocomplete": "none",
					dir: v.dir,
					"data-state": v.open ? "open" : "closed",
					disabled: y,
					"data-disabled": y ? "" : void 0,
					"data-placeholder": $r(v.value) ? "" : void 0,
					...d,
					ref: g,
					onClick: Ne(d.onClick, (N) => {
						N.currentTarget.focus(), h.current !== "mouse" && j(N);
					}),
					onPointerDown: Ne(d.onPointerDown, (N) => {
						h.current = N.pointerType;
						const T = N.target;
						T.hasPointerCapture(N.pointerId) &&
							T.releasePointerCapture(N.pointerId),
							N.button === 0 &&
								N.ctrlKey === !1 &&
								N.pointerType === "mouse" &&
								(j(N), N.preventDefault());
					}),
					onKeyDown: Ne(d.onKeyDown, (N) => {
						const T = w.current !== "";
						!(N.ctrlKey || N.altKey || N.metaKey) &&
							N.key.length === 1 &&
							E(N.key),
							!(T && N.key === " ") &&
								YC.includes(N.key) &&
								(j(), N.preventDefault());
					}),
				}),
			});
		}, "SelectTrigger"),
	),
	ZC = "SelectValue",
	$C = x.forwardRef(
		ze((i, r) => {
			const {
					__scopeSelect: o,
					className: f,
					style: d,
					children: m,
					placeholder: v = "",
					...y
				} = i,
				g = sl(ZC, o),
				{ onValueNodeHasChildrenChange: S } = g,
				h = m !== void 0,
				w = He(r, g.onValueNodeChange);
			st(() => {
				S(h);
			}, [S, h]);
			const E = $r(g.value);
			return u.jsx(ke.span, {
				...y,
				asChild: E ? !1 : y.asChild,
				ref: w,
				style: { pointerEvents: "none" },
				children: u.jsx(
					x.Fragment,
					{ children: E ? v : m },
					E ? "placeholder" : "value",
				),
			});
		}, "SelectValue"),
	),
	FC = x.forwardRef(
		ze((i, r) => {
			const { __scopeSelect: o, children: f, ...d } = i;
			return u.jsx(ke.span, {
				"aria-hidden": !0,
				...d,
				ref: r,
				children: f || "▼",
			});
		}, "SelectIcon"),
	),
	JC = "SelectPortal",
	[WC, ej] = Yl(JC, { forceMount: void 0 }),
	tj = ze((l) => {
		const { __scopeSelect: i, forceMount: r, ...o } = l;
		return u.jsx(WC, {
			scope: l.__scopeSelect,
			forceMount: r,
			children: u.jsx(C0, { asChild: !0, ...o }),
		});
	}, "SelectPortal"),
	Ul = "SelectContent",
	wy = x.forwardRef(
		ze((i, r) => {
			const o = ej(Ul, i.__scopeSelect),
				{ forceMount: f = o.forceMount, ...d } = i,
				m = sl(Ul, i.__scopeSelect),
				[v, y] = x.useState();
			return (
				st(() => {
					y(new DocumentFragment());
				}, []),
				u.jsx(Kr, {
					present: f || m.open,
					children: ({ present: g }) =>
						g ? u.jsx(lj, { ...d, ref: r }) : u.jsx(nj, { ...d, fragment: v }),
				})
			);
		}, "SelectContent"),
	),
	nj = x.forwardRef(
		ze((i, r) => {
			const { __scopeSelect: o, children: f, fragment: d } = i;
			return d
				? Gi.createPortal(
						u.jsx(Ey, {
							scope: o,
							children: u.jsx(Is.Slot, {
								scope: o,
								children: u.jsx("div", { ref: r, children: f }),
							}),
						}),
						d,
					)
				: null;
		}, "SelectContentFragment"),
	),
	_n = 10,
	[Ey, Gl] = Yl(Ul),
	aj = ga("SelectContent.RemoveScroll"),
	lj = x.forwardRef(
		ze((i, r) => {
			const { __scopeSelect: o } = i,
				{
					position: f = "item-aligned",
					onCloseAutoFocus: d,
					onEscapeKeyDown: m,
					onPointerDownOutside: v,
					side: y,
					sideOffset: g,
					align: S,
					alignOffset: h,
					arrowPadding: w,
					collisionBoundary: E,
					collisionPadding: C,
					sticky: j,
					hideWhenDetached: N,
					avoidCollisions: T,
					...z
				} = i,
				R = sl(Ul, o),
				[O, L] = x.useState(null),
				[Y, X] = x.useState(null),
				q = He(r, L),
				[J, ee] = x.useState(null),
				[ce, te] = x.useState(null),
				se = Ks(o),
				[le, ue] = x.useState(!1),
				M = x.useRef(!1);
			x.useEffect(() => {
				if (O) return U0(O);
			}, [O]),
				Bs();
			const H = x.useCallback(
					(fe) => {
						const [ae, ...Ve] = se().map((je) => je.ref.current),
							[Ce] = Ve.slice(-1),
							xe = document.activeElement;
						for (const je of fe)
							if (
								je === xe ||
								(je == null || je.scrollIntoView({ block: "nearest" }),
								je === ae && Y && (Y.scrollTop = 0),
								je === Ce && Y && (Y.scrollTop = Y.scrollHeight),
								je == null || je.focus(),
								document.activeElement !== xe)
							)
								return;
					},
					[se, Y],
				),
				Z = x.useCallback(() => H([J, O]), [H, J, O]);
			x.useEffect(() => {
				le && Z();
			}, [le, Z]);
			const { onOpenChange: re, triggerPointerDownPosRef: F } = R;
			x.useEffect(() => {
				if (O) {
					let fe = { x: 0, y: 0 };
					const ae = ze((Ce) => {
							var xe, je;
							fe = {
								x: Math.abs(
									Math.round(Ce.pageX) -
										(((xe = F.current) == null ? void 0 : xe.x) ?? 0),
								),
								y: Math.abs(
									Math.round(Ce.pageY) -
										(((je = F.current) == null ? void 0 : je.y) ?? 0),
								),
							};
						}, "handlePointerMove"),
						Ve = ze((Ce) => {
							fe.x <= 10 && fe.y <= 10
								? Ce.preventDefault()
								: Ce.composedPath().includes(O) || re(!1),
								document.removeEventListener("pointermove", ae),
								(F.current = null);
						}, "handlePointerUp");
					return (
						F.current !== null &&
							(document.addEventListener("pointermove", ae),
							document.addEventListener("pointerup", Ve, {
								capture: !0,
								once: !0,
							})),
						() => {
							document.removeEventListener("pointermove", ae),
								document.removeEventListener("pointerup", Ve, { capture: !0 });
						}
					);
				}
			}, [O, re, F]),
				x.useEffect(() => {
					const fe = ze(() => re(!1), "close");
					return (
						window.addEventListener("blur", fe),
						window.addEventListener("resize", fe),
						() => {
							window.removeEventListener("blur", fe),
								window.removeEventListener("resize", fe);
						}
					);
				}, [re]);
			const [A, G] = vd((fe) => {
					const ae = se().filter((xe) => !xe.disabled),
						Ve = ae.find((xe) => xe.ref.current === document.activeElement),
						Ce = yd(ae, fe, Ve);
					Ce &&
						setTimeout(() => {
							var xe;
							return (xe = Ce.ref.current) == null ? void 0 : xe.focus();
						});
				}),
				W = x.useCallback(
					(fe, ae, Ve) => {
						const Ce = !M.current && !Ve;
						((R.value !== void 0 && R.value === ae) || Ce) &&
							(ee(fe), Ce && (M.current = !0));
					},
					[R.value],
				),
				$ = x.useCallback(() => (O == null ? void 0 : O.focus()), [O]),
				ne = x.useCallback(
					(fe, ae, Ve) => {
						const Ce = !M.current && !Ve;
						((R.value !== void 0 && R.value === ae) || Ce) && te(fe);
					},
					[R.value],
				),
				oe = f === "popper" ? yv : ij,
				ge =
					oe === yv
						? {
								side: y,
								sideOffset: g,
								align: S,
								alignOffset: h,
								arrowPadding: w,
								collisionBoundary: E,
								collisionPadding: C,
								sticky: j,
								hideWhenDetached: N,
								avoidCollisions: T,
							}
						: {};
			return u.jsx(Ey, {
				scope: o,
				content: O,
				viewport: Y,
				onViewportChange: X,
				itemRefCallback: W,
				selectedItem: J,
				onItemLeave: $,
				itemTextRefCallback: ne,
				focusSelectedItem: Z,
				selectedItemText: ce,
				position: f,
				isPositioned: le,
				searchRef: A,
				children: u.jsx(ld, {
					as: aj,
					allowPinchZoom: !0,
					children: u.jsx(y0, {
						asChild: !0,
						trapped: R.open,
						onMountAutoFocus: (fe) => {
							fe.preventDefault();
						},
						onUnmountAutoFocus: Ne(d, (fe) => {
							var ae;
							(ae = R.trigger) == null || ae.focus({ preventScroll: !0 }),
								fe.preventDefault();
						}),
						children: u.jsx(h0, {
							asChild: !0,
							disableOutsidePointerEvents: !0,
							onEscapeKeyDown: m,
							onPointerDownOutside: v,
							onFocusOutside: (fe) => fe.preventDefault(),
							onDismiss: () => R.onOpenChange(!1),
							children: u.jsx(oe, {
								role: "listbox",
								id: R.contentId,
								"data-state": R.open ? "open" : "closed",
								dir: R.dir,
								onContextMenu: (fe) => fe.preventDefault(),
								...z,
								...ge,
								onPlaced: () => ue(!0),
								ref: q,
								style: {
									display: "flex",
									flexDirection: "column",
									outline: "none",
									...z.style,
								},
								onKeyDown: Ne(z.onKeyDown, (fe) => {
									const ae = fe.ctrlKey || fe.altKey || fe.metaKey;
									if (
										(fe.key === "Tab" && fe.preventDefault(),
										!ae && fe.key.length === 1 && G(fe.key),
										["ArrowUp", "ArrowDown", "Home", "End"].includes(fe.key))
									) {
										let Ce = se()
											.filter((xe) => !xe.disabled)
											.map((xe) => xe.ref.current);
										if (
											(["ArrowUp", "End"].includes(fe.key) &&
												(Ce = Ce.slice().reverse()),
											["ArrowUp", "ArrowDown"].includes(fe.key))
										) {
											const xe = fe.target,
												je = Ce.indexOf(xe);
											Ce = Ce.slice(je + 1);
										}
										setTimeout(() => H(Ce)), fe.preventDefault();
									}
								}),
							}),
						}),
					}),
				}),
			});
		}, "SelectContentImpl"),
	),
	ij = x.forwardRef(
		ze((i, r) => {
			const { __scopeSelect: o, onPlaced: f, ...d } = i,
				m = sl(Ul, o),
				v = Gl(Ul, o),
				[y, g] = x.useState(null),
				[S, h] = x.useState(null),
				w = He(r, h),
				E = Ks(o),
				C = x.useRef(!1),
				j = x.useRef(!0),
				{
					viewport: N,
					selectedItem: T,
					selectedItemText: z,
					focusSelectedItem: R,
				} = v,
				O = x.useCallback(() => {
					if (m.trigger && m.valueNode && y && S && N && T && z) {
						const q = m.trigger.getBoundingClientRect(),
							J = S.getBoundingClientRect(),
							ee = m.valueNode.getBoundingClientRect(),
							ce = z.getBoundingClientRect();
						if (m.dir !== "rtl") {
							const xe = ce.left - J.left,
								je = ee.left - xe,
								Ke = q.left - je,
								Ot = q.width + Ke,
								Yt = Math.max(Ot, J.width),
								Gt = window.innerWidth - _n,
								Nn = Gr(je, [_n, Math.max(_n, Gt - Yt)]);
							(y.style.minWidth = Ot + "px"), (y.style.left = Nn + "px");
						} else {
							const xe = J.right - ce.right,
								je = window.innerWidth - ee.right - xe,
								Ke = window.innerWidth - q.right - je,
								Ot = q.width + Ke,
								Yt = Math.max(Ot, J.width),
								Gt = window.innerWidth - _n,
								Nn = Gr(je, [_n, Math.max(_n, Gt - Yt)]);
							(y.style.minWidth = Ot + "px"), (y.style.right = Nn + "px");
						}
						const te = E(),
							se = window.innerHeight - _n * 2,
							le = N.scrollHeight,
							ue = window.getComputedStyle(S),
							M = parseInt(ue.borderTopWidth, 10),
							H = parseInt(ue.paddingTop, 10),
							Z = parseInt(ue.borderBottomWidth, 10),
							re = parseInt(ue.paddingBottom, 10),
							F = M + H + le + re + Z,
							A = Math.min(T.offsetHeight * 5, F),
							G = window.getComputedStyle(N),
							W = parseInt(G.paddingTop, 10),
							$ = parseInt(G.paddingBottom, 10),
							ne = q.top + q.height / 2 - _n,
							oe = se - ne,
							ge = T.offsetHeight / 2,
							fe = T.offsetTop + ge,
							ae = M + H + fe,
							Ve = F - ae;
						if (ae <= ne) {
							const xe = te.length > 0 && T === te[te.length - 1].ref.current;
							y.style.bottom = "0px";
							const je = S.clientHeight - N.offsetTop - N.offsetHeight,
								Ke = Math.max(oe, ge + (xe ? $ : 0) + je + Z),
								Ot = ae + Ke;
							y.style.height = Ot + "px";
						} else {
							const xe = te.length > 0 && T === te[0].ref.current;
							y.style.top = "0px";
							const Ke = Math.max(ne, M + N.offsetTop + (xe ? W : 0) + ge) + Ve;
							(y.style.height = Ke + "px"),
								(N.scrollTop = ae - ne + N.offsetTop);
						}
						(y.style.margin = `${_n}px 0`),
							(y.style.minHeight = A + "px"),
							(y.style.maxHeight = se + "px"),
							f == null || f(),
							requestAnimationFrame(() => (C.current = !0));
					}
				}, [E, m.trigger, m.valueNode, y, S, N, T, z, m.dir, f]);
			st(() => O(), [O]);
			const [L, Y] = x.useState();
			st(() => {
				S && Y(window.getComputedStyle(S).zIndex);
			}, [S]);
			const X = x.useCallback(
				(q) => {
					q && j.current === !0 && (O(), R == null || R(), (j.current = !1));
				},
				[O, R],
			);
			return u.jsx(rj, {
				scope: o,
				contentWrapper: y,
				shouldExpandOnScrollRef: C,
				onScrollButtonChange: X,
				children: u.jsx("div", {
					ref: g,
					style: {
						display: "flex",
						flexDirection: "column",
						position: "fixed",
						zIndex: L,
					},
					children: u.jsx(ke.div, {
						...d,
						ref: w,
						style: { boxSizing: "border-box", maxHeight: "100%", ...d.style },
					}),
				}),
			});
		}, "SelectItemAlignedPosition"),
	),
	yv = x.forwardRef(
		ze((i, r) => {
			const {
					__scopeSelect: o,
					align: f = "start",
					collisionPadding: d = _n,
					...m
				} = i,
				v = pd(o);
			return u.jsx(LC, {
				...v,
				...m,
				ref: r,
				align: f,
				collisionPadding: d,
				style: {
					boxSizing: "border-box",
					...m.style,
					"--radix-select-content-transform-origin":
						"var(--radix-popper-transform-origin)",
					"--radix-select-content-available-width":
						"var(--radix-popper-available-width)",
					"--radix-select-content-available-height":
						"var(--radix-popper-available-height)",
					"--radix-select-trigger-width": "var(--radix-popper-anchor-width)",
					"--radix-select-trigger-height": "var(--radix-popper-anchor-height)",
				},
			});
		}, "SelectPopperPosition"),
	),
	[rj, gd] = Yl(Ul, {}),
	xv = "SelectViewport",
	oj = x.forwardRef(
		ze((i, r) => {
			const { __scopeSelect: o, nonce: f, ...d } = i,
				m = Gl(xv, o),
				v = gd(xv, o),
				y = He(r, m.onViewportChange),
				g = x.useRef(0);
			return u.jsxs(u.Fragment, {
				children: [
					u.jsx("style", {
						dangerouslySetInnerHTML: {
							__html:
								"[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}",
						},
						nonce: f,
					}),
					u.jsx(Is.Slot, {
						scope: o,
						children: u.jsx(ke.div, {
							"data-radix-select-viewport": "",
							role: "presentation",
							...d,
							ref: y,
							style: {
								position: "relative",
								flex: 1,
								overflow: "hidden auto",
								...d.style,
							},
							onScroll: Ne(d.onScroll, (S) => {
								const h = S.currentTarget,
									{ contentWrapper: w, shouldExpandOnScrollRef: E } = v;
								if (E != null && E.current && w) {
									const C = Math.abs(g.current - h.scrollTop);
									if (C > 0) {
										const j = window.innerHeight - _n * 2,
											N = parseFloat(w.style.minHeight),
											T = parseFloat(w.style.height),
											z = Math.max(N, T);
										if (z < j) {
											const R = z + C,
												O = Math.min(j, R),
												L = R - O;
											(w.style.height = O + "px"),
												w.style.bottom === "0px" &&
													((h.scrollTop = L > 0 ? L : 0),
													(w.style.justifyContent = "flex-end"));
										}
									}
								}
								g.current = h.scrollTop;
							}),
						}),
					}),
				],
			});
		}, "SelectViewport"),
	),
	sj = "SelectGroup",
	[BT, UT] = Yl(sj),
	Qf = "SelectItem",
	[cj, Ny] = Yl(Qf),
	Cy = x.forwardRef(
		ze((i, r) => {
			const {
					__scopeSelect: o,
					value: f,
					disabled: d = !1,
					textValue: m,
					...v
				} = i,
				y = sl(Qf, o),
				g = Gl(Qf, o),
				S = y.value === f,
				[h, w] = x.useState(m ?? ""),
				[E, C] = x.useState(!1),
				j = An((O) => {
					var L;
					return (L = g.itemRefCallback) == null ? void 0 : L.call(g, O, f, d);
				}),
				N = He(r, j),
				T = Fa(),
				z = x.useRef("touch"),
				R = ze(() => {
					d || (y.onValueChange(f), y.onOpenChange(!1));
				}, "handleSelect");
			return u.jsx(cj, {
				scope: o,
				value: f,
				disabled: d,
				textId: T,
				isSelected: S,
				onItemTextChange: x.useCallback((O) => {
					w((L) => L || ((O == null ? void 0 : O.textContent) ?? "").trim());
				}, []),
				children: u.jsx(Is.ItemSlot, {
					scope: o,
					value: f,
					disabled: d,
					textValue: h,
					children: u.jsx(ke.div, {
						role: "option",
						"aria-labelledby": T,
						"data-highlighted": E ? "" : void 0,
						"aria-selected": S && E,
						"data-state": S ? "checked" : "unchecked",
						"aria-disabled": d || void 0,
						"data-disabled": d ? "" : void 0,
						tabIndex: d ? void 0 : -1,
						...v,
						ref: N,
						onFocus: Ne(v.onFocus, () => C(!0)),
						onBlur: Ne(v.onBlur, () => C(!1)),
						onClick: Ne(v.onClick, () => {
							z.current !== "mouse" && R();
						}),
						onPointerUp: Ne(v.onPointerUp, () => {
							z.current === "mouse" && R();
						}),
						onPointerDown: Ne(v.onPointerDown, (O) => {
							z.current = O.pointerType;
						}),
						onPointerMove: Ne(v.onPointerMove, (O) => {
							var L;
							(z.current = O.pointerType),
								d
									? (L = g.onItemLeave) == null || L.call(g)
									: z.current === "mouse" &&
										O.currentTarget.focus({ preventScroll: !0 });
						}),
						onPointerLeave: Ne(v.onPointerLeave, (O) => {
							var L;
							O.currentTarget === document.activeElement &&
								((L = g.onItemLeave) == null || L.call(g));
						}),
						onKeyDown: Ne(v.onKeyDown, (O) => {
							var Y;
							d ||
								O.target !== O.currentTarget ||
								(((Y = g.searchRef) == null ? void 0 : Y.current) !== "" &&
									O.key === " ") ||
								(GC.includes(O.key) && R(),
								O.key === " " && O.preventDefault());
						}),
					}),
				}),
			});
		}, "SelectItem"),
	),
	Ts = "SelectItemText",
	uj = x.forwardRef(
		ze((i, r) => {
			const { __scopeSelect: o, className: f, style: d, ...m } = i,
				v = sl(Ts, o),
				y = Gl(Ts, o),
				g = Ny(Ts, o),
				S = PC(Ts, o),
				[h, w] = x.useState(null),
				E = An((R) => {
					var O;
					return (O = y.itemTextRefCallback) == null
						? void 0
						: O.call(y, R, g.value, g.disabled);
				}),
				C = He(r, w, g.onItemTextChange, E),
				j = h == null ? void 0 : h.textContent,
				N = x.useMemo(
					() =>
						u.jsx(
							"option",
							{ value: g.value, disabled: g.disabled, children: j },
							g.value,
						),
					[g.disabled, g.value, j],
				),
				{ onNativeOptionAdd: T, onNativeOptionRemove: z } = S;
			return (
				st(() => (T(N), () => z(N)), [T, z, N]),
				u.jsxs(u.Fragment, {
					children: [
						u.jsx(ke.span, { id: g.textId, ...m, ref: C }),
						g.isSelected &&
						v.valueNode &&
						!v.valueNodeHasChildren &&
						!$r(v.value)
							? Gi.createPortal(m.children, v.valueNode)
							: null,
					],
				})
			);
		}, "SelectItemText"),
	),
	fj = "SelectItemIndicator",
	dj = x.forwardRef(
		ze((i, r) => {
			const { __scopeSelect: o, ...f } = i;
			return Ny(fj, o).isSelected
				? u.jsx(ke.span, { "aria-hidden": !0, ...f, ref: r })
				: null;
		}, "SelectItemIndicator"),
	),
	bv = "SelectScrollUpButton",
	jy = x.forwardRef(
		ze((i, r) => {
			const o = Gl(bv, i.__scopeSelect),
				f = gd(bv, i.__scopeSelect),
				[d, m] = x.useState(!1),
				v = He(r, f.onScrollButtonChange);
			return (
				st(() => {
					if (o.viewport && o.isPositioned) {
						const y = () => {
							const S = g.scrollTop > 0;
							m(S);
						};
						ze(y, "handleScroll");
						const g = o.viewport;
						return (
							y(),
							g.addEventListener("scroll", y),
							() => g.removeEventListener("scroll", y)
						);
					}
				}, [o.viewport, o.isPositioned]),
				d
					? u.jsx(_y, {
							...i,
							ref: v,
							onAutoScroll: () => {
								const { viewport: y, selectedItem: g } = o;
								y && g && (y.scrollTop = y.scrollTop - g.offsetHeight);
							},
						})
					: null
			);
		}, "SelectScrollUpButton"),
	),
	Sv = "SelectScrollDownButton",
	Ty = x.forwardRef(
		ze((i, r) => {
			const o = Gl(Sv, i.__scopeSelect),
				f = gd(Sv, i.__scopeSelect),
				[d, m] = x.useState(!1),
				v = He(r, f.onScrollButtonChange);
			return (
				st(() => {
					if (o.viewport && o.isPositioned) {
						const y = () => {
							const S = g.scrollHeight - g.clientHeight,
								h = Math.ceil(g.scrollTop) < S;
							m(h);
						};
						ze(y, "handleScroll");
						const g = o.viewport;
						return (
							y(),
							g.addEventListener("scroll", y),
							() => g.removeEventListener("scroll", y)
						);
					}
				}, [o.viewport, o.isPositioned]),
				d
					? u.jsx(_y, {
							...i,
							ref: v,
							onAutoScroll: () => {
								const { viewport: y, selectedItem: g } = o;
								y && g && (y.scrollTop = y.scrollTop + g.offsetHeight);
							},
						})
					: null
			);
		}, "SelectScrollDownButton"),
	),
	_y = x.forwardRef(
		ze((i, r) => {
			const { __scopeSelect: o, onAutoScroll: f, ...d } = i,
				m = Gl("SelectScrollButton", o),
				v = x.useRef(null),
				y = Ks(o),
				g = x.useCallback(() => {
					v.current !== null &&
						(window.clearInterval(v.current), (v.current = null));
				}, []);
			return (
				x.useEffect(() => () => g(), [g]),
				st(() => {
					var h;
					const S = y().find((w) => w.ref.current === document.activeElement);
					(h = S == null ? void 0 : S.ref.current) == null ||
						h.scrollIntoView({ block: "nearest" });
				}, [y]),
				u.jsx(ke.div, {
					"aria-hidden": !0,
					...d,
					ref: r,
					style: { flexShrink: 0, ...d.style },
					onPointerDown: Ne(d.onPointerDown, () => {
						v.current === null && (v.current = window.setInterval(f, 50));
					}),
					onPointerMove: Ne(d.onPointerMove, () => {
						var S;
						(S = m.onItemLeave) == null || S.call(m),
							v.current === null && (v.current = window.setInterval(f, 50));
					}),
					onPointerLeave: Ne(d.onPointerLeave, () => {
						g();
					}),
				})
			);
		}, "SelectScrollButtonImpl"),
	),
	mj = "SelectBubbleInput",
	hj = x.forwardRef(
		ze(({ __scopeSelect: i, ...r }, o) => {
			const f = sl(mj, i),
				{
					value: d,
					onValueChange: m,
					required: v,
					disabled: y,
					name: g,
					autoComplete: S,
					form: h,
				} = f,
				{ nativeOptions: w, nativeSelectKey: E } = f,
				C = x.useRef(null),
				j = He(o, C),
				N = d ?? "",
				T = hd(N),
				z = Array.from(w).some((R) => (R.props.value ?? "") === "");
			return (
				x.useEffect(() => {
					const R = C.current;
					if (!R) return;
					const O = window.HTMLSelectElement.prototype,
						Y = Object.getOwnPropertyDescriptor(O, "value").set;
					if (T !== N && Y) {
						const X = new Event("change", { bubbles: !0 });
						Y.call(R, N), R.dispatchEvent(X);
					}
				}, [T, N]),
				u.jsxs(
					ke.select,
					{
						"aria-hidden": !0,
						required: v,
						tabIndex: -1,
						name: g,
						autoComplete: S,
						disabled: y,
						form: h,
						onChange: (R) => m(R.target.value),
						...r,
						style: { ...HC, ...r.style },
						ref: j,
						defaultValue: N,
						children: [
							$r(d) && !z ? u.jsx("option", { value: "" }) : null,
							Array.from(w),
						],
					},
					E,
				)
			);
		}, "SelectBubbleInput"),
	);
function Ay(l) {
	return typeof l == "function";
}
ze(Ay, "isFunction");
function $r(l) {
	return l === "" || l === void 0;
}
ze($r, "shouldShowPlaceholder");
function vd(l) {
	const i = An(l),
		r = x.useRef(""),
		o = x.useRef(0),
		f = x.useCallback(
			(m) => {
				const v = r.current + m;
				i(v),
					ze(function y(g) {
						(r.current = g),
							window.clearTimeout(o.current),
							g !== "" && (o.current = window.setTimeout(() => y(""), 1e3));
					}, "updateSearch")(v);
			},
			[i],
		),
		d = x.useCallback(() => {
			(r.current = ""), window.clearTimeout(o.current);
		}, []);
	return x.useEffect(() => () => window.clearTimeout(o.current), []), [r, f, d];
}
ze(vd, "useTypeaheadSearch");
function yd(l, i, r) {
	const f = i.length > 1 && Array.from(i).every((g) => g === i[0]) ? i[0] : i,
		d = r ? l.indexOf(r) : -1;
	let m = Ry(l, Math.max(d, 0));
	f.length === 1 && (m = m.filter((g) => g !== r));
	const y = m.find((g) =>
		g.textValue.toLowerCase().startsWith(f.toLowerCase()),
	);
	return y !== r ? y : void 0;
}
ze(yd, "findNextItem");
function Ry(l, i) {
	return l.map((r, o) => l[(i + o) % l.length]);
}
ze(Ry, "wrapArray");
const Wa = IC,
	el = $C,
	ha = x.forwardRef(({ className: l, children: i, ...r }, o) =>
		u.jsxs(Sy, {
			ref: o,
			className: $e(
				"flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 transition-colors",
				l,
			),
			...r,
			children: [
				i,
				u.jsx(FC, {
					asChild: !0,
					children: u.jsx(Av, {
						className: "h-4 w-4 opacity-50 ml-2 shrink-0",
					}),
				}),
			],
		}),
	);
ha.displayName = Sy.displayName;
const My = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx(jy, {
		ref: r,
		className: $e("flex cursor-default items-center justify-center py-1", l),
		...i,
		children: u.jsx(Z1, { className: "h-4 w-4" }),
	}),
);
My.displayName = jy.displayName;
const Oy = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx(Ty, {
		ref: r,
		className: $e("flex cursor-default items-center justify-center py-1", l),
		...i,
		children: u.jsx(Av, { className: "h-4 w-4" }),
	}),
);
Oy.displayName = Ty.displayName;
const pa = x.forwardRef(
	({ className: l, children: i, position: r = "popper", ...o }, f) =>
		u.jsx(tj, {
			children: u.jsxs(wy, {
				ref: f,
				className: $e(
					"relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-border/80 bg-card/95 p-1 text-popover-foreground shadow-xl backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					r === "popper" &&
						"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
					l,
				),
				position: r,
				...o,
				children: [
					u.jsx(My, {}),
					u.jsx(oj, {
						className: $e(
							"p-1",
							r === "popper" &&
								"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
						),
						children: i,
					}),
					u.jsx(Oy, {}),
				],
			}),
		}),
);
pa.displayName = wy.displayName;
const et = x.forwardRef(({ className: l, children: i, ...r }, o) =>
	u.jsxs(Cy, {
		ref: o,
		className: $e(
			"relative flex w-full cursor-default select-none items-center rounded-lg py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-primary/15 focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors",
			l,
		),
		...r,
		children: [
			u.jsx("span", {
				className:
					"absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
				children: u.jsx(dj, { children: u.jsx($f, { className: "h-4 w-4" }) }),
			}),
			u.jsx(uj, { children: i }),
		],
	}),
);
et.displayName = Cy.displayName;
const xd = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx("textarea", {
		className: $e(
			"flex min-h-[80px] w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
			l,
		),
		ref: r,
		...i,
	}),
);
xd.displayName = "Textarea";
const Dy = () => {
		var l;
		return typeof window < "u" && (l = window.Telegram) != null && l.WebApp
			? window.Telegram.WebApp
			: null;
	},
	pj = () => {
		const l = Dy();
		if (l != null && l.initData) return l.initData;
		if (typeof window < "u") {
			const i = new URLSearchParams(window.location.search),
				r = i.get("initData") || i.get("tgWebAppData");
			if (r) return decodeURIComponent(r);
			if (window.location.hash) {
				const f = window.location.hash.replace(/^#/, ""),
					d = new URLSearchParams(f),
					m = d.get("tgWebAppData") || d.get("initData");
				if (m) return decodeURIComponent(m);
			}
			const o = localStorage.getItem("ket_dev_init_data");
			if (o) return o;
		}
		return "";
	};
async function jt(l, i = {}) {
	const r = pj(),
		o = new Headers(i.headers || {});
	o.has("Content-Type") || o.set("Content-Type", "application/json"),
		r && o.set("x-telegram-init-data", r);
	const f = await fetch(l, { ...i, headers: o });
	if (!f.ok) {
		const d = await f
			.json()
			.catch(() => ({ error: `HTTP ${f.status}: ${f.statusText}` }));
		throw new Error(d.error || `HTTP ${f.status}`);
	}
	return await f.json();
}
const wv = ({
		mode: l,
		open: i,
		onOpenChange: r,
		memory: o,
		currentUser: f,
		chats: d = [],
		role: m = "user",
		adminChatIds: v = [],
		memberChatIds: y = [],
		onSuccess: g,
	}) => {
		const S = l === "edit",
			[h, w] = x.useState(""),
			[E, C] = x.useState("PROFILE"),
			[j, N] = x.useState(""),
			[T, z] = x.useState(!1);
		x.useEffect(() => {
			S && o
				? (C(o.category || "PROFILE"), N(o.memory_text || ""))
				: S || (w(f ? f.id.toString() : ""), C("PROFILE"), N(""));
		}, [S, o, f]);
		const R = d.filter(
				(L) =>
					!!(m === "owner" || v.includes(L.chat_id) || y.includes(L.chat_id)),
			),
			O = async (L) => {
				L.preventDefault();
				const Y = j.trim();
				if (!Y) {
					Ge.error("Please enter memory content.");
					return;
				}
				if (!S && !h) {
					Ge.error("Please select a target destination.");
					return;
				}
				try {
					z(!0),
						S && o
							? (await jt(`/api/memories/${o.id}`, {
									method: "PATCH",
									body: JSON.stringify({ memoryText: Y, category: E }),
								}),
								Ge.success("Memory updated successfully!"))
							: (await jt("/api/memories", {
									method: "POST",
									body: JSON.stringify({
										chatId: h,
										memoryText: Y,
										category: E,
									}),
								}),
								Ge.success("Fact remembered successfully!")),
						r(!1),
						g();
				} catch (X) {
					const q = X instanceof Error ? X.message : "Failed to save memory";
					Ge.error(q);
				} finally {
					z(!1);
				}
			};
		return u.jsx(uN, {
			open: i,
			onOpenChange: r,
			children: u.jsx(K0, {
				className: "sm:max-w-md",
				children: u.jsxs("form", {
					onSubmit: O,
					className: "space-y-4",
					children: [
						u.jsxs(Z0, {
							children: [
								u.jsx(F0, {
									className: "flex items-center gap-2 text-lg",
									children: S
										? u.jsxs(u.Fragment, {
												children: [
													u.jsx(NS, { className: "w-5 h-5 text-primary" }),
													u.jsx("span", { children: "Edit Memory Record" }),
												],
											})
										: u.jsxs(u.Fragment, {
												children: [
													u.jsx(W1, { className: "w-5 h-5 text-primary" }),
													u.jsx("span", {
														children: "Record New Fact / Memory",
													}),
												],
											}),
								}),
								u.jsx(J0, {
									className: "text-xs",
									children: S
										? "Update fact information. Embeddings will be refreshed automatically."
										: "Add persistent context to Gemini memory graph with semantic embeddings.",
								}),
							],
						}),
						u.jsxs("div", {
							className: "space-y-3 py-1",
							children: [
								!S &&
									u.jsxs("div", {
										className: "space-y-1.5",
										children: [
											u.jsx("label", {
												htmlFor: "target-chat-select",
												className: "text-xs font-semibold text-foreground",
												children: "Target Destination",
											}),
											u.jsxs(Wa, {
												value: h,
												onValueChange: w,
												children: [
													u.jsx(ha, {
														id: "target-chat-select",
														className: "w-full",
														children: u.jsx(el, {
															placeholder: "Select target...",
														}),
													}),
													u.jsxs(pa, {
														children: [
															f &&
																u.jsx(et, {
																	value: f.id.toString(),
																	children: "Personal Profile (Me)",
																}),
															R.filter(
																(L) =>
																	L.chat_id !==
																	(f == null ? void 0 : f.id.toString()),
															).map((L) =>
																u.jsx(
																	et,
																	{
																		value: L.chat_id,
																		children: L.title || `Group ${L.chat_id}`,
																	},
																	L.chat_id,
																),
															),
														],
													}),
												],
											}),
										],
									}),
								u.jsxs("div", {
									className: "space-y-1.5",
									children: [
										u.jsx("label", {
											htmlFor: "memory-category-select",
											className: "text-xs font-semibold text-foreground",
											children: "Category",
										}),
										u.jsxs(Wa, {
											value: E,
											onValueChange: (L) => C(L),
											children: [
												u.jsx(ha, {
													id: "memory-category-select",
													className: "w-full",
													children: u.jsx(el, {}),
												}),
												u.jsxs(pa, {
													children: [
														u.jsxs(et, {
															value: "PROFILE",
															children: [
																u.jsx("span", {
																	className: "font-medium text-blue-400",
																	children: "PROFILE",
																}),
																" — Permanent Profile / Identity",
															],
														}),
														u.jsxs(et, {
															value: "DYNAMIC",
															children: [
																u.jsx("span", {
																	className: "font-medium text-emerald-400",
																	children: "DYNAMIC",
																}),
																" ",
																"— Preferences & State",
															],
														}),
														u.jsxs(et, {
															value: "TEMPORARY",
															children: [
																u.jsx("span", {
																	className: "font-medium text-amber-400",
																	children: "TEMPORARY",
																}),
																" ",
																"— Short-Lived Event / Context",
															],
														}),
													],
												}),
											],
										}),
									],
								}),
								u.jsxs("div", {
									className: "space-y-1.5",
									children: [
										u.jsx("label", {
											htmlFor: "memory-text-input",
											className: "text-xs font-semibold text-foreground",
											children: S ? "Memory Content" : "Memory Details",
										}),
										u.jsx(xd, {
											id: "memory-text-input",
											placeholder:
												"e.g., User is a senior developer working with React...",
											value: j,
											onChange: (L) => N(L.target.value),
											rows: 4,
											className: "resize-none",
										}),
									],
								}),
							],
						}),
						u.jsxs($0, {
							className: "gap-2 sm:gap-0",
							children: [
								u.jsx(tt, {
									type: "button",
									variant: "outline",
									onClick: () => r(!1),
									disabled: T,
									children: "Cancel",
								}),
								u.jsxs(tt, {
									type: "submit",
									disabled: T,
									className: "flex items-center gap-2",
									children: [
										u.jsx(kl, { className: "w-4 h-4" }),
										u.jsx("span", {
											children: T
												? S
													? "Updating..."
													: "Saving..."
												: S
													? "Update Record"
													: "Save Memory",
										}),
									],
								}),
							],
						}),
					],
				}),
			}),
		});
	},
	yt = x.forwardRef(({ className: l, ...i }, r) =>
		u.jsx("div", {
			ref: r,
			className: $e(
				"rounded-xl border border-border/70 bg-card/75 backdrop-blur-md text-card-foreground shadow-sm transition-all duration-200",
				l,
			),
			...i,
		}),
	);
yt.displayName = "Card";
const xa = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx("div", {
		ref: r,
		className: $e("flex flex-col space-y-1.5 p-5", l),
		...i,
	}),
);
xa.displayName = "CardHeader";
const ba = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx("div", {
		ref: r,
		className: $e(
			"font-semibold leading-none tracking-tight text-base sm:text-lg text-foreground",
			l,
		),
		...i,
	}),
);
ba.displayName = "CardTitle";
const ll = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx("div", {
		ref: r,
		className: $e("text-xs sm:text-sm text-muted-foreground", l),
		...i,
	}),
);
ll.displayName = "CardDescription";
const St = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx("div", { ref: r, className: $e("p-5 pt-0", l), ...i }),
);
St.displayName = "CardContent";
const gj = ({ stats: l }) =>
		u.jsxs(u.Fragment, {
			children: [
				u.jsx(yt, {
					className: "glass-card",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "Registered Groups",
									}),
									u.jsx(Hl, { className: "w-4 h-4 text-blue-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
								children: (l == null ? void 0 : l.totalChats) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Total chat contexts",
							}),
						],
					}),
				}),
				u.jsx(yt, {
					className: "glass-card",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "Whitelisted",
									}),
									u.jsx(F1, { className: "w-4 h-4 text-emerald-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400",
								children: (l == null ? void 0 : l.allowedChats) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Active authorized groups",
							}),
						],
					}),
				}),
				u.jsx(yt, {
					className: "glass-card",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "Total Memories",
									}),
									u.jsx(Qr, { className: "w-4 h-4 text-purple-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
								children: (l == null ? void 0 : l.totalMemories) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Semantic fact embeddings",
							}),
						],
					}),
				}),
				u.jsx(yt, {
					className: "glass-card",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "Messages",
									}),
									u.jsx(Pr, { className: "w-4 h-4 text-amber-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
								children: (l == null ? void 0 : l.totalMessages) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Processed chat turns",
							}),
						],
					}),
				}),
			],
		}),
	vj = ({ stats: l }) =>
		u.jsxs(u.Fragment, {
			children: [
				u.jsx(yt, {
					className: "glass-card",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "Managed Groups",
									}),
									u.jsx(Hl, { className: "w-4 h-4 text-blue-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
								children: (l == null ? void 0 : l.managedGroupsCount) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Where you are admin",
							}),
						],
					}),
				}),
				u.jsx(yt, {
					className: "glass-card",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "Group Memories",
									}),
									u.jsx(Qr, { className: "w-4 h-4 text-purple-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
								children: (l == null ? void 0 : l.totalMemories) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Saved in your groups",
							}),
						],
					}),
				}),
				u.jsx(yt, {
					className: "glass-card col-span-2",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "Group Messages",
									}),
									u.jsx(Pr, { className: "w-4 h-4 text-emerald-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400",
								children: (l == null ? void 0 : l.totalMessages) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Across managed channels",
							}),
						],
					}),
				}),
			],
		}),
	yj = ({ stats: l }) =>
		u.jsxs(u.Fragment, {
			children: [
				u.jsx(yt, {
					className: "glass-card",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "My Saved Facts",
									}),
									u.jsx(Qr, { className: "w-4 h-4 text-blue-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-blue-400",
								children: (l == null ? void 0 : l.totalMemories) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Personal memory records",
							}),
						],
					}),
				}),
				u.jsx(yt, {
					className: "glass-card",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "My Groups",
									}),
									u.jsx(Hl, { className: "w-4 h-4 text-purple-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
								children: (l == null ? void 0 : l.totalGroups) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Active group memberships",
							}),
						],
					}),
				}),
				u.jsx(yt, {
					className: "glass-card col-span-2",
					children: u.jsxs(St, {
						className:
							"p-4 sm:p-5 flex flex-col justify-between h-full space-y-2",
						children: [
							u.jsxs("div", {
								className:
									"flex items-center justify-between text-muted-foreground",
								children: [
									u.jsx("span", {
										className: "text-xs font-medium",
										children: "Recorded Messages",
									}),
									u.jsx(Pr, { className: "w-4 h-4 text-amber-400" }),
								],
							}),
							u.jsx("div", {
								className:
									"text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
								children: (l == null ? void 0 : l.totalMessages) ?? 0,
							}),
							u.jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: "Recorded interactions",
							}),
						],
					}),
				}),
			],
		}),
	xj = ({ stats: l, role: i, onRefresh: r }) => {
		const o = (l == null ? void 0 : l.categoryStats) || {
				PROFILE: 0,
				DYNAMIC: 0,
				TEMPORARY: 0,
			},
			f = (o.PROFILE || 0) + (o.DYNAMIC || 0) + (o.TEMPORARY || 0) || 1,
			d = Math.round(((o.PROFILE || 0) / f) * 100),
			m = Math.round(((o.DYNAMIC || 0) / f) * 100),
			v = Math.max(0, 100 - d - m);
		return u.jsxs(yt, {
			className: "glass-card",
			children: [
				u.jsxs(xa, {
					className: "pb-3 flex flex-row items-center justify-between",
					children: [
						u.jsxs("div", {
							children: [
								u.jsxs(ba, {
									className: "text-base flex items-center gap-2",
									children: [
										u.jsx(vS, { className: "w-4 h-4 text-primary" }),
										u.jsx("span", {
											children: "Memory Knowledge Distribution",
										}),
									],
								}),
								u.jsx(ll, {
									children:
										"Classification of active memory vectors in the vector graph.",
								}),
							],
						}),
						u.jsx(tt, {
							variant: "ghost",
							size: "sm",
							onClick: r,
							className: "h-8 text-xs",
							children: "Refresh",
						}),
					],
				}),
				u.jsxs(St, {
					className: "space-y-4",
					children: [
						u.jsxs("div", {
							className:
								"h-3 w-full rounded-full bg-zinc-800 flex overflow-hidden p-0.5 gap-0.5",
							children: [
								u.jsx("div", {
									style: { width: `${d}%` },
									className:
										"h-full bg-blue-500 rounded-l-full transition-all duration-500 hover:brightness-110",
									title: `PROFILE: ${o.PROFILE} (${d}%)`,
								}),
								u.jsx("div", {
									style: { width: `${m}%` },
									className:
										"h-full bg-emerald-500 transition-all duration-500 hover:brightness-110",
									title: `DYNAMIC: ${o.DYNAMIC} (${m}%)`,
								}),
								u.jsx("div", {
									style: { width: `${v}%` },
									className:
										"h-full bg-amber-500 rounded-r-full transition-all duration-500 hover:brightness-110",
									title: `TEMPORARY: ${o.TEMPORARY} (${v}%)`,
								}),
							],
						}),
						u.jsxs("div", {
							className: "grid grid-cols-3 gap-2 text-xs pt-1",
							children: [
								u.jsxs("div", {
									className:
										"flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20",
									children: [
										u.jsx("span", {
											className: "w-2 h-2 rounded-full bg-blue-400 shrink-0",
										}),
										u.jsxs("div", {
											className: "truncate",
											children: [
												u.jsx("span", {
													className: "font-semibold text-blue-400",
													children: "PROFILE: ",
												}),
												u.jsx("span", {
													className: "font-mono text-foreground font-bold",
													children: o.PROFILE || 0,
												}),
												u.jsxs("span", {
													className: "text-muted-foreground text-[10px] ml-1",
													children: ["(", d, "%)"],
												}),
											],
										}),
									],
								}),
								u.jsxs("div", {
									className:
										"flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20",
									children: [
										u.jsx("span", {
											className: "w-2 h-2 rounded-full bg-emerald-400 shrink-0",
										}),
										u.jsxs("div", {
											className: "truncate",
											children: [
												u.jsx("span", {
													className: "font-semibold text-emerald-400",
													children: "DYNAMIC: ",
												}),
												u.jsx("span", {
													className: "font-mono text-foreground font-bold",
													children: o.DYNAMIC || 0,
												}),
												u.jsxs("span", {
													className: "text-muted-foreground text-[10px] ml-1",
													children: ["(", m, "%)"],
												}),
											],
										}),
									],
								}),
								u.jsxs("div", {
									className:
										"flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20",
									children: [
										u.jsx("span", {
											className: "w-2 h-2 rounded-full bg-amber-400 shrink-0",
										}),
										u.jsxs("div", {
											className: "truncate",
											children: [
												u.jsx("span", {
													className: "font-semibold text-amber-400",
													children: "TEMPORARY: ",
												}),
												u.jsx("span", {
													className: "font-mono text-foreground font-bold",
													children: o.TEMPORARY || 0,
												}),
												u.jsxs("span", {
													className: "text-muted-foreground text-[10px] ml-1",
													children: ["(", v, "%)"],
												}),
											],
										}),
									],
								}),
							],
						}),
						i === "owner" &&
							u.jsxs("div", {
								className:
									"pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs",
								children: [
									u.jsxs("div", {
										className:
											"flex items-center gap-2.5 p-2 rounded-lg bg-background/50 border border-border/40",
										children: [
											u.jsx(Tv, {
												className: "w-4 h-4 text-emerald-400 shrink-0",
											}),
											u.jsxs("div", {
												children: [
													u.jsx("div", {
														className:
															"text-[10px] text-muted-foreground uppercase font-medium",
														children: "Uptime",
													}),
													u.jsx("div", {
														className:
															"font-semibold font-mono text-foreground",
														children: Mw(
															(l == null ? void 0 : l.uptimeSeconds) ?? 0,
														),
													}),
												],
											}),
										],
									}),
									u.jsxs("div", {
										className:
											"flex items-center gap-2.5 p-2 rounded-lg bg-background/50 border border-border/40",
										children: [
											u.jsx(Mv, {
												className: "w-4 h-4 text-blue-400 shrink-0",
											}),
											u.jsxs("div", {
												children: [
													u.jsx("div", {
														className:
															"text-[10px] text-muted-foreground uppercase font-medium",
														children: "RAM Usage",
													}),
													u.jsxs("div", {
														className:
															"font-semibold font-mono text-foreground",
														children: [
															(l == null ? void 0 : l.memoryUsageMb) ?? 0,
															" MB",
														],
													}),
												],
											}),
										],
									}),
									u.jsxs("div", {
										className:
											"flex items-center gap-2.5 p-2 rounded-lg bg-background/50 border border-border/40",
										children: [
											u.jsx(oS, {
												className: "w-4 h-4 text-purple-400 shrink-0",
											}),
											u.jsxs("div", {
												children: [
													u.jsx("div", {
														className:
															"text-[10px] text-muted-foreground uppercase font-medium",
														children: "DB Size",
													}),
													u.jsx("div", {
														className:
															"font-semibold font-mono text-foreground",
														children: Ow(
															(l == null ? void 0 : l.dbSizeBytes) ?? 0,
														),
													}),
												],
											}),
										],
									}),
									u.jsxs("div", {
										className:
											"flex items-center gap-2.5 p-2 rounded-lg bg-background/50 border border-border/40",
										children: [
											u.jsx(kl, {
												className: "w-4 h-4 text-amber-400 shrink-0",
											}),
											u.jsxs("div", {
												children: [
													u.jsx("div", {
														className:
															"text-[10px] text-muted-foreground uppercase font-medium",
														children: "Active Model",
													}),
													u.jsx("div", {
														className:
															"font-semibold font-mono text-foreground truncate max-w-[110px]",
														title: l == null ? void 0 : l.model,
														children:
															(l == null ? void 0 : l.model) || "gemini",
													}),
												],
											}),
										],
									}),
								],
							}),
					],
				}),
			],
		});
	},
	bj = ({ topChats: l, onNavigateToGroups: i }) =>
		u.jsxs(yt, {
			className: "glass-card",
			children: [
				u.jsxs(xa, {
					className: "pb-3 flex flex-row items-center justify-between",
					children: [
						u.jsxs("div", {
							children: [
								u.jsxs(ba, {
									className: "text-base flex items-center gap-2",
									children: [
										u.jsx(Hl, { className: "w-4 h-4 text-primary" }),
										u.jsx("span", { children: "Active Groups" }),
									],
								}),
								u.jsx(ll, {
									children:
										"Recent Telegram channels ordered by activity volume.",
								}),
							],
						}),
						u.jsxs(tt, {
							variant: "outline",
							size: "sm",
							onClick: i,
							className: "flex items-center gap-1 text-xs",
							children: [
								u.jsx("span", { children: "View All" }),
								u.jsx(q1, { className: "w-3.5 h-3.5" }),
							],
						}),
					],
				}),
				u.jsx(St, {
					children:
						l && l.length > 0
							? u.jsx("div", {
									className: "divide-y divide-border/40",
									children: l.map((r) =>
										u.jsxs(
											"div",
											{
												className:
													"py-2.5 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0",
												children: [
													u.jsxs("div", {
														className: "min-w-0",
														children: [
															u.jsx("div", {
																className:
																	"font-medium text-foreground truncate text-sm",
																children: r.title || `Group (${r.chat_id})`,
															}),
															u.jsx("div", {
																className:
																	"text-[11px] text-muted-foreground font-mono",
																children: r.chat_id,
															}),
														],
													}),
													u.jsxs("div", {
														className:
															"shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono font-semibold text-xs",
														children: [
															u.jsx(Pr, { className: "w-3 h-3" }),
															u.jsxs("span", {
																children: [r.message_count, " msgs"],
															}),
														],
													}),
												],
											},
											r.chat_id,
										),
									),
								})
							: u.jsxs("div", {
									className:
										"py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2",
									children: [
										u.jsx(kS, { className: "w-6 h-6 opacity-40" }),
										u.jsx("span", {
											children: "No active groups recorded yet.",
										}),
									],
								}),
				}),
			],
		}),
	Sj = ({
		stats: l,
		role: i,
		isLoading: r,
		onNavigateToGroups: o,
		onRefresh: f,
	}) =>
		r && !l
			? u.jsxs("div", {
					className:
						"flex flex-col items-center justify-center py-16 text-muted-foreground gap-3",
					children: [
						u.jsx(Tv, { className: "w-8 h-8 animate-spin text-primary" }),
						u.jsx("span", {
							className: "text-sm",
							children: "Loading telemetry & metrics...",
						}),
					],
				})
			: u.jsxs("div", {
					className: "space-y-6 animate-in fade-in duration-200",
					children: [
						u.jsx("div", {
							className: "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
							children:
								i === "owner"
									? u.jsx(gj, { stats: l })
									: i === "admin"
										? u.jsx(vj, { stats: l })
										: u.jsx(yj, { stats: l }),
						}),
						i !== "user" && u.jsx(xj, { stats: l, role: i, onRefresh: f }),
						u.jsx(bj, {
							topChats: l == null ? void 0 : l.topChats,
							onNavigateToGroups: o,
						}),
					],
				});
var wj = Object.defineProperty,
	Ue = (l, i) => wj(l, "name", { value: i, configurable: !0 }),
	zy = ["PageUp", "PageDown"],
	ky = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"],
	Ly = {
		"from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
		"from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
		"from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
		"from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"],
	},
	Fr = "Slider",
	[Pf, Ej, Nj] = Hs(Fr),
	[bd, HT] = qn(Fr, [Nj]),
	[Cj, Jr] = bd(Fr),
	By = x.forwardRef(
		Ue((i, r) => {
			const {
					name: o,
					min: f = 0,
					max: d = 100,
					step: m = 1,
					orientation: v = "horizontal",
					disabled: y = !1,
					minStepsBetweenThumbs: g = 0,
					defaultValue: S = [f],
					value: h,
					onValueChange: w = Ue(() => {}, "onValueChange"),
					onValueCommit: E = Ue(() => {}, "onValueCommit"),
					inverted: C = !1,
					form: j,
					...N
				} = i,
				T = x.useRef(new Set()),
				z = x.useRef(0),
				R = x.useRef(!1),
				L = v === "horizontal" ? jj : Tj,
				[Y, X] = x.useState(null),
				q = He(r, X),
				[J = [], ee] = tl({
					prop: h,
					defaultProp: S,
					onChange: Ue((H) => {
						var re;
						(re = [...T.current][z.current]) == null ||
							re.focus({ preventScroll: !0, focusVisible: R.current }),
							(R.current = !1),
							w(H);
					}, "onChange"),
				}),
				ce = x.useRef(J),
				te = x.useRef(J);
			x.useEffect(() => {
				const H = j
					? Y == null
						? void 0
						: Y.ownerDocument.getElementById(j)
					: Y == null
						? void 0
						: Y.closest("form");
				if (H instanceof HTMLFormElement) {
					const Z = Ue(() => ee(te.current), "reset");
					return (
						H.addEventListener("reset", Z),
						() => H.removeEventListener("reset", Z)
					);
				}
			}, [Y, j, ee]);
			function se(H) {
				const Z = Qy(J, H);
				M(H, Z);
			}
			Ue(se, "handleSlideStart");
			function le(H) {
				M(H, z.current);
			}
			Ue(le, "handleSlideMove");
			function ue() {
				String(J) !== String(ce.current) && E(J);
			}
			Ue(ue, "handleSlideEnd");
			function M(H, Z, { commit: re } = { commit: !1 }) {
				const F = wd(m),
					A = Hr(Math.round((H - f) / m) * m + f, F),
					G = Gr(A, [f, d]);
				ee((W = []) => {
					const $ = qy(W, G, Z);
					if (Ky($, g * m)) {
						z.current = $.indexOf(G);
						const ne = String($) !== String(W);
						return ne && re && E($), ne ? $ : W;
					} else return W;
				});
			}
			return (
				Ue(M, "updateValues"),
				u.jsx(Cj, {
					scope: i.__scopeSlider,
					name: o,
					disabled: y,
					min: f,
					max: d,
					valueIndexToChangeRef: z,
					thumbs: T.current,
					values: J,
					orientation: v,
					form: j,
					children: u.jsx(Pf.Provider, {
						scope: i.__scopeSlider,
						children: u.jsx(Pf.Slot, {
							scope: i.__scopeSlider,
							children: u.jsx(L, {
								"aria-disabled": y,
								"data-disabled": y ? "" : void 0,
								...N,
								ref: q,
								onPointerDown: Ne(N.onPointerDown, () => {
									y || ((ce.current = J), (R.current = !1));
								}),
								min: f,
								max: d,
								inverted: C,
								onSlideStart: y ? void 0 : se,
								onSlideMove: y ? void 0 : le,
								onSlideEnd: y ? void 0 : ue,
								onHomeKeyDown: () => {
									y || ((R.current = !0), M(f, 0, { commit: !0 }));
								},
								onEndKeyDown: () => {
									y || ((R.current = !0), M(d, J.length - 1, { commit: !0 }));
								},
								onStepKeyDown: ({ event: H, direction: Z }) => {
									if (!y) {
										R.current = !0;
										const A =
												zy.includes(H.key) || (H.shiftKey && ky.includes(H.key))
													? 10
													: 1,
											G = z.current,
											W = J[G],
											$ = Zy(W, {
												min: f,
												step: m,
												direction: Z,
												multiplier: A,
											});
										M($, G, { commit: !0 });
									}
								},
							}),
						}),
					}),
				})
			);
		}, "Slider"),
	),
	[Uy, Hy] = bd(Fr, {
		startEdge: "left",
		endEdge: "right",
		size: "width",
		direction: 1,
	}),
	jj = x.forwardRef(
		Ue((i, r) => {
			const {
					min: o,
					max: f,
					dir: d,
					inverted: m,
					onSlideStart: v,
					onSlideMove: y,
					onSlideEnd: g,
					onStepKeyDown: S,
					...h
				} = i,
				[w, E] = x.useState(null),
				C = He(r, E),
				j = x.useRef(void 0),
				N = Zr(d),
				T = N === "ltr",
				z = (T && !m) || (!T && m);
			function R(O) {
				const L = j.current || w.getBoundingClientRect(),
					Y = [0, L.width],
					q = Zs(Y, z ? [o, f] : [f, o]);
				return (j.current = L), q(O - L.left);
			}
			return (
				Ue(R, "getValueFromPointer"),
				u.jsx(Uy, {
					scope: i.__scopeSlider,
					startEdge: z ? "left" : "right",
					endEdge: z ? "right" : "left",
					direction: z ? 1 : -1,
					size: "width",
					children: u.jsx(Vy, {
						dir: N,
						"data-orientation": "horizontal",
						...h,
						ref: C,
						style: {
							...h.style,
							"--radix-slider-thumb-transform": "translateX(-50%)",
						},
						onSlideStart: (O) => {
							const L = R(O.clientX);
							v == null || v(L);
						},
						onSlideMove: (O) => {
							const L = R(O.clientX);
							y == null || y(L);
						},
						onSlideEnd: () => {
							(j.current = void 0), g == null || g();
						},
						onStepKeyDown: (O) => {
							const Y = Ly[z ? "from-left" : "from-right"].includes(O.key);
							S == null || S({ event: O, direction: Y ? -1 : 1 });
						},
					}),
				})
			);
		}, "SliderHorizontal"),
	),
	Tj = x.forwardRef(
		Ue((i, r) => {
			const {
					min: o,
					max: f,
					inverted: d,
					onSlideStart: m,
					onSlideMove: v,
					onSlideEnd: y,
					onStepKeyDown: g,
					...S
				} = i,
				h = x.useRef(null),
				w = He(r, h),
				E = x.useRef(void 0),
				C = !d;
			function j(N) {
				const T = E.current || h.current.getBoundingClientRect(),
					z = [0, T.height],
					O = Zs(z, C ? [f, o] : [o, f]);
				return (E.current = T), O(N - T.top);
			}
			return (
				Ue(j, "getValueFromPointer"),
				u.jsx(Uy, {
					scope: i.__scopeSlider,
					startEdge: C ? "bottom" : "top",
					endEdge: C ? "top" : "bottom",
					size: "height",
					direction: C ? 1 : -1,
					children: u.jsx(Vy, {
						"data-orientation": "vertical",
						...S,
						ref: w,
						style: {
							...S.style,
							"--radix-slider-thumb-transform": "translateY(50%)",
						},
						onSlideStart: (N) => {
							const T = j(N.clientY);
							m == null || m(T);
						},
						onSlideMove: (N) => {
							const T = j(N.clientY);
							v == null || v(T);
						},
						onSlideEnd: () => {
							(E.current = void 0), y == null || y();
						},
						onStepKeyDown: (N) => {
							const z = Ly[C ? "from-bottom" : "from-top"].includes(N.key);
							g == null || g({ event: N, direction: z ? -1 : 1 });
						},
					}),
				})
			);
		}, "SliderVertical"),
	),
	Vy = x.forwardRef(
		Ue((i, r) => {
			const {
					__scopeSlider: o,
					onSlideStart: f,
					onSlideMove: d,
					onSlideEnd: m,
					onHomeKeyDown: v,
					onEndKeyDown: y,
					onStepKeyDown: g,
					...S
				} = i,
				h = Jr(Fr, o);
			return u.jsx(ke.span, {
				...S,
				ref: r,
				onKeyDown: Ne(i.onKeyDown, (w) => {
					w.key === "Home"
						? (v(w), w.preventDefault())
						: w.key === "End"
							? (y(w), w.preventDefault())
							: zy.concat(ky).includes(w.key) && (g(w), w.preventDefault());
				}),
				onPointerDown: Ne(i.onPointerDown, (w) => {
					const E = w.target;
					E.setPointerCapture(w.pointerId),
						w.preventDefault(),
						h.thumbs.has(E)
							? E.focus({ preventScroll: !0, focusVisible: !1 })
							: f(w);
				}),
				onPointerMove: Ne(i.onPointerMove, (w) => {
					w.target.hasPointerCapture(w.pointerId) && d(w);
				}),
				onPointerUp: Ne(i.onPointerUp, (w) => {
					const E = w.target;
					E.hasPointerCapture(w.pointerId) &&
						(E.releasePointerCapture(w.pointerId), m(w));
				}),
			});
		}, "SliderImpl"),
	),
	_j = "SliderTrack",
	Aj = x.forwardRef(
		Ue((i, r) => {
			const { __scopeSlider: o, ...f } = i,
				d = Jr(_j, o);
			return u.jsx(ke.span, {
				"data-disabled": d.disabled ? "" : void 0,
				"data-orientation": d.orientation,
				...f,
				ref: r,
			});
		}, "SliderTrack"),
	),
	Ev = "SliderRange",
	Rj = x.forwardRef(
		Ue((i, r) => {
			const { __scopeSlider: o, ...f } = i,
				d = Jr(Ev, o),
				m = Hy(Ev, o),
				v = x.useRef(null),
				y = He(r, v),
				g = d.values.length,
				S = d.values.map((E) => Sd(E, d.min, d.max)),
				h = g > 1 ? Math.min(...S) : 0,
				w = 100 - Math.max(...S);
			return u.jsx(ke.span, {
				"data-orientation": d.orientation,
				"data-disabled": d.disabled ? "" : void 0,
				...f,
				ref: y,
				style: { ...i.style, [m.startEdge]: h + "%", [m.endEdge]: w + "%" },
			});
		}, "SliderRange"),
	),
	Mj = "SliderThumb",
	[Oj, Yy] = bd(Mj),
	Dj = "SliderThumbProvider";
function Gy(l) {
	const {
			__scopeSlider: i,
			name: r,
			children: o,
			internal_do_not_use_render: f,
		} = l,
		d = Jr(Dj, i),
		m = Ej(i),
		[v, y] = x.useState(null),
		g = x.useMemo(
			() => (v ? m().findIndex((N) => N.ref.current === v) : -1),
			[m, v],
		),
		S = Qs(v),
		h = v ? !!d.form || !!v.closest("form") : !0,
		w = d.values[g],
		E = r ?? (d.name ? d.name + (d.values.length > 1 ? "[]" : "") : void 0),
		C = w === void 0 ? 0 : Sd(w, d.min, d.max);
	x.useEffect(() => {
		if (v)
			return (
				d.thumbs.add(v),
				() => {
					d.thumbs.delete(v);
				}
			);
	}, [v, d.thumbs]);
	const j = {
		value: w,
		name: E,
		form: d.form,
		isFormControl: h,
		index: g,
		thumb: v,
		onThumbChange: y,
		percent: C,
		size: S,
	};
	return u.jsx(Oj, { scope: i, ...j, children: $y(f) ? f(j) : o });
}
Ue(Gy, "SliderThumbProvider");
var Tf = "SliderThumbTrigger",
	zj = x.forwardRef(
		Ue((i, r) => {
			const { __scopeSlider: o, ...f } = i,
				d = Jr(Tf, o),
				m = Hy(Tf, o),
				{
					index: v,
					value: y,
					percent: g,
					size: S,
					onThumbChange: h,
				} = Yy(Tf, o),
				w = He(r, h),
				E = Xy(v, d.values.length),
				C = S == null ? void 0 : S[m.size],
				j = C ? Py(C, g, m.direction) : 0;
			return u.jsx("span", {
				style: {
					transform: "var(--radix-slider-thumb-transform)",
					position: "absolute",
					[m.startEdge]: `calc(${g}% + ${j}px)`,
				},
				children: u.jsx(Pf.ItemSlot, {
					scope: o,
					children: u.jsx(ke.span, {
						role: "slider",
						"aria-label": i["aria-label"] || E,
						"aria-valuemin": d.min,
						"aria-valuenow": y,
						"aria-valuemax": d.max,
						"aria-orientation": d.orientation,
						"data-orientation": d.orientation,
						"data-disabled": d.disabled ? "" : void 0,
						tabIndex: d.disabled ? void 0 : 0,
						...f,
						ref: w,
						style: y === void 0 ? { display: "none" } : i.style,
						onFocus: Ne(i.onFocus, () => {
							d.valueIndexToChangeRef.current = v;
						}),
					}),
				}),
			});
		}, "SliderThumbTrigger"),
	),
	kj = x.forwardRef(
		Ue((i, r) => {
			const { __scopeSlider: o, name: f, ...d } = i;
			return u.jsx(Gy, {
				__scopeSlider: o,
				name: f,
				internal_do_not_use_render: ({ index: m, isFormControl: v }) =>
					u.jsxs(u.Fragment, {
						children: [
							u.jsx(zj, { ...d, ref: r, __scopeSlider: o }),
							v ? u.jsx(Bj, { __scopeSlider: o }, m) : null,
						],
					}),
			});
		}, "SliderThumb"),
	),
	Lj = "SliderBubbleInput",
	Bj = x.forwardRef(
		Ue(({ __scopeSlider: i, ...r }, o) => {
			const { value: f, name: d, form: m } = Yy(Lj, i),
				v = x.useRef(null),
				y = He(v, o),
				g = hd(f);
			return (
				x.useEffect(() => {
					const S = v.current;
					if (!S) return;
					const h = window.HTMLInputElement.prototype,
						E = Object.getOwnPropertyDescriptor(h, "value").set;
					if (g !== f && E) {
						const C = new Event("input", { bubbles: !0 });
						E.call(S, f), S.dispatchEvent(C);
					}
				}, [g, f]),
				u.jsx(ke.input, {
					style: { display: "none" },
					name: d,
					form: m,
					...r,
					ref: y,
					defaultValue: f,
				})
			);
		}, "SliderBubbleInput"),
	);
function qy(l = [], i, r) {
	const o = [...l];
	return (o[r] = i), o.sort((f, d) => f - d);
}
Ue(qy, "getNextSortedValues");
function Sd(l, i, r) {
	const d = (100 / (r - i)) * (l - i);
	return Gr(d, [0, 100]);
}
Ue(Sd, "convertValueToPercentage");
function Xy(l, i) {
	return i > 2
		? `Value ${l + 1} of ${i}`
		: i === 2
			? ["Minimum", "Maximum"][l]
			: void 0;
}
Ue(Xy, "getLabel");
function Qy(l, i) {
	if (l.length === 1) return 0;
	const r = l.map((f) => Math.abs(f - i)),
		o = Math.min(...r);
	return r.indexOf(o);
}
Ue(Qy, "getClosestValueIndex");
function Py(l, i, r) {
	const o = l / 2,
		d = Zs([0, 50], [0, o]);
	return (o - d(i) * r) * r;
}
Ue(Py, "getThumbInBoundsOffset");
function Iy(l) {
	return l.slice(0, -1).map((i, r) => l[r + 1] - i);
}
Ue(Iy, "getStepsBetweenValues");
function Ky(l, i) {
	if (i > 0) {
		const r = Iy(l);
		return Math.min(...r) >= i;
	}
	return !0;
}
Ue(Ky, "hasMinStepsBetweenValues");
function Zs(l, i) {
	return (r) => {
		if (l[0] === l[1] || i[0] === i[1]) return i[0];
		const o = (i[1] - i[0]) / (l[1] - l[0]);
		return i[0] + o * (r - l[0]);
	};
}
Ue(Zs, "linearScale");
function wd(l) {
	if (!Number.isFinite(l)) return 0;
	const i = l.toString();
	if (i.includes("e")) {
		const [o, f] = i.split("e"),
			d = o.split(".")[1] || "",
			m = Number(f);
		return Math.max(0, d.length - m);
	}
	const r = i.split(".")[1];
	return r ? r.length : 0;
}
Ue(wd, "getDecimalCount");
function Hr(l, i) {
	const r = 10 ** i;
	return Math.round(l * r) / r;
}
Ue(Hr, "roundValue");
function Zy(l, { min: i, step: r, direction: o, multiplier: f }) {
	const d = wd(r),
		m = (l - i) / r,
		v = Math.round(m),
		y = Hr(v * r + i, d) === Hr(l, d);
	let g;
	return (
		y ? (g = v + f * o) : o > 0 ? (g = Math.ceil(m)) : (g = Math.floor(m)),
		Hr(g * r + i, d)
	);
}
Ue(Zy, "getNextStepValue");
function $y(l) {
	return typeof l == "function";
}
Ue($y, "isFunction");
const Ed = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsxs(By, {
		ref: r,
		className: $e(
			"relative flex w-full touch-none select-none items-center",
			l,
		),
		...i,
		children: [
			u.jsx(Aj, {
				className:
					"relative h-1.5 w-full grow overflow-hidden rounded-full bg-zinc-800",
				children: u.jsx(Rj, { className: "absolute h-full bg-primary" }),
			}),
			u.jsx(kj, {
				className:
					"block h-4 w-4 rounded-full border border-primary/50 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-110 cursor-grab active:cursor-grabbing",
			}),
		],
	}),
);
Ed.displayName = By.displayName;
const Uj = ({ ...l }) =>
	u.jsx(M2, {
		theme: "dark",
		className: "toaster group",
		toastOptions: {
			classNames: {
				toast:
					"group toast group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground group-[.toaster]:border-border/80 group-[.toaster]:shadow-2xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-xl",
				description: "group-[.toast]:text-muted-foreground",
				actionButton:
					"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
				cancelButton:
					"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
			},
		},
		...l,
	});
var Hj = Object.defineProperty,
	il = (l, i) => Hj(l, "name", { value: i, configurable: !0 }),
	Nd = "Switch",
	[Vj, VT] = qn(Nd),
	[Yj, Cd] = Vj(Nd);
function Fy(l) {
	const {
			__scopeSwitch: i,
			checked: r,
			children: o,
			defaultChecked: f,
			disabled: d,
			form: m,
			name: v,
			onCheckedChange: y,
			required: g,
			value: S = "on",
			internal_do_not_use_render: h,
		} = l,
		[w, E] = tl({ prop: r, defaultProp: f ?? !1, onChange: y, caller: Nd }),
		[C, j] = x.useState(null),
		[N, T] = x.useState(null),
		z = x.useRef(!1),
		[R, O] = x.useReducer((X) => X + 1, 0),
		L = C ? !!m || !!C.closest("form") : !0,
		Y = {
			checked: w,
			setChecked: E,
			disabled: d,
			control: C,
			setControl: j,
			name: v,
			form: m,
			value: S,
			hasConsumerStoppedPropagationRef: z,
			userInteractionCount: R,
			onUserInteraction: O,
			required: g,
			defaultChecked: f,
			isFormControl: L,
			bubbleInput: N,
			setBubbleInput: T,
		};
	return u.jsx(Yj, { scope: i, ...Y, children: Wy(h) ? h(Y) : o });
}
il(Fy, "SwitchProvider");
var Gj = "SwitchTrigger",
	qj = x.forwardRef(
		il(({ __scopeSwitch: i, onClick: r, ...o }, f) => {
			const {
					control: d,
					form: m,
					value: v,
					disabled: y,
					checked: g,
					required: S,
					setControl: h,
					setChecked: w,
					hasConsumerStoppedPropagationRef: E,
					onUserInteraction: C,
					isFormControl: j,
					bubbleInput: N,
				} = Cd(Gj, i),
				T = He(f, h),
				z = x.useRef(g);
			return (
				x.useEffect(() => {
					const R = m
						? d == null
							? void 0
							: d.ownerDocument.getElementById(m)
						: d == null
							? void 0
							: d.form;
					if (R instanceof HTMLFormElement) {
						const O = il(() => w(z.current), "reset");
						return (
							R.addEventListener("reset", O),
							() => R.removeEventListener("reset", O)
						);
					}
				}, [d, m, w]),
				u.jsx(ke.button, {
					type: "button",
					role: "switch",
					"aria-checked": g,
					"aria-required": S,
					"data-state": jd(g),
					"data-disabled": y ? "" : void 0,
					disabled: y,
					value: v,
					...o,
					ref: T,
					onClick: Ne(r, (R) => {
						C(),
							w((O) => !O),
							N &&
								j &&
								((E.current = R.isPropagationStopped()),
								E.current || R.stopPropagation());
					}),
				})
			);
		}, "SwitchTrigger"),
	),
	Jy = x.forwardRef(
		il((i, r) => {
			const {
				__scopeSwitch: o,
				name: f,
				checked: d,
				defaultChecked: m,
				required: v,
				disabled: y,
				value: g,
				onCheckedChange: S,
				form: h,
				...w
			} = i;
			return u.jsx(Fy, {
				__scopeSwitch: o,
				checked: d,
				defaultChecked: m,
				disabled: y,
				required: v,
				onCheckedChange: S,
				name: f,
				form: h,
				value: g,
				internal_do_not_use_render: ({ isFormControl: E }) =>
					u.jsxs(u.Fragment, {
						children: [
							u.jsx(qj, { ...w, ref: r, __scopeSwitch: o }),
							E && u.jsx(Ij, { __scopeSwitch: o }),
						],
					}),
			});
		}, "Switch"),
	),
	Xj = "SwitchThumb",
	Qj = x.forwardRef(
		il((i, r) => {
			const { __scopeSwitch: o, ...f } = i,
				d = Cd(Xj, o);
			return u.jsx(ke.span, {
				"data-state": jd(d.checked),
				"data-disabled": d.disabled ? "" : void 0,
				...f,
				ref: r,
			});
		}, "SwitchThumb"),
	),
	Pj = "SwitchBubbleInput",
	Ij = x.forwardRef(
		il(({ __scopeSwitch: i, onClick: r, ...o }, f) => {
			const {
					control: d,
					hasConsumerStoppedPropagationRef: m,
					userInteractionCount: v,
					checked: y,
					defaultChecked: g,
					required: S,
					disabled: h,
					name: w,
					value: E,
					form: C,
					bubbleInput: j,
					setBubbleInput: N,
				} = Cd(Pj, i),
				T = He(f, N),
				z = Qs(d),
				R = x.useRef(!1),
				O = x.useRef(y),
				L = x.useRef(v);
			x.useEffect(() => {
				const X = j;
				if (!X) return;
				const q = window.HTMLInputElement.prototype,
					ee = Object.getOwnPropertyDescriptor(q, "checked").set,
					ce = v !== L.current;
				L.current = v;
				const te = O.current !== y;
				O.current = y;
				const se = !(ce && m.current);
				if (te && ee) {
					R.current = !ce;
					const le = new Event("click", { bubbles: se });
					ee.call(X, y), X.dispatchEvent(le), (R.current = !1);
				}
			}, [j, y, m, v]);
			const Y = x.useRef(y);
			return u.jsx(ke.input, {
				type: "checkbox",
				"aria-hidden": !0,
				defaultChecked: g ?? Y.current,
				required: S,
				disabled: h,
				name: w,
				value: E,
				form: C,
				...o,
				tabIndex: -1,
				ref: T,
				onClick: Ne(r, (X) => {
					R.current && X.stopPropagation();
				}),
				style: {
					...o.style,
					...z,
					position: "absolute",
					pointerEvents: "none",
					opacity: 0,
					margin: 0,
					transform: "translateX(-100%)",
				},
			});
		}, "SwitchBubbleInput"),
	);
function Wy(l) {
	return typeof l == "function";
}
il(Wy, "isFunction");
function jd(l) {
	return l ? "checked" : "unchecked";
}
il(jd, "getState");
const Td = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx(Jy, {
		className: $e(
			"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-zinc-700",
			l,
		),
		...i,
		ref: r,
		children: u.jsx(Qj, {
			className: $e(
				"pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
			),
		}),
	}),
);
Td.displayName = Jy.displayName;
var Kj = Object.defineProperty,
	_d = (l, i) => Kj(l, "name", { value: i, configurable: !0 }),
	_f = !1;
function ex() {
	const [l, i] = x.useState(_f);
	return (
		x.useEffect(() => {
			_f || ((_f = !0), i(!0));
		}, []),
		l
	);
}
_d(ex, "useIsHydrated");
var tx = Yi[" useSyncExternalStore ".trim().toString()];
function nx() {
	return () => {};
}
_d(nx, "subscribe");
function ax() {
	return tx(
		nx,
		() => !0,
		() => !1,
	);
}
_d(ax, "useIsHydratedModern");
var Zj = typeof tx == "function" ? ax : ex,
	$j = Object.defineProperty,
	ql = (l, i) => $j(l, "name", { value: i, configurable: !0 }),
	Af = "rovingFocusGroup.onEntryFocus",
	Fj = { bubbles: !1, cancelable: !0 },
	$s = "RovingFocusGroup",
	[If, lx, Jj] = Hs($s),
	[Wj, ix] = qn($s, [Jj]),
	[eT, tT] = Wj($s),
	nT = x.forwardRef(
		ql(
			(i, r) =>
				u.jsx(If.Provider, {
					scope: i.__scopeRovingFocusGroup,
					children: u.jsx(If.Slot, {
						scope: i.__scopeRovingFocusGroup,
						children: u.jsx(aT, { ...i, ref: r }),
					}),
				}),
			"RovingFocusGroup",
		),
	),
	aT = x.forwardRef(
		ql((i, r) => {
			const {
					__scopeRovingFocusGroup: o,
					orientation: f,
					loop: d = !1,
					dir: m,
					currentTabStopId: v,
					defaultCurrentTabStopId: y,
					onCurrentTabStopIdChange: g,
					onEntryFocus: S,
					preventScrollOnEntryFocus: h = !1,
					...w
				} = i,
				E = x.useRef(null),
				C = He(r, E),
				j = Zr(m),
				[N, T] = tl({
					prop: v,
					defaultProp: y ?? null,
					onChange: g,
					caller: $s,
				}),
				[z, R] = x.useState(!1),
				O = An(S),
				L = lx(o),
				Y = x.useRef(!1),
				[X, q] = x.useState(0);
			return (
				x.useEffect(() => {
					const J = E.current;
					if (J)
						return (
							J.addEventListener(Af, O), () => J.removeEventListener(Af, O)
						);
				}, [O]),
				u.jsx(eT, {
					scope: o,
					orientation: f,
					dir: j,
					loop: d,
					currentTabStopId: N,
					onItemFocus: x.useCallback((J) => T(J), [T]),
					onItemShiftTab: x.useCallback(() => R(!0), []),
					onFocusableItemAdd: x.useCallback(() => q((J) => J + 1), []),
					onFocusableItemRemove: x.useCallback(() => q((J) => J - 1), []),
					children: u.jsx(ke.div, {
						tabIndex: z || X === 0 ? -1 : 0,
						"data-orientation": f,
						...w,
						ref: C,
						style: { outline: "none", ...i.style },
						onMouseDown: Ne(i.onMouseDown, () => {
							Y.current = !0;
						}),
						onFocus: Ne(i.onFocus, (J) => {
							const ee = !Y.current;
							if (J.target === J.currentTarget && ee && !z) {
								const ce = new CustomEvent(Af, Fj);
								if ((J.currentTarget.dispatchEvent(ce), !ce.defaultPrevented)) {
									const te = L().filter((H) => H.focusable),
										se = te.find((H) => H.active),
										le = te.find((H) => H.id === N),
										M = [se, le, ...te]
											.filter(Boolean)
											.map((H) => H.ref.current);
									Ad(M, h);
								}
							}
							Y.current = !1;
						}),
						onBlur: Ne(i.onBlur, () => R(!1)),
					}),
				})
			);
		}, "RovingFocusGroupImpl"),
	),
	lT = "RovingFocusGroupItem",
	iT = x.forwardRef(
		ql((i, r) => {
			const {
					__scopeRovingFocusGroup: o,
					focusable: f = !0,
					active: d = !1,
					tabStopId: m,
					children: v,
					...y
				} = i,
				g = Fa(),
				S = m || g,
				h = tT(lT, o),
				w = h.currentTabStopId === S,
				E = lx(o),
				{
					onFocusableItemAdd: C,
					onFocusableItemRemove: j,
					currentTabStopId: N,
				} = h,
				T = Zj();
			return (
				st(() => {
					if (!(!T || !f)) return C(), () => j();
				}, [T, f, C, j]),
				x.useEffect(() => {
					if (!(T || !f)) return C(), () => j();
				}, [T, f, C, j]),
				u.jsx(If.ItemSlot, {
					scope: o,
					id: S,
					focusable: f,
					active: d,
					children: u.jsx(ke.span, {
						tabIndex: w ? 0 : -1,
						"data-orientation": h.orientation,
						...y,
						ref: r,
						onMouseDown: Ne(i.onMouseDown, (z) => {
							f ? h.onItemFocus(S) : z.preventDefault();
						}),
						onFocus: Ne(i.onFocus, () => h.onItemFocus(S)),
						onKeyDown: Ne(i.onKeyDown, (z) => {
							if (z.key === "Tab" && z.shiftKey) {
								h.onItemShiftTab();
								return;
							}
							if (z.target !== z.currentTarget) return;
							const R = ox(z, h.orientation, h.dir);
							if (R !== void 0) {
								if (z.metaKey || z.ctrlKey || z.altKey || z.shiftKey) return;
								z.preventDefault();
								let L = E()
									.filter((Y) => Y.focusable)
									.map((Y) => Y.ref.current);
								if (R === "last") L.reverse();
								else if (R === "prev" || R === "next") {
									R === "prev" && L.reverse();
									const Y = L.indexOf(z.currentTarget);
									L = h.loop ? sx(L, Y + 1) : L.slice(Y + 1);
								}
								setTimeout(() => Ad(L));
							}
						}),
						children:
							typeof v == "function"
								? v({ isCurrentTabStop: w, hasTabStop: N != null })
								: v,
					}),
				})
			);
		}, "RovingFocusGroupItem"),
	),
	rT = {
		ArrowLeft: "prev",
		ArrowUp: "prev",
		ArrowRight: "next",
		ArrowDown: "next",
		PageUp: "first",
		Home: "first",
		PageDown: "last",
		End: "last",
	};
function rx(l, i) {
	return i !== "rtl"
		? l
		: l === "ArrowLeft"
			? "ArrowRight"
			: l === "ArrowRight"
				? "ArrowLeft"
				: l;
}
ql(rx, "getDirectionAwareKey");
function ox(l, i, r) {
	const o = rx(l.key, r);
	if (
		!(i === "vertical" && ["ArrowLeft", "ArrowRight"].includes(o)) &&
		!(i === "horizontal" && ["ArrowUp", "ArrowDown"].includes(o))
	)
		return rT[o];
}
ql(ox, "getFocusIntent");
function Ad(l, i = !1) {
	const r = document.activeElement;
	for (const o of l)
		if (
			o === r ||
			(o.focus({ preventScroll: i }), document.activeElement !== r)
		)
			return;
}
ql(Ad, "focusFirst");
function sx(l, i) {
	return l.map((r, o) => l[(i + o) % l.length]);
}
ql(sx, "wrapArray");
var oT = nT,
	sT = iT,
	cT = Object.defineProperty,
	Pi = (l, i) => cT(l, "name", { value: i, configurable: !0 }),
	Rd = "Tabs",
	[uT, YT] = qn(Rd, [ix]),
	cx = ix(),
	[fT, Md] = uT(Rd),
	dT = x.forwardRef(
		Pi((i, r) => {
			const {
					__scopeTabs: o,
					value: f,
					onValueChange: d,
					defaultValue: m,
					orientation: v = "horizontal",
					dir: y,
					activationMode: g = "automatic",
					...S
				} = i,
				h = Zr(y),
				[w, E] = tl({ prop: f, onChange: d, defaultProp: m ?? "", caller: Rd });
			return u.jsx(fT, {
				scope: o,
				baseId: Fa(),
				value: w,
				onValueChange: E,
				orientation: v,
				dir: h,
				activationMode: g,
				children: u.jsx(ke.div, {
					dir: h,
					"data-orientation": v,
					...S,
					ref: r,
				}),
			});
		}, "Tabs"),
	),
	mT = "TabsList",
	hT = x.forwardRef(
		Pi((i, r) => {
			const { __scopeTabs: o, loop: f = !0, ...d } = i,
				m = Md(mT, o),
				v = cx(o);
			return u.jsx(oT, {
				asChild: !0,
				...v,
				orientation: m.orientation,
				dir: m.dir,
				loop: f,
				children: u.jsx(ke.div, {
					role: "tablist",
					"aria-orientation": m.orientation,
					...d,
					ref: r,
				}),
			});
		}, "TabsList"),
	),
	pT = "TabsTrigger",
	gT = x.forwardRef(
		Pi((i, r) => {
			const { __scopeTabs: o, value: f, disabled: d = !1, ...m } = i,
				v = Md(pT, o),
				y = cx(o),
				g = Od(v.baseId, f),
				S = Dd(v.baseId, f),
				h = f === v.value;
			return u.jsx(sT, {
				asChild: !0,
				...y,
				focusable: !d,
				active: h,
				children: u.jsx(ke.button, {
					type: "button",
					role: "tab",
					"aria-selected": h,
					"aria-controls": S,
					"data-state": h ? "active" : "inactive",
					"data-disabled": d ? "" : void 0,
					disabled: d,
					id: g,
					...m,
					ref: r,
					onMouseDown: Ne(i.onMouseDown, (w) => {
						!d && w.button === 0 && w.ctrlKey === !1
							? v.onValueChange(f)
							: w.preventDefault();
					}),
					onKeyDown: Ne(i.onKeyDown, (w) => {
						d ||
							w.target !== w.currentTarget ||
							([" ", "Enter"].includes(w.key) && v.onValueChange(f));
					}),
					onFocus: Ne(i.onFocus, () => {
						const w = v.activationMode !== "manual";
						!h && !d && w && v.onValueChange(f);
					}),
				}),
			});
		}, "TabsTrigger"),
	),
	vT = "TabsContent",
	yT = x.forwardRef(
		Pi((i, r) => {
			const { __scopeTabs: o, value: f, forceMount: d, children: m, ...v } = i,
				y = Md(vT, o),
				g = Od(y.baseId, f),
				S = Dd(y.baseId, f),
				h = f === y.value,
				w = x.useRef(h);
			return (
				x.useEffect(() => {
					const E = requestAnimationFrame(() => (w.current = !1));
					return () => cancelAnimationFrame(E);
				}, []),
				u.jsx(Kr, {
					present: d || h,
					children: ({ present: E }) =>
						u.jsx(ke.div, {
							"data-state": h ? "active" : "inactive",
							"data-orientation": y.orientation,
							role: "tabpanel",
							"aria-labelledby": g,
							hidden: !E,
							id: S,
							tabIndex: 0,
							...v,
							ref: r,
							style: {
								...i.style,
								animationDuration: w.current ? "0s" : void 0,
							},
							children: E && m,
						}),
				})
			);
		}, "TabsContent"),
	);
function Od(l, i) {
	return `${l}-trigger-${i}`;
}
Pi(Od, "makeTriggerId");
function Dd(l, i) {
	return `${l}-content-${i}`;
}
Pi(Dd, "makeContentId");
var xT = dT,
	ux = hT,
	fx = gT,
	dx = yT;
const bT = xT,
	mx = x.forwardRef(({ className: l, ...i }, r) =>
		u.jsx(ux, {
			ref: r,
			className: $e(
				"inline-flex h-11 items-center justify-start rounded-xl bg-card/60 p-1 text-muted-foreground border border-border/50 backdrop-blur-md gap-1",
				l,
			),
			...i,
		}),
	);
mx.displayName = ux.displayName;
const ki = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx(fx, {
		ref: r,
		className: $e(
			"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-sm hover:text-foreground",
			l,
		),
		...i,
	}),
);
ki.displayName = fx.displayName;
const Li = x.forwardRef(({ className: l, ...i }, r) =>
	u.jsx(dx, {
		ref: r,
		className: $e(
			"mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
			l,
		),
		...i,
	}),
);
Li.displayName = dx.displayName;
const ST = ({ chat: l, role: i, onToggleAllowed: r }) => {
		var g, S;
		const o = i === "owner",
			f = l.isAdmin || o,
			d = Math.round((l.reply_probability ?? 0.05) * 100),
			[m, v] = x.useState(d),
			y = async (h) => {
				const w = h[0] / 100;
				try {
					await jt(`/api/chats/${l.chat_id}`, {
						method: "PATCH",
						body: JSON.stringify({ reply_probability: w }),
					}),
						Ge.success(`Reply probability updated to ${h[0]}%.`);
				} catch (E) {
					const C = E instanceof Error ? E.message : "Update failed";
					Ge.error(C);
				}
			};
		return u.jsxs(yt, {
			className:
				"glass-card hover:border-primary/40 transition-all duration-200",
			children: [
				u.jsx(xa, {
					className: "p-4 pb-2",
					children: u.jsxs("div", {
						className: "flex items-start justify-between gap-2",
						children: [
							u.jsxs("div", {
								className: "min-w-0",
								children: [
									u.jsx(ba, {
										className: "text-sm font-semibold truncate text-foreground",
										children: l.title || `Group ${l.chat_id}`,
									}),
									u.jsx("span", {
										className:
											"text-[11px] font-mono text-muted-foreground block",
										children: l.chat_id,
									}),
								],
							}),
							o
								? u.jsxs("div", {
										className:
											"flex items-center gap-2 bg-background/50 border border-border/50 px-2.5 py-1 rounded-full shrink-0",
										children: [
											u.jsx("span", {
												className:
													"text-[11px] font-medium text-muted-foreground",
												children: "Allowed",
											}),
											u.jsx(Td, {
												checked: l.is_allowed,
												onCheckedChange: () => r(l.chat_id, l.is_allowed),
											}),
										],
									})
								: l.is_allowed
									? u.jsx($a, {
											variant: "success",
											className: "text-[10px]",
											children: "Allowed",
										})
									: u.jsx($a, {
											variant: "destructive",
											className: "text-[10px]",
											children: "Inactive",
										}),
						],
					}),
				}),
				u.jsxs(St, {
					className: "p-4 pt-2 space-y-3.5 text-xs",
					children: [
						u.jsxs("div", {
							className:
								"grid grid-cols-3 gap-2 p-2 rounded-lg bg-background/50 border border-border/40 text-center",
							children: [
								u.jsxs("div", {
									children: [
										u.jsxs("div", {
											className:
												"text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1",
											children: [
												u.jsx(Pr, { className: "w-3 h-3" }),
												u.jsx("span", { children: "Msgs" }),
											],
										}),
										u.jsx("div", {
											className:
												"font-semibold font-mono text-foreground mt-0.5",
											children:
												((g = l.stats) == null ? void 0 : g.totalMessages) ?? 0,
										}),
									],
								}),
								u.jsxs("div", {
									children: [
										u.jsxs("div", {
											className:
												"text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1",
											children: [
												u.jsx(Hl, { className: "w-3 h-3" }),
												u.jsx("span", { children: "Users" }),
											],
										}),
										u.jsx("div", {
											className:
												"font-semibold font-mono text-foreground mt-0.5",
											children:
												((S = l.stats) == null ? void 0 : S.uniqueUsers) ?? 0,
										}),
									],
								}),
								u.jsxs("div", {
									children: [
										u.jsxs("div", {
											className:
												"text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1",
											children: [
												u.jsx(Qr, { className: "w-3 h-3" }),
												u.jsx("span", { children: "Facts" }),
											],
										}),
										u.jsx("div", {
											className:
												"font-semibold font-mono text-foreground mt-0.5",
											children: l.memoryCount ?? 0,
										}),
									],
								}),
							],
						}),
						f
							? u.jsxs("div", {
									className: "space-y-1.5 pt-1",
									children: [
										u.jsxs("div", {
											className: "flex items-center justify-between text-xs",
											children: [
												u.jsxs("span", {
													className:
														"font-medium text-muted-foreground flex items-center gap-1",
													children: [
														u.jsx(_S, { className: "w-3 h-3" }),
														u.jsx("span", { children: "Reply Likelihood:" }),
													],
												}),
												u.jsxs("span", {
													className: "font-mono font-bold text-primary",
													children: [m, "%"],
												}),
											],
										}),
										u.jsx(Ed, {
											value: [m],
											min: 0,
											max: 100,
											step: 1,
											onValueChange: (h) => v(h[0]),
											onValueCommit: y,
										}),
									],
								})
							: u.jsxs("div", {
									className:
										"text-[11px] text-muted-foreground flex items-center gap-1",
									children: [
										u.jsx("span", { children: "Reply Rate: " }),
										u.jsxs("span", {
											className: "font-mono font-medium text-foreground",
											children: [m, "%"],
										}),
									],
								}),
					],
				}),
			],
		});
	},
	wT = ({ chats: l, role: i, isLoading: r, onRefresh: o }) => {
		const f = async (d, m) => {
			const v = !m;
			try {
				await jt(`/api/chats/${d}`, {
					method: "PATCH",
					body: JSON.stringify({ is_allowed: v }),
				}),
					Ge.success(
						v ? "Group whitelisted!" : "Group removed from whitelist.",
					),
					o();
			} catch (y) {
				const g = y instanceof Error ? y.message : "Update failed";
				Ge.error(g);
			}
		};
		return u.jsxs("div", {
			className: "space-y-4 animate-in fade-in duration-200",
			children: [
				u.jsxs("div", {
					className: "flex items-center justify-between",
					children: [
						u.jsxs("div", {
							children: [
								u.jsxs("h3", {
									className:
										"text-base sm:text-lg font-bold text-foreground flex items-center gap-2",
									children: [
										u.jsx(Hl, { className: "w-5 h-5 text-primary" }),
										u.jsx("span", { children: "Groups & Channel Permissions" }),
									],
								}),
								u.jsx("p", {
									className: "text-xs text-muted-foreground",
									children:
										i === "owner"
											? "Manage bot whitelist permissions and random reply probabilities across all channels."
											: "Overview and manage parameters for your assigned Telegram groups.",
								}),
							],
						}),
						u.jsxs(tt, {
							variant: "outline",
							size: "sm",
							onClick: o,
							className: "h-8 text-xs flex items-center gap-1.5",
							children: [
								u.jsx(Vr, { className: "w-3.5 h-3.5" }),
								u.jsx("span", { children: "Refresh" }),
							],
						}),
					],
				}),
				u.jsx("div", {
					className: "grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1",
					children:
						r && l.length === 0
							? u.jsxs("div", {
									className:
										"col-span-full py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2",
									children: [
										u.jsx(Vr, {
											className: "w-6 h-6 animate-spin text-primary",
										}),
										u.jsx("span", { children: "Loading registered groups..." }),
									],
								})
							: l.length > 0
								? l.map((d) =>
										u.jsx(
											ST,
											{ chat: d, role: i, onToggleAllowed: f },
											d.chat_id,
										),
									)
								: u.jsxs("div", {
										className:
											"col-span-full py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 border border-dashed border-border/60 rounded-2xl bg-card/30",
										children: [
											u.jsx(zv, { className: "w-8 h-8 opacity-40" }),
											u.jsx("div", {
												className: "text-sm font-medium text-foreground",
												children: "No groups registered",
											}),
											u.jsx("p", {
												className: "text-xs text-muted-foreground max-w-sm",
												children:
													"The bot has not been added to any Telegram groups yet. Add the bot to your group to manage it here.",
											}),
										],
									}),
				}),
			],
		});
	};
function ET(l) {
	switch (l) {
		case "PROFILE":
			return "profile";
		case "DYNAMIC":
			return "dynamic";
		case "TEMPORARY":
			return "temporary";
		default:
			return "default";
	}
}
const NT = ({
	memory: l,
	role: i,
	adminChatIds: r,
	currentUser: o,
	chatLabel: f,
	onEdit: d,
	onDelete: m,
}) => {
	const [v, y] = x.useState(!1),
		g = i === "owner",
		S = r.includes(l.chat_id),
		h = o && l.user_id === o.id,
		w = g || S || h,
		E = () => {
			navigator.clipboard &&
				(navigator.clipboard.writeText(l.memory_text),
				y(!0),
				Ge.success("Fact copied to clipboard!"),
				setTimeout(() => y(!1), 2e3));
		};
	return u.jsx(yt, {
		className: "glass-card hover:border-primary/40 transition-all duration-200",
		children: u.jsxs("div", {
			className: "p-4 sm:p-5 space-y-3",
			children: [
				u.jsxs("div", {
					className:
						"flex items-center justify-between gap-2 flex-wrap text-xs",
					children: [
						u.jsxs("div", {
							className: "flex items-center gap-2 flex-wrap",
							children: [
								u.jsx($a, {
									variant: ET(l.category),
									children: l.category || "PROFILE",
								}),
								u.jsx("span", {
									className:
										"px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[11px] font-medium truncate max-w-[200px]",
									children: f,
								}),
							],
						}),
						u.jsx("span", {
							className: "text-[11px] text-muted-foreground font-mono",
							children: Dw(l.created_at),
						}),
					],
				}),
				u.jsx("p", {
					className:
						"text-xs sm:text-sm text-foreground leading-relaxed break-words font-sans",
					children: l.memory_text,
				}),
				u.jsxs("div", {
					className:
						"flex items-center justify-between pt-2 border-t border-border/40 text-xs",
					children: [
						u.jsx(tt, {
							variant: "ghost",
							size: "sm",
							onClick: E,
							className:
								"h-7 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs",
							children: v
								? u.jsxs(u.Fragment, {
										children: [
											u.jsx($f, { className: "w-3.5 h-3.5 text-emerald-400" }),
											u.jsx("span", {
												className: "text-emerald-400",
												children: "Copied",
											}),
										],
									})
								: u.jsxs(u.Fragment, {
										children: [
											u.jsx(Rv, { className: "w-3.5 h-3.5" }),
											u.jsx("span", { children: "Copy" }),
										],
									}),
						}),
						w &&
							u.jsxs("div", {
								className: "flex items-center gap-1",
								children: [
									u.jsxs(tt, {
										variant: "ghost",
										size: "sm",
										onClick: () => d(l),
										className:
											"h-7 px-2 text-muted-foreground hover:text-blue-400 flex items-center gap-1 text-xs",
										children: [
											u.jsx(jS, { className: "w-3.5 h-3.5" }),
											u.jsx("span", { children: "Edit" }),
										],
									}),
									u.jsxs(tt, {
										variant: "ghost",
										size: "sm",
										onClick: () => m(l),
										className:
											"h-7 px-2 text-muted-foreground hover:text-destructive flex items-center gap-1 text-xs",
										children: [
											u.jsx(Ff, { className: "w-3.5 h-3.5" }),
											u.jsx("span", { children: "Delete" }),
										],
									}),
								],
							}),
					],
				}),
			],
		}),
	});
};
function CT(l, i, r, o, f, d) {
	var m;
	if (
		(i === "mine" && d && l.user_id && l.user_id !== d.id) ||
		(r !== "all" && l.chat_id !== r) ||
		(o !== "all" && l.category !== o)
	)
		return !1;
	if (f.trim()) {
		const v = f.toLowerCase(),
			y = l.memory_text.toLowerCase().includes(v),
			g = (m = l.category) == null ? void 0 : m.toLowerCase().includes(v);
		if (!y && !g) return !1;
	}
	return !0;
}
const jT = ({
		memories: l,
		chats: i,
		currentUser: r,
		role: o,
		adminChatIds: f,
		isLoading: d,
		onOpenAddModal: m,
		onOpenEditModal: v,
		onRefresh: y,
	}) => {
		const [g, S] = x.useState(""),
			[h, w] = x.useState("mine"),
			[E, C] = x.useState("all"),
			[j, N] = x.useState("all"),
			[T, z] = x.useState(!1),
			R = x.useRef(null),
			O = x.useMemo(
				() => l.filter((ee) => CT(ee, h, E, j, g, r)),
				[l, h, E, j, g, r],
			),
			L = async (ee) => {
				if (
					window.confirm(
						"Are you sure you want to permanently delete this memory?",
					)
				)
					try {
						await jt(`/api/memories/${ee.id}`, { method: "DELETE" }),
							Ge.success("Memory deleted."),
							y();
					} catch (ce) {
						const te = ce instanceof Error ? ce.message : "Delete failed";
						Ge.error(te);
					}
			},
			Y = async () => {
				if (window.confirm("Prune all expired temporary memories now?"))
					try {
						z(!0);
						const ee = await jt("/api/memories/prune", {
							method: "POST",
							body: JSON.stringify(E !== "all" ? { chatId: E } : {}),
						});
						Ge.success(`Pruned ${ee.prunedCount} expired memories.`), y();
					} catch (ee) {
						const ce = ee instanceof Error ? ee.message : "Prune failed";
						Ge.error(ce);
					} finally {
						z(!1);
					}
			},
			X = async () => {
				try {
					const ee = await jt("/api/memories/export"),
						ce = new Blob([JSON.stringify(ee, null, 2)], {
							type: "application/json",
						}),
						te = URL.createObjectURL(ce),
						se = document.createElement("a");
					(se.href = te),
						(se.download = `ket_memories_${Date.now()}.json`),
						se.click(),
						URL.revokeObjectURL(te),
						Ge.success("Export downloaded!");
				} catch (ee) {
					const ce = ee instanceof Error ? ee.message : "Export failed";
					Ge.error(ce);
				}
			},
			q = async (ee) => {
				var te;
				const ce = (te = ee.target.files) == null ? void 0 : te[0];
				if (ce)
					try {
						const se = await ce.text(),
							le = JSON.parse(se),
							ue = Array.isArray(le) ? le : le.memories;
						if (!Array.isArray(ue))
							throw new Error("Invalid format: expected memories array.");
						const M = await jt("/api/memories/import", {
							method: "POST",
							body: JSON.stringify({ memories: ue }),
						});
						Ge.success(`Imported ${M.importedCount} memory records!`), y();
					} catch (se) {
						const le = se instanceof Error ? se.message : "Import failed";
						Ge.error(le);
					} finally {
						R.current && (R.current.value = "");
					}
			},
			J = (ee) => {
				if (r && ee === r.id.toString()) return "Personal Profile";
				const ce = i.find((te) => te.chat_id === ee);
				return (ce == null ? void 0 : ce.title) || `Chat ${ee}`;
			};
		return u.jsxs("div", {
			className: "space-y-4 animate-in fade-in duration-200",
			children: [
				u.jsxs("div", {
					className:
						"flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between",
					children: [
						u.jsxs("div", {
							className: "relative flex-1",
							children: [
								u.jsx(Ov, {
									className:
										"w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
								}),
								u.jsx(Hi, {
									placeholder: "Search semantic memories & facts...",
									value: g,
									onChange: (ee) => S(ee.target.value),
									className: "pl-9 bg-card/60",
								}),
							],
						}),
						u.jsxs("div", {
							className: "flex items-center gap-2 flex-wrap",
							children: [
								o !== "user" &&
									u.jsxs(u.Fragment, {
										children: [
											u.jsxs(tt, {
												variant: "outline",
												size: "sm",
												onClick: X,
												className: "flex items-center gap-1.5 text-xs h-9",
												children: [
													u.jsx(cS, { className: "w-3.5 h-3.5" }),
													u.jsx("span", {
														className: "hidden sm:inline",
														children: "Export",
													}),
												],
											}),
											u.jsxs(tt, {
												variant: "outline",
												size: "sm",
												onClick: () => {
													var ee;
													return (ee = R.current) == null ? void 0 : ee.click();
												},
												className: "flex items-center gap-1.5 text-xs h-9",
												children: [
													u.jsx(KS, { className: "w-3.5 h-3.5" }),
													u.jsx("span", {
														className: "hidden sm:inline",
														children: "Import",
													}),
												],
											}),
											u.jsx("input", {
												type: "file",
												ref: R,
												accept: ".json",
												className: "hidden",
												onChange: q,
											}),
											u.jsxs(tt, {
												variant: "outline",
												size: "sm",
												onClick: Y,
												disabled: T,
												className:
													"flex items-center gap-1.5 text-xs h-9 text-amber-400 hover:text-amber-300",
												children: [
													u.jsx(Ff, { className: "w-3.5 h-3.5" }),
													u.jsx("span", {
														children: T ? "Pruning..." : "Prune",
													}),
												],
											}),
										],
									}),
								u.jsxs(tt, {
									size: "sm",
									onClick: m,
									className:
										"flex items-center gap-1.5 text-xs h-9 shadow-md shadow-primary/20",
									children: [
										u.jsx(Ug, { className: "w-4 h-4" }),
										u.jsx("span", { children: "New Fact" }),
									],
								}),
							],
						}),
					],
				}),
				u.jsxs("div", {
					className: "grid grid-cols-1 sm:grid-cols-3 gap-2.5",
					children: [
						u.jsxs(Wa, {
							value: h,
							onValueChange: w,
							children: [
								u.jsx(ha, {
									className: "w-full bg-card/60",
									children: u.jsx(el, { placeholder: "Scope" }),
								}),
								u.jsxs(pa, {
									children: [
										u.jsx(et, { value: "mine", children: "My Personal Facts" }),
										u.jsx(et, {
											value: "all",
											children: "All Accessible Memories",
										}),
									],
								}),
							],
						}),
						u.jsxs(Wa, {
							value: E,
							onValueChange: C,
							children: [
								u.jsx(ha, {
									className: "w-full bg-card/60",
									children: u.jsx(el, { placeholder: "All Groups" }),
								}),
								u.jsxs(pa, {
									children: [
										u.jsx(et, {
											value: "all",
											children: "All Groups / Contexts",
										}),
										i.map((ee) =>
											u.jsx(
												et,
												{
													value: ee.chat_id,
													children: ee.title || `Chat ${ee.chat_id}`,
												},
												ee.chat_id,
											),
										),
									],
								}),
							],
						}),
						u.jsxs(Wa, {
							value: j,
							onValueChange: N,
							children: [
								u.jsx(ha, {
									className: "w-full bg-card/60",
									children: u.jsx(el, { placeholder: "All Categories" }),
								}),
								u.jsxs(pa, {
									children: [
										u.jsx(et, { value: "all", children: "All Categories" }),
										u.jsx(et, { value: "PROFILE", children: "PROFILE" }),
										u.jsx(et, { value: "DYNAMIC", children: "DYNAMIC" }),
										u.jsx(et, { value: "TEMPORARY", children: "TEMPORARY" }),
									],
								}),
							],
						}),
					],
				}),
				u.jsx("div", {
					className: "space-y-3 pt-2",
					children:
						d && l.length === 0
							? u.jsxs("div", {
									className:
										"py-16 text-center text-muted-foreground flex flex-col items-center gap-3",
									children: [
										u.jsx(kl, {
											className: "w-6 h-6 animate-pulse text-primary",
										}),
										u.jsx("span", {
											className: "text-xs",
											children: "Loading semantic facts...",
										}),
									],
								})
							: O.length > 0
								? O.map((ee) =>
										u.jsx(
											NT,
											{
												memory: ee,
												role: o,
												adminChatIds: f,
												currentUser: r,
												chatLabel: J(ee.chat_id),
												onEdit: v,
												onDelete: L,
											},
											ee.id,
										),
									)
								: u.jsxs("div", {
										className:
											"py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 border border-dashed border-border/60 rounded-2xl bg-card/30",
										children: [
											u.jsx(pS, { className: "w-8 h-8 opacity-40" }),
											u.jsx("div", {
												className: "text-sm font-medium text-foreground",
												children: "No memory records found",
											}),
											u.jsx("p", {
												className: "text-xs text-muted-foreground max-w-sm",
												children:
													"No facts match your search filters. You can record a new fact anytime.",
											}),
											u.jsxs(tt, {
												size: "sm",
												onClick: m,
												className: "mt-2 text-xs",
												children: [
													u.jsx(Ug, { className: "w-3.5 h-3.5 mr-1" }),
													"Add First Fact",
												],
											}),
										],
									}),
				}),
			],
		});
	},
	TT = () => {
		const [l, i] = x.useState(""),
			[r, o] = x.useState(!1),
			[f, d] = x.useState(null),
			[m, v] = x.useState(!1),
			y = [
				"What is your identity and what group are we in?",
				"Summarize what you know about the bot owner.",
				"Search the web for the latest TypeScript release features.",
				"Explain the difference between PROFILE and TEMPORARY memories.",
			],
			g = async () => {
				if (!l.trim()) {
					Ge.error("Please enter a test prompt.");
					return;
				}
				try {
					o(!0);
					const h = await jt("/api/sandbox", {
						method: "POST",
						body: JSON.stringify({ prompt: l.trim() }),
					});
					d(h), Ge.success("Reasoning loop completed!");
				} catch (h) {
					const w = h instanceof Error ? h.message : "Execution failed";
					Ge.error(w);
				} finally {
					o(!1);
				}
			},
			S = () => {
				f != null &&
					f.reply &&
					navigator.clipboard &&
					(navigator.clipboard.writeText(f.reply),
					v(!0),
					Ge.success("Response copied to clipboard!"),
					setTimeout(() => v(!1), 2e3));
			};
		return u.jsxs("div", {
			className: "space-y-6 animate-in fade-in duration-200",
			children: [
				u.jsxs(yt, {
					className: "glass-card",
					children: [
						u.jsxs(xa, {
							className: "pb-4",
							children: [
								u.jsxs(ba, {
									className: "text-base sm:text-lg flex items-center gap-2",
									children: [
										u.jsx(kl, { className: "w-5 h-5 text-primary" }),
										u.jsx("span", { children: "AI Reasoning Sandbox" }),
									],
								}),
								u.jsx(ll, {
									children:
										"Directly test Gemini agent system instructions, memory retrieval, and tool grounding.",
								}),
							],
						}),
						u.jsxs(St, {
							className: "space-y-4",
							children: [
								u.jsxs("div", {
									className: "space-y-2",
									children: [
										u.jsx("label", {
											htmlFor: "sandbox-prompt-input",
											className: "text-xs font-semibold text-foreground",
											children: "Input Prompt / Query",
										}),
										u.jsx(xd, {
											id: "sandbox-prompt-input",
											placeholder:
												"Enter a prompt or question to test Gemini...",
											value: l,
											onChange: (h) => i(h.target.value),
											rows: 4,
											className:
												"resize-none font-sans text-xs sm:text-sm bg-background/50",
										}),
									],
								}),
								u.jsxs("div", {
									className: "space-y-1.5",
									children: [
										u.jsx("div", {
											className:
												"text-[11px] font-medium text-muted-foreground",
											children: "Quick test templates:",
										}),
										u.jsx("div", {
											className: "flex flex-wrap gap-1.5",
											children: y.map((h) =>
												u.jsx(
													"button",
													{
														type: "button",
														onClick: () => i(h),
														className:
															"px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground text-xs transition-colors border border-border/40 text-left truncate max-w-xs",
														children: h,
													},
													h,
												),
											),
										}),
									],
								}),
								u.jsxs("div", {
									className:
										"flex items-center justify-between pt-2 border-t border-border/40",
									children: [
										u.jsx("div", {
											className: "flex items-center gap-2",
											children:
												f &&
												u.jsxs("div", {
													className: "flex items-center gap-2 text-xs",
													children: [
														u.jsxs($a, {
															variant: "outline",
															className:
																"flex items-center gap-1 font-mono text-[11px]",
															children: [
																u.jsx(QS, {
																	className: "w-3 h-3 text-emerald-400",
																}),
																u.jsxs("span", {
																	children: [f.executionTimeMs, "ms"],
																}),
															],
														}),
														u.jsx($a, {
															variant: "outline",
															className: "font-mono text-[11px]",
															children: f.model,
														}),
													],
												}),
										}),
										u.jsxs(tt, {
											onClick: g,
											disabled: r,
											className:
												"flex items-center gap-2 text-xs shadow-md shadow-primary/20",
											children: [
												u.jsx(RS, {
													className: `w-3.5 h-3.5 ${r ? "animate-spin" : ""}`,
												}),
												u.jsx("span", {
													children: r ? "Reasoning..." : "Execute Test",
												}),
											],
										}),
									],
								}),
							],
						}),
					],
				}),
				u.jsxs(yt, {
					className: "glass-card",
					children: [
						u.jsxs(xa, {
							className: "pb-3 flex flex-row items-center justify-between",
							children: [
								u.jsxs("div", {
									children: [
										u.jsxs(ba, {
											className:
												"text-sm font-semibold flex items-center gap-2",
											children: [
												u.jsx(_v, { className: "w-4 h-4 text-blue-400" }),
												u.jsx("span", { children: "Model Output" }),
											],
										}),
										u.jsx(ll, {
											className: "text-xs",
											children: "Complete response returned by Gemini engine.",
										}),
									],
								}),
								(f == null ? void 0 : f.reply) &&
									u.jsx(tt, {
										variant: "ghost",
										size: "sm",
										onClick: S,
										className: "h-8 text-xs flex items-center gap-1.5",
										children: m
											? u.jsxs(u.Fragment, {
													children: [
														u.jsx($f, {
															className: "w-3.5 h-3.5 text-emerald-400",
														}),
														u.jsx("span", {
															className: "text-emerald-400",
															children: "Copied",
														}),
													],
												})
											: u.jsxs(u.Fragment, {
													children: [
														u.jsx(Rv, { className: "w-3.5 h-3.5" }),
														u.jsx("span", { children: "Copy" }),
													],
												}),
									}),
							],
						}),
						u.jsx(St, {
							children: u.jsx("div", {
								className:
									"rounded-xl border border-zinc-800 bg-black/90 p-4 font-mono text-xs leading-relaxed min-h-[160px] text-zinc-200 overflow-x-auto whitespace-pre-wrap",
								children: r
									? u.jsxs("div", {
											className:
												"flex items-center gap-2 text-zinc-500 py-8 justify-center",
											children: [
												u.jsx(kl, {
													className: "w-4 h-4 animate-spin text-primary",
												}),
												u.jsx("span", {
													children:
														"Executing multi-step reasoning agent loop...",
												}),
											],
										})
									: f != null && f.reply
										? f.reply
										: u.jsxs("div", {
												className:
													"text-zinc-500 py-8 text-center flex flex-col items-center gap-2",
												children: [
													u.jsx(tS, { className: "w-6 h-6 opacity-40" }),
													u.jsx("span", {
														children:
															"Enter a prompt above and click Execute to test.",
													}),
												],
											}),
							}),
						}),
					],
				}),
			],
		});
	},
	_T = () => {
		const [l, i] = x.useState({
				gemini_model: "gemini-3.5-flash-lite",
				default_reply_probability: 0.05,
				chat_history_limit: 10,
				max_agent_steps: 3,
				log_level: "info",
				enable_web_search: !0,
			}),
			[r, o] = x.useState(!1),
			[f, d] = x.useState(!1),
			m = x.useCallback(async () => {
				try {
					const S = await jt("/api/settings");
					i(S);
				} catch (S) {
					const h = S instanceof Error ? S.message : "Failed to load settings";
					Ge.error(h);
				}
			}, []);
		x.useEffect(() => {
			m();
		}, [m]);
		const v = async () => {
				try {
					o(!0),
						await jt("/api/settings", {
							method: "PATCH",
							body: JSON.stringify(l),
						}),
						Ge.success("Global bot settings saved!");
				} catch (S) {
					const h = S instanceof Error ? S.message : "Save failed";
					Ge.error(h);
				} finally {
					o(!1);
				}
			},
			y = async () => {
				if (window.confirm("Clear memory vector embedding cache?"))
					try {
						d(!0),
							await jt("/api/settings/cache-clear", { method: "POST" }),
							Ge.success("Embedding cache purged successfully.");
					} catch (S) {
						const h = S instanceof Error ? S.message : "Cache clear failed";
						Ge.error(h);
					} finally {
						d(!1);
					}
			},
			g = Math.round((l.default_reply_probability ?? 0.05) * 100);
		return u.jsxs(yt, {
			className: "glass-card",
			children: [
				u.jsxs(xa, {
					className: "pb-4 flex flex-row items-center justify-between",
					children: [
						u.jsxs("div", {
							children: [
								u.jsxs(ba, {
									className: "text-base sm:text-lg flex items-center gap-2",
									children: [
										u.jsx(Dv, { className: "w-5 h-5 text-primary" }),
										u.jsx("span", { children: "Bot Engine Settings" }),
									],
								}),
								u.jsx(ll, {
									children:
										"Configure AI parameters, grounding, reasoning steps, and system behavior.",
								}),
							],
						}),
						u.jsxs(tt, {
							variant: "outline",
							size: "sm",
							onClick: y,
							disabled: f,
							className: "text-xs h-8 text-amber-400 hover:text-amber-300",
							children: [
								u.jsx(Ff, { className: "w-3.5 h-3.5 mr-1" }),
								u.jsx("span", { children: f ? "Clearing..." : "Purge Cache" }),
							],
						}),
					],
				}),
				u.jsxs(St, {
					className: "space-y-5",
					children: [
						u.jsxs("div", {
							className: "space-y-3",
							children: [
								u.jsxs("div", {
									className:
										"text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5",
									children: [
										u.jsx(Mv, { className: "w-3.5 h-3.5 text-primary" }),
										u.jsx("span", { children: "AI Engine & Grounding" }),
									],
								}),
								u.jsxs("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
									children: [
										u.jsxs("div", {
											className: "space-y-1.5",
											children: [
												u.jsx("label", {
													htmlFor: "select-gemini-model-sys",
													className: "text-xs font-medium text-foreground",
													children: "Active Gemini Model",
												}),
												u.jsxs(Wa, {
													value: l.gemini_model || "gemini-3.5-flash-lite",
													onValueChange: (S) => i({ ...l, gemini_model: S }),
													children: [
														u.jsx(ha, {
															id: "select-gemini-model-sys",
															className: "w-full bg-background/50",
															children: u.jsx(el, {}),
														}),
														u.jsxs(pa, {
															children: [
																u.jsx(et, {
																	value: "gemini-3.5-flash-lite",
																	children:
																		"gemini-3.5-flash-lite (Fast & Standard)",
																}),
																u.jsx(et, {
																	value: "gemini-3.5-flash",
																	children: "gemini-3.5-flash (Balanced)",
																}),
																u.jsx(et, {
																	value: "gemini-3.5-pro",
																	children:
																		"gemini-3.5-pro (Advanced Reasoning)",
																}),
																u.jsx(et, {
																	value: "gemini-3.1-flash-lite",
																	children:
																		"gemini-3.1-flash-lite (Alternative)",
																}),
															],
														}),
													],
												}),
											],
										}),
										u.jsxs("div", {
											className: "space-y-1.5",
											children: [
												u.jsx("label", {
													htmlFor: "input-agent-steps-sys",
													className: "text-xs font-medium text-foreground",
													children: "Max Agent Reasoning Steps",
												}),
												u.jsx(Hi, {
													id: "input-agent-steps-sys",
													type: "number",
													min: 1,
													max: 10,
													value: l.max_agent_steps ?? 3,
													onChange: (S) =>
														i({
															...l,
															max_agent_steps:
																parseInt(S.target.value, 10) || 3,
														}),
													className: "bg-background/50",
												}),
											],
										}),
									],
								}),
								u.jsxs("div", {
									className:
										"flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50",
									children: [
										u.jsxs("div", {
											className: "space-y-0.5",
											children: [
												u.jsxs("div", {
													className:
														"text-xs font-semibold text-foreground flex items-center gap-1.5",
													children: [
														u.jsx(mS, {
															className: "w-3.5 h-3.5 text-blue-400",
														}),
														u.jsx("span", {
															children: "Google Web Search Grounding",
														}),
													],
												}),
												u.jsx("div", {
													className: "text-[11px] text-muted-foreground",
													children:
														"Enables dynamic search subagents to ground responses with real-time web facts.",
												}),
											],
										}),
										u.jsx(Td, {
											checked: l.enable_web_search ?? !0,
											onCheckedChange: (S) => i({ ...l, enable_web_search: S }),
										}),
									],
								}),
							],
						}),
						u.jsxs("div", {
							className: "space-y-3 pt-2 border-t border-border/40",
							children: [
								u.jsxs("div", {
									className:
										"text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5",
									children: [
										u.jsx(YS, { className: "w-3.5 h-3.5 text-primary" }),
										u.jsx("span", {
											children: "Behavior & Context Parameters",
										}),
									],
								}),
								u.jsxs("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
									children: [
										u.jsxs("div", {
											className: "space-y-2",
											children: [
												u.jsxs("div", {
													className:
														"flex items-center justify-between text-xs",
													children: [
														u.jsx("span", {
															className: "font-medium text-foreground",
															children: "Default Random Reply Rate",
														}),
														u.jsxs("span", {
															className: "font-mono font-bold text-primary",
															children: [g, "%"],
														}),
													],
												}),
												u.jsx(Ed, {
													value: [g],
													min: 0,
													max: 100,
													step: 1,
													onValueChange: (S) =>
														i({ ...l, default_reply_probability: S[0] / 100 }),
												}),
											],
										}),
										u.jsxs("div", {
											className: "space-y-1.5",
											children: [
												u.jsx("label", {
													htmlFor: "input-history-limit-sys",
													className: "text-xs font-medium text-foreground",
													children: "Chat Context Window Turns",
												}),
												u.jsx(Hi, {
													id: "input-history-limit-sys",
													type: "number",
													min: 5,
													max: 100,
													value: l.chat_history_limit ?? 10,
													onChange: (S) =>
														i({
															...l,
															chat_history_limit:
																parseInt(S.target.value, 10) || 10,
														}),
													className: "bg-background/50",
												}),
											],
										}),
									],
								}),
							],
						}),
						u.jsxs("div", {
							className: "space-y-3 pt-2 border-t border-border/40",
							children: [
								u.jsxs("div", {
									className:
										"text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5",
									children: [
										u.jsx(fS, { className: "w-3.5 h-3.5 text-primary" }),
										u.jsx("span", { children: "Diagnostic Logging" }),
									],
								}),
								u.jsxs("div", {
									className: "space-y-1.5 max-w-xs",
									children: [
										u.jsx("label", {
											htmlFor: "select-log-level-sys",
											className: "text-xs font-medium text-foreground",
											children: "Minimum Log Level",
										}),
										u.jsxs(Wa, {
											value: l.log_level || "info",
											onValueChange: (S) => i({ ...l, log_level: S }),
											children: [
												u.jsx(ha, {
													id: "select-log-level-sys",
													className: "w-full bg-background/50",
													children: u.jsx(el, {}),
												}),
												u.jsxs(pa, {
													children: [
														u.jsx(et, {
															value: "debug",
															children: "debug (Detailed trace)",
														}),
														u.jsx(et, {
															value: "info",
															children: "info (Standard runtime)",
														}),
														u.jsx(et, {
															value: "warn",
															children: "warn (Warnings & Errors)",
														}),
														u.jsx(et, {
															value: "error",
															children: "error (Critical only)",
														}),
													],
												}),
											],
										}),
									],
								}),
							],
						}),
						u.jsx("div", {
							className: "pt-2 flex justify-end",
							children: u.jsxs(tt, {
								onClick: v,
								disabled: r,
								className: "flex items-center gap-2 text-xs",
								children: [
									u.jsx(kl, { className: "w-4 h-4" }),
									u.jsx("span", {
										children: r ? "Saving..." : "Save Settings",
									}),
								],
							}),
						}),
					],
				}),
			],
		});
	},
	AT = () => {
		const [l, i] = x.useState([]),
			[r, o] = x.useState("app"),
			[f, d] = x.useState("ALL"),
			[m, v] = x.useState(""),
			[y, g] = x.useState(!1),
			S = x.useCallback(async () => {
				try {
					g(!0);
					const h = new URLSearchParams();
					r === "error" && h.append("type", "error"),
						f !== "ALL" && h.append("level", f),
						m.trim() && h.append("search", m.trim());
					const w = await jt(`/api/logs?${h.toString()}`);
					i(w.logs || []);
				} catch (h) {
					const w = h instanceof Error ? h.message : "Failed to fetch logs";
					Ge.error(w);
				} finally {
					g(!1);
				}
			}, [r, f, m]);
		return (
			x.useEffect(() => {
				S();
			}, [S]),
			u.jsxs(yt, {
				className: "glass-card",
				children: [
					u.jsxs(xa, {
						className: "pb-3 flex flex-row items-center justify-between",
						children: [
							u.jsxs("div", {
								children: [
									u.jsxs(ba, {
										className: "text-base sm:text-lg flex items-center gap-2",
										children: [
											u.jsx(kv, { className: "w-5 h-5 text-emerald-400" }),
											u.jsx("span", { children: "Live Console Stream" }),
										],
									}),
									u.jsx(ll, {
										children:
											"Real-time structured logs from application and error handlers.",
									}),
								],
							}),
							u.jsxs(tt, {
								variant: "outline",
								size: "sm",
								onClick: S,
								disabled: y,
								className: "h-8 text-xs flex items-center gap-1.5",
								children: [
									u.jsx(Vr, {
										className: `w-3.5 h-3.5 ${y ? "animate-spin" : ""}`,
									}),
									u.jsx("span", { children: "Refresh" }),
								],
							}),
						],
					}),
					u.jsxs(St, {
						className: "space-y-3",
						children: [
							u.jsxs("div", {
								className:
									"flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between text-xs",
								children: [
									u.jsx("div", {
										className:
											"flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border/50",
										children: ["ALL", "INFO", "WARN", "ERROR"].map((h) =>
											u.jsx(
												"button",
												{
													type: "button",
													onClick: () => d(h),
													className: `px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${f === h ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`,
													children: h,
												},
												h,
											),
										),
									}),
									u.jsxs("div", {
										className: "flex items-center gap-2",
										children: [
											u.jsxs(Wa, {
												value: r,
												onValueChange: (h) => o(h),
												children: [
													u.jsx(ha, {
														className: "w-32 bg-background/50 h-8 text-xs",
														children: u.jsx(el, {}),
													}),
													u.jsxs(pa, {
														children: [
															u.jsx(et, { value: "app", children: "app.log" }),
															u.jsx(et, {
																value: "error",
																children: "error.log",
															}),
														],
													}),
												],
											}),
											u.jsxs("div", {
												className: "relative flex-1 sm:w-48",
												children: [
													u.jsx(Ov, {
														className:
															"w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground",
													}),
													u.jsx(Hi, {
														placeholder: "Filter log text...",
														value: m,
														onChange: (h) => v(h.target.value),
														className: "pl-8 h-8 text-xs bg-background/50",
													}),
												],
											}),
										],
									}),
								],
							}),
							u.jsx("div", {
								className:
									"rounded-xl border border-zinc-800 bg-black/90 p-3.5 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto space-y-1 text-zinc-300",
								children:
									y && l.length === 0
										? u.jsx("div", {
												className: "text-zinc-500 py-4 text-center",
												children: "Loading log lines...",
											})
										: l.length > 0
											? l.map((h) => {
													const w = (h.level || "INFO").toUpperCase(),
														E =
															w === "ERROR"
																? "text-rose-400 bg-rose-500/10 border-rose-500/30"
																: w === "WARN"
																	? "text-amber-400 bg-amber-500/10 border-amber-500/30"
																	: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
													return u.jsxs(
														"div",
														{
															className:
																"flex items-start gap-2 break-all hover:bg-white/5 p-0.5 rounded",
															children: [
																u.jsx("span", {
																	className:
																		"text-zinc-500 shrink-0 select-none",
																	children: h.timestamp,
																}),
																u.jsx("span", {
																	className: `px-1 rounded border text-[10px] font-bold shrink-0 ${E}`,
																	children: w,
																}),
																u.jsx("span", {
																	className: "text-zinc-200",
																	children: h.message,
																}),
															],
														},
														`${h.timestamp}-${h.message}`,
													);
												})
											: u.jsx("div", {
													className: "text-zinc-500 py-4 text-center",
													children: "No matching log entries found.",
												}),
							}),
						],
					}),
				],
			})
		);
	},
	RT = () => {
		const [l, i] = x.useState([]),
			[r, o] = x.useState(!1),
			f = x.useCallback(async () => {
				try {
					o(!0);
					const d = await jt("/api/tool-traces");
					i(d.traces || []);
				} catch (d) {
					const m = d instanceof Error ? d.message : "Failed to fetch traces";
					Ge.error(m);
				} finally {
					o(!1);
				}
			}, []);
		return (
			x.useEffect(() => {
				f();
			}, [f]),
			u.jsxs(yt, {
				className: "glass-card",
				children: [
					u.jsxs(xa, {
						className: "pb-3 flex flex-row items-center justify-between",
						children: [
							u.jsxs("div", {
								children: [
									u.jsxs(ba, {
										className: "text-base sm:text-lg flex items-center gap-2",
										children: [
											u.jsx(WS, { className: "w-5 h-5 text-purple-400" }),
											u.jsx("span", { children: "Tool Execution Traces" }),
										],
									}),
									u.jsx(ll, {
										children:
											"Recent Gemini function call invocations and subagent execution results.",
									}),
								],
							}),
							u.jsxs(tt, {
								variant: "outline",
								size: "sm",
								onClick: f,
								disabled: r,
								className: "h-8 text-xs flex items-center gap-1.5",
								children: [
									u.jsx(Vr, {
										className: `w-3.5 h-3.5 ${r ? "animate-spin" : ""}`,
									}),
									u.jsx("span", { children: "Refresh" }),
								],
							}),
						],
					}),
					u.jsx(St, {
						children: u.jsx("div", {
							className:
								"rounded-xl border border-zinc-800 bg-black/90 p-3.5 font-mono text-[11px] max-h-64 overflow-y-auto space-y-2.5",
							children:
								r && l.length === 0
									? u.jsx("div", {
											className: "text-zinc-500 py-4 text-center",
											children: "Loading traces...",
										})
									: l.length > 0
										? l.map((d) =>
												u.jsxs(
													"div",
													{
														className:
															"p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80 space-y-1",
														children: [
															u.jsxs("div", {
																className:
																	"flex items-center justify-between text-xs",
																children: [
																	u.jsxs("span", {
																		className:
																			"text-purple-400 font-bold font-mono",
																		children: ["[", d.toolName, "]"],
																	}),
																	u.jsx("span", {
																		className: "text-[10px] text-zinc-500",
																		children: new Date(
																			d.timestamp,
																		).toLocaleTimeString(),
																	}),
																],
															}),
															u.jsxs("div", {
																className: "text-zinc-300 text-[11px]",
																children: [
																	u.jsx("span", {
																		className: "text-zinc-500",
																		children: "Args: ",
																	}),
																	JSON.stringify(d.args),
																],
															}),
															d.result !== void 0 &&
																u.jsxs("div", {
																	className:
																		"text-emerald-400 text-[11px] truncate",
																	children: [
																		u.jsx("span", {
																			className: "text-zinc-500",
																			children: "Result: ",
																		}),
																		JSON.stringify(d.result),
																	],
																}),
														],
													},
													`${d.toolName}-${d.timestamp}`,
												),
											)
										: u.jsx("div", {
												className: "text-zinc-500 py-4 text-center",
												children: "No tool calls recorded in active session.",
											}),
						}),
					}),
				],
			})
		);
	},
	MT = () =>
		u.jsxs("div", {
			className: "space-y-6 animate-in fade-in duration-200",
			children: [u.jsx(_T, {}), u.jsx(AT, {}), u.jsx(RT, {})],
		});
function OT() {
	const [l, i] = x.useState(!1),
		[r, o] = x.useState(!1),
		[f, d] = x.useState(null),
		[m, v] = x.useState("user"),
		[y, g] = x.useState([]),
		[S, h] = x.useState([]),
		[w, E] = x.useState("dashboard"),
		[C, j] = x.useState(null),
		[N, T] = x.useState([]),
		[z, R] = x.useState([]),
		[O, L] = x.useState(!1),
		[Y, X] = x.useState(!1),
		[q, J] = x.useState(null),
		[ee, ce] = x.useState(!1),
		te = x.useCallback(async () => {
			const le = Dy();
			le == null || le.ready(), le == null || le.expand();
			try {
				i(!1);
				const ue = await jt("/api/me");
				ue.valid && ue.user
					? (o(!0),
						d(ue.user),
						v(ue.role || "user"),
						g(ue.adminChatIds || []),
						h(ue.memberChatIds || []))
					: o(!1);
			} catch {
				o(!1);
			} finally {
				i(!0);
			}
		}, []),
		se = x.useCallback(async () => {
			if (r)
				try {
					L(!0);
					const [le, ue, M] = await Promise.all([
						jt("/api/stats").catch(() => null),
						jt("/api/chats").catch(() => []),
						jt("/api/memories?scope=all").catch(() => []),
					]);
					le && j(le), T(ue || []), R(M || []);
				} catch (le) {
					const ue = le instanceof Error ? le.message : "Error loading data";
					Ge.error(ue);
				} finally {
					L(!1);
				}
		}, [r]);
	return (
		x.useEffect(() => {
			te();
		}, [te]),
		x.useEffect(() => {
			r && se();
		}, [r, se]),
		l
			? r
				? u.jsxs("div", {
						className:
							"min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20",
						children: [
							u.jsx(Bw, { user: f, role: m, isOnline: !0 }),
							u.jsx("main", {
								className:
									"flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6",
								children: u.jsxs(bT, {
									value: w,
									onValueChange: E,
									className: "w-full",
									children: [
										u.jsx("div", {
											className: "overflow-x-auto pb-1 no-scrollbar",
											children: u.jsxs(mx, {
												className: "w-full justify-start sm:w-auto",
												children: [
													u.jsxs(ki, {
														value: "dashboard",
														className: "gap-1.5",
														children: [
															u.jsx(xS, { className: "w-4 h-4" }),
															u.jsx("span", { children: "Dashboard" }),
														],
													}),
													u.jsxs(ki, {
														value: "memories",
														className: "gap-1.5",
														children: [
															u.jsx(Qr, { className: "w-4 h-4" }),
															u.jsx("span", {
																children:
																	m === "user" ? "My Facts" : "Memories",
															}),
														],
													}),
													u.jsxs(ki, {
														value: "groups",
														className: "gap-1.5",
														children: [
															u.jsx(Hl, { className: "w-4 h-4" }),
															u.jsx("span", { children: "Groups" }),
														],
													}),
													m === "owner" &&
														u.jsxs(u.Fragment, {
															children: [
																u.jsxs(ki, {
																	value: "system",
																	className: "gap-1.5",
																	children: [
																		u.jsx(Dv, { className: "w-4 h-4" }),
																		u.jsx("span", {
																			children: "Settings & Logs",
																		}),
																	],
																}),
																u.jsxs(ki, {
																	value: "sandbox",
																	className: "gap-1.5",
																	children: [
																		u.jsx(kl, { className: "w-4 h-4" }),
																		u.jsx("span", { children: "Sandbox" }),
																	],
																}),
															],
														}),
												],
											}),
										}),
										u.jsx(Li, {
											value: "dashboard",
											children: u.jsx(Sj, {
												stats: C,
												role: m,
												isLoading: O,
												onNavigateToGroups: () => E("groups"),
												onRefresh: se,
											}),
										}),
										u.jsx(Li, {
											value: "memories",
											children: u.jsx(jT, {
												memories: z,
												chats: N,
												currentUser: f,
												role: m,
												adminChatIds: y,
												isLoading: O,
												onOpenAddModal: () => X(!0),
												onOpenEditModal: (le) => {
													J(le), ce(!0);
												},
												onRefresh: se,
											}),
										}),
										u.jsx(Li, {
											value: "groups",
											children: u.jsx(wT, {
												chats: N,
												role: m,
												isLoading: O,
												onRefresh: se,
											}),
										}),
										m === "owner" &&
											u.jsx(Li, { value: "system", children: u.jsx(MT, {}) }),
										m === "owner" &&
											u.jsx(Li, { value: "sandbox", children: u.jsx(TT, {}) }),
									],
								}),
							}),
							u.jsx(wv, {
								mode: "add",
								open: Y,
								onOpenChange: X,
								currentUser: f,
								chats: N,
								role: m,
								adminChatIds: y,
								memberChatIds: S,
								onSuccess: se,
							}),
							u.jsx(wv, {
								mode: "edit",
								memory: q,
								open: ee,
								onOpenChange: ce,
								currentUser: f,
								onSuccess: se,
							}),
							u.jsx(Uj, { position: "bottom-right", richColors: !0 }),
						],
					})
				: u.jsx(kw, { onRetry: te })
			: u.jsxs("div", {
					className:
						"min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground gap-3",
					children: [
						u.jsx(SS, { className: "w-8 h-8 animate-spin text-primary" }),
						u.jsx("span", {
							className: "text-sm font-medium",
							children: "Authenticating Telegram session...",
						}),
					],
				})
	);
}
const Nv = document.getElementById("root");
Nv &&
	k1.createRoot(Nv).render(u.jsx(x.StrictMode, { children: u.jsx(OT, {}) }));
