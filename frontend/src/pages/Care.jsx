import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import { EmptyState, Spinner, ListSkeleton, Banner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import BottomNavBar from '../components/BottomNavBar';
import { useAuth } from '../auth/AuthContext';
import { careApi } from '../api/endpoints';
import { formatDateTime, errorMessage } from '../utils/format';

const TYPE_META = {
  MEDICATION: { emoji: '💊', label: 'Medication' },
  APPOINTMENT: { emoji: '🏥', label: 'Appointment' },
  GENERAL: { emoji: '🔔', label: 'General' },
};
const CADENCE_LABEL = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly' };

const toList = (data) => (Array.isArray(data) ? data : data?.content || []);

/** Current time formatted for a datetime-local `min` attribute. */
const nowLocalInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function Care() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isElder = user?.role === 'ELDER';

  const [tab, setTab] = useState('reminders');
  const [reminders, setReminders] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sheet, setSheet] = useState(null); // 'reminder' | 'plan' | null
  const [rForm, setRForm] = useState({ type: 'MEDICATION', message: '', when: '' });
  const [pForm, setPForm] = useState({ title: '', cadence: 'DAILY', when: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [toPause, setToPause] = useState(null);
  const [acting, setActing] = useState(false);

  const fetchAll = useCallback(
    () => Promise.all([careApi.listReminders({ size: 100, sort: 'remindAt,asc' }), careApi.listPlans()]),
    []
  );

  const reload = useCallback(async () => {
    try {
      const [r, p] = await fetchAll();
      setReminders(toList(r));
      setPlans(toList(p));
    } catch (err) {
      toast(errorMessage(err, 'Could not refresh.'), 'error');
    }
  }, [fetchAll, toast]);

  const initialLoad = useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchAll()
      .then(([r, p]) => {
        if (!active) return;
        setReminders(toList(r));
        setPlans(toList(p));
      })
      .catch((err) => active && setError(errorMessage(err, 'Could not load your care schedule.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fetchAll]);

  useEffect(() => {
    if (authLoading || !isElder) return undefined;
    return initialLoad();
  }, [authLoading, isElder, initialLoad]);

  const { upcoming, done } = useMemo(
    () => ({
      // Soonest first for what's coming up; most recent first for what's done.
      upcoming: reminders.filter((r) => !r.sent).sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt)),
      done: reminders.filter((r) => r.sent).sort((a, b) => new Date(b.remindAt) - new Date(a.remindAt)),
    }),
    [reminders]
  );

  const openSheet = (kind) => {
    setFormError('');
    setSheet(kind);
  };

  const submitReminder = async (e) => {
    e.preventDefault();
    if (!rForm.message.trim()) return setFormError('Please describe the reminder.');
    if (!rForm.when) return setFormError('Please choose a date and time.');
    setFormError('');
    setSaving(true);
    try {
      await careApi.createReminder({
        type: rForm.type,
        message: rForm.message.trim(),
        remindAt: new Date(rForm.when).toISOString(),
      });
      toast('Reminder added', 'success');
      setSheet(null);
      setRForm({ type: 'MEDICATION', message: '', when: '' });
      await reload();
    } catch (err) {
      toast(errorMessage(err, 'Could not add reminder.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitPlan = async (e) => {
    e.preventDefault();
    if (!pForm.title.trim()) return setFormError('Please give the plan a title.');
    if (!pForm.when) return setFormError('Please choose when it should first run.');
    setFormError('');
    setSaving(true);
    try {
      await careApi.createPlan({
        title: pForm.title.trim(),
        cadence: pForm.cadence,
        firstRunAt: new Date(pForm.when).toISOString(),
      });
      toast('Care plan created', 'success');
      setSheet(null);
      setPForm({ title: '', cadence: 'DAILY', when: '' });
      await reload();
    } catch (err) {
      toast(errorMessage(err, 'Could not create care plan.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteReminder = async () => {
    setActing(true);
    try {
      await careApi.removeReminder(toDelete.id);
      toast('Reminder deleted', 'success');
      setToDelete(null);
      await reload();
    } catch (err) {
      toast(errorMessage(err, 'Could not delete reminder.'), 'error');
    } finally {
      setActing(false);
    }
  };

  const pausePlan = async () => {
    setActing(true);
    try {
      await careApi.deactivatePlan(toPause.id);
      toast('Care plan paused', 'success');
      setToPause(null);
      await reload();
    } catch (err) {
      toast(errorMessage(err, 'Could not pause care plan.'), 'error');
    } finally {
      setActing(false);
    }
  };

  const reminderRow = (r) => {
    const meta = TYPE_META[r.type] || TYPE_META.GENERAL;
    return (
      <div key={r.id} className="ui-item" style={{ cursor: 'default', opacity: r.sent ? 0.65 : 1 }}>
        <span style={{ fontSize: 28 }} aria-hidden="true">{meta.emoji}</span>
        <div className="ui-grow">
          <div className="ui-item-title">{r.message}</div>
          <div className="ui-item-sub">{meta.label} · {formatDateTime(r.remindAt)}</div>
        </div>
        <span className={`ui-chip ${r.sent ? '' : 'warn'}`}>{r.sent ? 'Sent' : 'Upcoming'}</span>
        <button
          type="button"
          className="ui-btn ui-btn-ghost"
          style={{ minWidth: 44, minHeight: 44 }}
          aria-label={`Delete reminder ${r.message}`}
          onClick={() => setToDelete(r)}
        >
          🗑️
        </button>
      </div>
    );
  };

  const remindersTab = () => (
    <>
      <button type="button" className="ui-btn ui-btn-primary ui-btn-block ui-btn-lg" onClick={() => openSheet('reminder')}>
        ➕ New reminder
      </button>
      {reminders.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState
            icon="⏰"
            title="No reminders yet"
            text="Never miss your medicines or a doctor's visit. Add your first reminder."
            action={
              <button type="button" className="ui-btn ui-btn-primary" onClick={() => openSheet('reminder')}>
                ➕ Add a reminder
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="ui-section-title">Upcoming</div>
          {upcoming.length === 0 ? (
            <p className="ui-muted">Nothing coming up. 🎉</p>
          ) : (
            <div className="ui-list">{upcoming.map(reminderRow)}</div>
          )}
          {done.length > 0 && (
            <>
              <div className="ui-section-title">Done</div>
              <div className="ui-list">{done.map(reminderRow)}</div>
            </>
          )}
        </>
      )}
    </>
  );

  const plansTab = () => (
    <>
      <Banner type="info" icon="🗓️">Care plans repeat automatically and notify you each time they are due.</Banner>
      <button type="button" className="ui-btn ui-btn-primary ui-btn-block ui-btn-lg" onClick={() => openSheet('plan')}>
        ➕ New care plan
      </button>
      {plans.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState
            icon="🗓️"
            title="No care plans yet"
            text="Set up a daily walk, weekly check-up or monthly refill once and we'll remind you."
            action={
              <button type="button" className="ui-btn ui-btn-primary" onClick={() => openSheet('plan')}>
                ➕ Create a plan
              </button>
            }
          />
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          {plans.map((p) => (
            <div key={p.id} className="ui-card" style={{ opacity: p.active ? 1 : 0.6 }}>
              <div className="ui-row ui-between">
                <div className="ui-card-title" style={{ margin: 0 }}>{p.title}</div>
                <div className="ui-row" style={{ gap: 6 }}>
                  {!p.active && <span className="ui-chip">Paused</span>}
                  <span className="ui-chip info">{CADENCE_LABEL[p.cadence] || p.cadence}</span>
                </div>
              </div>
              {p.active ? (
                <>
                  <p className="ui-muted" style={{ margin: '8px 0 0' }}>Next: {formatDateTime(p.nextRunAt)}</p>
                  <button
                    type="button"
                    className="ui-btn ui-btn-secondary ui-btn-sm"
                    style={{ marginTop: 10, minHeight: 44 }}
                    onClick={() => setToPause(p)}
                  >
                    ⏸️ Pause
                  </button>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderBody = () => {
    if (authLoading || loading) return <ListSkeleton rows={4} />;
    if (!isElder) {
      return <EmptyState icon="🛡️" title="Care tools are for elders" text="Reminders and care plans are available on elder accounts." />;
    }
    if (error) {
      return (
        <Banner type="error">
          <div>{error}</div>
          <button type="button" className="ui-btn ui-btn-sm" style={{ marginTop: 8 }} onClick={initialLoad}>
            Try again
          </button>
        </Banner>
      );
    }
    return (
      <>
        <div className="ui-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'reminders'} className={`ui-tab ${tab === 'reminders' ? 'active' : ''}`} onClick={() => setTab('reminders')}>
            ⏰ Reminders
          </button>
          <button type="button" role="tab" aria-selected={tab === 'plans'} className={`ui-tab ${tab === 'plans' ? 'active' : ''}`} onClick={() => setTab('plans')}>
            🗓️ Care plans
          </button>
        </div>
        {tab === 'reminders' ? remindersTab() : plansTab()}
      </>
    );
  };

  const closeSheet = () => !saving && setSheet(null);

  return (
    <div className="ui-page">
      <PageHeader title="Care & Reminders" subtitle="Stay on top of your day" />
      <div className="ui-container">{renderBody()}</div>

      {sheet === 'reminder' && (
        <div className="ui-modal-overlay" role="dialog" aria-modal="true" onClick={closeSheet}>
          <form className="ui-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitReminder} noValidate>
            <h3>New reminder</h3>
            <div className="ui-field">
              <span className="ui-label">Type</span>
              <div className="ui-segment">
                {Object.entries(TYPE_META).map(([key, m]) => (
                  <button
                    key={key}
                    type="button"
                    className={rForm.type === key ? 'active' : ''}
                    onClick={() => setRForm({ ...rForm, type: key })}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="care-msg">What should we remind you about?</label>
              <input
                id="care-msg"
                className="ui-input"
                value={rForm.message}
                maxLength={200}
                onChange={(e) => setRForm({ ...rForm, message: e.target.value })}
                placeholder="e.g. Take blood pressure tablet"
              />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="care-when">When</label>
              <input
                id="care-when"
                className="ui-input"
                type="datetime-local"
                min={nowLocalInput()}
                value={rForm.when}
                onChange={(e) => setRForm({ ...rForm, when: e.target.value })}
              />
            </div>
            {formError ? <div className="ui-error-text" role="alert">{formError}</div> : null}
            <div className="ui-btn-group" style={{ marginTop: 14 }}>
              <button type="button" className="ui-btn" onClick={closeSheet} disabled={saving}>Cancel</button>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
                {saving ? <Spinner /> : null} Save reminder
              </button>
            </div>
          </form>
        </div>
      )}

      {sheet === 'plan' && (
        <div className="ui-modal-overlay" role="dialog" aria-modal="true" onClick={closeSheet}>
          <form className="ui-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitPlan} noValidate>
            <h3>New care plan</h3>
            <div className="ui-field">
              <label className="ui-label" htmlFor="plan-title">Title</label>
              <input
                id="plan-title"
                className="ui-input"
                value={pForm.title}
                maxLength={120}
                onChange={(e) => setPForm({ ...pForm, title: e.target.value })}
                placeholder="e.g. Morning walk"
              />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="plan-cadence">Repeats</label>
              <select
                id="plan-cadence"
                className="ui-select"
                value={pForm.cadence}
                onChange={(e) => setPForm({ ...pForm, cadence: e.target.value })}
              >
                {Object.entries(CADENCE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="plan-when">First run</label>
              <input
                id="plan-when"
                className="ui-input"
                type="datetime-local"
                min={nowLocalInput()}
                value={pForm.when}
                onChange={(e) => setPForm({ ...pForm, when: e.target.value })}
              />
            </div>
            {formError ? <div className="ui-error-text" role="alert">{formError}</div> : null}
            <div className="ui-btn-group" style={{ marginTop: 14 }}>
              <button type="button" className="ui-btn" onClick={closeSheet} disabled={saving}>Cancel</button>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
                {saving ? <Spinner /> : null} Create plan
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={!!toDelete}
        danger
        busy={acting}
        title="Delete reminder?"
        text={toDelete ? `“${toDelete.message}” will be removed.` : ''}
        confirmLabel="Delete"
        onConfirm={deleteReminder}
        onCancel={() => !acting && setToDelete(null)}
      />
      <ConfirmModal
        open={!!toPause}
        busy={acting}
        title="Pause care plan?"
        text={toPause ? `“${toPause.title}” will stop repeating and notifying you.` : ''}
        confirmLabel="Pause"
        onConfirm={pausePlan}
        onCancel={() => !acting && setToPause(null)}
      />
      <BottomNavBar />
    </div>
  );
}
