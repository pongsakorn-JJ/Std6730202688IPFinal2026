import { API_URL } from './config';

let token = null;
export const setToken = (t) => {
  token = t;
};

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (e) {
    throw new Error(`Cannot reach server at ${API_URL}. Is the backend running?`);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // empty / non-JSON body
  }

  if (!res.ok) {
    const err = new Error((data && data.message) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const login = (username, password) =>
  request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const getEmployees = () => request('/api/employees');

export const addEmployee = (employee) =>
  request('/api/employees', { method: 'POST', body: JSON.stringify(employee) });

export const updateEmployee = (id, employee) =>
  request(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(employee) });

export const toggleStatus = (id) => request(`/api/employees/${id}/status`, { method: 'PUT' });

export const deleteEmployee = (id) => request(`/api/employees/${id}`, { method: 'DELETE' });

export const getSalaryClusters = () => request('/api/employees/salary-clusters');
