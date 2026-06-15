const express = require('express');
const businessesRouter = require('./businesses');
const businessReservationsRouter = require('./business-reservations');
const professionalsRouter = require('./professionals');

const router = express.Router();

router.use(businessesRouter);
router.use(businessReservationsRouter);
router.use(professionalsRouter);

module.exports = router;
