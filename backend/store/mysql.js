// MySQL store. Uses a NEW table so existing tables in the database are never touched.
const mysql = require('mysql2/promise');

const TABLE = 'PonSom_202688';
// Database column names. If the exam requires prefixed names
// (e.g. NinSom_xxxxxx), change ONLY these strings.
const COL = { id: 'id', name: 'name', position: 'position', status: 'status', salary: 'salary' };

const SEED = [
  ['John Doe', 'Software Engineer', 'Active', 45000],
  ['Jane Smith', 'HR Manager', 'Active', 52000],
  ['Somchai Jaidee', 'Intern', 'On Leave', 15000],
  ['Suda Rakdee', 'Data Analyst', 'Active', 38000],
  ['Michael Brown', 'CTO', 'Active', 120000],
  ['Napat Srisuk', 'QA Tester', 'On Leave', 22000],
];

const q = (c) => '`' + c + '`';
const T = q(TABLE);
let pool;

const toEmployee = (r) => ({
  id: String(r[COL.id]),
  name: r[COL.name],
  position: r[COL.position],
  status: r[COL.status],
  salary: Number(r[COL.salary]),
});

module.exports = {
  name: 'mysql',

  async init() {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
    });

    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${T} (
        ${q(COL.id)} INT AUTO_INCREMENT PRIMARY KEY,
        ${q(COL.name)} VARCHAR(100) NOT NULL,
        ${q(COL.position)} VARCHAR(100) NOT NULL,
        ${q(COL.status)} VARCHAR(20) NOT NULL DEFAULT 'Active',
        ${q(COL.salary)} DECIMAL(12,2) NOT NULL
      )`
    );

    const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM ${T}`);
    if (n === 0) {
      await pool.query(
        `INSERT INTO ${T} (${q(COL.name)}, ${q(COL.position)}, ${q(COL.status)}, ${q(COL.salary)}) VALUES ?`,
        [SEED]
      );
    }
  },

  async list() {
    const [rows] = await pool.query(`SELECT * FROM ${T} ORDER BY ${q(COL.id)}`);
    return rows.map(toEmployee);
  },

  async create({ name, position, salary }) {
    const [r] = await pool.query(
      `INSERT INTO ${T} (${q(COL.name)}, ${q(COL.position)}, ${q(COL.status)}, ${q(COL.salary)}) VALUES (?, ?, 'Active', ?)`,
      [name, position, salary]
    );
    const [rows] = await pool.query(`SELECT * FROM ${T} WHERE ${q(COL.id)} = ?`, [r.insertId]);
    return toEmployee(rows[0]);
  },

  async toggle(id) {
    const [r] = await pool.query(
      `UPDATE ${T} SET ${q(COL.status)} = IF(${q(COL.status)} = 'Active', 'On Leave', 'Active') WHERE ${q(COL.id)} = ?`,
      [id]
    );
    if (r.affectedRows === 0) return null;
    const [rows] = await pool.query(`SELECT * FROM ${T} WHERE ${q(COL.id)} = ?`, [id]);
    return rows.length ? toEmployee(rows[0]) : null;
  },

  async remove(id) {
    const [r] = await pool.query(`DELETE FROM ${T} WHERE ${q(COL.id)} = ?`, [id]);
    return r.affectedRows > 0;
  },
};
