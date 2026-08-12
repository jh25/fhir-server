/**
 * GET /api/patients?q= — typeahead source for the chart picker.
 */

const express = require('express');
const { searchPatients } = require('../db/patients');

const router = express.Router();

router.get('/api/patients', async (req, res) => {
  try {
    const q = req.query.q != null ? String(req.query.q) : '';
    const patients = await searchPatients({ q, limit: 25 });
    res.status(200).json({ patients });
  } catch (err) {
    console.error('Patient search failed:', err.message);
    res.status(500).json({ error: 'Patient search failed', patients: [] });
  }
});

module.exports = router;
