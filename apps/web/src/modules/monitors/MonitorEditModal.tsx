import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import type { Monitor, MonitorType, UpdateMonitorInput } from '../../shared/monitorApi';
import type { MonitorSection } from '../../shared/sectionsStore';
import {
  controlBase,
  inputBase,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from '../../theme/commonStyles';
import LoadingState from '../../shared/LoadingState';
import { CloseIcon } from '../../shared/uiIcons';

const baseLocationOptions = ['Madrid', 'Frankfurt', 'Virginia'] as const;
const dnsRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT'] as const;

const typeLabels: Record<MonitorType, string> = {
  HTTPS: 'HTTP(s)',
  HTTP: 'HTTP',
  SSL: 'Certificado SSL',
  TCP: 'TCP / Puerto',
  DNS: 'DNS',
};

const targetHelpers: Record<MonitorType, string> = {
  HTTPS: 'URL completa. Ejemplo: https://api.ejemplo.com/health',
  HTTP: 'URL HTTP. Ejemplo: http://servicio.ejemplo.com/health',
  SSL: 'Dominio o URL HTTPS del certificado.',
  TCP: 'Host o dominio sin protocolo. Ejemplo: api.ejemplo.com',
  DNS: 'Dominio que se resolverá. Ejemplo: ejemplo.com',
};

type MonitorEditModalProps = {
  error: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  monitor: Monitor | null;
  onClose: () => void;
  onSubmit: (data: UpdateMonitorInput) => Promise<void>;
  onUseSectionSchedule?: () => Promise<void>;
  sectionSchedule?: Pick<
    MonitorSection,
    | 'expectedStatusCode'
    | 'frequencySeconds'
    | 'timeoutSeconds'
    | 'locations'
    | 'isActive'
  > | null;
};

const emptyForm: UpdateMonitorInput = {
  name: '',
  type: 'HTTPS',
  target: '',
  expectedStatusCode: 200,
  frequencySeconds: 60,
  timeoutSeconds: 10,
  locations: [],
  alertEmail: true,
  alertPush: false,
  alertThreshold: 3,
  tcpPort: null,
  keyword: '',
  sslWarningDays: 14,
  dnsRecordType: 'A',
  dnsExpectedValue: '',
};

export default function MonitorEditModal({
  error,
  isOpen,
  isSubmitting,
  monitor,
  onClose,
  onSubmit,
  onUseSectionSchedule,
  sectionSchedule,
}: MonitorEditModalProps) {
  const [form, setForm] = useState<UpdateMonitorInput>(emptyForm);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen || !monitor) return;

    setForm({
      name: monitor.name,
      type: monitor.type,
      target: monitor.target,
      expectedStatusCode: monitor.expectedStatusCode ?? 200,
      frequencySeconds: monitor.frequencySeconds,
      timeoutSeconds: monitor.timeoutSeconds,
      locations: monitor.locations ?? [],
      alertEmail: monitor.alertEmail,
      alertPush: monitor.alertPush,
      alertThreshold: monitor.alertThreshold,
      tcpPort: monitor.tcpPort ?? null,
      keyword: monitor.keyword ?? '',
      sslWarningDays: monitor.sslWarningDays ?? 14,
      dnsRecordType: monitor.dnsRecordType ?? 'A',
      dnsExpectedValue: monitor.dnsExpectedValue ?? '',
    });
    setLocalError('');
  }, [isOpen, monitor]);

  const locationOptions = useMemo(() => Array.from(new Set([...baseLocationOptions, ...(monitor?.locations ?? [])])), [monitor]);
  const showSectionScheduleButton =
    Boolean(onUseSectionSchedule && sectionSchedule && monitor?.usesSectionSchedule === false);

  if (!isOpen || !monitor) return null;

  const updateForm = <K extends keyof UpdateMonitorInput>(field: K, value: UpdateMonitorInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setNumberField = (field: 'expectedStatusCode' | 'frequencySeconds' | 'timeoutSeconds' | 'alertThreshold' | 'tcpPort' | 'sslWarningDays') =>
    (event: ChangeEvent<HTMLInputElement>) => updateForm(field, Number(event.target.value) as never);

  const setTextField = (field: 'name' | 'target' | 'keyword' | 'dnsExpectedValue') =>
    (event: ChangeEvent<HTMLInputElement>) => updateForm(field, event.target.value as never);

  const setTypeField = (event: ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as MonitorType;
    setForm((current) => ({
      ...current,
      type,
      tcpPort: type === 'TCP' ? current.tcpPort ?? 443 : null,
      sslWarningDays: type === 'SSL' ? current.sslWarningDays ?? 14 : current.sslWarningDays ?? 14,
      dnsRecordType: type === 'DNS' ? current.dnsRecordType ?? 'A' : current.dnsRecordType ?? 'A',
    }));
  };

  const setBooleanField = (field: 'alertEmail' | 'alertPush') =>
    (event: ChangeEvent<HTMLInputElement>) => updateForm(field, event.target.checked as never);

  const toggleLocation = (location: string) => {
    setForm((current) => ({
      ...current,
      locations: current.locations.includes(location)
        ? current.locations.filter((item) => item !== location)
        : [...current.locations, location],
    }));
  };

  const validate = () => {
    if (!form.name.trim() || !form.target.trim()) return 'Completa nombre y destino.';
    if (!Number.isInteger(form.frequencySeconds) || form.frequencySeconds < 30) return 'La frecuencia mínima es 30 segundos.';
    if (!Number.isInteger(form.timeoutSeconds) || form.timeoutSeconds < 1) return 'El timeout mínimo es 1 segundo.';
    if (!Number.isInteger(form.alertThreshold) || form.alertThreshold < 1) return 'El umbral mínimo es 1.';

    if ((form.type === 'HTTP' || form.type === 'HTTPS') && (!Number.isInteger(form.expectedStatusCode) || form.expectedStatusCode < 100 || form.expectedStatusCode > 599)) {
      return 'El código esperado debe estar entre 100 y 599.';
    }

    if (form.type === 'TCP' && (!Number.isInteger(form.tcpPort ?? NaN) || Number(form.tcpPort) < 1 || Number(form.tcpPort) > 65535)) {
      return 'Los monitores TCP necesitan un puerto entre 1 y 65535.';
    }

    if (form.type === 'SSL' && (!Number.isInteger(form.sslWarningDays ?? NaN) || Number(form.sslWarningDays) < 1)) {
      return 'El aviso SSL debe ser de al menos 1 día.';
    }

    if (form.type === 'DNS' && !dnsRecordTypes.includes((form.dnsRecordType ?? 'A') as typeof dnsRecordTypes[number])) {
      return 'Selecciona un tipo de registro DNS válido.';
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError('');
    await onSubmit({
      ...form,
      name: form.name.trim(),
      target: form.target.trim(),
      keyword: form.keyword?.trim() || null,
      dnsExpectedValue: form.dnsExpectedValue?.trim() || null,
      tcpPort: form.type === 'TCP' ? Number(form.tcpPort) : null,
      sslWarningDays: form.type === 'SSL' ? Number(form.sslWarningDays ?? 14) : form.sslWarningDays ?? 14,
      dnsRecordType: form.type === 'DNS' ? form.dnsRecordType ?? 'A' : form.dnsRecordType ?? 'A',
    });
  };

  return (
    <div style={styles.overlay} onClick={!isSubmitting ? onClose : undefined}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-monitor-title" style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Editar monitor</p>
            <h2 id="edit-monitor-title" style={styles.title}>{monitor.name}</h2>
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose} disabled={isSubmitting} aria-label="Cerrar modal">
            <CloseIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {(localError || error) && <div style={styles.errorBanner}>{localError || error}</div>}

          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Configuración principal</h3>
              {showSectionScheduleButton ? (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => void onUseSectionSchedule?.()}
                  disabled={isSubmitting}
                >
                  Usar configuración de la sección
                </button>
              ) : null}
            </div>
            <div style={styles.grid}>
              <Field label="Nombre"><input style={styles.input} value={form.name} onChange={setTextField('name')} /></Field>
              <Field label="Destino"><input style={styles.input} value={form.target} onChange={setTextField('target')} placeholder={targetHelpers[form.type]} /></Field>
              <Field label="Tipo">
                <select style={styles.input} value={form.type} onChange={setTypeField}>
                  {(Object.keys(typeLabels) as MonitorType[]).map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
                </select>
              </Field>
              <Field label="Frecuencia (s)"><input type="number" min={30} style={styles.input} value={form.frequencySeconds} onChange={setNumberField('frequencySeconds')} /></Field>
              <Field label="Timeout (s)"><input type="number" min={1} max={60} style={styles.input} value={form.timeoutSeconds} onChange={setNumberField('timeoutSeconds')} /></Field>
            </div>
            <p style={styles.helper}>{targetHelpers[form.type]}</p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Validación avanzada</h3>
            <div style={styles.grid}>
              {(form.type === 'HTTP' || form.type === 'HTTPS') && (
                <>
                  <Field label="Código esperado"><input type="number" min={100} max={599} style={styles.input} value={form.expectedStatusCode} onChange={setNumberField('expectedStatusCode')} /></Field>
                  <Field label="Keyword opcional"><input style={styles.input} value={form.keyword ?? ''} onChange={setTextField('keyword')} placeholder="healthy" /></Field>
                </>
              )}

              {form.type === 'TCP' && <Field label="Puerto TCP"><input type="number" min={1} max={65535} style={styles.input} value={form.tcpPort ?? ''} onChange={setNumberField('tcpPort')} placeholder="443" /></Field>}

              {form.type === 'SSL' && <Field label="Avisar si caduca en menos de"><input type="number" min={1} max={365} style={styles.input} value={form.sslWarningDays ?? 14} onChange={setNumberField('sslWarningDays')} /></Field>}

              {form.type === 'DNS' && (
                <>
                  <Field label="Tipo de registro">
                    <select style={styles.input} value={form.dnsRecordType ?? 'A'} onChange={(event) => updateForm('dnsRecordType', event.target.value)}>
                      {dnsRecordTypes.map((recordType) => <option key={recordType} value={recordType}>{recordType}</option>)}
                    </select>
                  </Field>
                  <Field label="Valor esperado opcional"><input style={styles.input} value={form.dnsExpectedValue ?? ''} onChange={setTextField('dnsExpectedValue')} placeholder="mail.proveedor.com" /></Field>
                </>
              )}
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Ubicaciones</h3>
            <div style={styles.locationGrid}>
              {locationOptions.map((location) => (
                <label key={location} style={styles.locationCard}>
                  <input type="checkbox" checked={form.locations.includes(location)} onChange={() => toggleLocation(location)} />
                  <span>{location}</span>
                </label>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Alertas</h3>
            <div style={styles.toggleGrid}>
              <label style={styles.toggleCard}><input type="checkbox" checked={form.alertEmail} onChange={setBooleanField('alertEmail')} /><div><strong>Email</strong><p style={styles.toggleCopy}>Aviso por correo.</p></div></label>
              <label style={styles.toggleCard}><input type="checkbox" checked={form.alertPush} onChange={setBooleanField('alertPush')} /><div><strong>Push</strong><p style={styles.toggleCopy}>Aviso en la app.</p></div></label>
            </div>
            <Field label="Umbral de fallos consecutivos"><input type="number" min={1} max={20} style={styles.input} value={form.alertThreshold} onChange={setNumberField('alertThreshold')} /></Field>
          </section>

          <div style={styles.actions}>
            <button type="button" style={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? <LoadingState variant="button" label="Guardando monitor" /> : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label style={styles.field}><span style={styles.label}>{label}</span>{children}</label>;
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'grid', placeItems: 'center', padding: 24, zIndex: 40 },
  modal: { ...surfaceCard, width: 'min(840px, 100%)', maxHeight: '90vh', overflow: 'auto', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 },
  eyebrow: { margin: 0, color: uiTheme.colors.primary, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { margin: '8px 0 0', fontSize: 24 },
  closeButton: { ...controlBase, width: 36, height: 36, display: 'grid', placeItems: 'center', cursor: 'pointer' },
  form: { display: 'grid', gap: 20 },
  errorBanner: { borderRadius: uiTheme.radii.sm, border: `1px solid ${uiTheme.colors.danger}`, background: uiTheme.colors.dangerSoft, color: uiTheme.colors.danger, padding: '12px 14px', fontSize: 13, fontWeight: 500 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 },
  field: { display: 'grid', gap: 8 },
  label: { color: uiTheme.colors.muted, fontSize: 12, fontWeight: 500 },
  input: inputBase,
  helper: { margin: 0, color: uiTheme.colors.muted, fontSize: 12 },
  section: { display: 'grid', gap: 14 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  sectionTitle: { margin: 0, fontSize: 16 },
  locationGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 },
  locationCard: { ...surfaceCard, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' },
  toggleGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  toggleCard: { ...surfaceCard, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px' },
  toggleCopy: { margin: '4px 0 0', color: uiTheme.colors.muted, fontSize: 12 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12 },
  secondaryButton: { ...secondaryButtonBase, minHeight: 40, padding: '0 16px', borderRadius: uiTheme.radii.sm, cursor: 'pointer', fontWeight: 600 },
  primaryButton: { ...primaryButtonBase, minHeight: 40, padding: '0 16px', borderRadius: uiTheme.radii.sm, cursor: 'pointer', fontWeight: 600 },
};
