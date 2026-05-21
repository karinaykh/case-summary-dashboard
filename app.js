/* PharmSim cross-case dashboard — hand-rolled SVG, no dependencies. */

const DATA_PATHS = {
  performance: "../cross_case/student_case_performance_long_deidentified.csv",
  engagement: "../cross_case/student_case_engagement_long_deidentified.csv",
  trajectory: "../cross_case/student_trajectory_summary_deidentified.csv",
  trajectoryOverview: "../cross_case/trajectory_overview.csv",
  caseOverview: "../cross_case/case_overview.csv",
  parseWarnings: "../cross_case/score_parse_warnings_cross_case_deidentified.csv",
};

const CASES = ["C1", "C2", "C3"];
const CASE_NAMES = { C1: "Case 1", C2: "Case 2", C3: "Case 3" };
const CASE_COLORS = { C1: "#315f8d", C2: "#287c78", C3: "#a94858" };

const COLORS = {
  blue: "#315f8d",
  teal: "#287c78",
  amber: "#b87525",
  rose: "#a94858",
  green: "#4d7a38",
  ink: "#202322",
  muted: "#5d6862",
  line: "#d8ded9",
  surface: "#ffffff",
  surfaceSoft: "#eef3ef",
};

const SECTION_FIELDS = [
  ["section1_history_taking_technique_pct", "History technique", "Section 1 — History taking technique (open vs closed questioning, structure, flow)"],
  ["section2_history_taking_content_pct", "History content", "Section 2 — History taking content (HPI, PMH, allergies, medications, family/social history coverage)"],
  ["section3_case_presentation_pct", "Case presentation", "Section 3 — Organisation and accuracy of presenting the case to the preceptor"],
  ["section4_diagnostic_reasoning_pct", "Diagnostic reasoning", "Section 4 — Most likely differential, alternative differentials, severe/life-threatening considerations"],
  ["section5_triage_care_plan_pct", "Triage/care plan", "Section 5 — Appropriate triage decision and care plan recommendation"],
  ["section6_rapport_empathy_pct", "Rapport/empathy", "Section 6 — Rapport-building and empathic communication"],
];

const SUBRUBRIC_FIELDS = [
  ["diagnostic_most_likely_differential_pct", "Most likely differential"],
  ["diagnostic_aetiology_risk_factors_pct", "Aetiology / risk factors"],
  ["diagnostic_other_differentials_pct", "Other differentials"],
  ["diagnostic_severe_life_threatening_differentials_pct", "Severe / life-threatening differentials"],
  ["triage_pct", "Triage decision"],
  ["care_plan_pct", "Care plan"],
  ["rapport_pct", "Rapport"],
  ["empathy_pct", "Empathy"],
];

const DETAIL_RUBRIC_FIELDS = [
  ["History content", "domain_hpi_pct", "HPI"],
  ["History content", "domain_red_flags_pct", "Red flags"],
  ["History content", "domain_past_medical_history_pct", "Past medical history"],
  ["History content", "domain_allergies_pct", "Allergies"],
  ["History content", "domain_medications_pct", "Medications"],
  ["History content", "domain_family_history_pct", "Family history"],
  ["History content", "domain_social_history_pct", "Social history"],
  ["Diagnostic reasoning", "diagnostic_most_likely_differential_pct", "Most likely differential"],
  ["Diagnostic reasoning", "diagnostic_aetiology_risk_factors_pct", "Aetiology / risk factors"],
  ["Diagnostic reasoning", "diagnostic_other_differentials_pct", "Other differentials"],
  ["Diagnostic reasoning", "diagnostic_severe_life_threatening_differentials_pct", "Severe / life-threatening differentials"],
  ["Triage/care plan", "triage_pct", "Triage decision"],
  ["Triage/care plan", "care_plan_pct", "Care plan"],
  ["Communication", "rapport_pct", "Rapport"],
  ["Communication", "empathy_pct", "Empathy"],
];

const DIRECTION_ORDER = ["improving", "stable_within_5_pct_points", "mixed", "declining", "insufficient_data"];
const DIRECTION_LABEL = {
  improving: "Score increased",
  stable_within_5_pct_points: "Stable within 5 pp",
  mixed: "Mixed score movement",
  declining: "Score decreased",
  insufficient_data: "Insufficient score data",
};
const DIRECTION_COLOR = {
  improving: COLORS.green,
  stable_within_5_pct_points: COLORS.teal,
  mixed: COLORS.blue,
  declining: COLORS.rose,
  insufficient_data: "#9aa49d",
};

const SEQUENCE_TYPE_ORDER = [
  "case_number_order_1_2_3",
  "ascending_case_number_order_with_skip",
  "free_choice_nonascending_order",
  "single_case",
  "not_attempted",
];
const SEQUENCE_LABEL = {
  case_number_order_1_2_3: "1 → 2 → 3",
  ascending_case_number_order_with_skip: "Ascending with skip",
  free_choice_nonascending_order: "Free / nonascending",
  single_case: "Single case",
  not_attempted: "No case attempt recorded",
};

const appState = {
  performance: [],
  engagement: [],
  trajectory: [],
  trajectoryOverview: [],
  caseOverview: [],
  parseWarnings: [],
  caseSummary: [],
  studentSort: { column: "anonymous_id", asc: true },
  tooltip: null,
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupTabs();
  ensureTooltip();
  try {
    await loadDashboardData();
    appState.caseSummary = buildCaseSummary(appState.performance);

    renderAll();
  } catch (error) {
    console.error(error);
    setStatus("Data error — see overview tab", "error");
  }
}

async function loadDashboardData() {
  const useBundleFirst = window.location.protocol === "file:" && window.PHARMSIM_DATA;
  if (useBundleFirst) {
    applyBundledData(window.PHARMSIM_DATA);
    return "bundle";
  }

  try {
    const required = [
      ["performance", DATA_PATHS.performance],
      ["engagement", DATA_PATHS.engagement],
      ["trajectory", DATA_PATHS.trajectory],
      ["trajectoryOverview", DATA_PATHS.trajectoryOverview],
      ["caseOverview", DATA_PATHS.caseOverview],
    ];
    const results = {};
    for (const [name, path] of required) {
      results[name] = await loadCsv(path);
    }
    appState.performance = results.performance;
    appState.engagement = results.engagement;
    appState.trajectory = results.trajectory;
    appState.trajectoryOverview = results.trajectoryOverview;
    appState.caseOverview = results.caseOverview;
    appState.parseWarnings = (await loadCsvOptional(DATA_PATHS.parseWarnings)) || [];
    return "csv";
  } catch (err) {
    if (window.PHARMSIM_DATA) {
      console.warn("Falling back to bundled dashboard data:", err);
      applyBundledData(window.PHARMSIM_DATA);
      return "bundle";
    }
    renderLoadError("dashboard CSVs", "../cross_case/*.csv", err);
    throw err;
  }
}

