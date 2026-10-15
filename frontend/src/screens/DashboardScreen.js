import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  addEmployee,
  deleteEmployee,
  getEmployees,
  getSalaryClusters,
  toggleStatus,
} from '../api';
import { confirmDialog, showMessage } from '../dialogs';

const TIER_COLORS = ['#2b8a3e', '#e67700', '#c92a2a'];
const formatMoney = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

export default function DashboardScreen({ onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [adding, setAdding] = useState(false);

  const [clusters, setClusters] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleError = useCallback(
    (e) => {
      if (e.status === 401) {
        showMessage('Session expired', 'Please login again.');
        onLogout();
      } else {
        showMessage('Error', e.message);
      }
    },
    [onLogout]
  );

  const loadEmployees = useCallback(async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (e) {
      handleError(e);
    } finally {
      setLoadingList(false);
    }
  }, [handleError]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // ---- Add -------------------------------------------------------------
  const handleAdd = async () => {
    const n = name.trim();
    const p = position.trim();
    const s = salary.trim();
    if (!n || !p || !s) {
      showMessage('Missing information', 'Please fill in name, position and salary.');
      return;
    }
    if (isNaN(Number(s)) || Number(s) < 0) {
      showMessage('Invalid salary', 'Salary must be a valid number.');
      return;
    }
    setAdding(true);
    try {
      const created = await addEmployee({ name: n, position: p, salary: Number(s) });
      setEmployees((prev) => [...prev, created]);
      setName('');
      setPosition('');
      setSalary('');
      setClusters(null); // old analysis is out of date
    } catch (e) {
      handleError(e);
    } finally {
      setAdding(false);
    }
  };

  // ---- Toggle ----------------------------------------------------------
  const handleToggle = async (id) => {
    try {
      const updated = await toggleStatus(id);
      setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (e) {
      handleError(e);
    }
  };

  // ---- Delete (with confirmation) -------------------------------------
  const handleDelete = (employee) => {
    confirmDialog('Are you sure?', `Delete ${employee.name} from the system?`, async () => {
      try {
        await deleteEmployee(employee.id);
        setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
        setClusters(null);
      } catch (e) {
        handleError(e);
      }
    });
  };

  // ---- Analyze ---------------------------------------------------------
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setClusters(null);
    try {
      const data = await getSalaryClusters();
      setClusters(data.clusters);
    } catch (e) {
      handleError(e);
    } finally {
      setAnalyzing(false);
    }
  };

  // ---- UI --------------------------------------------------------------
  const renderHeader = () => (
    <View>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Employees</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Employee</Text>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="Position"
          value={position}
          onChangeText={setPosition}
        />
        <TextInput
          style={styles.input}
          placeholder="Salary"
          keyboardType="numeric"
          value={salary}
          onChangeText={setSalary}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, adding && styles.disabled]}
          onPress={handleAdd}
          disabled={adding}
        >
          {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Add Employee</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Salary Analytics</Text>
        <TouchableOpacity
          style={[styles.analyzeBtn, analyzing && styles.disabled]}
          onPress={handleAnalyze}
          disabled={analyzing}
        >
          <Text style={styles.btnText}>Analyze Salary Structure</Text>
        </TouchableOpacity>

        {analyzing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3b5bdb" />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        )}

        {clusters && clusters.length === 0 && (
          <Text style={styles.empty}>No employees to analyze.</Text>
        )}

        {clusters &&
          clusters.map((c, i) => (
            <View key={c.group} style={[styles.tierCard, { borderLeftColor: TIER_COLORS[i % 3] }]}>
              <Text style={[styles.tierName, { color: TIER_COLORS[i % 3] }]}>{c.group}</Text>
              <Text style={styles.tierLine}>Employees: {c.count}</Text>
              <Text style={styles.tierLine}>Average base salary: {formatMoney(c.centroid)}</Text>
            </View>
          ))}
      </View>

      <Text style={styles.listTitle}>All Employees ({employees.length})</Text>
      {loadingList && <ActivityIndicator style={{ margin: 16 }} color="#3b5bdb" />}
    </View>
  );

  const renderItem = ({ item }) => {
    const active = item.status === 'Active';
    return (
      <View style={styles.empCard}>
        <View style={styles.empRow}>
          <Text style={styles.empName}>{item.name}</Text>
          <Text style={[styles.badge, active ? styles.badgeActive : styles.badgeLeave]}>
            {item.status}
          </Text>
        </View>
        <Text style={styles.empText}>{item.position}</Text>
        <Text style={styles.empText}>Salary: {formatMoney(item.salary)}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.toggleBtn} onPress={() => handleToggle(item.id)}>
            <Text style={styles.btnText}>Toggle Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={employees}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={!loadingList && <Text style={styles.empty}>No employees.</Text>}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heading: { fontSize: 24, fontWeight: '700', color: '#1f2d4d' },
  logout: { color: '#c92a2a', fontWeight: '600', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#1f2d4d', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#d5dbe8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
    backgroundColor: '#fafbfd',
  },
  primaryBtn: { backgroundColor: '#3b5bdb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  analyzeBtn: { backgroundColor: '#7048e8', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  loadingBox: { alignItems: 'center', marginTop: 14 },
  loadingText: { marginTop: 6, color: '#6b7a99' },
  tierCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f8f9fc',
    borderLeftWidth: 6,
  },
  tierName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  tierLine: { fontSize: 15, color: '#343a40' },
  listTitle: { fontSize: 17, fontWeight: '600', color: '#1f2d4d', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#868e96', marginTop: 12 },
  empCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  empRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empName: { fontSize: 16, fontWeight: '700', color: '#1f2d4d', flexShrink: 1 },
  empText: { fontSize: 14, color: '#495057', marginTop: 2 },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  badgeActive: { backgroundColor: '#d3f9d8', color: '#2b8a3e' },
  badgeLeave: { backgroundColor: '#ffe8cc', color: '#d9480f' },
  actions: { flexDirection: 'row', marginTop: 10, gap: 8 },
  toggleBtn: { flex: 1, backgroundColor: '#1c7ed6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  deleteBtn: { flex: 1, backgroundColor: '#e03131', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
});
