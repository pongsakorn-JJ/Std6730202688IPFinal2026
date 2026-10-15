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
import { colors, font, tabular, tierBg, tierBorder, tierText } from '../theme';
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

// ---- Scatter plot of salaries by tier (1-D K-Means drawn as a strip plot) ----
function niceDomain(min, max) {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / 3;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * p).find((x) => x >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

const compact = (v) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${v}`);

function SalaryScatter({ clusters, employees, picked, onPick }) {
  const [w, setW] = useState(0);
  const BH = 58; // height of one tier band
  const LABEL_W = 54;
  const PAD_R = 10;
  const INSET = 10;

  // each employee belongs to the tier whose centroid is closest to their salary
  const tierOf = (sal) => {
    let best = 0;
    clusters.forEach((c, i) => {
      if (Math.abs(sal - c.centroid) < Math.abs(sal - clusters[best].centroid)) best = i;
    });
    return best;
  };
  const counter = {};
  const pts = employees.map((e) => {
    const salary = Number(e.salary);
    const tier = tierOf(salary);
    const k = (counter[tier] = (counter[tier] || 0) + 1) - 1;
    return { ...e, salary, tier, jitter: ((k % 3) - 1) * 13 }; // spread overlapping dots
  });

  const sal = pts.map((x) => x.salary);
  const { lo, hi, ticks } = niceDomain(Math.min(...sal), Math.max(...sal));
  const plotW = Math.max(0, w - LABEL_W - PAD_R);
  const xOf = (v) => LABEL_W + INSET + ((v - lo) / (hi - lo)) * Math.max(0, plotW - INSET * 2);
  const H = clusters.length * BH;

  return (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.chartTitle}>Salary by tier</Text>
      <View style={{ height: H + 26 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <>
            {clusters.map((c, i) => (
              <View
                key={`band-${c.group}`}
                style={[
                  styles.chartBand,
                  { top: i * BH + 2, height: BH - 4, left: LABEL_W, right: PAD_R, backgroundColor: tierBg[i % 3] },
                ]}
              />
            ))}
            {clusters.map((c, i) => (
              <View key={`lab-${c.group}`} style={[styles.chartLabel, { top: i * BH, height: BH, width: LABEL_W - 6 }]}>
                <Text style={styles.chartLabelText}>{c.group}</Text>
              </View>
            ))}
            {ticks.map((t) => (
              <View key={`grid-${t}`} style={[styles.chartGrid, { left: xOf(t), height: H }]} />
            ))}
            {clusters.map((c, i) => (
              <View
                key={`mean-${c.group}`}
                style={[styles.chartMean, { left: xOf(c.centroid) - 1.5, top: i * BH + BH / 2 - 17 }]}
              />
            ))}
            {pts.map((p) => {
              const isPicked = picked && picked.id === p.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name}, salary ${formatMoney(p.salary)}, ${clusters[p.tier].group}`}
                  onPress={() => onPick(isPicked ? null : p)}
                  hitSlop={8}
                  style={[
                    styles.chartDot,
                    {
                      left: xOf(p.salary) - 7,
                      top: p.tier * BH + BH / 2 - 7 + p.jitter,
                      backgroundColor: tierBg[p.tier % 3],
                      borderColor: isPicked ? colors.ink : tierBorder[p.tier % 3],
                      borderWidth: isPicked ? 3 : 2,
                    },
                  ]}
                />
              );
            })}
            {ticks.map((t) => (
              <Text key={`tick-${t}`} style={[styles.chartTick, { left: xOf(t) - 22, top: H + 6 }]}>
                {compact(t)}
              </Text>
            ))}
          </>
        )}
      </View>
      <Text style={styles.chartAxis}>Base salary</Text>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: tierBg[1], borderColor: tierBorder[1] }]} />
          <Text style={styles.legendText}>Employee</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendBar} />
          <Text style={styles.legendText}>Tier average</Text>
        </View>
      </View>
      <Text style={styles.chartPicked}>
        {picked
          ? `${picked.name} · ${formatMoney(picked.salary)} · ${clusters[picked.tier].group}`
          : 'Tap a dot to see who it is.'}
      </Text>
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
  const [picked, setPicked] = useState(null);

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
    setPicked(null);
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
          <SalaryScatter clusters={clusters} employees={employees} picked={picked} onPick={setPicked} />

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

  // scatter plot
  chartTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink, marginBottom: 10 },
  chartBand: { position: 'absolute', borderRadius: 6, opacity: 0.22 },
  chartLabel: { position: 'absolute', left: 0, justifyContent: 'center' },
  chartLabelText: { fontFamily: font.semibold, fontSize: 12, color: colors.inkSoft },
  chartGrid: { position: 'absolute', top: 0, width: 1, backgroundColor: colors.line },
  chartMean: { position: 'absolute', width: 3, height: 34, borderRadius: 2, backgroundColor: colors.ink },
  chartDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7 },
  chartTick: { position: 'absolute', width: 44, textAlign: 'center', fontFamily: font.medium, fontSize: 11, color: colors.inkMute },
  chartAxis: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft, textAlign: 'center', marginTop: 2 },
  legend: { flexDirection: 'row', gap: 18, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginRight: 6 },
  legendBar: { width: 3, height: 14, borderRadius: 2, backgroundColor: colors.ink, marginRight: 7 },
  legendText: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  chartPicked: { fontFamily: font.semibold, fontSize: 13, color: colors.ink, marginTop: 10, marginBottom: 14 },

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