function applyBundledData(data) {
  appState.performance = data.performance || [];
  appState.engagement = data.engagement || [];
  appState.trajectory = data.trajectory || [];
  appState.trajectoryOverview = data.trajectoryOverview || [];
  appState.caseOverview = data.caseOverview || [];
  appState.parseWarnings = data.parseWarnings || [];
}

function renderLoadError(name, path, error) {
  const overview = document.getElementById("overview");
  if (!overview) return;
  const isFileProtocol = window.location.protocol === "file:";
  const hint = isFileProtocol
    ? `<p>The page was opened via <code>file://</code>. Browsers block <code>fetch()</code> from local files. Serve the parent folder over HTTP instead:</p>
       <pre>cd /Users/karina/Documents/AICET/PharSim/scholaistic_clean
python3 -m http.server 8000</pre>
       <p>Then open <code>http://localhost:8000/dashboard/</code>.</p>`
    : `<p>Make sure the server is running in <code>scholaistic_clean/</code> (the parent of <code>dashboard/</code> and <code>cross_case/</code>), not inside <code>dashboard/</code>.</p>`;
  overview.innerHTML = `
    <div class="panel" style="border-top-color:#a94858">
      <div class="panel-heading">
        <h3 style="color:#a94858">Could not load <code>${escapeHtml(name)}</code></h3>
        <p>Resolved URL: <code>${escapeHtml(new URL(path, window.location.href).href)}</code></p>
      </div>
      ${hint}
      <p style="margin-top:12px"><strong>Error:</strong> <code>${escapeHtml(String(error && error.message || error))}</code></p>
    </div>
  `;
}

/* ============================================================
   CSV loading and parsing
   ============================================================ */

async function loadCsv(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return parseCsv(await response.text());
}

async function loadCsvOptional(path) {
  try {
    return await loadCsv(path);
  } catch (error) {
    console.warn("optional CSV missing:", path, error);
    return [];
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] ?? "";
    });
    return item;
  });
}

/* ============================================================
   Top-level layout helpers
   ============================================================ */

function setupTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
  });
}

