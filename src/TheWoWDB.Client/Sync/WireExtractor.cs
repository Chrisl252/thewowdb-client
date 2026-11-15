using System.Text;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// Lifts the addon's collected "wire" (one string starting `TWDBC1~`) out of a
/// SavedVariables file without a Lua parser. Pure: text in, text out.
///
/// The addon promises no quotes, backslashes or newlines inside the wire, but the
/// scanner does not rely on that: it decodes the Lua escapes a serializer might
/// add (`\"` `\\` `\n` `\r` `\t` `\ddd` and friends) and stops at the matching
/// unescaped quote.
/// </summary>
public static class WireExtractor
{
    public const string Marker = "TWDBC1~";

    /// <summary>The server refuses over 1.5 MB of wire; do not send what cannot land.</summary>
    public const int MaxWireChars = 1_500_000;

    /// <summary>The first string literal whose value starts with the marker, decoded; else null.</summary>
    public static string? Extract(string lua)
    {
        if (string.IsNullOrEmpty(lua)) return null;
        var from = 0;
        while (true)
        {
            var i = lua.IndexOf(Marker, from, StringComparison.Ordinal);
            if (i < 0) return null;
            from = i + Marker.Length;
            // The marker must open a string literal: the char before it is the quote.
            if (i == 0 || (lua[i - 1] != '"' && lua[i - 1] != '\'')) continue;
            var wire = ReadLiteral(lua, i, lua[i - 1], out _);
            if (wire is not null) return wire;
        }
    }

    /// <summary>Decode a Lua short string whose body starts at <paramref name="start"/>; <paramref name="end"/> is the closing quote index.</summary>
    internal static string? ReadLiteral(string s, int start, char quote, out int end)
    {
        end = -1;
        var sb = new StringBuilder();
        for (var i = start; i < s.Length; i++)
        {
            var c = s[i];
            if (c == quote) { end = i; return sb.ToString(); }
            if (c == '\n') return null;                 // an unescaped newline ends a Lua short string: not a wire
            if (c != '\\') { sb.Append(c); continue; }

            if (++i >= s.Length) return null;
            var e = s[i];
            switch (e)
            {
                case 'n': sb.Append('\n'); break;
                case 'r': sb.Append('\r'); break;
                case 't': sb.Append('\t'); break;
                case 'a': sb.Append('\a'); break;
                case 'b': sb.Append('\b'); break;
                case 'f': sb.Append('\f'); break;
                case 'v': sb.Append('\v'); break;
                case '\\': case '"': case '\'': sb.Append(e); break;
                case '\n': sb.Append('\n'); break;      // backslash-newline = newline
                case '\r': sb.Append('\n'); if (i + 1 < s.Length && s[i + 1] == '\n') i++; break;
                default:
                    if (e is >= '0' and <= '9')
                    {
                        var n = e - '0';
                        for (var k = 0; k < 2 && i + 1 < s.Length && s[i + 1] is >= '0' and <= '9'; k++)
                            n = n * 10 + (s[++i] - '0');
                        sb.Append((char)Math.Min(n, 255));
                    }
                    else sb.Append(e);                  // unknown escape: Lua keeps the char
                    break;
            }
        }
        return null;                                    // never closed
    }

    /// <summary>Record count per record letter (`G`, `D`, `V`, `K`, `N`, `Q`, ...). The first segment is the marker.</summary>
    public static SortedDictionary<char, int> CountRecords(string wire)
    {
        var counts = new SortedDictionary<char, int>();
        var parts = wire.Split('~');
        for (var i = 1; i < parts.Length; i++)
        {
            if (parts[i].Length == 0) continue;
            var k = parts[i][0];
            counts[k] = counts.GetValueOrDefault(k) + 1;
        }
        return counts;
    }
}
