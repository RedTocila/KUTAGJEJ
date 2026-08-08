'use strict';

function calendarDayUtc(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

module.exports = {
  calendarDayUtc,
};