function setStatus(text, className) {
  const status = document.getElementById("dataStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `status-pill ${className || ""}`.trim();
}

function renderAll() {
  renderOverview();
  renderParticipation();
  renderEngagement();
  renderPerformance();
  renderTrajectory();
  setupStudentExplorer();
  renderStudentTable();
}

/* ============================================================
   Derived series
   ============================================================ */

function buildCaseSummary(rows) {
  return CASES.map((caseShort) => {
    const caseRows = rows.filter((row) => row.case_short === caseShort);
    const attemptedRows = caseRows.filter((row) => isTrue(row.attempted));
    const eligibleRows = caseRows.filter((row) => isTrue(row.performance_eligible));
    const totalPct = eligibleRows.map((row) => toNumber(row.main_total_pct)).filter((v) => v !== null);
    return {
      caseShort,
      caseLabel: caseRows[0]?.case_label || CASE_NAMES[caseShort],
      attempted: attemptedRows.length,
      completedEndChat: caseRows.filter((row) => isTrue(row.retained_completed_interaction)).length,
      completedEvaluation: caseRows.filter((row) => isTrue(row.retained_completed_evaluation)).length,
      performanceEligible: eligibleRows.length,
      multipleAttempts: caseRows.filter((row) => isTrue(row.attempted) && isTrue(row.has_multiple_attempts)).length,
      postCompletionMessages: caseRows.filter((row) => isTrue(row.post_completion_messages_flag)).length,
      totalPctMean: average(totalPct),
      totalPctMedian: median(totalPct),
      totalPctSd: stdev(totalPct),
      totalPctValues: totalPct,
      totalPctMin: totalPct.length ? Math.min(...totalPct) : null,
      totalPctMax: totalPct.length ? Math.max(...totalPct) : null,
      totalPctQ1: quantile(totalPct, 0.25),
      totalPctQ3: quantile(totalPct, 0.75),
      sectionMeans: Object.fromEntries(
        SECTION_FIELDS.map(([field]) => [field, average(eligibleRows.map((row) => toNumber(row[field])))])
      ),
      sectionN: Object.fromEntries(
        SECTION_FIELDS.map(([field]) => [
          field,
          eligibleRows.filter((row) => toNumber(row[field]) !== null).length,
        ])
      ),
    };
  });
}

function subrubricSeries() {
  return CASES.map((caseShort) => {
    const rows = appState.performance.filter(
      (row) => row.case_short === caseShort && isTrue(row.performance_eligible)
    );
    const items = DETAIL_RUBRIC_FIELDS.map(([group, field, label]) => {
      const values = rows.map((row) => toNumber(row[field])).filter((v) => v !== null);
      return values.length
        ? { group, field, label, mean: average(values), median: median(values), n: values.length }
        : null;
    }).filter(Boolean);
    items.sort((a, b) => a.mean - b.mean);
    return { caseShort, items, totalEligible: rows.length };
  });
}

function deltaSeries() {
  return CASES.map((caseShort) => {
    const rows = appState.performance.filter(
      (row) => row.case_short === caseShort && row.delta_total_pct_from_previous_performance_case !== ""
    );
    const deltas = rows
      .map((row) => toNumber(row.delta_total_pct_from_previous_performance_case))
      .filter((v) => v !== null);
    return {
      caseShort,
      n: deltas.length,
      mean: average(deltas),
      median: median(deltas),
      min: deltas.length ? Math.min(...deltas) : null,
      max: deltas.length ? Math.max(...deltas) : null,
      q1: quantile(deltas, 0.25),
      q3: quantile(deltas, 0.75),
      values: deltas,
    };
  });
}

function activityTimeline() {
  const buckets = new Map();
  appState.performance.forEach((row) => {
    if (!isTrue(row.attempted)) return;
    const stamp = row.retained_attempt_created_at;
    if (!stamp) return;
    const date = stamp.slice(0, 10);
    if (!buckets.has(date)) buckets.set(date, { C1: 0, C2: 0, C3: 0 });
    buckets.get(date)[row.case_short] += 1;
  });
  return [...buckets.entries()]
    .map(([date, counts]) => ({ date, ...counts, total: counts.C1 + counts.C2 + counts.C3 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ============================================================
   Overview tab
   ============================================================ */

function renderOverview() {
  const attemptedAny = countWhere(appState.trajectory, (row) => (toNumber(row.cases_attempted) || 0) > 0);
  const allThreeAttempted = countWhere(appState.trajectory, (row) => row.cases_attempted === "3");
  const allThreeCompleted = countWhere(appState.trajectory, (row) => row.cases_completed_interaction === "3");
  const anyMultiAttempt = unique(
    appState.performance.filter((row) => isTrue(row.has_multiple_attempts)).map((row) => row.anonymous_id)
  ).length;
  document.getElementById("overviewMetrics").innerHTML = [
    metricCard("Attempted at least 1 case", attemptedAny, "students"),
    metricCard("Attempted all 3 cases", allThreeAttempted, "students"),
    metricCard("Completed all 3 simulations", allThreeCompleted, "reached final stage in all 3"),
    metricCard("Multiple attempts (any case)", anyMultiAttempt, "unique students"),
  ].join("");
}

function renderParticipation() {
  renderCaseFunnelTable();
}

function renderCaseFunnelTable() {
  const rows = appState.caseSummary.map((item) => [
    item.caseLabel.trim(),
    numberCell(item.attempted),
    rateCell(item.completedEndChat, item.attempted),
    rateCell(item.completedEvaluation, item.attempted),
    rateCell(item.performanceEligible, item.attempted),
    rateCell(item.multipleAttempts, item.attempted),
  ]);
  renderTable(
    "caseFunnelTable",
    ["Case", "Attempted", "Completed simulation", "Evaluation submitted", "Performance data available", "Multiple attempts"],
    rows
  );
}

/* ============================================================
   Engagement tab
   ============================================================ */

function renderEngagement() {
  renderEngagementSummaryTable();
  renderEngagementCompletionTable();
  renderAttemptTimingTable();
}

function renderEngagementSummaryTable() {
  const rows = CASES.map((caseShort) => {
    const values = appState.engagement
      .filter((row) => row.case_short === caseShort && isTrue(row.attempted));
    const summary = appState.caseSummary.find((item) => item.caseShort === caseShort);
    return [
      summary.caseLabel.trim(),
      numberCell(values.length),
      summaryStat(values.map((row) => toNumber(row.retained_student_turns))),
      summaryStat(values.map((row) => toNumber(row.retained_active_minutes_5min_cap)), "min"),
      summaryStat(values.map((row) => studentWordsPerTurn(row)), "words"),
      summaryStat(values.map((row) => toNumber(row.retained_student_words)), "words"),
      rateCell(summary.multipleAttempts, summary.attempted),
    ];
  });
  renderTable(
    "engagementSummaryTable",
    ["Case", "Attempted", "Student turns", "Active minutes", "Student words / turn", "Student words total", "Multiple attempts"],
    rows,
    true
  );
}

function renderEngagementCompletionTable() {
  const rows = CASES.flatMap((caseShort) => {
    const values = appState.engagement
      .filter((row) => row.case_short === caseShort && isTrue(row.attempted));
    const summary = appState.caseSummary.find((item) => item.caseShort === caseShort);
    return [
      ["Completed simulation", values.filter((row) => isTrue(row.retained_completed_interaction))],
      ["Did not complete simulation", values.filter((row) => !isTrue(row.retained_completed_interaction))],
    ].map(([status, statusRows]) => [
      summary.caseLabel.trim(),
      status,
      numberCell(statusRows.length),
      summaryStat(statusRows.map((row) => toNumber(row.retained_student_turns))),
      summaryStat(statusRows.map((row) => toNumber(row.retained_active_minutes_5min_cap)), "min"),
      summaryStat(statusRows.map((row) => studentWordsPerTurn(row)), "words"),
      summaryStat(statusRows.map((row) => toNumber(row.retained_student_words)), "words"),
    ]);
  });
  renderTable(
    "engagementCompletionTable",
    ["Case", "Selected attempt status", "n", "Student turns", "Active minutes", "Student words / turn", "Student words total"],
    rows,
    true
  );
}

function renderAttemptTimingTable() {
  const timeline = activityTimeline();
  renderTimingTable(timeline);
}

/* ============================================================
   Performance tab
   ============================================================ */

function renderPerformance() {
  renderScoreSummaryTable();
  renderSectionHeatmap();
  renderDetailedRubricHeatmap();
  renderSubrubricDrill();
}

function renderScoreSummaryTable() {
  const rows = appState.caseSummary.map((item) => [
    item.caseLabel.trim(),
    numberCell(item.totalPctValues.length),
    `${formatPct(item.totalPctMean)} ± ${formatPct(item.totalPctSd)}`,
    medianIqr(item.totalPctValues, "%"),
    `${formatPct(item.totalPctMin)} to ${formatPct(item.totalPctMax)}`,
  ]);
  renderTable("scoreSummaryTable", ["Case", "n in score summary", "Mean ± SD", "Median (IQR)", "Range"], rows);
}

function renderSubrubricDrill() {
  const series = subrubricSeries();
  const rows = series.flatMap((entry) =>
    entry.items.slice(0, 3).map((item) => [
      CASE_NAMES[entry.caseShort],
      item.group,
      item.label,
      formatPct(item.mean),
      numberCell(item.n),
    ])
  );
  renderTable("subrubricTable", ["Case", "Rubric group", "Rubric area", "Mean %", "n"], rows);
}

function renderSectionHeatmap() {
  const rows = SECTION_FIELDS.map(([field, label]) => ({
    group: "Section",
    label,
    cells: CASES.map((caseShort) => {
      const summary = appState.caseSummary.find((item) => item.caseShort === caseShort);
      return {
        value: summary?.sectionMeans[field] ?? null,
        n: summary?.sectionN[field] ?? 0,
      };
    }),
  }));
  renderHeatmapTable("sectionHeatmap", ["Rubric section", "Case 1", "Case 2", "Case 3"], rows);
}

function renderDetailedRubricHeatmap() {
  const rows = DETAIL_RUBRIC_FIELDS.map(([group, field, label]) => ({
    group,
    label,
    cells: CASES.map((caseShort) => fieldStats(caseShort, field)),
  })).filter((row) => row.cells.some((cell) => cell.n > 0));
  renderHeatmapTable("detailHeatmap", ["Rubric group", "Rubric area", "Case 1", "Case 2", "Case 3"], rows, true);
}

/* ============================================================
   Trajectory tab
   ============================================================ */

function renderTrajectory() {
  const attemptedAny = countWhere(appState.trajectory, (row) => (toNumber(row.cases_attempted) || 0) > 0);
  const attemptedAll = countWhere(appState.trajectory, (row) => row.cases_attempted === "3");
  const completedAll = countWhere(appState.trajectory, (row) => row.cases_completed_interaction === "3");
  const eligibleAll = countWhere(appState.trajectory, (row) => row.cases_performance_eligible === "3");

  document.getElementById("trajectoryMetrics").innerHTML = [
    metricCard("Attempted at least 1 case", attemptedAny, "students"),
    metricCard("Attempted all 3", attemptedAll, "students"),
    metricCard("Completed all 3 simulations", completedAll, "reached final stage"),
    metricCard("Performance data for all 3", eligibleAll, "score summaries"),
  ].join("");

  renderSequenceBars();
  renderDirectionBars();
  renderDeltaPanel();
}

function renderSequenceBars() {
  const attemptedAny = countWhere(appState.trajectory, (row) => (toNumber(row.cases_attempted) || 0) > 0) || 1;
  const rows = appState.trajectoryOverview
    .filter((row) => row.overview_type === "actual_attempt_sequence_case_shorts")
    .filter((row) => row.category !== "not_attempted")
    .map((row) => ({
      label: row.category,
      count: toNumber(row.n_students) || 0,
      pct: ((toNumber(row.n_students) || 0) / attemptedAny) * 100,
      raw: row.category,
    }))
    .sort((a, b) => b.count - a.count);
  const maxValue = Math.max(...rows.map((r) => r.count), 1);
  document.getElementById("sequenceBars").innerHTML = `
    <div class="bar-list">
      ${rows
        .map((row) =>
          barRow(row.label, row.count, maxValue, `${row.count} (${formatPct(row.pct)})`, COLORS.teal,
            `${row.label}: ${row.count} students (${formatPct(row.pct)})`)
        )
        .join("")}
    </div>
  `;
}

function renderDirectionBars() {
  const attemptedRows = appState.trajectory.filter((row) => (toNumber(row.cases_attempted) || 0) > 0);
  const denominator = attemptedRows.length || 1;
  const data = new Map();
  attemptedRows.forEach((row) => {
    const key = row.performance_direction_chronological || "insufficient_data";
    data.set(key, (data.get(key) || 0) + 1);
  });
  const maxValue = Math.max(...[...data.values()], 1);
  const ordered = DIRECTION_ORDER.filter((key) => data.has(key)).map((key) => {
    const count = data.get(key) || 0;
    return { key, label: DIRECTION_LABEL[key], color: DIRECTION_COLOR[key], count, pct: (count / denominator) * 100 };
  });
  document.getElementById("directionBars").innerHTML = `
    <div class="bar-list">
      ${ordered
        .map((row) =>
          barRow(row.label, row.count, maxValue, `${row.count} (${formatPct(row.pct)})`, row.color,
            `${row.label}: ${row.count} students (${formatPct(row.pct)})`)
        )
        .join("")}
    </div>
  `;
  attachTooltips();
}

function renderDeltaPanel() {
  const series = deltaSeries();
  const rows = series.map((entry) => [
    `Into ${entry.caseShort}`,
    numberCell(entry.n),
    formatSigned(entry.mean),
    medianIqr(entry.values, "pp", true),
    `${formatSigned(entry.min)} to ${formatSigned(entry.max)}`,
  ]);
  renderTable("deltaTable", ["Movement", "n", "Mean change", "Median change (IQR)", "Range"], rows);
}

/* ============================================================
   Students tab
   ============================================================ */

function setupStudentExplorer() {
  fillSelect(
    "sequenceFilter",
    "All sequences",
    unique(appState.trajectory.map((row) => row.case_number_sequence_type)).sort(),
    (v) => SEQUENCE_LABEL[v] || v.replaceAll("_", " ")
  );
  fillSelect(
    "directionFilter",
    "All score changes",
    unique(appState.trajectory.map((row) => row.performance_direction_chronological)).sort(),
    (v) => DIRECTION_LABEL[v] || v.replaceAll("_", " ")
  );

  ["sequenceFilter", "directionFilter", "studentSearch"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderStudentTable);
  });
  document.getElementById("studentCsvExport").addEventListener("click", exportStudentCsv);
}

function studentsRendered() {
  const sequence = document.getElementById("sequenceFilter").value;
  const direction = document.getElementById("directionFilter").value;
  const search = document.getElementById("studentSearch").value.trim().toUpperCase();
  const filtered = appState.trajectory
    .filter((row) => !sequence || row.case_number_sequence_type === sequence)
    .filter((row) => !direction || row.performance_direction_chronological === direction)
    .filter((row) => !search || row.anonymous_id.toUpperCase().includes(search));
  const enriched = filtered.map((row) => ({
    row,
    fields: studentExplorerFields(row),
  }));
  const { column, asc } = appState.studentSort;
  const accessor = (item) => {
    const v = item.fields[column];
    if (v === null || v === undefined || v === "") return asc ? Infinity : -Infinity;
    return v;
  };
  enriched.sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (typeof av === "number" && typeof bv === "number") return asc ? av - bv : bv - av;
    return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  return enriched;
}

function studentExplorerFields(row) {
  const caseRows = appState.performance.filter((caseRow) => caseRow.anonymous_id === row.anonymous_id);
  const attemptedCaseRows = caseRows.filter((caseRow) => isTrue(caseRow.attempted));
  return {
    anonymous_id: row.anonymous_id,
    sequence: row.actual_attempt_sequence_case_shorts || "No case attempt recorded",
    sequence_type: row.case_number_sequence_type,
    direction: row.performance_direction_chronological,
    casesAttempted: toNumber(row.cases_attempted) || 0,
    rawAttempts: attemptedCaseRows.reduce((sum, caseRow) => sum + (toNumber(caseRow.n_attempts_total) || 0), 0),
    retryCases: attemptedCaseRows.filter((caseRow) => isTrue(caseRow.has_multiple_attempts)).length,
    casesCompleted: toNumber(row.cases_completed_interaction) || 0,
    scoreDataCases: toNumber(row.cases_performance_eligible) || 0,
    c1: toNumber(row.c1_main_total_pct),
    c2: toNumber(row.c2_main_total_pct),
    c3: toNumber(row.c3_main_total_pct),
  };
}

function renderStudentTable() {
  const enriched = studentsRendered();
  document.getElementById("studentTableTitle").textContent = `Students (${enriched.length})`;

  const headerCells = [
    { id: "anonymous_id", label: "ID" },
    { id: "sequence", label: "Actual sequence", sortable: false },
    { id: "sequence_type", label: "Sequence type" },
    { id: "direction", label: "Score change" },
    { id: "casesAttempted", label: "Cases attempted" },
    { id: "rawAttempts", label: "Total attempts" },
    { id: "retryCases", label: "Retry cases" },
    { id: "casesCompleted", label: "Cases completed" },
    { id: "scoreDataCases", label: "Score data cases" },
    { id: "c1", label: "C1 %" },
    { id: "c2", label: "C2 %" },
    { id: "c3", label: "C3 %" },
    { id: "spark", label: "Trajectory", sortable: false },
  ];
  const { column, asc } = appState.studentSort;
  const headerHtml = headerCells
    .map((cell) => {
      const indicator = cell.id === column ? (asc ? " ▲" : " ▼") : "";
      const cls = cell.sortable === false ? "" : "sortable";
      const handler = cell.sortable === false ? "" : `data-sort="${cell.id}"`;
      return `<th class="${cls}" ${handler}>${escapeHtml(cell.label)}${indicator}</th>`;
    })
    .join("");

  const rowHtml = enriched
    .map(({ row, fields }) => {
      const slotScores = [
        { case: row.slot1_case_short, score: toNumber(row.slot1_main_total_pct) },
        { case: row.slot2_case_short, score: toNumber(row.slot2_main_total_pct) },
        { case: row.slot3_case_short, score: toNumber(row.slot3_main_total_pct) },
      ].filter((entry) => entry.case);
      const direction = row.performance_direction_chronological;
      const spark = svgSparkline(slotScores, { direction, width: 80, height: 28 });
      const cells = [
        `<strong>${escapeHtml(fields.anonymous_id)}</strong>`,
        escapeHtml(fields.sequence),
        badge(fields.sequence_type),
        badge(fields.direction),
        numberCell(fields.casesAttempted),
        numberCell(fields.rawAttempts),
        numberCell(fields.retryCases),
        numberCell(fields.casesCompleted),
        numberCell(fields.scoreDataCases),
        fields.c1 === null ? "—" : formatPct(fields.c1),
        fields.c2 === null ? "—" : formatPct(fields.c2),
        fields.c3 === null ? "—" : formatPct(fields.c3),
        spark,
      ];
      return `<tr>${cells
        .map((cell, i) => {
          const cls = i >= 4 && i <= 11 ? "number" : i === 12 ? "spark-cell" : "";
          return `<td class="${cls}">${cell}</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");

  document.getElementById("studentTable").innerHTML = `<thead><tr>${headerHtml}</tr></thead><tbody>${rowHtml}</tbody>`;
  document.querySelectorAll("#studentTable th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-sort");
      if (appState.studentSort.column === col) {
        appState.studentSort.asc = !appState.studentSort.asc;
      } else {
        appState.studentSort.column = col;
        appState.studentSort.asc = true;
      }
      renderStudentTable();
    });
  });
}

function exportStudentCsv() {
  const enriched = studentsRendered();
  const headers = [
    "anonymous_id",
    "actual_sequence",
    "sequence_type",
    "score_change",
    "cases_attempted",
    "total_raw_attempts",
    "cases_with_retries",
    "cases_completed_interaction",
    "cases_with_performance_data",
    "c1_main_total_pct",
    "c2_main_total_pct",
    "c3_main_total_pct",
  ];
  const lines = [headers.join(",")];
  enriched.forEach(({ fields }) => {
    lines.push(
      [
        fields.anonymous_id,
        fields.sequence,
        fields.sequence_type,
        DIRECTION_LABEL[fields.direction] || fields.direction,
        fields.casesAttempted,
        fields.rawAttempts,
        fields.retryCases,
        fields.casesCompleted,
        fields.scoreDataCases,
        fields.c1 === null ? "" : fields.c1,
        fields.c2 === null ? "" : fields.c2,
        fields.c3 === null ? "" : fields.c3,
      ]
        .map(csvCell)
        .join(",")
    );
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "pharmsim_students_filtered.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function csvCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
}

/* ============================================================
   SVG chart helpers
   ============================================================ */

function svgBoxPlot(seriesList, opts = {}) {
  const width = opts.width || 560;
  const height = opts.height || 280;
  const padding = { top: 24, right: 24, bottom: 50, left: 56 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const allValues = seriesList.flatMap((s) => s.values);
  const yMin = opts.yMin !== undefined ? opts.yMin : (allValues.length ? Math.min(...allValues) : 0);
  const yMax = opts.yMax !== undefined ? opts.yMax : (allValues.length ? Math.max(...allValues) : 100);
  const yRange = yMax - yMin || 1;
  const yScale = (v) => padding.top + plotH - ((v - yMin) / yRange) * plotH;

  const groupGap = plotW / seriesList.length;
  const boxWidth = Math.min(70, groupGap * 0.5);

  const gridStep = niceStep(yRange);
  const gridLines = [];
  for (let v = Math.ceil(yMin / gridStep) * gridStep; v <= yMax; v += gridStep) {
    const y = yScale(v);
    gridLines.push(
      `<line x1="${padding.left}" x2="${padding.left + plotW}" y1="${y}" y2="${y}" stroke="${COLORS.line}" />`
    );
    gridLines.push(
      `<text x="${padding.left - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="${COLORS.muted}" font-size="11">${opts.valueFormat ? opts.valueFormat(v) : v}</text>`
    );
  }

  const boxes = seriesList
    .map((series, idx) => {
      const cx = padding.left + groupGap * (idx + 0.5);
      const values = series.values.slice().sort((a, b) => a - b);
      if (!values.length) {
        return `<text x="${cx}" y="${padding.top + plotH / 2}" text-anchor="middle" fill="${COLORS.muted}" font-size="11">No data</text>`;
      }
      const min = values[0];
      const max = values[values.length - 1];
      const q1 = quantile(values, 0.25);
      const med = quantile(values, 0.5);
      const q3 = quantile(values, 0.75);
      const mean = average(values);
      const yMinV = yScale(min);
      const yMaxV = yScale(max);
      const yQ1 = yScale(q1);
      const yMed = yScale(med);
      const yQ3 = yScale(q3);
      const yMean = yScale(mean);
      const dotJitter = (i) => ((i * 9301 + 49297) % 233280) / 233280 - 0.5;
      const dotsHtml = opts.showDots
        ? values
            .map((v, i) => {
              const x = cx + dotJitter(i) * (boxWidth * 0.7);
              return `<circle cx="${x}" cy="${yScale(v)}" r="2.4" fill="${series.color}" opacity="0.45" />`;
            })
            .join("")
        : "";
      const tooltip = `${series.label} — n=${values.length}, mean ${opts.valueFormat ? opts.valueFormat(mean) : mean.toFixed(2)}, median ${opts.valueFormat ? opts.valueFormat(med) : med.toFixed(2)}, Q1 ${opts.valueFormat ? opts.valueFormat(q1) : q1.toFixed(2)}, Q3 ${opts.valueFormat ? opts.valueFormat(q3) : q3.toFixed(2)}, min ${opts.valueFormat ? opts.valueFormat(min) : min.toFixed(2)}, max ${opts.valueFormat ? opts.valueFormat(max) : max.toFixed(2)}`;
      return `
        <g data-tip="${escapeHtml(tooltip)}">
          ${dotsHtml}
          <line x1="${cx}" x2="${cx}" y1="${yMinV}" y2="${yMaxV}" stroke="${series.color}" stroke-width="1.4" />
          <line x1="${cx - boxWidth / 4}" x2="${cx + boxWidth / 4}" y1="${yMinV}" y2="${yMinV}" stroke="${series.color}" stroke-width="1.4" />
          <line x1="${cx - boxWidth / 4}" x2="${cx + boxWidth / 4}" y1="${yMaxV}" y2="${yMaxV}" stroke="${series.color}" stroke-width="1.4" />
          <rect x="${cx - boxWidth / 2}" y="${yQ3}" width="${boxWidth}" height="${yQ1 - yQ3}" fill="${series.color}" fill-opacity="0.18" stroke="${series.color}" stroke-width="1.6" />
          <line x1="${cx - boxWidth / 2}" x2="${cx + boxWidth / 2}" y1="${yMed}" y2="${yMed}" stroke="${series.color}" stroke-width="2.5" />
          <line x1="${cx - boxWidth / 2}" x2="${cx + boxWidth / 2}" y1="${yMean}" y2="${yMean}" stroke="${COLORS.ink}" stroke-width="1" stroke-dasharray="3 2" />
          <text x="${cx}" y="${height - 16}" text-anchor="middle" fill="${COLORS.ink}" font-size="12" font-weight="700">${escapeHtml(series.label)}</text>
          <text x="${cx}" y="${height - 2}" text-anchor="middle" fill="${COLORS.muted}" font-size="11">n=${values.length}</text>
        </g>
      `;
    })
    .join("");

  const zeroLine = opts.showZeroLine
    ? `<line x1="${padding.left}" x2="${padding.left + plotW}" y1="${yScale(0)}" y2="${yScale(0)}" stroke="${COLORS.ink}" stroke-width="1" stroke-dasharray="4 3" />`
    : "";
  const yLabel = opts.yLabel
    ? `<text x="${14}" y="${padding.top + plotH / 2}" transform="rotate(-90 14 ${padding.top + plotH / 2})" text-anchor="middle" fill="${COLORS.muted}" font-size="11">${escapeHtml(opts.yLabel)}</text>`
    : "";

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img">
      ${gridLines.join("")}
      ${zeroLine}
      ${boxes}
      ${yLabel}
    </svg>
  `;
}

function svgSparkline(slotScores, opts = {}) {
  const width = opts.width || 80;
  const height = opts.height || 28;
  const pad = { left: 4, right: 4, top: 4, bottom: 4 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const points = slotScores.filter((s) => s.score !== null);
  if (points.length === 0) return '<span class="muted">—</span>';
  const direction = opts.direction || "insufficient_data";
  const lineColor = DIRECTION_COLOR[direction] || COLORS.muted;
  const xStep = points.length === 1 ? w / 2 : w / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: pad.left + (points.length === 1 ? w / 2 : i * xStep),
    y: pad.top + h - (p.score / 100) * h,
    label: `${p.case} ${formatPct(p.score)}`,
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const dots = coords.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="2.4" fill="${lineColor}" />`).join("");
  const tooltip = points
    .map((p) => `${p.case} ${formatPct(p.score)}`)
    .join(" → ");
  return `
    <svg viewBox="0 0 ${width} ${height}" class="sparkline" data-tip="${escapeHtml(tooltip)}" preserveAspectRatio="xMidYMid meet">
      <line x1="${pad.left}" x2="${width - pad.right}" y1="${pad.top + h - (50 / 100) * h}" y2="${pad.top + h - (50 / 100) * h}" stroke="${COLORS.line}" stroke-dasharray="2 2" />
      ${points.length > 1 ? `<path d="${path}" fill="none" stroke="${lineColor}" stroke-width="1.6" />` : ""}
      ${dots}
    </svg>
  `;
}

function svgStackedBars(data, opts = {}) {
  const width = opts.width || 560;
  const height = opts.height || 220;
  const padding = { top: 12, right: 24, bottom: 40, left: 44 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  if (!data.length) return '<div class="muted">No timestamped attempts.</div>';
  const max = Math.max(...data.map((d) => d.total));
  const yMax = Math.max(1, Math.ceil(max / 5) * 5);
  const barW = Math.max(4, (plotW / data.length) * 0.7);
  const colStep = plotW / data.length;
  const yScale = (v) => padding.top + plotH - (v / yMax) * plotH;

  const yStep = niceStep(yMax);
  const gridLines = [];
  for (let v = 0; v <= yMax; v += yStep) {
    gridLines.push(`<line x1="${padding.left}" x2="${padding.left + plotW}" y1="${yScale(v)}" y2="${yScale(v)}" stroke="${COLORS.line}" />`);
    gridLines.push(`<text x="${padding.left - 8}" y="${yScale(v)}" text-anchor="end" dominant-baseline="middle" fill="${COLORS.muted}" font-size="11">${v}</text>`);
  }

  const bars = data
    .map((d, i) => {
      const cx = padding.left + colStep * (i + 0.5);
      let acc = 0;
      const segments = opts.keys
        .map((k) => {
          const v = d[k] || 0;
          if (!v) return "";
          const y1 = yScale(acc + v);
          const y2 = yScale(acc);
          acc += v;
          const tooltip = `${d.date} — ${k}: ${v} attempt${v === 1 ? "" : "s"}`;
          return `<rect x="${cx - barW / 2}" y="${y1}" width="${barW}" height="${y2 - y1}" fill="${opts.colors[k]}" data-tip="${escapeHtml(tooltip)}" />`;
        })
        .join("");
      const tickLabel = i % Math.ceil(data.length / 10 || 1) === 0
        ? `<text x="${cx}" y="${padding.top + plotH + 16}" text-anchor="middle" fill="${COLORS.muted}" font-size="10" transform="rotate(-30 ${cx} ${padding.top + plotH + 16})">${escapeHtml(d.date)}</text>`
        : "";
      return segments + tickLabel;
    })
    .join("");

  const legend = opts.keys
    .map((k) => `<span class="scatter-legend-item"><span class="dot" style="background:${opts.colors[k]}"></span>${CASE_NAMES[k] || k}</span>`)
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img">
      ${gridLines.join("")}
      ${bars}
    </svg>
    <div class="scatter-legend">${legend}</div>
  `;
}

/* ============================================================
   UI helpers (cards, tables, formatting)
   ============================================================ */

function fillSelect(id, allLabel, values, formatter) {
  document.getElementById(id).innerHTML = [
    `<option value="">${escapeHtml(allLabel)}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(formatter ? formatter(value) : value)}</option>`),
  ].join("");
}

function studentWordsPerTurn(row) {
  const words = toNumber(row.retained_student_words);
  const turns = toNumber(row.retained_student_turns);
  if (words === null || turns === null || turns <= 0) return null;
  return words / turns;
}

function summaryStat(values, unit = "") {
  const numeric = values.filter((value) => value !== null && !Number.isNaN(value));
  if (!numeric.length) return "";
  const mean = average(numeric);
  const sd = stdev(numeric);
  const med = median(numeric);
  const q1 = quantile(numeric, 0.25);
  const q3 = quantile(numeric, 0.75);
  return `
    <div class="summary-stat">
      <strong>${formatValue(med, unit)} (${formatValue(q1, unit)} to ${formatValue(q3, unit)})</strong>
      <span>mean ${formatValue(mean, unit)} ± ${sd === null ? "NA" : formatValue(sd, unit)}</span>
    </div>
  `;
}

function renderTimingTable(timeline) {
  const totalStarts = timeline.reduce((sum, day) => sum + day.total, 0) || 1;
  const maxCaseCount = Math.max(...timeline.flatMap((day) => CASES.map((caseShort) => day[caseShort] || 0)), 1);
  const caseTotals = Object.fromEntries(CASES.map((caseShort) => [
    caseShort,
    timeline.reduce((sum, day) => sum + (day[caseShort] || 0), 0),
  ]));
  const rows = timeline.map((day) => `
    <tr>
      <td>${escapeHtml(day.date)}</td>
      ${CASES.map((caseShort) => countHeatCell(day[caseShort] || 0, maxCaseCount, CASE_COLORS[caseShort])).join("")}
      <td class="number"><strong>${day.total}</strong></td>
      <td class="number">${formatPct((day.total / totalStarts) * 100)}</td>
    </tr>
  `);
  rows.push(`
    <tr class="total-row">
      <td>Total</td>
      ${CASES.map((caseShort) => `<td class="number">${caseTotals[caseShort]}</td>`).join("")}
      <td class="number"><strong>${totalStarts}</strong></td>
      <td class="number">100.0%</td>
    </tr>
  `);
  document.getElementById("attemptTimingTable").innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Case 1 starts</th>
        <th>Case 2 starts</th>
        <th>Case 3 starts</th>
        <th>Total starts</th>
        <th>Share</th>
      </tr>
    </thead>
    <tbody>${rows.join("")}</tbody>
  `;
}

function countHeatCell(value, maxValue, color) {
  const alpha = value ? 0.12 + Math.min(0.48, (value / maxValue) * 0.48) : 0;
  return `<td class="number count-heat" style="background:${hexToRgba(color, alpha)}">${value || ""}</td>`;
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

function fieldStats(caseShort, field) {
  const rows = appState.performance.filter(
    (row) => row.case_short === caseShort && isTrue(row.performance_eligible)
  );
  const values = rows.map((row) => toNumber(row[field])).filter((value) => value !== null);
  return { value: average(values), n: values.length };
}

function renderHeatmapTable(id, headers, rows, includeGroup = false) {
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rowHtml = rows
    .map((row) => {
      const labelCells = includeGroup
        ? `<td class="rubric-group">${escapeHtml(row.group)}</td><td>${escapeHtml(row.label)}</td>`
        : `<td>${escapeHtml(row.label)}</td>`;
      const valueCells = row.cells.map((cell) => heatmapValueCell(cell.value, cell.n)).join("");
      return `<tr>${labelCells}${valueCells}</tr>`;
    })
    .join("");
  document.getElementById(id).innerHTML = `
    <div class="table-wrap">
      <table class="heat-table">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowHtml}</tbody>
      </table>
    </div>
    <div class="heat-legend">
      <span>Color scale</span>
      <span class="legend-cell" style="background:#f1dfe3">&lt;55%</span>
      <span class="legend-cell" style="background:#f4ead3">55-64%</span>
      <span class="legend-cell" style="background:#e8efd9">65-74%</span>
      <span class="legend-cell" style="background:#dcebd7">75%+</span>
    </div>
  `;
}

function heatmapValueCell(value, n) {
  if (!n || value === null || Number.isNaN(value)) {
    return '<td class="heat-table-cell empty">—</td>';
  }
  return `
    <td class="heat-table-cell" style="background:${heatColor(value)}">
      <div class="heat-value">${formatPct(value)}</div>
      <div class="heat-n">n=${n}</div>
    </td>
  `;
}

function renderTable(id, headers, rows, allowHtml = false) {
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rowHtml = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => {
            const content = allowHtml ? cell : escapeHtml(String(cell));
            const cls = /^\d/.test(stripTags(String(cell))) || String(cell).endsWith("%") ? "number" : "";
            return `<td class="${cls}">${content}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");
  document.getElementById(id).innerHTML = `<thead><tr>${headerHtml}</tr></thead><tbody>${rowHtml}</tbody>`;
}

function metricCard(label, value, note) {
  return `
    <div class="metric-card">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(String(value))}</div>
      <div class="metric-note">${escapeHtml(note)}</div>
    </div>
  `;
}

function barRow(label, value, maxValue, valueText, color, tooltip) {
  const width = maxValue > 0 ? Math.max(0, Math.min(100, (value / maxValue) * 100)) : 0;
  const tipAttr = tooltip ? ` data-tip="${escapeHtml(tooltip)}"` : "";
  return `
    <div class="bar-row"${tipAttr}>
      <div class="bar-label">${escapeHtml(label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${width}%; background:${color};"></div></div>
      <div class="bar-value">${valueText}</div>
    </div>
  `;
}

function rateCell(count, denominator) {
  const rate = denominator ? (count / denominator) * 100 : 0;
  return `${count} / ${denominator} (${formatPct(rate)})`;
}

function numberCell(value) {
  return String(value ?? "");
}

function badge(value) {
  const clean = value || "unknown";
  const cls = clean.includes("improving") || clean.includes("1_2_3")
    ? "good"
    : clean.includes("declining")
      ? "warn"
      : clean.includes("insufficient")
        ? "neutral"
        : clean.includes("mixed") || clean.includes("nonascending")
          ? "mixed"
          : "neutral";
  const label = DIRECTION_LABEL[clean] || SEQUENCE_LABEL[clean] || clean.replaceAll("_", " ");
  return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
}

function heatColor(value) {
  if (value === null || Number.isNaN(value)) return "#f0f1ee";
  const pct = Math.max(0, Math.min(100, value));
  if (pct >= 75) return "#dcebd7";
  if (pct >= 65) return "#e8efd9";
  if (pct >= 55) return "#f4ead3";
  return "#f1dfe3";
}

function isTrue(value) {
  return String(value).trim().toUpperCase() === "TRUE";
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
}

function countWhere(rows, predicate) {
  return rows.filter(predicate).length;
}

function average(values) {
  const numeric = values.filter((value) => value !== null && !Number.isNaN(value));
  if (!numeric.length) return null;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function median(values) {
  return quantile(values.filter((value) => value !== null), 0.5);
}

function stdev(values) {
  const numeric = values.filter((value) => value !== null && !Number.isNaN(value));
  if (numeric.length < 2) return null;
  const m = average(numeric);
  return Math.sqrt(numeric.reduce((s, v) => s + (v - m) ** 2, 0) / (numeric.length - 1));
}

function quantile(values, q) {
  const numeric = values.filter((value) => value !== null && !Number.isNaN(value)).sort((a, b) => a - b);
  if (!numeric.length) return null;
  const index = (numeric.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return numeric[lower];
  return numeric[lower] + (numeric[upper] - numeric[lower]) * (index - lower);
}

function niceStep(range) {
  if (range <= 0) return 1;
  const target = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  const norm = target / mag;
  let step;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
}

function medianIqr(values, unit = "", signed = false) {
  const numeric = values.filter((value) => value !== null && !Number.isNaN(value));
  if (!numeric.length) return "";
  const med = quantile(numeric, 0.5);
  const q1 = quantile(numeric, 0.25);
  const q3 = quantile(numeric, 0.75);
  const fmt = signed ? formatSigned : (value) => formatValue(value, unit);
  return `${fmt(med)} (${fmt(q1)} to ${fmt(q3)})`;
}

function formatValue(value, unit = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  if (unit === "%") return formatPct(value);
  if (unit === "pp") return `${Number(value).toFixed(1)} pp`;
  if (unit === "min") return `${Number(value).toFixed(1)} min`;
  return Math.abs(value) >= 100 ? String(Math.round(value)) : Number(value).toFixed(1);
}

function formatSigned(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(1)} pp`;
}

function formatPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return `${Number(value).toFixed(1)}%`;
}

function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, "");
}

/* ============================================================
   Tooltip
   ============================================================ */

function ensureTooltip() {
  const tip = document.createElement("div");
  tip.className = "dashboard-tooltip";
  tip.style.display = "none";
  document.body.appendChild(tip);
  appState.tooltip = tip;
  document.addEventListener("mousemove", (event) => {
    if (tip.style.display === "block") {
      tip.style.left = `${event.clientX + 14}px`;
      tip.style.top = `${event.clientY + 14}px`;
    }
  });
  document.addEventListener("mouseover", (event) => {
    const target = event.target.closest("[data-tip]");
    if (!target) return;
    tip.textContent = target.getAttribute("data-tip");
    tip.style.display = "block";
  });
  document.addEventListener("mouseout", (event) => {
    const related = event.relatedTarget;
    if (related && related.closest && related.closest("[data-tip]")) return;
    tip.style.display = "none";
  });
}

function attachTooltips() {
  // Tooltip uses event delegation, but call exists for clarity / future use.
}
