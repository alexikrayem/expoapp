const db = require("../config/db")
const { revokeAllForSubject } = require("../services/tokenService")

const revokeSupplierSessions = async (supplierId) => {
  if (!supplierId) {
    return
  }

  await revokeAllForSubject(supplierId, "supplier")
  const agents = await db.query("SELECT id FROM delivery_agents WHERE supplier_id = $1", [supplierId])

  if (agents.rows.length === 0) {
    return
  }

  await Promise.all(agents.rows.map((row) => revokeAllForSubject(row.id, "delivery_agent")))
}

module.exports = {
  revokeSupplierSessions,
}
