'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { ensureReferralProgram, formatReferralProgram } = require('./ensure-referral-program');
const { calendarDayUtc } = require('./daily-share-reward');

function addDaysUtc(isoDay, delta) {
  const d = new Date(`${isoDay}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

async function loadLoginStreakConfig() {
  await ensureReferralProgram();
  const { data, error } = await getSupabaseAdmin()
    .from('referral_programs')
    .select('login_streak')
    .eq('id', 'default')
    .maybeSingle();
  if (error) throw error;
  const program = data ? formatReferralProgram({ login_streak: data.login_streak }) : null;
  const daysRequired = Math.max(1, Number(program?.loginStreak?.daysRequired) || 7);
  const boostCredits = Math.max(0, Number(program?.loginStreak?.boostCredits) || 10);
  return { daysRequired, boostCredits };
}

/**
 * Count a portal visit/login toward the consecutive-day streak.
 * Completing `daysRequired` awards Boost Coins once, then the next day starts a new cycle.
 */
async function recordLoginStreak(user) {
  // Schema may lag after an init reset — skip quietly until migration is applied.
  if (
    !Object.prototype.hasOwnProperty.call(user, 'loginStreakDays') ||
    !Object.prototype.hasOwnProperty.call(user, 'loginStreakLastDay')
  ) {
    return {
      days: 0,
      daysRequired: 7,
      boostCredits: 0,
      checkedInToday: false,
      awarded: false,
      creditsAwarded: 0,
      boostCreditsBalance: user.boostCredits ?? 0,
      skipped: true,
    };
  }

  const { daysRequired, boostCredits } = await loadLoginStreakConfig();
  const today = calendarDayUtc();
  const yesterday = addDaysUtc(today, -1);
  const last = user.loginStreakLastDay ? String(user.loginStreakLastDay).slice(0, 10) : null;
  let days = Math.max(0, Number(user.loginStreakDays) || 0);

  if (last === today) {
    return {
      days: Math.min(days, daysRequired),
      daysRequired,
      boostCredits,
      checkedInToday: true,
      awarded: false,
      creditsAwarded: 0,
      boostCreditsBalance: user.boostCredits ?? 0,
    };
  }

  if (last === yesterday) {
    days = days >= daysRequired ? 1 : days + 1;
  } else {
    days = 1;
  }

  let creditsAwarded = 0;
  if (days === daysRequired && boostCredits > 0) {
    creditsAwarded = boostCredits;
    user.boostCredits = (Number(user.boostCredits) || 0) + creditsAwarded;
  }

  user.loginStreakDays = days;
  user.loginStreakLastDay = today;
  await user.save();

  return {
    days: Math.min(days, daysRequired),
    daysRequired,
    boostCredits,
    checkedInToday: true,
    awarded: creditsAwarded > 0,
    creditsAwarded,
    boostCreditsBalance: user.boostCredits ?? 0,
  };
}

function getLoginStreakSnapshot(user, config) {
  const daysRequired = config?.daysRequired ?? 7;
  const boostCredits = config?.boostCredits ?? 5;
  const today = calendarDayUtc();
  const last = user.loginStreakLastDay ? String(user.loginStreakLastDay).slice(0, 10) : null;
  let days = Math.max(0, Number(user.loginStreakDays) || 0);

  // Streak is broken if last check-in was before yesterday.
  if (last && last !== today && last !== addDaysUtc(today, -1)) {
    days = 0;
  }

  return {
    days: Math.min(days, daysRequired),
    daysRequired,
    boostCredits,
    checkedInToday: last === today,
  };
}

module.exports = {
  recordLoginStreak,
  getLoginStreakSnapshot,
  loadLoginStreakConfig,
  addDaysUtc,
};
