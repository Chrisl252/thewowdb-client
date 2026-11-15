using System.Runtime.CompilerServices;

/// <summary>Points every client path at a throwaway folder before AppPaths first reads it,
/// so tests never touch a player's real settings, log or upload state.</summary>
internal static class TestHome
{
    [ModuleInitializer]
    internal static void Init() =>
        Environment.SetEnvironmentVariable("THEWOWDB_HOME",
            Path.Combine(Path.GetTempPath(), "twdb-client-tests-" + Environment.ProcessId));
}
