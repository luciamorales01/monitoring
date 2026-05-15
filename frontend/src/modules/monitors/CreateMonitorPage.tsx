import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createMonitor,
  type CreateMonitorInput,
  type MonitorType,
} from '../../shared/monitorApi';
import {
  inputBase,
  pageMain,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from '../../theme/commonStyles';
import AppTopbar from '../../shared/AppTopbar';
import LoadingState from '../../shared/LoadingState';
import {
  ActivityIcon,
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeIcon,
  MonitorIcon,
} from '../../shared/uiIcons';

type WizardStep = 1 | 2 | 3 | 4;

type MonitorKindConfig = {
  label: string;
  shortLabel: string;
  targetLabel: string;
  targetPlaceholder: string;
  helper: string;
};

const monitorTypeConfig: Record<MonitorType, MonitorKindConfig> = {
  HTTPS: {
    label: 'HTTP(s)',
    shortLabel: 'HTTP(s)',
    targetLabel: 'URL o endpoint',
    targetPlaceholder: 'https://tienda.ejemplo.com',
    helper: 'Comprueba código HTTP y latencia.',
  },
  HTTP: {
    label: 'HTTP',
    shortLabel: 'HTTP',
    targetLabel: 'URL HTTP',
    targetPlaceholder: 'http://servicio.ejemplo.com/health',
    helper: 'Comprueba endpoints HTTP sin certificado TLS.',
  },
};

const stepItems = [
  { step: 1 as WizardStep, title: 'General', text: 'Tipo y destino' },
  { step: 2 as WizardStep, title: 'Validación', text: 'Reglas del check' },
  { step: 3 as WizardStep, title: 'Alertas', text: 'Canales y avisos' },
  { step: 4 as WizardStep, title: 'Revisión', text: 'Confirmar monitor' },
] as const;


const defaultForm: CreateMonitorInput = {
  name: '',
  type: 'HTTPS',
  target: '',
  expectedStatusCode: 200,
  frequencySeconds: 60,
  timeoutSeconds: 10,
  alertEmail: true,
  alertThreshold: 3,
};

export default function CreateMonitorPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<CreateMonitorInput>(defaultForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeConfig = monitorTypeConfig[form.type];
  const previewName = form.name.trim() || 'Monitor ejemplo';
  const previewTarget = form.target.trim() || typeConfig.targetPlaceholder;

  const frequencyLabel = useMemo(() => {
    if (form.frequencySeconds < 60) return `Cada ${form.frequencySeconds} segundos`;
    const minutes = Math.round(form.frequencySeconds / 60);
    return `Cada ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }, [form.frequencySeconds]);

  const alertLabel = form.alertEmail
    ? `Email tras ${form.alertThreshold} fallo${form.alertThreshold === 1 ? '' : 's'}`
    : 'Sin alertas';

  const updateForm = <K extends keyof CreateMonitorInput>(field: K, value: CreateMonitorInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleTypeChange = (type: MonitorType) => {
    setForm((current) => ({
      ...current,
      type,
      expectedStatusCode: current.expectedStatusCode || 200,
    }));
  };

  const validateStep = (step: WizardStep) => {
    if (step === 1) {
      if (!form.name.trim()) return 'Indica un nombre para el monitor.';
      if (!form.target.trim()) return `Indica ${typeConfig.targetLabel.toLowerCase()}.`;
    }

    if (step === 2) {
      if (!Number.isFinite(form.frequencySeconds) || form.frequencySeconds < 30) return 'La frecuencia mínima es 30 segundos.';
      if (!Number.isFinite(form.timeoutSeconds) || form.timeoutSeconds < 1) return 'El timeout mínimo es 1 segundo.';

      if (!Number.isFinite(form.expectedStatusCode) || form.expectedStatusCode < 100 || form.expectedStatusCode > 599) {
        return 'El codigo esperado debe estar entre 100 y 599.';
      }
    }

    if (step === 3) {
      if (!Number.isInteger(form.alertThreshold) || form.alertThreshold < 1) return 'El umbral mínimo es 1 fallo.';
    }

    return '';
  };

  const goToStep = (nextStep: WizardStep) => {
    if (nextStep <= currentStep) {
      setError('');
      setCurrentStep(nextStep);
      return;
    }

    for (let step = 1; step < nextStep; step += 1) {
      const stepError = validateStep(step as WizardStep);
      if (stepError) {
        setError(stepError);
        setCurrentStep(step as WizardStep);
        return;
      }
    }

    setError('');
    setCurrentStep(nextStep);
  };

  const buildPayload = (): CreateMonitorInput => ({
    ...form,
    name: form.name.trim(),
    target: form.target.trim(),
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (currentStep < 4) {
      goToStep((currentStep + 1) as WizardStep);
      return;
    }

    const finalError = validateStep(1) || validateStep(2) || validateStep(3);
    if (finalError) {
      setError(finalError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await createMonitor(buildPayload());
      navigate('/monitors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el monitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <>
          <div style={styles.typeGrid}>
            {(Object.keys(monitorTypeConfig) as MonitorType[]).map((type) => (
              <button
                key={type}
                type="button"
                style={form.type === type ? styles.typeCardActive : styles.typeCard}
                onClick={() => handleTypeChange(type)}
              >
                <strong>{monitorTypeConfig[type].label}</strong>
                <span>{monitorTypeConfig[type].helper}</span>
              </button>
            ))}
          </div>

          <div style={styles.formGrid}>
            <Field label="Nombre del monitor" helper="Nombre visible en dashboard, informes y status page." required>
              <input style={styles.input} value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="API Producción" />
            </Field>

            <Field label={typeConfig.targetLabel} helper={typeConfig.helper} required>
              <input style={styles.input} value={form.target} onChange={(event) => updateForm('target', event.target.value)} placeholder={typeConfig.targetPlaceholder} />
            </Field>
          </div>
        </>
      );
    }

    if (currentStep === 2) {
      return (
        <>
          <div style={styles.formGrid}>
            <Field label="Frecuencia (s)" helper="Cada cuánto se ejecutará el check." required>
              <input min={30} type="number" style={styles.input} value={form.frequencySeconds} onChange={(event) => updateForm('frequencySeconds', Number(event.target.value))} />
            </Field>

            <Field label="Timeout (s)" helper="Tiempo máximo antes de marcar fallo." required>
              <input min={1} max={60} type="number" style={styles.input} value={form.timeoutSeconds} onChange={(event) => updateForm('timeoutSeconds', Number(event.target.value))} />
            </Field>

            <Field label="Codigo esperado" helper="Codigo HTTP considerado correcto." required>
              <input min={100} max={599} type="number" style={styles.input} value={form.expectedStatusCode} onChange={(event) => updateForm('expectedStatusCode', Number(event.target.value))} />
            </Field>


          </div>
        </>
      );
    }

    if (currentStep === 3) {
      return (
        <>
          <section style={styles.sectionBlock}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Alertas</h3>
              <p style={styles.sectionCopy}>Configura canales y umbral de fallos consecutivos.</p>
            </div>
            <div style={styles.alertGrid}>
              <label style={styles.toggleRowCard}>
                <input type="checkbox" checked={form.alertEmail} onChange={(event) => updateForm('alertEmail', event.target.checked)} />
                <div><strong style={styles.toggleTitle}>Email</strong><p style={styles.toggleText}>Aviso por correo cuando falle el monitor.</p></div>
              </label>
            </div>
            <Field label="Umbral de fallos consecutivos" helper="Número de fallos antes de crear incidencia.">
              <input min={1} max={20} type="number" style={styles.input} value={form.alertThreshold} onChange={(event) => updateForm('alertThreshold', Number(event.target.value))} />
            </Field>
          </section>
        </>
      );
    }

    return (
      <div style={styles.reviewLayout}>
        <section style={styles.reviewCard}>
          <h3 style={styles.reviewTitle}>Resumen</h3>
          <div style={styles.reviewList}>
            <ReviewRow label="Nombre" value={previewName} />
            <ReviewRow label="Tipo" value={typeConfig.label} />
            <ReviewRow label="Destino" value={previewTarget} />
            <ReviewRow label="Frecuencia" value={frequencyLabel} />
            <ReviewRow label="Timeout" value={`${form.timeoutSeconds}s`} />
          </div>
        </section>
        <section style={styles.reviewCard}>
          <h3 style={styles.reviewTitle}>Validacion</h3>
          <div style={styles.reviewList}>
            <ReviewRow label="HTTP esperado" value={String(form.expectedStatusCode)} />
            <ReviewRow label="Alertas" value={alertLabel} />
          </div>
        </section>
      </div>
    );
  };

  return (
    <main style={styles.main}>
      <AppTopbar
        title="Crear nuevo monitor"
        subtitle="Configura monitores HTTP y HTTPS desde la interfaz."
        onRefresh={() => undefined}
        eyebrow={<><span>Webs monitorizadas</span><span>&gt;</span><strong>Crear monitor</strong></>}
      />

      <section style={styles.steps}>
        {stepItems.map((item) => (
          <Step key={item.step} number={String(item.step)} title={item.title} text={item.text} active={item.step === currentStep} completed={item.step < currentStep} onClick={() => goToStep(item.step)} />
        ))}
      </section>

      <section style={styles.layout}>
        <form id="create-monitor-form" onSubmit={handleSubmit} style={styles.formCard}>
          {error && <div style={styles.errorBanner}><strong>Revisa este paso</strong><p>{error}</p></div>}
          <div style={styles.formHeader}>
            <div><span style={styles.stepBadge}>Paso {currentStep} de 4</span><h2 style={styles.cardTitle}>{stepItems[currentStep - 1].title}</h2></div>
            <p style={styles.cardDescription}>{typeConfig.helper}</p>
          </div>
          {renderStepContent()}
        </form>

        <aside style={styles.sidePanel}>
          <section style={styles.previewCard}>
            <h2 style={styles.cardTitle}>Vista previa</h2>
            <div style={styles.previewHeader}>
              <div style={styles.previewIcon}><GlobeIcon size={34} /></div>
              <div><span style={styles.typeBadge}>{typeConfig.shortLabel}</span><h3 style={styles.previewTitle}>{previewName}</h3><p style={styles.previewUrl}>{previewTarget}</p></div>
            </div>
            <div style={styles.previewList}>
              <InfoRow icon={<MonitorIcon size={15} />} label="Tipo" value={typeConfig.label} />
              <InfoRow icon={<ActivityIcon size={15} />} label="Validación" value={getValidationSummary(form)} />
              <InfoRow icon={<ClockIcon size={15} />} label="Frecuencia" value={frequencyLabel} />
              <InfoRow icon={<BellIcon size={15} />} label="Alertas" value={alertLabel} />
              <InfoRow icon={<CheckCircleIcon size={15} />} label="Estado" value="Activo al crear" highlighted />
            </div>
          </section>
        </aside>
      </section>

      <footer style={styles.footerBar}>
        <div style={styles.footerInfo}><span>ⓘ</span> {stepItems[currentStep - 1].text}</div>
        <div style={styles.footerActions}>
          <button type="button" style={styles.cancelButton} onClick={() => navigate('/monitors')} disabled={isSubmitting}>Cancelar</button>
          {currentStep > 1 && <button type="button" style={styles.secondaryButton} onClick={() => goToStep((currentStep - 1) as WizardStep)} disabled={isSubmitting}>Anterior</button>}
          <button type="submit" form="create-monitor-form" style={styles.primaryButton} disabled={isSubmitting}>
            {currentStep === 4 && isSubmitting ? <LoadingState variant="button" label="Creando monitor" /> : currentStep === 4 ? 'Crear monitor' : 'Siguiente'}
            {currentStep < 4 && <span>→</span>}
          </button>
        </div>
      </footer>
    </main>
  );
}

function getValidationSummary(form: CreateMonitorInput) {
  return `HTTP ${form.expectedStatusCode}`;
}

function Step({ number, title, text, active, completed, onClick }: { number: string; title: string; text: string; active?: boolean; completed?: boolean; onClick: () => void }) {
  return <button type="button" style={styles.stepButton} onClick={onClick}><div style={styles.step}><span style={active ? styles.stepCircleActive : completed ? styles.stepCircleDone : styles.stepCircle}>{number}</span><div><strong style={active || completed ? styles.stepTitleActive : styles.stepTitle}>{title}</strong><p style={styles.stepText}>{text}</p></div></div></button>;
}

function Field({ label, helper, required, children }: { label: string; helper: string; required?: boolean; children: React.ReactNode }) {
  return <label style={styles.field}><span style={styles.labelText}>{label} {required && <b>*</b>}</span>{children}<span style={styles.helper}>{helper}</span></label>;
}

function InfoRow({ icon, label, value, highlighted }: { icon: React.ReactNode; label: string; value: string; highlighted?: boolean }) {
  return <div style={styles.infoRow}><span style={styles.infoIcon}>{icon}</span><span>{label}</span><strong style={highlighted ? styles.highlightValue : undefined}>{value}</strong></div>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div style={styles.reviewRow}><span>{label}</span><strong>{value}</strong></div>;
}

const styles: Record<string, CSSProperties> = {
  main: { ...pageMain, overflow: 'auto', paddingBottom: 100 },
  primaryButton: { ...primaryButtonBase, minHeight: 40, padding: '0 18px', borderRadius: uiTheme.radii.sm, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 },
  cancelButton: { ...secondaryButtonBase, minHeight: 40, padding: '0 18px', borderRadius: uiTheme.radii.sm, cursor: 'pointer', fontWeight: 600 },
  secondaryButton: { ...secondaryButtonBase, minHeight: 40, padding: '0 18px', borderRadius: uiTheme.radii.sm, cursor: 'pointer', fontWeight: 600 },
  steps: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${uiTheme.colors.border}`, marginBottom: 28, gap: 12 },
  stepButton: { border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' },
  step: { display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 20, color: uiTheme.colors.text },
  stepCircle: { width: 34, height: 34, borderRadius: 999, border: `1px solid ${uiTheme.colors.borderStrong}`, display: 'grid', placeItems: 'center', color: uiTheme.colors.muted, background: uiTheme.colors.surface, fontWeight: 600 },
  stepCircleActive: { width: 34, height: 34, borderRadius: 999, border: `1px solid ${uiTheme.colors.primary}`, display: 'grid', placeItems: 'center', color: uiTheme.colors.primary, background: uiTheme.colors.primarySoft, fontWeight: 600 },
  stepCircleDone: { width: 34, height: 34, borderRadius: 999, border: `1px solid ${uiTheme.colors.primaryLight}`, display: 'grid', placeItems: 'center', color: uiTheme.colors.primary, background: uiTheme.colors.primarySoft, fontWeight: 600 },
  stepTitle: { color: uiTheme.colors.text },
  stepTitleActive: { color: uiTheme.colors.primary },
  stepText: { margin: '4px 0 0', color: uiTheme.colors.muted, fontSize: 12 },
  layout: { display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 },
  formCard: { ...surfaceCard, borderRadius: uiTheme.radii.md, padding: 24, display: 'grid', gap: 24, alignContent: 'start' },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, paddingBottom: 20, borderBottom: `1px solid ${uiTheme.colors.border}` },
  stepBadge: { display: 'inline-flex', padding: '6px 10px', borderRadius: 999, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, fontSize: 12, fontWeight: 600, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 17, fontWeight: 900, color: uiTheme.colors.text },
  cardDescription: { margin: 0, maxWidth: 340, color: uiTheme.colors.muted, fontSize: 13, lineHeight: 1.5 },
  errorBanner: { border: `1px solid #fecaca`, background: uiTheme.colors.dangerSoft, color: uiTheme.colors.danger, borderRadius: uiTheme.radii.sm, padding: '14px 16px', display: 'grid', gap: 6 },
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  typeCard: { ...surfaceCard, padding: 14, display: 'grid', gap: 8, textAlign: 'left', cursor: 'pointer', background: uiTheme.colors.surface },
  typeCardActive: { ...surfaceCard, padding: 14, display: 'grid', gap: 8, textAlign: 'left', cursor: 'pointer', borderColor: uiTheme.colors.primary, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 },
  field: { display: 'grid', gap: 8 },
  labelText: { color: uiTheme.colors.text, fontSize: 13, fontWeight: 600 },
  input: inputBase,
  helper: { color: uiTheme.colors.muted, fontSize: 12 },
  sectionBlock: { display: 'grid', gap: 16 },
  sectionHeader: { display: 'grid', gap: 4 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: uiTheme.colors.text },
  sectionCopy: { margin: 0, color: uiTheme.colors.muted, fontSize: 13 },
  alertGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  toggleRowCard: { display: 'grid', gridTemplateColumns: '18px 1fr', gap: 14, alignItems: 'start', padding: 16, border: `1px solid ${uiTheme.colors.border}`, borderRadius: uiTheme.radii.sm, background: uiTheme.colors.surface },
  toggleTitle: { color: uiTheme.colors.text, fontSize: 14 },
  toggleText: { margin: '6px 0 0', color: uiTheme.colors.muted, fontSize: 13, lineHeight: 1.5 },
  reviewLayout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  reviewCard: { ...surfaceCard, padding: 18, display: 'grid', gap: 14 },
  reviewTitle: { margin: 0, fontSize: 16 },
  reviewList: { display: 'grid', gap: 12 },
  reviewRow: { display: 'flex', justifyContent: 'space-between', gap: 16, color: uiTheme.colors.muted, fontSize: 13 },
  sidePanel: { display: 'grid', gap: 16, alignContent: 'start' },
  previewCard: { ...surfaceCard, padding: 22, display: 'grid', gap: 20 },
  previewHeader: { display: 'flex', alignItems: 'center', gap: 16 },
  previewIcon: { width: 58, height: 58, borderRadius: 20, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, display: 'grid', placeItems: 'center' },
  typeBadge: { display: 'inline-flex', padding: '5px 9px', borderRadius: 999, background: uiTheme.colors.iconSoft, color: uiTheme.colors.muted, fontSize: 11, fontWeight: 700 },
  previewTitle: { margin: '8px 0 4px', color: uiTheme.colors.text, fontSize: 18 },
  previewUrl: { margin: 0, color: uiTheme.colors.muted, wordBreak: 'break-all', fontSize: 13 },
  previewList: { display: 'grid', gap: 12 },
  infoRow: { display: 'grid', gridTemplateColumns: '24px 90px 1fr', gap: 10, alignItems: 'center', color: uiTheme.colors.muted, fontSize: 13 },
  infoIcon: { width: 24, height: 24, borderRadius: 8, display: 'grid', placeItems: 'center', background: uiTheme.colors.iconSoft, color: uiTheme.colors.primary },
  highlightValue: { color: uiTheme.colors.success },
  footerBar: { position: 'fixed', left: 0, right: 0, bottom: 0, minHeight: 72, borderTop: `1px solid ${uiTheme.colors.border}`, background: 'var(--control-bg)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', zIndex: 20 },
  footerInfo: { display: 'flex', alignItems: 'center', gap: 10, color: uiTheme.colors.muted, fontSize: 13 },
  footerActions: { display: 'flex', alignItems: 'center', gap: 12 },
};
