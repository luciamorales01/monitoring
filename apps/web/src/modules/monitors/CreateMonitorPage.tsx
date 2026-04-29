import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createMonitor,
  type CreateMonitorInput,
  type MonitorType,
} from '../../shared/monitorApi';
import {
  datePillBase,
  iconButtonBase,
  inputBase,
  pageMain,
  pageSubtitle,
  pageTitle,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  topActionsBase,
  topbarBase,
  uiTheme,
} from '../../theme/commonStyles';
import {
  ActivityIcon,
  BellIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeIcon,
  MonitorIcon,
  RefreshIcon,
} from '../../shared/uiIcons';

type WizardStep = 1 | 2 | 3 | 4;

const stepItems = [
  {
    step: 1 as WizardStep,
    title: 'General',
    text: 'Información básica',
    footerText: 'Completa los datos base del monitor antes de pasar a la configuración.',
  },
  {
    step: 2 as WizardStep,
    title: 'Configuración',
    text: 'Parámetros de monitorización',
    footerText: 'Define la frecuencia, timeout y validaciones principales del check.',
  },
  {
    step: 3 as WizardStep,
    title: 'Ubicaciones y alertas',
    text: 'Dónde y cómo alertar',
    footerText: 'Selecciona regiones de comprobación y configura alertas mock.',
  },
  {
    step: 4 as WizardStep,
    title: 'Revisar y crear',
    text: 'Resumen y confirmación',
    footerText: 'Revisa el resumen final antes de crear el monitor en backend.',
  },
] as const;

const locationOptions = ['Madrid', 'Frankfurt', 'Virginia'] as const;

type MockFormState = {
  description: string;
  tags: string;
  group: string;
  method: 'GET';
  retries: number;
  retryIntervalSeconds: number;
  validateExpectedCode: boolean;
  activateImmediately: boolean;
};

const typeLabels: Record<MonitorType, string> = {
  HTTPS: 'HTTP(s)',
  HTTP: 'HTTP',
};

