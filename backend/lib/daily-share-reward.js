'use strict';

/** Matches referral program UI: "Ndaj çdo ditë" → +3 BC. */
const DAILY_SHARE_BOOST_CREDITS = 3;

function calendarDayUtc(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Award once-per-calendar-day Boost Coins for sharing a listing story (Instagram).
 * @param {{ id: string, boostCredits?: number, dailyShareClaimedOn?: string | null, save: () => Promise<unknown> }} user
 */
async function claimDailyShareReward(user) {
  const today = calendarDayUtc();
  const already = user.dailyShareClaimedOn
    ? String(user.dailyShareClaimedOn).slice(0, 10) === today
    : false;

  if (already) {
    return {
      awarded: false,
      alreadyClaimed: true,
      boostCredits: user.boostCredits ?? 0,
      creditsAwarded: 0,
      dailyShareClaimedOn: today,
    };
  }

  const nextBalance = (Number(user.boostCredits) || 0) + DAILY_SHARE_BOOST_CREDITS;
  user.boostCredits = nextBalance;
  user.dailyShareClaimedOn = today;
  await user.save();

  return {
    awarded: true,
    alreadyClaimed: false,
    boostCredits: nextBalance,
    creditsAwarded: DAILY_SHARE_BOOST_CREDITS,
    dailyShareClaimedOn: today,
  };
}

function isDailyShareClaimedToday(claimedOn) {
  if (!claimedOn) return false;
  return String(claimedOn).slice(0, 10) === calendarDayUtc();
}

module.exports = {
  DAILY_SHARE_BOOST_CREDITS,
  claimDailyShareReward,
  isDailyShareClaimedToday,
  calendarDayUtc,
};
