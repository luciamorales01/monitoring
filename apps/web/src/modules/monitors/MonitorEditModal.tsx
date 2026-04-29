import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import type {
  Monitor,
  MonitorType,
  UpdateMonitorInput,
} from '../../shared/monitorApi';
import {
  controlBase,
  inputBase,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from '../../theme/commonStyles';
import { CloseIcon } from '../../shared/uiIcons';

const baseLocationOptions = ['Madrid', 'Frankfurt', 'Virginia'] as const;

type MonitorEditModalProps = {
  error: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  monitor: Monitor | null;
  onClose: () => void;
  onSubmit: (data: UpdateMonitorInput) => Promise<void>;
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
};

export default function MonitorEditModal({
  error,
  isOpen,
  isSubmitting,
  monitor,
  onClose,
  onSubmit,
}: MonitorEditModalProps) {
  const [form, setForm] = useState<UpdateMonitorInput>(emptyForm);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen || !monitor) {
      return;
    }

    setForm({
      name: monitor.name,
      type: monitor.type,
      target: monitor.target,
      expectedStatusCode: monitor.expectedStatusCode,
      frequencySeconds: monitor.frequencySeconds,
      timeoutSeconds: monitor.timeoutSeconds,
      locations: monitor.locations,
      alertEmail: monitor.alertEmail,
      alertPush: monitor.alertPush,
      alertThreshold: monitor.alertThreshold,
    });
    setLocalError('');
  }, [isOpen, monitor]);

  const locationOptions = useMemo(() => {
    return Array.from(
      new Set([...baseLocationOptions, ...(monitor?.locations ?? [])]),
    );
  }, [monitor]);

  if (!isOpen || !monitor) {
    return null;
  }

  const setNumberField =
    (
      field:
        | 'expectedStatusCode'
        | 'frequencySeconds'
        | 'timeoutSeconds'
        | 'alertThreshold',
    ) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setForm((current) => ({ ...current, [field]: value }));
    };

  const setTextField =
    (field: 'name' | 'target') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const setTypeField = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((current) => ({
      ...current,
      type: event.target.value as MonitorType,
    }));
  };

  const setBooleanField =
    (field: 'alertEmail' | 'alertPush') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.checked }));
    };

  const toggleLocation = (location: string) => {
    setForm((current) => ({
      ...current,
      locations: current.locations.includes(location)
        ? current.locations.filter((item) => item !== location)
        : [...current.locations, location],
    }));
  };

  const validate = () => {
    if (!form.name.trim() || !form.target.trim()) {
      return 'Completa nombre y URL.';
    }

    try {
      new URL(form.target);
    } catch {
      return 'Introduce una URL valida con protocolo.';
    }

    if (
      !Number.isInteger(form.expectedStatusCode) ||
      form.expectedStatusCode < 100 ||
      form.expectedStatusCode > 599
    ) {
      return 'El codigo esperado debe estar entre 100 y 599.';
    }

    if (
      !Number.isInteger(form.frequencySeconds) ||
      form.frequencySeconds < 30
    ) {
      return 'La frecuencia minima es 30 segundos.';
    }

    if (!Number.isInteger(form.timeoutSeconds) || form.timeoutSeconds < 1) {
      return 'El timeout minimo es 1 segundo.';
    }

    if (!Number.isInteger(form.alertThreshold) || form.alertThreshold < 1) {
      return 'El umbral minimo es 1.';
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
    });
  };

  return (
    <div style={styles.overlay} onClick={!isSubmitting ? onClose : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-monitor-title"
        style={styles.modal}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Editar monitor</p>
            <h2 id="edit-monitor-title" style={styles.title}>
              {monitor.name}
            </h2>
          </div>

          <button
            type="button"
            style={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {(localError || error) && (
            <div style={styles.errorBanner}>{localError || error}</div>
          )}

          <div style={styles.grid}>
            <Field label="Nombre">
              <input
                style={styles.input}
                value={form.name}
                onChange={setTextField('name')}
              />
            </Field>

            <Field label="URL o endpoint">
              <input
                style={styles.input}
                value={form.target}
                onChange={setTextField('target')}
              />
            </Field>

            <Field label="Tipo">
              <select
                style={styles.input}
                value={form.type}
                onChange={setTypeField}
              >
                <option value="HTTPS">HTTP(s)</option>
                <option value="HTTP">HTTP</option>
              </select>
            </Field>

            <Field label="Codigo esperado">
              <input
                type="number"
                min={100}
                max={599}
                style={styles.input}
                value={form.expectedStatusCode}
                onChange={setNumberField('expectedStatusCode')}
              />
            </Field>

            <Field label="Frecuencia (s)">
              <input
                type="number"
                min={30}
                style={styles.input}
                value={form.frequencySeconds}
                onChange={setNumberField('frequencySeconds')}
              />
            </Field>

            <Field label="Timeout (s)">
              <input
                type="number"
                min={1}
                style={styles.input}
                value={form.timeoutSeconds}
                onChange={setNumberField('timeoutSeconds')}
              />
            </Field>
          </div>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Ubicaciones</h3>
            <div style={styles.locationGrid}>
              {locationOptions.map((location) => (
                <label key={location} style={styles.locationCard}>
                  <input
                    type="checkbox"
                    checked={form.locations.includes(location)}
                    onChange={() => toggleLocation(location)}
                  />
                  <span>{location}</span>
                </label>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Alertas</h3>
            <div style={styles.toggleGrid}>
              <label style={styles.toggleCard}>
                <input
                  type="checkbox"
                  checked={form.alertEmail}
                  onChange={setBooleanField('alertEmail')}
                />
                <div>
                  <strong>Email</strong>
                  <p style={styles.toggleCopy}>Aviso por correo.</p>
                </div>
              </label>

              <label style={styles.toggleCard}>
                <input
                  type="checkbox"
                  checked={form.alertPush}
                  onChange={setBooleanField('alertPush')}
                />
                <div>
                  <strong>Push</strong>
                  <p style={styles.toggleCopy}>Aviso en la app.</p>
                </div>
              </label>
            </div>

            <Field label="Umbral de fallos consecutivos">
              <input
                type="number"
                min={1}
                style={styles.input}
                value={form.alertThreshold}
                onChange={setNumberField('alertThreshold')}
              />
            </Field>
          </section>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={styles.primaryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    zIndex: 40,
  },
  modal: {
    ...surfaceCard,
    width: 'min(760px, 100%)',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: 24,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  eyebrow: {
    margin: 0,
    color: uiTheme.colors.primary,
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    margin: '8px 0 0',
    fontSize: 24,
  },
  closeButton: {
    ...controlBase,
    width: 36,
    height: 36,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },
  form: {
    display: 'grid',
    gap: 20,
  },
  errorBanner: {
    borderRadius: uiTheme.radii.sm,
    border: `1px solid ${uiTheme.colors.danger}`,
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 16,
  },
  field: {
    display: 'grid',
    gap: 8,
  },
  label: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 700,
  },
  input: inputBase,
  section: {
    display: 'grid',
    gap: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 16,
  },
  locationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
  },
  locationCard: {
    ...surfaceCard,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
  },
  toggleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
  },
  toggleCard: {
    ...surfaceCard,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '14px 16px',
  },
  toggleCopy: {
    margin: '4px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 40,
    padding: '0 16px',
    borderRadius: uiTheme.radii.sm,
    cursor: 'pointer',
    fontWeight: 800,
  },
  primaryButton: {
    ...primaryButtonBase,
    minHeight: 40,
    padding: '0 16px',
    borderRadius: uiTheme.radii.sm,
    cursor: 'pointer',
    fontWeight: 800,
  },
};
