using System.Globalization;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// A small reader for the subset of Lua a SavedVariables file uses: nested table
/// constructors holding strings, numbers, booleans and nil, with `["k"] = v`,
/// `[n] = v`, `name = v` and positional entries, plus `--` comments. It reads one
/// table at a time out of a bigger file, so a 2 MB file with one interesting
/// subtree costs only that subtree.
///
/// Tables come back as <see cref="Dictionary{TKey,TValue}"/> keyed by string or
/// double; positional entries get keys 1, 2, 3 (as Lua numbers them). Any syntax
/// it does not understand returns null rather than guessing.
/// </summary>
public static class LuaTable
{
    /// <summary>Parse the table whose `{` is the first one after <c>["key"] =</c> (or `key =`), searching from <paramref name="from"/>.</summary>
    public static Dictionary<object, object?>? ReadAfterKey(string lua, string key, int from = 0)
    {
        foreach (var needle in new[] { "[\"" + key + "\"]", key })
        {
            var at = from;
            while ((at = lua.IndexOf(needle, at, StringComparison.Ordinal)) >= 0)
            {
                var p = at + needle.Length;
                while (p < lua.Length && char.IsWhiteSpace(lua[p])) p++;
                if (p < lua.Length && lua[p] == '=')
                {
                    p++;
                    while (p < lua.Length && char.IsWhiteSpace(lua[p])) p++;
                    if (p < lua.Length && lua[p] == '{')
                    {
                        try { return new Reader(lua, p).Table(); }
                        catch (FormatException) { return null; }
                    }
                }
                at += needle.Length;
            }
        }
        return null;
    }

    public static object? Get(Dictionary<object, object?> t, string key) => t.GetValueOrDefault(key);

    private sealed class Reader(string s, int pos)
    {
        private int _p = pos;

        public Dictionary<object, object?> Table()
        {
            Expect('{');
            var t = new Dictionary<object, object?>();
            double next = 1;
            while (true)
            {
                Skip();
                if (Peek() == '}') { _p++; return t; }

                if (Peek() == '[')
                {
                    _p++;
                    Skip();
                    var k = Value() ?? throw new FormatException("nil key");
                    Skip();
                    Expect(']');
                    Skip();
                    Expect('=');
                    t[k] = Value();
                }
                else if (IsNameStart(Peek()) && NameThenEquals(out var name))
                {
                    t[name] = Value();
                }
                else
                {
                    t[next++] = Value();
                }
                Skip();
                if (Peek() is ',' or ';') _p++;
            }
        }

        private bool NameThenEquals(out string name)
        {
            var q = _p;
            while (q < s.Length && (char.IsLetterOrDigit(s[q]) || s[q] == '_')) q++;
            var end = q;
            while (q < s.Length && char.IsWhiteSpace(s[q])) q++;
            if (q < s.Length && s[q] == '=' && (q + 1 >= s.Length || s[q + 1] != '='))
            {
                name = s[_p..end];
                _p = q + 1;
                return true;
            }
            name = "";
            return false;
        }

        private object? Value()
        {
            Skip();
            var c = Peek();
            if (c == '{') return Table();
            if (c is '"' or '\'')
            {
                var str = WireExtractor.ReadLiteral(s, _p + 1, c, out var end)
                          ?? throw new FormatException("bad string");
                _p = end + 1;
                return str;
            }
            if (c == '-' && _p + 1 < s.Length && s[_p + 1] == '-') { Skip(); return Value(); }
            if (char.IsDigit(c) || c is '-' or '+' or '.')
            {
                var q = _p;
                while (q < s.Length && (char.IsLetterOrDigit(s[q]) || s[q] is '.' or '+' or '-')) q++;
                var tok = s[_p..q];
                _p = q;
                if (tok.StartsWith("0x", StringComparison.OrdinalIgnoreCase)
                    && long.TryParse(tok[2..], NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var hx))
                    return (double)hx;
                if (double.TryParse(tok, NumberStyles.Float, CultureInfo.InvariantCulture, out var d)) return d;
                throw new FormatException("bad number");
            }
            var w = _p;
            while (w < s.Length && char.IsLetter(s[w])) w++;
            var word = s[_p..w];
            _p = w;
            return word switch
            {
                "true" => true,
                "false" => false,
                "nil" => null,
                _ => throw new FormatException("unexpected token"),
            };
        }

        private static bool IsNameStart(char c) => char.IsLetter(c) || c == '_';

        private char Peek() => _p < s.Length ? s[_p] : '\0';

        private void Expect(char c)
        {
            if (Peek() != c) throw new FormatException($"expected {c}");
            _p++;
        }

        /// <summary>Whitespace and `--` line comments (long comments are not used in SavedVariables).</summary>
        private void Skip()
        {
            while (_p < s.Length)
            {
                if (char.IsWhiteSpace(s[_p])) { _p++; continue; }
                if (s[_p] == '-' && _p + 1 < s.Length && s[_p + 1] == '-')
                {
                    while (_p < s.Length && s[_p] != '\n') _p++;
                    continue;
                }
                break;
            }
        }
    }
}
