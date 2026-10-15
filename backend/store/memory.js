// In-memory store (used when no database is configured)
let employees = [
  { id: '1', name: 'John Doe', position: 'Software Engineer', status: 'Active', salary: 45000 },
  { id: '2', name: 'Jane Smith', position: 'HR Manager', status: 'Active', salary: 52000 },
  { id: '3', name: 'Somchai Jaidee', position: 'Intern', status: 'On Leave', salary: 15000 },
  { id: '4', name: 'Suda Rakdee', position: 'Data Analyst', status: 'Active', salary: 38000 },
  { id: '5', name: 'Michael Brown', position: 'CTO', status: 'Active', salary: 120000 },
  { id: '6', name: 'Napat Srisuk', position: 'QA Tester', status: 'On Leave', salary: 22000 },
];
let nextId = 7;

module.exports = {
  name: 'memory',
  async init() {},
  async list() {
    return employees.map((e) => ({ ...e }));
  },
  async create({ name, position, salary }) {
    const e = { id: String(nextId++), name, position, status: 'Active', salary };
    employees.push(e);
    return { ...e };
  },
  async update(id, { name, position, salary }) {
    const e = employees.find((x) => x.id === id);
    if (!e) return null;
    e.name = name;
    e.position = position;
    e.salary = salary;
    return { ...e };
  },
  async toggle(id) {
    const e = employees.find((x) => x.id === id);
    if (!e) return null;
    e.status = e.status === 'Active' ? 'On Leave' : 'Active';
    return { ...e };
  },
  async remove(id) {
    const i = employees.findIndex((x) => x.id === id);
    if (i === -1) return false;
    employees.splice(i, 1);
    return true;
  },
};
