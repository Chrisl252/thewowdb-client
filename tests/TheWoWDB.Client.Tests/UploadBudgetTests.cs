using TheWoWDB.Client.Sync;
using Xunit;

public class UploadBudgetTests
{
    private static readonly DateTimeOffset T0 = new(2026, 11, 15, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void First_upload_is_allowed_then_blocked_for_twenty_minutes()
    {
        var b = new UploadBudget(new UploadState());
        Assert.True(b.Check("collect", T0).Allowed);
        b.NoteAttempt(T0);
        Assert.False(b.Check("collect", T0.AddMinutes(19)).Allowed);
        Assert.True(b.Check("collect", T0.AddMinutes(21)).Allowed);
    }

    [Fact]
    public void The_gap_is_shared_by_both_doors()
    {
        var b = new UploadBudget(new UploadState());
        b.NoteAttempt(T0);
        Assert.False(b.Check("scan", T0.AddMinutes(5)).Allowed);
    }

    [Fact]
    public void Ten_a_day_then_blocked_until_the_oldest_ages_out()
    {
        var b = new UploadBudget(new UploadState());
        for (var i = 0; i < UploadBudget.MaxPerDay; i++) b.NoteAttempt(T0.AddMinutes(25 * i));
        var late = T0.AddMinutes(25 * 10);
        Assert.False(b.Check("collect", late).Allowed);
        Assert.True(b.Check("collect", T0.AddHours(24).AddMinutes(1)).Allowed);   // the first attempt has aged out
    }

    [Fact]
    public void Door_off_waits_six_hours()
    {
        var b = new UploadBudget(new UploadState());
        b.NoteDoorOff("collect", T0);
        Assert.False(b.Check("collect", T0.AddHours(5)).Allowed);
        Assert.True(b.Check("collect", T0.AddHours(6).AddMinutes(1)).Allowed);
        Assert.True(b.Check("scan", T0.AddHours(1)).Allowed);   // another door is unaffected
    }

    [Fact]
    public void Rate_limit_backs_off_harder_each_time_and_resets_on_success()
    {
        var b = new UploadBudget(new UploadState());
        b.NoteRateLimited("collect", T0);
        Assert.False(b.Check("collect", T0.AddHours(1)).Allowed);
        Assert.True(b.Check("collect", T0.AddHours(2).AddMinutes(1)).Allowed);
        b.NoteRateLimited("collect", T0.AddHours(3));
        Assert.False(b.Check("collect", T0.AddHours(8)).Allowed);   // 6 h this time
        b.NoteOk("collect");
        Assert.True(b.Check("collect", T0.AddHours(8)).Allowed);
    }
}
