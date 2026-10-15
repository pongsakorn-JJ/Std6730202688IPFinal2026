import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
import { colors, font, tabular, tierBg, tierText } from '../theme';
import { Button, Field } from '../ui';

const formatMoney = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

function StatusPill({ status }) {
  const active = status === 'Active';
  return (
    <View style={[styles.pill, { backgroundColor: active ? colors.accentSoft : colors.amberSoft }]}>
      <View style={[styles.pillDot, { backgroundColor: active ? colors.accent : colors.amber }]} />
      <Text style={[styles.pillText, { color: active ? colors.accent : colors.amber }]}>{status}</Text>
    </View>
  );
}

export default function DashboardScreen({ onLogout }) {
  const { width } = useWindowDimensions();
  const wide = width >= 960;

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
      setEmployees(await getEmployees());
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

  // ---- UI pieces (plain elements, NOT components, so inputs keep focus) ----
  const maxSalary = employees.reduce((m, e) => Math.max(m, Number(e.salary) || 0), 0);
  const maxCentroid = clusters && clusters.length ? Math.max(...clusters.map((c) => c.centroid)) : 0;

  const topBar = (
    <View style={styles.topBar}>
      <View>
        <Text style={styles.pageTitle}>Employees</Text>
        <Text style={styles.pageSub}>{employees.length} on record</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );

  const addForm = (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Add Employee</Text>
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Position" value={position} onChangeText={setPosition} />
      <Field label="Salary" keyboardType="numeric" value={salary} onChangeText={setSalary} />
      <Button title="Add Employee" onPress={handleAdd} loading={adding} />
    </View>
  );

  const analytics = (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Salary structure</Text>
      <Text style={styles.panelHint}>Groups every salary into three tiers (K-Means, k = 3).</Text>
      <Button title="Analyze Salary Structure" onPress={handleAnalyze} disabled={analyzing} />

      {analyzing && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Analyzing salaries...</Text>
        </View>
      )}

      {clusters && clusters.length === 0 && (
        <Text style={styles.empty}>No employees to analyze. Add one first.</Text>
      )}

      {clusters && clusters.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <View style={styles.scaleWrap}>
            <View style={styles.scaleTrack} />
            {clusters.map((c, i) => (
              <View
                key={c.group}
                style={[
                  styles.scaleDot,
                  {
                    left: `${(c.centroid / (maxCentroid || 1)) * 100}%`,
                    backgroundColor: tierBg[i % 3],
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.scaleEnds}>
            <Text style={styles.scaleEndText}>Lower pay</Text>
            <Text style={styles.scaleEndText}>Higher pay</Text>
          </View>

          {clusters.map((c, i) => (
            <View key={c.group} style={styles.tier}>
              <View style={[styles.tierBand, { backgroundColor: tierBg[i % 3] }]}>
                <Text style={[styles.tierName, { color: tierText[i % 3] }]}>{c.group}</Text>
              </View>
              <View style={styles.tierBody}>
                <Text style={styles.tierLabel}>Average base salary</Text>
                <Text style={[styles.tierValue, tabular]}>{formatMoney(c.centroid)}</Text>
                <Text style={styles.tierCount}>
                  {c.count} {c.count === 1 ? 'employee' : 'employees'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const listHeader = (
    <View>
      <Text style={styles.listTitle}>All employees</Text>
      {loadingList && <ActivityIndicator style={{ margin: 16 }} color={colors.accent} />}
    </View>
  );

  const renderItem = ({ item }) => {
    const pct = maxSalary > 0 ? Math.max(3, (Number(item.salary) / maxSalary) * 100) : 0;
    return (
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.empName}>{item.name}</Text>
            <Text style={styles.empPosition}>{item.position}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.empSalary, tabular]}>{formatMoney(item.salary)}</Text>
            <StatusPill status={item.status} />
          </View>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.actions}>
          <Button
            title="Toggle Status"
            variant="outline"
            onPress={() => handleToggle(item.id)}
            style={styles.actionBtn}
          />
          <Button
            title="Delete"
            variant="danger"
            onPress={() => handleDelete(item)}
            style={styles.actionBtn}
          />
        </View>
      </View>
    );
  };

  const emptyList = !loadingList ? (
    <Text style={styles.empty}>No employees yet. Add one with the form.</Text>
  ) : null;

  // ---- Layouts -----------------------------------------------------------
  if (wide) {
    return (
      <View style={styles.wideRoot}>
        {topBar}
        <View style={styles.wideBody}>
          <ScrollView
            style={styles.sidebar}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {addForm}
            {analytics}
          </ScrollView>
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            data={employees}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyList}
          />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={styles.narrowContent}
      data={employees}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={
        <View>
          {topBar}
          {addForm}
          {analytics}
          {listHeader}
        </View>
      }
      ListEmptyComponent={emptyList}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  wideRoot: { flex: 1, width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 24 },
  wideBody: { flex: 1, flexDirection: 'row', gap: 24 },
  sidebar: { width: 380, flexGrow: 0 },
  narrowContent: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  pageTitle: { fontSize: 28, fontFamily: font.black, color: colors.ink, letterSpacing: -0.5 },
  pageSub: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft, marginTop: 2 },
  logout: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  logoutText: { color: colors.ink, fontFamily: font.bold, fontSize: 15, textDecorationLine: 'underline' },

  panel: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    marginBottom: 16,
  },
  panelTitle: { fontSize: 17, fontFamily: font.black, color: colors.ink, marginBottom: 14 },
  panelHint: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, marginTop: -8, marginBottom: 14 },

  loadingBox: { alignItems: 'center', marginTop: 18 },
  loadingText: { fontFamily: font.medium, marginTop: 8, color: colors.inkSoft, fontSize: 14 },
  empty: { fontFamily: font.medium, textAlign: 'center', color: colors.inkSoft, marginTop: 14, fontSize: 14 },

  // salary scale
  scaleWrap: { height: 22, marginHorizontal: 9 },
  scaleTrack: {
    position: 'absolute',
    top: 8,
    left: -9,
    right: -9,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  scaleDot: {
    position: 'absolute',
    top: 2,
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 14 },
  scaleEndText: { fontFamily: font.medium, fontSize: 12, color: colors.inkMute },

  // tier summary cards
  tier: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  tierBand: { width: 84, alignItems: 'center', justifyContent: 'center', padding: 8 },
  tierName: { fontSize: 16, fontFamily: font.black },
  tierBody: { flex: 1, padding: 12 },
  tierLabel: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  tierValue: { fontSize: 24, fontFamily: font.black, color: colors.ink, marginTop: 2 },
  tierCount: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, marginTop: 2 },

  // employee rows
  listTitle: { fontSize: 17, fontFamily: font.black, color: colors.ink, marginBottom: 12 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 10,
  },
  rowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  empName: { fontSize: 17, fontFamily: font.bold, color: colors.ink },
  empPosition: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft, marginTop: 2 },
  empSalary: { fontSize: 18, fontFamily: font.black, color: colors.ink, marginBottom: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  pillText: { fontSize: 12, fontFamily: font.bold },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.ground, marginTop: 14, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1 },
});
