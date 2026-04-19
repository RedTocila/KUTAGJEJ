/**
 * Main platform roles — always present; names are stable (do not rename via API).
 * Individual = end users; Biznes = businesses / agencies.
 */
const CORE_ROLE_NAMES = new Set(['Individual', 'Biznes']);

/** Display order for listing (subset of core names). */
const CORE_ROLE_ORDER = ['Individual', 'Biznes'];

async function ensureCoreRoles() {
  const Role = require('../models/Role');

  const defaults = [
    {
      name: 'Individual',
      description:
        'Roli kryesor i platformës për përdorues individualë dhe shpallje personale.',
    },
    {
      name: 'Biznes',
      description:
        'Roli kryesor i platformës për biznese, agjenci dhe subjekte të regjistruara.',
    },
  ];

  for (const d of defaults) {
    await Role.updateOne(
      { name: d.name },
      {
        $setOnInsert: {
          name: d.name,
          description: d.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}

function sortRolesForAdmin(roles) {
  return [...roles].sort((a, b) => {
    const ia = CORE_ROLE_ORDER.indexOf(a.name);
    const ib = CORE_ROLE_ORDER.indexOf(b.name);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return String(a.name).localeCompare(String(b.name), 'sq', { sensitivity: 'base' });
  });
}

module.exports = {
  CORE_ROLE_NAMES,
  CORE_ROLE_ORDER,
  ensureCoreRoles,
  sortRolesForAdmin,
};
