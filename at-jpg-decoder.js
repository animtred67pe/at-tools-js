const a = function() {
    const t = new Uint8Array([0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63]);
    function e() {}
    function n(t, e) {
        let n = 0
          , i = 16;
        const o = [];
        for (; i > 0 && !t[i - 1]; )
            i--;
        o.push({
            children: [],
            index: 0
        });
        let r, s = o[0];
        for (let a = 0; a < i; a++) {
            for (let i = 0; i < t[a]; i++) {
                for (s = o.pop(),
                s.children[s.index] = e[n]; s.index > 0; )
                    s = o.pop();
                for (s.index++,
                o.push(s); o.length <= a; )
                    o.push(r = {
                        children: [],
                        index: 0
                    }),
                    s.children[s.index] = r.children,
                    s = r;
                n++
            }
            a + 1 < i && (o.push(r = {
                children: [],
                index: 0
            }),
            s.children[s.index] = r.children,
            s = r)
        }
        return o[0].children
    }
    function i(t, e, n) {
        return 64 * ((t.blocksPerLine + 1) * e + n)
    }
    function o(e, n, o, r, s, a, c, l, u) {
        o.precision,
        o.samplesPerLine,
        o.scanLines;
        var h = o.mcusPerLine
          , _ = o.progressive
          , $ = (o.maxH,
        o.maxV,
        n)
          , f = 0
          , p = 0;
        function d() {
            if (p > 0)
                return p--,
                f >> p & 1;
            if (255 === (f = e[n++])) {
                var t = e[n++];
                if (t)
                    throw "unexpected marker: " + (f << 8 | t).toString(16)
            }
            return p = 7,
            f >>> 7
        }
        function g(t) {
            for (var e = t; ; ) {
                if ("number" == typeof (e = e[d()]))
                    return e;
                if ("object" != typeof e)
                    throw "invalid huffman sequence"
            }
        }
        function y(t) {
            for (var e = 0; t > 0; )
                e = e << 1 | d(),
                t--;
            return e
        }
        function b(t) {
            if (1 === t)
                return 1 === d() ? 1 : -1;
            var e = y(t);
            return e >= 1 << t - 1 ? e : e + (-1 << t) + 1
        }
        var m = 0;
        var A, O = 0;
        function T(t, e, n, o, r) {
            var s = n % h;
            e(t, i(t, (n / h | 0) * t.v + o, s * t.h + r))
        }
        function S(t, e, n) {
            e(t, i(t, n / t.blocksPerLine | 0, n % t.blocksPerLine))
        }
        var I, E, x, v, D, N, C = r.length;
        N = _ ? 0 === a ? 0 === l ? function(t, e) {
            var n = g(t.huffmanTableDC)
              , i = 0 === n ? 0 : b(n) << u;
            t.blockData[e] = t.pred += i
        }
        : function(t, e) {
            t.blockData[e] |= d() << u
        }
        : 0 === l ? function(e, n) {
            if (m > 0)
                m--;
            else
                for (var i = a, o = c; i <= o; ) {
                    var r = g(e.huffmanTableAC)
                      , s = 15 & r
                      , l = r >> 4;
                    if (0 !== s) {
                        var h = t[i += l];
                        e.blockData[n + h] = b(s) * (1 << u),
                        i++
                    } else {
                        if (l < 15) {
                            m = y(l) + (1 << l) - 1;
                            break
                        }
                        i += 16
                    }
                }
        }
        : function(e, n) {
            for (var i, o, r = a, s = c, l = 0; r <= s; ) {
                var h = t[r];
                switch (O) {
                case 0:
                    if (l = (o = g(e.huffmanTableAC)) >> 4,
                    0 === (i = 15 & o))
                        l < 15 ? (m = y(l) + (1 << l),
                        O = 4) : (l = 16,
                        O = 1);
                    else {
                        if (1 !== i)
                            throw "invalid ACn encoding";
                        A = b(i),
                        O = l ? 2 : 3
                    }
                    continue;
                case 1:
                case 2:
                    e.blockData[n + h] ? e.blockData[n + h] += d() << u : 0 === --l && (O = 2 === O ? 3 : 0);
                    break;
                case 3:
                    e.blockData[n + h] ? e.blockData[n + h] += d() << u : (e.blockData[n + h] = A << u,
                    O = 0);
                    break;
                case 4:
                    e.blockData[n + h] && (e.blockData[n + h] += d() << u)
                }
                r++
            }
            4 === O && 0 === --m && (O = 0)
        }
        : function(e, n) {
            var i = g(e.huffmanTableDC)
              , o = 0 === i ? 0 : b(i);
            e.blockData[n] = e.pred += o;
            for (var r = 1; r < 64; ) {
                var s = g(e.huffmanTableAC)
                  , a = 15 & s
                  , c = s >> 4;
                if (0 !== a) {
                    var l = t[r += c];
                    e.blockData[n + l] = b(a),
                    r++
                } else {
                    if (c < 15)
                        break;
                    r += 16
                }
            }
        }
        ;
        var w, k, P, M, R = 0;
        for (k = 1 === C ? r[0].blocksPerLine * r[0].blocksPerColumn : h * o.mcusPerColumn,
        s || (s = k); R < k; ) {
            for (E = 0; E < C; E++)
                r[E].pred = 0;
            if (m = 0,
            1 === C)
                for (I = r[0],
                D = 0; D < s; D++)
                    S(I, N, R),
                    R++;
            else
                for (D = 0; D < s; D++) {
                    for (E = 0; E < C; E++)
                        for (P = (I = r[E]).h,
                        M = I.v,
                        x = 0; x < M; x++)
                            for (v = 0; v < P; v++)
                                T(I, N, R, x, v);
                    R++
                }
            if (p = 0,
            (w = e[n] << 8 | e[n + 1]) <= 65280)
                throw "marker was not found";
            if (!(w >= 65488 && w <= 65495))
                break;
            n += 2
        }
        return n - $
    }
    function r(t, e, n) {
        var i, o, r, s, a, c, l, u, h, _, $, f, p, d, g, y, b, m = t.quantizationTable, A = t.blockData;
        for (let t = 0; t < 64; t += 8)
            h = A[e + t],
            _ = A[e + t + 1],
            $ = A[e + t + 2],
            f = A[e + t + 3],
            p = A[e + t + 4],
            d = A[e + t + 5],
            g = A[e + t + 6],
            y = A[e + t + 7],
            h *= m[t],
            0 != (_ | $ | f | p | d | g | y) ? (_ *= m[t + 1],
            $ *= m[t + 2],
            f *= m[t + 3],
            p *= m[t + 4],
            d *= m[t + 5],
            o = (i = (i = 5793 * h + 128 >> 8) + (o = 5793 * p + 128 >> 8) + 1 >> 1) - o,
            b = 3784 * (r = $) + 1567 * (s = g *= m[t + 6]) + 128 >> 8,
            r = 1567 * r - 3784 * s + 128 >> 8,
            l = (a = (a = 2896 * (_ - (y *= m[t + 7])) + 128 >> 8) + (l = d << 4) + 1 >> 1) - l,
            c = (u = (u = 2896 * (_ + y) + 128 >> 8) + (c = f << 4) + 1 >> 1) - c,
            s = (i = i + (s = b) + 1 >> 1) - s,
            r = (o = o + r + 1 >> 1) - r,
            b = 2276 * a + 3406 * u + 2048 >> 12,
            a = 3406 * a - 2276 * u + 2048 >> 12,
            u = b,
            b = 799 * c + 4017 * l + 2048 >> 12,
            c = 4017 * c - 799 * l + 2048 >> 12,
            l = b,
            n[t] = i + u,
            n[t + 7] = i - u,
            n[t + 1] = o + l,
            n[t + 6] = o - l,
            n[t + 2] = r + c,
            n[t + 5] = r - c,
            n[t + 3] = s + a,
            n[t + 4] = s - a) : (b = 5793 * h + 512 >> 10,
            n[t] = b,
            n[t + 1] = b,
            n[t + 2] = b,
            n[t + 3] = b,
            n[t + 4] = b,
            n[t + 5] = b,
            n[t + 6] = b,
            n[t + 7] = b);
        for (var O = 0; O < 8; ++O)
            h = n[O],
            0 != ((_ = n[O + 8]) | ($ = n[O + 16]) | (f = n[O + 24]) | (p = n[O + 32]) | (d = n[O + 40]) | (g = n[O + 48]) | (y = n[O + 56])) ? (o = (i = 4112 + ((i = 5793 * h + 2048 >> 12) + (o = 5793 * p + 2048 >> 12) + 1 >> 1)) - o,
            b = 3784 * (r = $) + 1567 * (s = g) + 2048 >> 12,
            r = 1567 * r - 3784 * s + 2048 >> 12,
            s = b,
            l = (a = (a = 2896 * (_ - y) + 2048 >> 12) + (l = d) + 1 >> 1) - l,
            c = (u = (u = 2896 * (_ + y) + 2048 >> 12) + (c = f) + 1 >> 1) - c,
            b = 2276 * a + 3406 * u + 2048 >> 12,
            a = 3406 * a - 2276 * u + 2048 >> 12,
            u = b,
            b = 799 * c + 4017 * l + 2048 >> 12,
            c = 4017 * c - 799 * l + 2048 >> 12,
            h = (h = (i = i + s + 1 >> 1) + u) < 16 ? 0 : h >= 4080 ? 255 : h >> 4,
            _ = (_ = (o = o + r + 1 >> 1) + (l = b)) < 16 ? 0 : _ >= 4080 ? 255 : _ >> 4,
            $ = ($ = (r = o - r) + c) < 16 ? 0 : $ >= 4080 ? 255 : $ >> 4,
            f = (f = (s = i - s) + a) < 16 ? 0 : f >= 4080 ? 255 : f >> 4,
            p = (p = s - a) < 16 ? 0 : p >= 4080 ? 255 : p >> 4,
            d = (d = r - c) < 16 ? 0 : d >= 4080 ? 255 : d >> 4,
            g = (g = o - l) < 16 ? 0 : g >= 4080 ? 255 : g >> 4,
            y = (y = i - u) < 16 ? 0 : y >= 4080 ? 255 : y >> 4,
            A[e + O] = h,
            A[e + O + 8] = _,
            A[e + O + 16] = $,
            A[e + O + 24] = f,
            A[e + O + 32] = p,
            A[e + O + 40] = d,
            A[e + O + 48] = g,
            A[e + O + 56] = y) : (b = (b = 5793 * h + 8192 >> 14) < -2040 ? 0 : b >= 2024 ? 255 : b + 2056 >> 4,
            A[e + O] = b,
            A[e + O + 8] = b,
            A[e + O + 16] = b,
            A[e + O + 24] = b,
            A[e + O + 32] = b,
            A[e + O + 40] = b,
            A[e + O + 48] = b,
            A[e + O + 56] = b)
    }
    function s(t, e) {
        const n = e.blocksPerLine
          , o = e.blocksPerColumn
          , s = new Int16Array(64);
        for (let t = 0; t < o; t++)
            for (let o = 0; o < n; o++) {
                r(e, i(e, t, o), s)
            }
        return e.blockData
    }
    function a(t) {
        return t <= 0 ? 0 : t >= 255 ? 255 : t
    }
    return e.prototype = {
        parse: function(e) {
            function i() {
                var t = e[u] << 8 | e[u + 1];
                return u += 2,
                t
            }
            function r() {
                var t = i()
                  , n = e.subarray(u, u + t - 2);
                return u += n.length,
                n
            }
            function a(t) {
                for (var e = Math.ceil(t.samplesPerLine / 8 / t.maxH), n = Math.ceil(t.scanLines / 8 / t.maxV), i = 0; i < t.components.length; i++) {
                    R = t.components[i];
                    var o = Math.ceil(Math.ceil(t.samplesPerLine / 8) * R.h / t.maxH)
                      , r = Math.ceil(Math.ceil(t.scanLines / 8) * R.v / t.maxV)
                      , s = e * R.h
                      , a = 64 * (n * R.v) * (s + 1);
                    R.blockData = new Int16Array(a),
                    R.blocksPerLine = o,
                    R.blocksPerColumn = r
                }
                t.mcusPerLine = e,
                t.mcusPerColumn = n
            }
            var c, l, u = 0, h = (e.length,
            null), _ = null, $ = [], f = [], p = [], d = i();
            if (65496 !== d)
                throw "SOI not found";
            for (d = i(); 65497 !== d; ) {
                var g, y, b;
                switch (d) {
                case 65504:
                case 65505:
                case 65506:
                case 65507:
                case 65508:
                case 65509:
                case 65510:
                case 65511:
                case 65512:
                case 65513:
                case 65514:
                case 65515:
                case 65516:
                case 65517:
                case 65518:
                case 65519:
                case 65534:
                    var m = r();
                    65504 === d && 74 === m[0] && 70 === m[1] && 73 === m[2] && 70 === m[3] && 0 === m[4] && (h = {
                        version: {
                            major: m[5],
                            minor: m[6]
                        },
                        densityUnits: m[7],
                        xDensity: m[8] << 8 | m[9],
                        yDensity: m[10] << 8 | m[11],
                        thumbWidth: m[12],
                        thumbHeight: m[13],
                        thumbData: m.subarray(14, 14 + 3 * m[12] * m[13])
                    }),
                    65518 === d && 65 === m[0] && 100 === m[1] && 111 === m[2] && 98 === m[3] && 101 === m[4] && 0 === m[5] && (_ = {
                        version: m[6],
                        flags0: m[7] << 8 | m[8],
                        flags1: m[9] << 8 | m[10],
                        transformCode: m[11]
                    });
                    break;
                case 65499:
                    for (var A = i() + u - 2; u < A; ) {
                        var O = e[u++]
                          , T = new Uint16Array(64);
                        if (O >> 4 == 0)
                            for (y = 0; y < 64; y++)
                                T[t[y]] = e[u++];
                        else {
                            if (O >> 4 != 1)
                                throw "DQT: invalid table spec";
                            for (y = 0; y < 64; y++)
                                T[t[y]] = i()
                        }
                        $[15 & O] = T
                    }
                    break;
                case 65472:
                case 65473:
                case 65474:
                    if (c)
                        throw "Only single frame JPEGs supported";
                    i(),
                    (c = {}).extended = 65473 === d,
                    c.progressive = 65474 === d,
                    c.precision = e[u++],
                    c.scanLines = i(),
                    c.samplesPerLine = i(),
                    c.components = [],
                    c.componentIds = {};
                    var S, I = e[u++], E = 0, x = 0;
                    for (g = 0; g < I; g++) {
                        S = e[u];
                        var v = e[u + 1] >> 4
                          , D = 15 & e[u + 1];
                        E < v && (E = v),
                        x < D && (x = D);
                        var N = e[u + 2];
                        b = c.components.push({
                            h: v,
                            v: D,
                            quantizationTable: $[N]
                        }),
                        c.componentIds[S] = b - 1,
                        u += 3
                    }
                    c.maxH = E,
                    c.maxV = x,
                    a(c);
                    break;
                case 65476:
                    var C = i();
                    for (g = 2; g < C; ) {
                        var w = e[u++]
                          , k = new Uint8Array(16)
                          , P = 0;
                        for (y = 0; y < 16; y++,
                        u++)
                            P += k[y] = e[u];
                        var M = new Uint8Array(P);
                        for (y = 0; y < P; y++,
                        u++)
                            M[y] = e[u];
                        g += 17 + P,
                        (w >> 4 == 0 ? p : f)[15 & w] = n(k, M)
                    }
                    break;
                case 65501:
                    i(),
                    l = i();
                    break;
                case 65498:
                    i();
                    var R, L = e[u++], U = [];
                    for (g = 0; g < L; g++) {
                        var B = c.componentIds[e[u++]];
                        R = c.components[B];
                        var F = e[u++];
                        R.huffmanTableDC = p[F >> 4],
                        R.huffmanTableAC = f[15 & F],
                        U.push(R)
                    }
                    var j = e[u++]
                      , z = e[u++]
                      , V = e[u++]
                      , Y = o(e, u, c, U, l, j, z, V >> 4, 15 & V);
                    u += Y;
                    break;
                case 65535:
                    255 !== e[u] && u--;
                    break;
                default:
                    if (255 === e[u - 3] && e[u - 2] >= 192 && e[u - 2] <= 254) {
                        u -= 3;
                        break
                    }
                    throw "unknown JPEG marker " + d.toString(16)
                }
                d = i()
            }
            for (this.width = c.samplesPerLine,
            this.height = c.scanLines,
            this.jfif = h,
            this.adobe = _,
            this.components = [],
            g = 0; g < c.components.length; g++)
                R = c.components[g],
                this.components.push({
                    output: s(0, R),
                    scaleX: R.h / c.maxH,
                    scaleY: R.v / c.maxV,
                    blocksPerLine: R.blocksPerLine,
                    blocksPerColumn: R.blocksPerColumn
                });
            this.numComponents = this.components.length
        },
        _getLinearizedBlockData: function(t, e) {
            var n, i, o, r, s, a, c, l, u, h, _, $ = this.width / t, f = this.height / e, p = 0, d = this.components.length, g = t * e * d, y = new Uint8Array(g), b = new Uint32Array(t);
            for (c = 0; c < d; c++) {
                for (i = (n = this.components[c]).scaleX * $,
                o = n.scaleY * f,
                p = c,
                _ = n.output,
                r = n.blocksPerLine + 1 << 3,
                s = 0; s < t; s++)
                    l = 0 | s * i,
                    b[s] = (4294967288 & l) << 3 | 7 & l;
                for (a = 0; a < e; a++)
                    for (h = r * (4294967288 & (l = 0 | a * o)) | (7 & l) << 3,
                    s = 0; s < t; s++)
                        y[p] = _[h + b[s]],
                        p += d
            }
            var m = this.decodeTransform;
            if (m)
                for (c = 0; c < g; )
                    for (l = 0,
                    u = 0; l < d; l++,
                    c++,
                    u += 2)
                        y[c] = (y[c] * m[u] >> 8) + m[u + 1];
            return y
        },
        _isColorConversionNeeded: function() {
            return !(!this.adobe || !this.adobe.transformCode) || 3 === this.numComponents
        },
        _convertYccToRgb: function(t) {
            for (var e, n, i, o = 0, r = t.length; o < r; o += 3)
                e = t[o],
                n = t[o + 1],
                i = t[o + 2],
                t[o] = a(e - 179.456 + 1.402 * i),
                t[o + 1] = a(e + 135.459 - .344 * n - .714 * i),
                t[o + 2] = a(e - 226.816 + 1.772 * n);
            return t
        },
        _convertYcckToRgb: function(t) {
            for (var e, n, i, o, r = 0, s = 0, c = t.length; s < c; s += 4) {
                e = t[s];
                var l = (n = t[s + 1]) * (-660635669420364e-19 * n + .000437130475926232 * (i = t[s + 2]) - 54080610064599e-18 * e + .00048449797120281 * (o = t[s + 3]) - .154362151871126) - 122.67195406894 + i * (-.000957964378445773 * i + .000817076911346625 * e - .00477271405408747 * o + 1.53380253221734) + e * (.000961250184130688 * e - .00266257332283933 * o + .48357088451265) + o * (-.000336197177618394 * o + .484791561490776)
                  , u = 107.268039397724 + n * (219927104525741e-19 * n - .000640992018297945 * i + .000659397001245577 * e + .000426105652938837 * o - .176491792462875) + i * (-.000778269941513683 * i + .00130872261408275 * e + .000770482631801132 * o - .151051492775562) + e * (.00126935368114843 * e - .00265090189010898 * o + .25802910206845) + o * (-.000318913117588328 * o - .213742400323665)
                  , h = n * (-.000570115196973677 * n - 263409051004589e-19 * i + .0020741088115012 * e - .00288260236853442 * o + .814272968359295) - 20.810012546947 + i * (-153496057440975e-19 * i - .000132689043961446 * e + .000560833691242812 * o - .195152027534049) + e * (.00174418132927582 * e - .00255243321439347 * o + .116935020465145) + o * (-.000343531996510555 * o + .24165260232407);
                t[r++] = a(l),
                t[r++] = a(u),
                t[r++] = a(h)
            }
            return t
        },
        _convertYcckToCmyk: function(t) {
            for (var e, n, i, o = 0, r = t.length; o < r; o += 4)
                e = t[o],
                n = t[o + 1],
                i = t[o + 2],
                t[o] = a(434.456 - e - 1.402 * i),
                t[o + 1] = a(119.541 - e + .344 * n + .714 * i),
                t[o + 2] = a(481.816 - e - 1.772 * n);
            return t
        },
        _convertCmykToRgb: function(t) {
            for (var e, n, i, o, r = 0, s = -16581375, a = 0, c = t.length; a < c; a += 4) {
                var l = (e = t[a]) * (-4.387332384609988 * e + 54.48615194189176 * (n = t[a + 1]) + 18.82290502165302 * (i = t[a + 2]) + 212.25662451639585 * (o = t[a + 3]) - 72734.4411664936) + n * (1.7149763477362134 * n - 5.6096736904047315 * i - 17.873870861415444 * o - 1401.7366389350734) + i * (-2.5217340131683033 * i - 21.248923337353073 * o + 4465.541406466231) - o * (21.86122147463605 * o + 48317.86113160301)
                  , u = e * (8.841041422036149 * e + 60.118027045597366 * n + 6.871425592049007 * i + 31.159100130055922 * o - 20220.756542821975) + n * (-15.310361306967817 * n + 17.575251261109482 * i + 131.35250912493976 * o - 48691.05921601825) + i * (4.444339102852739 * i + 9.8632861493405 * o - 6341.191035517494) - o * (20.737325471181034 * o + 47890.15695978492)
                  , h = e * (.8842522430003296 * e + 8.078677503112928 * n + 30.89978309703729 * i - .23883238689178934 * o - 3616.812083916688) + n * (10.49593273432072 * n + 63.02378494754052 * i + 50.606957656360734 * o - 28620.90484698408) + i * (.03296041114873217 * i + 115.60384449646641 * o - 49363.43385999684) - o * (22.33816807309886 * o + 45932.16563550634);
                t[r++] = l >= 0 ? 255 : l <= s ? 0 : 255 + l * (1 / 255 / 255) | 0,
                t[r++] = u >= 0 ? 255 : u <= s ? 0 : 255 + u * (1 / 255 / 255) | 0,
                t[r++] = h >= 0 ? 255 : h <= s ? 0 : 255 + h * (1 / 255 / 255) | 0
            }
            return t
        },
        getData: function(t, e, n) {
            if (this.numComponents > 4)
                throw "Unsupported color mode";
            var i = this._getLinearizedBlockData(t, e);
            if (3 === this.numComponents)
                return this._convertYccToRgb(i);
            if (4 === this.numComponents) {
                if (this._isColorConversionNeeded())
                    return n ? this._convertYcckToRgb(i) : this._convertYcckToCmyk(i);
                if (n)
                    return this._convertCmykToRgb(i)
            }
            return i
        },
        copyToImageData: function(t) {
            if (2 === this.numComponents || this.numComponents > 4)
                throw new Error("Unsupported amount of components");
            var e, n, i = t.width, o = t.height, r = i * o * 4, s = t.pixels;
            if (1 !== this.numComponents) {
                var a = this.getData(i, o, !0);
                for (e = 0,
                n = 0,
                0; e < r; )
                    s[e++] = a[n++],
                    s[e++] = a[n++],
                    s[e++] = a[n++],
                    s[e++] = 255
            } else {
                var c = this.getData(i, o, !1);
                for (e = 0,
                n = 0,
                0; e < r; ) {
                    var l = c[n++];
                    s[e++] = l,
                    s[e++] = l,
                    s[e++] = l,
                    s[e++] = 255
                }
            }
        }
    },
    e
}();
var AT_JPG_Decoder = new a;