export default function CreateMonitorPage() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<CreateMonitorInput>({
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
  });
  const [mockForm, setMockForm] = useState<MockFormState>({
    description: '',
    tags: 'producción, tienda, web',
    group: 'Tienda Online',
    method: 'GET',
    retries: 2,
    retryIntervalSeconds: 15,
    validateExpectedCode: true,
    activateImmediately: true,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewName = form.name.trim() || 'Tienda ejemplo';
  const previewTarget = form.target.trim() || 'https://tienda.ejemplo.com';
  const typeLabel = typeLabels[form.type];
  const stepMeta = stepItems.find((item) => item.step === currentStep)!;

  const frequencyLabel = useMemo(() => {
    if (form.frequencySeconds < 60) return `Cada ${form.frequencySeconds} segundos`;
    const minutes = Math.round(form.frequencySeconds / 60);
    return `Cada ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }, [form.frequencySeconds]);

  const selectedLocations = locationOptions.filter(
    (location) => form.locations.includes(location),
  );
  const selectedLocationsLabel = selectedLocations.length
    ? selectedLocations.join(', ')
    : 'Sin ubicaciones seleccionadas';

  const alertsSummary = [
    form.alertEmail ? 'Email' : '',
    form.alertPush ? 'Push' : '',
  ].filter(Boolean);

  const alertLabel = alertsSummary.length
    ? `${alertsSummary.join(' y ')} tras ${form.alertThreshold} fallo${form.alertThreshold === 1 ? '' : 's'}`
    : 'Sin alertas automáticas';

  const handleChange =
    (
      field:
        | 'name'
        | 'type'
        | 'target'
        | 'expectedStatusCode'
        | 'frequencySeconds'
        | 'timeoutSeconds',
    ) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;

      setForm((current) => ({
        ...current,
        [field]:
          field === 'type'
            ? (value as MonitorType)
            : field === 'name' || field === 'target'
              ? value
              : Number(value),
      }));
    };

  const handleMockTextChange =
    (field: 'description' | 'tags' | 'group') =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const value = event.target.value;
      setMockForm((current) => ({ ...current, [field]: value }));
    };

  const handleMockNumberChange =
    (field: 'retries' | 'retryIntervalSeconds') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMockForm((current) => ({
        ...current,
        [field]: Number(event.target.value),
      }));
    };

  const handleToggleChange =
    (field: 'validateExpectedCode' | 'activateImmediately') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMockForm((current) => ({
        ...current,
        [field]: event.target.checked,
      }));
    };

  const handleMethodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setMockForm((current) => ({
      ...current,
      method: event.target.value as MockFormState['method'],
    }));
  };

  const toggleLocation = (location: string) => {
    setForm((current) => ({
      ...current,
      locations: current.locations.includes(location)
        ? current.locations.filter((item) => item !== location)
        : [...current.locations, location],
    }));
  };

  const handleAlertToggle =
    (field: 'alertEmail' | 'alertPush') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.checked,
      }));
    };

  const handleAlertThresholdChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((current) => ({
      ...current,
      alertThreshold: Number(event.target.value),
    }));
  };

  const validateStep = (step: WizardStep) => {
    if (step === 1) {
      if (!form.name.trim() || !form.target.trim()) {
        return 'Completa nombre y URL o endpoint antes de continuar.';
      }
    }

    if (step === 2) {
      if (!Number.isFinite(form.frequencySeconds) || form.frequencySeconds < 10) {
        return 'La frecuencia debe ser un número válido de al menos 10 segundos.';
      }

      if (!Number.isFinite(form.timeoutSeconds) || form.timeoutSeconds < 1) {
        return 'El timeout debe ser un número válido de al menos 1 segundo.';
      }

      if (
        mockForm.validateExpectedCode &&
        (!Number.isFinite(form.expectedStatusCode) ||
          form.expectedStatusCode < 100 ||
          form.expectedStatusCode > 599)
      ) {
        return 'El código esperado debe estar entre 100 y 599.';
      }
    }

    return '';
  };

  const goToStep = (nextStep: WizardStep) => {
    if (nextStep === currentStep) return;

    if (nextStep < currentStep) {
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (currentStep < 4) {
      goToStep((currentStep + 1) as WizardStep);
      return;
    }

    const finalError = validateStep(1) || validateStep(2);
    if (finalError) {
      setError(finalError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await createMonitor(form);
      navigate('/monitors');
    } catch (err: any) {
      setError(err.message ?? 'No se pudo crear el monitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <>
          <div style={styles.formGrid}>
            <Field
              label="Nombre del monitor"
              required
              helper="Un nombre descriptivo para identificar este monitor."
            >
              <input
                placeholder="Tienda ejemplo"
                value={form.name}
                onChange={handleChange('name')}
                style={styles.input}
              />
            </Field>

            <Field
              label="URL o endpoint"
              required
              helper="La URL completa que quieres monitorizar."
            >
              <input
                placeholder="https://tienda.ejemplo.com"
                value={form.target}
                onChange={handleChange('target')}
                style={styles.input}
              />
            </Field>

            <Field
              label="Tipo de monitor"
              required
              helper="Selecciona el tipo de monitorización."
            >
              <select value={form.type} onChange={handleChange('type')} style={styles.input}>
                <option value="HTTPS">HTTP(s)</option>
                <option value="HTTP">HTTP</option>
              </select>
            </Field>

            <Field
              label="Código esperado"
              required
              helper="Código HTTP que consideras correcto."
            >
              <input
                min={100}
                max={599}
                type="number"
                value={form.expectedStatusCode}
                onChange={handleChange('expectedStatusCode')}
                style={styles.input}
              />
            </Field>
          </div>

          <label style={styles.descriptionGroup}>
            <span style={styles.labelText}>
              Descripción <em>(mock)</em>
            </span>
            <textarea
              placeholder="Monitorización principal de la tienda online."
              value={mockForm.description}
              onChange={handleMockTextChange('description')}
              style={styles.textarea}
            />
            <span style={styles.helper}>Información adicional sobre este monitor.</span>
          </label>

          <div style={styles.tagsRow}>
            <Field
              label="Etiquetas"
              helper="Usa etiquetas separadas por comas para organizar monitores."
            >
              <input
                placeholder="producción, tienda, web"
                value={mockForm.tags}
                onChange={handleMockTextChange('tags')}
                style={styles.input}
              />
            </Field>

            <Field label="Grupo" helper="Asigna el monitor a un grupo mock del panel.">
              <select
                value={mockForm.group}
                onChange={handleMockTextChange('group')}
                style={styles.input}
              >
                <option value="Tienda Online">Tienda Online</option>
                <option value="API Pública">API Pública</option>
                <option value="Backoffice">Backoffice</option>
              </select>
            </Field>
          </div>

          <label style={styles.toggleRow}>
            <input
              type="checkbox"
              checked={mockForm.activateImmediately}
              onChange={handleToggleChange('activateImmediately')}
            />
            <div>
              <strong style={styles.toggleTitle}>Activar monitor al crear</strong>
              <p style={styles.toggleText}>
                El monitor comenzará a ejecutarse inmediatamente después de crearlo.
              </p>
            </div>
          </label>
        </>
      );
    }

    if (currentStep === 2) {
      return (
        <>
          <div style={styles.formGrid}>
            <Field
              label="Frecuencia"
              required
              helper="Cada cuánto se comprobará el monitor."
            >
              <input
                min={10}
                type="number"
                value={form.frequencySeconds}
                onChange={handleChange('frequencySeconds')}
                style={styles.input}
              />
            </Field>

            <Field
              label="Timeout"
              required
              helper="Tiempo máximo de espera por comprobación."
            >
              <input
                min={1}
                type="number"
                value={form.timeoutSeconds}
                onChange={handleChange('timeoutSeconds')}
                style={styles.input}
              />
            </Field>

            <Field label="Método HTTP" helper="Método mock para el request del monitor.">
              <select value={mockForm.method} onChange={handleMethodChange} style={styles.input}>
                <option value="GET">GET</option>
              </select>
            </Field>

            <Field label="Reintentos" helper="Número mock de reintentos por cada comprobación.">
              <input
                min={0}
                type="number"
                value={mockForm.retries}
                onChange={handleMockNumberChange('retries')}
                style={styles.input}
              />
            </Field>

            <Field
              label="Intervalo entre reintentos"
              helper="Segundos mock de espera entre reintentos."
            >
              <input
                min={0}
                type="number"
                value={mockForm.retryIntervalSeconds}
                onChange={handleMockNumberChange('retryIntervalSeconds')}
                style={styles.input}
              />
            </Field>
          </div>

          <section style={styles.inlineCard}>
            <label style={styles.toggleRow}>
              <input
                type="checkbox"
                checked={mockForm.validateExpectedCode}
                onChange={handleToggleChange('validateExpectedCode')}
              />
              <div>
                <strong style={styles.toggleTitle}>Validar código esperado</strong>
                <p style={styles.toggleText}>
                  Se comprobará que la respuesta devuelva <strong>{form.expectedStatusCode}</strong>.
                </p>
              </div>
            </label>
          </section>
        </>
      );
    }

    if (currentStep === 3) {
      return (
        <>
          <section style={styles.sectionBlock}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Ubicaciones de comprobación</h3>
              <p style={styles.sectionCopy}>
                Selecciona desde qué regiones se lanzarán los checks.
              </p>
            </div>

            <div style={styles.locationGrid}>
              {locationOptions.map((location) => (
                <label key={location} style={styles.locationCard}>
                  <input
                    type="checkbox"
                    checked={form.locations.includes(location)}
                    onChange={() => toggleLocation(location)}
                  />
                  <div>
                    <strong>{location}</strong>
                    <p style={styles.locationCopy}>Punto de monitorización</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section style={styles.sectionBlock}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Alertas</h3>
              <p style={styles.sectionCopy}>
                Configura canales de alerta y el umbral de fallos consecutivos.
              </p>
            </div>

            <div style={styles.alertGrid}>
              <label style={styles.toggleRowCard}>
                <input
                  type="checkbox"
                  checked={form.alertEmail}
                  onChange={handleAlertToggle('alertEmail')}
                />
                <div>
                  <strong style={styles.toggleTitle}>Email alerts</strong>
                  <p style={styles.toggleText}>Enviar aviso por correo cuando falle el monitor.</p>
                </div>
              </label>

              <label style={styles.toggleRowCard}>
                <input
                  type="checkbox"
                  checked={form.alertPush}
                  onChange={handleAlertToggle('alertPush')}
                />
                <div>
                  <strong style={styles.toggleTitle}>Push alerts</strong>
                  <p style={styles.toggleText}>Enviar aviso push a usuarios conectados.</p>
                </div>
              </label>
            </div>

            <Field
              label="Umbral de fallos consecutivos"
              helper="Número de fallos antes de disparar la alerta."
            >
              <input
                min={1}
                type="number"
                value={form.alertThreshold}
                onChange={handleAlertThresholdChange}
                style={styles.input}
              />
            </Field>
          </section>
        </>
      );
    }

    return (
      <div style={styles.reviewLayout}>
        <section style={styles.reviewCard}>
          <h3 style={styles.reviewTitle}>Resumen del monitor</h3>
          <div style={styles.reviewList}>
            <ReviewRow label="Nombre" value={previewName} />
            <ReviewRow label="URL" value={previewTarget} />
            <ReviewRow label="Tipo" value={typeLabel} />
            <ReviewRow label="Frecuencia" value={frequencyLabel} />
            <ReviewRow label="Timeout" value={`${form.timeoutSeconds} segundos`} />
            <ReviewRow label="Código esperado" value={String(form.expectedStatusCode)} />
            <ReviewRow label="Método" value={mockForm.method} />
            <ReviewRow label="Grupo" value={mockForm.group} />
          </div>
        </section>

        <section style={styles.reviewCard}>
          <h3 style={styles.reviewTitle}>Ubicaciones y alertas</h3>
          <div style={styles.reviewList}>
            <ReviewRow label="Ubicaciones" value={selectedLocationsLabel} />
            <ReviewRow label="Alertas configuradas" value={alertLabel} />
            <ReviewRow
              label="Descripción"
              value={mockForm.description.trim() || 'Sin descripción'}
            />
            <ReviewRow label="Etiquetas" value={mockForm.tags.trim() || 'Sin etiquetas'} />
            <ReviewRow
              label="Activación inicial"
              value={mockForm.activateImmediately ? 'Activa al crear' : 'Creación en pausa'}
            />
          </div>
        </section>
      </div>
    );
  };

  return (
    <main style={styles.main}>
      <header style={styles.topbar}>
        <div>
          <div style={styles.breadcrumb}>
            <span>Webs monitorizadas</span>
            <span>›</span>
            <strong>Crear monitor</strong>
          </div>

          <h1 style={styles.title}>Crear nuevo monitor</h1>
          <p style={styles.subtitle}>
            Configura los parámetros de monitorización para empezar a supervisar tu servicio.
          </p>
        </div>

        <div style={styles.topActions}>
          <div style={styles.datePill}>
            <CalendarIcon size={15} />
            24 may 2024 00:00 — 24 may 2024 23:59
          </div>

          <button type="button" style={styles.iconButton}>
            <RefreshIcon size={16} />
          </button>

          <div style={styles.bell}>
            <BellIcon size={16} />
            <span style={styles.bellBadge}>3</span>
          </div>

          <div style={styles.avatar}>AS</div>
          <span style={styles.adminText}>Admin</span>
        </div>
      </header>

      <div style={styles.actionsTop}>
        <NavigationButtons
          currentStep={currentStep}
          isSubmitting={isSubmitting}
          onBack={() => goToStep((currentStep - 1) as WizardStep)}
          onCancel={() => navigate('/monitors')}
        />
      </div>

      <section style={styles.steps}>
        {stepItems.map((item) => (
          <Step
            key={item.step}
            number={String(item.step)}
            title={item.title}
            text={item.text}
            active={item.step === currentStep}
            completed={item.step < currentStep}
            onClick={() => goToStep(item.step)}
          />
        ))}
      </section>

      <section style={styles.layout}>
        <form id="create-monitor-form" onSubmit={handleSubmit} style={styles.formCard}>
          {error && (
            <div style={styles.errorBanner}>
              <strong style={styles.errorTitle}>Revisa este paso</strong>
              <p style={styles.errorMessage}>{error}</p>
            </div>
          )}

          <div style={styles.formHeader}>
            <div>
              <span style={styles.stepBadge}>Paso {currentStep} de 4</span>
              <h2 style={styles.cardTitle}>{stepMeta.title}</h2>
            </div>
            <p style={styles.cardDescription}>{stepMeta.text}</p>
          </div>

          {renderStepContent()}
        </form>

        <aside style={styles.sidePanel}>
          <section style={styles.previewCard}>
            <h2 style={styles.cardTitle}>Vista previa del monitor</h2>

            <div style={styles.previewHeader}>
              <div style={styles.previewIcon}>
                <GlobeIcon size={34} />
              </div>

              <div>
                <span style={styles.typeBadge}>{typeLabel}</span>
                <h3 style={styles.previewTitle}>{previewName}</h3>
                <p style={styles.previewUrl}>{previewTarget} ↗</p>
              </div>
            </div>

            <div style={styles.previewList}>
              <InfoRow icon={<MonitorIcon size={15} />} label="Tipo" value={typeLabel} />
              <InfoRow icon={<ActivityIcon size={15} />} label="Método" value={mockForm.method} />
              <InfoRow icon={<ClockIcon size={15} />} label="Frecuencia" value={frequencyLabel} />
              <InfoRow
                icon={<ClockIcon size={15} />}
                label="Timeout"
                value={`${form.timeoutSeconds} segundos`}
              />
              <InfoRow icon={<GlobeIcon size={15} />} label="Ubicaciones" value={selectedLocationsLabel} />
              <InfoRow icon={<BellIcon size={15} />} label="Alertas" value={alertLabel} />
              <InfoRow
                icon={<CheckCircleIcon size={15} />}
                label="Estado"
                value={mockForm.activateImmediately ? 'Activo al crear' : 'Creación en pausa'}
                highlighted
              />
            </div>
          </section>

          <section style={styles.testCard}>
            <h2 style={styles.sideTitle}>Paso actual</h2>
            <p>
              {stepMeta.footerText}
            </p>
            <div style={styles.sideStepPill}>{stepMeta.title}</div>
          </section>
        </aside>
      </section>

      <footer style={styles.footerBar}>
        <div style={styles.footerInfo}>
          <span>ⓘ</span>
          {stepMeta.footerText}
        </div>

        <div style={styles.footerActions}>
          <NavigationButtons
            currentStep={currentStep}
            isSubmitting={isSubmitting}
            onBack={() => goToStep((currentStep - 1) as WizardStep)}
            onCancel={() => navigate('/monitors')}
          />
        </div>
      </footer>
    </main>
  );
}

function NavigationButtons({
  currentStep,
  isSubmitting,
  onBack,
  onCancel,
}: {
  currentStep: WizardStep;
  isSubmitting: boolean;
  onBack: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <button
        type="button"
        style={styles.cancelButton}
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancelar
      </button>

      {currentStep > 1 && (
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={onBack}
          disabled={isSubmitting}
        >
          Anterior
        </button>
      )}

      <button
        type="submit"
        form="create-monitor-form"
        style={styles.primaryButton}
        disabled={isSubmitting}
      >
        {currentStep === 4 ? (isSubmitting ? 'Creando...' : 'Crear monitor') : 'Siguiente'}
        {currentStep < 4 && <span>→</span>}
      </button>
    </>
  );
}

function Step({
  number,
  title,
  text,
  active,
  completed,
  onClick,
}: {
  number: string;
  title: string;
  text: string;
  active?: boolean;
  completed?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" style={styles.stepButton} onClick={onClick}>
      <div style={styles.step}>
        <span
          style={
            active
              ? styles.stepCircleActive
              : completed
                ? styles.stepCircleDone
                : styles.stepCircle
          }
        >
          {number}
        </span>
        <div>
          <strong style={active || completed ? styles.stepTitleActive : styles.stepTitle}>
            {title}
          </strong>
          <p style={styles.stepText}>{text}</p>
        </div>
      </div>
    </button>
  );
}

function Field({
  label,
  helper,
  required,
  children,
}: {
  label: string;
  helper: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.labelText}>
        {label} {required && <b>*</b>}
      </span>
      {children}
      <span style={styles.helper}>{helper}</span>
    </label>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlighted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoIcon}>{icon}</span>
      <span>{label}</span>
      <strong style={highlighted ? styles.highlightValue : undefined}>{value}</strong>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.reviewRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  main: { ...pageMain, overflow: 'auto' },
  topbar: topbarBase,
  topActions: topActionsBase,
  title: pageTitle,
  subtitle: pageSubtitle,
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  datePill: datePillBase,
  iconButton: iconButtonBase,
  bell: { ...iconButtonBase, position: 'relative' },
  bellBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 999,
    background: uiTheme.colors.primary,
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontSize: 10,
    fontWeight: 800,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    background: uiTheme.colors.primary,
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 900,
    fontSize: 13,
  },
  adminText: { color: uiTheme.colors.text, fontSize: 13 },
  actionsTop: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: -12,
    marginBottom: 24,
  },
  primaryButton: {
    ...primaryButtonBase,
    minHeight: 40,
    padding: '0 18px',
    borderRadius: uiTheme.radii.sm,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontWeight: 800,
  },
  cancelButton: {
    ...secondaryButtonBase,
    minHeight: 40,
    padding: '0 18px',
    borderRadius: uiTheme.radii.sm,
    cursor: 'pointer',
    fontWeight: 800,
  },
  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 40,
    padding: '0 18px',
    borderRadius: uiTheme.radii.sm,
    cursor: 'pointer',
    fontWeight: 800,
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    marginBottom: 28,
    gap: 12,
  },
  stepButton: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    textAlign: 'left',
    cursor: 'pointer',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 20,
    position: 'relative',
    color: uiTheme.colors.text,
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: `1px solid ${uiTheme.colors.borderStrong}`,
    display: 'grid',
    placeItems: 'center',
    color: uiTheme.colors.muted,
    background: '#fff',
    fontWeight: 800,
  },
  stepCircleActive: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: `1px solid ${uiTheme.colors.primary}`,
    display: 'grid',
    placeItems: 'center',
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    fontWeight: 800,
    boxShadow: `0 18px 0 -16px ${uiTheme.colors.primary}`,
  },
  stepCircleDone: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: `1px solid #bfdbfe`,
    display: 'grid',
    placeItems: 'center',
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    fontWeight: 800,
  },
  stepTitle: {
    color: uiTheme.colors.text,
  },
  stepTitleActive: {
    color: uiTheme.colors.primary,
  },
  stepText: {
    margin: '4px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: 24,
  },
  formCard: {
    ...surfaceCard,
    borderRadius: uiTheme.radii.md,
    padding: 24,
    display: 'grid',
    gap: 24,
    alignContent: 'start',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    paddingBottom: 20,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },
  stepBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 10,
  },
  cardTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 900,
    color: uiTheme.colors.text,
  },
  cardDescription: {
    margin: 0,
    maxWidth: 280,
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  errorBanner: {
    border: `1px solid #fecaca`,
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
    borderRadius: uiTheme.radii.sm,
    padding: '14px 16px',
    display: 'grid',
    gap: 6,
  },
  errorTitle: {
    fontSize: 13,
  },
  errorMessage: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 22,
  },
  field: {
    display: 'grid',
    gap: 8,
  },
  labelText: {
    color: uiTheme.colors.text,
    fontSize: 13,
    fontWeight: 800,
  },
  input: inputBase,
  helper: {
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  textarea: {
    ...inputBase,
    minHeight: 88,
    padding: '12px 14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  descriptionGroup: {
    display: 'grid',
    gap: 8,
  },
  tagsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 22,
  },
  toggleRow: {
    display: 'grid',
    gridTemplateColumns: '18px 1fr',
    gap: 14,
    alignItems: 'start',
    padding: 16,
    border: `1px solid ${uiTheme.colors.border}`,
    borderRadius: uiTheme.radii.sm,
    background: '#f8fbff',
  },
  toggleRowCard: {
    display: 'grid',
    gridTemplateColumns: '18px 1fr',
    gap: 14,
    alignItems: 'start',
    padding: 16,
    border: `1px solid ${uiTheme.colors.border}`,
    borderRadius: uiTheme.radii.sm,
    background: '#fff',
  },
  toggleTitle: {
    color: uiTheme.colors.text,
    fontSize: 14,
  },
  toggleText: {
    margin: '6px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  inlineCard: {
    border: `1px solid ${uiTheme.colors.border}`,
    borderRadius: uiTheme.radii.sm,
    background: '#f8fbff',
  },
  sectionBlock: {
    display: 'grid',
    gap: 18,
  },
  sectionHeader: {
    display: 'grid',
    gap: 6,
  },
  sectionTitle: {
    margin: 0,
    color: uiTheme.colors.text,
    fontSize: 15,
    fontWeight: 900,
  },
  sectionCopy: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  locationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  locationCard: {
    display: 'grid',
    gridTemplateColumns: '18px 1fr',
    gap: 14,
    alignItems: 'start',
    padding: 16,
    border: `1px solid ${uiTheme.colors.border}`,
    borderRadius: uiTheme.radii.sm,
    background: '#fff',
  },
  locationCopy: {
    margin: '6px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  alertGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  reviewLayout: {
    display: 'grid',
    gap: 18,
  },
  reviewCard: {
    border: `1px solid ${uiTheme.colors.border}`,
    borderRadius: uiTheme.radii.sm,
    background: '#fbfdff',
    padding: 18,
    display: 'grid',
    gap: 16,
  },
  reviewTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 900,
    color: uiTheme.colors.text,
  },
  reviewList: {
    display: 'grid',
    gap: 12,
  },
  reviewRow: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    gap: 14,
    color: uiTheme.colors.muted,
    fontSize: 13,
    alignItems: 'start',
  },
  sidePanel: {
    display: 'grid',
    gap: 20,
    alignContent: 'start',
  },
  previewCard: {
    ...surfaceCard,
    borderRadius: uiTheme.radii.md,
    padding: 20,
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    padding: '22px 0',
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },
  previewIcon: {
    width: 76,
    height: 76,
    borderRadius: 999,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    display: 'grid',
    placeItems: 'center',
  },
  typeBadge: {
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    borderRadius: 8,
    padding: '5px 9px',
    fontSize: 12,
    fontWeight: 800,
  },
  previewTitle: {
    margin: '10px 0 4px',
    fontSize: 18,
    color: uiTheme.colors.text,
  },
  previewUrl: {
    margin: 0,
    color: uiTheme.colors.primary,
    fontSize: 13,
    wordBreak: 'break-word',
  },
  previewList: {
    display: 'grid',
    gap: 14,
    marginTop: 18,
  },
  infoRow: {
    display: 'grid',
    gridTemplateColumns: '20px 1fr auto',
    alignItems: 'center',
    gap: 10,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  infoIcon: {
    color: uiTheme.colors.muted,
    display: 'grid',
    placeItems: 'center',
  },
  highlightValue: {
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    padding: '5px 8px',
    borderRadius: 7,
  },
  testCard: {
    border: `1px solid #bfdbfe`,
    background: '#f8fbff',
    borderRadius: uiTheme.radii.md,
    padding: 20,
  },
  sideTitle: {
    margin: '0 0 10px',
    fontSize: 15,
    fontWeight: 900,
  },
  sideStepPill: {
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: 12,
    padding: '6px 10px',
    borderRadius: 999,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    fontSize: 12,
    fontWeight: 800,
  },
  footerBar: {
    ...surfaceCard,
    borderRadius: uiTheme.radii.md,
    marginTop: 28,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  footerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  footerActions: {
    display: 'flex',
    gap: 12,
  },
};
